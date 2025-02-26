'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { ELECTRONEUM_TESTNET_CONFIG } from '@/config/contracts';
import { Chain } from 'viem';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Ensure RPC URL is available
const RPC_URL = ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0];

const electroneumTestnet: Chain = {
  id: Number(ELECTRONEUM_TESTNET_CONFIG.chainId),
  name: ELECTRONEUM_TESTNET_CONFIG.chainName,
  nativeCurrency: {
    name: ELECTRONEUM_TESTNET_CONFIG.nativeCurrency.name,
    symbol: ELECTRONEUM_TESTNET_CONFIG.nativeCurrency.symbol,
    decimals: ELECTRONEUM_TESTNET_CONFIG.nativeCurrency.decimals,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: ELECTRONEUM_TESTNET_CONFIG.blockExplorerUrls[0] || '',
    },
  },
  testnet: true,
};

const config = createConfig({
  chains: [electroneumTestnet],
  transports: {
    [electroneumTestnet.id]: http(RPC_URL)
  },
  connectors: [
    injected()
  ]
});

// Create a client
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
