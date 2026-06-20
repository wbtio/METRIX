#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Metrix Mobile Build ==="

# 1. Temporarily disable API routes and auth callback route (incompatible with output: 'export')
API_DIR="src/app/api"
API_DISABLED="src/app/_api_disabled"
AUTH_ROUTE="src/app/auth/callback/route.ts"
AUTH_ROUTE_BACKUP="src/app/auth/callback/route.ts.bak"

if [ -d "$API_DIR" ]; then
  echo "→ Temporarily moving API routes out of the build..."
  mv "$API_DIR" "$API_DISABLED"
fi

if [ -f "$AUTH_ROUTE" ]; then
  echo "→ Temporarily removing auth callback server route..."
  mv "$AUTH_ROUTE" "$AUTH_ROUTE_BACKUP"
fi

# 2. Build static export
echo "→ Building Next.js static export (BUILD_MOBILE=1)..."
BUILD_MOBILE=1 npx next build

# 3. Copy output to Capacitor www
echo "→ Copying export to mobile/www..."
rm -rf mobile/www/*
cp -r out/* mobile/www/

# 4. Restore moved files
echo "→ Restoring API routes and auth callback..."
if [ -d "$API_DISABLED" ]; then
  mv "$API_DISABLED" "$API_DIR"
fi

if [ -f "$AUTH_ROUTE_BACKUP" ]; then
  mv "$AUTH_ROUTE_BACKUP" "$AUTH_ROUTE"
fi

# 5. Sync with Capacitor
echo "→ Running cap sync..."
cd mobile
npx cap sync android

echo ""
echo "✅ Build complete! Static export is in mobile/www/"
echo "   Next: cd mobile && source ./env.sh && cd android && ./gradlew assembleDebug"
