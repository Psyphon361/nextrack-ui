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
import Link from 'next/link';

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
    'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, string ipfsUrl, bool isListed, uint256 parentBatch, uint256 timestamp))'
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
  isTransactionPending: boolean;
}

const EditPriceModal = ({ isOpen, onClose, onSubmit, currentPrice, isTransactionPending }: EditPriceModalProps) => {
  const [price, setPrice] = useState(currentPrice);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-700/30 w-96">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">Update Unit Price</h3>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-gray-700/50 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
          placeholder="Enter new price in USD"
          step="0.01"
          min="0"
        />
        <div className="flex justify-center mt-3 space-x-3">
          <button
            onClick={onClose}
            disabled={isTransactionPending}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${isTransactionPending
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
              }`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(price)}
            disabled={isTransactionPending}
            className={`px-4 py-2 rounded-lg text-white transition-all duration-300 flex items-center justify-center ${isTransactionPending
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
          >
            {isTransactionPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Update'
            )}
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
        // console.log('Batch IDs:', batchIds.map(id => id.toString()));

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
      
      const isUserRejection = (
        (typeof err === 'object' && err !== null && (
          'code' in err && err.code === 4001 ||
          'info' in err && typeof err.info === 'object' && err.info !== null && 
          'error' in err.info && typeof err.info.error === 'object' && err.info.error !== null && 
          'code' in err.info.error && err.info.error.code === 4001
        )) ||
        (err instanceof Error && err.message?.includes('user rejected'))
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
    const toastId = toast.loading('Listing batch...', {
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

      console.log('Listing batch:', batchId.toString());

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

      toast.success('Batch Listed successfully', {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } catch (err) {
      console.error('Error Listing batch:', err);
      const isUserRejection = (
        (err as any).code === 4001 ||
        (err as any).info?.error?.code === 4001 ||
        (err as Error).message?.includes('user rejected')
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
        toast.error('Failed to List batch', {
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

    try {
      setIsTransactionPending(true);

      // Use parseUnits with 0 precision to pass the exact input
      const priceInWei = ethers.parseUnits(newPrice, 18);

      // Create contract instance with signer
      const signer = new ethers.BrowserProvider(window.ethereum as any).getSigner();
      const batchContract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABIS.NEXTRACK,
        await signer
      );

      console.log('Updating price for batch:', editingBatch.id);
      console.log('New price (USD):', priceInWei.toString());

      // Call the update price function with USD value directly
      const tx = await batchContract.updateBatchUnitPrice(
        BigInt(editingBatch.id),
        priceInWei
      );

      const toastId = toast.loading('Updating price on blockchain...', {
        duration: Infinity,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      if (receipt.status === 1) {
        // Transaction successful
        toast.success('Batch price updated successfully', {
          id: toastId,
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });

        // Update local state to reflect the new price
        updateLocalBatchPrice(editingBatch.id, priceInWei);

        // Close modal and reset editing state
        setEditingBatch(null);
      } else {
        // Transaction failed
        toast.error('Failed to update batch price', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      }
    } catch (error) {
      console.error(`Error updating price:`, error);
      const errorMessage = (error as Error).message || '';

      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        toast.error('Transaction rejected', {
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      } else {
        toast.error('Failed to update price', {
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
        <div className="container mx-auto px-6 py-8">
          <h1
            className="text-4xl font-bold font-['Space_Grotesk']"
            style={{
              background: 'linear-gradient(to right, #60a5fa, #a855f7)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block'
            }}
          >
            My Listings
          </h1>
          <p className="text-gray-300 text-lg mt-5">Please connect your wallet to view your listings.</p>
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
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            My Listings
          </h1>
          {isManufacturer && (
            <div className="relative w-full md:w-auto mt-4 md:mt-0">
              <a
                href="/app/register-batch"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-white transition-all duration-300 group"
              >
                <svg
                  className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform"
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
                Register Batch
              </a>
            </div>
          )}
        </div>

        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${filter === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('listed')}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${filter === 'listed'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            Listed
          </button>
          <button
            onClick={() => setFilter('delisted')}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${filter === 'delisted'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
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
                  className="bg-gradient-to-br from-gray-800 to-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group relative"
                >
                  {/* Glowing dot indicator */}
                  <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${batch.isListed
                        ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.7)]'
                        : 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]'
                      }`}
                  ></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow pr-4">
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                          <Link href={`/app/product/${batch.batchId}`} className="hover:text-blue-400 transition-colors">
                            {batch.name}
                          </Link>
                        </h3>
                        <p className="text-gray-300 text- mb-4 line-clamp-2">{batch.description}</p>
                      </div>
                      <div className="text-right mt-6">
                        <div className="text-gray-400 text mb-1">Batch ID</div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(batch.batchId.toString());
                            toast.success('Batch ID copied to clipboard');
                          }}
                          className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded hover:bg-blue-600/50 transition-colors"
                        >
                          {batch.batchId.toString()}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-700/30 pt-4">
                      <div>
                        <p className="text-gray-400 text mb-1">Category</p>
                        <p className="text-white font-semibold text-lg">{batch.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text mb-1">Quantity</p>
                        <p className="text-white font-semibold text-lg">{batch.totalQuantity.toString()}</p>
                      </div>
                      <div className="col-span-2 border-t border-gray-700/30 pt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-400 text mb-1">Price per unit</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-semibold text-lg">{formatPrice(batch.unitPrice)}</p>
                              <button
                                onClick={() => setEditingBatch({
                                  id: batch.batchId.toString(),
                                  price: (Number(batch.unitPrice) / 1e18).toString()
                                })}
                                className="text-gray-400 hover:text-blue-400 transition-colors"
                                disabled={isTransactionPending}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 text mb-1">Status</p>
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold text-md ${batch.isListed ? 'text-green-400' : 'text-red-400'}`}>
                                {batch.isListed ? 'Listed' : 'Delisted'}
                              </span>
                              {batch.isListed ? (
                                <button
                                  onClick={() => handleDelist(batch.batchId)}
                                  disabled={isTransactionPending}
                                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${isTransactionPending
                                      ? 'bg-gray-600 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                                    }`}
                                >
                                  Delist
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRelist(batch.batchId)}
                                  disabled={isTransactionPending}
                                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${isTransactionPending
                                      ? 'bg-gray-600 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                    }`}
                                >
                                  List
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
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
        isTransactionPending={isTransactionPending}
      />
    </div>
  );
}
