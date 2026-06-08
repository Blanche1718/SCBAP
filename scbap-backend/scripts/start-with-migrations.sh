#!/bin/sh

# Start backend after applying Prisma migrations.
set -e

echo "Container start - NODE_ENV=${NODE_ENV:-undefined}"

if [ -z "$DATABASE_URL" ]; then
	echo "ERROR: DATABASE_URL is not set. Prisma migrate deploy requires DATABASE_URL."
	echo "Please set the DATABASE_URL environment variable."
	exit 1
fi

echo "DATABASE_URL is present (hidden). Running Prisma migrations..."

PRISMA_LOG=/tmp/prisma-migrate.log
rm -f "$PRISMA_LOG"

echo "Running: npx prisma migrate status"
set +e
npx prisma migrate status > "$PRISMA_LOG" 2>&1
STATUS_CODE=$?
set -e
cat "$PRISMA_LOG" || true
if [ "$STATUS_CODE" -ne 0 ]; then
  echo "WARNING: Prisma migrate status failed with exit code $STATUS_CODE"
  echo "--- Prisma migrate status log (full) ---"
  sed -n '1,500p' "$PRISMA_LOG" || true
  echo "--- end prisma migrate status log ---"
fi

if grep -q "Database schema is up to date" "$PRISMA_LOG"; then
  echo "Database schema is already up to date. Starting server..."
  exec node dist/index.js
fi

echo "Running: npx prisma migrate deploy"
# Run prisma and capture exit code portably (avoid relying on pipefail)
set +e
npx prisma migrate deploy > "$PRISMA_LOG" 2>&1
EXIT_CODE=$?
set -e
cat "$PRISMA_LOG" || true
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "ERROR: Prisma migrations failed with exit code $EXIT_CODE"
  echo "--- Prisma migrate log (full) ---"
  sed -n '1,500p' "$PRISMA_LOG" || true
  echo "--- end prisma migrate log ---"
  exit $EXIT_CODE
fi

echo "Migrations complete. Starting server..."
exec node dist/index.js
