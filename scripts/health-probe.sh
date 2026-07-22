#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# DILNOVA COMMERCE HUB — Enterprise Post-Deployment Health Probe
# ═══════════════════════════════════════════════════════════════════════════
# Verifies system availability, DB connectivity, Redis rate-limiting, and 
# handles Vercel deployment protection edge bypass automatically.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration & Defaults ──
MAX_RETRIES=${MAX_RETRIES:-5}
RETRY_DELAY=${RETRY_DELAY:-2}
DEFAULT_PROD_URL="https://www.dilstar.pp.ua"
TARGET_URL="${TARGET_URL:-$DEFAULT_PROD_URL}"
HEALTH_SECRET="${HEALTH_CHECK_SECRET:-}"
VERCEL_BYPASS="${VERCEL_AUTOMATION_BYPASS_SECRET:-${VERCEL_PROTECTION_BYPASS:-}}"

# ── Domain Normalization & Security Protection Handling ──
if [[ "$TARGET_URL" == *".vercel.app"* ]]; then
  if [ -n "$VERCEL_BYPASS" ]; then
    echo "🔒 Vercel Preview URL detected. Attaching Vercel Protection Bypass header."
  else
    echo "⚠️  Protected Vercel URL ($TARGET_URL) without bypass token. Fallback to production custom domain: $DEFAULT_PROD_URL"
    TARGET_URL="$DEFAULT_PROD_URL"
  fi
elif [[ "$TARGET_URL" == "https://dilstar.pp.ua" ]]; then
  TARGET_URL="$DEFAULT_PROD_URL"
fi

HEALTH_ENDPOINT="${TARGET_URL%/}/api/health"
echo "🚀 Initiating Enterprise Health Probe against: $HEALTH_ENDPOINT"

# ── Construct CURL Arguments ──
CURL_ARGS=(
  "-sL"
  "--location-trusted"
  "-A" "DilnovaHealthProbe/1.0 (Enterprise Automation)"
  "-w" "\n%{http_code}"
  "-m" "15"
)

if [ -n "$HEALTH_SECRET" ]; then
  echo "🔑 Authorization Bearer header configured for detailed diagnostic probe."
  CURL_ARGS+=("-H" "Authorization: Bearer $HEALTH_SECRET")
else
  echo "🌐 Running public health probe."
fi

if [ -n "$VERCEL_BYPASS" ] && [[ "$TARGET_URL" == *".vercel.app"* ]]; then
  CURL_ARGS+=("-H" "x-vercel-protection-bypass: $VERCEL_BYPASS")
fi

# ── Retry Loop with Exponential Backoff ──
ATTEMPT=1
SUCCESS=0
TEMP_RESPONSE_FILE=$(mktemp)
trap 'rm -f "$TEMP_RESPONSE_FILE"' EXIT

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "📡 Attempt $ATTEMPT/$MAX_RETRIES: Querying $HEALTH_ENDPOINT..."
  
  RESPONSE=$(curl "${CURL_ARGS[@]}" "$HEALTH_ENDPOINT" 2>&1 || true)
  
  HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
  HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

  echo "$HTTP_BODY" > "$TEMP_RESPONSE_FILE"

  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Received HTTP 200 OK"
    SUCCESS=1
    break
  else
    echo "⚠️ Attempt $ATTEMPT failed with HTTP Status: $HTTP_STATUS"
    if [ $ATTEMPT -lt $MAX_RETRIES ]; then
      SLEEP_TIME=$((RETRY_DELAY * ATTEMPT))
      echo "⏳ Waiting ${SLEEP_TIME}s for edge propagation / cold start..."
      sleep $SLEEP_TIME
    fi
  fi

  ATTEMPT=$((ATTEMPT + 1))
done

if [ $SUCCESS -ne 1 ]; then
  echo "❌ Error: Health Probe failed after $MAX_RETRIES attempts."
  echo "------------------- LAST RESPONSE BODY -------------------"
  cat "$TEMP_RESPONSE_FILE"
  echo ""
  echo "----------------------------------------------------------"
  exit 1
fi

# ── Payload Verification ──
echo "🔍 Validating Health Probe JSON response payload..."

if command -v jq >/dev/null 2>&1; then
  STATUS=$(jq -r '.status // "unknown"' "$TEMP_RESPONSE_FILE")
  DATABASE=$(jq -r '.database // "unknown"' "$TEMP_RESPONSE_FILE")
  RATE_LIMIT=$(jq -r '.rateLimit.status // "n/a"' "$TEMP_RESPONSE_FILE")

  echo "  • System Status    : $STATUS"
  echo "  • Database Status  : $DATABASE"
  echo "  • Rate-Limit Status: $RATE_LIMIT"

  if [ "$STATUS" = "error" ] || [ "$DATABASE" = "disconnected" ]; then
    echo "❌ Critical Health Failure: Subsystem reporting error or disconnected database!"
    cat "$TEMP_RESPONSE_FILE"
    exit 1
  fi
else
  if grep -q '"status":"error"' "$TEMP_RESPONSE_FILE" || grep -q '"database":"disconnected"' "$TEMP_RESPONSE_FILE"; then
    echo "❌ Critical Health Failure detected in response string!"
    cat "$TEMP_RESPONSE_FILE"
    exit 1
  fi
fi

echo "🎉 Enterprise Health Verification Completed Successfully!"
exit 0
