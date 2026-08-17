#!/usr/bin/env bash
# scan-bundle.sh — release gate for an exported Expo bundle.
#
#   npx expo export --platform ios --output-dir dist-ios
#   ./scripts/scan-bundle.sh dist-ios "https://landhere-api.onrender.com"
#
# Second argument is optional. When given, the scan additionally asserts that the
# production API origin is actually present in the bundle — catching the case
# where EXPO_PUBLIC_API_URL was never set and the app shipped pointing at nothing.
#
# WHY THIS IS NOT A NAIVE grep
# ----------------------------
# A plain `grep -F 192.168` over a Hermes bundle always "fails", for two reasons
# that are both harmless:
#
#   1. lib/urlPolicy.ts contains the private-address patterns and placeholder
#      markers AS ITS OWN RULE TABLE ('localhost', '127.0.0.1', 'example.com',
#      'your-', /^192\.168\./). The validator that exists to keep those values
#      out necessarily contains them as data.
#   2. React Native itself embeds its dev-server defaults (http://localhost:8081,
#      http://localhost:3000) in every build, release included.
#
# So this script looks for URL-SHAPED private origins — an actual configured
# endpoint — and allowlists the two React Native literals by exact match.
set -uo pipefail

DIR="${1:?usage: scan-bundle.sh <export-dir> [expected-api-origin]}"
EXPECTED_API="${2:-}"

FILES=$(find "$DIR" -type f \( -name '*.hbc' -o -name '*.js' -o -name '*.json' \) ! -path '*/assets/*')
[ -z "$FILES" ] && { echo "✖ no bundle files found under $DIR"; exit 1; }

fail=0
note() { printf '  %s %s\n' "$1" "$2"; }

# ── 1. Hard-forbidden literals ────────────────────────────────────────────────
# The app now sells a one-time purchase, so purchase machinery is EXPECTED in
# the bundle and is checked for below instead. What must never appear is a
# credential, a private key, or the old device-writable entitlement flag — that
# flag returning would mean the client can grant itself Pro again.
for pat in \
  'landhere_purchased' 'react-native-iap' \
  'EXPO_PUBLIC_UNSPLASH_KEY' 'api.unsplash.com' 'Client-ID' \
  'BEGIN PRIVATE KEY' '-----BEGIN' 'appstoreconnect-issuer' 'APPLE_ROOT_CA' \
  'service_account' 'private_key_id' 'androidpublisher' \
  'GOOGLE_PLAY_SERVICE_ACCOUNT' 'GOOGLE_RTDN_SHARED_SECRET'
do
  if echo "$FILES" | xargs grep -l -F -- "$pat" 2>/dev/null | grep -q .; then
    note "✖" "forbidden string present: $pat"; fail=1
  else
    note "✔" "absent: $pat"
  fi
done

# ── 1b. Purchase machinery that MUST be present ───────────────────────────────
# The mirror of the check above. A build that silently dropped the paywall or
# the product id would ship a paid app with nothing to buy — and an export
# succeeds either way, so only an explicit assertion catches it.
for pat in 'com.landhere.app.pro' 'Restore Purchases' '/purchases/verify' \
  '/purchases/verify/google'
do
  if echo "$FILES" | xargs grep -l -F -- "$pat" 2>/dev/null | grep -q .; then
    note "✔" "present: $pat"
  else
    note "✖" "purchase machinery MISSING from bundle: $pat"; fail=1
  fi
done

# ── 2. URL-shaped private / local origins ─────────────────────────────────────
# Allowlist: React Native's own Metro dev-server defaults, which are compiled
# into every RN binary and are never contacted in a release build.
ALLOW='^http://localhost:8081$|^http://localhost:3000$'
found_private=$(
  echo "$FILES" | xargs strings -n 4 2>/dev/null \
    | grep -oE 'https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.[0-9]+\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+)(:[0-9]+)?' \
    | sort -u | grep -vE "$ALLOW" || true
)
if [ -n "$found_private" ]; then
  note "✖" "private/local origin embedded in bundle:"
  echo "$found_private" | sed 's/^/       /'
  fail=1
else
  note "✔" "no private/local origin embedded (RN dev-server defaults allowlisted)"
fi

# ── 3. Expected production origin actually present ────────────────────────────
if [ -n "$EXPECTED_API" ]; then
  if echo "$FILES" | xargs grep -l -F -- "$EXPECTED_API" 2>/dev/null | grep -q .; then
    note "✔" "production API origin present: $EXPECTED_API"
  else
    note "✖" "production API origin NOT in bundle: $EXPECTED_API"
    note " " "(EXPO_PUBLIC_API_URL was probably unset at export time)"
    fail=1
  fi
else
  note "•" "no expected API origin given — skipping presence check"
fi

echo
if [ $fail -eq 0 ]; then echo "RESULT: CLEAN ($DIR)"; else echo "RESULT: DIRTY ($DIR)"; fi
exit $fail
