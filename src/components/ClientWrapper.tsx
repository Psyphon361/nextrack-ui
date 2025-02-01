'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import Navigation from './Navigation';

interface ClientWrapperProps {
  children: ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Toaster />
        {children}
      </main>
    </div>
  );
}
