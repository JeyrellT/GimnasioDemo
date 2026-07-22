#!/bin/sh
# =============================================================================
# BLACKLINE FITNESS — Railway startup script
# Self-healing: tries migrate deploy first. If DB state is corrupted,
# resets with db push --force-reset and marks all migrations as applied.
# =============================================================================

set -e

MAX_RETRIES=3
RETRY_DELAY=5

# =============================================================================
# Auto-resolve known stale "failed" migrations BEFORE migrate deploy.
#
# When a migration fails mid-apply, Prisma leaves the row in _prisma_migrations
# with finished_at=NULL. The next `migrate deploy` then errors out (P3009) and
# requires a manual `migrate resolve --rolled-back <name>` before it will retry.
#
# This block runs the resolve for KNOWN failed migrations (one-time recovery
# from PR #96's CONCURRENTLY bug). Adding a name here is idempotent: if the
# migration is NOT in failed state, prisma errors but we suppress and continue.
# Once the migration applies cleanly, this block becomes a no-op.
#
# To clean up: delete the resolve line once you confirm the migration applied.
# =============================================================================
STALE_MIGRATIONS="20260525180000_restore_search_indexes"
for stale in $STALE_MIGRATIONS; do
  echo ">>> Attempting prisma migrate resolve --rolled-back $stale (idempotent)"
  pnpm exec prisma migrate resolve --rolled-back "$stale" 2>&1 \
    | grep -v "is not in a failed state" \
    || true
done

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
  if [ "${ALLOW_DB_RESET:-false}" = "true" ]; then
    echo ">>> All $MAX_RETRIES migrate attempts failed — resetting DB schema..."
    echo ">>> ALLOW_DB_RESET=true; proceeding with destructive reset."
    echo ">>> WARNING: This will drop all tables and recreate them!"
    pnpm exec prisma db push --force-reset --accept-data-loss --skip-generate
    echo ">>> Marking ALL migrations as applied to keep _prisma_migrations in sync..."
    # Iterate over every migration directory under prisma/migrations and mark it
    # applied. This way the next deploy does NOT try to re-apply migrations whose
    # schema is already live via db push (which would error and trigger another
    # destructive reset on each deploy).
    for dir in prisma/migrations/*/; do
      name=$(basename "$dir")
      if [ "$name" != "migration_lock.toml" ]; then
        pnpm exec prisma migrate resolve --applied "$name" || true
      fi
    done
    echo ">>> DB reset complete"
  else
    echo ">>> FATAL: $MAX_RETRIES migrate attempts failed and ALLOW_DB_RESET is not 'true'."
    echo ">>> Aborting boot. Set ALLOW_DB_RESET=true in Railway dashboard ONLY to allow"
    echo ">>> destructive recovery (drops all tables). NEVER set on production."
    exit 1
  fi
fi

# =============================================================================
# Default-video catalog seed (idempotent)
#
# Applies the URLs in prisma/seed/data/exercise-videos.json to Exercise.mediaUrl
# by slug. Safe to run on every boot — no-ops when nothing changed.
#
# Failures here MUST NOT stop the app from booting (e.g., a malformed JSON
# should leave the catalog untouched but still serve traffic). We swallow the
# exit code and just log.
# =============================================================================
echo ">>> Seeding default exercise videos..."
if pnpm db:seed:videos; then
  echo ">>> Default videos seed completed"
else
  echo ">>> WARN: default-videos seed failed (continuing boot anyway)"
fi

echo ">>> Starting Next.js..."
exec pnpm start
