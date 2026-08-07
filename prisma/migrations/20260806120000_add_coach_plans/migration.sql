-- Planes vigentes de Blackline: el coach elige uno al terminar la prueba.
--   COACH     ₡15.000 — sin asistente de IA
--   COACH_IA  ₡20.000 — con asistente de IA
--
-- Los tiers viejos (SOLO / PRO / STUDIO) NO se eliminan del enum: hay cuentas
-- que los referencian y borrarlos rompería esas filas. Se retiran del catálogo
-- con soft-delete más abajo, así dejan de ofrecerse sin perder el histórico.

ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'COACH';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'COACH_IA';
