#!/usr/bin/env bash
# Apply every file in supabase/migrations in sorted order (001…009).
#
# Usage:
#   1) Supabase Dashboard → Project Settings → Database → copy "Connection string"
#      (URI tab, replace [YOUR-PASSWORD] with your DB password).
#   2) Run from repo root:
#        export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.XXXX.supabase.co:5432/postgres'
#        npm run db:apply
#
# Requires: psql (install Postgres client, or use Supabase SQL Editor and paste each file instead).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools, or paste migrations in Dashboard → SQL Editor."
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your Supabase Postgres URI (see header comment)."
  exit 1
fi
shopt -s nullglob
FILES=("$ROOT"/supabase/migrations/*.sql)
IFS=$'\n' sorted=($(sort <<<"${FILES[*]}"))
unset IFS
for f in "${sorted[@]}"; do
  echo ""
  echo "==> $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
echo ""
echo "Done. Dashboard → Settings → API → Reload schema if PostgREST caches look stale."
