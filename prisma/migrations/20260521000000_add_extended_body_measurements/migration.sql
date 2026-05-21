-- =============================================================================
-- BLACKLINE FITNESS — Extended body measurements
-- Owner: database-architect.
--
-- Adds lateralized circumferences (left/right) y composición ampliada
-- (visceralFat, basalMetabolicRate) al modelo BodyMetric.
--
-- Backward compat: las columnas legacy `armCm` y `thighCm` se conservan; el
-- action `recordBodyMetric` las espeja desde bicepLeft/Right y quadLeft/Right
-- respectivamente para que readers viejos no rompan. Cuando todos los lectores
-- migren a los campos L/R, una migración posterior puede dropearlas.
--
-- Idempotente: usa `ADD COLUMN IF NOT EXISTS` por si la migración se reaplica
-- después de un rollback parcial (Postgres ≥ 9.6 lo soporta nativo).
-- =============================================================================

-- ── Composición ──────────────────────────────────────────────────────────────
ALTER TABLE "BodyMetric"
    ADD COLUMN IF NOT EXISTS "visceralFat" INTEGER,
    ADD COLUMN IF NOT EXISTS "basalMetabolicRate" INTEGER;

-- ── Tronco ───────────────────────────────────────────────────────────────────
ALTER TABLE "BodyMetric"
    ADD COLUMN IF NOT EXISTS "shoulderLeftCm"  DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "shoulderRightCm" DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "abdomenCm"       DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "gluteLeftCm"     DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "gluteRightCm"    DECIMAL(4,1);

-- ── Brazos ───────────────────────────────────────────────────────────────────
ALTER TABLE "BodyMetric"
    ADD COLUMN IF NOT EXISTS "bicepLeftCm"    DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "bicepRightCm"   DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "forearmLeftCm"  DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "forearmRightCm" DECIMAL(4,1);

-- ── Piernas ──────────────────────────────────────────────────────────────────
ALTER TABLE "BodyMetric"
    ADD COLUMN IF NOT EXISTS "quadLeftCm"        DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "quadRightCm"       DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "hamstringLeftCm"   DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "hamstringRightCm"  DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "calfLeftCm"        DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS "calfRightCm"       DECIMAL(4,1);
