'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount, useConnect, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Navigation from '@/components/Navigation';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { TagIcon, ShoppingBagIcon, ClipboardDocumentListIcon } from '@/components/icons';

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
  { label: 'Products Tracked', value: '10,000+' },
  { label: 'Verified Manufacturers', value: '50+' },
  { label: 'Countries', value: '25+' }
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
      
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50 rounded-2xl" />
            <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 md:p-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl"
              >
                <h1 className="text-4xl font-bold mb-4 font-['Space_Grotesk']">
                  Welcome to NexTrack
                </h1>
                <p className="text-xl text-gray-300 mb-8">
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
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Connecting...
                      </>
                    ) : (
                      'Connect Wallet'
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <div className="bg-gray-900/50 rounded-lg px-6 py-4 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
                      </span>
                      {isManufacturer && (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium ml-2">
                          Verified Manufacturer
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-500">
                    {error}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Stats Section */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
            >
              {statsData.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-800/30 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50"
                >
                  <div className="text-3xl font-bold text-blue-400 mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {/* Browse Marketplace */}
            <Link href="/app/marketplace" className="group">
              <div className="bg-gray-800/50 rounded-xl p-8 h-full border border-gray-700/50 hover:border-blue-500/50 transition-colors flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium">Browse Marketplace</h3>
                </div>
                <p className="text-gray-400 text-lg">
                  Explore and purchase verified products directly from manufacturers. Ensure authenticity and track provenance.
                </p>
              </div>
            </Link>

            {/* Register Product or My Orders */}
            {isManufacturer ? (
              <Link href="/app/register" className="group">
                <div className="bg-gray-800/50 rounded-xl p-8 h-full border border-gray-700/50 hover:border-blue-500/50 transition-colors flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-medium">Register Product</h3>
                  </div>
                  <p className="text-gray-400 text-lg">
                    Register your products on the blockchain. Add details, set pricing, and make them available for purchase.
                  </p>
                </div>
              </Link>
            ) : (
              <Link href="/app/orders" className="group">
                <div className="bg-gray-800/50 rounded-xl p-8 h-full border border-gray-700/50 hover:border-blue-500/50 transition-colors flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                        <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-medium">My Orders</h3>
                  </div>
                  <p className="text-gray-400 text-lg">
                    View and manage your purchase orders. Track status, confirm deliveries, and maintain your order history.
                  </p>
                </div>
              </Link>
            )}

            {/* My Listings */}
            <Link href="/app/my-batches" className="group">
              <div className="bg-gray-800/50 rounded-xl p-8 h-full border border-gray-700/50 hover:border-blue-500/50 transition-colors flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V15zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 18a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V18zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium">My Listings</h3>
                </div>
                <p className="text-gray-400 text-lg">
                  Manage your product listings, track inventory, and handle customer requests all in one place.
                </p>
              </div>
            </Link>

            {/* Purchase Requests */}
            <Link href="/app/requests" className="group">
              <div className="bg-gray-800/50 rounded-xl p-8 h-full border border-gray-700/50 hover:border-blue-500/50 transition-colors flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium">Purchase Requests</h3>
                </div>
                <p className="text-gray-400 text-lg">
                  View and manage all your purchase requests. Track order status and transaction history in real-time.
                </p>
              </div>
            </Link>
          </div>

          {/* Getting Started Guide */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 font-['Space_Grotesk']">Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="text-blue-400 text-xl font-bold mb-2">1</div>
                  <h3 className="font-semibold mb-2">Browse Products</h3>
                  <p className="text-gray-400 text-sm">
                    Explore our marketplace to find authentic products from verified manufacturers.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="text-blue-400 text-xl font-bold mb-2">2</div>
                  <h3 className="font-semibold mb-2">Verify Authenticity</h3>
                  <p className="text-gray-400 text-sm">
                    Check product history and manufacturer verification on the blockchain.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="text-blue-400 text-xl font-bold mb-2">3</div>
                  <h3 className="font-semibold mb-2">Make Purchase</h3>
                  <p className="text-gray-400 text-sm">
                    Securely purchase products using your connected wallet.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
