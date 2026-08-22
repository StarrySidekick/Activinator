#!/usr/bin/env bash
# Pulls a Google Sheet into a pack, for when editing the list in a spreadsheet
# is nicer than editing a CSV.
#
#   scripts/pull-sheet.sh <published-csv-url> <pack-id>
#
# In the sheet: File → Share → Publish to web → pick the tab → Comma-separated
# values (.csv) → Publish. That URL needs no credentials and no API, which is
# why it is the one used here.
#
# The sheet is an editing surface, never the source of truth: this writes the
# CSV into packs/, the build turns that into the app, and both get committed.
# Nothing is fetched while the app is running — it has to open on a train.
set -euo pipefail
url="${1:?usage: pull-sheet.sh <published-csv-url> <pack-id>}"
id="${2:?usage: pull-sheet.sh <published-csv-url> <pack-id>}"
cd "$(dirname "$0")/.."
tmp="$(mktemp)"
curl -fsSL "$url" -o "$tmp"
head -1 "$tmp" | grep -qi '^title,minutes,cost,tags' || {
  echo "That does not look like a pack — the first row must be: title,minutes,cost,tags" >&2
  echo "Got: $(head -1 "$tmp")" >&2; rm -f "$tmp"; exit 1; }
mv "$tmp" "packs/$id.csv"
echo "packs/$id.csv  ($(($(wc -l < "packs/$id.csv") - 1)) rows)"
node scripts/build-activities.mjs
