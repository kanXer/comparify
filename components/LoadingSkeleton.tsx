'use client';

import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Route bar skeleton */}
      <div className="h-24 rounded-2xl bg-gray-900/60 border border-white/5" />

      {/* Grid skeletons */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 border border-white/5">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div className="h-6 w-36 bg-gray-800 rounded-md" />
              <div className="h-6 w-28 bg-gray-800 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="h-44 bg-gray-800/40 rounded-xl" />
              <div className="h-44 bg-gray-800/40 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
