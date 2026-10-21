import { NextRequest, NextResponse } from 'next/server';
import { fetchBharatTaxiCities } from '@/lib/services/bharatTaxi';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export const preferredRegion = 'bom1';

const FEATURED_CITIES = [
  'Gorakhpur, Uttar Pradesh',
  'Lucknow, Uttar Pradesh',
  'Delhi, India',
  'Varanasi, Uttar Pradesh',
  'Kanpur, Uttar Pradesh',
  'Agra, Uttar Pradesh',
  'Prayagraj, Uttar Pradesh',
  'Bengaluru, Karnataka',
  'Mumbai, Maharashtra',
  'Hyderabad, Telangana',
  'Jaipur, Rajasthan',
  'Patna, Bihar',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    const allCities = await fetchBharatTaxiCities();

    let filtered = allCities;
    if (query) {
      filtered = allCities.filter((c) => c.toLowerCase().includes(query));
    }

    return NextResponse.json(
      {
        featured: FEATURED_CITIES,
        cities: filtered.slice(0, 100),
        totalCount: allCities.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({
      featured: FEATURED_CITIES,
      cities: FEATURED_CITIES,
      totalCount: FEATURED_CITIES.length,
    });
  }
}
