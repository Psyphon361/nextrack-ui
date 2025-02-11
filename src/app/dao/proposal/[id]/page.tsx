'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { keccak256, toBytes, Address } from 'viem';
import { encodeFunctionData } from 'viem';
import { nexTrackABI } from '@/constants/abi';
import { NEXTRACK_ADDRESS, GOVERNOR_ADDRESS } from '@/constants/addresses';
import { useProposals } from '@/hooks/useProposals';
import { ProposalState } from '@/types/dao';
import Navigation from '@/components/Navigation';
import VotingPanel from '@/components/VotingPanel';

const governorABI = [{
  name: "queue",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "targets", type: "address[]", internalType: "address[]" },
    { name: "values", type: "uint256[]", internalType: "uint256[]" },
    { name: "calldatas", type: "bytes[]", internalType: "bytes[]" },
    { name: "descriptionHash", type: "bytes32", internalType: "bytes32" }
  ],
  outputs: []
}, {
  name: "execute",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "targets", type: "address[]", internalType: "address[]" },
    { name: "values", type: "uint256[]", internalType: "uint256[]" },
    { name: "calldatas", type: "bytes[]", internalType: "bytes[]" },
    { name: "descriptionHash", type: "bytes32", internalType: "bytes32" }
  ],
  outputs: []
}, {
  name: "proposalEta",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
  outputs: [{ name: "", type: "uint256", internalType: "uint256" }]
}] as const;

// Keep using GOVERNOR_ADDRESS for consistency with existing code
const governorAddress = GOVERNOR_ADDRESS as Address;

enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}

