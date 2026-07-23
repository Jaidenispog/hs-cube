# OneStack Mobile

React Native + Expo (SDK 57, Expo Router) app for the OneStack platform — the field & front-desk
companion to the web app. It talks to the same OneStack API and is scoped to the signed-in tenant.

> **Status: foundation + first screens.** Auth, app shell, and the core read screens are in. It's being
> built toward parity with the web app, feature by feature. See **Roadmap** below.

## Stack

- **Expo SDK 57** · **Expo Router** (file-based screens under `src/app`) · React Native 0.86 · React 19 · TypeScript (strict)
- Token stored with **expo-secure-store** (Keychain / Keystore); web falls back to `localStorage`
- Theming: light/dark tokens in `src/constants/theme.ts`, consumed via `useTheme()` and a small UI kit (`src/components/kit.tsx`)

## Running it

By default the app connects to the **deployed API on Google Cloud Run** (australia-southeast1) — the same
backend the web app uses — so it works out of the box:

```
npm install
npm run ios        # or: npm run android · npm run web
```

On the login screen, tap **Sign in as Owner** — the app calls `/auth/dev-login`, stores the token, and
loads the tenant's data.

**To run against a local API instead**, copy `.env.example` → `.env` and set `EXPO_PUBLIC_API_BASE_URL`
(localhost for iOS sim/web, `10.0.2.2` for the Android emulator, your LAN IP for a physical device), then
start the API from `onestack-build/apps/api` with `DEV_LOGIN_ENABLED=true`.

## Auth

Real login will be **Supabase Auth** (managed) once the backend injects `tenant_id` / `role` custom claims
into its JWTs. Until then, the app uses the API's **dev-only** `/auth/dev-login` to obtain a token for the
seeded demo identity. The app never holds the JWT secret; it only ever receives a signed token.

## What's here

| Area | Screen(s) |
| --- | --- |
| Home | dashboard summary (active jobs, week revenue, unpaid, jobs by state) |
| Board | jobs grouped by workflow state |
| Jobs | list + job detail (quotes, invoices, notes; assign-to-me) |
| Customers | list + detail (contact + vehicles) |
| More | Calendar (bookings), Leads, Price book, session, sign out |

## Roadmap to web parity

Next slices: job actions (state transitions, notes, photo-to-quote AI scope), quotes/invoices editing +
payments, dispatch, online-booking config, campaigns, reviews, documents/e-sign, insights, reporting,
onboarding, and the customer portal — each as its own small, reviewed change.

## Layout

```
src/
  app/              # Expo Router screens
    _layout.tsx     # root: AuthProvider + auth gate
    login.tsx
    (tabs)/         # Home · Board · Jobs · Customers · More
    jobs/[id].tsx
    customers/[id].tsx
    calendar.tsx · leads.tsx · price-book.tsx
  components/        # kit (Screen/Card/Button/Badge…), job-card, themed-*
  lib/              # api client, auth, config, storage, types, use-query
  constants/theme.ts
```
