#!/usr/bin/env bash
# Ops helper for the standalone teachwithsol.com Vercel project.
# GitHub: stratopslearning/teachwithsol (leave stratopslearning/sol / StratOps alone).
#
# Requires: vercel CLI logged in (`npx vercel login`), Cloudflare DNS access,
# and a NEW Clerk Production application (not StratOps satellite).
#
# Usage:
#   chmod +x scripts/setup-sol-dual-domain.sh
#   ./scripts/setup-sol-dual-domain.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERCEL="${VERCEL_BIN:-npx vercel@latest}"
PROJECT_NAME="${SOL_VERCEL_PROJECT:-teachwithsol}"
TEAM_FLAG=()
if [[ -n "${VERCEL_TEAM:-}" ]]; then
  TEAM_FLAG=(--scope "$VERCEL_TEAM")
fi

echo "==> Checking Vercel auth"
if ! $VERCEL whoami "${TEAM_FLAG[@]}" >/dev/null 2>&1; then
  echo "Not logged in. Run: npx vercel login"
  echo "Then re-run this script."
  exit 1
fi
$VERCEL whoami "${TEAM_FLAG[@]}"

echo ""
echo "==> Link project '$PROJECT_NAME'"
echo "    Git should be stratopslearning/teachwithsol — not stratopslearning/sol."
$VERCEL link "${TEAM_FLAG[@]}" --yes --project "$PROJECT_NAME" || true

echo ""
echo "==> Set teachwithsol-specific Production public env"
set_env() {
  local key="$1" val="$2"
  $VERCEL env rm "$key" production -y "${TEAM_FLAG[@]}" 2>/dev/null || true
  printf '%s' "$val" | $VERCEL env add "$key" production "${TEAM_FLAG[@]}"
}

set_env NEXT_PUBLIC_BASE_URL "https://app.teachwithsol.com"
set_env NEXT_PUBLIC_CLERK_SIGN_IN_URL "/login"
set_env NEXT_PUBLIC_CLERK_SIGN_UP_URL "/signup"
set_env NEXT_PUBLIC_SOL_MARKETING_HOST "www.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_APP_HOST "app.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_DOCS_HOST "docs.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_TRUST_HOST "trust.teachwithsol.com"

# Ensure satellite mode is off if previously set
$VERCEL env rm NEXT_PUBLIC_CLERK_IS_SATELLITE production -y "${TEAM_FLAG[@]}" 2>/dev/null || true
$VERCEL env rm NEXT_PUBLIC_CLERK_DOMAIN production -y "${TEAM_FLAG[@]}" 2>/dev/null || true

echo ""
echo "IMPORTANT: In Vercel → $PROJECT_NAME → Settings → Environment Variables:"
echo "  1. NEXT_PUBLIC_BASE_PATH = empty string (CLI often cannot set empty)"
echo "  2. Paste secrets from scripts/sol-dual-domain.env.example"
echo "     - NEW Clerk keys + webhook secret"
echo "     - NEW Upstash + CRON_SECRET + Braintrust"
echo "     - REUSE Neon, OpenAI, Inngest"
echo "     - EMAIL_ENABLED=true + EMAIL_FROM + AWS_REGION"
echo "     - PLATFORM_STAFF_GRANTORS"
echo "  3. Unset any leftover StratOps satellite / absolute sign-in URLs"
echo "  4. Settings → Git: connect stratopslearning/teachwithsol"
echo "  5. Enable Production Cron Jobs (this project owns crons on its Neon)"

echo ""
echo "==> Domains (skip if already attached)"
for d in teachwithsol.com www.teachwithsol.com app.teachwithsol.com docs.teachwithsol.com trust.teachwithsol.com; do
  echo "--- $d"
  $VERCEL domains add "$d" "${TEAM_FLAG[@]}" || true
done

echo ""
echo "==> Clerk (NEW standalone Production app)"
echo "  Domains: app.teachwithsol.com (and www if marketing signs in)"
echo "  Allowed redirect URLs:"
echo "    https://app.teachwithsol.com/login"
echo "    https://app.teachwithsol.com/signup"
echo "    https://app.teachwithsol.com/login/sso-callback"
echo "    https://app.teachwithsol.com/signup/sso-callback"
echo "  Webhook: https://app.teachwithsol.com/api/clerk/webhook"
echo "  Do NOT configure StratOps satellite domains for this product."

echo ""
echo "==> Inngest"
echo "  Reuse existing keys; set serve/sync URL to"
echo "    https://app.teachwithsol.com/api/inngest"

echo ""
echo "==> Deploy"
echo "  $VERCEL --prod ${TEAM_FLAG[*]}"
echo "  Leave StratOps Vercel on stratopslearning/sol untouched."
echo "Done."
