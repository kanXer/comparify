import * as XLSX from 'xlsx';
import { FareComparisonResponse } from './types';
import { buildStandardSchemaRows, STANDARD_COLUMNS } from './standardSchema';

/**
 * Builds the standardized Fare Comparison Sheet according to strict schema:
 * Headers: Pickup Location | Drop Location | App Name | Motorcycle | Auto | Cab Eco | Cab Premium | Cab XL
 * Exactly two consecutive rows per location pair:
 * - Row 1: Rapido
 * - Row 2: Bharat Taxi
 */
export function buildStandardWorkbook(data: FareComparisonResponse): XLSX.WorkBook {
  const { city, pickup, drop, route, rides } = data;

  const { rapidoRow, bharatTaxiRow } = buildStandardSchemaRows({
    pickup,
    drop,
    rides,
  });

  const headers = [...STANDARD_COLUMNS];

  const rowRapido = [
    rapidoRow.pickupLocation,
    rapidoRow.dropLocation,
    rapidoRow.appName,
    rapidoRow.motorcycle,
    rapidoRow.auto,
    rapidoRow.cabEco,
    rapidoRow.cabPremium,
    rapidoRow.cabXL,
  ];

  const rowBharatTaxi = [
    bharatTaxiRow.pickupLocation,
    bharatTaxiRow.dropLocation,
    bharatTaxiRow.appName,
    bharatTaxiRow.motorcycle, // null -> strictly empty cell
    bharatTaxiRow.auto, // null -> strictly empty cell
    bharatTaxiRow.cabEco,
    bharatTaxiRow.cabPremium,
    bharatTaxiRow.cabXL,
  ];

  // Primary Sheet: Strict 8-Column Standardized Fare Comparison
  const wsComparison = XLSX.utils.aoa_to_sheet([headers, rowRapido, rowBharatTaxi]);

  // Set explicit column widths for clean readability in Excel
  wsComparison['!cols'] = [
    { wch: 32 }, // Pickup Location
    { wch: 32 }, // Drop Location
    { wch: 16 }, // App Name
    { wch: 14 }, // Motorcycle
    { wch: 14 }, // Auto
    { wch: 14 }, // Cab Eco
    { wch: 16 }, // Cab Premium
    { wch: 14 }, // Cab XL
  ];

  // Secondary Sheet: Trip Metadata
  const overviewData = [
    { Field: 'Application', Value: 'Camparify Real-Time Ride Fare Comparison' },
    { Field: 'City / Region', Value: city },
    { Field: 'Pickup Location', Value: pickup.address },
    { Field: 'Drop Location', Value: drop.address },
    { Field: 'Total Road Distance', Value: `${route.distanceKm} km` },
    { Field: 'Estimated Duration', Value: `${route.durationMinutes} mins` },
    { Field: 'Routing Method', Value: route.method === 'ola_maps_network' ? 'Ola Maps Routing Engine' : route.method === 'osrm_road_network' ? 'OSRM Highway Network' : 'Haversine Detour' },
    { Field: 'Comparison Providers', Value: 'Rapido (rapido.bike) vs Bharat Taxi (bharattaxiapp.com)' },
    { Field: 'Export Date', Value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
  ];

  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 25 }, { wch: 55 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsComparison, 'Fare Comparison');
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Trip Metadata');

  return wb;
}

/**
 * Backend binary generator for .xlsx report
 */
export function generateComparisonExcelBuffer(data: FareComparisonResponse): Buffer {
  const wb = buildStandardWorkbook(data);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
