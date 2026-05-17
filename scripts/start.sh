#!/bin/sh
# =============================================================================
# VIZION — Railway startup script
# Self-healing: tries migrate deploy first. If DB state is corrupted,
# resets with db push --force-reset and marks all migrations as applied.
# =============================================================================

set -e

MAX_RETRIES=3
RETRY_DELAY=5

echo ">>> Running prisma migrate deploy..."
attempt=1
migrate_ok=false

while [ "$attempt" -le "$MAX_RETRIES" ]; do
  if pnpm exec prisma migrate deploy; then
    echo ">>> Migrations applied successfully"
    migrate_ok=true
    break
  else
    echo ">>> migrate deploy failed (attempt $attempt/$MAX_RETRIES)"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      echo ">>> Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
    attempt=$((attempt + 1))
  fi
done

if [ "$migrate_ok" = false ]; then
  echo ">>> All $MAX_RETRIES migrate attempts failed — resetting DB schema..."
  echo ">>> WARNING: This will drop all tables and recreate them!"
  pnpm exec prisma db push --force-reset --accept-data-loss --skip-generate
  echo ">>> Marking migrations as applied..."
  pnpm exec prisma migrate resolve --applied 20260506000000_init
  pnpm exec prisma migrate resolve --applied 20260506175122_add_password_hash
  pnpm exec prisma migrate resolve --applied 20260507185543_add_finance_onboarding
  echo ">>> DB reset complete"
fi

echo ">>> Starting Next.js..."
exec pnpm start
