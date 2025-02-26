'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ELECTRONEUM_TESTNET_CONFIG } from '@/config/contracts';
import React from 'react';

// Create ethers provider and contract instance
const provider = new ethers.JsonRpcProvider(ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]);
const contract = new ethers.Contract(
  CONTRACT_ADDRESSES.NEXTRACK,
  [
    'function getBatchDetails(uint256 batchId) view returns (tuple(uint256 batchId, string name, string description, uint8 category, address owner, uint256 totalQuantity, uint256 unitPrice, string ipfsUrl, bool isListed, uint256 parentBatch, uint256 timestamp))'
  ],
  provider
);

// Category mapping from contract enum
const Category = {
  0: 'Electronics',
  1: 'Clothes',
  2: 'Luxury',
  3: 'Food',
  4: 'Medicine',
  5: 'Furniture',
  6: 'Other'
} as const;

interface BatchDetails {
  batchId: bigint;
  name: string;
  description: string;
  category: number;
  owner: string;
  totalQuantity: bigint;
  unitPrice: bigint;
  ipfsUrl: string;
  isListed: boolean;
  timestamp: bigint;
}

interface PageParams {
  params: Promise<{
    id: string;
  }>;
}

export default function ProductDetailsPage({ params }: PageParams) {
  const unwrappedParams = React.use(params);
  const batchId = unwrappedParams.id;
  const { address } = useAccount();
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBatchDetails = async () => {
    try {
      console.log('🔍 Fetching batch details for:', batchId);
      const details = await contract.getBatchDetails(BigInt(batchId));
      console.log('📦 Batch details:', details);

      setBatchDetails({
        batchId: details.batchId,
        name: details.name,
        description: details.description,
        category: Number(details.category),
        owner: details.owner,
        totalQuantity: details.totalQuantity,
        unitPrice: details.unitPrice,
        ipfsUrl: details.ipfsUrl,
        isListed: details.isListed,
        timestamp: details.timestamp
      });
    } catch (error) {
      console.error('❌ Error fetching batch details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
  }, [batchId]);

  if (!batchDetails && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-black text-white">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Link
            href="/app/requests"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors duration-300"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to All Requests
          </Link>
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Product Not Found</h1>
            <p className="text-gray-400">The product you're looking for doesn't exist or has been removed.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-black text-white">
      <Navigation />
      <Toaster position="bottom-right" />
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/app/requests"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors duration-300"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to All Requests
        </Link>

        {batchDetails && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Section */}
            <div className="bg-gradient-to-br from-gray-800/90 via-blue-900/20 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group">
              <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-xl">
                {batchDetails.ipfsUrl ? (
                  <Image
                    src={batchDetails.ipfsUrl}
                    alt={batchDetails.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700/50 via-gray-600/50 to-gray-700/50 flex items-center justify-center rounded-xl">
                    <p className="text-gray-400">No image available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="bg-gradient-to-br from-gray-800/90 via-blue-900/20 to-gray-900/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700/30 hover:border-blue-500/30 transition-all duration-300 group">
              <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent mb-4">{batchDetails.name}</h1>
                <p className="text-gray-300 leading-relaxed">{batchDetails.description}</p>
              </div>

              <div className="space-y-6">
                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Category</div>
                  <div className="text-white text-lg group-hover/item:text-blue-300 transition-colors">{Category[batchDetails.category as keyof typeof Category]}</div>
                </div>

                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Owner</div>
                  <div className="text-white font-mono text-sm truncate group-hover/item:text-blue-300 transition-colors">{batchDetails.owner}</div>
                </div>

                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Quantity Available</div>
                  <div className="text-white text-lg group-hover/item:text-blue-300 transition-colors">{batchDetails.totalQuantity.toString()}</div>
                </div>

                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Unit Price</div>
                  <div className="text-white text-lg group-hover/item:text-blue-300 transition-colors">${Number(ethers.formatUnits(batchDetails.unitPrice, 18)).toFixed(2)}</div>
                </div>

                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Created On</div>
                  <div className="text-white group-hover/item:text-blue-300 transition-colors">{new Date(Number(batchDetails.timestamp) * 1000).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }).replace(',', '')}</div>
                </div>

                <div className="group/item">
                  <div className="text-gray-400 text-sm font-medium mb-1">Status</div>
                  <div className={`text-lg font-semibold ${batchDetails.isListed ? 'text-green-400 group-hover/item:text-green-300' : 'text-red-400 group-hover/item:text-red-300'} transition-colors`}>
                    {batchDetails.isListed ? 'Listed' : 'Not Listed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
