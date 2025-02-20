'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { EthereumProvider } from '../types/window';

type WindowEthereum = {
  ethereum: EthereumProvider | null;
}

const getEthereum = (): EthereumProvider | null => {
  return (window as unknown as WindowEthereum).ethereum;
};

export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    mutation: {
      onSuccess: () => {
        // Handle successful connection
      }
    }
  });
  const { disconnect } = useDisconnect();

  // Keep local state for UI updates
  const [displayAddress, setDisplayAddress] = useState<string | undefined>(address);

  // Update local state when account changes
  useEffect(() => {
    setDisplayAddress(address);
  }, [address]);

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      }
    };

    const ethereum = getEthereum();
    if (ethereum?.on) {
      ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (ethereum?.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [disconnect]);

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-gray-800 bg-black/50 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold">
          NexTrack
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/app/marketplace"
            className={`text-sm ${
              pathname === '/app/marketplace'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Marketplace
          </Link>
          <Link
            href="/app/register-product"
            className={`text-sm ${
              pathname === '/app/register-product'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register New Product
          </Link>
          <Link
            href="/app/my-batches"
            className={`text-sm ${
              pathname === '/app/my-batches'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Batches
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {isConnected && displayAddress ? (
          <button
            onClick={() => disconnect()}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            {`${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="rounded-lg bg-white px-4 py-2 text font-medium text-black hover:bg-gray-100"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
