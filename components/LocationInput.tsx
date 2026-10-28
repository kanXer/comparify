'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, Loader2, Building2, Search, Compass, Sparkles } from 'lucide-react';
import axios from 'axios';
import { LocationPoint } from '@/lib/types';
import { getLocalitiesForCity, getCoordinatesForLocality } from '@/lib/localitiesData';

interface SuggestionItem {
  label: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  type?: string;
  source: 'ola' | 'osm' | 'local';
  placeId?: string;
}

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: string;
  city?: string;
  localities?: string[];
  onChange: (value: string) => void;
  onSelectLocation?: (location: LocationPoint) => void;
  iconColor?: string;
}

export default function LocationInput({
  label,
  placeholder,
  value,
  city = 'Gorakhpur, Uttar Pradesh',
  localities = [],
  onChange,
  onSelectLocation,
  iconColor = 'text-blue-500',
}: LocationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [liveSuggestions, setLiveSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const simpleCity = city.split(',')[0].trim();

  // Combine default verified landmarks for instant display on focus
  const popularLocalities = React.useMemo(() => {
    const defaultList = getLocalitiesForCity(city);
    return Array.from(new Set([...defaultList, ...(localities || [])])).slice(0, 15);
  }, [city, localities]);

  // Live Ola Maps & OpenStreetMap Geocoding API bounded strictly inside the city
  useEffect(() => {
    const q = filterQuery.trim();
    if (q.length >= 2) {
      setIsLoading(true);
      const timer = setTimeout(async () => {
        try {
          const res = await axios.get(
            `/api/geocode?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`
          );
          if (res.data && Array.isArray(res.data.suggestions)) {
            setLiveSuggestions(res.data.suggestions);
          }
        } catch (err) {
          console.warn('[Geocode Live Search] Error:', err);
        } finally {
          setIsLoading(false);
        }
      }, 180); // Fast 180ms debounce

      return () => clearTimeout(timer);
    } else {
      setLiveSuggestions([]);
      setIsLoading(false);
    }
  }, [filterQuery, city]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Capture High-Accuracy Current GPS Coordinates via Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[TEST] Browser GPS Geolocation captured:', {
          latitude,
          longitude,
          accuracyMeters: accuracy,
        });

        let addressLabel = `My Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        try {
          // Reverse geocode via Ola Maps
          const res = await axios.get(`/api/geocode?lat=${latitude}&lon=${longitude}&action=reverse`);
          if (res.data?.address) {
            addressLabel = res.data.address;
          }
        } catch (e) {
          console.warn('[GPS Reverse Geocode] Error:', e);
        }

        onChange(addressLabel);
        setIsOpen(false);
        setIsLocating(false);

        if (onSelectLocation) {
          const locPoint: LocationPoint = {
            address: addressLabel,
            lat: latitude,
            lon: longitude,
            displayName: `${addressLabel}, ${city}`,
            city,
          };
          console.log('[TEST] Coordinates set from GPS:', locPoint);
          onSelectLocation(locPoint);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('[GPS Geolocation] Error:', error.message);
        alert(`Could not acquire GPS location: ${error.message}. Please check browser permissions.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSelect = async (item: {
    name: string;
    subtitle?: string;
    lat?: number;
    lon?: number;
    placeId?: string;
    source?: 'ola' | 'osm' | 'local';
  }) => {
    const cleanAddress = item.name.trim();
    onChange(cleanAddress);
    setFilterQuery('');
    setIsOpen(false);

    let finalLat = item.lat;
    let finalLon = item.lon;

    // If it is an Ola Maps item with placeId and coordinates missing, fetch exact place details
    if (item.placeId && (!finalLat || !finalLon || finalLat === 0)) {
      try {
        const detRes = await axios.get(
          `/api/geocode?action=details&place_id=${encodeURIComponent(item.placeId)}`
        );
        if (detRes.data?.details?.lat && detRes.data?.details?.lng) {
          finalLat = detRes.data.details.lat;
          finalLon = detRes.data.details.lng;
        }
      } catch (err) {
        console.warn('[LocationInput] Error fetching exact place details:', err);
      }
    }

    if (!finalLat || !finalLon || finalLat === 0) {
      const coords = getCoordinatesForLocality(cleanAddress, city);
      finalLat = coords.lat;
      finalLon = coords.lon;
    }

    console.log('[TEST] Coordinates extracted from place picker:', {
      name: cleanAddress,
      lat: finalLat,
      lon: finalLon,
      source: item.source || 'ola',
      placeId: item.placeId,
    });

    if (onSelectLocation && finalLat && finalLon) {
      const point: LocationPoint = {
        address: cleanAddress,
        lat: finalLat,
        lon: finalLon,
        displayName: item.subtitle
          ? `${cleanAddress}, ${item.subtitle}`
          : `${cleanAddress}, ${simpleCity}, India`,
        city,
      };
      onSelectLocation(point);
    }
  };

  return (
    <div className="relative z-30 w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          in {simpleCity}
        </span>
      </div>

      <div className="relative flex items-center">
        <div className={`absolute left-3.5 flex items-center pointer-events-none ${iconColor}`}>
          <MapPin className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilterQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setFilterQuery('');
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3.5 rounded-xl glass-input text-sm font-medium placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 transition duration-150"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {isLocating && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
          {!isLocating && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUseCurrentLocation();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              title="Use high-accuracy GPS current location"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setFilterQuery('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              title="Clear location"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1.5 py-2 rounded-2xl glass-panel shadow-2xl border border-black/10 dark:border-white/10 max-h-84 overflow-hidden flex flex-col">
          {/* Header & Status */}
          <div className="px-3.5 py-2 text-[11px] font-bold text-slate-500 dark:text-gray-400 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-slate-50/60 dark:bg-gray-900/60">
            <span className="flex items-center gap-1.5">
              {filterQuery.trim().length >= 2 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>
                    {liveSuggestions.some((s) => s.source === 'ola') ? 'Ola Maps Search' : 'Live Search'} &bull; {simpleCity}
                  </span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Popular Landmarks in {simpleCity}</span>
                </>
              )}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              {filterQuery.trim().length >= 2
                ? `${liveSuggestions.length} found`
                : `${popularLocalities.length} spots`}
            </span>
          </div>

          {/* High-Accuracy GPS Sensor Option */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full text-left px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-xs flex items-center gap-3 transition border-b border-black/5 dark:border-white/5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="truncate flex-1">
              <span className="font-bold block text-emerald-700 dark:text-emerald-300">
                {isLocating ? 'Acquiring high-accuracy GPS coordinates...' : 'Use My Current Location (GPS)'}
              </span>
              <span className="text-emerald-600/80 dark:text-emerald-400/70 text-[10px] block">
                Extracts exact device sensor latitude &amp; longitude
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
              GPS Exact
            </span>
          </button>

          {/* Scrollable Results List */}
          <div className="overflow-y-auto flex-1 max-h-72 divide-y divide-black/5 dark:divide-white/5">
            {/* 1. Live Ola & OSM Results when user is typing */}
            {filterQuery.trim().length >= 2 &&
              liveSuggestions.map((item, index) => {
                const isOla = item.source === 'ola';
                return (
                  <button
                    key={`sug-${index}-${item.lat}-${item.lon}`}
                    type="button"
                    onClick={() =>
                      handleSelect({
                        name: item.name,
                        subtitle: item.subtitle,
                        lat: item.lat,
                        lon: item.lon,
                        placeId: item.placeId,
                        source: item.source,
                      })
                    }
                    className={`w-full text-left px-4 py-2.5 ${
                      isOla
                        ? 'hover:bg-emerald-50 dark:hover:bg-emerald-600/15'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-600/20'
                    } text-xs flex items-center gap-3 transition group`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${
                        isOla
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      } flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-slate-900 dark:text-gray-100 ${
                            isOla
                              ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                              : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          } truncate`}
                        >
                          {item.name}
                        </span>
                        {item.source === 'ola' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30 shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ola Maps
                          </span>
                        ) : item.source === 'osm' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 shrink-0">
                            OSM Live
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20 shrink-0">
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 dark:text-gray-400 text-[10px] block truncate mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}

            {/* 2. Popular verified landmarks when input is empty or query is short */}
            {filterQuery.trim().length < 2 &&
              popularLocalities.map((loc, index) => (
                <button
                  key={`popular-${loc}-${index}`}
                  type="button"
                  onClick={() => {
                    const coords = getCoordinatesForLocality(loc, city);
                    handleSelect({
                      name: loc,
                      subtitle: `${simpleCity}, Uttar Pradesh`,
                      lat: coords.lat,
                      lon: coords.lon,
                    });
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-xs flex items-center gap-3 transition group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-gray-800 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-semibold block text-slate-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {loc}
                    </span>
                    <span className="text-slate-400 dark:text-gray-400 text-[10px] block mt-0.5">
                      {simpleCity}, Uttar Pradesh &bull; Verified
                    </span>
                  </div>
                </button>
              ))}

            {/* Empty state while searching */}
            {filterQuery.trim().length >= 2 && liveSuggestions.length === 0 && !isLoading && (
              <div className="p-4 text-center text-xs text-slate-400">
                No mohalla or landmark found for &quot;{filterQuery}&quot; in {simpleCity}.
                <br />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Tip: Check spelling or tap on the map to pinpoint exact street.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
