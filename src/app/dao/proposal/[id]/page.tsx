'use client';

import { useProposals } from '@/hooks/useProposals';
import { formatDistanceToNow, format } from 'date-fns';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VotingPanel from '@/components/VotingPanel';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

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

function CountdownTimer({ timestamp }: { timestamp: string | number }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timestampNum = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
    if (isNaN(timestampNum)) {
      setTimeLeft('Invalid time');
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
  }, [timestamp]);

  return <span className="font-mono">{timeLeft}</span>;
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-400">Total Votes</span>
        <span className="font-bold">{totalVotes.toLocaleString()}</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-400">For</span>
            <span className="text-green-400">{Number(forVotes).toLocaleString()} ({forPercentage.toFixed(1)}%)</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${forPercentage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-red-400">Against</span>
            <span className="text-red-400">{Number(againstVotes).toLocaleString()} ({againstPercentage.toFixed(1)}%)</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Abstain</span>
            <span className="text-gray-400">{Number(abstainVotes).toLocaleString()} ({abstainPercentage.toFixed(1)}%)</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-500 rounded-full transition-all duration-500"
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

export default function ProposalDetails() {
  const params = useParams();
  const { proposals } = useProposals();
  const proposal = proposals.find((p) => p.id === params.id);

  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  const proposalState = Number(proposal.state);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-12">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        }}
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-gray-800/30 backdrop-blur-xl border-b border-blue-700/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              NexTrack DAO
            </h1>
            <Link
              href="/dao"
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
            >
              Back to Proposals
            </Link>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-6 py-8">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-0 w-full h-1 bg-gray-700/50 top-5"></div>

          {/* Timeline points */}
          <div className="relative flex justify-between items-center">
            {/* Created */}
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center z-10">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="mt-2 text-sm font-medium text-gray-300">Created</span>
            </div>

            {/* Active */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 
                ${proposalState >= ProposalState.Active ? 'bg-green-500' : 'bg-gray-700'}`}>
                {proposalState >= ProposalState.Active ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-300">Active</span>
            </div>

            {/* Next State (Succeeded/Defeated) */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 
                ${proposalState === ProposalState.Active ? 'bg-blue-500/30 border-2 border-blue-500' : 
                  proposalState > ProposalState.Active ? 'bg-green-500' : 'bg-gray-700'}`}>
                {proposalState > ProposalState.Active ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : proposalState === ProposalState.Active ? (
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                ) : (
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-300">
                {proposalState === ProposalState.Active ? 'Succeeded' : 
                 proposalState === ProposalState.Succeeded ? 'Succeeded' :
                 proposalState === ProposalState.Defeated ? 'Defeated' : 'Pending'}
              </span>
            </div>

            {/* Queued */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 
                ${proposalState === ProposalState.Succeeded ? 'bg-blue-500/30 border-2 border-blue-500' : 
                  proposalState > ProposalState.Succeeded ? 'bg-green-500' : 'bg-gray-700'}`}>
                {proposalState > ProposalState.Succeeded ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : proposalState === ProposalState.Succeeded ? (
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                ) : (
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-300">
                {proposalState === ProposalState.Succeeded ? 'Approaching Queued' : 'Queued'}
              </span>
            </div>

            {/* Executed */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 
                ${proposalState === ProposalState.Queued ? 'bg-blue-500/30 border-2 border-blue-500' : 
                  proposalState === ProposalState.Executed ? 'bg-green-500' : 'bg-gray-700'}`}>
                {proposalState === ProposalState.Executed ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : proposalState === ProposalState.Queued ? (
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                ) : (
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-300">
                {proposalState === ProposalState.Queued ? 'Approaching Executed' : 'Executed'}
              </span>
            </div>
          </div>

          {/* Progress bar for current state */}
          {proposalState === ProposalState.Active && (
            <div className="mt-8 bg-gray-700/50 rounded-full h-2">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: '70%' }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - 70% */}
          <div className="lg:w-[70%] space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header Card */}
              <div className="bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-blue-700/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <h1 className="text-3xl font-bold">{proposal.title}</h1>
                      <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                        #{proposal.id}
                      </span>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      getStateColor(Number(proposal.state) as ProposalState)
                    }`}>
                      {getStateLabel(Number(proposal.state))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed">
                    {proposal.description}
                  </p>
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6">Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Proposer</h3>
                    <p className="text-white break-all">{proposal.proposer}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Manufacturer Address</h3>
                    <p className="text-white break-all">{proposal.manufacturerAddress}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Created At</h3>
                    <p className="text-white">{formatTimestamp(proposal.created)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
                    <p className={`font-medium ${
                      getStateColor(Number(proposal.state) as ProposalState)
                    }`}>
                      {getStateLabel(Number(proposal.state))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voting Stats Card */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6">Voting Stats</h2>
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
              <VotingPanel proposalId={proposal.id} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
