export {};

type EthereumRequestArguments = {
  method: string;
  params?: unknown[];
};

interface RequestArguments {
  method: string;
  params?: unknown[];
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'wallet_addEthereumChain'; params: unknown[] }): Promise<null>;
  request(args: RequestArguments): Promise<unknown>;
  on(event: string, callback: (args: unknown[]) => void): void;
  removeListener(event: string, callback: (args: unknown[]) => void): void;
  selectedAddress: string | null;
  chainId: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
