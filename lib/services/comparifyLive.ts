import crypto from 'crypto';
import axios from 'axios';
import { LocationPoint, RideOption, VehicleCategory } from '@/lib/types';

const COMPARIFY_SECRET = 'zf02229nWedAlAANh37z1sSBzgIrCxGS';
const COMPARIFY_API_URL = 'https://cabs.comparify.pro/api/cabs/compare';

const OBFUSCATION_MAP: Record<string, string> = {
  'cab-pickup-location': 'comparify:transport:cab-pickup-location',
  'cab-drop-location': 'comparify:transport:cab-drop-location',
  'cab-response': 'comparify:transport:cab-response',
};

/**
 * Transport obfuscation stream cipher matching comparify.pro module 869
 */
function obfuscateTransportValue(key: string, value: string, timestamp: string): string {
  const secretKey = OBFUSCATION_MAP[key];
  if (!secretKey) return value;
  const f = `${timestamp}:${secretKey}`;
  let hexOut = '';
  for (let i = 0; i < value.length; i++) {
    const xorCode = value.charCodeAt(i) ^ f.charCodeAt(i % f.length);
    hexOut += xorCode.toString(16).padStart(4, '0');
  }
  return `ct1.${key}.${hexOut}`;
}

/**
 * Transport de-obfuscation stream cipher matching comparify.pro module 869
 */
function decodeTransportValue(key: string, obfuscated: string, timestamp: string): string {
  const prefix = `ct1.${key}.`;
  if (!obfuscated || !obfuscated.startsWith(prefix)) return obfuscated;
  const hexBody = obfuscated.slice(prefix.length);
  const secretKey = OBFUSCATION_MAP[key];
  if (!secretKey) return obfuscated;
  const f = `${timestamp}:${secretKey}`;
  let decoded = '';
  for (let i = 0; i < hexBody.length; i += 4) {
    const chunk = parseInt(hexBody.slice(i, i + 4), 16);
    const charCode = f.charCodeAt((i / 4) % f.length);
    decoded += String.fromCharCode(chunk ^ charCode);
  }
  return decoded;
}

export interface ComparifyRawQuote {
  provider: string; // 'rapido' | 'bharat-taxi' | 'uber' | 'ola'
  serviceId?: string;
  parentServiceId?: string;
  serviceName: string;
  category: string;
  amount: number;
  preAdjustmentAmount?: number;
  eta?: number;
  surge?: number;
  discount?: number;
  offerApplied?: boolean;
  offerText?: string;
  deeplinkUrl?: string;
  webUrl?: string;
}

export interface ComparifyLiveResult {
  rapidoRides: RideOption[];
  bharatTaxiRides: RideOption[];
  rawQuotes: ComparifyRawQuote[];
  direction?: { timeInMins: number };
  success: boolean;
  debugError?: string;
  statusCode?: number;
}

// In-memory cache for live quotes to prevent hitting API rate limits (90 seconds TTL)
interface CachedQuotes {
  result: ComparifyLiveResult;
  expiresAt: number;
}
const quotesCache = new Map<string, CachedQuotes>();

/**
 * Fetches real-time live quotes for Rapido and Bharat Taxi directly from comparify.pro API
 */
