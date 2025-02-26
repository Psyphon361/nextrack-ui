export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="h-16 bg-gray-800/50" /> {/* Navigation placeholder */}
      <main className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          {/* Back button placeholder */}
          <div className="w-24 h-8 bg-gray-800/50 rounded-lg mb-6" />
          
          {/* Title and image placeholder */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="w-3/4 h-8 bg-gray-800/50 rounded mb-4" /> {/* Title */}
              <div className="w-full h-20 bg-gray-800/50 rounded mb-4" /> {/* Description */}
              <div className="space-y-4">
                <div className="w-1/2 h-6 bg-gray-800/50 rounded" />
                <div className="w-1/3 h-6 bg-gray-800/50 rounded" />
                <div className="w-2/3 h-6 bg-gray-800/50 rounded" />
              </div>
            </div>
            <div className="w-full aspect-square bg-gray-800/50 rounded-lg" /> {/* Image placeholder */}
          </div>
        </div>
      </main>
    </div>
  );
}
