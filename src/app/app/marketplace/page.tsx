'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePublicClient, useWalletClient } from 'wagmi';
import { Address } from 'viem';
import { ethers } from 'ethers';
import Navigation from '@/components/Navigation';
import { SearchIcon } from '@/components/icons';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { ELECTRONEUM_TESTNET_CONFIG } from '@/config/contracts';
import toast, { Toaster } from 'react-hot-toast';

// Create ethers provider and contract outside component
const provider = new ethers.JsonRpcProvider(ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]);

// Contract addresses
const VAULT_ADDRESS = '0x7ecaB32D14E7E6af68B107C6DA485c9874017DeD';
const MUSDT_ADDRESS = '0x0EC9f3De36E5E65Ba30464529386e153898e2C4C';

// Create contract instances
const contract = new ethers.Contract(
  CONTRACT_ADDRESSES.NEXTRACK,
  [
    'function getAllBatchIds() view returns (uint256[])',
    'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, bool isListed, uint256 parentBatch, uint256 timestamp))',
    'function requestProductBatch(uint256 batchId, uint256 quantityRequested) returns (uint256)',
    'function getRegisteredManufacturers() view returns (address[])'
  ],
  provider
);

const musdtContract = new ethers.Contract(
  MUSDT_ADDRESS,
  [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ],
  provider
);

// Category enum mapping
const Category = {
  0: 'Electronics',
  1: 'Clothes',
  2: 'Luxury',
  3: 'Food',
  4: 'Medicine',
  5: 'Furniture',
  6: 'Books',
  7: 'Automobiles',
  8: 'Cosmetics',
  9: 'Other'
} as const;

type CategoryType = typeof Category[keyof typeof Category];

type VerificationType = 'verified' | 'unverified' | 'pending';
type TransferStatusType = 'available' | 'transferred' | 'locked' | 'in_transfer' | 'sold';
type TabType = 'verified' | 'other';

interface ProductListing {
  batchId: bigint;
  name: string;
  description: string;
  category: CategoryType;
  owner: Address;
  totalQuantity: bigint;
  unitPrice: bigint;
  isListed: boolean;
  parentBatch: bigint;
  timestamp: bigint;
  isVerifiedManufacturer: boolean;
}

