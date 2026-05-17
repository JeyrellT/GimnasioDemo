#!/bin/sh
# =============================================================================
# VIZION — Railway startup script
# Self-healing: tries migrate deploy first. If DB state is corrupted,
# resets with db push --force-reset and marks all migrations as applied.
# =============================================================================

set -e

echo ">>> Running prisma migrate deploy..."
if pnpm exec prisma migrate deploy; then
  echo ">>> Migrations applied successfully"
else
  echo ">>> migrate deploy failed — resetting DB schema..."
  pnpm exec prisma db push --force-reset --accept-data-loss --skip-generate
  echo ">>> Marking migrations as applied..."
  pnpm exec prisma migrate resolve --applied 20260506000000_init
  pnpm exec prisma migrate resolve --applied 20260506175122_add_password_hash
  pnpm exec prisma migrate resolve --applied 20260507185543_add_finance_onboarding
  echo ">>> DB reset complete"
fi

echo ">>> Starting Next.js..."
exec pnpm start
