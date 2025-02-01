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
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isAppRoute ? "/app" : "/"} className="flex items-center space-x-2">
            <Image
              src="/logo.svg"
              alt="NexTrack Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <span className="text-2xl font-bold font-['Space_Grotesk']">NexTrack</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {isAppRoute ? (
              // App Navigation Links
              <>
                <Link
                  href="/app/my-batches"
                  className={`text-lg font-medium hover:text-white transition-colors ${
                    pathname === '/app/my-batches' ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  My Listings
                </Link>
                <Link
                  href="/app/requests"
                  className={`text-lg font-medium hover:text-white transition-colors ${
                    pathname === '/app/requests' ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  Purchase Requests
                </Link>
                <Link
                  href="/app/marketplace"
                  className={`text-lg font-medium hover:text-white transition-colors ${
                    pathname === '/app/marketplace' ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  Marketplace
                </Link>
                {isManufacturer ? (
                  <Link
                    href="/app/register-batch"
                    className={`text-lg font-medium hover:text-white transition-colors ${
                      pathname === '/app/register-batch' ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    Register Batch
                  </Link>
                ) : (
                  <Link
                    href="/app/orders"
                    className={`text-lg font-medium hover:text-white transition-colors ${
                      pathname === '/app/orders' ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    My Orders
                  </Link>
                )}
                {address ? (
                  <div className="relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-gray-300">{formatAddress(address)}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                )}
              </>
            ) : (
              // Landing Page Navigation Links
              <>
                <Link
                  href="/features"
                  className={`text-lg font-medium hover:text-white transition-colors ${
                    pathname === '/features' ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  Features
                </Link>
                <Link
                  href="/about"
                  className={`text-lg font-medium hover:text-white transition-colors ${
                    pathname === '/about' ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  About
                </Link>
                
                {/* Primary Actions */}
                <div className="flex items-center space-x-4">
                  <Link
                    href="/app"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                  >
                    Launch App
                  </Link>
                  <Link
                    href="/app/marketplace"
                    className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-gray-800/20"
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
