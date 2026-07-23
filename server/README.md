# OneStack API (your own backend)

A NestJS + Prisma backend that implements the API the OneStack mobile app talks to. It runs entirely on
your machine with SQLite — your data lives in a local file you own, with **nothing** going to the shared
deployed backend.

## What's implemented

- **Auth** — `POST /auth/login` (email + password), `POST /auth/dev-login`, `GET /auth/demo-credentials`,
  `GET /auth/directory`. Bearer-token (JWT) auth; every request is scoped to the caller's tenant.
- **Time clock** — `GET /time-clock/status`, `GET /time-clock/entries`, `POST /time-clock/check-in`
  (stores the geolocation the app sends), `POST /time-clock/check-out`, `GET /time-clock/summary`.
- **Main-tab reads** — `/work-items`, `/contacts`, `/dashboard/summary`, `/board` (seeded demo data).
- Everything else the app calls returns an empty list for now, so every screen still boots without errors.
  Add real endpoints feature-by-feature; each one you build stops falling through to the empty-list default.

## Run it

```bash
cd server
npm install
cp .env.example .env         # SQLite + a dev JWT secret; edit if you like
npm run setup                # prisma generate + db push + seed demo data
npm run dev                  # → http://localhost:3001/api/v1
```

Seed accounts (password `demo1234`): `owner@demo.test` (OWNER), `staff@demo.test` (STAFF).

## Point the mobile app at it

In the app repo root, set `EXPO_PUBLIC_API_BASE_URL` in `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1     # iOS sim / web
# Android emulator: http://10.0.2.2:3001/api/v1
# Physical device:  http://<your-LAN-IP>:3001/api/v1
```

Then `npm run web` / `npm run ios` in the app. Log in with a seed account (or tap a demo account on the
login screen) and check in — your location is written to your own SQLite database.

## Data model

`Tenant → User`, `TimeEntry` (with `checkInLat/Lng/Accuracy`), `Contact`, `WorkItem`. See
`prisma/schema.prisma`. To deploy on Postgres, switch the datasource `provider` to `postgresql` and point
`DATABASE_URL` at your database — the models are portable as-is.

## Notes

- `DEV_LOGIN_ENABLED=true` enables `/auth/dev-login` and `/auth/demo-credentials`. Unset it in production.
- Change `JWT_SECRET` for anything but local dev.
