#!/bin/sh

# Start with migrations on Render
set -e

echo "Container start - NODE_ENV=${NODE_ENV:-undefined}"

if [ -z "$DATABASE_URL" ]; then
	echo "ERROR: DATABASE_URL is not set. Prisma migrate deploy requires DATABASE_URL."
	echo "Please set the DATABASE_URL environment variable in Render (not via .env file inside the image)."
	exit 1
fi

echo "DATABASE_URL is present (hidden). Running Prisma migrations..."

echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Prisma version:"
npx prisma -v || true

echo "Prisma schema exists:" 
ls -la prisma || true
echo "---- start of prisma/schema.prisma (first 200 lines) ----"
sed -n '1,200p' prisma/schema.prisma || true
echo "---- end of prisma/schema.prisma ----"

PRISMA_LOG=/tmp/prisma-migrate.log
rm -f "$PRISMA_LOG"

echo "Running: npx prisma migrate deploy --schema=prisma/schema.prisma"
# Run prisma and capture exit code portably (avoid relying on pipefail)
npx prisma migrate deploy --schema=prisma/schema.prisma > "$PRISMA_LOG" 2>&1
EXIT_CODE=$?
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
