# OneStack API — production image. Builds the compiled app and runs it with the SQLite database on a
# mounted volume (see fly.toml) so data survives restarts and redeploys.
FROM node:22-slim

# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all deps (dev included — the prisma CLI, ts-node seed, and the tsc build need them).
# --ignore-scripts skips the postinstall `prisma generate`, which would fail here because the schema
# isn't copied yet; we run generate explicitly below, once the source (and schema) is present.
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy the source, generate the Prisma client (schema now present), and compile the app.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3001
# Absolute path on the mounted volume; overridable (e.g. a Postgres URL) at deploy time.
ENV DATABASE_URL="file:/data/prod.db"

EXPOSE 3001

# On boot: ensure the schema exists on the volume, seed once if empty, then run the compiled server.
CMD ["npm", "run", "start:prod"]
