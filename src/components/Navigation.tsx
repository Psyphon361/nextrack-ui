'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useNexTrackContract } from '@/hooks/useNexTrackContract';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const { connect } = useConnect();
  const { readOnlyContract } = useNexTrackContract();
  const [isManufacturer, setIsManufacturer] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const checkManufacturer = async () => {
      if (address && readOnlyContract) {
        try {
          const manufacturers = await readOnlyContract.getRegisteredManufacturers();
          setIsManufacturer(manufacturers.includes(address));
        } catch (error) {
          console.error('Error checking manufacturer status:', error);
          setIsManufacturer(false);
        }
      }
    };

    checkManufacturer();
  }, [address, readOnlyContract]);

  const isAppRoute = pathname.startsWith('/app');

  return (
    <nav className="border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link href={isAppRoute ? "/app" : "/"} className="flex items-center space-x-4 group">
              <Image
                src="/logo.svg"
                alt="NexTrack Logo"
                width={32}
                height={32}
                className="transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xl font-bold text-white tracking-wider transition-colors duration-300 group-hover:text-blue-400">
                NexTrack
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {isAppRoute ? (
              // App Navigation Links
              <>
                <div className="flex items-center space-x-6">
                  {isConnected ? (
                    <>
                      <Link
                        href="/app/my-batches"
                        className={`text-lg font-medium transition-all duration-300 group ${
                          pathname === '/app/my-batches' 
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span className="group-hover:tracking-wider transition-all duration-300">
                          My Listings
                        </span>
                      </Link>
                      <Link
                        href="/app/requests"
                        className={`text-lg font-medium transition-all duration-300 group ${
                          pathname === '/app/requests' 
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span className="group-hover:tracking-wider transition-all duration-300">
                          Purchase Requests
                        </span>
                      </Link>
                      {isManufacturer ? (
                        <Link
                          href="/app/register-batch"
                          className={`text-lg font-medium transition-all duration-300 group ${
                            pathname === '/app/register-batch' 
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          <span className="group-hover:tracking-wider transition-all duration-300">
                            Register Product
                          </span>
                        </Link>
                      ) : (
                        <Link
                          href="/app/orders"
                          className={`text-lg font-medium transition-all duration-300 group ${
                            pathname === '/app/orders' 
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          <span className="group-hover:tracking-wider transition-all duration-300">
                            My Orders
                          </span>
                        </Link>
                      )}
                    </>
                  ) : null}
                  <Link
                    href="/app/marketplace"
                    className={`text-lg font-medium transition-all duration-300 group ${
                      pathname === '/app/marketplace' 
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="group-hover:tracking-wider transition-all duration-300">
                      Marketplace
                    </span>
                  </Link>
                  <Link
                    href="/dao"
                    className={`text-lg font-medium transition-all duration-300 group ${
                      pathname.startsWith('/dao')
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="group-hover:tracking-wider transition-all duration-300">
                      Governance
                    </span>
                  </Link>
                </div>

                {address ? (
                  <div className="relative">
                    <div 
                      className="relative flex items-center gap-3 px-5 py-3 rounded-2xl text- font-medium bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl group cursor-pointer"
                      // Add onClick to make the entire div interactive if needed
                      onClick={() => {/* Optional: Add any click interaction */}}
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"></div>
                      <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse relative z-10 group-hover:scale-110 transition-transform"></div>
                      <span className="text-gray-300 tracking-wide relative z-10 group-hover:text-white transition-colors">
                        {formatAddress(address)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="relative group overflow-hidden px-8 py-3.5 rounded-2xl text font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
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
                )}
              </>
            ) : (
              // Landing Page Navigation Links
              <>
                <div className="flex items-center space-x-6">
                <Link
                    href="/dao"
                    className={`text-lg font-medium transition-all duration-300 group ${
                      pathname.startsWith('/dao')
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="group-hover:tracking-wider transition-all duration-300">
                      Governance
                    </span>
                  </Link>
                  <Link
                    href="/features"
                    className={`text-lg font-medium transition-all duration-300 group ${
                      pathname === '/features' 
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="group-hover:tracking-wider transition-all duration-300">
                      Features
                    </span>
                  </Link>
                  <Link
                    href="/about"
                    className={`text-lg font-medium transition-all duration-300 group ${
                      pathname === '/about' 
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-semibold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="group-hover:tracking-wider transition-all duration-300">
                      About
                    </span>
                  </Link>
                </div>
                
                {/* Primary Actions */}
                <div className="flex items-center space-x-4">
                  <Link
                    href="/app"
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                  >
                    Launch App
                  </Link>
                  <Link
                    href="/app/marketplace"
                    className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                  >
                    Browse Marketplace
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
