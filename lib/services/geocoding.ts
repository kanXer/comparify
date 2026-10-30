import axios from 'axios';
import { LocationPoint, RouteInfo } from '@/lib/types';
import { fetchBharatTaxiLocalities } from './bharatTaxi';
import { getLocalitiesForCity, getCoordinatesForLocality } from '@/lib/localitiesData';
import { fetchOlaMapsAutocomplete, fetchRouteDirections, getOlaMapsApiKey } from './olaMaps';

// Known focal coordinates for key cities
const CITY_CENTERS: Record<string, { lat: number; lon: number; name: string }> = {
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

// Strict Geographic Bounding Boxes for City Scoped Live Nominatim Geocoding
export const CITY_BOUNDING_BOXES: Record<string, { minLon: number; maxLat: number; maxLon: number; minLat: number }> = {
  gorakhpur: {
    minLon: 83.15,
    maxLat: 26.95,
    maxLon: 83.60,
    minLat: 26.55,
  },
  lucknow: {
    minLon: 80.75,
    maxLat: 27.05,
    maxLon: 81.15,
    minLat: 26.65,
  },
  delhi: {
    minLon: 76.85,
    maxLat: 28.88,
    maxLon: 77.40,
    minLat: 28.40,
  },
  varanasi: {
    minLon: 82.75,
    maxLat: 25.55,
    maxLon: 83.20,
    minLat: 25.15,
  },
  kanpur: {
    minLon: 80.15,
    maxLat: 26.55,
    maxLon: 80.45,
    minLat: 26.35,
  },
  prayagraj: {
    minLon: 81.70,
    maxLat: 25.55,
    maxLon: 82.00,
    minLat: 25.35,
  },
  bengaluru: {
    minLon: 77.45,
    maxLat: 13.15,
    maxLon: 77.75,
    minLat: 12.85,
  },
  mumbai: {
    minLon: 72.75,
    maxLat: 19.30,
    maxLon: 73.05,
    minLat: 18.85,
  },
};

export function getBoundingBoxForCity(cityName: string) {
  const cityKey = cityName.split(',')[0].trim().toLowerCase();
  if (CITY_BOUNDING_BOXES[cityKey]) {
    return CITY_BOUNDING_BOXES[cityKey];
  }
  const focal = CITY_CENTERS[cityKey] || { lat: 26.7606, lon: 83.3732 };
  return {
    minLon: Number((focal.lon - 0.22).toFixed(4)),
    maxLat: Number((focal.lat + 0.18).toFixed(4)),
    maxLon: Number((focal.lon + 0.22).toFixed(4)),
    minLat: Number((focal.lat - 0.18).toFixed(4)),
  };
}

/**
 * Geocode an address query with strict city/district scoping
 */
export async function geocodeAddress(query: string, cityName = 'Gorakhpur, Uttar Pradesh'): Promise<LocationPoint> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error('Location query cannot be empty');

  const citySimple = cityName.split(',')[0].trim();
  const cityKey = citySimple.toLowerCase();
  const cityFocal = CITY_CENTERS[cityKey] || { lat: 26.7606, lon: 83.3732 };

  // 1. Check verified locality coordinates database first (locks to curated local points)
  const verifiedCoords = getCoordinatesForLocality(trimmed, cityName);
  if (
    verifiedCoords &&
    verifiedCoords.lat &&
    verifiedCoords.lon &&
    (Math.abs(verifiedCoords.lat - cityFocal.lat) > 0.0001 || Math.abs(verifiedCoords.lon - cityFocal.lon) > 0.0001)
  ) {
    return {
      address: trimmed,
      lat: verifiedCoords.lat,
      lon: verifiedCoords.lon,
      displayName: `${trimmed}, ${citySimple}, Uttar Pradesh, India`,
      city: cityName,
    };
  }

  // 2. Try Ola Maps with strict city bounding box filter
  try {
    const olaResults = await fetchOlaMapsAutocomplete(trimmed, cityName);
    const bbox = getBoundingBoxForCity(cityName);
    // Find first Ola result that is strictly inside city bounding box
    const inCityResult = olaResults.find(
      (r) =>
        r.lat >= bbox.minLat &&
        r.lat <= bbox.maxLat &&
        r.lon >= bbox.minLon &&
        r.lon <= bbox.maxLon
    );
    if (inCityResult) {
      return {
        address: trimmed,
        lat: inCityResult.lat,
        lon: inCityResult.lon,
        displayName: inCityResult.subtitle,
        city: cityName,
      };
    }
  } catch {
    console.warn(`[Geocoding] Ola Maps search fallback for "${trimmed}"`);
  }

  // 3. Try Nominatim scoped strictly to this city
  try {
    const fullQuery = trimmed.toLowerCase().includes(citySimple.toLowerCase())
      ? `${trimmed}, India`
      : `${trimmed}, ${citySimple}, India`;

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: fullQuery,
        format: 'json',
        addressdetails: 1,
        limit: 1,
        countrycodes: 'in',
      },
      headers: {
        'User-Agent': 'BharatTaxiCompareApp/2.0 (ridefare@bharattaxi.local)',
        'Accept-Language': 'en',
      },
      timeout: 2000,
    });

    if (Array.isArray(response.data) && response.data.length > 0) {
      const first = response.data[0];
      return {
        address: trimmed,
        lat: parseFloat(first.lat),
        lon: parseFloat(first.lon),
        displayName: first.display_name,
        city: cityName,
      };
    }
  } catch (error) {
    console.warn(`[Geocoding] Scoped OSM search failed for "${trimmed}" in "${cityName}"`);
  }

  // 2. City-centered hash offset fallback (guarantees local coordinates within ~5km of city center)
  const hash = Array.from(trimmed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = (((hash % 80) - 40) / 1000);
  const lonOffset = ((((hash * 7) % 80) - 40) / 1000);

  return {
    address: trimmed,
    lat: cityFocal.lat + latOffset,
    lon: cityFocal.lon + lonOffset,
    displayName: `${trimmed}, ${citySimple}, Uttar Pradesh, India`,
    city: cityName,
  };
}

