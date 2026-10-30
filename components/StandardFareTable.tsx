'use client';

import React from 'react';
import { FareComparisonResponse } from '@/lib/types';
import { buildStandardSchemaRows, STANDARD_COLUMNS } from '@/lib/standardSchema';
import { MapPin, ArrowRight, ShieldCheck, Download, FileSpreadsheet, CheckCircle, TrendingDown } from 'lucide-react';
import { exportComparisonToExcel } from '@/lib/clientExport';

interface StandardFareTableProps {
  comparisonData: FareComparisonResponse;
}

export default function StandardFareTable({ comparisonData }: StandardFareTableProps) {
  const { pickup, drop, rides, city } = comparisonData;

  const { rapidoRow, bharatTaxiRow } = buildStandardSchemaRows({
    pickup,
    drop,
    rides,
  });

  // Helper to determine cheaper provider for cab categories
  const getCheaperApp = (rapidoVal: number | null, bharatVal: number | null) => {
    if (rapidoVal === null || bharatVal === null) return null;
    if (rapidoVal < bharatVal) return 'Rapido';
    if (bharatVal < rapidoVal) return 'Bharat Taxi';
    return 'Tie';
  };

  const motorcycleCheaper = getCheaperApp(rapidoRow.motorcycle, bharatTaxiRow.motorcycle);
  const autoCheaper = getCheaperApp(rapidoRow.auto, bharatTaxiRow.auto);
  const cabEcoCheaper = getCheaperApp(rapidoRow.cabEco, bharatTaxiRow.cabEco);
  const cabPremiumCheaper = getCheaperApp(rapidoRow.cabPremium, bharatTaxiRow.cabPremium);
  const cabXLCheaper = getCheaperApp(rapidoRow.cabXL, bharatTaxiRow.cabXL);

  return (
    <div className="space-y-4">
      {/* Table Container Card */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 glass-panel shadow-xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-gray-900/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                Standardized Fare Comparison Table
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                8-Column Standard Schema
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Side-by-side pricing per location pair with clean numerical values across Rapido &amp; Bharat Taxi
            </p>
          </div>

          <button
            type="button"
            onClick={() => exportComparisonToExcel(comparisonData)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95"
            title="Export exact 8-column spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
            <Download className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Responsive Table Viewport */}
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[840px] text-left border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-slate-100/75 dark:bg-gray-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                <th className="py-3 px-3.5 text-left w-[18%]">Pickup Location</th>
                <th className="py-3 px-3.5 text-left w-[18%]">Drop Location</th>
                <th className="py-3 px-3.5 text-left w-[14%]">App Name</th>
                <th className="py-3 px-3.5 text-right w-[10%]">Motorcycle</th>
                <th className="py-3 px-3.5 text-right w-[10%]">Auto</th>
                <th className="py-3 px-3.5 text-right w-[10%]">Cab Eco</th>
                <th className="py-3 px-3.5 text-right w-[10%]">Cab Premium</th>
                <th className="py-3 px-3.5 text-right w-[10%]">Cab XL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs">
              {/* ROW 1: RAPIDO */}
              <tr className="hover:bg-amber-500/5 transition group">
                <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate max-w-[160px]" title={rapidoRow.pickupLocation}>
                      {rapidoRow.pickupLocation}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate max-w-[160px]" title={rapidoRow.dropLocation}>
                      {rapidoRow.dropLocation}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Rapido</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">rapido.bike</span>
                </td>

                {/* Motorcycle */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    motorcycleCheaper === 'Rapido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {rapidoRow.motorcycle ?? '—'}
                  </div>
                  {motorcycleCheaper === 'Rapido' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 block font-normal">Standard Bike</span>
                </td>

                {/* Auto */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    autoCheaper === 'Rapido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {rapidoRow.auto ?? '—'}
                  </div>
                  {autoCheaper === 'Rapido' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 block font-normal">Auto 3W</span>
                </td>

                {/* Cab Eco */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabEcoCheaper === 'Rapido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {rapidoRow.cabEco ?? '—'}
                  </div>
                  {cabEcoCheaper === 'Rapido' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                </td>

                {/* Cab Premium */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabPremiumCheaper === 'Rapido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {rapidoRow.cabPremium ?? '—'}
                  </div>
                  {cabPremiumCheaper === 'Rapido' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                </td>

                {/* Cab XL */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabXLCheaper === 'Rapido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {rapidoRow.cabXL ?? '—'}
                  </div>
                  {cabXLCheaper === 'Rapido' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                </td>
              </tr>

              {/* ROW 2: BHARAT TAXI */}
              <tr className="hover:bg-blue-500/5 transition group bg-slate-50/40 dark:bg-gray-900/30">
                <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate max-w-[160px]" title={bharatTaxiRow.pickupLocation}>
                      {bharatTaxiRow.pickupLocation}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate max-w-[160px]" title={bharatTaxiRow.dropLocation}>
                      {bharatTaxiRow.dropLocation}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-3.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Bharat Taxi</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">bharattaxiapp.com</span>
                </td>

                {/* Motorcycle */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    motorcycleCheaper === 'Bharat Taxi' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {bharatTaxiRow.motorcycle ?? '—'}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {motorcycleCheaper === 'Bharat Taxi' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 block font-normal">
                      {bharatTaxiRow.motorcycle !== null ? 'Bharat Bike' : 'Not available'}
                    </span>
                  </div>
                </td>

                {/* Auto */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    autoCheaper === 'Bharat Taxi' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {bharatTaxiRow.auto ?? '—'}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {autoCheaper === 'Bharat Taxi' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 block font-normal">
                      {bharatTaxiRow.auto !== null ? 'Bharat Auto' : 'Not available'}
                    </span>
                  </div>
                </td>

                {/* Cab Eco */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabEcoCheaper === 'Bharat Taxi' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {bharatTaxiRow.cabEco ?? '—'}
                  </div>
                  {cabEcoCheaper === 'Bharat Taxi' && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                    </span>
                  )}
                </td>

                {/* Cab Premium (Sedan Price) */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabPremiumCheaper === 'Bharat Taxi' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {bharatTaxiRow.cabPremium ?? '—'}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {cabPremiumCheaper === 'Bharat Taxi' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                      </span>
                    )}
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded font-medium">
                      Sedan
                    </span>
                  </div>
                </td>

                {/* Cab XL */}
                <td className="py-3.5 px-3.5 text-right">
                  <div className={`font-mono font-bold text-sm ${
                    cabXLCheaper === 'Bharat Taxi' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-900 dark:text-white'
                  }`}>
                    {bharatTaxiRow.cabXL ?? '—'}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {cabXLCheaper === 'Bharat Taxi' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" /> Cheaper
                      </span>
                    )}
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded font-medium">
                      SUV
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Notes on Schema & Rules */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-gray-900/80 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Clean Numeric Fares:</strong> Raw prices formatted without currency text for direct formula &amp; analytics compatibility.
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Side-by-side pricing across Motorcycle, Auto, Cab Eco, Cab Premium (Sedan), and Cab XL
          </span>
        </div>
      </div>
    </div>
  );
}
