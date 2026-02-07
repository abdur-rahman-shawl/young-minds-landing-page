#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PATTERN='checkFeatureAccess\(|trackFeatureUsage\('

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: rg (ripgrep) is required for this guardrail. Install rg and re-run."
  exit 1
fi

if rg -n "$PATTERN" app/api > /tmp/subscription_policy_violations.txt; then
  echo "ERROR: Direct subscription checks found in app/api. Use enforceFeature/consumeFeature instead."
  cat /tmp/subscription_policy_violations.txt
  exit 1
fi

echo "OK: No direct subscription checks found in app/api."
