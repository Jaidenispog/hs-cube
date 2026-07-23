import { Platform } from 'react-native';
import {
  type Coords,
  type GeolocationLike,
  type GeoResult,
  normalizeCoords,
  parseCoordString,
  readGeolocation,
} from './geo-core';

export type { Coords, GeoResult, CheckInLocation } from './geo-core';
export { coordsToPayload, formatCoords, geoReasonLabel } from './geo-core';

/**
 * Location capture for check-in.
 *
 * Best-effort by design: a denied or failed reading never throws — `getCheckInLocation()` resolves to
 * `{ ok: false, reason }` and the caller can still check in without coordinates. Platform split follows
 * `storage.ts`: `navigator.geolocation` on web, `expo-location` on native (imported lazily so web and
 * missing-module builds keep working).
 *
 * To change/force the location while testing:
 *   • set `EXPO_PUBLIC_MOCK_LOCATION="-37.8136,144.9631"` in `.env` (Melbourne CBD), or
 *   • call `setLocationOverride({ latitude, longitude, accuracy: null })` at runtime.
 */

/** How long to wait for a native GPS fix before checking in without one. */
const NATIVE_TIMEOUT_MS = 10000;

// Only honour the env-baked override outside production — a release build must never ship a forced
// location (EXPO_PUBLIC_* is inlined into the bundle). Use it via `expo start`, not a release build.
const isDev = process.env.NODE_ENV !== 'production';
let override: Coords | null = isDev ? parseCoordString(process.env.EXPO_PUBLIC_MOCK_LOCATION) : null;

/** Force every check-in to use these coordinates (pass `null` to clear and go back to real GPS). */
export function setLocationOverride(coords: Coords | null): void {
  override = coords;
}

/** The active forced location, if any. */
export function getLocationOverride(): Coords | null {
  return override;
}

function webGeolocation(): GeolocationLike | undefined {
  const nav = (globalThis as { navigator?: { geolocation?: GeolocationLike } }).navigator;
  return nav?.geolocation;
}

/** Read the device's current position for a check-in. See the module note for the override knobs. */
export async function getCheckInLocation(): Promise<GeoResult> {
  if (override) return { ok: true, coords: override, source: 'override' };

  if (Platform.OS === 'web') {
    return readGeolocation(webGeolocation(), { timeoutMs: 10000, highAccuracy: true });
  }

  // Native: expo-location, imported lazily so the web bundle (and any build without the module) is fine.
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    // Bound the GPS acquisition so a slow/failing fix can't hang the check-in button indefinitely.
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), NATIVE_TIMEOUT_MS)),
    ]);
    if (!position) return { ok: false, reason: 'timeout' };
    const coords = normalizeCoords({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    });
    return coords ? { ok: true, coords, source: 'gps' } : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
}
