'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bike,
  Car,
  Clock,
  Sparkles,
  Zap,
  TrendingDown,
  Users,
  Star,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { VehicleComparison, RideOption } from '@/lib/types';
import { formatCurrency, formatDuration } from '@/lib/utils';

interface ComparisonCardProps {
  comparison: VehicleComparison;
}

export default function ComparisonCard({ comparison }: ComparisonCardProps) {
  const { rapidoOption, bharatTaxiOption, cheapestProvider, priceDifference, savingsPercentage } =
    comparison;

  const getCategoryIcon = () => {
    switch (comparison.category) {
      case 'bike':
        return <Bike className="w-5 h-5 text-amber-500" />;
      case 'auto':
        return (
          <span className="text-xl leading-none" role="img" aria-label="Auto">
            🛺
          </span>
        );
      case 'cab':
        return <Car className="w-5 h-5 text-blue-500" />;
      case 'cab_premium':
        return <Car className="w-5 h-5 text-purple-500" />;
      case 'cab_xl':
        return <Car className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-2xl p-5 transition-all duration-200"
    >
      {/* Category Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-white/5 flex items-center justify-center">
            {getCategoryIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-base tracking-wide">
              {comparison.categoryLabel}
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">Real-time road fare comparison</p>
          </div>
        </div>

        {/* Savings Badge */}
        {cheapestProvider && priceDifference > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              Save {formatCurrency(priceDifference)} ({savingsPercentage}% cheaper on{' '}
              {cheapestProvider === 'rapido' ? 'Rapido' : 'Bharat Taxi'})
            </span>
          </div>
        )}
      </div>

      {/* Side-by-side providers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Rapido Card */}
        {rapidoOption ? (
          <ProviderRideCard
            ride={rapidoOption}
            isCheapestInPair={cheapestProvider === 'rapido'}
            priceDiff={cheapestProvider === 'bharat_taxi' ? priceDifference : 0}
          />
        ) : (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-gray-900/40 text-center text-xs text-slate-400">
            Rapido option unavailable
          </div>
        )}

        {/* Bharat Taxi Card */}
        {bharatTaxiOption ? (
          <ProviderRideCard
            ride={bharatTaxiOption}
            isCheapestInPair={cheapestProvider === 'bharat_taxi'}
            priceDiff={cheapestProvider === 'rapido' ? priceDifference : 0}
          />
        ) : (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-gray-900/40 text-center text-xs text-slate-400">
            Bharat Taxi option unavailable
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProviderRideCard({
  ride,
  isCheapestInPair,
  priceDiff,
}: {
  ride: RideOption;
  isCheapestInPair: boolean;
  priceDiff: number;
}) {
  const isRapido = ride.provider === 'rapido';

  return (
    <div
      className={`relative rounded-xl p-4 transition-all duration-200 border ${
        isCheapestInPair
          ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-500/40 shadow-sm'
          : 'bg-slate-50/80 dark:bg-gray-900/60 border-slate-200 dark:border-white/5'
      }`}
    >
      {/* Provider Header & Badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{ride.providerLogo}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">{ride.providerName}</span>
              {ride.isLiveRate && (
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  REAL DATA
                </span>
              )}
            </div>
            <span className="text-xs text-slate-600 dark:text-gray-300 font-medium block">{ride.vehicleName}</span>
          </div>
        </div>

        {/* Global/Pair Badges */}
        <div className="flex flex-col items-end gap-1">
          {ride.isCheapest && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Cheapest Ride
            </span>
          )}
          {ride.isFastest && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm">
              <Zap className="w-3 h-3 text-cyan-500" />
              Fastest Pickup
            </span>
          )}
          {!ride.isCheapest && isCheapestInPair && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Best in Category
            </span>
          )}
        </div>
      </div>

      {/* Price & ETA Display */}
      <div className="my-3 flex items-baseline justify-between pt-2 border-t border-black/5 dark:border-white/5">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {formatCurrency(ride.price)}
            </span>
            {ride.originalPrice && ride.originalPrice > ride.price && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(ride.originalPrice)}
              </span>
            )}
          </div>
          {priceDiff > 0 && (
            <span className="text-[11px] text-rose-500 block mt-0.5 font-medium">
              +{formatCurrency(priceDiff)} more
            </span>
          )}
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-gray-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{ride.etaMinutes} mins pickup</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-gray-400 block mt-0.5">
            Trip: ~{formatDuration(ride.durationMinutes)}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-500 dark:text-gray-400 mb-2 line-clamp-1">{ride.description}</p>

      {/* Capacity & Rating */}
      <div className="flex items-center gap-3 py-1.5 text-xs text-slate-500 dark:text-gray-400 border-t border-black/5 dark:border-white/5">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {ride.capacity} Seat{ride.capacity > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {ride.rating.toFixed(1)}
        </span>
        {ride.surgeMultiplier > 1.0 && (
          <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
            ⚡ {ride.surgeMultiplier}x Peak Surge
          </span>
        )}
      </div>

      {/* Features pills */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ride.features.map((feat, i) => (
          <span
            key={i}
            className="text-[10px] text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md flex items-center gap-1"
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            {feat}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            alert(`Opening booking simulation for ${ride.providerName} (${ride.vehicleName}) at ${formatCurrency(ride.price)}`);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            isCheapestInPair
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              : isRapido
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          Book on {ride.providerName}
        </button>

        {ride.sourceUrl && (
          <a
            href={ride.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View Live Official Source on BharatTaxi.com"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
