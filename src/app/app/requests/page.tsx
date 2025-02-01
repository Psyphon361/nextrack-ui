'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { useNexTrackContract } from '@/hooks/useNexTrackContract';
import Navigation from '@/components/Navigation';
import { useCallback } from "react";
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

enum RequestStatus {
  Pending,
  Approved,
  Rejected,
  Completed
}

const REQUEST_STATUS_LABELS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Completed'
};

export default function RequestsPage() {
  const { address } = useAccount();
  const { readOnlyContract, signerContract } = useNexTrackContract();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTx, setProcessingTx] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  // Format number to 2 decimal places and remove trailing zeros
  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const fetchRequests = async () => {
    if (!address || !readOnlyContract) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching transfer requests for address:', address);
      
      // Get all request IDs for the seller
      const requestIds = await readOnlyContract.getSellerTransferRequests(address);
      console.log('📋 Request IDs - Raw Response:', requestIds);
      console.log('📋 Request IDs - Mapped:', requestIds.map(id => id.toString()));
      
      // Create a map to store batch details to avoid duplicate calls
      const batchDetailsCache = new Map();
      
      // Fetch details for each request
      const requestsWithDetails = await Promise.all(
        requestIds.map(async (requestId: bigint) => {
          try {
            console.log(`\n📝 Processing Request ID: ${requestId.toString()}`);
            console.log('Calling getTransferRequestDetails with:', { requestId: requestId.toString() });
            
            const request = await readOnlyContract.getTransferRequestDetails(requestId);
            console.log('📄 Transfer Request - Raw Response:', request);
            
            // Parse the struct using array indices since ethers.js returns a Proxy object
            let parsedRequest: ContractTransferRequest;
            try {
              parsedRequest = {
                requestId: BigInt(request[0]),
                batchId: BigInt(request[1]),
                seller: request[2],
                buyer: request[3],
                quantityRequested: BigInt(request[4]),
                totalAmount: BigInt(request[5] || 0),
                status: Number(request[6] || 0),
                timestamp: BigInt(request[7] || Math.floor(Date.now() / 1000))
              };
              console.log('📄 Parsed Contract Request:', parsedRequest);
            } catch (error) {
              console.error('Error parsing transfer request:', error);
              console.error('Request data:', request);
              throw error;
            }

            // Check if we already have the batch details in cache
            let batch;
            const batchIdString = parsedRequest.batchId.toString();
            if (!batchIdString) {
              console.error('Invalid batchId:', parsedRequest.batchId);
              throw new Error('Invalid batchId in transfer request');
            }

            if (batchDetailsCache.has(batchIdString)) {
              console.log(`📦 Using cached batch details for batch ${batchIdString}`);
              batch = batchDetailsCache.get(batchIdString);
            } else {
              console.log(`📦 Fetching batch details for batch ${batchIdString}`);
              
              const batchResponse = await readOnlyContract.getBatchDetails(parsedRequest.batchId);
              console.log('📦 Batch Details - Raw Response:', batchResponse);
              
              // Parse batch response using proper contract interface
              batch = {
                batchId: batchResponse.batchId,
                name: batchResponse.name || '',
                description: batchResponse.description || '',
                category: batchResponse.category,
                owner: batchResponse.owner,
                totalQuantity: batchResponse.totalQuantity,
                unitPrice: batchResponse.unitPrice,
                isListed: batchResponse.isListed,
                parentBatch: batchResponse.parentBatch,
                timestamp: batchResponse.timestamp
              };
              
              console.log('📦 Parsed Batch Details:', batch);
              batchDetailsCache.set(batchIdString, batch);
            }
            
            // Safely convert BigInt values
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
              status: parsedRequest.status,
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

      console.log('✅ Processed requests:', {
        total: requestIds.length,
        byStatus: requestsWithDetails.reduce((acc, req) => {
          const status = RequestStatus[req.status];
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      toast.error('Failed to fetch requests', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error('Failed to copy to clipboard', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    }
  }, []);

  const handleApprove = async (requestId: bigint) => {
    if (!signerContract) {
      toast.error('Please connect your wallet', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }

    const toastId = toast.loading('Approving transfer request...', {
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      console.log(`🔄 Approving transfer request ${requestId}`);
      setProcessingTx(`approve-${requestId.toString()}`);
      
      const request = await readOnlyContract.getTransferRequestDetails(requestId);
      console.log('Request details:', request);

      // Get batch details
      const batch = await readOnlyContract.getBatchDetails(request.batchId);
      console.log('Batch owner:', batch.owner.toLowerCase());
      console.log('Current address:', address?.toLowerCase());
      console.log('Is owner?', batch.owner.toLowerCase() === address?.toLowerCase());

      // Use the contract interface to encode the function call
      const iface = new ethers.Interface(NexTrackABI);
      const data = iface.encodeFunctionData("approveTransfer", [requestId]);
      
      const tx = await signerContract.approveTransfer.staticCall(requestId);
      console.log('Static call successful:', tx);

      const tx2 = await signerContract.approveTransfer(requestId, {
        gasLimit: 300000
      });

      toast.loading('Transaction submitted. Waiting for confirmation...', {
        id: toastId,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      console.log(`📤 Approve transaction sent:`, {
        hash: tx2.hash,
        requestId: requestId
      });
      
      const receipt = await tx2.wait();
      console.log(`✅ Approve transaction confirmed:`, {
        hash: receipt.hash,
        requestId: requestId,
        blockNumber: receipt.blockNumber
      });
      
      toast.success('Transfer request approved successfully!', {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      fetchRequests();
    } catch (error: any) {
      console.error(`❌ Error approving transfer ${requestId}:`, error);
      
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
        return;
      }

      let errorMessage = 'Failed to approve transfer';
      
      if (error.message.includes('NotCurrentOwner')) {
        errorMessage = 'Only the batch owner can approve requests';
      } else if (error.message.includes('RequestAlreadyApproved')) {
        errorMessage = 'Request has already been approved';
      } else if (error.message.includes('RequestAlreadyRejected')) {
        errorMessage = 'Request has already been rejected';
      } else if (error.message.includes('RequestAlreadyCompleted')) {
        errorMessage = 'Request has already been completed';
      }
      
      toast.error(errorMessage, {
        id: toastId,
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } finally {
      setProcessingTx(null);
    }
  };

  const handleReject = async (requestId: bigint) => {
    if (!signerContract) {
      toast.error('Please connect your wallet', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }

    const toastId = toast.loading('Rejecting transfer request...', {
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      console.log(`🔄 Rejecting transfer request ${requestId}`);
      setProcessingTx(`reject-${requestId.toString()}`);
      
      // Get request details first
      const request = await readOnlyContract.getTransferRequestDetails(requestId);
      console.log('Request details:', request);

      // Get batch details
      const batch = await readOnlyContract.getBatchDetails(request.batchId);
      console.log('Batch owner:', batch.owner.toLowerCase());
      console.log('Current address:', address?.toLowerCase());
      console.log('Is owner?', batch.owner.toLowerCase() === address?.toLowerCase());

      // Use the contract interface to encode the function call
      const iface = new ethers.Interface(NexTrackABI);
      const data = iface.encodeFunctionData("rejectTransfer", [requestId]);
      
      const tx = await signerContract.rejectTransfer.staticCall(requestId);
      console.log('Static call successful:', tx);

      const tx2 = await signerContract.rejectTransfer(requestId, {
        gasLimit: 300000
      });

      toast.loading('Transaction submitted. Waiting for confirmation...', {
        id: toastId,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      console.log(`📤 Reject transaction sent:`, {
        hash: tx2.hash,
        requestId: requestId
      });
      
      const receipt = await tx2.wait();
      console.log(`✅ Reject transaction confirmed:`, {
        hash: receipt.hash,
        requestId: requestId,
        blockNumber: receipt.blockNumber
      });
      
      toast.success('Transfer request rejected successfully!', {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      fetchRequests();
    } catch (error: any) {
      console.error(`❌ Error rejecting transfer ${requestId}:`, error);
      
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
        return;
      }

      let errorMessage = 'Failed to reject transfer';
      
      if (error.message.includes('NotCurrentOwner')) {
        errorMessage = 'Only the batch owner can reject requests';
      } else if (error.message.includes('RequestAlreadyApproved')) {
        errorMessage = 'Request has already been approved';
      } else if (error.message.includes('RequestAlreadyRejected')) {
        errorMessage = 'Request has already been rejected';
      } else if (error.message.includes('RequestAlreadyCompleted')) {
        errorMessage = 'Request has already been completed';
      }
      
      toast.error(errorMessage, {
        id: toastId,
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } finally {
      setProcessingTx(null);
    }
  };

  useEffect(() => {
    if (address && readOnlyContract) {
      fetchRequests();
    }
  }, [address, readOnlyContract]);

  const displayedRequests = requests.filter((request) => {
    if (statusFilter === undefined) return true;
    return request.status === statusFilter;
  });

  const getStatusClass = (status: number) => {
    switch (status) {
      case RequestStatus.Pending:
        return 'text-yellow-400';
      case RequestStatus.Approved:
        return 'text-green-400';
      case RequestStatus.Rejected:
        return 'text-red-400';
      case RequestStatus.Completed:
        return 'text-blue-400';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          }}
        />
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Purchase Requests</h1>
        
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

        {/* Search */}
        <div className="mb-8">
          {/* Search input */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No {statusFilter === undefined ? '' : REQUEST_STATUS_LABELS[statusFilter]} requests found</p>
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
                      <div className="text-gray-400">Request ID</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.requestId.toString());
                          toast.success('Request ID copied to clipboard');
                        }}
                        className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                      >
                        {request.requestId.toString()}
                      </button>
                      <div className="text-gray-400 mt-2">Batch ID</div>
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
                      <p className="text-white font-medium">{request.quantity} mUSDT</p>
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
                      <p className={`font-medium ${
                        request.status === 0 ? 'text-yellow-400' :
                        request.status === 1 ? 'text-green-400' :
                        request.status === 2 ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {REQUEST_STATUS_LABELS[request.status]}
                      </p>
                    </div>
                  </div>

                  {request.status === 0 && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleApprove(request.requestId)}
                        disabled={!!processingTx}
                        className={`flex-1 ${
                          processingTx
                            ? 'bg-gray-600 cursor-not-allowed'
                            : request.seller.toLowerCase() === address?.toLowerCase()
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 cursor-not-allowed'
                        } text-white py-2 px-4 rounded-lg font-medium transition-colors`}
                      >
                        {processingTx === `approve-${request.requestId.toString()}` ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Approving...
                          </span>
                        ) : request.seller.toLowerCase() === address?.toLowerCase() ? (
                          'Approve'
                        ) : (
                          'Not Owner'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.requestId)}
                        disabled={!!processingTx}
                        className={`flex-1 ${
                          processingTx
                            ? 'bg-gray-600 cursor-not-allowed'
                            : request.seller.toLowerCase() === address?.toLowerCase()
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-gray-600 cursor-not-allowed'
                        } text-white py-2 px-4 rounded-lg font-medium transition-colors`}
                      >
                        {processingTx === `reject-${request.requestId.toString()}` ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Rejecting...
                          </span>
                        ) : request.seller.toLowerCase() === address?.toLowerCase() ? (
                          'Reject'
                        ) : (
                          'Not Owner'
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
