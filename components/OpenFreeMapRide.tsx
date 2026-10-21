'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass,
  Check,
  RefreshCw,
  Navigation,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { LocationPoint } from '@/lib/types';
import { CITY_FOCAL_COORDINATES } from '@/lib/localitiesData';
import axios from 'axios';

interface OpenFreeMapRideProps {
  city: string;
  theme?: 'light' | 'dark';
  pickupPoint?: LocationPoint;
  dropPoint?: LocationPoint;
  isCollapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  onSetPickup: (point: LocationPoint) => void;
  onSetDrop: (point: LocationPoint) => void;
}

// Ola Maps Vector Styles with API Key & Fallback
const OLA_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY ||
  'vEkQvM8ZfTCOm6aTH3uEzo67o7IYQRhY1Nd7ilDU';

const OLA_STYLE_LIGHT = `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_MAPS_API_KEY}`;
const OLA_STYLE_DARK = `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${OLA_MAPS_API_KEY}`;

// Fallback Free Street Map Styles for MapLibre GL JS (if offline or backup)
const STREET_STYLE_LIGHT: any = {
  version: 8,
  sources: {
    'street-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    {
      id: 'street-tiles-layer',
      type: 'raster',
      source: 'street-tiles',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const STREET_STYLE_DARK: any = {
  version: 8,
  sources: {
    'street-tiles-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    {
      id: 'street-tiles-dark-layer',
      type: 'raster',
      source: 'street-tiles-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export default function OpenFreeMapRide({
  city,
  theme = 'light',
  pickupPoint,
  dropPoint,
  isCollapsed: controlledCollapsed,
  defaultCollapsed = true,
  onToggleCollapse,
  onSetPickup,
  onSetDrop,
}: OpenFreeMapRideProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isMapCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const nextVal = !isMapCollapsed;
    setInternalCollapsed(nextVal);
    onToggleCollapse?.(nextVal);
    if (!nextVal) {
      setTimeout(() => {
        mapInstanceRef.current?.resize();
        fitCurrentRoute();
      }, 50);
      setTimeout(() => {
        mapInstanceRef.current?.resize();
        fitCurrentRoute();
      }, 250);
    }
  };

  // Resize and fit route whenever map is expanded
  useEffect(() => {
    if (!isMapCollapsed && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.resize();
        fitCurrentRoute();
      }, 50);
    }
  }, [isMapCollapsed]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const maplibreglRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropMarkerRef = useRef<any>(null);
  const isStyleLoadedRef = useRef(false);

  const [activePinMode, setActivePinMode] = useState<'pickup' | 'drop'>('pickup');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [routeStats, setRouteStats] = useState<{ distanceKm: string; durationMin: number } | null>(null);

  const getCityCenter = useCallback((): [number, number] => {
    const slug = city.split(',')[0].trim().toLowerCase();
    const focal = CITY_FOCAL_COORDINATES[slug] || [26.7606, 83.3732];
    return [focal[0], focal[1]];
  }, [city]);

  // Reverse Geocoder (Ola Maps via Server Route with OSM fallback)
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      setIsReverseGeocoding(true);

      // 1. Try Ola Maps reverse geocoding via secure server route
      try {
        const olaRes = await axios.get('/api/geocode', {
          params: { action: 'reverse', lat, lon },
          timeout: 3000,
        });
        if (olaRes.data && olaRes.data.address) {
          return olaRes.data.address.split(',').slice(0, 3).join(', ').trim();
        }
      } catch {
        // Fallback to OSM
      }

      // 2. OSM Nominatim fallback
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon, format: 'json' },
        headers: { 'User-Agent': 'CamparifyMapLibre/3.0 (ridefare@comparify.local)' },
        timeout: 3500,
      });

      if (res.data && res.data.display_name) {
        return res.data.display_name.split(',').slice(0, 3).join(', ').trim();
      }
    } catch {
      // ignore
    } finally {
      setIsReverseGeocoding(false);
    }
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  };

  // High-contrast, custom DOM element for MapLibre Marker
  const createPinElement = (type: 'pickup' | 'drop', label: string) => {
    const el = document.createElement('div');
    el.className = `custom-maplibre-pin custom-maplibre-pin-${type}`;
    const isPickup = type === 'pickup';
    const color = isPickup ? '#2563eb' : '#e11d48';
    const pulseBg = isPickup ? 'rgba(37, 99, 235, 0.35)' : 'rgba(225, 29, 72, 0.35)';
    const shortLabel = label.split(',')[0].trim() || (isPickup ? 'Pickup' : 'Drop');

    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab; user-select: none;">
        <!-- Floating Label Badge -->
        <div style="
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 9999px;
          border: 1.5px solid ${color};
          white-space: nowrap;
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${color};"></span>
          <span>${isPickup ? 'Pickup: ' : 'Drop: '}${shortLabel}</span>
        </div>

        <!-- Pin Head with Pulsing Halo -->
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            inset: -5px;
            border-radius: 50%;
            background: ${pulseBg};
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${color}, ${isPickup ? '#1d4ed8' : '#be123c'});
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 12px;
            font-weight: 900;
            z-index: 2;
          ">
            ${isPickup ? 'P' : 'D'}
          </div>
        </div>

        <!-- Needle Point -->
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${color};
          margin-top: -2px;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
        "></div>
      </div>
    `;
    return el;
  };

  // 1. Initialize MapLibre GL JS Street Map
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        const maplibreglModule: any = await import('maplibre-gl');
        const maplibregl = maplibreglModule.default || maplibreglModule;
        maplibreglRef.current = maplibregl;

        // Set worker URL if available
        try {
          if (typeof window !== 'undefined') {
            maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
          }
        } catch {
          // ignore
        }

        if (!isMounted || !mapContainerRef.current) return;

        const container = mapContainerRef.current;
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // ignore
          }
          mapInstanceRef.current = null;
        }
        container.innerHTML = '';
        isStyleLoadedRef.current = false;

        const [centerLat, centerLon] = getCityCenter();
        const olaStyle = theme === 'dark' ? OLA_STYLE_DARK : OLA_STYLE_LIGHT;
        const fallbackStyle = theme === 'dark' ? STREET_STYLE_DARK : STREET_STYLE_LIGHT;

        const map = new maplibregl.Map({
          container,
          style: olaStyle,
          center: [centerLon, centerLat], // MapLibre center: [lon, lat]
          zoom: 13,
          pitch: 0, // Flat overhead 2D view for exact coordinate & marker alignment
          bearing: 0,
          attributionControl: false,
          transformRequest: (url: string) => {
            if (url.includes('api.olamaps.io') && !url.includes('api_key=')) {
              const separator = url.includes('?') ? '&' : '?';
              return {
                url: `${url}${separator}api_key=${OLA_MAPS_API_KEY}`,
              };
            }
            return { url };
          },
        });

        // Fallback to raster street style if Ola Maps vector tiles encounter any key or network error
        map.on('error', (e: any) => {
          if (!isStyleLoadedRef.current && (e?.error?.status === 401 || e?.error?.status === 403)) {
            console.warn('[MapLibre] Ola Maps vector style auth error, falling back to street style', e);
            try {
              map.setStyle(fallbackStyle);
            } catch {
              // ignore
            }
          }
        });

        // Add standard navigation controls (zoom, compass, pitch rotation)
        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            visualizePitch: true,
          }),
          'top-right'
        );

        map.on('load', () => {
          if (!isMounted) return;
          isStyleLoadedRef.current = true;
          setIsMapReady(true);
          map.resize();
        });

        map.on('styledata', () => {
          if (!isMounted) return;
          isStyleLoadedRef.current = true;
        });

        mapInstanceRef.current = map;

        // Staggered resize to guarantee rendering
        const resize = () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.resize();
          }
        };
        setTimeout(resize, 100);
        setTimeout(resize, 400);
        setTimeout(resize, 1000);

        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            resize();
          });
          observer.observe(container);
        }
      } catch (err) {
        console.error('[MapLibre GL] Init error:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      isStyleLoadedRef.current = false;
      pickupMarkerRef.current = null;
      dropMarkerRef.current = null;
    };
  }, [theme, getCityCenter]);

  // 2. Smooth FlyTo when City Changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const [centerLat, centerLon] = getCityCenter();
    map.flyTo({
      center: [centerLon, centerLat],
      zoom: 13,
      essential: true,
      duration: 1000,
    });
  }, [city, getCityCenter]);

  // 3. Click Map to Drop Pins with Reverse Geocoding
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e: any) => {
      const { lng, lat } = e.lngLat;
      const address = await reverseGeocode(lat, lng);
      const point: LocationPoint = { address, lat, lon: lng, city, displayName: `${address}, ${city}` };

      if (activePinMode === 'pickup') {
        onSetPickup(point);
        setActivePinMode('drop'); // Automatically shift to drop next
      } else {
        onSetDrop(point);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [activePinMode, city, onSetPickup, onSetDrop]);

  // 4. Update Markers & GeoJSON Real Driving Route Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !isMapReady) return;

    // A. Pickup Marker
    if (pickupPoint && pickupPoint.lat && pickupPoint.lon && pickupPoint.lat !== 0 && pickupPoint.lon !== 0) {
      const lngLat = [pickupPoint.lon, pickupPoint.lat];

      if (!pickupMarkerRef.current) {
        const pinEl = createPinElement('pickup', pickupPoint.address);
        const marker = new maplibregl.Marker({
          element: pinEl,
          draggable: true,
          anchor: 'bottom',
        })
          .setLngLat(lngLat)
          .addTo(map);

        marker.on('dragend', async () => {
          const pos = marker.getLngLat();
          const address = await reverseGeocode(pos.lat, pos.lng);
          onSetPickup({ address, lat: pos.lat, lon: pos.lng, city, displayName: `${address}, ${city}` });
        });

        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setLngLat(lngLat);
        const newEl = createPinElement('pickup', pickupPoint.address);
        const currentMarker = pickupMarkerRef.current;
        const currentEl = currentMarker.getElement();
        if (currentEl) {
          currentEl.innerHTML = newEl.innerHTML;
        }
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // B. Drop Marker
    if (dropPoint && dropPoint.lat && dropPoint.lon && dropPoint.lat !== 0 && dropPoint.lon !== 0) {
      const lngLat = [dropPoint.lon, dropPoint.lat];

      if (!dropMarkerRef.current) {
        const pinEl = createPinElement('drop', dropPoint.address);
        const marker = new maplibregl.Marker({
          element: pinEl,
          draggable: true,
          anchor: 'bottom',
        })
          .setLngLat(lngLat)
          .addTo(map);

        marker.on('dragend', async () => {
          const pos = marker.getLngLat();
          const address = await reverseGeocode(pos.lat, pos.lng);
          onSetDrop({ address, lat: pos.lat, lon: pos.lng, city, displayName: `${address}, ${city}` });
        });

        dropMarkerRef.current = marker;
      } else {
        dropMarkerRef.current.setLngLat(lngLat);
        const newEl = createPinElement('drop', dropPoint.address);
        const currentMarker = dropMarkerRef.current;
        const currentEl = currentMarker.getElement();
        if (currentEl) {
          currentEl.innerHTML = newEl.innerHTML;
        }
      }
    } else if (dropMarkerRef.current) {
      dropMarkerRef.current.remove();
      dropMarkerRef.current = null;
    }

    // C. Route Layer (GeoJSON Road Geometry from OSRM)
    const hasValidPickup = pickupPoint && pickupPoint.lat && pickupPoint.lon && pickupPoint.lat !== 0;
    const hasValidDrop = dropPoint && dropPoint.lat && dropPoint.lon && dropPoint.lat !== 0;

    if (hasValidPickup && hasValidDrop) {
      const pLat = pickupPoint!.lat;
      const pLon = pickupPoint!.lon;
      const dLat = dropPoint!.lat;
      const dLon = dropPoint!.lon;

      let isCurrent = true;

      const updateRoute = async () => {
        let routeCoordinates: [number, number][] = [
          [pLon, pLat],
          [dLon, dLat],
        ];

        try {
          // 1. Fetch directions from server route (Ola Maps vector routing with OSRM fallback)
          const res = await axios.get('/api/directions', {
            params: { pLat, pLon, dLat, dLon },
            timeout: 5000,
          });

          if (
            res.data?.success &&
            Array.isArray(res.data.coordinates) &&
            res.data.coordinates.length > 1
          ) {
            routeCoordinates = res.data.coordinates;
            const km = typeof res.data.distanceKm === 'number' ? res.data.distanceKm.toFixed(1) : String(res.data.distanceKm);
            const mins = res.data.durationMinutes || Math.max(3, Math.round(Number(km) * 2.5));
            if (isCurrent) {
              setRouteStats({ distanceKm: km, durationMin: mins });
            }
          }
        } catch {
          // 2. Direct client OSRM fallback
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=full&geometries=geojson`;
            const osrmRes = await axios.get(osrmUrl, { timeout: 4500 });
            if (osrmRes.data?.code === 'Ok' && osrmRes.data.routes?.[0]?.geometry?.coordinates) {
              const osrmCoords = osrmRes.data.routes[0].geometry.coordinates;
              routeCoordinates = [
                [pLon, pLat],
                ...osrmCoords,
                [dLon, dLat],
              ];
              const km = (osrmRes.data.routes[0].distance / 1000).toFixed(1);
              const mins = Math.max(3, Math.round(osrmRes.data.routes[0].duration / 60));
              if (isCurrent) {
                setRouteStats({ distanceKm: km, durationMin: mins });
              }
            }
          } catch {
            if (isCurrent) {
              setRouteStats(null);
            }
          }
        }

        if (!isCurrent || !mapInstanceRef.current || !isStyleLoadedRef.current) return;

        const m = mapInstanceRef.current;
        const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        };

        try {
          if (m.getSource('route-source')) {
            (m.getSource('route-source') as any).setData(geojsonData);
          } else {
            m.addSource('route-source', {
              type: 'geojson',
              data: geojsonData,
            });

            // Outer line glow
            m.addLayer({
              id: 'route-glow',
              type: 'line',
              source: 'route-source',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#60a5fa',
                'line-width': 8,
                'line-opacity': 0.45,
              },
            });

            // Inner vibrant driving route
            m.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route-source',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#2563eb',
                'line-width': 4,
                'line-opacity': 0.95,
              },
            });
          }

          // Smooth fit bounds with padding
          const bounds = new maplibregl.LngLatBounds();
          routeCoordinates.forEach((coord) => bounds.extend(coord));
          m.fitBounds(bounds, {
            padding: 80,
            maxZoom: 15,
            duration: 1000,
          });
        } catch (e) {
          // ignore layer conflict if style reloading
        }
      };

      updateRoute();

      return () => {
        isCurrent = false;
      };
    } else {
      setRouteStats(null);
      const m = mapInstanceRef.current;
      if (m && isStyleLoadedRef.current) {
        try {
          if (m.getLayer('route-line')) m.removeLayer('route-line');
          if (m.getLayer('route-glow')) m.removeLayer('route-glow');
          if (m.getSource('route-source')) m.removeSource('route-source');
        } catch {
          // ignore
        }
      }

      if (hasValidPickup && map) {
        map.flyTo({ center: [pickupPoint!.lon, pickupPoint!.lat], zoom: 14, duration: 800 });
      } else if (hasValidDrop && map) {
        map.flyTo({ center: [dropPoint!.lon, dropPoint!.lat], zoom: 14, duration: 800 });
      }
    }
  }, [pickupPoint, dropPoint, city, isMapReady, onSetPickup, onSetDrop]);

  const recenterMap = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const [centerLat, centerLon] = getCityCenter();
    map.flyTo({
      center: [centerLon, centerLat],
      zoom: 13,
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  };

  const fitCurrentRoute = () => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl) return;

    if (pickupPoint?.lat && dropPoint?.lat) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([pickupPoint.lon, pickupPoint.lat]);
      bounds.extend([dropPoint.lon, dropPoint.lat]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
    } else {
      recenterMap();
    }
  };

  return (
    <div
      className={`rounded-3xl border shadow-xl relative transition-all duration-300 ${
        isMapCollapsed ? 'p-3.5 sm:p-4 my-3' : 'p-4 sm:p-5 my-6'
      } ${
        theme === 'light'
          ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
          : 'bg-gray-900/90 border-white/10 text-white shadow-2xl'
      }`}
    >
      {/* MapLibre Canvas Viewport Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .maplibregl-map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; border-radius: 1rem; overflow: hidden; font-family: inherit; }
        .maplibregl-canvas-container { width: 100%; height: 100%; }
        .maplibregl-ctrl-top-right { top: 12px; right: 12px; }
        .maplibregl-ctrl-group { border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; border: 1px solid rgba(0,0,0,0.1) !important; overflow: hidden; }
        .dark .maplibregl-ctrl-group { background: #1e293b !important; border-color: rgba(255,255,255,0.1) !important; }
        .dark .maplibregl-ctrl-group button { border-bottom-color: rgba(255,255,255,0.1) !important; }
        .dark .maplibregl-ctrl-icon { filter: invert(1); }
      ` }} />

      {/* Map Header */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isMapCollapsed ? '' : `pb-3 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
            <h3 className="text-sm font-bold tracking-wide">
              Ola Maps 3D View &bull; {city.split(',')[0]}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ola Maps Vector 3D
            </span>

            {/* Collapsed Badge & Inline Distance Summary */}
            {isMapCollapsed && (
              <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 flex items-center gap-1">
                <EyeOff className="w-3 h-3 text-slate-400" /> Map Collapsed
              </span>
            )}
            {isMapCollapsed && routeStats && (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                {routeStats.distanceKm} KM &bull; ~{routeStats.durationMin} mins
              </span>
            )}

            {isReverseGeocoding && (
              <span className="text-[10px] text-emerald-500 animate-pulse font-medium">
                Locating pin with Ola Maps...
              </span>
            )}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}
          >
            Powered by Ola Maps Vector Tiles &bull; Click to drop pins, drag markers, or rotate 3D view
          </p>
        </div>

        {/* Action Controls: Pin Placer Mode, Recenter & Collapse Toggle */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          {!isMapCollapsed && (
            <div
              className={`flex items-center p-1 rounded-xl border ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200'
                  : 'bg-gray-950/80 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setActivePinMode('pickup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activePinMode === 'pickup'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                <span>Pickup</span>
                {activePinMode === 'pickup' && <Check className="w-3 h-3 text-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setActivePinMode('drop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activePinMode === 'drop'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                <span>Drop</span>
                {activePinMode === 'drop' && <Check className="w-3 h-3 text-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={fitCurrentRoute}
                title="Fit Route View / Recenter City"
                className={`p-1.5 rounded-lg text-xs transition ${
                  theme === 'light'
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Prominent Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
              isMapCollapsed
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                : theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
            }`}
            title={isMapCollapsed ? 'Show / Expand Map View' : 'Collapse / Hide Map'}
          >
            {isMapCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isMapCollapsed ? 'Show Map (Expand)' : 'Hide Map (Collapse)'}</span>
            {isMapCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Map Viewport Area: Collapsed hides the 420px height seamlessly */}
      <div
        className={
          isMapCollapsed
            ? 'hidden'
            : 'mt-3 relative w-full h-[420px] min-h-[420px] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 z-0 bg-slate-100 dark:bg-slate-900'
        }
        style={{ height: isMapCollapsed ? '0px' : '420px', minHeight: isMapCollapsed ? '0px' : '420px' }}
      >
        <div
          ref={mapContainerRef}
          id="maplibre-gl-map"
          className="w-full h-full"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {/* Live Route Distance Overlay Card (Top Left) */}
        {routeStats && pickupPoint?.lat && dropPoint?.lat && (
          <div
            className={`absolute top-3 left-3 z-[10] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5 shadow-lg backdrop-blur-md border ${
              theme === 'light'
                ? 'bg-white/95 text-slate-800 border-slate-200'
                : 'bg-gray-900/95 text-gray-100 border-white/10'
            }`}
          >
            <Navigation className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <span className="font-bold text-blue-600 dark:text-blue-400">{routeStats.distanceKm} KM</span>
              <span className="text-slate-400 dark:text-gray-400 mx-1.5">&bull;</span>
              <span className="font-medium">~{routeStats.durationMin} mins drive</span>
            </div>
            <button
              type="button"
              onClick={fitCurrentRoute}
              className="ml-1 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition"
              title="Fit Route View"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}

        {/* Floating guidance note for pin placement (Bottom) */}
        <div
          className={`absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-[10] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-none ${
            theme === 'light'
              ? 'bg-white/95 text-slate-800 border border-slate-200'
              : 'bg-gray-900/95 text-gray-200 border border-white/10'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              activePinMode === 'pickup' ? 'bg-blue-500' : 'bg-rose-500'
            }`}
          />
          <span>
            Click map to set <strong>{activePinMode === 'pickup' ? 'Pickup (Blue)' : 'Drop (Red)'}</strong> in {city.split(',')[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
