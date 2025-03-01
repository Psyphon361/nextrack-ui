'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { encodeFunctionData, isAddress } from 'viem';
import toast, { Toaster } from 'react-hot-toast';
import { useProposals } from '@/hooks/useProposals';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOVERNOR_ADDRESS = (process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS) as `0x${string}`;
const NEXTRACK_ADDRESS = (process.env.NEXT_PUBLIC_NEXTRACK_ADDRESS) as `0x${string}`;

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
  const { refreshProposals } = useProposals();
  const [txPending, setTxPending] = useState(false);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get list of registered manufacturers
  const { data: registeredManufacturers = [] } = useReadContract({
    address: NEXTRACK_ADDRESS,
    abi: nexTrackABI,
    functionName: 'getRegisteredManufacturers',
  });

  // Handle transaction states
  useEffect(() => {
    if (isPending && !txPending) {
      setTxPending(true);
      toast.loading('Confirm in your wallet...', {
        id: 'proposal-tx',
        duration: Infinity,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        }
      });
    }
  }, [isPending, txPending]);

  useEffect(() => {
    if (isTxLoading && txPending) {
      toast.loading('Creating proposal...', {
        id: 'proposal-tx',
        duration: Infinity,
      });
    }
  }, [isTxLoading, txPending]);

  // Handle write contract error
  useEffect(() => {
    if (writeError && txPending) {
      console.error('Error writing contract:', writeError);
      toast.error('Transaction cancelled', {
        id: 'proposal-tx',
        duration: 3000,
      });
      setTxPending(false);
    }
  }, [writeError, txPending]);

  useEffect(() => {
    const handleSuccess = async () => {
      if (isSuccess && txPending) {
        // Show success message
        toast.success('Proposal created successfully!', {
          id: 'proposal-tx',
          duration: 3000,
        });
        
        // Reset form and close modal
        setManufacturerAddress('');
        setDescription('');
        onClose();

        // Wait for blockchain to update and toast to be visible
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force reload the page
        window.location.href = window.location.href;
      }
    };

    handleSuccess();
  }, [isSuccess, txPending, onClose]);

  // Reset txPending if transaction is not in a pending state
  useEffect(() => {
    if (!isPending && !isTxLoading && txPending && !isSuccess) {
      setTxPending(false);
    }
  }, [isPending, isTxLoading, txPending, isSuccess]);

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
      // Encode the function call for onboardNewManufacturer
      const calldata = encodeFunctionData({
        abi: nexTrackABI,
        functionName: 'onboardNewManufacturer',
        args: [manufacturerAddress as `0x${string}`],
      });

      // Prepare proposal parameters
      const args = [
        [NEXTRACK_ADDRESS], // targets
        [BigInt(0)], // values
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
            disabled={isPending || isTxLoading}
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
                disabled={isPending || isTxLoading}
              />
              <button
                type="button"
                onClick={useConnectedWallet}
                disabled={!isConnected || isPending || isTxLoading}
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
              disabled={isPending || isTxLoading}
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
              disabled={isPending || isTxLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isPending || isTxLoading}
            >
              {(isPending || isTxLoading) && (
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
