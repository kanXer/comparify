import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, calculateRouteDistance } from '@/lib/services/geocoding';
import { fetchBharatTaxiOfficialQuotes } from '@/lib/services/bharatTaxiOfficial';
import { fetchRapidoOfficialQuotes } from '@/lib/services/rapidoOfficial';
import { buildStandardSchemaRows } from '@/lib/standardSchema';
import {
  FareComparisonResponse,
  LocationPoint,
  RideOption,
  VehicleCategory,
  VehicleComparison,
} from '@/lib/types';

// Vercel Serverless Optimization Flags
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allows up to 30s execution on Vercel Serverless (default is 10s)
export const preferredRegion = 'bom1'; // Deploy to Mumbai AWS/Vercel region for minimal latency to Indian endpoints

interface RequestBody {
  city?: string;
  pickup?: string | Partial<LocationPoint>;
  drop?: string | Partial<LocationPoint>;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const city = body.city?.trim() || 'Gorakhpur, Uttar Pradesh';

    const pickupText =
      typeof body.pickup === 'string'
        ? body.pickup.trim()
        : body.pickup?.address?.trim() || '';
    const dropText =
      typeof body.drop === 'string'
        ? body.drop.trim()
        : body.drop?.address?.trim() || '';

    const hasPickupCoords =
      typeof body.pickup_lat === 'number' &&
      typeof body.pickup_lng === 'number' &&
      !isNaN(body.pickup_lat) &&
      !isNaN(body.pickup_lng) &&
      body.pickup_lat !== 0 &&
      body.pickup_lng !== 0;

    const hasDropCoords =
      typeof body.drop_lat === 'number' &&
      typeof body.drop_lng === 'number' &&
      !isNaN(body.drop_lat) &&
      !isNaN(body.drop_lng) &&
      body.drop_lat !== 0 &&
      body.drop_lng !== 0;

    if (!pickupText && !hasPickupCoords) {
      return NextResponse.json(
        { success: false, error: 'Both pickup and drop locations are required.' },
        { status: 400 }
      );
    }
    if (!dropText && !hasDropCoords) {
      return NextResponse.json(
        { success: false, error: 'Both pickup and drop locations are required.' },
        { status: 400 }
      );
    }

    // Step 1: Concurrently resolve pickup and drop, preserving exact coordinates
    const [pickupResolved, dropResolved] = await Promise.all([
      hasPickupCoords
        ? Promise.resolve({
            address: pickupText || `Location (${body.pickup_lat!.toFixed(4)}, ${body.pickup_lng!.toFixed(4)})`,
            lat: body.pickup_lat!,
            lon: body.pickup_lng!,
            displayName: pickupText ? `${pickupText}, ${city}` : `Location (${body.pickup_lat!.toFixed(4)}, ${body.pickup_lng!.toFixed(4)})`,
            city,
          } as LocationPoint)
        : typeof body.pickup === 'string'
        ? geocodeAddress(body.pickup, city)
        : isValidLocation(body.pickup)
        ? Promise.resolve(body.pickup as LocationPoint)
        : geocodeAddress(body.pickup?.address || 'Junction Railway Station (gkp)', city),

      hasDropCoords
        ? Promise.resolve({
            address: dropText || `Location (${body.drop_lat!.toFixed(4)}, ${body.drop_lng!.toFixed(4)})`,
            lat: body.drop_lat!,
            lon: body.drop_lng!,
            displayName: dropText ? `${dropText}, ${city}` : `Location (${body.drop_lat!.toFixed(4)}, ${body.drop_lng!.toFixed(4)})`,
            city,
          } as LocationPoint)
        : typeof body.drop === 'string'
        ? geocodeAddress(body.drop, city)
        : isValidLocation(body.drop)
        ? Promise.resolve(body.drop as LocationPoint)
        : geocodeAddress(body.drop?.address || 'Golghar', city),
    ]);

    const route = await calculateRouteDistance(
      pickupResolved.lat,
      pickupResolved.lon,
      dropResolved.lat,
      dropResolved.lon
    );

    console.log('[TEST] Coordinates:', {
      pickup: {
        address: pickupResolved.address,
        lat: pickupResolved.lat,
        lng: pickupResolved.lon,
      },
      drop: {
        address: dropResolved.address,
        lat: dropResolved.lat,
        lng: dropResolved.lon,
      },
      distance: route.distanceKm,
    });
    console.error('[TEST] Coordinates:', JSON.stringify({
      pickup: {
        address: pickupResolved.address,
        lat: pickupResolved.lat,
        lng: pickupResolved.lon,
      },
      drop: {
        address: dropResolved.address,
        lat: dropResolved.lat,
        lng: dropResolved.lon,
      },
      distance: route.distanceKm,
    }));

