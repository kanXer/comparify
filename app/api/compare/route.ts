import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, calculateRouteDistance } from '@/lib/services/geocoding';
import { scrapeBharatTaxiCityRates } from '@/lib/services/bharatTaxi';
import { fetchComparifyLiveFares } from '@/lib/services/comparifyLive';
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
  pickup: string | Partial<LocationPoint>;
  drop: string | Partial<LocationPoint>;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const city = body.city?.trim() || 'Gorakhpur, Uttar Pradesh';

    if (!body.pickup || !body.drop) {
      return NextResponse.json(
        { success: false, error: 'Both pickup and drop locations are required.' },
        { status: 400 }
      );
    }

    // Step 1: Run Geocoding and Live City Rate Scraping CONCURRENTLY for lowest Vercel latency
    const [locationsAndRoute, cityRatesMeta] = await Promise.all([
      (async () => {
        // Concurrently resolve pickup and drop
        const [pickupResolved, dropResolved] = await Promise.all([
          typeof body.pickup === 'string'
            ? geocodeAddress(body.pickup, city)
            : isValidLocation(body.pickup)
            ? Promise.resolve(body.pickup as LocationPoint)
            : geocodeAddress(body.pickup.address || 'Junction Railway Station (gkp)', city),
          typeof body.drop === 'string'
            ? geocodeAddress(body.drop, city)
            : isValidLocation(body.drop)
            ? Promise.resolve(body.drop as LocationPoint)
            : geocodeAddress(body.drop.address || 'Golghar', city),
        ]);

        // Calculate actual street route distance via OSRM
        const route = await calculateRouteDistance(
          pickupResolved.lat,
          pickupResolved.lon,
          dropResolved.lat,
          dropResolved.lon
        );

        return { pickupResolved, dropResolved, route };
      })(),
      // Concurrently scrape / retrieve cached Bharat Taxi rates
      scrapeBharatTaxiCityRates(city),
    ]);

    const { pickupResolved, dropResolved, route } = locationsAndRoute;

    // Step 2: Strictly Real-Time Live Quotes from comparify.pro API (NO FALLBACK)
    const liveResult = await fetchComparifyLiveFares({
      pickup: pickupResolved,
      drop: dropResolved,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
    });

    if (
      !liveResult.success ||
      (liveResult.rapidoRides.length === 0 && liveResult.bharatTaxiRides.length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Real-time quotes are currently unavailable from live APIs for this route. Strictly no fallback pricing is enabled.',
          details: liveResult.debugError,
        },
        { status: 502 }
      );
    }

    const rapidoRes = liveResult.rapidoRides;
    const bharatRes = liveResult.bharatTaxiRides;

    if (liveResult.direction?.timeInMins) {
      route.durationMinutes = Math.round(liveResult.direction.timeInMins);
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
      liveRates: cityRatesMeta.meta,
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
