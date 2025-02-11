"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from 'next/link';
import CreateProposalModal from "@/components/CreateProposalModal";
import ProposalList from "@/components/ProposalList";
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';

const DAOPage = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [isConnecting, setIsConnecting] = useState(false);
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
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                All Proposals
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg ${
                  activeTab === "pending"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`py-4 px-1 border-b-2 font-semibold text-lg ${
                  activeTab === "completed"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Completed
              </button>
            </div>
            
            {isConnected && (
              <button 
                onClick={() => setIsProposalModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
              >
                Create New Proposal
              </button>
            )}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {!isConnected ? (
            <div className="text-center py-16">
              <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-xl text-gray-300 mb-8">
                Please connect your wallet to participate in DAO governance
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              {/* Proposal List */}
              <ProposalList activeFilter={activeTab} />
            </>
          )}
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
