export interface EthereumProvider {
  isMetaMask?: boolean;
  isStatus?: boolean;
  host?: string;
  path?: string;
  request: (request: { method: string; params?: Array<any> }) => Promise<any>;
  send?: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
  sendAsync: (request: { method: string; params?: Array<any> }) => Promise<any>;
  enable: () => Promise<string[]>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  chainId?: string;
  networkVersion?: string;
  selectedAddress?: string;
}