interface RequestQuantity {
  [key: string]: string; // batchId -> quantity
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [requestQuantities, setRequestQuantities] = useState<RequestQuantity>({});
  const [isRequesting, setIsRequesting] = useState(false);
  const [registeredManufacturers, setRegisteredManufacturers] = useState<string[]>([]);
  const [userBalances, setUserBalances] = useState<{
    mUSDT: string;
    ETN: string;
  }>({
    mUSDT: '0',
    ETN: '0',
  });

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const fetchListings = async () => {
    if (!publicClient) return;

    setIsLoading(true);
    try {
      console.log('Fetching all batch IDs...');
      const batchIds = await contract.getAllBatchIds();
      console.log('Received batch IDs:', batchIds.map(id => id.toString()));

      console.log('Fetching registered manufacturers...');
      const registeredManufacturers = await contract.getRegisteredManufacturers();
      console.log('Registered manufacturers:', registeredManufacturers);

      console.log('Fetching details for each batch...');
      const batchDetails: ProductListing[] = [];

      for (const batchId of batchIds) {
        try {
          console.log(`Calling getBatchDetails for ID ${batchId.toString()}`);
          const details = await contract.getBatchDetails(batchId);
          console.log(`Raw response for batch ${batchId.toString()}:`, details);

          // Only add if the batch is listed and has quantity
          if (details.isListed && details.totalQuantity > 0n) {
            const listing: ProductListing = {
              batchId: BigInt(details.batchId.toString()),
              name: details.name,
              description: details.description,
              category: Category[details.category as keyof typeof Category],
              owner: details.owner as Address,
              totalQuantity: BigInt(details.totalQuantity.toString()),
              unitPrice: BigInt(details.unitPrice.toString()),
              isListed: details.isListed,
              parentBatch: BigInt(details.parentBatch.toString()),
              timestamp: BigInt(details.timestamp.toString()),
              isVerifiedManufacturer: registeredManufacturers.includes(details.owner),
            };
            batchDetails.push(listing);
          }
        } catch (error) {
          console.error('Error fetching details for batch ID:', batchId.toString(), error);
        }
      }

      console.log('All batch details:', batchDetails);

      setListings(batchDetails);

      // Initialize quantities
      const quantities: RequestQuantity = {};
      batchDetails.forEach(listing => {
        quantities[listing.batchId.toString()] = '1';
      });
      setRequestQuantities(quantities);

    } catch (error) {
      console.error('Error fetching listings:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error('Failed to fetch listings', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!publicClient) return;

      setIsLoading(true);
      try {
        // Get registered manufacturers
        const manufacturers = await contract.getRegisteredManufacturers();
        setRegisteredManufacturers(manufacturers);
        console.log('Registered manufacturers:', manufacturers);

        // Fetch listings
        await fetchListings();

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load marketplace data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [publicClient]);

  const fetchUserBalances = async () => {
    if (!walletClient) return;

    try {
      const signer = await new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const signerAddress = await signer.getAddress();

      // Get mUSDT balance
      const musdtBalance = await musdtContract.balanceOf(signerAddress);
      const musdtDecimals = await musdtContract.decimals();
      const musdtBalanceFormatted = (Number(musdtBalance) / Math.pow(10, Number(musdtDecimals))).toFixed(2);

      // Get ETN balance
      const etnBalance = await provider.getBalance(signerAddress);
      const etnBalanceFormatted = (Number(etnBalance) / 1e18).toFixed(4);

      setUserBalances({
        mUSDT: musdtBalanceFormatted,
        ETN: etnBalanceFormatted
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    fetchUserBalances();
  }, [walletClient]);

  const handleRequestProducts = async (listing: ProductListing) => {
    if (!walletClient) {
      console.log('No wallet client available');
      toast.error('Please connect your wallet first', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }

    const quantity = requestQuantities[listing.batchId.toString()];
    if (!quantity || Number(quantity) <= 0) {
      console.error('Invalid quantity:', quantity);
      toast.error('Please enter a valid quantity', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }

    // Calculate total amount in 18 decimal precision
    // listing.unitPrice is already in 18 decimals from the contract
    const totalAmount = listing.unitPrice * BigInt(quantity);
    const totalAmountDisplay = Number(listing.unitPrice) * Number(quantity) / 1e18;
    
    console.log('Requesting products:', {
      batchId: listing.batchId.toString(),
      quantity,
      unitPrice: (Number(listing.unitPrice) / 1e18).toString(),
      totalAmount: totalAmount.toString(),
      totalAmountDisplay: totalAmountDisplay.toString(),
      listingDetails: listing
    });

    setIsRequesting(true);
    let toastId: string;

    try {
      // Create contract instances with signer
      const signer = await new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const signerAddress = await signer.getAddress();
      
      const musdtWithSigner = new ethers.Contract(
        MUSDT_ADDRESS,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function balanceOf(address account) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        signer
      );
      
      const contractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESSES.NEXTRACK,
        [
          'function requestProductBatch(uint256 batchId, uint256 quantityRequested) returns (uint256)',
          'function getAllBatchIds() view returns (uint256[])',
          'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, bool isListed, uint256 parentBatch, uint256 timestamp))',
          'function getRegisteredManufacturers() view returns (address[])'
        ],
        signer
      );

      // Check user's mUSDT balance first
      const balance = await musdtWithSigner.balanceOf(signerAddress);
      console.log('User mUSDT balance:', balance.toString());
      console.log('Required amount:', totalAmount.toString());

      if (balance < totalAmount) {
        toast.error('Insufficient mUSDT Balance!', {
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        setIsRequesting(false);
        return;
      }
      
      // Check current allowance
      console.log('Checking current mUSDT allowance...');
      const currentAllowance = await musdtWithSigner.allowance(signerAddress, VAULT_ADDRESS);
      console.log('Current allowance (raw):', currentAllowance.toString());
      console.log('Current allowance (display):', Number(currentAllowance) / 1e18);
      console.log('Required amount (raw):', totalAmount.toString());
      console.log('Required amount (display):', totalAmountDisplay);

      // Compare amounts in their raw 18 decimal precision
      if (currentAllowance < totalAmount) {
        toastId = toast.loading(`Approving ${totalAmountDisplay} mUSDT spend...`, {
          duration: Infinity,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });

        console.log('Current allowance insufficient, approving vault to spend mUSDT...');
        const approveTx = await musdtWithSigner.approve(VAULT_ADDRESS, totalAmount);
        console.log('Approval transaction sent! Hash:', approveTx.hash);
        
        toast.loading('Confirming approval...', {
          id: toastId,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        
        await approveTx.wait();
        console.log('Approval confirmed!');

        toast.success(`${totalAmountDisplay} mUSDT spend approved!`, {
          id: toastId,
          duration: 2000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      } else {
        console.log('Sufficient allowance exists, proceeding with request...');
      }

      // Step 2: Request product batch
      toastId = toast.loading(`Requesting products for ${totalAmountDisplay} mUSDT...`, {
        duration: Infinity,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      console.log('Sending request transaction...');
      console.log('Request params:', {
        batchId: listing.batchId,
        quantityRequested: quantity
      });
      const requestTx = await contractWithSigner.requestProductBatch(
        listing.batchId,
        Number(quantity)
      );
      console.log('Request transaction sent! Hash:', requestTx.hash);

      toast.loading('Confirming request...', {
        id: toastId,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      await requestTx.wait();
      console.log('Request confirmed!');

      toast.success(`Products requested successfully for ${totalAmountDisplay} mUSDT!`, {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      // Refresh balances and listings
      console.log('Refreshing data...');
      fetchUserBalances();
      fetchListings();
    } catch (error) {
      console.error('Error requesting products:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Handle user rejection separately
      if (error.code === 4001 || error?.info?.error?.code === 4001 || error.message?.includes('user rejected')) {
        toast.error('Transaction cancelled', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      } else {
        toast.error('Failed to request products', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleQuantityChange = (batchId: string, value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || Number(value) >= 0) {
      setRequestQuantities(prev => ({
        ...prev,
        [batchId]: value
      }));
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      if (activeTab === 'verified') {
        return registeredManufacturers.includes(listing.owner);
      } else {
        return !registeredManufacturers.includes(listing.owner);
      }
    });
  }, [listings, activeTab, registeredManufacturers]);

  const renderListing = (listing: ProductListing) => {
    return (
      <div
        key={listing.batchId.toString()}
        className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{listing.name}</h3>
              <p className="text-gray-300 mb-4">{listing.description}</p>
            </div>
            <div>
              <div className="text-gray-400">Batch ID</div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(listing.batchId.toString());
                  toast.success('Batch ID copied to clipboard');
                }}
                className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
              >
                {listing.batchId.toString()}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Price per unit</p>
              <p className="text-white font-medium">${(Number(listing.unitPrice) / 1e18).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Available Quantity</p>
              <p className="text-white font-medium">{listing.totalQuantity.toString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Seller</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(listing.owner.toString());
                  toast.success('Address copied to clipboard');
                }}
                className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
              >
                {listing.owner.toString()}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Enter quantity"
                value={requestQuantities[listing.batchId.toString()] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleQuantityChange(listing.batchId.toString(), value);
                }}
                className="flex-1 px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                step="1"
                onKeyDown={(e) => {
                  // Prevent decimal point
                  if (e.key === '.') {
                    e.preventDefault();
                  }
                }}
                max={Number(listing.totalQuantity)}
              />
              <button
                onClick={() => handleRequestProducts(listing)}
                disabled={!requestQuantities[listing.batchId.toString()] || isRequesting}
                className={`flex-1 ${
                  !requestQuantities[listing.batchId.toString()] || isRequesting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-2 px-4 rounded-lg font-medium transition-colors`}
              >
                {isRequesting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Requesting...
                  </span>
                ) : (
                  'Request'
                )}
              </button>
            </div>
            {requestQuantities[listing.batchId.toString()] && (
              <div className="text-right text-gray-400">
                Total: ${((Number(listing.unitPrice) / 1e18) * Number(requestQuantities[listing.batchId.toString()])).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Toaster />
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Marketplace</h1>

        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'verified'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Verified Manufacturers
          </button>
          <button
            onClick={() => setActiveTab('other')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'other'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Other Sellers
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No products available from {activeTab === 'verified' ? 'verified manufacturers' : 'other sellers'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredListings.map(renderListing)}
          </div>
        )}
      </main>
    </div>
  );
}
