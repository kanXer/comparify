import { NextRequest, NextResponse } from 'next/server';
import { fetchBharatTaxiLocalities } from '@/lib/services/bharatTaxi';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export const preferredRegion = 'bom1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Gorakhpur, Uttar Pradesh';

  try {
    const localities = await fetchBharatTaxiLocalities(city);
    return NextResponse.json(
      {
        city,
        count: localities.length,
        localities,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({
      city,
      count: 0,
      localities: [],
      error: error.message,
    });
  }
}
