#!/usr/bin/env bash
set -euo pipefail

echo "Setting up environment variables..."

# only copy if the .env file doesn't already exist to prevent overwriting any existing configuration 
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file from .env.example"
else
  echo ".env file already exists, skipping copy"
fi

echo "Generating app key..."
node ace generate:key

echo "Making temp folder"
mkdir -p tmp
touch tmp/db.sqlite3
echo "Created temp/db.sqlite3 file"

echo "Installing dependencies..."
npm install

echo "Running database migrations..."
node ace migration:run

echo "Seeding database..."
node ace db:seed

echo "Setup complete."


