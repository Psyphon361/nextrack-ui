"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from 'next/link';
import CreateProposalModal from "@/components/CreateProposalModal";
import ProposalList from "@/components/ProposalList";
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import { useProposals } from "@/hooks/useProposals";

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

const DAOPage = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const publicClient = usePublicClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const { proposals, isLoading } = useProposals();
  const [activeTab, setActiveTab] = useState("all");
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Filter proposals based on active tab
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    
    if (activeTab === 'all') return proposals;

    return proposals.filter(proposal => {
      const state = proposal.state;
      switch (activeTab) {
        case 'pending':
          return state === ProposalState.Pending;
        case 'active':
          return state === ProposalState.Active;
        case 'succeeded':
          return state === ProposalState.Succeeded;
        case 'queued':
          return state === ProposalState.Queued;
        case 'executed':
          return state === ProposalState.Executed;
        case 'defeated':
          return state === ProposalState.Defeated;
        case 'expired':
          return state === ProposalState.Expired;
        case 'canceled':
          return state === ProposalState.Canceled;
        default:
          return true;
      }
    });
  }, [proposals, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-12">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid rgba(75, 85, 99, 0.3)',
          },
        }}
      />

      <Navigation />

      <div className="container mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center py-8">
          <div>
            <h1 className="text-4xl lg:text-4xl font-extrabold mb-4 tracking-tight">
              Governance{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600">
                DAO
              </span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Decentralized Governance for Manufacturer Onboarding to NexTrack
            </p>
          </div>
          
          {/* Navigation and Connect Button */}
          <div className="flex items-center mt-6 md:mt-0 space-x-4">
            
            {isConnected ? (
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold transition-all duration-300"
              >
                {formatAddress(address || '')}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-700/50 mb-8">
          <nav className="flex justify-between items-center">
            <div className="flex space-x-8 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                All Proposals
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "pending"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("succeeded")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "succeeded"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Succeeded
              </button>
              <button
                onClick={() => setActiveTab("queued")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "queued"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Queued
              </button>
              <button
                onClick={() => setActiveTab("executed")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "executed"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Executed
              </button>
              <button
                onClick={() => setActiveTab("defeated")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "defeated"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Defeated
              </button>
              <button
                onClick={() => setActiveTab("expired")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "expired"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => setActiveTab("canceled")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg whitespace-nowrap ${
                  activeTab === "canceled"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Canceled
              </button>
            </div>
            
            {isConnected && (
              <button 
                onClick={() => setIsProposalModalOpen(true)}
                className="px-6 py-2.5 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
              >
                Create New Proposal
              </button>
            )}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Proposal List */}
          <ProposalList proposals={filteredProposals} isLoading={isLoading} />
        </div>
      </div>
      
      {/* Proposal Modal */}
      <CreateProposalModal 
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
      />
    </div>
  );
};

export default DAOPage;
