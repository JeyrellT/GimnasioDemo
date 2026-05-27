-- =============================================================================
-- Client rest preferences
--
-- Allows each client to customize the rest periods of their assigned routines
-- without modifying the snapshot the trainer prescribed. Persists across
-- routine reassignments (1-1 with User, not with AssignedRoutine).
--
-- Resolution at runtime:
--   1. If exerciseOverrides[exerciseId] is set → use that absolute value.
--   2. Else → baseRestSeconds + globalOffsetSec (clamped to >= 0).
-- =============================================================================

CREATE TABLE "ClientRestPreference" (
  "id"                TEXT        NOT NULL,
  "userId"            TEXT        NOT NULL,
  "globalOffsetSec"   INTEGER     NOT NULL DEFAULT 0,
  "exerciseOverrides" JSONB       NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientRestPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientRestPreference_userId_key"
  ON "ClientRestPreference"("userId");

ALTER TABLE "ClientRestPreference"
  ADD CONSTRAINT "ClientRestPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
