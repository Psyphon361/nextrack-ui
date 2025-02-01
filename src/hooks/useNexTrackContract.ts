import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, ELECTRONEUM_TESTNET_CONFIG } from '@/config/contracts';
import NexTrackABI from '../../contracts/NexTrackABI.json';

// Create provider outside component for better performance
const provider = new ethers.JsonRpcProvider(ELECTRONEUM_TESTNET_CONFIG.rpcUrls[0]);

// Create read-only contract instance using the full ABI
const readOnlyContract = new ethers.Contract(
  CONTRACT_ADDRESSES.NEXTRACK,
  NexTrackABI,
  provider
);

export function useNexTrackContract() {
  const [signerContract, setSignerContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    async function setupContract() {
      try {
        if (window.ethereum) {
          const signer = await new ethers.BrowserProvider(window.ethereum as any).getSigner();
          const contractWithSigner = new ethers.Contract(
            CONTRACT_ADDRESSES.NEXTRACK,
            NexTrackABI,
            signer
          );
          setSignerContract(contractWithSigner);
        }
      } catch (error) {
        console.error('Error setting up contract with signer:', error);
      }
    }

    setupContract();
  }, []);

  // Return both read-only and signer-enabled contracts
  return {
    readOnlyContract,
    signerContract
  };
}
