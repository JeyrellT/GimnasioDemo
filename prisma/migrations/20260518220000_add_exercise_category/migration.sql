-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('STRENGTH', 'WARMUP');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "category" "ExerciseCategory" NOT NULL DEFAULT 'STRENGTH';

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");
