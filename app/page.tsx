'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Search,
  Zap,
  TrendingDown,
  AlertCircle,
  ShieldCheck,
  Bike,
  Car,
  Layers,
  ExternalLink,
  CheckCircle2,
  BarChart3,
  LayoutGrid,
  Sun,
  Moon,
  FileSpreadsheet,
  Download,
  Table,
} from 'lucide-react';

import LocationInput from '@/components/LocationInput';
import CityDistrictSelector from '@/components/CityDistrictSelector';
import QuickPresetChips from '@/components/QuickPresetChips';
import RouteSummaryBar from '@/components/RouteSummaryBar';
import StandardFareTable from '@/components/StandardFareTable';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { exportComparisonToExcel } from '@/lib/clientExport';
import { getCoordinatesForLocality } from '@/lib/localitiesData';

import {
  FareComparisonResponse,
  LocationPoint,
  VehicleCategory,
} from '@/lib/types';

// Lazy-load secondary views to keep initial load lightweight & fast
const FareComparisonChart = dynamic(() => import('@/components/FareComparisonChart'), {
  loading: () => <LoadingSkeleton />,
});
const ComparisonCard = dynamic(() => import('@/components/ComparisonCard'), {
  loading: () => <LoadingSkeleton />,
});

// Dynamic import for OpenFreeMap MapLibre GL to keep serverless cold-start tiny and avoid SSR window issues
const OpenFreeMapRide = dynamic(() => import('@/components/OpenFreeMapRide'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] min-h-[420px] rounded-3xl bg-slate-100 dark:bg-gray-900/60 border border-slate-200 dark:border-white/10 animate-pulse flex items-center justify-center text-xs text-slate-400">
      Loading interactive MapLibre Street map...
    </div>
  ),
});

