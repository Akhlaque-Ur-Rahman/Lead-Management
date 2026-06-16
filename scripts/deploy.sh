#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building and starting lms-web..."
docker compose -f docker-compose.prod.yml up -d --build

if docker ps --format '{{.Names}}' | grep -qx 'green-city-caddy'; then
  echo "Reloading Caddy..."
  docker exec green-city-caddy caddy reload --config /etc/caddy/Caddyfile
else
  echo "WARN: green-city-caddy not running — reload Caddy manually after starting it."
fi

echo "Done. Verify: curl -fsS https://lms.edunexservices.com/"
