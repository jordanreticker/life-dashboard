#!/usr/bin/env bash
# Regenerates supabase/schema.sql — the current-state DDL snapshot of the public
# schema, read directly from the linked database (no Docker required).
#
# Run this as the LAST step of every `supabase db push`, so schema.sql always
# reflects the live schema. Migration files are append-only history; schema.sql
# is the single source of truth for what the schema looks like RIGHT NOW.
#
# Usage:  ./supabase/refresh-schema-snapshot.sh
set -euo pipefail

# Resolve repo root regardless of where the script is invoked from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required (brew install jq)" >&2
  exit 1
fi

TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2)"
if [ -z "$TOKEN" ]; then
  echo "error: SUPABASE_ACCESS_TOKEN not found in .env.local" >&2
  exit 1
fi

# Write to a temp file first so a failed query/parse never clobbers schema.sql.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Older CLI wraps results as {"rows":[...]}; newer CLI emits the array directly.
SUPABASE_ACCESS_TOKEN="$TOKEN" \
  supabase db query --linked --workdir "$ROOT" \
    --file supabase/schema-snapshot.gen.sql -o json 2>/dev/null \
  | jq -r 'if type == "array" then .[0].schema_sql else .rows[0].schema_sql end' > "$TMP"

LINES="$(wc -l < "$TMP" | tr -d ' ')"
if [ "$LINES" -lt 50 ]; then
  echo "error: generated schema looks empty ($LINES lines) — check the query/connection; schema.sql left untouched" >&2
  exit 1
fi
mv "$TMP" supabase/schema.sql
trap - EXIT
echo "wrote supabase/schema.sql ($LINES lines)"
