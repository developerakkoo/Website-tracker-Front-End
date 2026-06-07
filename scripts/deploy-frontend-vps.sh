#!/usr/bin/env bash
# Deploy dashboard build to nginx root on VPS.
# Usage (on VPS, from Website-tracker-Front-End directory):
#   ./scripts/deploy-frontend-vps.sh
# Optional env:
#   NGINX_ROOT=/var/www/webtracker-frontend
#   DEPLOY_MARKER=v1.0.0   # grep check in built www/ before copy

set -euo pipefail

NGINX_ROOT="${NGINX_ROOT:-/var/www/webtracker-frontend}"
DEPLOY_MARKER="${DEPLOY_MARKER:-}"

echo "==> Pull latest source"
git pull

echo "==> Verify production API URL"
grep API_URL src/environments/environment.prod.ts

echo "==> Install dependencies"
npm ci

echo "==> Production build (www/ is gitignored — must run every deploy)"
npm run build

if [[ -n "$DEPLOY_MARKER" ]]; then
  echo "==> Verify build contains: $DEPLOY_MARKER"
  MARKER_FILES=$(grep -rl "$DEPLOY_MARKER" www/ 2>/dev/null || true)
  if [[ -z "$MARKER_FILES" ]]; then
    echo "ERROR: Build output missing '$DEPLOY_MARKER'. Aborting deploy." >&2
    echo "" >&2
    echo "Source check:" >&2
    grep -n "$DEPLOY_MARKER" src/app/auth/login/login.page.html 2>/dev/null || echo "  (not in login.page.html on disk)" >&2
    echo "" >&2
    echo "Build output age (www/ must be newer than source — run npm run build):" >&2
    ls -la www/index.html 2>/dev/null || echo "  www/index.html missing — build did not run" >&2
    ls -la src/app/auth/login/login.page.html 2>/dev/null || true
    echo "" >&2
    echo "Note: login text is in a lazy chunk (e.g. 2448.*.js), not always main.*.js" >&2
    exit 1
  fi
  echo "Found in: $(echo "$MARKER_FILES" | head -3 | tr '\n' ' ')"
fi

echo "==> Deploy to $NGINX_ROOT"
sudo rm -rf "${NGINX_ROOT:?}"/*
sudo cp -r www/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"

echo "==> Deploy complete. Hard-refresh browser (Ctrl+Shift+R) or use incognito."
ls -la "$NGINX_ROOT/index.html"
ls "$NGINX_ROOT"/main*.js 2>/dev/null | head -1
