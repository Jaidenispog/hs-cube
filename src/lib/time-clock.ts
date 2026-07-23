import { ApiError, api } from './api';
import { coordsToPayload, getCheckInLocation, type GeoResult } from './location';

/**
 * Clock in, attaching the device location when it's available.
 *
 * Location is strictly ADDITIVE: check-in historically took no body, and the app talks to a deployed API
 * the team may not control yet. So if a location-bearing check-in is rejected with a client error (e.g.
 * the server doesn't accept the field), we retry the original body-less request — clocking in can never
 * regress because of the new field. The returned GeoResult is for display and is meaningful only because
 * the check-in itself resolved.
 */
export async function checkInWithLocation(): Promise<GeoResult> {
  const geo = await getCheckInLocation();
  const body = geo.ok ? { location: coordsToPayload(geo.coords) } : undefined;
  try {
    await api.post('/time-clock/check-in', body);
  } catch (e) {
    if (body && e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      // Backend isn't accepting location yet — fall back to the historical no-body contract.
      await api.post('/time-clock/check-in');
      return geo;
    }
    throw e;
  }
  return geo;
}

export async function checkOut(): Promise<void> {
  await api.post('/time-clock/check-out');
}
