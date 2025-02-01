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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50" />
        <div className="container mx-auto px-6 py-24">
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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-6 py-24"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl -z-10" />
              <div className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50 h-full transform transition-transform group-hover:-translate-y-2">
                <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-6`}>
                  <feature.icon />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Benefits Section */}
      <div className="container mx-auto px-6 py-24 border-t border-gray-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold mb-12 font-['Space_Grotesk']">Why Choose NexTrack?</h2>
          <div className="space-y-8">
            <div className="p-6 bg-gray-800/30 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Seamless Integration</h3>
              <p className="text-gray-400">
                Easily integrate with your existing systems and start tracking your products within minutes.
              </p>
            </div>
            <div className="p-6 bg-gray-800/30 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-gray-400">
                Get instant notifications and updates about your product's location and status.
              </p>
            </div>
            <div className="p-6 bg-gray-800/30 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Cost-Effective</h3>
              <p className="text-gray-400">
                Reduce operational costs and increase efficiency with our blockchain-based solution.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
