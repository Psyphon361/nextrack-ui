'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useContractRead, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Address, isAddress } from 'viem';
import toast from 'react-hot-toast';
import { ProposalState } from '@/types/dao';

interface VotingPanelProps {
  proposal: {
    id: string;
    state: number;
  };
}

enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2
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

const govTokenAddress = '0x49BF52204B9475e76c8c0Bf674670c6bde8e9a9e' as Address;
const governorAddress = '0xD384A3471F1c22b9b578f2fc35d8Ca854AEb6801' as Address;

const governorABI = [{
  name: 'castVote',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' }
  ],
  outputs: []
}, {
  name: 'castVoteWithReason',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' },
    { name: 'reason', type: 'string' }
  ],
  outputs: []
}] as const;

export default function VotingPanel({ proposal }: VotingPanelProps) {
  const { address } = useAccount();
  const { connect } = useConnect();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [comment, setComment] = useState('');
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDelegateInput, setShowDelegateInput] = useState(false);
  const tooltipTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isDelegating, setIsDelegating] = useState(false);
  const [votingPower, setVotingPower] = useState(0);
  const [hasDelegatedToSelf, setHasDelegatedToSelf] = useState(false);
  const [txPending, setTxPending] = useState(false);

  // Get NXT balance
  const { data: nxtBalance } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'balanceOf',
    args: address ? [address as Address] : undefined,
  });

  // Get current delegate
  const { data: currentDelegate } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'delegates',
    args: address ? [address as Address] : undefined,
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
    args: address ? [address] : undefined,
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
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Check delegation status
  const { data: currentDelegateAddress, refetch: refetchDelegate } = useReadContract({
    address: govTokenAddress,
    abi: govTokenABI,
    functionName: 'delegates',
    args: address ? [address] : undefined,
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
    if (isPending && !txPending) {
      setTxPending(true);
      toast.loading('Confirm in your wallet...', {
        id: 'vote-tx',style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        }
      });
    }
  }, [isPending, txPending]);

  useEffect(() => {
    if (isTxLoading && txPending) {
      toast.loading('Casting vote...', {
        id: 'vote-tx',
      });
    }
  }, [isTxLoading, txPending]);

  useEffect(() => {
    if (isSuccess && txPending) {
      toast.success('Vote cast successfully!', {
        id: 'vote-tx',
        duration: 3000,
      });

      // Wait for blockchain to update
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess, txPending]);

  // Reset txPending and show error if transaction is not in a pending state
  useEffect(() => {
    if (!isPending && !isTxLoading && txPending && !isSuccess) {
      setTxPending(false);
      toast.error('Transaction rejected', {
        id: 'vote-tx',
        duration: 3000,
      });
    }
  }, [isPending, isTxLoading, txPending, isSuccess]);

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

  const handleVoteSubmit = async () => {
    if (!address || selectedVote === null || !comment.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      writeContract({
        address: governorAddress,
        abi: governorABI,
        functionName: 'castVoteWithReason',
        args: [BigInt(proposal.id), selectedVote, comment.trim()],
      });
    } catch (err) {
      console.error('Error casting vote:', err);
      toast.error('Failed to cast vote', {
        id: 'vote-tx',
        duration: 3000,
      });
      setTxPending(false);
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

  // Simple connect wallet handler
  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  if (!proposal) {
    return null;
  }

  const isVotingEnabled = proposal?.state === 1;

  // Debug state changes
  useEffect(() => {
    console.log('Selected vote changed:', selectedVote);
    console.log('Vote type Against is:', VoteType.Against);
  }, [selectedVote]);

  useEffect(() => {
    console.log('Submit button conditions:', {
      hasDelegatedToSelf,
      selectedVote,
      hasComment: !!comment.trim(),
      isVotingEnabled,
      txPending,
      isButtonDisabled: !hasDelegatedToSelf || selectedVote === null || !comment.trim() || !isVotingEnabled || txPending
    });
  }, [hasDelegatedToSelf, selectedVote, comment, isVotingEnabled, txPending]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
      <div className="space-y-6">
        {/* Token Balance */}
        {address && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-700/30">
            <div>
              <h3 className="text-md font-medium text-gray-400">$NXT Balance</h3>
              <p className="text-2xl font-bold text-white pt-2">
                {nxtBalance ? (Number(nxtBalance) / 1e18).toLocaleString() : '0'} NXT
              </p>
            </div>
          </div>
        )}

        {/* Voting Power Section */}
        <div>
          {address && (
            <button
              onClick={handleParticipate}
              disabled={isDelegating || hasDelegatedToSelf || !isVotingEnabled}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
            >
              {isDelegating ? 'Setting up...' : hasDelegatedToSelf ? 'Self Delegated' : !isVotingEnabled ? 'Voting is not active' : 'Participate in Voting'}
            </button>
          )}
          {address && (
            <div className="relative mt-4">
              <button
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}
                className="text-md text-blue-400 hover:text-blue-300"
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
          )}
        </div>

        {/* Voting Section */}
        <div className="space-y-4">
          {address ? (
            <>
              <h3 className="text-lg font-semibold">Cast Your Vote</h3>
              {!isVotingEnabled && (
                <div className="text-yellow-500 mb-4">
                  Voting is not active for this proposal.
                </div>
              )}
              <div className="flex flex-col space-y-4 max-w-xl mx-auto">
                <button
                  onClick={() => setSelectedVote(VoteType.For)}
                  disabled={txPending}
                  className={`p-6 rounded-xl border transition-all duration-300 ${selectedVote === VoteType.For
                      ? 'bg-green-500/20 border-green-500'
                      : 'border-gray-700/50 hover:border-green-500/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-xl font-medium text-green-500">For</div>
                  <div className="text text-gray-400 mt-1">Vote in favor of the proposal</div>
                </button>

                <button
                  onClick={() => setSelectedVote(VoteType.Against)}
                  disabled={txPending}
                  className={`p-6 rounded-xl border transition-all duration-300 ${selectedVote === VoteType.Against
                      ? 'bg-red-500/20 border-red-500'
                      : 'border-gray-700/50 hover:border-red-500/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-xl font-medium text-red-500">Against</div>
                  <div className="text text-gray-400 mt-1">Vote against the proposal</div>
                </button>

                <button
                  onClick={() => setSelectedVote(VoteType.Abstain)}
                  disabled={txPending}
                  className={`p-6 rounded-xl border transition-all duration-300 ${selectedVote === VoteType.Abstain
                      ? 'bg-gray-500/20 border-gray-500'
                      : 'border-gray-700/50 hover:border-gray-500/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-xl font-medium text-gray-400">Abstain</div>
                  <div className="text text-gray-400 mt-1">Formally abstain from voting</div>
                </button>

                <textarea
                  placeholder="Add a comment (required)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={!hasDelegatedToSelf || !isVotingEnabled || txPending}
                  className="w-full mb-5 h-48 bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <button
                  onClick={handleVoteSubmit}
                  disabled={!hasDelegatedToSelf || selectedVote === null || !comment.trim() || !isVotingEnabled || txPending}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {txPending
                    ? isPending
                      ? "Confirm in wallet..."
                      : isTxLoading
                        ? "Casting vote..."
                        : "Processing..."
                    : !isVotingEnabled
                      ? proposal.state === 0
                        ? "Voting hasn't started"
                        : "Voting has ended"
                      : "Submit Vote"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-6">Voting</h3>
              <p className="text-gray-400 mb-4">
                You need to connect your wallet to participate in voting.
              </p>
              <button
                onClick={handleConnect}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
