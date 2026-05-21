#!/bin/bash
set -e

PROJECT_REF=$(grep SUPABASE_PROJECT_REF .env.local 2>/dev/null | cut -d= -f2)
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env.local 2>/dev/null | cut -d= -f2)
SERVICE_ROLE=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local 2>/dev/null | cut -d= -f2)
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.local 2>/dev/null | cut -d= -f2)
APP_URL=$(grep APP_URL .env.local 2>/dev/null | cut -d= -f2)

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Create .env.local from .env.example first"
  exit 1
fi

echo "🔗 Linking $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

supabase secrets set \
  TELEGRAM_BOT_TOKEN="$BOT_TOKEN" \
  APP_URL="${APP_URL:-https://t.me/bro_squid_bot/app}" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE"

echo "🚀 Deploying functions..."
supabase functions deploy verify-init-data --no-verify-jwt
supabase functions deploy squid-bot --no-verify-jwt
supabase functions deploy room-tick --no-verify-jwt
supabase functions deploy match-queue --no-verify-jwt
supabase functions deploy create-invoice --no-verify-jwt

FUNCTION_URL="${SUPABASE_URL}/functions/v1/squid-bot"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${FUNCTION_URL}" | python3 -m json.tool 2>/dev/null || true
curl -s "${FUNCTION_URL}?setup=1" | python3 -m json.tool 2>/dev/null || true

echo "✅ Done. Run migrations in Supabase SQL Editor: 001 → 002"
