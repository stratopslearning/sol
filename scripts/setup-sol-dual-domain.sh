#!/usr/bin/env bash
# Interactive ops helper for the Sol (teachwithsol.com) Vercel project.
# Requires: vercel CLI logged in (`npx vercel login`), Cloudflare DNS access,
# and Clerk Production dashboard (or `clerk link` to the SOL production app).
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
echo "==> Link / create project '$PROJECT_NAME' (same git repo as StratOps)"
echo "    When prompted, create a NEW project — do not overwrite StratOps."
$VERCEL link "${TEAM_FLAG[@]}" --yes --project "$PROJECT_NAME" || true

echo ""
echo "==> Set Sol-specific Production env (shared secrets: copy from StratOps UI)"
set_env() {
  local key="$1" val="$2"
  # Remove existing then add (idempotent-ish)
  $VERCEL env rm "$key" production -y "${TEAM_FLAG[@]}" 2>/dev/null || true
  printf '%s' "$val" | $VERCEL env add "$key" production "${TEAM_FLAG[@]}"
}

# Empty BASE_PATH: vercel env add may not accept empty; set via dashboard if this fails.
set_env NEXT_PUBLIC_BASE_URL "https://app.teachwithsol.com"
set_env NEXT_PUBLIC_CLERK_SIGN_IN_URL "/login"
set_env NEXT_PUBLIC_CLERK_SIGN_UP_URL "/signup"
set_env NEXT_PUBLIC_SOL_MARKETING_HOST "www.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_APP_HOST "app.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_DOCS_HOST "docs.teachwithsol.com"
set_env NEXT_PUBLIC_SOL_TRUST_HOST "trust.teachwithsol.com"

echo ""
echo "IMPORTANT: In Vercel → $PROJECT_NAME → Settings → Environment Variables,"
echo "  add NEXT_PUBLIC_BASE_PATH with an empty value for Production"
echo "  (CLI often cannot set empty strings). Copy all other secrets from StratOps."
echo "  See scripts/sol-dual-domain.env.example"

echo ""
echo "==> Add domains (Vercel will print DNS targets)"
for d in teachwithsol.com www.teachwithsol.com app.teachwithsol.com docs.teachwithsol.com trust.teachwithsol.com; do
  echo "--- $d"
  $VERCEL domains add "$d" "${TEAM_FLAG[@]}" || true
done

echo ""
echo "==> Cloudflare DNS (zone teachwithsol.com)"
echo "  For each hostname Vercel listed, create a CNAME (orange or grey cloud):"
echo "    www / app / docs / trust  →  cname.vercel-dns.com"
echo "    @ (apex)                  →  CNAME flattening to same target"
echo "  Or use the exact A/CNAME values from: Vercel → Project → Domains"

echo ""
echo "==> Clerk Production allowlist (keep strat-ops URLs)"
echo "  Add allowed redirect URLs:"
echo "    https://app.teachwithsol.com/login"
echo "    https://app.teachwithsol.com/signup"
echo "    https://app.teachwithsol.com/login/sso-callback"
echo "    https://app.teachwithsol.com/signup/sso-callback"
echo "    https://www.teachwithsol.com"
echo "    https://teachwithsol.com"
echo "  Do NOT remove https://www.strat-ops.net/learning/..."

echo ""
echo "==> Deploy"
echo "  $VERCEL --prod ${TEAM_FLAG[*]}"
echo "  Confirm StratOps project still has BASE_PATH unset or /learning and still runs crons."
echo "Done."
