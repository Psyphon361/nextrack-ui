'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FilterIcon, SearchIcon } from '@/components/icons';

type VerificationType = 'verified' | 'unverified' | 'pending';
type TransferStatusType = 'available' | 'transferred' | 'locked' | 'in_transfer' | 'sold';

interface Filters {
  minPrice: string;
  maxPrice: string;
  verification: VerificationType[];
  transferStatus: TransferStatusType[];
  manufacturer: string;
  dateRange: string;
}

export default function MarketplaceClient() {
  const [activeTab, setActiveTab] = useState('verified');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    minPrice: '',
    maxPrice: '',
    verification: [],
    transferStatus: [],
    manufacturer: '',
    dateRange: 'all'
  });

  const handleFilterChange = (key: keyof Filters, value: Filters[keyof Filters]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleVerificationFilter = (value: VerificationType) => {
    setFilters(prev => ({
      ...prev,
      verification: prev.verification.includes(value)
        ? prev.verification.filter(v => v !== value)
        : [...prev.verification, value]
    }));
  };

  const toggleTransferStatusFilter = (value: TransferStatusType) => {
    setFilters(prev => ({
      ...prev,
      transferStatus: prev.transferStatus.includes(value)
        ? prev.transferStatus.filter(v => v !== value)
        : [...prev.transferStatus, value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      verification: [],
      transferStatus: [],
      manufacturer: '',
      dateRange: 'all'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold font-['JetBrains_Mono']">
          Marketplace
        </h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            <FilterIcon />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-['JetBrains_Mono']"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Price Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Price Range (mUSDT)</label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-['JetBrains_Mono']"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-['JetBrains_Mono']"
                />
              </div>
            </div>

            {/* Verification Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Verification Status</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.verification.includes('verified')}
                    onChange={() => toggleVerificationFilter('verified')}
                    className="form-checkbox bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span>Verified</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.verification.includes('pending')}
                    onChange={() => toggleVerificationFilter('pending')}
                    className="form-checkbox bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span>Pending</span>
                </label>
              </div>
            </div>

            {/* Transfer Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Transfer Status</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.transferStatus.includes('available')}
                    onChange={() => toggleTransferStatusFilter('available')}
                    className="form-checkbox bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span>Available</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.transferStatus.includes('in_transfer')}
                    onChange={() => toggleTransferStatusFilter('in_transfer')}
                    className="form-checkbox bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span>In Transfer</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.transferStatus.includes('sold')}
                    onChange={() => toggleTransferStatusFilter('sold')}
                    className="form-checkbox bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span>Sold</span>
                </label>
              </div>
            </div>

            {/* Listed Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Listed Date</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-['JetBrains_Mono']"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Manufacturer Address */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Manufacturer Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={filters.manufacturer}
                onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-['JetBrains_Mono'] text-sm"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Status filter */}
      <div className="flex justify-center mb-8 space-x-4">
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'verified'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Verified Manufacturers
        </button>
        <button
          onClick={() => setActiveTab('reseller')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'reseller'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Reseller Listings
        </button>
      </div>

      {/* Product Grid */}
      <div className="text-center text-gray-400 py-12">
        No listings available
      </div>
    </div>
  );
}
