#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting backend in watch mode..."
exec npm run start:dev
