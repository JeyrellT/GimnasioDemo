-- =============================================================================
-- Restore search + dashboard indexes
--
-- (1) Exercise.searchVector GIN index — recreates the index that was dropped
--     in 20260506175122_add_password_hash without a replacement. The tsvector
--     trigger from the init migration still populates the column, but without
--     this index every searchExercises() call falls back to Seq Scan over the
--     whole Exercise table. Restored as CREATE INDEX IF NOT EXISTS so re-running
--     the migration is idempotent.
--
-- (2) WorkoutSession composite index on (status, clientUserId, startedAt) —
--     dashboard.actions.ts filters on this triple ubiquitously (KPIs, sparklines,
--     adherence). Partial index excluding soft-deleted rows keeps it lean.
--
-- Hotfix: removido CONCURRENTLY del index (2). `prisma migrate deploy` envuelve
-- cada migration en una transaccion implicita, y `CREATE INDEX CONCURRENTLY`
-- no puede correr dentro de un BEGIN/COMMIT — falla con:
--   ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- Esto tumbo el deploy de PR #96. WorkoutSession aun es chica en prod, el
-- lock momentaneo de un CREATE INDEX normal es aceptable. Si la tabla crece
-- y se necesita zero-downtime, se puede recrear con CONCURRENTLY via psql
-- directo (fuera de prisma migrate) en una ventana de mantenimiento.
--
-- Both indexes are safe to add: they don't change query results, only their cost.
-- =============================================================================

CREATE INDEX IF NOT EXISTS "Exercise_searchVector_idx"
  ON "Exercise" USING gin ("searchVector");

CREATE INDEX IF NOT EXISTS "WorkoutSession_status_client_startedAt_idx"
  ON "WorkoutSession" ("status", "clientUserId", "startedAt" DESC)
  WHERE "deletedAt" IS NULL;
