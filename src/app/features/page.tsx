'use client';

import { motion } from 'framer-motion';
import { BlockchainIcon, SecurityIcon, TraceabilityIcon } from '@/components/icons';
import Navigation from '@/components/Navigation';

const features = [
  {
    icon: BlockchainIcon,
    title: 'Blockchain-Powered',
    description: 'Leverage the power of blockchain technology for immutable, transparent record-keeping of all product movements and transactions.',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    icon: SecurityIcon,
    title: 'Enhanced Security',
    description: 'Advanced cryptographic security ensures that product data cannot be tampered with, providing trust and authenticity.',
    color: 'from-green-600 to-emerald-600',
  },
  {
    icon: TraceabilityIcon,
    title: 'Complete Traceability',
    description: 'Track products from manufacture to end-user with detailed history and chain of custody information.',
    color: 'from-purple-600 to-pink-600',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50" />
        <div className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl font-bold mb-6 font-['Space_Grotesk']">
              Revolutionizing Supply Chain Management
            </h1>
            <p className="text-xl text-gray-300">
              NexTrack combines cutting-edge blockchain technology with intuitive design to create
              the most powerful supply chain tracking solution available.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 -z-10" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 h-full relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300 ease-in-out"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-300" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-6 self-start group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed flex-grow group-hover:text-gray-200 transition-colors duration-300">{feature.description}</p>
                  <div className="mt-4 self-start">
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-6 pt-6">
        <div className="container mx-auto px-6">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-4xl font-bold mb-16 text-center font-['Space_Grotesk']"
          >
            Why Choose NexTrack?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Seamless Integration',
                description: 'Easily integrate with your existing systems and start tracking your products within minutes.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                )
              },
              {
                title: 'Real-time Updates',
                description: 'Get instant notifications and updates about your product\'s location and status.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                title: 'Cost-Effective',
                description: 'Reduce operational costs and increase efficiency with our blockchain-based solution.',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
            ].map((benefit, index) => (
              <div 
                key={index} 
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 -z-10" />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 h-full relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300 ease-in-out"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-300" />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="inline-block mb-6 self-start group-hover:scale-110 transition-transform duration-300">
                      {benefit.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">{benefit.title}</h3>
                    <p className="text-gray-400 leading-relaxed flex-grow group-hover:text-gray-200 transition-colors duration-300">{benefit.description}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
