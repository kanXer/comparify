import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { LocationPoint, RideOption } from '@/lib/types';

const BASE_URL = 'https://customer.rapido.bike';
const DEFAULT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2FhYjE4ZjcwN2M5ZjIxYTQyZjA1OTMiLCJmaXJzdE5hbWUiOiJTYWhpbCBTcml2YXN0YXZhIiwibGFzdE5hbWUiOiIiLCJtb2JpbGUiOiI5Njk2MjYyMDA3IiwiZW1haWwiOiIiLCJyb2xlcyI6WyJjdXN0b21lciJdLCJkZXZpY2VJZCI6IjQ0ZTE4ODE0NWJmMDRkNTRiZTI3YTViYmE5NjRlN2M4IiwidXNlcklkIjoiNjdhYWIxOGY3MDdjOWYyMWE0MmYwNTkzIiwic291cmNlIjoiYXBwIiwiaWF0IjoxNzkyNjEyMTE1LCJpc3MiOiJXVmdaS25PRnRhcXdtckxSeUUxRDdVdWpRNGdyVVZCUyJ9.KYM8dAYlH8ykRUCmTW4CU_9g3KoCvszdDW3cOxGkZ9c';

// Rapido Android APK (v8.130.0 / 549) "Thiqa" Crypto Parameters
const UDAB = 'QzU00HDHvacO8R9g1GV0/R/HfGHX3r3UnbOlp409wHU=';
const UDAB2 = 'IUABnZMEk+4ekgc96uYcMd/MrTiLYwr/aq1/8Kg939U=';
const AES_KEY = Buffer.from('a4af5e652626528de9dfe71c093c7427', 'hex');

export function getRapidoToken(): string {
  if (process.env.RAPIDO_TOKEN && process.env.RAPIDO_TOKEN.trim().length > 20) {
    return process.env.RAPIDO_TOKEN.trim();
  }

  // Check state files if available
  const candidatePaths = [
    '/home/kanxer/rapido_apk/rapido_state.json',
    path.join(process.cwd(), 'rapido_state.json'),
    path.join(process.cwd(), '..', 'rapido_apk', 'rapido_state.json'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.token && typeof parsed.token === 'string') {
          return parsed.token.trim();
        }
      }
    } catch {
      // Ignore file read error and check next candidate
    }
  }

  return DEFAULT_TOKEN;
}

