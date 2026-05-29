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

if ! npx prisma migrate deploy; then
	echo "ERROR: Prisma migrations failed. See Prisma output above for details."
	exit 1
fi

echo "Migrations complete. Starting server..."
exec node dist/index.js
