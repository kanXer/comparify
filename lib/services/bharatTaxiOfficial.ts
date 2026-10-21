import { LocationPoint, RideOption } from '@/lib/types';

// Moving Tech (Bharat Taxi) Official Production API
const BASE_URL = 'https://api.moving.tech/pilot/app/v2';
const CLIENT_ID = '2b75e8fd-6f20-4004-881c-57c6e575c4ab';
const DEFAULT_TOKEN = 'eb55a515-7943-42e4-bbe4-954b49d29955';

export function getBharatTaxiToken(): string {
  return (process.env.BHARAT_TAXI_TOKEN || DEFAULT_TOKEN).trim();
}

const appHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  token,
  'client-id': CLIENT_ID,
  'x-device': 'android',
  'x-bundle-version': '2.0.0',
  'x-client-version': '2.0.0',
  'x-config-version': '2.0.0',
});

export interface BharatTaxiOfficialResult {
  rides: RideOption[];
  rawEstimates: any[];
  searchId?: string;
  success: boolean;
  error?: string;
}

/**
 * Fetches real-time live quotes directly from Bharat Taxi (Moving Tech Beckn Stack)
 */
export async function fetchBharatTaxiOfficialQuotes(params: {
  pickup: LocationPoint;
  drop: LocationPoint;
  distanceKm: number;
  durationMinutes: number;
  cityName?: string;
}): Promise<BharatTaxiOfficialResult> {
  const { pickup, drop, distanceKm, durationMinutes, cityName = 'Gorakhpur' } = params;
  const token = getBharatTaxiToken();
  const simpleCity = cityName.split(',')[0].trim();

  const body = {
    contents: {
      origin: {
        gps: { lat: pickup.lat, lon: pickup.lon },
        address: {
          area: pickup.address,
          city: simpleCity,
          country: 'India',
          building: pickup.address,
          placeId: `${pickup.lat},${pickup.lon}`,
          state: 'Uttar Pradesh',
        },
      },
      destination: {
        gps: { lat: drop.lat, lon: drop.lon },
        address: {
          area: drop.address,
          city: simpleCity,
          country: 'India',
          building: drop.address,
          placeId: `${drop.lat},${drop.lon}`,
          state: 'Uttar Pradesh',
        },
      },
      placeNameSource: 'API_MCP',
      platformType: 'APPLICATION',
      quotesUnifiedFlow: true, // Enables sync estimates on initial search
    },
    fareProductType: 'ONE_WAY',
  };

  try {
    const res = await fetch(
      `${BASE_URL}/rideSearch?enableSyncSearch=true&filterServiceAndJrnyType=true`,
      {
        method: 'POST',
        headers: appHeaders(token),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[BharatTaxi Official] API responded with ${res.status}: ${errText.slice(0, 100)}`);
      return { rides: [], rawEstimates: [], success: false, error: `API status ${res.status}` };
    }

    const data = await res.json();
    let estimates: any[] = data?.results?.estimates || [];
    const searchId = data?.results?.searchId ?? data?.searchId;

    // If estimates were not returned synchronously, try 1 quick poll
    if (estimates.length === 0 && searchId) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(`${BASE_URL}/rideSearch/${searchId}/results`, {
        headers: appHeaders(token),
      });
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        estimates = pollData?.results?.estimates || [];
      }
    }

    if (estimates.length === 0) {
      return { rides: [], rawEstimates: [], searchId, success: false, error: 'No live estimates returned' };
    }

    const rides: RideOption[] = [];

    // 1. Motorcycle (Bike)
    const bikeEstimate = estimates.find(
      (e) => e.serviceTierType === 'BIKE' || e.vehicleVariant === 'BIKE' || e.serviceTierName === 'Bike'
    );
    if (bikeEstimate && bikeEstimate.estimatedFare) {
      rides.push({
        id: `bharat_taxi-bike-${Date.now()}`,
        provider: 'bharat_taxi',
        providerName: 'Bharat Taxi',
        providerLogo: '🚕',
        vehicleCategory: 'bike',
        vehicleName: 'Bharat Taxi Bike',
        description: 'Live quote from Bharat Taxi (Sahakar Taxi Cooperative)',
        price: bikeEstimate.estimatedFare,
        originalPrice: bikeEstimate.totalFareRange?.maxFare || bikeEstimate.estimatedFare,
        discountApplied: 0,
        currency: '₹',
        etaMinutes: Math.round((bikeEstimate.estimatedPickupDuration || 120) / 60),
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 1,
        features: ['Live Official Quote', 'Helmet provided', 'Beat traffic', 'Zero surge'],
        isLiveRate: true,
        surgeMultiplier: 1,
        sourceUrl: 'https://bharattaxiapp.com/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 2. Auto
    const autoEstimate = estimates.find(
      (e) =>
        e.serviceTierType === 'AUTO_RICKSHAW' ||
        e.vehicleVariant === 'AUTO_RICKSHAW' ||
        e.serviceTierName === 'Auto'
    );
    if (autoEstimate && autoEstimate.estimatedFare) {
      rides.push({
        id: `bharat_taxi-auto-${Date.now()}`,
        provider: 'bharat_taxi',
        providerName: 'Bharat Taxi',
        providerLogo: '🚕',
        vehicleCategory: 'auto',
        vehicleName: 'Bharat Taxi Auto',
        description: 'Live quote from Bharat Taxi (Auto)',
        price: autoEstimate.estimatedFare,
        originalPrice: autoEstimate.totalFareRange?.maxFare || autoEstimate.estimatedFare,
        discountApplied: 0,
        currency: '₹',
        etaMinutes: Math.round((autoEstimate.estimatedPickupDuration || 180) / 60),
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 3,
        features: ['Live Official Quote', 'Doorstep pickup', 'Meter-free'],
        isLiveRate: true,
        surgeMultiplier: 1,
        sourceUrl: 'https://bharattaxiapp.com/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 3. Cab Economy (Taxi)
    const cabEcoEstimate = estimates.find(
      (e) =>
        e.serviceTierName === 'Cab Economy' ||
        e.serviceTierType === 'TAXI' ||
        e.vehicleVariant === 'TAXI'
    );
    if (cabEcoEstimate && cabEcoEstimate.estimatedFare) {
      rides.push({
        id: `bharat_taxi-cab-${Date.now()}`,
        provider: 'bharat_taxi',
        providerName: 'Bharat Taxi',
        providerLogo: '🚕',
        vehicleCategory: 'cab',
        vehicleName: 'Bharat Taxi Economy',
        description: 'Live quote from Bharat Taxi (Cab Economy)',
        price: cabEcoEstimate.estimatedFare,
        originalPrice: cabEcoEstimate.totalFareRange?.maxFare || cabEcoEstimate.estimatedFare,
        discountApplied: 0,
        currency: '₹',
        etaMinutes: Math.round((cabEcoEstimate.estimatedPickupDuration || 300) / 60),
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 4,
        features: ['Live Official Quote', 'Budget AC ride', 'Verified driver'],
        isLiveRate: true,
        surgeMultiplier: 1,
        sourceUrl: 'https://bharattaxiapp.com/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 4. Cab Premium (Strict Rule: Record the Sedan price for Bharat Taxi, Ignore 'Priority' cab)
    const sedanEstimate = estimates.find(
      (e) =>
        e.serviceTierName === 'Cab Sedan' ||
        e.serviceTierType === 'SEDAN' ||
        e.vehicleVariant === 'SEDAN'
    );
    if (sedanEstimate && sedanEstimate.estimatedFare) {
      rides.push({
        id: `bharat_taxi-cab_premium-${Date.now()}`,
        provider: 'bharat_taxi',
        providerName: 'Bharat Taxi',
        providerLogo: '🚕',
        vehicleCategory: 'cab_premium',
        vehicleName: 'Bharat Taxi Sedan',
        description: 'Live quote from Bharat Taxi (Cab Sedan)',
        price: sedanEstimate.estimatedFare,
        originalPrice: sedanEstimate.totalFareRange?.maxFare || sedanEstimate.estimatedFare,
        discountApplied: 0,
        currency: '₹',
        etaMinutes: Math.round((sedanEstimate.estimatedPickupDuration || 300) / 60),
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 4,
        features: ['Live Official Quote', 'Prime Sedan', 'Clean car', 'Air conditioned'],
        isLiveRate: true,
        surgeMultiplier: 1,
        sourceUrl: 'https://bharattaxiapp.com/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 5. Cab XL (SUV)
    const xlEstimate = estimates.find(
      (e) =>
        e.serviceTierName === 'Cab XL' ||
        e.serviceTierType === 'SUV' ||
        e.vehicleVariant === 'SUV'
    );
    if (xlEstimate && xlEstimate.estimatedFare) {
      rides.push({
        id: `bharat_taxi-cab_xl-${Date.now()}`,
        provider: 'bharat_taxi',
        providerName: 'Bharat Taxi',
        providerLogo: '🚕',
        vehicleCategory: 'cab_xl',
        vehicleName: 'Bharat Taxi XL',
        description: 'Live quote from Bharat Taxi (Cab XL)',
        price: xlEstimate.estimatedFare,
        originalPrice: xlEstimate.totalFareRange?.maxFare || xlEstimate.estimatedFare,
        discountApplied: 0,
        currency: '₹',
        etaMinutes: Math.round((xlEstimate.estimatedPickupDuration || 360) / 60),
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 6,
        features: ['Live Official Quote', '6-7 Seater SUV', 'Extra luggage space', 'Air conditioned'],
        isLiveRate: true,
        surgeMultiplier: 1,
        sourceUrl: 'https://bharattaxiapp.com/',
        isCheapest: false,
        isFastest: false,
      });
    }

    return {
      rides,
      rawEstimates: estimates,
      searchId,
      success: rides.length > 0,
    };
  } catch (err: any) {
    console.warn('[BharatTaxi Official] Error:', err.message);
    return { rides: [], rawEstimates: [], success: false, error: err.message };
  }
}
