'use client';

import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between py-16 lg:py-24 gap-12">
          {/* Left Column - Content */}
          <div className="flex-1 max-w-2xl">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Next Gen{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600 text-transparent bg-clip-text">
                Supply Chain
              </span>
              <br />
              Tracking
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Revolutionizing supply chain management with blockchain technology.
              Transparent, secure, and efficient tracking for the modern world.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link 
                href="/app" 
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                Launch App
              </Link>
              <Link 
                href="/app/marketplace" 
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-gray-800/20"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="flex-1 relative w-full max-w-2xl">
            <div className="relative w-full h-[400px] overflow-hidden">
              {/* Abstract geometric shapes */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-3xl">
                <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/20 rounded-2xl rotate-45 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 rounded-3xl rotate-12 animate-pulse"></div>
                {/* Hexagon grid pattern */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0.2' fill='%234A90E2' stroke='%234A90E2' stroke-width='0.5'/%3E%3C/svg%3E")`,
                  backgroundSize: '60px 60px'
                }}></div>
                {/* Floating dots */}
                <div className="absolute inset-0">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full animate-float"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: 0.4
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-16">
          <div className="p-6 bg-gray-800/30 rounded-xl">
            <div className="text-3xl font-bold text-blue-400 mb-2">100+</div>
            <div className="text-gray-400">Active Users</div>
          </div>
          <div className="p-6 bg-gray-800/30 rounded-xl">
            <div className="text-3xl font-bold text-blue-400 mb-2">50K+</div>
            <div className="text-gray-400">Transactions</div>
          </div>
          <div className="p-6 bg-gray-800/30 rounded-xl">
            <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
            <div className="text-gray-400">Uptime</div>
          </div>
          <div className="p-6 bg-gray-800/30 rounded-xl">
            <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
            <div className="text-gray-400">Support</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">Why Choose NexTrack?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Blockchain Security */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="w-12 h-12 mb-4 text-blue-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2 text-blue-400 group-hover:text-blue-300">Blockchain Security</h3>
              <p className="text-gray-400">Immutable records and cryptographic security ensure your supply chain data remains tamper-proof.</p>
            </div>
          </div>

          {/* Real-time Tracking */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="w-12 h-12 mb-4 text-blue-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path fillRule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h13.19l-5.47-5.47a.75.75 0 011.06-1.06l6.75 6.75a.75.75 0 010 1.06l-6.75 6.75a.75.75 0 11-1.06-1.06l5.47-5.47H4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2 text-blue-400 group-hover:text-blue-300">Real-time Tracking</h3>
              <p className="text-gray-400">Monitor your products in real-time with instant updates and comprehensive tracking information.</p>
            </div>
          </div>

          {/* Smart Contracts */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="w-12 h-12 mb-4 text-blue-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875c0-2.9-2.35-5.25-5.25-5.25zm-9 8.625c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
                  <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
                  <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2 text-blue-400 group-hover:text-blue-300">Smart Contracts</h3>
              <p className="text-gray-400">Automate and enforce supply chain agreements with smart contracts for enhanced efficiency.</p>
            </div>
          </div>

          {/* Decentralized Trust */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="w-12 h-12 mb-4 text-blue-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2 text-blue-400 group-hover:text-blue-300">Decentralized Trust</h3>
              <p className="text-gray-400">Build trust through transparency. Every transaction and transfer is verified and recorded on the blockchain.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
