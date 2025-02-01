'use client';

import { useState, FormEvent } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { ProductCategory } from '@/types/contracts';

export default function RegisterBatchPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ProductCategory.Electronics,
    totalQuantity: '',
    unitPrice: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    const toastId = toast.loading('Registering product batch...', {
      duration: Infinity,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px',
      },
    });

    try {
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error('Please install a Web3 wallet like MetaMask');
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.NEXTRACK,
        CONTRACT_ABIS.NEXTRACK,
        signer
      );

      // Convert values to appropriate types
      const quantity = ethers.parseUnits(formData.totalQuantity, 0); // No decimals for quantity
      const price = ethers.parseUnits(formData.unitPrice, 6); // Convert to wei, 6 decimals for mUSDT

      // Register the batch
      const tx = await contract.registerProductBatch(
        formData.name,
        formData.description,
        formData.category,
        quantity,
        price
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Get the ProductBatchRegistered event
      const event = receipt.logs.find(
        (log: any) => log.eventName === 'ProductBatchRegistered'
      );

      if (event) {
        const batchId = event.args[0]; // First indexed parameter is batchId
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          category: ProductCategory.Electronics,
          totalQuantity: '',
          unitPrice: '',
        });
        
        toast.success(`Product batch registered successfully! Batch ID: ${batchId}`, {
          id: toastId,
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      } else {
        throw new Error('Failed to get batch ID from event');
      }
    } catch (error: any) {
      console.error('Error registering batch:', error);
      if (error.code === 4001 || error?.info?.error?.code === 4001 || error.message?.includes('user rejected')) {
        toast.error('Transaction cancelled', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      } else {
        toast.error('Failed to register product batch', {
          id: toastId,
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
      <Navigation />
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] mb-8">
            Register New Product Batch
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px]"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) })}
                required
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {Object.entries(ProductCategory)
                  .filter(([key]) => isNaN(Number(key)))
                  .map(([key, value]) => (
                    <option key={value} value={value}>
                      {key}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Total Quantity
              </label>
              <input
                type="number"
                value={formData.totalQuantity}
                onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                required
                min="1"
                className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter total quantity"
              />
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium mb-2">
                Unit Price (mUSDT)
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                id="unitPrice"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2"
                placeholder="Enter unit price in mUSDT"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isRegistering}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRegistering
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Register Batch
              </button>
              <Link
                href="/app"
                className="px-8 py-3 border border-gray-600 hover:border-blue-400 rounded-lg font-medium transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
