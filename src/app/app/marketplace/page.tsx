'use client';

import { useState, useEffect, useMemo } from 'react';
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

      // Initialize quantities to empty string
      const quantities: RequestQuantity = {};
      batchDetails.forEach(listing => {
        quantities[listing.batchId.toString()] = '';
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

  const handleQuantityChange = (listing: ProductListing, e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = inputValue === '' ? '' : Math.min(
      Number(inputValue), 
      Number(listing.totalQuantity)
    ).toString();
    
    const newQuantities = { ...requestQuantities };
    newQuantities[listing.batchId.toString()] = numericValue;
    setRequestQuantities(newQuantities);
  };

  const filteredListings = useMemo(() => {
    return listings
      .filter(listing => {
        // Filter by manufacturer type
        if (activeTab === 'verified') {
          return registeredManufacturers.includes(listing.owner);
        } else {
          return !registeredManufacturers.includes(listing.owner);
        }
      })
      .filter(listing => {
        // Filter by search query
        if (!searchQuery) return true;
        
        // Convert search query to lowercase for case-insensitive search
        const query = searchQuery.toLowerCase().trim();
        
        // Search across multiple fields
        return (
          listing.name.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query) ||
          listing.category.toLowerCase().includes(query) ||
          listing.batchId.toString().includes(query)
        );
      });
  }, [listings, activeTab, registeredManufacturers, searchQuery]);

  const renderListing = (listing: ProductListing) => {
    return (
      <div
        key={listing.batchId.toString()}
        className="bg-gradient-to-br from-gray-800 to-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group"
      >
        <div className="space-y-4">
           <div className="flex justify-between items-start">
            <div className="flex-grow pr-4">
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {listing.name}
              </h3>
              <p className="text-gray-300 text-sm mb-4 line-clamp-2">{listing.description}</p>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm mb-1">Batch ID</div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(listing.batchId.toString());
                  toast.success('Batch ID copied to clipboard');
                }}
                className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded hover:bg-blue-600/50 transition-colors"
              >
                {listing.batchId.toString()}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-700/30 pt-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Price per unit</p>
              <p className="text-white font-semibold text-lg">
                ${(Number(listing.unitPrice) / 1e18).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Available Quantity</p>
              <p className="text-white font-semibold text-lg">
                {listing.totalQuantity.toString()}
              </p>
            </div>
            <div className="col-span-2 border-t border-gray-700/30 pt-4">
              <p className="text-gray-400 text-sm mb-1">Seller</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(listing.owner.toString());
                  toast.success('Address copied to clipboard');
                }}
                className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded w-full text-left hover:bg-blue-600/50 transition-colors truncate"
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
                onChange={(e) => handleQuantityChange(listing, e)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              />
              <button
                onClick={() => handleRequestProducts(listing)}
                disabled={!requestQuantities[listing.batchId.toString()] || isRequesting}
                className={`flex-1 rounded-lg font-medium transition-all duration-300 py-2 px-4 ${
                  !requestQuantities[listing.batchId.toString()] || isRequesting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
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
              <div className="text-right text-gray-400 text-sm">
                Total: ${((Number(listing.unitPrice) / 1e18) * Number(requestQuantities[listing.batchId.toString()])).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Marketplace
          </h1>
          {walletClient && (
            <div className="flex items-center space-x-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl px-5 py-2.5 shadow-md border border-gray-700/30">
              <span className="text-gray-300 font-medium text-sm tracking-wider">
                Balances:
              </span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-white font-semibold">
                    {Number(userBalances.mUSDT).toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">mUSDT</span>
                </div>
                <div className="h-4 w-px bg-gray-600"></div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-white font-semibold">
                    {Number(userBalances.ETN).toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">ETN</span>
                </div>
              </div>
            </div>
          )}
          <div className="relative w-full md:w-96 mt-4 md:mt-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 pl-10"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              activeTab === 'verified'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Verified Manufacturers
          </button>
          <button
            onClick={() => setActiveTab('other')}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              activeTab === 'other'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Other Sellers
          </button>
        </div>

        <main>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">No products found for this search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredListings.map(renderListing)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
