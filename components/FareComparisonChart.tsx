'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bike,
  Car,
  Clock,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { FareComparisonResponse, VehicleCategory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface FareComparisonChartProps {
  comparisonData: FareComparisonResponse;
}

export default function FareComparisonChart({ comparisonData }: FareComparisonChartProps) {
  const { comparisonsByCategory, city } = comparisonData;
  const categories: VehicleCategory[] = ['bike', 'auto', 'cab', 'cab_premium', 'cab_xl'];

  const getVehicleMeta = (cat: VehicleCategory) => {
    switch (cat) {
      case 'bike':
        return {
          title: 'Motorcycle',
          icon: <Bike className="w-5 h-5 text-amber-500" />,
          subtitle: 'Best for 1 person & quick traffic bypass',
        };
      case 'auto':
        return {
          title: 'Auto (3-Wheeler)',
          icon: <span className="text-xl">🛺</span>,
          subtitle: 'Direct doorstep pickup, no meter hassle',
        };
      case 'cab':
        return {
          title: 'Cab Eco (Hatchback)',
          icon: <Car className="w-5 h-5 text-blue-500" />,
          subtitle: 'Affordable AC hatchback for up to 4 people',
        };
      case 'cab_premium':
        return {
          title: 'Cab Premium (Sedan)',
          icon: <Car className="w-5 h-5 text-emerald-500" />,
          subtitle: 'Spacious AC sedan with large boot space',
        };
      case 'cab_xl':
        return {
          title: 'Cab XL (6-Seater SUV)',
          icon: <Car className="w-5 h-5 text-indigo-500" />,
          subtitle: 'Spacious 6-7 seater SUV (Innova / Ertiga)',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Chart Column Header */}
      <div className="glass-panel rounded-2xl p-4 hidden md:grid md:grid-cols-[1fr,1.2fr,1fr] items-center gap-4 text-center">
        {/* Left Column Header: Rapido */}
        <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-xl">⚡</span>
          <div className="text-left">
            <span className="font-extrabold text-sm tracking-wide block">RAPIDO</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">rapido.bike</span>
          </div>
        </div>

        {/* Center: Vehicle & Difference */}
        <div className="text-xs text-slate-500 dark:text-gray-400 font-semibold">
          VEHICLE COMPARISON &amp; SAVINGS
        </div>

        {/* Right Column Header: Bharat Taxi */}
        <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-xl">🚕</span>
          <div className="text-left">
            <span className="font-extrabold text-sm tracking-wide block">BHARAT TAXI</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">bharattaxiapp.com</span>
          </div>
        </div>
      </div>

      {/* Rows for Each Vehicle */}
      <div className="space-y-3.5">
        {categories.map((cat, index) => {
          const comp = comparisonsByCategory[cat];
          if (!comp || (!comp.rapidoOption && !comp.bharatTaxiOption)) return null;

          const { rapidoOption, bharatTaxiOption, cheapestProvider, priceDifference, savingsPercentage } =
            comp;
          const meta = getVehicleMeta(cat);

          const rapidoPrice = rapidoOption ? rapidoOption.price : 0;
          const bharatPrice = bharatTaxiOption ? bharatTaxiOption.price : 0;
          const maxPrice = Math.max(rapidoPrice, bharatPrice);

          const rapidoBarWidth = rapidoOption && maxPrice > 0 ? Math.round((rapidoPrice / maxPrice) * 100) : 0;
          const bharatBarWidth = bharatTaxiOption && maxPrice > 0 ? Math.round((bharatPrice / maxPrice) * 100) : 0;

          const isBharatCheaper = cheapestProvider === 'bharat_taxi';
          const isRapidoCheaper = cheapestProvider === 'rapido';

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel rounded-2xl p-4 sm:p-5 transition-all duration-200"
            >
              {/* Desktop 3-Column Chart Layout */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1.3fr,1fr] gap-4 items-center">
                {/* 1. LEFT SIDE: RAPIDO */}
                {rapidoOption ? (
                  <div
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isRapidoCheaper
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-50/80 dark:bg-gray-900/60 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span>⚡</span> Rapido
                      </span>
                      {isRapidoCheaper && bharatTaxiOption && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Cheapest
                        </span>
                      )}
                    </div>

                    <div className="my-1">
                      <span className="text-2xl sm:text-3xl font-black tracking-tight">
                        {formatCurrency(rapidoPrice)}
                      </span>
                      {!isRapidoCheaper && priceDifference > 0 && bharatTaxiOption && (
                        <span className="text-[11px] text-rose-500 block font-medium">
                          +{formatCurrency(priceDifference)} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 pt-2 border-t border-slate-200/60 dark:border-white/5 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {rapidoOption.etaMinutes} mins ETA
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          alert(`Redirecting to Rapido for ${rapidoOption.vehicleName} (${formatCurrency(rapidoPrice)})`)
                        }
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition ${
                          isRapidoCheaper
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-gray-800 text-slate-800 dark:text-gray-200 hover:bg-slate-300'
                        }`}
                      >
                        Book Rapido
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-gray-900/30 text-center flex flex-col justify-center items-center py-7 text-slate-400">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 block">
                      Not Offered
                    </span>
                    <span className="text-[10px] mt-0.5 block text-slate-400">
                      Not currently offered on this route
                    </span>
                  </div>
                )}

                {/* 2. CENTER: VEHICLE NAME & VISUAL COMPARISON BAR */}
                <div className="flex flex-col items-center justify-center px-2 py-1 text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                      {meta.icon}
                    </div>
                    <div className="text-left">
                      <span className="font-extrabold text-sm sm:text-base block">
                        {meta.title}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 block line-clamp-1">
                        {meta.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Savings Pill in Center */}
                  {rapidoOption && bharatTaxiOption ? (
                    priceDifference > 0 ? (
                      <div className="my-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>
                          Save {formatCurrency(priceDifference)} on{' '}
                          {isBharatCheaper ? 'Bharat Taxi' : 'Rapido'} ({savingsPercentage}% OFF)
                        </span>
                      </div>
                    ) : (
                      <div className="my-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-xs font-medium">
                        Both same price
                      </div>
                    )
                  ) : rapidoOption && !bharatTaxiOption ? (
                    <div className="my-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                      Available exclusively on Rapido
                    </div>
                  ) : (
                    <div className="my-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-medium">
                      Available exclusively on Bharat Taxi
                    </div>
                  )}

                  {/* Visual Chart Comparison Bar */}
                  {(rapidoOption || bharatTaxiOption) && (
                    <div className="w-full space-y-1.5 mt-1 bg-slate-100/70 dark:bg-gray-950/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                      {/* Rapido Bar */}
                      {rapidoOption && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="w-12 text-left font-semibold text-amber-600 dark:text-amber-400">Rapido</span>
                          <div className="flex-1 h-3 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${rapidoBarWidth}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                isRapidoCheaper ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <span className="w-12 text-right font-bold">
                            {formatCurrency(rapidoPrice)}
                          </span>
                        </div>
                      )}

                      {/* Bharat Taxi Bar */}
                      {bharatTaxiOption && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="w-12 text-left font-semibold text-blue-600 dark:text-blue-400">Bharat</span>
                          <div className="flex-1 h-3 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${bharatBarWidth}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                isBharatCheaper ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                          <span className="w-12 text-right font-bold">
                            {formatCurrency(bharatPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. RIGHT SIDE: BHARAT TAXI */}
                {bharatTaxiOption ? (
                  <div
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isBharatCheaper
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-50/80 dark:bg-gray-900/60 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <span>🚕</span> Bharat Taxi
                      </span>
                      {isBharatCheaper && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Cheapest
                        </span>
                      )}
                    </div>

                    <div className="my-1">
                      <span className="text-2xl sm:text-3xl font-black tracking-tight">
                        {formatCurrency(bharatPrice)}
                      </span>
                      {!isBharatCheaper && priceDifference > 0 && (
                        <span className="text-[11px] text-rose-500 block font-medium">
                          +{formatCurrency(priceDifference)} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 pt-2 border-t border-slate-200/60 dark:border-white/5 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {bharatTaxiOption.etaMinutes} mins ETA
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          alert(`Redirecting to Bharat Taxi for ${bharatTaxiOption.vehicleName} (${formatCurrency(bharatPrice)})`)
                        }
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition ${
                          isBharatCheaper
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-gray-800 text-slate-800 dark:text-gray-200 hover:bg-slate-300'
                        }`}
                      >
                        Book Bharat Taxi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-gray-900/30 text-center flex flex-col justify-center items-center py-7 text-slate-400">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 block">
                      Not Offered
                    </span>
                    <span className="text-[10px] mt-0.5 block text-slate-400">
                      Bharat Taxi provides car/cab bookings only
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
