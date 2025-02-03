'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { useNexTrackContract } from '@/hooks/useNexTrackContract';
import Navigation from '@/components/Navigation';
import NexTrackABI from '../../../contracts/NexTrackABI.json';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// Contract interfaces
interface ContractTransferRequest {
  requestId: bigint;
  batchId: bigint;
  seller: string;
  buyer: string;
  quantityRequested: bigint;
  totalAmount: bigint;
  status: number;
  timestamp: bigint;
}

// UI interfaces
interface TransferRequest {
  requestId: bigint;
  batchId: number;
  seller: string;
  buyer: string;
  quantity: number;
  totalAmount: string;
  status: number;
  timestamp: number;
  productName: string;
  productDescription: string;
  pricePerUnit: string;
}

const REQUEST_STATUS_LABELS: { [key: number]: string } = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Completed'
};

export default function OrdersPage() {
  const { address, isConnected } = useAccount();
  const { readOnlyContract, signerContract } = useNexTrackContract();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTx, setProcessingTx] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Format number to 2 decimal places and remove trailing zeros
  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  useEffect(() => {
    const fetchRequests = async () => {
      if (!address || !readOnlyContract) {
        setRequests([]);
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Fetching requests for buyer:', address);
        const requestIds = await readOnlyContract.getBuyerTransferRequests(address);
        console.log('📝 Request IDs:', requestIds);

        const requestsWithDetails = await Promise.all(
          requestIds.map(async (requestId: bigint) => {
            try {
              console.log(`📦 Fetching details for request ${requestId.toString()}`);
              const parsedRequest = await readOnlyContract.getTransferRequestDetails(requestId);
              console.log('📦 Request Details - Raw Response:', parsedRequest);

              const batchIdString = parsedRequest.batchId.toString();
              let batch;
              
              if (!batchIdString) {
                console.warn('⚠️ No batch ID found for request:', requestId.toString());
                batch = { name: 'Unknown', description: 'Unknown', unitPrice: BigInt(0) };
              } else {
                console.log(`📦 Fetching batch details for batch ${batchIdString}`);
                const batchResponse = await readOnlyContract.getBatchDetails(parsedRequest.batchId);
                console.log('📦 Batch Details - Raw Response:', batchResponse);
                batch = batchResponse;
              }

              const safeFormatUnits = (value: bigint | null | undefined) => {
                if (!value) return '0';
                try {
                  // Format as mUSDT (18 decimals)
                  const formatted = ethers.formatUnits(value, 18);
                  return formatNumber(formatted);
                } catch (error) {
                  console.warn('Error formatting units:', error);
                  return '0';
                }
              };

              const result = {
                requestId: parsedRequest.requestId,
                batchId: Number(parsedRequest.batchId),
                seller: parsedRequest.seller || address,
                buyer: parsedRequest.buyer || '',
                quantity: Number(parsedRequest.quantityRequested),
                totalAmount: safeFormatUnits(parsedRequest.totalAmount),
                status: Number(parsedRequest.status),
                timestamp: Number(parsedRequest.timestamp),
                productName: batch.name || '',
                productDescription: batch.description || '',
                pricePerUnit: safeFormatUnits(batch.unitPrice)
              };

              console.log('✨ Processed Result:', result);
              return result;
            } catch (error) {
              console.error(`❌ Error processing request ${requestId.toString()}:`, error);
              console.error('Full error:', error);
              throw error;
            }
          })
        );

        console.log('✅ Processed requests:', requestsWithDetails);
        setRequests(requestsWithDetails);
      } catch (error) {
        console.error('❌ Error fetching requests:', error);
        toast.error('Failed to fetch requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [address, readOnlyContract]);

  const handleConfirmReceipt = async (requestId: bigint) => {
    if (!signerContract) {
      toast.error('Please connect your wallet');
      return;
    }

    const toastId = toast.loading('Confirming receipt...');

    try {
      console.log(`🔄 Confirming receipt for request ${requestId}`);
      setProcessingTx(`confirm-${requestId.toString()}`);

      // Get the contract interface
      const iface = new ethers.Interface(NexTrackABI);
      
      // Encode the function call
      const data = iface.encodeFunctionData("confirmTransfer", [requestId]);
      
      // First do a static call to check if the transaction will succeed
      try {
        await signerContract.confirmTransfer.staticCall(requestId);
      } catch (error) {
        console.error('Static call failed:', error);
        throw new Error('Transaction would fail');
      }
      
      // Send the actual transaction
      const tx = await signerContract.confirmTransfer(requestId);
      
      toast.loading('Confirming receipt on blockchain...', { id: toastId });
      
      const receipt = await tx.wait();
      console.log(`✅ Confirm transaction confirmed:`, receipt.hash);
      
      toast.success('Receipt confirmed successfully!', { id: toastId });

      // Refresh the requests list
      window.location.reload();
    } catch (error) {
      console.error(`❌ Error confirming receipt ${requestId}:`, error);
      const errorMessage = (error as Error).message || '';
      
      // Check if user rejected transaction
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        toast.error('Transaction rejected', { id: toastId });
      } else if (errorMessage.includes('Transaction would fail')) {
        toast.error('Cannot confirm receipt. Please try again later.', { id: toastId });
      } else {
        toast.error('Failed to confirm receipt', { id: toastId });
      }
    } finally {
      setProcessingTx(null);
    }
  };

  const displayedRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === undefined || request.status === statusFilter;
    const matchesSearch = searchQuery.trim() === '' || 
      request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.productDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.batchId.toString().includes(searchQuery);
    
    return matchesStatus && matchesSearch;
  });

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0:
        return 'text-yellow-400';
      case 1:
        return 'text-green-400';
      case 2:
        return 'text-red-400';
      case 3:
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Toaster />
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            My Orders
          </h1>
          <div className="relative w-full md:w-96 mt-4 md:mt-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 pl-10"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
        
        {/* Status filter */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              statusFilter === undefined
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter(0)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              statusFilter === 0
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter(1)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              statusFilter === 1
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter(2)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              statusFilter === 2
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter(3)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${
              statusFilter === 3
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            Completed
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No orders found{searchQuery ? ` matching "${searchQuery}"` : ''}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedRequests.map((request) => (
              <div
                key={request.requestId.toString()}
                className="space-y-4 bg-gray-800/50 rounded-xl p-6 border border-gray-700/30"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow pr-4">
                    <h3 className="text-2xl font-bold text-white mb-2 transition-colors">
                      {request.productName}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{request.productDescription}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-sm mb-1">Batch ID</div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(request.batchId.toString());
                        toast.success('Batch ID copied to clipboard');
                      }}
                      className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded hover:bg-blue-600/50 transition-colors"
                    >
                      {request.batchId.toString()}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-700/30 pt-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Quantity</p>
                    <p className="text-white font-semibold text-lg">{request.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm mb-1">Price per Unit</p>
                    <p className="text-white font-semibold text-lg">${request.pricePerUnit}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                    <p className="text-white font-semibold text-lg">${request.totalAmount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <p className={`font-semibold text-lg ${getStatusClass(request.status)}`}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700/30 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">From</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.seller);
                          toast.success('Address copied to clipboard');
                        }}
                        className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded w-full text-left hover:bg-blue-600/50 transition-colors truncate"
                      >
                        {request.seller}
                      </button>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">To</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.buyer);
                          toast.success('Address copied to clipboard');
                        }}
                        className="text-white font-mono text-sm bg-gray-700/50 px-2 py-1 rounded w-full text-left hover:bg-blue-600/50 transition-colors truncate"
                      >
                        {request.buyer}
                      </button>
                    </div>
                  </div>
                </div>

                {request.status === 1 && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleConfirmReceipt(request.requestId)}
                      disabled={!!processingTx}
                      className={`w-full ${
                        processingTx
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white py-2 px-4 rounded-lg font-medium transition-colors`}
                    >
                      {processingTx === `confirm-${request.requestId.toString()}` ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Confirming...
                        </span>
                      ) : (
                        'Confirm Receipt'
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
