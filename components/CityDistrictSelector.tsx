'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Search } from 'lucide-react';
import axios from 'axios';

interface CityDistrictSelectorProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

const FEATURED_CITIES = [
  'Gorakhpur, Uttar Pradesh',
  'Lucknow, Uttar Pradesh',
  'Delhi, India',
  'Varanasi, Uttar Pradesh',
  'Kanpur, Uttar Pradesh',
  'Prayagraj, Uttar Pradesh',
  'Bengaluru, Karnataka',
  'Mumbai, Maharashtra',
];

export default function CityDistrictSelector({
  selectedCity,
  onSelectCity,
}: CityDistrictSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [citiesList, setCitiesList] = useState<string[]>(FEATURED_CITIES);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCities = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/cities?q=${encodeURIComponent(searchQuery)}`);
        if (res.data && Array.isArray(res.data.cities)) {
          setCitiesList(res.data.cities);
        }
      } catch {
        // fallback to featured
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchCities, searchQuery ? 200 : 0);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    onSelectCity(city);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>Step 1: Select City / District</span>
        </label>
        <span className="text-[11px] text-slate-500 dark:text-gray-400">
          Locations and rates will be locked to this district
        </span>
      </div>

      {/* Main Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 px-4 rounded-xl glass-input flex items-center justify-between border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5 transition text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
            📍
          </div>
          <div>
            <span className="text-sm font-bold block">
              {selectedCity}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gray-400 block">
              Live Bharat Taxi Rates: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold hidden sm:inline">Change City</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Quick City Pills */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
        <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium shrink-0 flex items-center gap-1">
          Popular:
        </span>
        {FEATURED_CITIES.slice(0, 5).map((city) => {
          const shortName = city.split(',')[0].trim();
          const isSelected = selectedCity.includes(shortName);
          return (
            <button
              key={city}
              type="button"
              onClick={() => handleSelect(city)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                isSelected
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800/60 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 border border-black/5 dark:border-white/5'
              }`}
            >
              {shortName}
            </button>
          );
        })}
      </div>

      {/* City Dropdown Modal / Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 p-3 rounded-2xl glass-panel shadow-2xl border border-black/10 dark:border-white/10 max-h-80 flex flex-col">
          {/* Search box */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 5,000+ Indian cities / districts..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 space-y-1">
            {isLoading && (
              <div className="p-3 text-center text-xs text-slate-400">Loading cities...</div>
            )}
            {!isLoading && citiesList.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">No matching district found.</div>
            )}
            {!isLoading &&
              citiesList.map((city) => {
                const isSelected = selectedCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{city}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
