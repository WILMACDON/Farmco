#!/bin/sh
set -e

# ─── Defaults (match .env.example) ───
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_DATABASE="${DB_DATABASE:-app}"

# ─── Initialise PG data directory if empty ───
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initialising PostgreSQL data directory…"
  su-exec postgres initdb --auth=md5 --pwfile=<(echo "$DB_PASSWORD") -U "$DB_USER"

  # Allow local + TCP/IP connections with md5 auth
  {
    echo "host all all 0.0.0.0/0 md5"
    echo "host all all ::0/0 md5"
  } >> "$PGDATA/pg_hba.conf"

  # Listen on all interfaces
  sed -i "s/^#listen_addresses.*/listen_addresses = '*'/" "$PGDATA/postgresql.conf"
fi

# ─── Start PostgreSQL ───
echo "Starting PostgreSQL…"
su-exec postgres pg_ctl -D "$PGDATA" -l /var/lib/postgresql/logfile start -w

# Create the application database if it doesn't exist
if ! su-exec postgres psql -U "$DB_USER" -lqt | cut -d\| -f1 | grep -qw "$DB_DATABASE"; then
  echo "Creating database '$DB_DATABASE'…"
  su-exec postgres createdb -U "$DB_USER" "$DB_DATABASE"
fi

# ─── Run migrations ───
echo "Running migrations…"
node ace migration:run --force || true

# ─── Start the application ───
echo "Starting application…"
exec node ./bin/server.js
