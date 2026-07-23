/**
 * API base URL.
 *
 * By default the app talks to the deployed OneStack API on Google Cloud Run (australia-southeast1),
 * the same backend the web app uses. Override with EXPO_PUBLIC_API_BASE_URL for local development —
 * e.g. `http://localhost:3001/api/v1` (iOS sim / web), `http://10.0.2.2:3001/api/v1` (Android emulator),
 * or your machine's LAN IP for a physical device.
 */
const DEPLOYED_API = 'https://onestack-api-239611169150.australia-southeast1.run.app/api/v1';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEPLOYED_API;