const getStateColor = (state: ProposalState) => {
  switch (state) {
    case ProposalState.Active:
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case ProposalState.Pending:
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case ProposalState.Succeeded:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case ProposalState.Executed:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case ProposalState.Defeated:
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case ProposalState.Canceled:
    case ProposalState.Expired:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case ProposalState.Queued:
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getStateIcon = (state: ProposalState) => {
  switch (state) {
    case ProposalState.Succeeded:
    case ProposalState.Queued:
    case ProposalState.Executed:
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    // case ProposalState.Defeated:
    //   return (
    //     <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    //     </svg>
    //   );
    case ProposalState.Active:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500/20"></div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
      );
  }
};

// Helper function to safely format dates
const formatTimestamp = (timestamp: string | number | undefined): string => {
  if (!timestamp) return 'N/A';

  try {
    const timestampNum = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
    if (isNaN(timestampNum)) return 'Invalid date';

    const date = new Date(timestampNum * 1000);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return format(date, 'MMM d, yyyy HH:mm');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

function CountdownTimer({ timestamp, state }: { timestamp: string | number; state: number }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // If proposal is beyond Active state, show Ended
    if (state > ProposalState.Active) {
      setTimeLeft('Ended');
      return;
    }

    // If proposal is Active, show Started
    if (state === ProposalState.Active) {
      setTimeLeft('Started');
      return;
    }

    const timestampNum = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
    const now = Math.floor(Date.now() / 1000);

    if (timestampNum <= now) {
      setTimeLeft('Started');
      return;
    }

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const difference = timestampNum - now;

      if (difference <= 0) {
        setTimeLeft('Started');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (24 * 60 * 60));
      const hours = Math.floor((difference % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);

      setTimeLeft(
        `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [timestamp, state]);

  return <span className="font-mono">{timeLeft}</span>;
}

function CopyableAddress({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      <button
        onClick={handleCopy}
        className="group relative w-full text-left px-4 py-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-xl border border-gray-700/50 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <p className="text-white text-sm break-all pr-8">{address}</p>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

function VoteStats({ forVotes, againstVotes, abstainVotes }: {
  forVotes: string,
  againstVotes: string,
  abstainVotes: string
}) {
  const totalVotes = Number(forVotes) + Number(againstVotes) + Number(abstainVotes);
  const forPercentage = totalVotes > 0 ? (Number(forVotes) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (Number(againstVotes) / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (Number(abstainVotes) / totalVotes) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-green-400">For</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{Number(forVotes).toLocaleString()}</span>
              <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
                {forPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${forPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-red-400">Against</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{Number(againstVotes).toLocaleString()}</span>
              <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium">
                {againstPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-400">Abstain</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{Number(abstainVotes).toLocaleString()}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-500/10 text-gray-400 text-xs font-medium">
                {abstainPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-500"
              style={{ width: `${abstainPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get the next state based on current state
const getNextState = (currentState: ProposalState) => {
  switch (currentState) {
    case ProposalState.Pending:
      return ProposalState.Active;
    case ProposalState.Active:
      return ProposalState.Succeeded;
    case ProposalState.Succeeded:
      return ProposalState.Queued;
    case ProposalState.Queued:
      return ProposalState.Executed;
    default:
      return null;
  }
};

// Helper function to get state label
const getStateLabel = (state: ProposalState) => {
  switch (state) {
    case ProposalState.Pending:
      return 'Created';
    case ProposalState.Active:
      return 'Active';
    case ProposalState.Canceled:
      return 'Canceled';
    case ProposalState.Defeated:
      return 'Defeated';
    case ProposalState.Succeeded:
      return 'Succeeded';
    case ProposalState.Queued:
      return 'Queued';
    case ProposalState.Expired:
      return 'Expired';
    case ProposalState.Executed:
      return 'Executed';
  }
};

function ExecuteTimer({ eta }: { eta: number }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [canExecute, setCanExecute] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const difference = eta - now;

      if (difference <= 0) {
        setTimeLeft('Ready to execute');
        setCanExecute(true);
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (24 * 60 * 60));
      const hours = Math.floor((difference % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = difference % 60;

      setTimeLeft(
        `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`
      );
      setCanExecute(false);
    }, 1000);

    return () => clearInterval(timer);
  }, [eta]);

  return { timeLeft, canExecute };
}

interface Proposal {
  id: string;
  description: string;
  state: number;
  targets: string[];
  values: string[];
  calldatas: string[];
  proposer: string;
  startBlock: string;
  endBlock: string;
  executed: boolean;
  canceled: boolean;
  title: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  created: string;
  manufacturerAddress: string;
  voteStart: number;
  voteEnd: number;
}

function VotingEndDisplay({ state, voteEnd }: { state: number; voteEnd: number | string }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    // If not Active or Pending, voting has ended
    if (state > ProposalState.Active) {
      setStatus('Ended');
      return;
    }

    const timestampNum = typeof voteEnd === 'string' ? Number(voteEnd) : voteEnd;
    const now = Math.floor(Date.now() / 1000);

    if (timestampNum <= now) {
      setStatus('Ended');
      return;
    }

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const difference = timestampNum - now;

      if (difference <= 0) {
        setStatus('Ended');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (24 * 60 * 60));
      const hours = Math.floor((difference % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);

      setStatus(
        `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [state, voteEnd]);

  return <span className="font-mono">{status}</span>;
}

export default function ProposalDetails() {
  const params = useParams();
  const { proposals, refreshProposals } = useProposals();
  const proposal = proposals?.find(p => p.id === params.id) as Proposal | undefined;
  const [txPending, setTxPending] = useState(false);
  const { address } = useAccount();

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get proposal ETA
  const { data: proposalEta, refetch: refetchEta } = useReadContract({
    address: governorAddress,
    abi: governorABI,
    functionName: 'proposalEta',
    args: params.id ? [BigInt(params.id)] : undefined,
    enabled: !!params.id,
  });

  const { timeLeft, canExecute } = ExecuteTimer({
    eta: proposalEta ? Number(proposalEta) : 0
  });

  // Handle transaction states
  useEffect(() => {
    if (isPending && !txPending) {
      setTxPending(true);
      toast.loading('Confirm in wallet...', {
        id: 'gov-tx',
        duration: Infinity,
      });
    }
  }, [isPending, txPending]);

  useEffect(() => {
    if (isTxLoading && txPending) {
      const message = proposal?.state === ProposalState.Succeeded
        ? 'Queueing proposal...'
        : 'Executing proposal...';

      toast.loading(message, {
        id: 'gov-tx',
        duration: Infinity,
      });
    }
  }, [isTxLoading, proposal?.state, txPending]);

  // Handle success state
  useEffect(() => {
    const handleSuccess = async () => {
      if (isSuccess && txPending) {
        const message = proposal?.state === ProposalState.Succeeded
          ? 'Proposal queued successfully!'
          : 'Proposal executed successfully!';

        toast.success(message, {
          id: 'gov-tx',
          duration: 3000,
        });

        // Refresh data
        await Promise.all([
          refreshProposals(),
          refetchEta()
        ]);

        setTxPending(false);
      }
    };

    handleSuccess();
  }, [isSuccess, proposal?.state, txPending, refreshProposals, refetchEta]);

  // Reset txPending if transaction is not in a pending state
  useEffect(() => {
    if (!isPending && !isTxLoading && txPending && !isSuccess) {
      setTxPending(false);
    }
  }, [isPending, isTxLoading, txPending, isSuccess]);

  const handleQueue = async (proposal: Proposal) => {
    try {
      if (!proposal.targets || !proposal.values || !proposal.calldatas || !proposal.description) {
        console.error('Invalid proposal data:', proposal);
        toast.error('Invalid proposal data');
        return;
      }

      console.log('Queueing proposal with data:', {
        targets: proposal.targets,
        values: proposal.values.map(v => v.toString()),
        calldatas: proposal.calldatas,
        description: proposal.description
      });

      const descriptionHash = keccak256(toBytes(proposal.description));

      writeContract({
        address: governorAddress,
        abi: governorABI,
        functionName: 'queue',
        args: [
          proposal.targets as `0x${string}`[],
          proposal.values,
          proposal.calldatas as `0x${string}`[],
          descriptionHash,
        ],
      });
    } catch (err) {
      console.error('Error queueing proposal:', err);
      toast.error('Failed to queue proposal');
      setTxPending(false);
    }
  };

  const handleExecute = async (proposal: Proposal) => {
    try {
      if (!proposal.targets || !proposal.values || !proposal.calldatas || !proposal.description) {
        console.error('Invalid proposal data:', proposal);
        toast.error('Invalid proposal data');
        return;
      }

      console.log('Executing proposal with data:', {
        targets: proposal.targets,
        values: proposal.values.map(v => v.toString()),
        calldatas: proposal.calldatas,
        description: proposal.description
      });

      const descriptionHash = keccak256(toBytes(proposal.description));

      writeContract({
        address: governorAddress,
        abi: governorABI,
        functionName: 'execute',
        args: [
          proposal.targets as `0x${string}`[],
          proposal.values,
          proposal.calldatas as `0x${string}`[],
          descriptionHash,
        ],
      });
    } catch (err) {
      console.error('Error executing proposal:', err);
      toast.error('Failed to execute proposal');
      setTxPending(false);
    }
  };

  if (!proposal) return <div>Loading...</div>;

  const proposalState = Number(proposal.state);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-12">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid rgba(75, 85, 99, 0.3)',
          },
        }}
      />

      <Navigation />

      {/* Content */}
      <div className="container mt-5 pt-5 mx-auto px-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - 70% */}
          <div className="lg:w-[70%] space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-blue-700/30">
                <div className="flex items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="flex items-center justify-center space-x-4">
                      <h1 className="text-3xl font-bold">{proposal.title}</h1>
                      <span className="text-lg px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 font-semibold">
                        #{proposal.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voting Times */}
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div className="space-y-1.5 text-center">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Voting Starts</p>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">
                        <CountdownTimer targetDate={proposal.voteStart} state={Number(proposal.state)} />
                      </p>
                      <p className="text-xs text-gray-500">
                        [{format(proposal.voteStart, 'MMM d, yyyy HH:mm')}]
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-center">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Voting Ends</p>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">
                        <VotingEndDisplay state={Number(proposal.state)} voteEnd={proposal.voteEnd} />
                      </p>
                      <p className="text-xs text-gray-500">
                        [{format(proposal.voteEnd, 'MMM d, yyyy HH:mm')}]
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6">Description</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {proposal.description}
                  </p>
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold">Details</h2>
                  <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-medium ${
                    getStateColor(Number(proposal.state) as ProposalState)
                  }`}>
                    {getStateLabel(Number(proposal.state))}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CopyableAddress 
                    address={proposal.proposer} 
                    label="Proposer"
                  />
                  <CopyableAddress 
                    address={proposal.manufacturerAddress} 
                    label="Manufacturer Address"
                  />
                </div>
              </div>

              {/* Voting Stats Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold">Voting Stats</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-400">Total Votes:</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      {(Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <VoteStats
                  forVotes={proposal.forVotes}
                  againstVotes={proposal.againstVotes}
                  abstainVotes={proposal.abstainVotes}
                />
              </div>
            </motion.div>
          </div>

          {/* Voting Panel - 30% */}
          <div className="lg:w-[30%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {proposal && (
                <VotingPanel
                  proposal={proposal}
                />
              )}
              {/* Queue and Execute buttons */}
              {proposalState === ProposalState.Succeeded && (
                <button
                  onClick={() => handleQueue(proposal)}
                  disabled={isPending || isTxLoading}
                  className="w-full px-6 py-3 mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
                >
                  {isPending || isTxLoading ? 'Queueing...' : 'Queue Proposal'}
                </button>
              )}

              {proposalState === ProposalState.Queued && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">
                    Time until execution: {timeLeft}
                  </div>
                  <button
                    onClick={() => handleExecute(proposal)}
                    disabled={isPending || isTxLoading || !canExecute}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300"
                  >
                    {isPending || isTxLoading ? 'Executing...' : canExecute ? 'Execute Proposal' : 'Waiting for timelock...'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
