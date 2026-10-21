'use client';

import React from 'react';
import { Route, Clock, Compass } from 'lucide-react';
import { RouteInfo, LocationPoint } from '@/lib/types';
import { formatDistance, formatDuration } from '@/lib/utils';

interface RouteSummaryBarProps {
  route: RouteInfo;
  pickup: LocationPoint;
  drop: LocationPoint;
}

export default function RouteSummaryBar({ route, pickup, drop }: RouteSummaryBarProps) {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border transition-all">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Pickup & Drop trail */}
        <div className="md:col-span-2 flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
            <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-rose-500 my-0.5" />
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
          </div>

          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-400 block tracking-wider">
                Pickup
              </span>
              <span className="text-xs sm:text-sm font-semibold truncate block">
                {pickup.address}
              </span>
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-400 block tracking-wider">
                Destination
              </span>
              <span className="text-xs sm:text-sm font-semibold truncate block">
                {drop.address}
              </span>
            </div>
          </div>
        </div>

        {/* Distance Stat */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200/80 dark:border-white/5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-400 block tracking-wider">
              Total Distance
            </span>
            <span className="text-base font-extrabold">
              {formatDistance(route.distanceKm)}
            </span>
          </div>
        </div>

        {/* Duration Stat */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200/80 dark:border-white/5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-400 block tracking-wider">
              Est. Travel Time
            </span>
            <span className="text-base font-extrabold">
              {formatDuration(route.durationMinutes)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          Routing Engine:{' '}
          <strong className="font-semibold text-slate-700 dark:text-gray-200">
            {route.method === 'ola_maps_network'
              ? 'Ola Maps Routing Engine'
              : route.method === 'osrm_road_network'
              ? 'OSRM Road Network'
              : 'Haversine Detour Approximation'}
          </strong>
        </span>
        <span className="hidden sm:inline text-slate-400 dark:text-gray-500">Live Traffic Calibrated</span>
      </div>
    </div>
  );
}
