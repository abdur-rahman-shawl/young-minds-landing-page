#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: rg (ripgrep) is required for this guardrail. Install rg and re-run."
  exit 1
fi

LIST_FILE="scripts/policy-required-routes.txt"

if [[ ! -f "$LIST_FILE" ]]; then
  echo "ERROR: Missing $LIST_FILE"
  exit 1
fi

failures=0

while IFS= read -r route; do
  [[ -z "$route" ]] && continue
  [[ "$route" =~ ^# ]] && continue

  if [[ ! -f "$route" ]]; then
    echo "ERROR: Required route missing: $route"
    failures=$((failures + 1))
    continue
  fi

  if ! rg -n "enforceFeature\\(|consumeFeature\\(" "$route" >/dev/null; then
    echo "ERROR: $route does not call enforceFeature/consumeFeature"
    failures=$((failures + 1))
  fi
done < "$LIST_FILE"

if [[ "$failures" -gt 0 ]]; then
  echo "Policy required routes guard failed: $failures issue(s) found."
  exit 1
fi

echo "OK: All required routes call policy runtime."