export default function HomePage() {
  // Theme state: Default to Light mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [selectedCity, setSelectedCity] = useState('Gorakhpur, Uttar Pradesh');
  const [cityLocalities, setCityLocalities] = useState<string[]>([]);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupLocationPoint, setPickupLocationPoint] = useState<LocationPoint | undefined>();
  const [dropLocationPoint, setDropLocationPoint] = useState<LocationPoint | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<FareComparisonResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'cards'>('chart');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | VehicleCategory>('all');
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);

  // Toggle Dark / Light mode
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Ensure default theme class on document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Preload verified city localities immediately when city changes for 0ms instant suggestion dropdown
  useEffect(() => {
    const loadLocalities = async () => {
      try {
        const res = await axios.get(`/api/localities?city=${encodeURIComponent(selectedCity)}`);
        if (res.data && Array.isArray(res.data.localities)) {
          setCityLocalities(res.data.localities);
        }
      } catch {
        // fallback
      }
    };
    loadLocalities();
  }, [selectedCity]);

  // When city changes, reset pickup and drop to blank
  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    setPickup('');
    setDrop('');
    setPickupLocationPoint(undefined);
    setDropLocationPoint(undefined);
    setComparisonData(null);
    setErrorMessage(null);
  };

  const handleSwap = () => {
    const tempPickup = pickup;
    const tempPickupPoint = pickupLocationPoint;
    setPickup(drop);
    setPickupLocationPoint(dropLocationPoint);
    setDrop(tempPickup);
    setDropLocationPoint(tempPickupPoint);
  };

  const handlePresetSelect = (p: string, d: string) => {
    setPickup(p);
    setDrop(d);
    const pCoords = getCoordinatesForLocality(p, selectedCity);
    const dCoords = getCoordinatesForLocality(d, selectedCity);
    const pPoint: LocationPoint = {
      address: p,
      lat: pCoords.lat,
      lon: pCoords.lon,
      city: selectedCity,
      displayName: `${p}, ${selectedCity}`,
    };
    const dPoint: LocationPoint = {
      address: d,
      lat: dCoords.lat,
      lon: dCoords.lon,
      city: selectedCity,
      displayName: `${d}, ${selectedCity}`,
    };
    setPickupLocationPoint(pPoint);
    setDropLocationPoint(dPoint);
    fetchComparison(p, d, selectedCity, pPoint, dPoint);
  };

  const handleMapPickupSelect = (point: LocationPoint) => {
    setPickup(point.address);
    setPickupLocationPoint(point);
  };

  const handleMapDropSelect = (point: LocationPoint) => {
    setDrop(point.address);
    setDropLocationPoint(point);
  };

  const fetchComparison = async (
    pVal = pickup,
    dVal = drop,
    cityVal = selectedCity,
    overridePickupPoint?: LocationPoint,
    overrideDropPoint?: LocationPoint
  ) => {
    if (!pVal.trim() || !dVal.trim()) {
      setErrorMessage(`Please enter both pickup and destination locations in ${cityVal.split(',')[0]}.`);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Resolve exact coordinates from points or verified database
      let pPoint = overridePickupPoint || pickupLocationPoint;
      let dPoint = overrideDropPoint || dropLocationPoint;

      if (!pPoint || !pPoint.lat || !pPoint.lon || pPoint.lat === 0) {
        const c = getCoordinatesForLocality(pVal.trim(), cityVal);
        if (c && c.lat && c.lon) {
          pPoint = {
            address: pVal.trim(),
            lat: c.lat,
            lon: c.lon,
            city: cityVal,
            displayName: `${pVal.trim()}, ${cityVal}`,
          };
          setPickupLocationPoint(pPoint);
        }
      }

      if (!dPoint || !dPoint.lat || !dPoint.lon || dPoint.lat === 0) {
        const c = getCoordinatesForLocality(dVal.trim(), cityVal);
        if (c && c.lat && c.lon) {
          dPoint = {
            address: dVal.trim(),
            lat: c.lat,
            lon: c.lon,
            city: cityVal,
            displayName: `${dVal.trim()}, ${cityVal}`,
          };
          setDropLocationPoint(dPoint);
        }
      }

      const pLat = pPoint?.lat;
      const pLng = pPoint?.lon;
      const dLat = dPoint?.lat;
      const dLng = dPoint?.lon;

      const payload = {
        city: cityVal,
        pickup: pVal.trim(),
        drop: dVal.trim(),
        pickup_lat: pLat,
        pickup_lng: pLng,
        drop_lat: dLat,
        drop_lng: dLng,
      };

      console.log('[TEST] Coordinates:', {
        pickup: { address: pVal.trim(), lat: pLat, lng: pLng },
        drop: { address: dVal.trim(), lat: dLat, lng: dLng },
        distance: undefined,
      });

      const response = await axios.post<FareComparisonResponse>('/api/compare', payload);
      if (response.data.success) {
        setComparisonData(response.data);
        if (response.data.pickup) {
          setPickupLocationPoint(response.data.pickup);
        }
        if (response.data.drop) {
          setDropLocationPoint(response.data.drop);
        }
        console.log('[TEST] Coordinates:', {
          pickup: response.data.pickup,
          drop: response.data.drop,
          distance: response.data.route?.distanceKm,
        });
      } else {
        setErrorMessage('Failed to fetch real-time fare comparison. Please verify locations.');
      }
    } catch (err: any) {
      const serverDetails = err.response?.data?.details;
      const serverError = err.response?.data?.error;
      const msg = serverDetails
        ? `${serverError} (${serverDetails})`
        : serverError || err.message || 'Failed to connect to real-time fare engine. Please retry.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };


  const categories: VehicleCategory[] = ['bike', 'auto', 'cab', 'cab_premium', 'cab_xl'];
  const filteredCategories =
    selectedCategoryFilter === 'all'
      ? categories
      : categories.filter((c) => c === selectedCategoryFilter);

  const citySlug = selectedCity.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-lg">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Camparify
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Real Data
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Rapido (Left) vs Bharat Taxi (Right) &bull; OpenFreeMap Enabled
            </p>
          </div>
        </div>

        {/* Right Header Controls: Dark Mode Toggle & Official Link */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition shadow-sm"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            )}
          </button>

          <a
            href="https://bharattaxiapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/20 transition"
            title="Bharat Taxi Cooperative (bharattaxiapp.com)"
          >
            <span>bharattaxiapp.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Glass Search Form */}
      <div className="glass-panel rounded-3xl p-5 sm:p-7 border shadow-xl relative z-30 overflow-visible mb-6">
        {/* Step 1: City / District Selection FIRST */}
        <div className="pb-4 mb-4 border-b border-black/5 dark:border-white/10">
          <CityDistrictSelector
            selectedCity={selectedCity}
            onSelectCity={handleCityChange}
          />
        </div>

        {/* Step 2: Pickup and Drop within that city with 0ms instant suggestion */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-end">
          <LocationInput
            label="Pickup Location"
            placeholder={`Select pickup in ${selectedCity.split(',')[0]}...`}
            value={pickup}
            city={selectedCity}
            localities={cityLocalities}
            onChange={(val) => {
              setPickup(val);
              if (!val.trim()) {
                setPickupLocationPoint(undefined);
              } else {
                const coords = getCoordinatesForLocality(val, selectedCity);
                if (coords && coords.lat && coords.lon) {
                  setPickupLocationPoint({
                    address: val,
                    lat: coords.lat,
                    lon: coords.lon,
                    city: selectedCity,
                    displayName: `${val}, ${selectedCity}`,
                  });
                }
              }
            }}
            onSelectLocation={(loc) => {
              console.log('[TEST] Coordinates selected for Pickup:', loc);
              setPickupLocationPoint(loc);
            }}
            iconColor="text-blue-500"
          />

          <div className="flex justify-center md:pb-2">
            <button
              type="button"
              onClick={handleSwap}
              className="p-3 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:text-white border border-slate-200 dark:border-white/10 transition shadow-sm hover:rotate-180 duration-300"
              title="Swap pickup and destination"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <LocationInput
            label="Destination Drop"
            placeholder={`Select drop in ${selectedCity.split(',')[0]}...`}
            value={drop}
            city={selectedCity}
            localities={cityLocalities}
            onChange={(val) => {
              setDrop(val);
              if (!val.trim()) {
                setDropLocationPoint(undefined);
              } else {
                const coords = getCoordinatesForLocality(val, selectedCity);
                if (coords && coords.lat && coords.lon) {
                  setDropLocationPoint({
                    address: val,
                    lat: coords.lat,
                    lon: coords.lon,
                    city: selectedCity,
                    displayName: `${val}, ${selectedCity}`,
                  });
                }
              }
            }}
            onSelectLocation={(loc) => {
              console.log('[TEST] Coordinates selected for Drop:', loc);
              setDropLocationPoint(loc);
            }}
            iconColor="text-rose-500"
          />
        </div>

        {/* Quick City Commute Presets */}
        <QuickPresetChips
          city={selectedCity}
          onSelect={handlePresetSelect}
        />

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Locations verified inside {selectedCity.split(',')[0]} ({cityLocalities.length} localities loaded)</span>
          </div>

          <button
            type="button"
            onClick={() => fetchComparison()}
            disabled={isLoading}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Comparing Live {selectedCity.split(',')[0]} Rates...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Compare Fares</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* OpenFreeMap Interactive Vector Map with Collapse Support */}
      <OpenFreeMapRide
        city={selectedCity}
        theme={theme}
        pickupPoint={pickupLocationPoint}
        dropPoint={dropLocationPoint}
        isCollapsed={isMapCollapsed}
        onToggleCollapse={setIsMapCollapsed}
        onSetPickup={handleMapPickupSelect}
        onSetDrop={handleMapDropSelect}
      />

      {/* Error Banner */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-xs sm:text-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block">Notice</strong>
            <span>{errorMessage}</span>
          </div>
        </motion.div>
      )}

      {/* Loading Skeletons */}
      {isLoading && <LoadingSkeleton />}

      {/* Comparison Results */}
      {!isLoading && comparisonData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Live Scraped Rate Banner with Excel Export Action */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Live Co-op Rates Verified:</strong> Sourced from{' '}
                <a
                  href="https://bharattaxiapp.com/products"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-emerald-950 dark:hover:text-white"
                >
                  bharattaxiapp.com
                </a>{' '}
                &bull; Sahakar Taxi Co-op &bull; 0% Commission &bull; Zero Surge
              </span>
            </div>

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={() => exportComparisonToExcel(comparisonData)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel Report (.xlsx)</span>
              <Download className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {/* Route Summary Bar */}
          <RouteSummaryBar
            route={comparisonData.route}
            pickup={comparisonData.pickup}
            drop={comparisonData.drop}
          />

          {/* View Mode Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>Side-by-Side Fare Comparison</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  {selectedCity.split(',')[0]}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Left: <strong>Rapido (₹)</strong> &bull; Center: <strong>Vehicle & Difference Chart</strong> &bull; Right: <strong>Bharat Taxi (₹)</strong>
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'chart'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Chart View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Standard Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards View
              </button>
            </div>
          </div>

          {/* 1. PEHLE: CHART VIEW, PHIR: STANDARDIZED 8-COLUMN TABLE */}
          {viewMode === 'chart' && (
            <div className="space-y-6">
              <FareComparisonChart comparisonData={comparisonData} />
              <StandardFareTable comparisonData={comparisonData} />
            </div>
          )}

          {/* 2. STANDARDIZED TABLE ONLY */}
          {viewMode === 'table' && (
            <StandardFareTable comparisonData={comparisonData} />
          )}

          {/* 3. CARDS VIEW */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {filteredCategories.map((cat) => {
                const comp = comparisonData.comparisonsByCategory[cat];
                if (!comp) return null;
                return <ComparisonCard key={cat} comparison={comp} />;
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-black/5 dark:border-white/5 text-center text-xs text-slate-500 dark:text-gray-500">
        <p>
          <strong>Camparify</strong> &bull; Real-Time Ride Fare Comparison &bull; Ola Maps &bull; Rapido &bull; bharattaxiapp.com
        </p>
      </footer>
    </main>
  );
}
