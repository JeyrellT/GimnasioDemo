-- Per-routine video URL for an exercise prescription.
-- Lets a trainer paste a Drive/YouTube/Vimeo link on a specific routine
-- exercise without mutating the shared catalog row (which would leak across
-- trainers for public seed exercises).

ALTER TABLE "RoutineExercise"
ADD COLUMN "mediaUrl" TEXT;
