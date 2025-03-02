'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount, useConnect, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Navigation from '@/components/Navigation';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { TagIcon, ClipboardDocumentListIcon, ShoppingBagIcon } from '@/components/icons';

const features = [
  {
    title: 'My Listings',
    description: 'View and manage your registered products and batches.',
    link: '/app/my-batches',
    icon: ClipboardDocumentListIcon,
    manufacturerOnly: false,
  },
  {
    title: 'Browse Marketplace',
    description: 'Explore and verify products in the marketplace.',
    link: '/app/marketplace',
    icon: ShoppingBagIcon,
    manufacturerOnly: false,
  },
];

const statsData = [
  { label: 'Total Batches', value: '10,000+' },
  { label: 'Active Batches', value: '50+' },
  { label: 'Unique Products', value: '25+' }
];

export default function AppPage() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const publicClient = usePublicClient();
  const [error, setError] = useState<string | null>(null);
  const [isManufacturer, setIsManufacturer] = useState(false);

  useEffect(() => {
    const checkManufacturerStatus = async () => {
      if (!isConnected || !address || !publicClient) {
        console.log('Not connected, no address, or no publicClient');
        setIsManufacturer(false);
        return;
      }

      try {
        console.log('Checking manufacturer status for address:', address);
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.NEXTRACK as `0x${string}`,
          abi: CONTRACT_ABIS.NEXTRACK,
          functionName: 'getRegisteredManufacturers',
        });

        console.log('Contract response:', data);

        if (!Array.isArray(data)) {
          console.error('Invalid manufacturers data:', data);
          setIsManufacturer(false);
          return;
        }

        const manufacturers = data as `0x${string}`[];
        console.log('Manufacturers list:', manufacturers);

        const isUserManufacturer = manufacturers
          .map(addr => addr.toLowerCase())
          .includes(address.toLowerCase());
        
        console.log('Is Manufacturer:', isUserManufacturer);
        setIsManufacturer(isUserManufacturer);
      } catch (error) {
        console.error('Error checking manufacturer status:', error);
        setIsManufacturer(false);
      }
    };

    checkManufacturerStatus();
  }, [address, isConnected, publicClient]);

  const handleConnect = async () => {
    try {
      setError(null);
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while connecting');
    }
  };

  console.log('Rendering UI');
  console.log('Address:', address);
  console.log('Is Connected:', isConnected);
  console.log('Is Manufacturer:', isManufacturer);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      <main className="container mx-auto px-6 py-12 space-y-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50 rounded-3xl transition-all duration-300 group-hover:opacity-70" />
            <div className="relative bg-gray-800/60 backdrop-blur-md rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden p-10 md:p-14">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl space-y-6"
              >
                <h1 className="text-5xl font-extrabold mb-4 font-['Space_Grotesk'] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  Welcome to NexTrack
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed mb-8">
                  {isConnected
                    ? isManufacturer
                      ? 'Start managing your products on the blockchain.'
                      : 'Browse and purchase authentic products from verified manufacturers.'
                    : 'Connect your wallet to get started with blockchain-based product tracking.'}
                </p>

                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="relative group overflow-hidden px-10 py-4 rounded-2xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                  >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    
                    {/* Animated border */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300"></div>
                    
                    {isConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3 relative z-10"></div>
                        <span className="relative z-10">Connecting...</span>
                      </>
                    ) : (
                      <span className="relative z-10">Connect Wallet</span>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <div className="relative inline-block group cursor-pointer">
                      <div className="relative inline-flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-medium bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"></div>
                        <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse relative z-10 group-hover:scale-110 transition-transform"></div>
                        <span className="text-lg font-medium tracking-wide relative z-10 group-hover:text-white transition-colors">
                          {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
                        </span>
                        {isManufacturer && (
                          <span className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-500 px-3 py-1 rounded-md text-xs font-bold relative z-10 border border-blue-500/30 group-hover:text-white group-hover:border-white transition-colors">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-400 flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
          >
            {statsData.map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-800/40 rounded-2xl p-8 backdrop-blur-md border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3">{stat.value}</div>
                  <div className="text-gray-400 text-lg tracking-wide">{stat.label}</div>
                </div>
                <div className="ml-4">
                  {stat.label === 'Total Batches' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                  {stat.label === 'Active Batches' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                  {stat.label === 'Unique Products' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            {/* Browse Marketplace */}
            <Link href="/app/marketplace" className="group">
              <div className="bg-gray-800/50 rounded-2xl p-10 h-full border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col justify-center">
                <div className="flex items-center gap-5 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 transition-transform group-hover:rotate-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Browse Marketplace</h3>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Explore & purchase products directly from manufacturers. Ensure authenticity & track provenance.
                </p>
              </div>
            </Link>

            {/* Register Product or My Orders */}
            {isManufacturer ? (
              <Link href="/app/register-batch" className="group">
                <div className="bg-gray-800/50 rounded-2xl p-10 h-full border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col justify-center">
                  <div className="flex items-center gap-5 mb-5">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 transition-transform group-hover:rotate-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 000 1.5h2.25a.75.75 0 000-1.5H12.75z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Register Product</h3>
                  </div>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Register your products on the blockchain. Add details, set pricing, and make them available for purchase.
                  </p>
                </div>
              </Link>
            ) : (
              <Link href="/app/orders" className="group">
                <div className="bg-gray-800/50 rounded-2xl p-10 h-full border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col justify-center">
                  <div className="flex items-center gap-5 mb-5">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 transition-transform group-hover:rotate-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                        <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5H7.5a.75.75 0 01-.75-.75z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">My Orders</h3>
                  </div>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    View and manage your purchase orders. Track order status and transaction history in real-time.
                  </p>
                </div>
              </Link>
            )}

            {/* My Listings */}
            <Link href="/app/my-batches" className="group">
              <div className="bg-gray-800/50 rounded-2xl p-10 h-full border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col justify-center">
                <div className="flex items-center gap-5 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 transition-transform group-hover:rotate-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 015 3h-1.5z" />
                      <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 19.125v-9.75zM6.75 9a.75.75 0 01.75-.75h6a.75.75 0 010 1.5H7.5a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7.5zm0 3a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7.5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500">My Listings</h3>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed">
                  View and manage your registered products and batches with full transparency and traceability.
                </p>
              </div>
            </Link>

            {/* Purchase Requests */}
            <Link href="/app/requests" className="group">
              <div className="bg-gray-800/50 rounded-2xl p-10 h-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col justify-center">
                <div className="flex items-center gap-5 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 transition-transform group-hover:rotate-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Purchase Requests</h3>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed">
                  View and manage all your purchase requests. Track order status and transaction history in real-time.
                </p>
              </div>
            </Link>
          </div>

          {/* Removed Getting Started section */}
        </div>
      </main>
    </div>
  );
}
