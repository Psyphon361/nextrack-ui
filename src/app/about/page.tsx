'use client';

import { motion } from 'framer-motion';
import { TeamIcon, InnovationIcon } from '@/components/icons';
import Navigation from '@/components/Navigation';

const teamMembers = [
  {
    name: 'The Development Team',
    role: 'Core Engineers',
    description: 'Our team of blockchain experts and full-stack developers work tirelessly to build and maintain NexTrack\'s cutting-edge platform.',
    color: 'from-blue-600 to-indigo-600'
  },
  {
    name: 'The Design Team',
    role: 'UX/UI Specialists',
    description: 'Creating intuitive and beautiful interfaces that make complex blockchain operations simple and accessible.',
    color: 'from-green-600 to-emerald-600'
  },
  {
    name: 'The Support Team',
    role: 'Customer Success',
    description: 'Dedicated to helping our users get the most out of NexTrack with 24/7 support and guidance.',
    color: 'from-purple-600 to-pink-600'
  }
];

const values = [
  {
    title: 'Innovation',
    description: 'We constantly push the boundaries of what\'s possible in supply chain management.',
    color: 'from-blue-600 to-indigo-600'
  },
  {
    title: 'Transparency',
    description: 'We believe in creating open and honest relationships with our users and partners.',
    color: 'from-green-600 to-emerald-600'
  },
  {
    title: 'Security',
    description: 'We prioritize the security and integrity of our users\' data above all else.',
    color: 'from-purple-600 to-pink-600'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50" />
        <div className="container mx-auto px-6 py-20">
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

      {/* Mission & Vision Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[
            {
              title: 'Our Mission',
              description: 'At NexTrack, we\'re committed to revolutionizing supply chain management through blockchain technology. Our mission is to bring transparency, security, and efficiency to global supply chains.',
              icon: InnovationIcon,
              color: 'from-blue-600 to-indigo-600'
            },
            {
              title: 'Our Vision',
              description: 'We envision a future where every product\'s journey is transparent and verifiable, where consumers can trust the authenticity of their purchases, and where businesses can operate with unprecedented efficiency.',
              icon: TeamIcon,
              color: 'from-purple-600 to-pink-600'
            }
          ].map((item, index) => (
            <div
              key={item.title}
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
                  <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${item.color} mb-6 self-start group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed flex-grow group-hover:text-gray-200 transition-colors duration-300">{item.description}</p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className="container mx-auto px-6 pt-6">
        <div className="container mx-auto px-6">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-4xl font-bold mb-16 text-center font-['Space_Grotesk']"
          >
            Our Team
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div 
                key={member.name} 
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
                    <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${member.color} mb-6 self-start group-hover:scale-110 transition-transform duration-300`}>
                      <TeamIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">{member.name}</h3>
                    <p className="text-blue-400 mb-4">{member.role}</p>
                    <p className="text-gray-400 leading-relaxed flex-grow group-hover:text-gray-200 transition-colors duration-300">{member.description}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="container mx-auto px-6 pt-24 pb-8">
        <div className="container mx-auto px-6">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-4xl font-bold mb-16 text-center font-['Space_Grotesk']"
          >
            Our Values
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div 
                key={value.title} 
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
                    <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${value.color} mb-6 self-start group-hover:scale-110 transition-transform duration-300`}>
                      <InnovationIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">{value.title}</h3>
                    <p className="text-gray-400 leading-relaxed flex-grow group-hover:text-gray-200 transition-colors duration-300">{value.description}</p>
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
