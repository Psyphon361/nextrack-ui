'use client';

import { useState, FormEvent, useCallback } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';
import { ProductCategory } from '@/types/contracts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { validateImage, MAX_FILE_SIZE } from '@/utils/imageProcessing';

export default function RegisterBatchPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ProductCategory.Electronics,
    totalQuantity: '',
    unitPrice: '',
    imageUrl: '', // Add imageUrl to store IPFS link
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Pinata
      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
      });

      const hash = response.data.IpfsHash;
      setIpfsHash(hash);
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
      console.log('IPFS URL:', ipfsUrl);
      
      setFormData(prev => ({ ...prev, imageUrl: ipfsUrl }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateImage(file);
      setIsUploading(true);
      setSelectedImage(file);
      await handleImageUpload(file);
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
    } finally {
      setIsUploading(false);
    }
  }, [handleImageUpload]);

  const handleImageRemove = useCallback(async () => {
    if (ipfsHash) {
      try {
        // Unpin from Pinata
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          },
        });
        console.log('Image unpinned from IPFS:', ipfsHash);
      } catch (error) {
        console.error('Error unpinning from IPFS:', error);
        // We still want to remove the image from the form even if unpinning fails
      }
      setIpfsHash('');
    }
    setSelectedImage(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  }, [ipfsHash]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate image is uploaded
    if (!formData.imageUrl) {
      toast.error('Please upload a product image', {
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });
      return;
    }

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
      const price = ethers.parseUnits(formData.unitPrice, 18); // Convert to wei, 6 decimals for mUSDT

      // Register the batch
      const tx = await contract.registerProductBatch(
        formData.name,
        formData.description,
        formData.category,
        quantity,
        price,
        formData.imageUrl
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Get the ProductBatchRegistered event
      const event = receipt.logs[0]; // The first event should be ProductBatchRegistered
      const batchId = event.topics[1]; // First indexed parameter (batchId) is in topics[1]
      const decodedBatchId = parseInt(batchId, 16); // Convert hex to decimal
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: ProductCategory.Electronics,
        totalQuantity: '',
        unitPrice: '',
        imageUrl: '',
      });
      
      toast.success(`Product batch registered successfully! Batch ID: ${decodedBatchId}`, {
        id: toastId,
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
        },
      });

      // Redirect to My Listings page after a short delay
      setTimeout(() => {
        router.push('/app/my-batches');
      }, 2000);
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
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-gray-800/40 rounded-3xl backdrop-blur-md border border-gray-700/50 p-12 shadow-2xl"
        >
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Register New Product Batch
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text font-medium mb-2 text-gray-300">
                Product Image <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4 pr-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploading}
                  className="hidden"
                  id="product-image"
                  required={!selectedImage}
                />
                <label
                  htmlFor="product-image"
                  className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 text-center cursor-pointer hover:bg-gray-700/50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? 'Uploading...' : 'Choose Image'}
                </label>
                {selectedImage && (
                  <div className="relative w-48 h-48">
                    <Image
                      src={URL.createObjectURL(selectedImage)}
                      alt="Product preview"
                      fill
                      className="object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-300"
                      aria-label="Remove image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Maximum file size: 2MB. Supported formats: All image formats.
              </p>
            </div>

            <div>
              <label className="block text font-medium mb-2 text-gray-300">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text font-medium mb-2 text-gray-300">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[120px] transition-all duration-300"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label className="block text font-medium mb-2 text-gray-300">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) })}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
              >
                {Object.entries(ProductCategory)
                  .filter(([key]) => isNaN(Number(key)))
                  .map(([key, value]) => (
                    <option key={value} value={value} className="bg-gray-800">
                      {key}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text font-medium mb-2 text-gray-300">
                Total Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.totalQuantity}
                onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                required
                min="1"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
                placeholder="Enter total quantity"
              />
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text font-medium mb-2 text-gray-300">
                Unit Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                id="unitPrice"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
                placeholder="Enter unit price in USD"
                required
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={isRegistering}
                className="relative group overflow-hidden flex-1 px-10 py-4 rounded-2xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300"></div>
                <span className="relative z-10">
                  {isRegistering ? 'Registering...' : 'Register Batch'}
                </span>
              </button>
              <Link
                href="/app"
                className="relative group overflow-hidden flex-1 px-10 py-4 rounded-2xl text-lg font-semibold border border-gray-700 text-gray-300 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 inline-flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <span className="relative z-10">Cancel</span>
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
