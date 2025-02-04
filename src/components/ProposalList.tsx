'use client';

import { useProposals, ProposalState } from '@/hooks/useProposals';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';

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

function getProposalStateLabel(state: number) {
  const stateMap = {
    [ProposalState.Pending]: { label: 'Pending', className: 'bg-yellow-900/20 text-yellow-200 ring-1 ring-yellow-900/30' },
    [ProposalState.Active]: { label: 'Active', className: 'bg-green-900/20 text-green-200 ring-1 ring-green-900/30' },
    [ProposalState.Canceled]: { label: 'Canceled', className: 'bg-red-900/20 text-red-200 ring-1 ring-red-900/30' },
    [ProposalState.Defeated]: { label: 'Defeated', className: 'bg-red-900/20 text-red-200 ring-1 ring-red-900/30' },
    [ProposalState.Succeeded]: { label: 'Succeeded', className: 'bg-green-900/20 text-green-200 ring-1 ring-green-900/30' },
    [ProposalState.Queued]: { label: 'Queued', className: 'bg-blue-900/20 text-blue-200 ring-1 ring-blue-900/30' },
    [ProposalState.Expired]: { label: 'Expired', className: 'bg-gray-900/20 text-gray-200 ring-1 ring-gray-900/30' },
    [ProposalState.Executed]: { label: 'Executed', className: 'bg-purple-900/20 text-purple-200 ring-1 ring-purple-900/30' }
  };

  return stateMap[state as ProposalState] || { label: 'Unknown', className: 'bg-gray-900/20 text-gray-200 ring-1 ring-gray-900/30' };
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function ProposalList() {
  const { proposals, isLoading, error } = useProposals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No proposals found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {proposals.map((proposal, index) => {
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
              <span className="px-3 py-1 bg-gray-900/90 rounded-full text-xs font-semibold text-gray-400 border border-gray-700">
                Proposal #{proposal.id}
              </span>
            </div>

            <div className="flex justify-between items-start mt-3 mb-6">
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Proposal Description</h3>
                <p className="text-base text-white leading-relaxed pr-4">
                  {proposal.description}
                </p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium ml-4 flex-shrink-0 ${className}`}>
                <span className="text-white">{label}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Proposed Manufacturer</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-base font-semibold text-white font-mono">
                    {formatAddress(proposal.manufacturerAddress)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Proposer</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <p className="text-base font-semibold text-white font-mono">
                    {formatAddress(proposal.proposer)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-700/50">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Voting Starts</p>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">
                    {formatDistanceToNow(proposal.voteStart, { addSuffix: true })}
                  </p>
                  <p className="text-xs text-gray-500">
                    [{format(proposal.voteStart, 'MMM d, yyyy HH:mm')}]
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Voting Ends</p>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">
                    {formatDistanceToNow(proposal.voteEnd, { addSuffix: true })}
                  </p>
                  <p className="text-xs text-gray-500">
                    [{format(proposal.voteEnd, 'MMM d, yyyy HH:mm')}]
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
