'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { Address } from 'viem';
import Navigation from '@/components/Navigation';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { createPublicClient, http, defineChain } from 'viem';
import { ELECTRONEUM_TESTNET_CONFIG } from '@/config/contracts';

// Define Electroneum testnet chain
const electroneumTestnet = defineChain({
  id: parseInt(ELECTRONEUM_TESTNET_CONFIG.chainId, 16),
  name: ELECTRONEUM_TESTNET_CONFIG.chainName,
  nativeCurrency: ELECTRONEUM_TESTNET_CONFIG.nativeCurrency,
  rpcUrls: {
    default: { http: [ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]] },
  },
});

// Create public client outside component to prevent recreation
const publicClient = createPublicClient({
  chain: electroneumTestnet,
  transport: http(),
});

// Create ethers provider and contract interface
const provider = new ethers.JsonRpcProvider(ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]);
const contract = new ethers.Contract(
  CONTRACT_ADDRESSES.NEXTRACK,
  [
    'function getCurrentInventory(address owner) view returns (uint256[])',
    'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, bool isListed, uint256 parentBatch, uint256 timestamp))'
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

interface BatchDetails {
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
}

// Format price from wei to USD
const formatPrice = (price: bigint) => {
  try {
    // Convert from wei (18 decimals) to USD
    const priceInUSD = Number(price) / 1e18;
    return `$${priceInUSD.toFixed(2)}`;
  } catch (error) {
    console.error('Error formatting price:', error);
    return '$0.00';
  }
};

type ListingFilter = 'all' | 'listed' | 'delisted';

interface EditPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: string) => void;
  currentPrice: string;
}

