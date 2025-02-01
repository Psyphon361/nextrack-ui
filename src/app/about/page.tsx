'use client';

import { motion } from 'framer-motion';
import { TeamIcon, InnovationIcon } from '@/components/icons';
import Navigation from '@/components/Navigation';

const teamMembers = [
  {
    name: 'The Development Team',
    role: 'Core Engineers',
    description: 'Our team of blockchain experts and full-stack developers work tirelessly to build and maintain NexTrack\'s cutting-edge platform.'
  },
  {
    name: 'The Design Team',
    role: 'UX/UI Specialists',
    description: 'Creating intuitive and beautiful interfaces that make complex blockchain operations simple and accessible.'
  },
  {
    name: 'The Support Team',
    role: 'Customer Success',
    description: 'Dedicated to helping our users get the most out of NexTrack with 24/7 support and guidance.'
  }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
        </div>
        <div className="container mx-auto px-6 py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl font-bold mb-6 font-['Space_Grotesk']">
              About NexTrack
            </h1>
            <p className="text-xl text-gray-300">
              Building the future of supply chain management through blockchain technology
              and innovative solutions.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        >
          <motion.div variants={fadeInUp}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1 rounded-xl">
              <div className="bg-gray-900 p-8 rounded-xl">
                <InnovationIcon />
                <h2 className="text-3xl font-bold mt-6 mb-4">Our Mission</h2>
                <p className="text-gray-400 leading-relaxed">
                  At NexTrack, we're committed to revolutionizing supply chain management
                  through blockchain technology. Our mission is to bring transparency,
                  security, and efficiency to global supply chains, making it easier for
                  businesses to track and verify their products.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1 rounded-xl">
              <div className="bg-gray-900 p-8 rounded-xl">
                <TeamIcon />
                <h2 className="text-3xl font-bold mt-6 mb-4">Our Vision</h2>
                <p className="text-gray-400 leading-relaxed">
                  We envision a future where every product's journey is transparent and
                  verifiable, where consumers can trust the authenticity of their purchases,
                  and where businesses can operate with unprecedented efficiency and trust.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Team Section */}
      <div className="container mx-auto px-6 py-24 border-t border-gray-800">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 font-['Space_Grotesk']">Our Team</h2>
            <p className="text-xl text-gray-400">
              Meet the passionate individuals behind NexTrack
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <motion.div
                key={member.name}
                variants={fadeInUp}
                className="bg-gray-800/50 rounded-xl p-8 backdrop-blur-sm border border-gray-700/50"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <TeamIcon />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                  <p className="text-blue-400 mb-4">{member.role}</p>
                  <p className="text-gray-400">{member.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Values Section */}
      <div className="container mx-auto px-6 py-24 border-t border-gray-800">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold mb-12 font-[&apos;Space_Grotesk&apos;]"
          >
            Our Values
          </motion.h2>
          <div className="space-y-8">
            <motion.div
              variants={fadeInUp}
              className="p-6 bg-gray-800/30 rounded-xl transform transition-transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold mb-2">Innovation</h3>
              <p className="text-gray-400">
                We constantly push the boundaries of what's possible in supply chain management.
              </p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="p-6 bg-gray-800/30 rounded-xl transform transition-transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold mb-2">Transparency</h3>
              <p className="text-gray-400">
                We believe in creating open and honest relationships with our users and partners.
              </p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="p-6 bg-gray-800/30 rounded-xl transform transition-transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold mb-2">Security</h3>
              <p className="text-gray-400">
                We prioritize the security and integrity of our users' data above all else.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
