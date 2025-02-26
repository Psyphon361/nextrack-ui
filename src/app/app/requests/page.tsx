'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { useNexTrackContract } from '@/hooks/useNexTrackContract';
import Navigation from '@/components/Navigation';
import { useCallback } from "react";
import NexTrackABI from '../../../contracts/NexTrackABI.json';
import Link from 'next/link';

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
  batchId: string;
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

const REQUEST_STATUS_LABELS: { [key in RequestStatus]: string } = {
  [RequestStatus.Pending]: 'Pending',
  [RequestStatus.Approved]: 'Approved',
  [RequestStatus.Rejected]: 'Rejected',
  [RequestStatus.Completed]: 'Completed'
};

export default function RequestsPage() {
  const { address, isConnected } = useAccount();
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
      // console.log('📋 Request IDs - Mapped:', requestIds.map(id => id.toString()));

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
                name: batchResponse.productName || '',
                description: batchResponse.productDescription || '',
                category: batchResponse.category,
                owner: batchResponse.owner,
                totalQuantity: batchResponse.totalQuantity,
                unitPrice: batchResponse.unitPrice,
                isListed: batchResponse.isActive,
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
              batchId: parsedRequest.batchId.toString(),  // Keep as string to preserve precision
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

      toast.loading('Waiting for transaction confirmation...', {
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

      toast.loading('Waiting for transaction confirmation...', {
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', '');
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Toaster position="bottom-right" />
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
            My Requests
          </h1>
          <p className="text-gray-300 text-lg mt-5">Please connect your wallet to view your requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
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
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Purchase Requests
          </h1>
        </div>

        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${statusFilter === undefined
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter(0)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${statusFilter === 0
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter(1)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${statusFilter === 1
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter(2)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${statusFilter === 2
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter(3)}
            className={`px-6 py-2 rounded-xl transition-all duration-300 ${statusFilter === 3
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
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
            <p className="text-lg">No {statusFilter !== undefined ? REQUEST_STATUS_LABELS[statusFilter as RequestStatus] : ''} requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedRequests.map((request) => (
              <div
                key={request.requestId.toString()}
                className="bg-gradient-to-br from-gray-800 to-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group"
              >
                <div className="flex justify-between items-center mb-4">
                  <Link 
                    href={`/app/product/${request.batchId}`}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm transition-all"
                  >
                    View Product Details
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>

                  <span className="font-mono text-gray-400 text-sm">
                    {formatDate(request.timestamp)}
                  </span>

                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === RequestStatus.Pending ? 'bg-yellow-500/20 text-yellow-400' :
                    request.status === RequestStatus.Approved ? 'bg-green-500/20 text-green-400' :
                    request.status === RequestStatus.Rejected ? 'bg-red-500/20 text-red-400' :
                    request.status === RequestStatus.Completed ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {REQUEST_STATUS_LABELS[request.status as RequestStatus]}
                  </span>
                </div>

                <div className="mb-4">
                  <Link href={`/app/product/${request.batchId}`}>
                    <div className="group cursor-pointer">
                      <h2 className="text-white font-semibold text-xl group-hover:text-blue-400 transition-colors mb-2">
                        {request.productName}
                      </h2>
                    </div>
                  </Link>
                  <p className="text-gray-300 text-sm">{request.productDescription}</p>
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Buyer</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(request.buyer);
                        toast.success('Buyer address copied to clipboard');
                      }}
                      className="text-white font-mono text-sm hover:text-blue-400 transition-colors max-w-[200px]"
                    >
                      {request.buyer}
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Request ID</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(request.requestId.toString());
                        toast.success('Request ID copied to clipboard');
                      }}
                      className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                    >
                      {request.requestId.toString()}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Quantity</p>
                    <p className="text-white">{request.quantity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Total Amount</p>
                    <p className="text-white">${request.totalAmount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Batch ID</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(request.batchId);
                        toast.success('Batch ID copied to clipboard');
                      }}
                      className="text-white font-mono text-sm hover:text-blue-400 transition-colors"
                    >
                      {request.batchId}
                    </button>
                  </div>
                </div>

                {request.status === RequestStatus.Pending && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(request.requestId)}
                      disabled={!!processingTx}
                      className={`flex-1 ${processingTx
                          ? 'bg-gray-600 cursor-not-allowed'
                          : request.seller.toLowerCase() === address?.toLowerCase()
                            ? 'bg-gradient-to-r from-emerald-500/50 to-emerald-600/50 hover:from-emerald-500/70 hover:to-emerald-600/70 border border-emerald-500/50 text-emerald-100 hover:text-white'
                            : 'bg-gray-600 cursor-not-allowed'
                        } py-2 px-4 rounded-lg font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500/70 shadow-md hover:shadow-lg`}
                    >
                      {processingTx === `approve-${request.requestId.toString()}` ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-100 mr-2"></div>
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
                      className={`flex-1 ${processingTx
                          ? 'bg-gray-600 cursor-not-allowed'
                          : request.seller.toLowerCase() === address?.toLowerCase()
                            ? 'bg-gradient-to-r from-rose-500/50 to-rose-600/50 hover:from-rose-500/70 hover:to-rose-600/70 border border-rose-500/50 text-rose-100 hover:text-white'
                            : 'bg-gray-600 cursor-not-allowed'
                        } py-2 px-4 rounded-lg font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-rose-500/70 shadow-md hover:shadow-lg`}
                    >
                      {processingTx === `reject-${request.requestId.toString()}` ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-100 mr-2"></div>
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
                {request.status === RequestStatus.Completed && (
                  <div className="mt-4 flex items-center justify-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <p className="text-blue-400 text-base">✓ Request Completed</p>
                  </div>
                )}
                {request.status === RequestStatus.Approved && (
                  <div className="mt-4 flex items-center justify-center p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                    <p className="text-yellow-400 text-base">⌛ Awaiting Buyer Confirmation</p>
                  </div>
                )}
                {request.status === RequestStatus.Rejected && (
                  <div className="mt-4 flex items-center justify-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                    <p className="text-red-400 text-base">✕ Request Rejected</p>
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
