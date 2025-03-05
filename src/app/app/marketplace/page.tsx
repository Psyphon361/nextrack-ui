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
import Image from 'next/image';

// Create ethers provider and contract outside component
const provider = new ethers.JsonRpcProvider(ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]);

// Contract addresses
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const MUSDT_ADDRESS = process.env.NEXT_PUBLIC_MUSDT_ADDRESS as `0x${string}`;

// Create contract instances
const contract = new ethers.Contract(
  CONTRACT_ADDRESSES.NEXTRACK,
  [
    'function getAllBatchIds() view returns (uint256[])',
    'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, string ipfsUrl, bool isListed, uint256 parentBatch, uint256 timestamp))',
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

const ExternalLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 ml-1 inline-block text-blue-400" // Added text-blue-400
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

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
  ipfsUrl: string;
}

interface RequestQuantity {
  [key: string]: string; // batchId -> quantity
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // commented view switch for now due to some issues, can be enabled later a new feature in a future release
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
      // console.log('Received batch IDs:', batchIds.map(id => id.toString()));

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
          if (details.isListed && details.totalQuantity > BigInt(0)) {
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
              ipfsUrl: details.ipfsUrl || '',
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
    if (isRequesting) return;
    setIsRequesting(true);

    // Initialize toastId at the start
    let toastId = toast.loading('Checking approval...', {
      duration: Infinity,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      if (!walletClient) {
        console.log('No wallet client available');
        toast.error('Please connect your wallet first', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        setIsRequesting(false);
        return;
      }

      // Create signer instance first to get user's address
      const signer = await new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const signerAddress = await signer.getAddress();

      // Check if the user is trying to order their own listing
      if (listing.owner.toLowerCase() === signerAddress.toLowerCase()) {
        toast.error('Cannot request own products', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        setIsRequesting(false);
        return;
      }

      const quantity = requestQuantities[listing.batchId.toString()];
      if (!quantity || Number(quantity) <= 0) {
        console.error('Invalid quantity:', quantity);
        toast.error('Please enter a valid quantity', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        setIsRequesting(false);
        return;
      }

      // Calculate total amount in 18 decimal precision
      // listing.unitPrice is already in 18 decimals from the contract
      const totalAmount = listing.unitPrice * BigInt(quantity);
      const totalAmountDisplay = (Number(listing.unitPrice) * Number(quantity) / 1e18).toFixed(2);
      
      console.log('Requesting products:', {
        batchId: listing.batchId.toString(),
        quantity,
        unitPrice: (Number(listing.unitPrice) / 1e18).toString(),
        totalAmount: totalAmount.toString(),
        totalAmountDisplay: totalAmountDisplay.toString(),
        listingDetails: listing
      });

      // Create contract instances with signer
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
          'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, bool isListed, uint256 parentBatch, uint256 timestamp, string ipfsUrl))',
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
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
        setIsRequesting(false);
        return;
      }
      const currentAllowance = await musdtWithSigner.allowance(signerAddress, VAULT_ADDRESS);
      // Compare amounts in their raw 18 decimal precision
      if (currentAllowance < totalAmount) {
        toast.loading('Approving mUSDT spend...', {
          id: toastId,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });

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
      toast.loading(`Requesting products for $${Number(totalAmountDisplay).toFixed(2)}`, {
        id: toastId,
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

      toast.success(`Requested Successfully!`, {
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
      const isUserRejection = (
        (typeof error === 'object' && error !== null && (
          'code' in error && error.code === 4001 ||
          'info' in error && typeof error.info === 'object' && error.info !== null && 
          'error' in error.info && typeof error.info.error === 'object' && error.info.error !== null && 
          'code' in error.info.error && error.info.error.code === 4001
        )) ||
        (error instanceof Error && error.message?.includes('user rejected'))
      );

      if (isUserRejection) {
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

  const renderListing = (listing: ProductListing) => (
    <div
      key={listing.batchId.toString()}
      className={`bg-gradient-to-br from-gray-800 to-gray-900/50 rounded-xl p-4 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group ${viewMode === 'list' ? 'flex flex-col md:flex-row gap-6' : ''}`}
    >
      <div className={`flex flex-col ${viewMode === 'list' ? 'md:flex-row md:gap-6 w-full' : 'h-full'}`}>
        {/* Product Image */}
        <div className={`relative ${viewMode === 'list' ? 'w-full md:w-1/3 h-60 md:h-auto' : 'w-full h-60'} mb-3 overflow-hidden rounded-lg bg-gray-800 flex items-center justify-center`}>
          {listing.ipfsUrl ? (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <Image
                src={listing.ipfsUrl}
                alt={listing.name}
                className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-300"
                width={300}
                height={300}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className={`space-y-3 ${viewMode === 'list' ? 'md:flex-1' : ''}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                {listing.name}
              </h3>
              <p className="text-gray-300 text line-clamp-2 h-12">{listing.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-gray-400 text">Batch ID</div>
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

          <div className={`grid ${viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-2'} gap-4 mt-4 h-24`}>
            <div>
              <div className="text-gray-400 text">Seller</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(listing.owner);
                  toast.success('Seller address copied to clipboard');
                }}
                className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded hover:bg-blue-600/50 transition-colors"
              >
                {`${listing.owner.slice(0, 8)}...${listing.owner.slice(-6)}`}
              </button>
            </div>
            <div className={viewMode === 'list' ? '' : 'text-right'}>
              <div className="text-gray-400 text">Price per unit</div>
              <p className="text-white font-semibold text-base">
                ${(Number(listing.unitPrice) / 1e18).toFixed(2)}
              </p>
            </div>
            <div>
              <div className="text-gray-400 text">Category</div>
              <p className="text-white font-semibold text-base">
                {listing.category}
              </p>
            </div>
            <div className={viewMode === 'list' ? '' : 'text-right'}>
              <p className="text-gray-400 text">Available Quantity</p>
              <p className="text-white font-semibold text-base">
                {listing.totalQuantity.toString()}
              </p>
            </div>
          </div>

          <div className={`space-y-2 ${viewMode === 'list' ? 'flex flex-wrap items-center gap-4' : 'h-20 flex flex-col justify-end'}`}>
            <div className={`${viewMode === 'list' ? 'flex items-center gap-4 flex-1' : 'flex justify-center gap-6'}`}>
              <div className={viewMode === 'list' ? 'w-auto' : 'w-1/4'}></div>
              <div className="relative w-full">
                {requestQuantities[listing.batchId.toString()] && (
                  <div className="absolute -top-6 left-0 text-gray-400 text-sm justify-center">
                    Total: ${(Number(listing.unitPrice) * Number(requestQuantities[listing.batchId.toString()]) / 1e18).toFixed(2)}
                  </div>
                )}
                <input
                  type="number"
                  min="1"
                  max={listing.totalQuantity.toString()}
                  value={requestQuantities[listing.batchId.toString()] || ''}
                  onChange={(e) => handleQuantityChange(listing, e)}
                  placeholder="Enter quantity"
                  className={`${viewMode === 'list' ? 'w-48' : 'w-full'} bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <button
                onClick={() => handleRequestProducts(listing)}
                disabled={!requestQuantities[listing.batchId.toString()] || isRequesting}
                className={`${viewMode === 'list' ? 'flex-1 max-w-xs' : 'w-80'} rounded-lg text font-semibold transition-all duration-300 flex items-center justify-center px-3 py-2 ${
                  !requestQuantities[listing.batchId.toString()] || isRequesting
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                {isRequesting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                    Requesting...
                  </span>
                ) : (
                  'Request'
                )}
              </button>
              <div className={viewMode === 'list' ? 'w-auto' : 'w-1/4'}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        }}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-4">
            <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Marketplace
            </h1>

            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="bg-gray-800/50 border border-gray-700/30 rounded-xl px-4 py-2">
                <span className="text-gray-400">Balances:</span>
                <span className="text-white ml-2">{userBalances.mUSDT} mUSDT</span>
                <span className="text-white ml-4">{userBalances.ETN} ETN</span>
              </div>

              <a
                href="https://electroneum-faucet.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold font-['Space_Grotesk'] text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 border-2 border-blue-500/50 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 rounded-lg px-4 py-2 flex items-center"
              >
                Free ETN + mUSDT Faucet!
                <ExternalLinkIcon />
              </a>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-64 transition-all duration-300"
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex space-x-4">
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
            
            {/* <div className="flex items-center bg-gray-800/50 border border-gray-700/30 rounded-lg p-1">
              <span className="text-gray-400 mr-2 pl-2">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                aria-label="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                aria-label="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div> */}
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : filteredListings.length > 0 ? (
            <div className={`
              ${viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'flex flex-col space-y-6'
              }
            `}>
              {filteredListings.map(renderListing)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
