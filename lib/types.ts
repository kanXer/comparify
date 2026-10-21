export type VehicleCategory = 'bike' | 'auto' | 'cab' | 'cab_premium' | 'cab_xl';

export interface LocationPoint {
  address: string;
  lat: number;
  lon: number;
  displayName?: string;
  city?: string;
}

export interface LiveScrapedRates {
  sourceUrl: string;
  cityName: string;
  sedanRatePerKm?: number;
  sedanFlatPackage?: number;
  suvRatePerKm?: number;
  suvFlatPackage?: number;
  extractedTablesCount: number;
}

export interface RideOption {
  id: string;
  provider: 'rapido' | 'bharat_taxi';
  providerName: string;
  providerLogo?: string;
  vehicleCategory: VehicleCategory;
  vehicleName: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  currency: string;
  etaMinutes: number; // pickup arrival time
  durationMinutes: number; // trip duration
  distanceKm: number;
  isCheapest?: boolean;
  isFastest?: boolean;
  rating: number;
  capacity: number;
  features: string[];
  isLiveRate: boolean;
  surgeMultiplier: number;
  sourceUrl?: string;
}

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  method: 'ola_maps_network' | 'osrm_road_network' | 'haversine_approximation';
}

export interface VehicleComparison {
  category: VehicleCategory;
  categoryLabel: string;
  rapidoOption?: RideOption;
  bharatTaxiOption?: RideOption;
  cheapestProvider: 'rapido' | 'bharat_taxi' | 'tie' | null;
  priceDifference: number;
  savingsPercentage: number;
}

/**
 * Standardized 8-column comparison row schema
 * Headers: Pickup Location | Drop Location | App Name | Motorcycle | Auto | Cab Eco | Cab Premium | Cab XL
 */
export interface StandardSchemaRow {
  pickupLocation: string;
  dropLocation: string;
  appName: 'Rapido' | 'Bharat Taxi';
  motorcycle: number | null;
  auto: number | null;
  cabEco: number | null;
  cabPremium: number | null;
  cabXL: number | null;
}

export interface FareComparisonResponse {
  success: boolean;
  timestamp: string;
  city: string;
  pickup: LocationPoint;
  drop: LocationPoint;
  route: RouteInfo;
  rides: RideOption[];
  comparisonsByCategory: Record<VehicleCategory, VehicleComparison>;
  standardRows?: StandardSchemaRow[];
  summary: {
    cheapestOverall: RideOption;
    fastestPickupOverall: RideOption;
    maxPossibleSavings: number;
    recommendedRide: RideOption;
  };
  liveRates?: LiveScrapedRates;
  errors?: string[];
}
