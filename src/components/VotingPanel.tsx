'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useContractRead } from 'wagmi';
import { Address } from 'viem';
import toast from 'react-hot-toast';

interface VotingPanelProps {
  proposalId: string;
}

const govTokenABI = [{
  name: "delegate",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [{ name: "delegatee", type: "address", internalType: "address" }],
  outputs: []
}, {
  name: "delegates",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address", internalType: "address" }],
  outputs: [{ name: "", type: "address", internalType: "address" }]
}, {
  name: "getVotes",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address", internalType: "address" }],
  outputs: [{ name: "", type: "uint256", internalType: "uint256" }]
}, {
  name: "balanceOf",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address", internalType: "address" }],
  outputs: [{ name: "", type: "uint256", internalType: "uint256" }]
}, {
  name: "castVote",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }, { name: "vote", type: "uint8", internalType: "uint8" }],
  outputs: []
}, {
  name: "castVoteWithReason",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }, { name: "vote", type: "uint8", internalType: "uint8" }, { name: "reason", type: "string", internalType: "string" }],
  outputs: []
}] as const;

export default function VotingPanel({ proposalId }: VotingPanelProps) {
  const { address } = useAccount();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [comment, setComment] = useState('');
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDelegateInput, setShowDelegateInput] = useState(false);
  const tooltipTimeout = useRef<NodeJS.Timeout>();
  const [isDelegating, setIsDelegating] = useState(false);
  const [votingPower, setVotingPower] = useState(0);
  const [hasDelegatedToSelf, setHasDelegatedToSelf] = useState(false);

  const govTokenAddress = '0x6aF8602fe599FE84C745dd56fC8fda68a73EEB85' as Address;
  const governorAddress = '0xC4d949Ad881f8BCe2532E60585c483D4Ecd45352' as Address;

  // Get NXT balance
  const { data: nxtBalance } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'balanceOf',
    args: [address as Address],
    enabled: !!address,
  });

  // Get current delegate
  const { data: currentDelegate } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'delegates',
    args: [address as Address],
    enabled: !!address,
  });

  // Check if user has delegated to themselves
  useEffect(() => {
    if (currentDelegate === address) {
      setHasDelegatedToSelf(true);
    }
  }, [currentDelegate, address]);

  // Get voting power
  const { data: power } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address,
  });

  useEffect(() => {
    if (power) {
      // Convert from 18 decimals
      const powerBigInt = BigInt(power);
      const divisor = BigInt(10 ** 18);
      const votingPowerNumber = Number(powerBigInt) / Number(divisor);
      setVotingPower(votingPowerNumber);
    }
  }, [power]);

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isDelegatingTx, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Check delegation status
  const { data: currentDelegateAddress, refetch: refetchDelegate } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    enabled: !!address,
  }) as { data: Address | undefined, refetch: () => Promise<any> };

  // Update voting power when delegation succeeds
  useEffect(() => {
    if (isSuccess) {
      refetchDelegate().then(() => {
        if (currentDelegateAddress === address) {
          setVotingPower(1);
          setHasDelegatedToSelf(true);
        }
      });
    }
  }, [isSuccess, address, currentDelegateAddress, refetchDelegate]);

  // Handle transaction states
  useEffect(() => {
    if (isPending) {
      toast.loading('Confirm in wallet...', {
        id: 'vote-tx',
        duration: Infinity,
      });
    }
  }, [isPending]);

  useEffect(() => {
    if (isDelegatingTx) {
      toast.loading('Submitting vote on-chain...', {
        id: 'vote-tx',
        duration: Infinity,
      });
    }
  }, [isDelegatingTx]);

  useEffect(() => {
    if (isSuccess) {
      toast.success('Vote submitted successfully!', {
        id: 'vote-tx',
        duration: 3000,
      });
    }
  }, [isSuccess]);

  // Handle delegation
  const handleParticipate = async () => {
    if (!address) {
      toast.error('Please connect wallet');
      return;
    }

    try {
      await writeContract({
        address: govTokenAddress,
        abi: govTokenABI,
        functionName: 'delegate',
        args: [address],
      });
    } catch (error: any) {
      console.error('Delegation error:', error);
      if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected', { id: 'delegate-tx' });
      } else {
        toast.error('Failed to delegate voting power', { id: 'delegate-tx' });
      }
    }
  };

  // Handle voting
  const handleVoteSubmit = async () => {
    if (!address || !selectedVote || !comment.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const voteMap = {
      'for': 1n,
      'against': 0n,
      'abstain': 2n
    };

    try {
      await writeContract({
        address: governorAddress,
        abi: govTokenABI,
        functionName: 'castVoteWithReason',
        args: [BigInt(proposalId), voteMap[selectedVote], comment.trim()],
      });
    } catch (error: any) {
      console.error('Vote error:', error);
      if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected', { id: 'vote-tx' });
      } else {
        toast.error('Failed to submit vote', { id: 'vote-tx' });
      }
    }
  };

  const handleAddressChange = (value: string) => {
    setDelegateAddress(value);
    if (!value) {
      setAddressError('');
      setIsValidAddress(false);
      return;
    }
    
    if (!value.startsWith('0x')) {
      setAddressError('Address must start with 0x');
      setIsValidAddress(false);
      return;
    }

    if (value.length !== 42) {
      setAddressError('Address must be 42 characters long');
      setIsValidAddress(false);
      return;
    }

    if (!isAddress(value)) {
      setAddressError('Invalid Ethereum address');
      setIsValidAddress(false);
      return;
    }

    setAddressError('');
    setIsValidAddress(true);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current);
      }
    };
  }, []);

  const handleTooltipEnter = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setShowTooltip(true);
  };

  const handleTooltipLeave = () => {
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
      <div className="space-y-6">
        {/* Token Balance */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-700/30">
          <div>
            <h3 className="text-sm font-medium text-gray-400">$NXT Balance</h3>
            <p className="text-2xl font-bold text-white">
              {nxtBalance ? (Number(nxtBalance) / 1e18).toLocaleString() : '0'} NXT
            </p>
          </div>
        </div>

        {/* Voting Power Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Voting Power</h3>
          <div className="bg-gray-900/50 rounded-xl p-4">
            <div className="text-3xl font-bold mb-2">
              {votingPower}
            </div>
          </div>

          <button
            onClick={handleParticipate}
            disabled={isDelegatingTx || hasDelegatedToSelf}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
          >
            {isDelegatingTx ? 'Setting up...' : hasDelegatedToSelf ? 'Already Participating' : 'Participate in Voting'}
          </button>

          <div className="relative mt-4">
            <button
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              How is my voting power calculated?
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 rounded-lg shadow-lg text-sm text-gray-300 z-50">
                <div className="relative">
                  <div className="space-y-2">
                    <p>
                      Your voting power is determined by whether you have delegated your voting rights to yourself.
                      Each address that has self-delegated gets 1 vote per proposal.
                    </p>
                    <p>
                      Click "Participate in Voting" to set up your voting rights. This is a one-time action that will
                      allow you to vote on all future proposals.
                    </p>
                  </div>
                  <div className="absolute -bottom-2 left-4 w-3 h-3 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voting Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Cast Your Vote</h3>
          <div className="grid grid-cols-3 gap-3">
            {['for', 'against', 'abstain'].map((vote) => (
              <button
                key={vote}
                onClick={() => setSelectedVote(vote as typeof selectedVote)}
                disabled={!hasDelegatedToSelf}
                className={`
                  px-4 py-3 rounded-xl font-medium capitalize transition-all duration-200
                  ${selectedVote === vote
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }
                  ${!hasDelegatedToSelf && 'opacity-50 cursor-not-allowed'}
                `}
              >
                {vote}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Add a comment (required)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!hasDelegatedToSelf}
            className="w-full h-24 bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleVoteSubmit}
            disabled={!hasDelegatedToSelf || !selectedVote || !comment.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
          >
            Submit Vote
          </button>
        </div>
      </div>
    </div>
  );
}
