import { NextRequest, NextResponse } from 'next/server';
import { searchLocationSuggestions } from '@/lib/services/geocoding';
import { fetchOlaMapsReverseGeocode, fetchOlaMapsPlaceDetails } from '@/lib/services/olaMaps';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export const preferredRegion = 'bom1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const placeId = searchParams.get('place_id');

  // Handle Place Details via Ola Maps
  if (action === 'details' && placeId) {
    try {
      const details = await fetchOlaMapsPlaceDetails(placeId);
      if (details) {
        return NextResponse.json({
          success: true,
          details,
          lat: details.lat,
          lng: details.lng,
          source: 'ola',
        });
      }
    } catch (err: any) {
      console.warn('[Geocode Route] Place details error:', err.message);
    }
    return NextResponse.json({ success: false, details: null }, { status: 404 });
  }

  // Handle Reverse Geocode via Ola Maps
  if (action === 'reverse' || (latStr && lonStr && !searchParams.get('q'))) {
    const lat = parseFloat(latStr || '0');
    const lon = parseFloat(lonStr || '0');
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0) {
      try {
        const address = await fetchOlaMapsReverseGeocode(lat, lon);
        if (address) {
          return NextResponse.json({ address, lat, lon, source: 'ola' });
        }
      } catch (err: any) {
        console.warn('[Geocode Route] Reverse geocode error:', err.message);
      }
      return NextResponse.json({ address: null, lat, lon, source: 'none' });
    }
  }

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || 'Gorakhpur, Uttar Pradesh';

  try {
    const suggestions = await searchLocationSuggestions(query, city);
    return NextResponse.json({
      suggestions,
      city,
      count: suggestions.length,
      hasOlaResults: suggestions.some((s) => s.source === 'ola'),
    });
  } catch (error: any) {
    return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 });
  }
}
