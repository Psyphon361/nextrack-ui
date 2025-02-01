'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { useNexTrackContract } from '@/hooks/useNexTrackContract';
import Navigation from '@/components/Navigation';
import NexTrackABI from '../../../contracts/NexTrackABI.json';

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
    if (statusFilter === undefined) return true;
    return request.status === statusFilter;
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
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Toaster />
        <h1 className="text-4xl font-bold mb-8 text-center text-white">My Orders</h1>
        
        {/* Status filter */}
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter(0)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter(1)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter(2)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 2
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter(3)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 3
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No {statusFilter === undefined ? '' : REQUEST_STATUS_LABELS[statusFilter]} orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedRequests.map((request) => (
              <div
                key={request.requestId.toString()}
                className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-gray-400">From</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.seller);
                          toast.success('Address copied to clipboard');
                        }}
                        className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                      >
                        {request.seller}
                      </button>
                      <div className="text-gray-400 mt-2">To</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.buyer);
                          toast.success('Address copied to clipboard');
                        }}
                        className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                      >
                        {request.buyer}
                      </button>
                    </div>
                    <div>
                      <div className="text-gray-400">Batch ID</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.batchId.toString());
                          toast.success('Batch ID copied to clipboard');
                        }}
                        className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                      >
                        {request.batchId.toString()}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Quantity</p>
                      <p className="text-white font-medium">{request.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Price per Unit</p>
                      <p className="text-white font-medium">{request.pricePerUnit} mUSDT</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Amount</p>
                      <p className="text-white font-medium">{request.totalAmount} mUSDT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Status</p>
                      <p className={`font-medium ${getStatusClass(request.status)}`}>
                        {REQUEST_STATUS_LABELS[request.status]}
                      </p>
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
