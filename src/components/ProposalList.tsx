'use client';

import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ProposalState } from '@/types/dao';

function getProposalStateLabel(state: ProposalState): { label: string; className: string } {
  const stateMap = {
    [ProposalState.Pending]: { label: 'Pending', className: 'bg-yellow-500 text-black font-bold' },
    [ProposalState.Active]: { label: 'Active', className: 'bg-green-500 text-black font-bold' },
    [ProposalState.Canceled]: { label: 'Canceled', className: 'bg-red-500 text-white font-bold' },
    [ProposalState.Defeated]: { label: 'Defeated', className: 'bg-red-500 text-white font-bold' },
    [ProposalState.Succeeded]: { label: 'Succeeded', className: 'bg-green-500 text-black font-bold' },
    [ProposalState.Queued]: { label: 'Queued', className: 'bg-blue-500 text-black font-bold' },
    [ProposalState.Expired]: { label: 'Expired', className: 'bg-gray-500 text-white font-bold' },
    [ProposalState.Executed]: { label: 'Executed', className: 'bg-purple-500 text-white font-bold' }
  };

  return stateMap[state as ProposalState] || { label: 'Unknown', className: 'bg-gray-500 text-white font-bold' };
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CountdownTimer({ targetDate, type = 'start' }: { targetDate: Date, type?: 'start' | 'end' }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = differenceInSeconds(targetDate, new Date());
      if (seconds <= 0) {
        setTimeLeft(type === 'start' ? 'Started' : 'Ended');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        setTimeLeft(`${minutes}m ${remainingSeconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, type]);

  return <span className="font-mono">{timeLeft}</span>;
}

interface ProposalListProps {
  proposals: any[];
  isLoading: boolean;
}

const ProposalList = ({ proposals, isLoading }: ProposalListProps) => {
  // Sort proposals by voting start time (newest first)
  const sortedProposals = [...proposals].sort((a, b) => b.voteStart.getTime() - a.voteStart.getTime());

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Loading proposals...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No proposals found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedProposals.map((proposal, index) => {
            const { label, className } = getProposalStateLabel(proposal.state);

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                key={proposal.id}
                className={`relative bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 group`}
              >
                {/* Proposal ID Badge */}
                <div className="absolute -top-3 left-6">
                  <button
                    onClick={() => navigator.clipboard.writeText(proposal.id).then(() => toast.success('Proposal ID copied to clipboard!', {
                      duration: 2000,
                      style: {
                        background: '#333',
                        color: '#fff',
                        borderRadius: '10px',
                      },
                    }))}
                    className="px-3 py-1 bg-gray-900/90 rounded-full text-sm font-semibold text-gray-400 border border-gray-700 hover:bg-gray-800/90 hover:text-gray-300 transition-colors duration-200 cursor-pointer group flex items-center space-x-1"
                  >
                    <span>#{proposal.id}</span>
                    <svg
                      className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                </div>

                <div className="flex justify-between items-start mt-3 mb-6">
                  <div className="space-y-2 flex-1">
                    <h3 className="text font-medium text-gray-400 uppercase tracking-wider">Proposal Description</h3>
                    <p className="text-base text-white leading-relaxed pr-4">
                      {proposal.description.length > 150
                        ? `${proposal.description.slice(0, 150)}...`
                        : proposal.description}
                    </p>
                    <Link
                      href={`/dao/proposal/${proposal.id}`}
                      className="text-blue-400 hover:text-blue-300 text font-medium inline-block mt-2"
                    >
                      View Details →
                    </Link>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ml-4 flex-shrink-0 ${className}`}>
                    {label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1.5">
                    <p className="text-md font-medium text-gray-400 uppercase tracking-wider">Proposed Manufacturer</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-lg text-base font-semibold text-white font-mono">
                        {formatAddress(proposal.manufacturerAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text font-medium text-gray-400 uppercase tracking-wider">Proposer</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p className="text-lg text-base font-semibold text-white font-mono">
                        {formatAddress(proposal.proposer)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700/50">
                  <div className="space-y-1.5">
                    <p className="text font-medium text-gray-400 uppercase tracking-wider">Voting Starts</p>
                    <div className="space-y-1">
                      <div className="text-lg text-base font-semibold text-white">
                        <CountdownTimer targetDate={proposal.voteStart} type="start" />
                      </div>
                      <p className="text-sm text-gray-500">
                        [{format(proposal.voteStart, 'MMM d, yyyy HH:mm')}]
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text font-medium text-gray-400 uppercase tracking-wider">Voting Ends</p>
                    <div className="space-y-1">
                      <div className="text-lg text-base font-semibold text-white">
                        <CountdownTimer targetDate={proposal.voteEnd} type="end" />
                      </div>
                      <p className="text-sm text-gray-500">
                        [{format(proposal.voteEnd, 'MMM d, yyyy HH:mm')}]
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProposalList;