export interface SuggestionItem {
  label: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  type?: string;
  source: 'ola' | 'osm' | 'local';
  placeId?: string;
}

/**
 * Autocomplete search suggestions filtered strictly to the selected city / district bounding box
 */
export async function searchLocationSuggestions(
  query: string,
  cityName = 'Gorakhpur, Uttar Pradesh'
): Promise<Array<SuggestionItem>> {
  const citySimple = cityName.split(',')[0].trim();
  const trimmed = query.trim();

  // If query is empty or short, return top localities of this city immediately
  if (!trimmed || trimmed.length < 2) {
    const localities = await fetchBharatTaxiLocalities(cityName);
    const cityKey = citySimple.toLowerCase();
    const cityFocal = CITY_CENTERS[cityKey] || { lat: 26.7606, lon: 83.3732 };

    return localities.slice(0, 8).map((loc, idx) => ({
      label: `${loc}, ${citySimple}`,
      name: loc,
      subtitle: `${citySimple}, Uttar Pradesh, India`,
      lat: Number((cityFocal.lat + idx * 0.003).toFixed(5)),
      lon: Number((cityFocal.lon + idx * 0.003).toFixed(5)),
      type: 'landmark',
      source: 'local',
    }));
  }

  const results: Array<SuggestionItem> = [];
  const seenCoords = new Set<string>();
  const seenNames = new Set<string>();

  const addResult = (item: SuggestionItem) => {
    const normName = item.name.toLowerCase().trim();
    const key = `${item.lat.toFixed(3)},${item.lon.toFixed(3)}`;
    if (!seenCoords.has(key) && !seenNames.has(normName)) {
      seenCoords.add(key);
      seenNames.add(normName);
      results.push(item);
    }
  };

  const bbox = getBoundingBoxForCity(cityName);
  const viewboxStr = `${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}`;
  const cityKey = citySimple.toLowerCase();
  const cityFocal = CITY_CENTERS[cityKey] || { lat: 26.7606, lon: 83.3732 };

  // 1. Concurrently query Ola Maps Places Autocomplete, OSM Nominatim (bounded), and OSM Photon
  const olaPromise = getOlaMapsApiKey()
    ? fetchOlaMapsAutocomplete(trimmed, cityName)
    : Promise.resolve([]);

  const nominatimPromise = axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: trimmed,
      format: 'json',
      addressdetails: 1,
      limit: 10,
      countrycodes: 'in',
      viewbox: viewboxStr,
      bounded: 1, // STRICTLY BOUNDED inside the city bounding box
    },
    headers: {
      'User-Agent': 'CamparifyRideComparison/1.0 (admin@camparify.in)',
      'Accept-Language': 'en,hi',
    },
    timeout: 2500,
  });

  const photonPromise = axios.get('https://photon.komoot.io/api/', {
    params: {
      q: trimmed,
      lat: cityFocal.lat,
      lon: cityFocal.lon,
      limit: 15,
    },
    headers: {
      'User-Agent': 'CamparifyRideComparison/1.0 (admin@camparify.in)',
    },
    timeout: 3500,
  });

  const [olaRes, nomRes, photonRes] = await Promise.allSettled([
    olaPromise,
    nominatimPromise,
    photonPromise,
  ]);

  // Priority 1: Ola Maps predictions (Highest accuracy for landmarks, mohallas & establishments)
  if (olaRes.status === 'fulfilled' && Array.isArray(olaRes.value)) {
    for (const item of olaRes.value) {
      addResult({
        label: item.label,
        name: item.name,
        subtitle: item.subtitle,
        lat: item.lat,
        lon: item.lon,
        type: item.type || 'place',
        source: 'ola',
        placeId: item.placeId,
      });
    }
  }

  // Process OSM Nominatim results
  if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value?.data)) {
    for (const item of nomRes.value.data) {
      const addr = item.address || {};
      const mainName =
        addr.amenity ||
        addr.road ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.quarter ||
        addr.commercial ||
        item.display_name.split(',')[0].trim();

      const rawParts = item.display_name
        .split(',')
        .map((s: string) => s.trim())
        .filter(
          (s: string) =>
            Boolean(s) &&
            s.toLowerCase() !== mainName.toLowerCase() &&
            !s.toLowerCase().includes('india') &&
            !s.toLowerCase().includes('pin') &&
            !/^\d{6}$/.test(s)
        );

      const subtitle = rawParts.slice(0, 3).join(', ') || `${citySimple}, Uttar Pradesh`;

      addResult({
        label: `${mainName}, ${citySimple}`,
        name: mainName,
        subtitle,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type || item.class || 'mohalla',
        source: 'osm',
      });
    }
  }

  // Process OSM Photon results (filter strictly to city bounding box)
  if (photonRes.status === 'fulfilled' && Array.isArray(photonRes.value?.data?.features)) {
    for (const feat of photonRes.value.data.features) {
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const [lon, lat] = coords;

      // STRICT FILTER: Coordinates MUST be strictly inside the city bounding box!
      const isInside =
        lat >= Math.min(bbox.minLat, bbox.maxLat) &&
        lat <= Math.max(bbox.minLat, bbox.maxLat) &&
        lon >= Math.min(bbox.minLon, bbox.maxLon) &&
        lon <= Math.max(bbox.minLon, bbox.maxLon);

      if (!isInside) continue;

      const p = feat.properties || {};
      const name = p.name || p.street || p.suburb;
      if (!name) continue;

      const subParts = [p.street, p.district || p.suburb, p.city || citySimple].filter(Boolean);
      const subtitle = subParts.join(', ') || `${citySimple}, Uttar Pradesh`;

      addResult({
        label: `${name}, ${citySimple}`,
        name,
        subtitle,
        lat,
        lon,
        type: p.osm_value || p.type || 'landmark',
        source: 'osm',
      });
    }
  }

  // 3. Match and prioritize verified landmarks in the city
  const cityLocalities = getLocalitiesForCity(cityName);
  const matchedCityLocalities = cityLocalities.filter((loc) =>
    loc.toLowerCase().includes(trimmed.toLowerCase())
  );

  for (const loc of matchedCityLocalities.slice(0, 5)) {
    const coords = getCoordinatesForLocality(loc, cityName);
    addResult({
      label: `${loc}, ${citySimple}`,
      name: loc,
      subtitle: `${citySimple}, Uttar Pradesh &bull; Verified`,
      lat: coords.lat,
      lon: coords.lon,
      type: 'landmark',
      source: 'local',
    });
  }

  // 4. Augment with Bharat Taxi scraped localities
  try {
    const btLocalities = await fetchBharatTaxiLocalities(cityName);
    const matchedBt = btLocalities.filter((loc) =>
      loc.toLowerCase().includes(trimmed.toLowerCase())
    );

    for (const loc of matchedBt.slice(0, 4)) {
      const coords = getCoordinatesForLocality(loc, cityName);
      addResult({
        label: `${loc}, ${citySimple}`,
        name: loc,
        subtitle: `${citySimple}, Uttar Pradesh`,
        lat: coords.lat,
        lon: coords.lon,
        type: 'locality',
        source: 'local',
      });
    }
  } catch {
    // ignore
  }

  return results.slice(0, 10);
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function calculateRouteDistance(
  pickupLat: number,
  pickupLon: number,
  dropLat: number,
  dropLon: number
): Promise<RouteInfo> {
  try {
    const directions = await fetchRouteDirections(pickupLat, pickupLon, dropLat, dropLon);
    return {
      distanceKm: directions.distanceKm,
      durationMinutes: directions.durationMinutes,
      method: directions.provider === 'ola' ? 'ola_maps_network' : 'osrm_road_network',
    };
  } catch {
    // Proceed to Haversine fallback
  }

  const aerialDistance = haversineDistance(pickupLat, pickupLon, dropLat, dropLon);
  const distanceKm = Math.max(1.0, Number((aerialDistance * 1.32).toFixed(2)));
  const durationMinutes = Math.max(5, Math.round((distanceKm / 22) * 60 + 4));

  return {
    distanceKm,
    durationMinutes,
    method: 'haversine_approximation',
  };
}
