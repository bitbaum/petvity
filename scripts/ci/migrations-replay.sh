#!/usr/bin/env bash
# Builds a database from the committed migrations the way the deploy does, then
# proves it has the same shape as `drizzle-kit push` makes from lib/db/schema.ts.
#
# The batch mirrors bitbaum/loki scripts/hetzner/apply-schema.sh: every
# drizzle/[0-9]*.sql in order, `--> statement-breakpoint` stripped,
# `ADD COLUMN "` rewritten to `ADD COLUMN IF NOT EXISTS "`, one transaction,
# each tag recorded in _deploy_schema_history.
#
#   DATABASE_URL=postgres://…/petvity_smoke scripts/ci/migrations-replay.sh
#
# DATABASE_URL gets the replayed schema (the app then runs against it). A
# sibling database "<name>_push" is created for the comparison and dropped.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DATABASE_URL:?set DATABASE_URL}"

PUSH_URL="${DATABASE_URL%/*}/$(basename "${DATABASE_URL%%\?*}")_push"
PUSH_DB=$(basename "$PUSH_URL")
ADMIN_URL="${DATABASE_URL%/*}/postgres"

shopt -s nullglob
MIGS=(drizzle/[0-9]*.sql)
[ "${#MIGS[@]}" -gt 0 ] || { echo "no migrations in drizzle/"; exit 1; }

{
  echo "BEGIN;"
  echo "CREATE TABLE IF NOT EXISTS public._deploy_schema_history (tag text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"
  for f in "${MIGS[@]}"; do
    tag=$(basename "$f" .sql)
    echo "-- ===== $tag ====="
    sed -e 's/--> statement-breakpoint//g' -e 's/ADD COLUMN "/ADD COLUMN IF NOT EXISTS "/g' "$f"
    echo "INSERT INTO public._deploy_schema_history(tag) VALUES ('$tag') ON CONFLICT DO NOTHING;"
  done
  echo "COMMIT;"
} | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f - 2>&1 | { grep -v 'already exists, skipping' || true; }
echo "[migrations] replayed ${#MIGS[@]} migration(s)"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "SET client_min_messages = warning" -c "DROP DATABASE IF EXISTS \"$PUSH_DB\"" -c "CREATE DATABASE \"$PUSH_DB\""
trap 'psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$PUSH_DB\"" >/dev/null 2>&1 || true' EXIT
DATABASE_URL="$PUSH_URL" pnpm exec drizzle-kit push --force >/dev/null

# Columns, constraints, indexes and enums; column ORDER is left out on purpose
# (ALTER TABLE … ADD COLUMN appends, push declares in schema order).
SHAPE="
select 'col', table_name, column_name, data_type, coalesce(character_maximum_length::text,''), is_nullable, coalesce(column_default,''), udt_name
  from information_schema.columns where table_schema='public' and table_name<>'_deploy_schema_history'
union all select 'con', conrelid::regclass::text, conname, pg_get_constraintdef(oid), '', '', '', ''
  from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text<>'_deploy_schema_history'
union all select 'idx', tablename, indexname, indexdef, '', '', '', ''
  from pg_indexes where schemaname='public' and tablename<>'_deploy_schema_history'
union all select 'enum', t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder), '', '', '', '', ''
  from pg_type t join pg_enum e on e.enumtypid=t.oid group by t.typname
order by 1,2,3;"

if diff -u <(psql "$PUSH_URL" -tA -c "$SHAPE") <(psql "$DATABASE_URL" -tA -c "$SHAPE"); then
  echo "[migrations] the replayed schema matches drizzle-kit push ✓"
else
  echo "[migrations] the committed migrations do not build the schema lib/db/schema.ts declares"
  echo "             (- push, + replay). Generate the missing migration with pnpm db:generate."
  exit 1
fi
