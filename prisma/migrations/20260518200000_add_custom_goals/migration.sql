-- AlterTable: change goal from RoutineGoal enum to plain text.
-- Order matters: DROP DEFAULT first (it depends on the enum type), then
-- cast the column to TEXT, then set the new TEXT default. Only then is it
-- safe to DROP the unreferenced enum type.
ALTER TABLE "RoutineTemplate" ALTER COLUMN "goal" DROP DEFAULT;
ALTER TABLE "RoutineTemplate" ALTER COLUMN "goal" SET DATA TYPE TEXT USING "goal"::TEXT;
ALTER TABLE "RoutineTemplate" ALTER COLUMN "goal" SET DEFAULT 'HYPERTROPHY';

-- DropEnum (no longer referenced by any column)
DROP TYPE IF EXISTS "RoutineGoal";

-- CreateTable
CREATE TABLE "CustomGoal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomGoal_trainerId_idx" ON "CustomGoal"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomGoal_trainerId_name_key" ON "CustomGoal"("trainerId", "name");

-- AddForeignKey
ALTER TABLE "CustomGoal" ADD CONSTRAINT "CustomGoal_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