export async function fetchComparifyLiveFares(params: {
  pickup: LocationPoint;
  drop: LocationPoint;
  distanceKm: number;
  durationMinutes: number;
  clientIp?: string;
}): Promise<ComparifyLiveResult> {
  const { pickup, drop, distanceKm, durationMinutes } = params;

  // 1. Check in-memory route cache first to avoid 429 rate limiting
  const cacheKey = `${Number(pickup.lat).toFixed(3)},${Number(pickup.lon).toFixed(3)}->${Number(drop.lat).toFixed(3)},${Number(drop.lon).toFixed(3)}`;
  const cached = quotesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && cached.result.success) {
    return cached.result;
  }

  let payload: any = null;
  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto
        .createHmac('sha256', COMPARIFY_SECRET)
        .update(timestamp + COMPARIFY_SECRET)
        .digest('hex');

      const obfPickup = obfuscateTransportValue(
        'cab-pickup-location',
        JSON.stringify({
          address: pickup.address,
          lat: pickup.lat,
          lng: pickup.lon,
        }),
        timestamp
      );

      const obfDrop = obfuscateTransportValue(
        'cab-drop-location',
        JSON.stringify({
          address: drop.address,
          lat: drop.lat,
          lng: drop.lon,
        }),
        timestamp
      );

      const reqHeaders: Record<string, string> = {
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'X-Client-State': '1',
        'X-App-Version': '2.0.2',
        'User-Agent': 'okhttp/4.9.2',
        Accept: 'application/json, text/plain, */*',
      };

      const res = await axios.get(COMPARIFY_API_URL, {
        params: {
          pickupLocation: obfPickup,
          dropLocation: obfDrop,
          includeServerResults: '1',
        },
        headers: reqHeaders,
        timeout: 8000,
      });

      payload = res.data;
      if (payload && typeof payload.payload === 'string') {
        const decodedStr = decodeTransportValue('cab-response', payload.payload, timestamp);
        payload = JSON.parse(decodedStr);
      }

      if (Array.isArray(payload?.quotes) && payload.quotes.length > 0) {
        break; // Successfully got live quotes
      }
    } catch (err: any) {
      lastError = err;
      const isRateLimited =
        err.response?.status === 429 ||
        err.response?.data?.statusCode === 429 ||
        err.response?.data?.error === 'Too Many Requests';

      if (isRateLimited) {
        break; // Do not retry if rate limited
      }

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  try {
    const quotes: ComparifyRawQuote[] = Array.isArray(payload?.quotes) ? payload.quotes : [];
    if (quotes.length === 0) {
      let debugMsg = 'No active quotes returned for this route.';
      let statusCode = 502;
      if (lastError) {
        const status = lastError.response?.status;
        const data = lastError.response?.data;
        const isRateLimited =
          status === 429 ||
          data?.statusCode === 429 ||
          data?.error === 'Too Many Requests' ||
          data?.message?.includes('temporarily blocked');

        if (isRateLimited) {
          statusCode = 429;
          debugMsg = 'Live API rate limit reached (Too Many Requests). Please wait 30 seconds and retry.';
        } else {
          let snippet = '';
          if (typeof data === 'string') {
            snippet = data
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 160);
          } else if (data) {
            snippet = JSON.stringify(data).slice(0, 160);
          }
          statusCode = status || 502;
          debugMsg = `Live Comparify API: HTTP ${status || 'ERR'} [${snippet || lastError.message}]`;
        }
        console.warn('[ComparifyLive] Network/API Error:', debugMsg);
      } else if (payload?.message || payload?.error) {
        debugMsg = payload.message || payload.error;
      }
      return {
        rapidoRides: [],
        bharatTaxiRides: [],
        rawQuotes: [],
        success: false,
        debugError: debugMsg,
        statusCode,
      };
    }

    const estimatedDuration = Math.round(payload.direction?.timeInMins || durationMinutes);

    // Filter and map Rapido quotes
    const rapidoRides: RideOption[] = [];
    // 1. Motorcycle (Ignore 'Bike Lite' if present)
    const rapidoBikeQuote = quotes.find(
      (q) =>
        q.provider === 'rapido' &&
        (q.serviceName === 'Bike' || (q.category === 'Bike' && !q.serviceName.toLowerCase().includes('lite')))
    );
    if (rapidoBikeQuote) {
      rapidoRides.push(buildRideOption('rapido', 'bike', rapidoBikeQuote, distanceKm, estimatedDuration));
    }

    // 2. Auto
    const rapidoAutoQuote = quotes.find(
      (q) => q.provider === 'rapido' && (q.serviceName === 'Auto' || q.category === 'Auto')
    );
    if (rapidoAutoQuote) {
      rapidoRides.push(buildRideOption('rapido', 'auto', rapidoAutoQuote, distanceKm, estimatedDuration));
    }

    // 3. Cab Eco (Economy / Mini)
    const rapidoCabEcoQuote = quotes.find(
      (q) =>
        q.provider === 'rapido' &&
        (q.serviceName.toLowerCase().includes('economy') || q.category === 'Cab Economy')
    );
    if (rapidoCabEcoQuote) {
      rapidoRides.push(buildRideOption('rapido', 'cab', rapidoCabEcoQuote, distanceKm, estimatedDuration));
    }

    // 4. Cab Premium (Sedan / Prime)
    const rapidoCabPremQuote = quotes.find(
      (q) =>
        q.provider === 'rapido' &&
        (q.serviceName.toLowerCase().includes('premium') || q.category === 'Cab Premium')
    );
    if (rapidoCabPremQuote) {
      rapidoRides.push(buildRideOption('rapido', 'cab_premium', rapidoCabPremQuote, distanceKm, estimatedDuration));
    }

    // 5. Cab XL (6-Seater / SUV)
    const rapidoCabXLQuote = quotes.find(
      (q) =>
        q.provider === 'rapido' &&
        (q.serviceName.toLowerCase().includes('xl') || q.category === 'Cab XL')
    );
    if (rapidoCabXLQuote) {
      rapidoRides.push(buildRideOption('rapido', 'cab_xl', rapidoCabXLQuote, distanceKm, estimatedDuration));
    }

    // Filter and map Bharat Taxi quotes (provider: 'bharat-taxi')
    const bharatTaxiRides: RideOption[] = [];
    // 1. Motorcycle
    const btBikeQuote = quotes.find(
      (q) =>
        (q.provider === 'bharat-taxi' || q.provider === 'bharat_taxi') &&
        (q.serviceName.toLowerCase().includes('bike') || q.category === 'Bike')
    );
    if (btBikeQuote) {
      bharatTaxiRides.push(buildRideOption('bharat_taxi', 'bike', btBikeQuote, distanceKm, estimatedDuration));
    }

    // 2. Auto
    const btAutoQuote = quotes.find(
      (q) =>
        (q.provider === 'bharat-taxi' || q.provider === 'bharat_taxi') &&
        (q.serviceName.toLowerCase().includes('auto') || q.category === 'Auto')
    );
    if (btAutoQuote) {
      bharatTaxiRides.push(buildRideOption('bharat_taxi', 'auto', btAutoQuote, distanceKm, estimatedDuration));
    }

    // 3. Cab Eco
    const btCabEcoQuote = quotes.find(
      (q) =>
        (q.provider === 'bharat-taxi' || q.provider === 'bharat_taxi') &&
        (q.serviceName.toLowerCase().includes('economy') || q.category === 'Cab Economy')
    );
    if (btCabEcoQuote) {
      bharatTaxiRides.push(buildRideOption('bharat_taxi', 'cab', btCabEcoQuote, distanceKm, estimatedDuration));
    }

    // 4. Cab Premium: Strict Rule: Record the Sedan price for Bharat Taxi (Ignore 'Priority' cab)
    const btSedanQuote = quotes.find(
      (q) =>
        (q.provider === 'bharat-taxi' || q.provider === 'bharat_taxi') &&
        q.serviceName.toLowerCase().includes('sedan')
    );
    if (btSedanQuote) {
      bharatTaxiRides.push(buildRideOption('bharat_taxi', 'cab_premium', btSedanQuote, distanceKm, estimatedDuration));
    }

    // 5. Cab XL
    const btCabXLQuote = quotes.find(
      (q) =>
        (q.provider === 'bharat-taxi' || q.provider === 'bharat_taxi') &&
        (q.serviceName.toLowerCase().includes('xl') ||
          q.serviceName.toLowerCase().includes('suv') ||
          q.category === 'Cab XL')
    );
    if (btCabXLQuote) {
      bharatTaxiRides.push(buildRideOption('bharat_taxi', 'cab_xl', btCabXLQuote, distanceKm, estimatedDuration));
    }

    const finalResult: ComparifyLiveResult = {
      rapidoRides,
      bharatTaxiRides,
      rawQuotes: quotes,
      direction: payload.direction,
      success: rapidoRides.length > 0 || bharatTaxiRides.length > 0,
    };

    if (finalResult.success) {
      // Cache valid live quotes for 90 seconds
      quotesCache.set(cacheKey, { result: finalResult, expiresAt: Date.now() + 90000 });
    }

    return finalResult;
  } catch (error: any) {
    console.warn('[ComparifyLive] Error fetching live quotes:', error.message);
    return {
      rapidoRides: [],
      bharatTaxiRides: [],
      rawQuotes: [],
      success: false,
    };
  }
}