function aesEncrypt(plainText: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-128-cbc', AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

function buildThiqaHeaders(bodyStr: string): Record<string, string> {
  const defaultUuid = crypto.randomUUID();
  const metaJson = JSON.stringify({ default: defaultUuid, deviceIntegrityId: '' });
  const ts = Date.now().toString();
  const requestId = crypto.randomUUID();

  // Template: maix-beon-zeyr-nela-keyn
  // maix: body, beon: ts, zeyr: requestId, nela: UDAB, keyn: metaJson
  const message = `${bodyStr}-${ts}-${requestId}-${UDAB}-${metaJson}`;
  const signature = crypto.createHmac('sha256', UDAB2).update(message).digest('base64');

  return {
    'x-km': aesEncrypt(ts),
    'x-m': aesEncrypt(signature),
    'x-ekref': aesEncrypt(requestId),
    'x-pm': aesEncrypt(metaJson),
  };
}

export interface RapidoOfficialResult {
  rides: RideOption[];
  rawQuotes: any[];
  success: boolean;
  error?: string;
  isOfficialApi: boolean;
}

/**
 * Fetches real-time live quotes directly from the official Rapido customer backend
 * using the reverse-engineered Android APK API and HMAC "Thiqa" signing.
 */
export async function fetchRapidoOfficialQuotes(params: {
  pickup: LocationPoint;
  drop: LocationPoint;
  distanceKm: number;
  durationMinutes: number;
  cityName?: string;
}): Promise<RapidoOfficialResult> {
  const { pickup, drop, distanceKm, durationMinutes, cityName = 'Gorakhpur' } = params;
  const simpleCity = cityName.split(',')[0].trim();
  const token = getRapidoToken();

  const payload = {
    pickupLocation: {
      address: pickup.address || 'Pickup Location',
      lat: Number(pickup.lat),
      lng: Number(pickup.lon),
      placeId: '',
      locationType: '',
      placeIdProvider: '',
      type: '',
      locationMode: null,
      locationConfidence: null,
    },
    dropLocation: {
      address: drop.address || 'Drop Location',
      lat: Number(drop.lat),
      lng: Number(drop.lon),
      placeId: '',
      locationType: '',
      placeIdProvider: '',
      type: '',
      locationMode: null,
      locationConfidence: null,
    },
    paymentType: 'CASH',
    upiAppName: null,
    customer: null,
    couponCode: null,
    locationAccuracy: 10.0,
    applyAutoAppliedOffer: false,
    checkUserRole: false,
    currentCity: simpleCity,
    scheduledRideTime: null,
    client: null,
    ridePreference: null,
    skipMultiFareEstimates: false,
    source: null,
    lastOrderCancellationTimestamp: null,
    wayPoints: [],
    bidDelta: null,
    dealScreenInteractedCountFromFE: null,
    isCorporate: false,
    serviceType: null,
  };

  const bodyStr = JSON.stringify(payload);
  const thiqa = buildThiqaHeaders(bodyStr);

  const headers: Record<string, string> = {
    'User-Agent': 'okhttp/4.12.0',
    Accept: 'application/json',
    appid: '2',
    appversion: '549',
    appversionstring: '8.130.0',
    app_variant: 'v8',
    'channel-host': 'android',
    'channel-entity': 'customer',
    'channel-name': 'app',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    key: 'r@pido333',
    ...thiqa,
  };

  try {
    const res = await fetch(`${BASE_URL}/android/v3/fare/estimates`, {
      method: 'POST',
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(18000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Rapido Official] API error ${res.status}: ${errText.slice(0, 100)}`);
      return {
        rides: [],
        rawQuotes: [],
        success: false,
        error: `Rapido Official API HTTP ${res.status}: ${errText.slice(0, 100)}`,
        isOfficialApi: true,
      };
    }

    const data = await res.json();
    const rawQuotes: any[] = Array.isArray(data?.quotes) ? data.quotes : [];

    if (rawQuotes.length === 0) {
      return {
        rides: [],
        rawQuotes: [],
        success: false,
        error: 'No active quotes returned by Rapido Official API for this route.',
        isOfficialApi: true,
      };
    }

    const rides: RideOption[] = [];
    const now = Date.now();

    // 1. Motorcycle (Bike)
    const bikeQuote = rawQuotes.find((q) => {
      const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
      return (name === 'bike' || name.startsWith('bike direct')) && !name.includes('lite') && !name.includes('parcel');
    });

    if (bikeQuote && typeof bikeQuote.amount === 'number') {
      rides.push({
        id: `rapido-bike-${now}`,
        provider: 'rapido',
        providerName: 'Rapido',
        providerLogo: '⚡',
        vehicleCategory: 'bike',
        vehicleName: 'Rapido Bike',
        description: 'Live quote from official Rapido customer backend',
        price: bikeQuote.amount,
        originalPrice: bikeQuote.subTotal || bikeQuote.amount,
        discountApplied: bikeQuote.discount || 0,
        currency: '₹',
        etaMinutes: bikeQuote.eta || 3,
        durationMinutes,
        distanceKm,
        rating: 4.7,
        capacity: 1,
        features: ['Live Official Quote', 'Helmet provided', 'Beat traffic'],
        isLiveRate: true,
        surgeMultiplier: (bikeQuote.surge || 0) > 0 ? 1.2 : 1,
        sourceUrl: 'https://rapido.bike/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 2. Auto (Prefer standard 'auto' first, exclude e-rickshaw or parcel)
    const autoQuote =
      rawQuotes.find((q) => {
        const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
        return name === 'auto';
      }) ||
      rawQuotes.find((q) => {
        const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
        return q.serviceType === 'auto' && !name.includes('rickshaw') && !name.includes('pet');
      });

    if (autoQuote && typeof autoQuote.amount === 'number') {
      rides.push({
        id: `rapido-auto-${now}`,
        provider: 'rapido',
        providerName: 'Rapido',
        providerLogo: '⚡',
        vehicleCategory: 'auto',
        vehicleName: 'Rapido Auto',
        description: 'Live quote from official Rapido customer backend',
        price: autoQuote.amount,
        originalPrice: autoQuote.subTotal || autoQuote.amount,
        discountApplied: autoQuote.discount || 0,
        currency: '₹',
        etaMinutes: autoQuote.eta || 4,
        durationMinutes,
        distanceKm,
        rating: 4.7,
        capacity: 3,
        features: ['Live Official Quote', 'Doorstep pickup', 'Meter-free'],
        isLiveRate: true,
        surgeMultiplier: (autoQuote.surge || 0) > 0 ? 1.2 : 1,
        sourceUrl: 'https://rapido.bike/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 3. Cab Economy
    const cabEcoQuote = rawQuotes.find((q) => {
      const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
      return (
        name === 'cab economy' ||
        name === 'cab non ac' ||
        name === 'cab ac' ||
        q.serviceType === 'cab_economy' ||
        q.serviceType === 'cab_ac'
      );
    });

    if (cabEcoQuote && typeof cabEcoQuote.amount === 'number') {
      rides.push({
        id: `rapido-cab-${now}`,
        provider: 'rapido',
        providerName: 'Rapido',
        providerLogo: '⚡',
        vehicleCategory: 'cab',
        vehicleName: 'Rapido Cab Economy',
        description: 'Live quote from official Rapido customer backend',
        price: cabEcoQuote.amount,
        originalPrice: cabEcoQuote.subTotal || cabEcoQuote.amount,
        discountApplied: cabEcoQuote.discount || 0,
        currency: '₹',
        etaMinutes: cabEcoQuote.eta || 5,
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 4,
        features: ['Live Official Quote', 'AC Compact Cab', 'Verified driver'],
        isLiveRate: true,
        surgeMultiplier: (cabEcoQuote.surge || 0) > 0 ? 1.2 : 1,
        sourceUrl: 'https://rapido.bike/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 4. Cab Premium
    const cabPremQuote = rawQuotes.find((q) => {
      const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
      return name === 'cab premium' || q.serviceType === 'cab_premium';
    });

    if (cabPremQuote && typeof cabPremQuote.amount === 'number') {
      rides.push({
        id: `rapido-cab_premium-${now}`,
        provider: 'rapido',
        providerName: 'Rapido',
        providerLogo: '⚡',
        vehicleCategory: 'cab_premium',
        vehicleName: 'Rapido Cab Premium',
        description: 'Live quote from official Rapido customer backend',
        price: cabPremQuote.amount,
        originalPrice: cabPremQuote.subTotal || cabPremQuote.amount,
        discountApplied: cabPremQuote.discount || 0,
        currency: '₹',
        etaMinutes: cabPremQuote.eta || 5,
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 4,
        features: ['Live Official Quote', 'Prime Sedan', 'Spacious & Clean'],
        isLiveRate: true,
        surgeMultiplier: (cabPremQuote.surge || 0) > 0 ? 1.2 : 1,
        sourceUrl: 'https://rapido.bike/',
        isCheapest: false,
        isFastest: false,
      });
    }

    // 5. Cab XL
    const cabXLQuote = rawQuotes.find((q) => {
      const name = (q.serviceDisplayName || q.serviceName || '').toLowerCase().trim();
      return name === 'cab xl' || q.serviceType === 'suv';
    });

    if (cabXLQuote && typeof cabXLQuote.amount === 'number') {
      rides.push({
        id: `rapido-cab_xl-${now}`,
        provider: 'rapido',
        providerName: 'Rapido',
        providerLogo: '⚡',
        vehicleCategory: 'cab_xl',
        vehicleName: 'Rapido Cab XL',
        description: 'Live quote from official Rapido customer backend',
        price: cabXLQuote.amount,
        originalPrice: cabXLQuote.subTotal || cabXLQuote.amount,
        discountApplied: cabXLQuote.discount || 0,
        currency: '₹',
        etaMinutes: cabXLQuote.eta || 6,
        durationMinutes,
        distanceKm,
        rating: 4.8,
        capacity: 6,
        features: ['Live Official Quote', '6-7 Seater SUV', 'Extra luggage space'],
        isLiveRate: true,
        surgeMultiplier: (cabXLQuote.surge || 0) > 0 ? 1.2 : 1,
        sourceUrl: 'https://rapido.bike/',
        isCheapest: false,
        isFastest: false,
      });
    }

    return {
      rides,
      rawQuotes,
      success: rides.length > 0,
      isOfficialApi: true,
    };
  } catch (err: any) {
    console.warn('[Rapido Official] Error calling API:', err.message);
    return {
      rides: [],
      rawQuotes: [],
      success: false,
      error: `Rapido Official API Error: ${err.message}`,
      isOfficialApi: true,
    };
  }
}
