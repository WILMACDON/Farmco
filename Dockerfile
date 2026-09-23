# Match official AdonisJS deployment Dockerfile; add postgresql-client for pg_dump (DB backups)
# https://docs.adonisjs.com/guides/getting-started/deployment#creating-a-docker-image

FROM node:22.16.0-alpine3.22 AS base

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json .npmrc ./
RUN npm ci

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build

# Production stage
FROM base
ENV NODE_ENV=production

# PostgreSQL + client tools
RUN apk add --no-cache postgresql16 postgresql16-client su-exec

# Set up PostgreSQL data directory
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" /run/postgresql \
    && chown -R postgres:postgres "$PGDATA" /run/postgresql

WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

# Writable dir for BackupService (pg_dump writes here before upload to R2)
RUN mkdir -p /app/backups

EXPOSE 3333

# Entrypoint: init PG using DB_* env vars, start it, then launch the app
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]
