-- Classify routine templates by their intended audience without changing the
-- behavior of existing routines. Legacy rows default to UNISEX.
CREATE TYPE "RoutineAudience" AS ENUM ('UNISEX', 'MALE', 'FEMALE');

ALTER TABLE "RoutineTemplate"
ADD COLUMN "audience" "RoutineAudience" NOT NULL DEFAULT 'UNISEX';

CREATE INDEX "RoutineTemplate_audience_idx" ON "RoutineTemplate"("audience");
