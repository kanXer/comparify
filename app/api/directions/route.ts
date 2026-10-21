import { NextRequest, NextResponse } from 'next/server';
import { fetchRouteDirections } from '@/lib/services/olaMaps';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export const preferredRegion = 'bom1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pLatStr = searchParams.get('pLat');
  const pLonStr = searchParams.get('pLon');
  const dLatStr = searchParams.get('dLat');
  const dLonStr = searchParams.get('dLon');

  const pLat = parseFloat(pLatStr || '0');
  const pLon = parseFloat(pLonStr || '0');
  const dLat = parseFloat(dLatStr || '0');
  const dLon = parseFloat(dLonStr || '0');

  if (!pLat || !pLon || !dLat || !dLon) {
    return NextResponse.json(
      { success: false, error: 'Valid pickup and drop coordinates (pLat, pLon, dLat, dLon) are required.' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchRouteDirections(pLat, pLon, dLat, dLon);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[API Directions] Error:', err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        coordinates: [
          [pLon, pLat],
          [dLon, dLat],
        ],
        distanceKm: 2.5,
        durationMinutes: 7,
      },
      { status: 500 }
    );
  }
}
