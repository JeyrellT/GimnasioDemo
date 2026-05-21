-- =============================================================================
-- BLACKLINE FITNESS — Extend BodyMetric with bilateral circumferences + body comp
-- Owner: database-architect.
--
-- Problem: MeasurementsExtraction (OCR) captures 18 bilateral circumferences
-- and 5 body-composition metrics, but BodyMetric only persists 9 fields.
-- Result: 11 zones rendered "Sin medir" in the client profile even after a
-- successful OCR upload.
--
-- Approach: ADD COLUMN (additive, non-destructive). Legacy armCm / thighCm
-- are KEPT for historical data continuity — read path falls back to them
-- when the new lateralized columns are null.
--
-- All columns are nullable: this is a time-series table, not every weigh-in
-- captures every zone.
-- =============================================================================

-- AlterTable
ALTER TABLE "BodyMetric"
    ADD COLUMN "shoulderLeftCm"     DECIMAL(4,1),
    ADD COLUMN "shoulderRightCm"    DECIMAL(4,1),
    ADD COLUMN "abdomenCm"          DECIMAL(4,1),
    ADD COLUMN "gluteLeftCm"        DECIMAL(4,1),
    ADD COLUMN "gluteRightCm"       DECIMAL(4,1),
    ADD COLUMN "bicepLeftCm"        DECIMAL(4,1),
    ADD COLUMN "bicepRightCm"       DECIMAL(4,1),
    ADD COLUMN "forearmLeftCm"      DECIMAL(4,1),
    ADD COLUMN "forearmRightCm"     DECIMAL(4,1),
    ADD COLUMN "thighLeftCm"        DECIMAL(4,1),
    ADD COLUMN "thighRightCm"       DECIMAL(4,1),
    ADD COLUMN "hamstringLeftCm"    DECIMAL(4,1),
    ADD COLUMN "hamstringRightCm"   DECIMAL(4,1),
    ADD COLUMN "calfLeftCm"         DECIMAL(4,1),
    ADD COLUMN "calfRightCm"        DECIMAL(4,1),
    ADD COLUMN "visceralFat"        INTEGER,
    ADD COLUMN "basalMetabolicRate" INTEGER;
