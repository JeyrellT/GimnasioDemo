-- Per-trainer override of Exercise.mediaUrl.
-- Lets a coach paste a personal Drive/YouTube/Vimeo link on any exercise
-- (including public seed entries) without mutating the catalog row.
-- The override is scoped to that coach's view + the routines they assign.

CREATE TABLE "TrainerExerciseMedia" (
    "id" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerExerciseMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerExerciseMedia_trainerUserId_exerciseId_key"
    ON "TrainerExerciseMedia"("trainerUserId", "exerciseId");

CREATE INDEX "TrainerExerciseMedia_trainerUserId_idx"
    ON "TrainerExerciseMedia"("trainerUserId");

CREATE INDEX "TrainerExerciseMedia_exerciseId_idx"
    ON "TrainerExerciseMedia"("exerciseId");

ALTER TABLE "TrainerExerciseMedia"
    ADD CONSTRAINT "TrainerExerciseMedia_trainerUserId_fkey"
    FOREIGN KEY ("trainerUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainerExerciseMedia"
    ADD CONSTRAINT "TrainerExerciseMedia_exerciseId_fkey"
    FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