function buildRideOption(
  provider: 'rapido' | 'bharat_taxi',
  category: VehicleCategory,
  quote: ComparifyRawQuote,
  distanceKm: number,
  durationMinutes: number
): RideOption {
  const isRapido = provider === 'rapido';
  const providerName = isRapido ? 'Rapido' : 'Bharat Taxi';
  const providerLogo = isRapido ? '⚡' : '🚕';

  let vehicleName = quote.serviceName;
  if (!isRapido && category === 'cab_premium') {
    vehicleName = 'Bharat Taxi Sedan';
  } else if (!isRapido && category === 'cab_xl') {
    vehicleName = 'Bharat Taxi XL';
  } else if (!isRapido && category === 'cab') {
    vehicleName = 'Bharat Taxi Economy';
  } else if (!isRapido && category === 'bike') {
    vehicleName = 'Bharat Taxi Bike';
  } else if (!isRapido && category === 'auto') {
    vehicleName = 'Bharat Taxi Auto';
  }

  const capacity =
    category === 'bike' ? 1 : category === 'auto' ? 3 : category === 'cab_xl' ? 6 : 4;

  const features =
    category === 'bike'
      ? ['Live Real-Time Quote', 'Helmet provided', 'Beat traffic']
      : category === 'auto'
      ? ['Live Real-Time Quote', 'Doorstep pickup', 'Meter-free']
      : category === 'cab_xl'
      ? ['Live Real-Time Quote', '6-7 Seater SUV', 'Extra luggage space', 'Air conditioned']
      : category === 'cab_premium'
      ? ['Live Real-Time Quote', 'Prime Sedan', 'Clean car', 'Air conditioned']
      : ['Live Real-Time Quote', 'Budget AC ride', 'Verified driver'];

  return {
    id: `${provider}-${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    provider,
    providerName,
    providerLogo,
    vehicleCategory: category,
    vehicleName,
    description: `Live quote from ${providerName} (${quote.serviceName})`,
    price: Number(quote.amount),
    originalPrice: quote.preAdjustmentAmount || (quote.discount ? quote.amount + quote.discount : undefined),
    discountApplied: quote.discount || 0,
    currency: '₹',
    etaMinutes: quote.eta || (category === 'bike' ? 2 : category === 'auto' ? 3 : 5),
    durationMinutes,
    distanceKm,
    rating: isRapido ? 4.7 : 4.8,
    capacity,
    features,
    isLiveRate: true,
    surgeMultiplier: quote.surge || 1.0,
    sourceUrl: quote.webUrl || (isRapido ? 'https://www.rapido.bike/' : 'https://bharattaxiapp.com/'),
  };
}
