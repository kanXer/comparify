'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Preset {
  title: string;
  pickup: string;
  drop: string;
}

const CITY_PRESETS: Record<string, Preset[]> = {
  gorakhpur: [
    {
      title: 'Gorakhnath Temple → Nauka Vihar 2.0',
      pickup: 'Gorakhnath Temple',
      drop: 'Nauka Vihar 2.0',
    },
    {
      title: 'Betiahata → Fertilizer Colony',
      pickup: 'Betiahata',
      drop: 'Fertilizer Colony',
    },
    {
      title: 'Basharatpur → Mohaddipur',
      pickup: 'Basharatpur',
      drop: 'Mohaddipur',
    },
    {
      title: 'Ashok Nagar → Azad Nagar',
      pickup: 'Ashok Nagar',
      drop: 'Azad Nagar',
    },
  ],
  lucknow: [
    {
      title: 'Charbagh Station → Alambagh',
      pickup: 'Charbagh Railway Station (lko)',
      drop: 'Alambagh',
    },
    {
      title: 'Hazratganj → Gomti Nagar',
      pickup: 'Hazratganj',
      drop: 'Gomti Nagar',
    },
  ],
  delhi: [
    {
      title: 'Delhi Airport → Connaught Place',
      pickup: 'Delhi Airport',
      drop: 'Connaught Place',
    },
    {
      title: 'Cyber Hub → Noida Sector 18',
      pickup: 'Cyber Hub',
      drop: 'Noida Sector 18',
    },
  ],
};

interface QuickPresetChipsProps {
  city: string;
  onSelect: (pickup: string, drop: string) => void;
}

export default function QuickPresetChips({ city, onSelect }: QuickPresetChipsProps) {
  const cityKey = city.split(',')[0].trim().toLowerCase();
  const presets = CITY_PRESETS[cityKey] || CITY_PRESETS['gorakhpur'];

  return (
    <div className="flex flex-col gap-2 my-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
        <span className="font-medium">Popular Routes in {city.split(',')[0]}:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((route, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(route.pickup, route.drop)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-900/60 dark:hover:bg-gray-800 text-xs text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/5 transition group"
          >
            <span className="font-semibold text-slate-800 dark:text-gray-200 group-hover:text-blue-600">
              {route.pickup}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
            <span className="text-slate-600 dark:text-gray-300">{route.drop}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
