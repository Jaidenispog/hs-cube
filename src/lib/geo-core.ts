/**
 * Pure geolocation helpers — no React Native, Expo, or global dependencies, so this module runs
 * unchanged on native, on web, in a plain browser, and in a Node test. Everything platform-specific
 * (permissions, `expo-location`, `navigator.geolocation`) lives in `location.ts`, which wraps this.
 */

export interface Coords {
  latitude: number;
  longitude: number;
  /** Reported accuracy radius in metres, or null when the platform doesn't provide one. */
  accuracy: number | null;
}

/** The JSON body the API receives with a check-in. */
export interface CheckInLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type GeoFailReason = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type GeoResult =
  | { ok: true; coords: Coords; source: 'gps' | 'override' }
  | { ok: false; reason: GeoFailReason };

const LAT_MIN = -90;
const LAT_MAX = 90;
const LON_MIN = -180;
const LON_MAX = 180;

/** Round to 6 decimal places (~0.11 m) — plenty for a check-in, and keeps payloads tidy. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Validate and normalise a raw reading into {@link Coords}, or `null` if latitude/longitude are
 * missing, non-finite, or out of range. Accuracy is kept only when it's a finite, non-negative number.
 */
export function normalizeCoords(raw: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): Coords | null {
  const { latitude, longitude } = raw;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < LAT_MIN || latitude > LAT_MAX) return null;
  if (longitude < LON_MIN || longitude > LON_MAX) return null;
  const acc = raw.accuracy;
  const accuracy = typeof acc === 'number' && Number.isFinite(acc) && acc >= 0 ? round6(acc) : null;
  return { latitude: round6(latitude), longitude: round6(longitude), accuracy };
}

/**
 * Parse a `"lat,lng"` string (e.g. the `EXPO_PUBLIC_MOCK_LOCATION` env used to force a location while
 * testing) into {@link Coords}, or `null` when it's absent or malformed.
 */
export function parseCoordString(input: string | null | undefined): Coords | null {
  if (!input) return null;
  const parts = input.split(',');
  if (parts.length !== 2) return null;
  const latStr = parts[0]?.trim() ?? '';
  const lonStr = parts[1]?.trim() ?? '';
  if (latStr === '' || lonStr === '') return null;
  const latitude = Number(latStr);
  const longitude = Number(lonStr);
  return normalizeCoords({ latitude, longitude, accuracy: null });
}

/** Human-readable coordinate, e.g. `"-37.740500, 144.968000"`. */
export function formatCoords(coords: Coords | null): string {
  if (!coords) return 'Location unavailable';
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}

/** Short, user-facing explanation for a failed reading. */
export function geoReasonLabel(reason: GeoFailReason): string {
  switch (reason) {
    case 'denied':
      return 'Location permission is off';
    case 'timeout':
      return 'Location timed out';
    case 'unsupported':
      return 'Location isn’t available on this device';
    case 'unavailable':
    default:
      return 'Location unavailable';
  }
}

/** An override (test / forced location) always wins over a live reading. */
export function pickLocation(override: Coords | null, live: Coords | null): Coords | null {
  return override ?? live ?? null;
}

/** The exact JSON we POST to the API on check-in. */
export function coordsToPayload(coords: Coords): CheckInLocation {
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
}

/** The subset of the W3C Geolocation API we rely on (satisfied by `navigator.geolocation`). */
export interface GeolocationLike {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number; accuracy: number } }) => void,
    error: (err: { code: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
  ): void;
}

export interface ReadOptions {
  timeoutMs?: number;
  maximumAgeMs?: number;
  highAccuracy?: boolean;
}

// W3C GeolocationPositionError codes.
const ERR_PERMISSION_DENIED = 1;
const ERR_TIMEOUT = 3;

/**
 * Promisify a W3C-style geolocation source. The source is injected (not read from a global) so this
 * is testable and identical on web and in a browser harness. Never rejects: a permission denial or
 * failure resolves to `{ ok: false, reason }`, so callers can still check in without a location.
 */
export function readGeolocation(
  geo: GeolocationLike | null | undefined,
  opts: ReadOptions = {},
): Promise<GeoResult> {
  if (!geo || typeof geo.getCurrentPosition !== 'function') {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }
  const { timeoutMs = 10000, maximumAgeMs = 0, highAccuracy = true } = opts;
  return new Promise<GeoResult>((resolve) => {
    let settled = false;
    const done = (result: GeoResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    try {
      geo.getCurrentPosition(
        (position) => {
          const coords = normalizeCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          done(coords ? { ok: true, coords, source: 'gps' } : { ok: false, reason: 'unavailable' });
        },
        (err) => {
          const reason: GeoFailReason =
            err?.code === ERR_PERMISSION_DENIED
              ? 'denied'
              : err?.code === ERR_TIMEOUT
                ? 'timeout'
                : 'unavailable';
          done({ ok: false, reason });
        },
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
      );
    } catch {
      done({ ok: false, reason: 'unsupported' });
    }
  });
}