const EditPriceModal = ({ isOpen, onClose, onSubmit, currentPrice }: EditPriceModalProps) => {
  const [price, setPrice] = useState(currentPrice);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-xl font-bold text-white mb-4">Update Unit Price</h3>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-700 text-white mb-4"
          placeholder="Enter new price in USD"
          step="0.01"
          min="0"
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(price);
              onClose();
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MyBatchesPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [isManufacturer, setIsManufacturer] = useState(false);
  const [editingBatch, setEditingBatch] = useState<{ id: string; price: string } | null>(null);

  // Use the contract address from contracts.ts instead of env
  const contractAddress = CONTRACT_ADDRESSES.NEXTRACK as Address;
  const NexTrackABI = CONTRACT_ABIS.NEXTRACK;

  // Log immediately when component renders
  console.log('MyBatchesPage rendered:', {
    isConnected,
    address,
    contractAddress,
    chainId: electroneumTestnet.id,
    chainIdHex: `0x${electroneumTestnet.id.toString(16)}`,
  });

  useEffect(() => {
    const checkManufacturerStatus = async () => {
      if (!isConnected || !address || !publicClient) {
        setIsManufacturer(false);
        return;
      }

      try {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.NEXTRACK as `0x${string}`,
          abi: CONTRACT_ABIS.NEXTRACK,
          functionName: 'getRegisteredManufacturers',
        });

        if (!Array.isArray(data)) {
          setIsManufacturer(false);
          return;
        }

        const manufacturers = data as `0x${string}`[];
        const isUserManufacturer = manufacturers
          .map(addr => addr.toLowerCase())
          .includes(address.toLowerCase());
        
        setIsManufacturer(isUserManufacturer);
      } catch (error) {
        console.error('Error checking manufacturer status:', error);
        setIsManufacturer(false);
      }
    };

    checkManufacturerStatus();
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    let mounted = true;
    console.log('useEffect triggered with:', { address, contractAddress });
    
    async function fetchBatchData() {
      if (!mounted) return;
      
      console.log('=== Starting batch data fetch ===');
      console.log('Connected wallet:', address);
      console.log('Contract address:', contractAddress);
      console.log('Chain ID:', electroneumTestnet.id);
      console.log('Chain ID (hex):', `0x${electroneumTestnet.id.toString(16)}`);
      console.log('RPC URL:', electroneumTestnet.rpcUrls.default.http[0]);

      if (!address || !contractAddress) {
        console.log('Missing required addresses:', { address, contractAddress });
        return;
      }

      try {
        setIsLoading(true);

        // Get current inventory using contract
        const batchIds = await contract.getCurrentInventory(address);

        if (!mounted) return;
        console.log('getCurrentInventory response:', batchIds);
        console.log('Number of batches found:', batchIds.length);
        console.log('Batch IDs:', batchIds.map(id => id.toString()));

        if (!batchIds || batchIds.length === 0) {
          console.log('No batch IDs found in response');
          setBatches([]);
          return;
        }

        // Fetch batch details one by one
        const batchDetails: BatchDetails[] = [];
        console.log(`Fetching details for ${batchIds.length} batches`);

        for (const batchId of batchIds) {
          if (!mounted) return;
          try {
            console.log(`Calling getBatchDetails for ID ${batchId.toString()}`, {
              address: contractAddress,
              functionName: 'getBatchDetails',
              args: [batchId],
              batchIdHex: `0x${batchId.toString(16)}`,
            });

            const details = await contract.getBatchDetails(batchId);
            console.log(`Raw response for batch ${batchId.toString()}:`, details);

            if (!mounted) return;

            const batchDetail: BatchDetails = {
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
            };

            console.log('Processed batch details:', {
              id: batchDetail.batchId.toString(),
              idHex: `0x${batchDetail.batchId.toString(16)}`,
              name: batchDetail.name,
              category: batchDetail.category,
              owner: batchDetail.owner,
              quantity: batchDetail.totalQuantity.toString(),
              price: formatPrice(batchDetail.unitPrice),
              isListed: batchDetail.isListed
            });
            batchDetails.push(batchDetail);
            console.log('Added batch to list. Current count:', batchDetails.length);
          } catch (err) {
            console.error(`Error fetching details for batch ${batchId.toString()}:`, err);
            console.error('Error details:', {
              name: (err as Error).name,
              message: (err as Error).message,
              stack: (err as Error).stack,
              batchId: batchId.toString(),
              batchIdHex: `0x${batchId.toString(16)}`,
            });
            // Continue with other batches even if one fails
          }
        }

        if (!mounted) return;
        console.log('Final batch details array:', batchDetails);
        console.log('Total batches processed:', batchDetails.length);
        setBatches(batchDetails);
      } catch (err) {
        if (!mounted) return;
        console.error('Error in fetchBatchData:', err);
        console.error('Error details:', {
          name: (err as Error).name,
          message: (err as Error).message,
          stack: (err as Error).stack,
        });
      } finally {
        if (!mounted) return;
        setIsLoading(false);
        console.log('=== Finished batch data fetch ===');
      }
    }

    fetchBatchData();

    return () => {
      mounted = false;
    };
  }, [address, contractAddress]);

  const handleDelist = async (batchId: bigint) => {
    if (!walletClient || !address || isTransactionPending) return;

    setIsTransactionPending(true);
    const toastId = toast.loading('Delisting batch...', {
      duration: Infinity,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      // Create contract instance with signer
      const signer = new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        [
          'function delistProductBatch(uint256 batchId)'
        ],
        await signer
      );

      console.log('Delisting batch:', batchId.toString());
      
      // Call the delist function
      const tx = await contract.delistProductBatch(batchId);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log('Transaction confirmed');

      // Update the local state
      setBatches(prevBatches => 
        prevBatches.map(batch => 
          batch.batchId === batchId 
            ? { ...batch, isListed: false }
            : batch
        )
      );
      
      toast.success('Batch delisted successfully', {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } catch (err) {
      console.error('Error delisting batch:', err);
      if (err.code === 4001 || err?.info?.error?.code === 4001 || err.message?.includes('user rejected')) {
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
        toast.error('Failed to delist batch', {
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
      setIsTransactionPending(false);
    }
  };

  const handleRelist = async (batchId: bigint) => {
    if (!walletClient || !address || isTransactionPending) return;

    setIsTransactionPending(true);
    const toastId = toast.loading('Relisting batch...', {
      duration: Infinity,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      // Create contract instance with signer
      const signer = new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        [
          'function listProductBatch(uint256 batchId)'
        ],
        await signer
      );

      console.log('Relisting batch:', batchId.toString());
      
      // Call the list function
      const tx = await contract.listProductBatch(batchId);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log('Transaction confirmed');

      // Update the local state
      setBatches(prevBatches => 
        prevBatches.map(batch => 
          batch.batchId === batchId 
            ? { ...batch, isListed: true }
            : batch
        )
      );
      
      toast.success('Batch relisted successfully', {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } catch (err) {
      console.error('Error relisting batch:', err);
      if (err.code === 4001 || err?.info?.error?.code === 4001 || err.message?.includes('user rejected')) {
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
        toast.error('Failed to relist batch', {
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
      setIsTransactionPending(false);
    }
  };

  const updateLocalBatchPrice = (batchId: string, newPrice: bigint) => {
    setBatches(prevBatches => 
      prevBatches.map(batch => 
        batch.batchId.toString() === batchId
          ? { ...batch, unitPrice: newPrice }
          : batch
      )
    );
  };

  const handleUpdatePrice = async (newPrice: string) => {
    if (!walletClient || !editingBatch) {
      toast.error('Please connect your wallet');
      return;
    }

    const toastId = toast.loading('Updating price...');
    setIsTransactionPending(true);

    try {
      // Create contract instance with signer first
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABIS.NEXTRACK,
        signer
      );

      // Convert price string to number (no 18 decimal conversion)
      const priceValue = BigInt(Math.round(parseFloat(newPrice) * 100) / 100);
      
      console.log('Updating price for batch:', editingBatch.id);
      console.log('New price (USD):', priceValue.toString());
      
      // Call the update price function with USD value directly
      const tx = await contract.updateBatchUnitPrice(
        BigInt(editingBatch.id),
        priceValue
      );

      toast.loading('Updating price on blockchain...', { id: toastId });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // Update the local state without reloading
      updateLocalBatchPrice(editingBatch.id, priceValue);
      
      toast.success('Price updated successfully!', { id: toastId });
    } catch (error) {
      console.error(`Error updating price:`, error);
      const errorMessage = (error as Error).message || '';
      
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        toast.error('Transaction rejected', { id: toastId });
      } else {
        toast.error('Failed to update price', { id: toastId });
      }
    } finally {
      setIsTransactionPending(false);
      setEditingBatch(null);
    }
  };

  if (!isConnected) {
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
            duration: 3000,
          }}
        />
        <Navigation />
        <div className="container mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold mb-8">My Listings</h1>
          <p>Please connect your wallet to view your listings.</p>
        </div>
      </div>
    );
  }

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
      <main className="container mx-auto px-4 py-8">
        <div className="relative mb-8">
          <h1 className="text-4xl font-bold text-center text-white">My Listings</h1>
          {isManufacturer && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <a 
                href="/app/register-batch"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                <svg 
                  className="w-5 h-5 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Register Product
              </a>
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('listed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'listed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Listed
          </button>
          <button
            onClick={() => setFilter('delisted')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'delisted'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Delisted
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center">
            <p className="mb-4">You don't have any listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches
              .filter(batch => {
                if (filter === 'listed') return batch.isListed;
                if (filter === 'delisted') return !batch.isListed;
                return true;
              })
              .map((batch) => (
                <div 
                  key={batch.batchId.toString()} 
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-2">{batch.name}</h3>
                  <p className="text-gray-400 mb-4">{batch.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span>{batch.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quantity:</span>
                      <span>{batch.totalQuantity.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per unit:</span>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">{formatPrice(batch.unitPrice)}</p>
                        <button
                          onClick={() => setEditingBatch({ 
                            id: batch.batchId.toString(),
                            // Divide by 1e18 when setting initial price in modal
                            price: (Number(batch.unitPrice) / 1e18).toString()
                          })}
                          className="text-gray-400 hover:text-white transition-colors"
                          disabled={isTransactionPending}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Status:</span>
                      <div className="flex items-center space-x-2">
                        <span className={batch.isListed ? 'text-green-400' : 'text-red-400'}>
                          {batch.isListed ? 'Listed' : 'Delisted'}
                        </span>
                        {batch.isListed ? (
                          <button
                            onClick={() => handleDelist(batch.batchId)}
                            disabled={isTransactionPending}
                            className={`px-2 py-1 text-sm rounded transition-colors ml-2 ${
                              isTransactionPending
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            Delist
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRelist(batch.batchId)}
                            disabled={isTransactionPending}
                            className={`px-2 py-1 text-sm rounded transition-colors ml-2 ${
                              isTransactionPending
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            Relist
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
      <EditPriceModal
        isOpen={!!editingBatch}
        onClose={() => setEditingBatch(null)}
        onSubmit={handleUpdatePrice}
        currentPrice={editingBatch?.price || ''}
      />
    </div>
  );
}