    // Step 2: Fetch Official Bharat Taxi & Official Rapido Live Quotes Concurrently
    const [bharatResult, rapidoResult] = await Promise.all([
      fetchBharatTaxiOfficialQuotes({
        pickup: pickupResolved,
        drop: dropResolved,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        cityName: city,
      }),
      fetchRapidoOfficialQuotes({
        pickup: pickupResolved,
        drop: dropResolved,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        cityName: city,
      }),
    ]);

    const rapidoRes = rapidoResult.rides;
    const bharatRes = bharatResult.rides;

    if (rapidoRes.length === 0 && bharatRes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Real-time quotes are currently unavailable from live APIs for this route.',
          details: bharatResult.error,
        },
        { status: 502 }
      );
    }

    let allRides: RideOption[] = [...rapidoRes, ...bharatRes];

    // Step 3: Identify cheapest & fastest
    const cheapestOverall = [...allRides].sort((a, b) => a.price - b.price)[0];
    const fastestPickupOverall = [...allRides].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];

    allRides = allRides.map((ride) => ({
      ...ride,
      isCheapest: cheapestOverall ? ride.id === cheapestOverall.id : false,
      isFastest: fastestPickupOverall ? ride.id === fastestPickupOverall.id : false,
    }));

    // Step 4: Side-by-side category comparisons across all standard vehicle types
    const categories: VehicleCategory[] = ['bike', 'auto', 'cab', 'cab_premium', 'cab_xl'];
    const categoryLabels: Record<VehicleCategory, string> = {
      bike: 'Motorcycle',
      auto: 'Auto',
      cab: 'Cab Eco',
      cab_premium: 'Cab Premium (Sedan)',
      cab_xl: 'Cab XL (6-Seater SUV)',
    };

    const comparisonsByCategory: Record<VehicleCategory, VehicleComparison> = {} as any;
    let maxPossibleSavings = 0;

    for (const cat of categories) {
      const rapido = allRides.find((r) => r.provider === 'rapido' && r.vehicleCategory === cat);
      const bharat = allRides.find((r) => r.provider === 'bharat_taxi' && r.vehicleCategory === cat);

      let cheapestProvider: 'rapido' | 'bharat_taxi' | 'tie' | null = null;
      let priceDiff = 0;
      let savingsPct = 0;

      if (rapido && bharat) {
        priceDiff = Math.abs(rapido.price - bharat.price);
        const maxPrice = Math.max(rapido.price, bharat.price);
        savingsPct = maxPrice > 0 ? Math.round((priceDiff / maxPrice) * 100) : 0;

        if (rapido.price < bharat.price) cheapestProvider = 'rapido';
        else if (bharat.price < rapido.price) cheapestProvider = 'bharat_taxi';
        else cheapestProvider = 'tie';

        if (priceDiff > maxPossibleSavings) maxPossibleSavings = priceDiff;
      } else if (rapido && !bharat) {
        cheapestProvider = 'rapido';
      } else if (!rapido && bharat) {
        cheapestProvider = 'bharat_taxi';
      }

      comparisonsByCategory[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        rapidoOption: rapido,
        bharatTaxiOption: bharat,
        cheapestProvider,
        priceDifference: priceDiff,
        savingsPercentage: savingsPct,
      };
    }

    // Step 5: Generate Standard Schema consecutive rows: Row 1 = Rapido, Row 2 = Bharat Taxi
    const standardData = buildStandardSchemaRows({
      pickup: pickupResolved,
      drop: dropResolved,
      rides: allRides,
    });

    allRides.sort((a, b) => a.price - b.price);

    const responsePayload: FareComparisonResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      city,
      pickup: pickupResolved,
      drop: dropResolved,
      route,
      rides: allRides,
      comparisonsByCategory,
      standardRows: standardData.rows,
      summary: {
        cheapestOverall,
        fastestPickupOverall,
        maxPossibleSavings,
        recommendedRide: cheapestOverall,
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    console.error('[API compare] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Comparison failed.' },
      { status: 500 }
    );
  }
}

function isValidLocation(loc: any): loc is LocationPoint {
  return (
    loc &&
    typeof loc === 'object' &&
    typeof loc.lat === 'number' &&
    typeof loc.lon === 'number' &&
    loc.lat !== 0 &&
    loc.lon !== 0 &&
    Boolean(loc.address)
  );
}
