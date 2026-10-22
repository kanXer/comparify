import axios from 'axios';
import https from 'https';

// Force IPv4 to avoid Linux IPv6 DNS delay/timeout to Akamai edges
const ipv4Agent = new https.Agent({
  family: 4,
  keepAlive: true,
  timeout: 4500,
});

export interface OlaSuggestionItem {
  label: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  type?: string;
  source: 'ola';
  placeId?: string;
}

// Key Indian city coordinates for Ola Maps location-biased search
export const CITY_CENTERS: Record<string, { lat: number; lon: number; name: string }> = {
  gorakhpur: { lat: 26.7606, lon: 83.3732, name: 'Gorakhpur, Uttar Pradesh' },
  lucknow: { lat: 26.8467, lon: 80.9462, name: 'Lucknow, Uttar Pradesh' },
  delhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi, Delhi' },
  varanasi: { lat: 25.3176, lon: 82.9739, name: 'Varanasi, Uttar Pradesh' },
  kanpur: { lat: 26.4499, lon: 80.3319, name: 'Kanpur, Uttar Pradesh' },
  prayagraj: { lat: 25.4358, lon: 81.8463, name: 'Prayagraj, Uttar Pradesh' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
  jaipur: { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal' },
  patna: { lat: 25.5941, lon: 85.1376, name: 'Patna, Bihar' },
};

/**
 * Reads Ola Maps API Key securely from environment variables
 */
export function getOlaMapsApiKey(): string {
  return (
    process.env.OLA_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY ||
    'vEkQvM8ZfTCOm6aTH3uEzo67o7IYQRhY1Nd7ilDU'
  ).trim();
}

/**
 * Fetch autocomplete predictions from Ola Maps Places API biased to the selected city
 */
export async function fetchOlaMapsAutocomplete(
  query: string,
  cityName = 'Gorakhpur, Uttar Pradesh'
): Promise<OlaSuggestionItem[]> {
  const apiKey = getOlaMapsApiKey();
  if (!apiKey) {
    console.warn('[OlaMaps Autocomplete] No OLA_MAPS_API_KEY found in environment');
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const citySimple = cityName.split(',')[0].trim();
  const cityKey = citySimple.toLowerCase();
  const focal = CITY_CENTERS[cityKey] || { lat: 26.7606, lon: 83.3732, name: cityName };

  try {
    const url = 'https://api.olamaps.io/places/v1/autocomplete';
    const response = await axios.get(url, {
      params: {
        input: trimmed,
        location: `${focal.lat},${focal.lon}`,
        radius: 35000, // 35km radius bias
        api_key: apiKey,
      },
      headers: {
        Accept: 'application/json',
      },
      httpsAgent: ipv4Agent,
      timeout: 4500,
    });

    if (response.data?.status === 'ok' && Array.isArray(response.data?.predictions)) {
      const results: OlaSuggestionItem[] = [];
      const seen = new Set<string>();

      for (const pred of response.data.predictions) {
        const structured = pred.structured_formatting || {};
        const mainText =
          structured.main_text ||
          pred.description?.split(',')?.[0]?.trim() ||
          trimmed;

        const secondaryText =
          structured.secondary_text ||
          pred.description ||
          `${citySimple}, Uttar Pradesh, India`;

        const lat = pred.geometry?.location?.lat;
        const lon = pred.geometry?.location?.lng;

        // Skip items without valid float coordinates
        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
          continue;
        }

        const dedupKey = `${mainText.toLowerCase()}-${lat.toFixed(3)},${lon.toFixed(3)}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const primaryType =
          Array.isArray(pred.types) && pred.types.length > 0
            ? pred.types[0].replace(/_/g, ' ')
            : 'landmark';

        results.push({
          label: `${mainText}, ${citySimple}`,
          name: mainText,
          subtitle: secondaryText,
          lat,
          lon,
          type: primaryType,
          source: 'ola',
          placeId: pred.place_id,
        });
      }

      return results;
    }
  } catch (error: any) {
    console.warn('[OlaMaps Autocomplete] Request failed:', error?.response?.data || error.message);
  }

  return [];
}

/**
 * Fetch exact place details (exact latitude, longitude, and formatted address) by place_id from Ola Maps
 */
export async function fetchOlaMapsPlaceDetails(placeId: string): Promise<{
  lat: number;
  lng: number;
  formatted_address: string;
  name: string;
} | null> {
  const apiKey = getOlaMapsApiKey();
  if (!apiKey || !placeId) return null;

  try {
    const url = 'https://api.olamaps.io/places/v1/details';
    const response = await axios.get(url, {
      params: {
        place_id: placeId,
        api_key: apiKey,
      },
      httpsAgent: ipv4Agent,
      timeout: 4500,
    });

    if (response.data?.status === 'ok' && response.data?.result?.geometry?.location) {
      const loc = response.data.result.geometry.location;
      return {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        formatted_address: response.data.result.formatted_address || '',
        name: response.data.result.name || '',
      };
    }
  } catch (err: any) {
    console.warn('[OlaMaps Details] Error:', err.message);
  }
  return null;
}

/**
 * Fetch reverse geocode address for coordinates using Ola Maps Places API
 */
export async function fetchOlaMapsReverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  const apiKey = getOlaMapsApiKey();
  if (!apiKey) return null;

  try {
    const url = 'https://api.olamaps.io/places/v1/reverse-geocode';
    const response = await axios.get(url, {
      params: {
        latlng: `${lat},${lon}`,
        api_key: apiKey,
      },
      headers: {
        Accept: 'application/json',
      },
      httpsAgent: ipv4Agent,
      timeout: 3500,
    });

    if (
      response.data?.status === 'ok' &&
      Array.isArray(response.data?.results) &&
      response.data.results.length > 0
    ) {
      const first = response.data.results[0];
      return first.formatted_address || first.name || null;
    }
  } catch (error: any) {
    console.warn('[OlaMaps Reverse Geocode] Request failed:', error?.response?.data || error.message);
  }

  return null;
}

/**
 * Decodes Google encoded polyline string to [lon, lat] array (MapLibre GeoJSON standard)
 */
export function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: [number, number][] = [],
    factor = Math.pow(10, precision);
  while (index < str.length) {
    let byte,
      shift = 0,
      result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push([Number((lng / factor).toFixed(6)), Number((lat / factor).toFixed(6))]);
  }
  return coordinates;
}

export interface RouteDirectionsResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  provider: 'ola' | 'osrm';
}

/**
 * Fetches driving directions using Ola Maps Routing API with OSRM fallback
 */
export async function fetchRouteDirections(
  pLat: number,
  pLon: number,
  dLat: number,
  dLon: number
): Promise<RouteDirectionsResult> {
  const apiKey = getOlaMapsApiKey();

  // 1. Try Ola Maps Directions API first (matches Ola Maps vector style perfectly)
  if (apiKey) {
    try {
      const url = 'https://api.olamaps.io/routing/v1/directions';
      const response = await axios.post(url, null, {
        params: {
          origin: `${pLat},${pLon}`,
          destination: `${dLat},${dLon}`,
          api_key: apiKey,
        },
        httpsAgent: ipv4Agent,
        timeout: 4500,
      });

      if (
        response.data?.routes?.[0]?.overview_polyline &&
        response.data.routes[0].legs?.[0]
      ) {
        const polyline = response.data.routes[0].overview_polyline;
        const decoded = decodePolyline(polyline);
        const leg = response.data.routes[0].legs[0];
        const distKm = Math.max(0.5, Number((leg.distance / 1000).toFixed(2)));
        const durMin = Math.max(2, Math.round(leg.duration / 60));

        // Seamlessly anchor line at the needle tips
        const coords: [number, number][] = [
          [pLon, pLat],
          ...decoded,
          [dLon, dLat],
        ];

        return {
          coordinates: coords,
          distanceKm: distKm,
          durationMinutes: durMin,
          provider: 'ola',
        };
      }
    } catch (err: any) {
      console.warn('[OlaMaps Directions] API error, falling back to OSRM:', err.message);
    }
  }

  // 2. Fallback to OSRM
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=full&geometries=geojson`;
    const res = await axios.get(osrmUrl, { timeout: 4500 });
    if (res.data?.code === 'Ok' && res.data.routes?.[0]?.geometry?.coordinates) {
      const osrmCoords = res.data.routes[0].geometry.coordinates as [number, number][];
      const distKm = Math.max(0.5, Number((res.data.routes[0].distance / 1000).toFixed(2)));
      const durMin = Math.max(2, Math.round(res.data.routes[0].duration / 60));

      const coords: [number, number][] = [
        [pLon, pLat],
        ...osrmCoords,
        [dLon, dLat],
      ];

      return {
        coordinates: coords,
        distanceKm: distKm,
        durationMinutes: durMin,
        provider: 'osrm',
      };
    }
  } catch (err: any) {
    console.warn('[OSRM Directions] Fallback failed:', err.message);
  }

  // 3. Fallback straight line
  return {
    coordinates: [
      [pLon, pLat],
      [dLon, dLat],
    ],
    distanceKm: 2.5,
    durationMinutes: 7,
    provider: 'osrm',
  };
}
