'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { encodeFunctionData, isAddress } from 'viem';
import toast, { Toaster } from 'react-hot-toast';
import { useProposals } from '@/hooks/useProposals';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOVERNOR_ADDRESS = '0xC4d949Ad881f8BCe2532E60585c483D4Ecd45352';
const NEXTRACK_ADDRESS = '0xeC017B8e5f926963Eb178B084baf1f715995424A';

// ABI for contract functions
const nexTrackABI = [{
  type: 'function',
  name: 'onboardNewManufacturer',
  inputs: [{ type: 'address', name: 'manufacturer' }],
  outputs: [],
  stateMutability: 'nonpayable'
}, {
  type: 'function',
  name: 'getRegisteredManufacturers',
  inputs: [],
  outputs: [{ type: 'address[]' }],
  stateMutability: 'view'
}] as const;

const governorABI = [{
  inputs: [
    {
      internalType: "address[]",
      name: "targets",
      type: "address[]"
    },
    {
      internalType: "uint256[]",
      name: "values",
      type: "uint256[]"
    },
    {
      internalType: "bytes[]",
      name: "calldatas",
      type: "bytes[]"
    },
    {
      internalType: "string",
      name: "description",
      type: "string"
    }
  ],
  name: "propose",
  outputs: [
    {
      internalType: "uint256",
      name: "",
      type: "uint256"
    }
  ],
  stateMutability: "nonpayable",
  type: "function"
}] as const;

export default function CreateProposalModal({ isOpen, onClose }: CreateProposalModalProps) {
  const [description, setDescription] = useState('');
  const [manufacturerAddress, setManufacturerAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [toastId, setToastId] = useState<string | null>(null);
  const { refreshProposals } = useProposals();

  const { writeContract, data: hash, isPending, isError: isWriteError } = useWriteContract();

  // Get list of registered manufacturers
  const { data: registeredManufacturers = [] } = useReadContract({
    address: NEXTRACK_ADDRESS,
    abi: nexTrackABI,
    functionName: 'getRegisteredManufacturers',
  });

  const { isLoading: isProposalPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction success
  if (isSuccess && toastId) {
    toast.dismiss(toastId);
    toast.success('Proposal created successfully!', {
      duration: 5000,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });
    setToastId(null);
    setDescription('');
    setManufacturerAddress('');
    refreshProposals();
    onClose();
  }

  // Handle transaction error
  if (isWriteError && toastId) {
    toast.dismiss(toastId);
    toast.error('Transaction cancelled', {
      duration: 3000,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });
    setToastId(null);
  }

  const validateAddress = async (address: string): Promise<boolean> => {
    if (!address) {
      setAddressError('Address is required');
      return false;
    }
    if (!isAddress(address)) {
      setAddressError('Invalid Ethereum address');
      return false;
    }

    // Check if address is already registered
    const isRegistered = registeredManufacturers.some(
      (manufacturer) => manufacturer.toLowerCase() === address.toLowerCase()
    );
    
    if (isRegistered) {
      setAddressError('This address is already a registered manufacturer');
      return false;
    }

    setAddressError(null);
    return true;
  };

  const useConnectedWallet = () => {
    if (address) {
      setManufacturerAddress(address);
      validateAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      toast.error('Please connect your wallet first', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }
    
    if (!await validateAddress(manufacturerAddress)) {
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description for the proposal');
      return;
    }

    try {
      const id = toast.loading('Creating proposal...', {
        duration: Infinity,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      setToastId(id);

      // Encode the function call for onboardNewManufacturer
      const calldata = encodeFunctionData({
        abi: nexTrackABI,
        functionName: 'onboardNewManufacturer',
        args: [manufacturerAddress as `0x${string}`],
      });

      // Prepare proposal parameters
      const args = [
        [NEXTRACK_ADDRESS], // targets
        [0n], // values
        [calldata], // calldatas
        description, // description
      ] as const;

      await writeContract({
        address: GOVERNOR_ADDRESS,
        abi: governorABI,
        functionName: 'propose',
        args,
      });

    } catch (err: any) {
      console.error('Error creating proposal:', err);
      
      if (toastId) {
        toast.dismiss(toastId);
        setToastId(null);
        
        if (err.code === 4001 || err?.info?.error?.code === 4001 || err.message?.includes('user rejected')) {
          toast.error('Transaction cancelled', {
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          });
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
          setError(errorMessage);
          toast.error(errorMessage, {
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          });
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800/90 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-gray-700/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Propose New Manufacturer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isPending || isProposalPending}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Manufacturer Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={manufacturerAddress}
                onChange={(e) => {
                  setManufacturerAddress(e.target.value);
                  if (e.target.value) validateAddress(e.target.value);
                }}
                placeholder="0x..."
                className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isPending || isProposalPending}
              />
              <button
                type="button"
                onClick={useConnectedWallet}
                disabled={!isConnected || isPending || isProposalPending}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isConnected ? 'Please connect your wallet first' : undefined}
              >
                Use Connected Wallet
              </button>
            </div>
            {addressError && (
              <p className="mt-1 text-sm text-red-500">
                {addressError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Proposal Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe why this manufacturer should be onboarded..."
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
              disabled={isPending || isProposalPending}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-300"
              disabled={isPending || isProposalPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isPending || isProposalPending}
            >
              {(isPending || isProposalPending) && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              )}
              Create Proposal
            </button>
          </div>
        </form>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
