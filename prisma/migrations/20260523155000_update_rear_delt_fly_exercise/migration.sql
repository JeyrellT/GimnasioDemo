-- Data fix: classify the private rear delt fly exercise.
-- The body-map model is unchanged; this maps the exercise to existing muscle groups.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'SHOULDERS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['BACK'::"MuscleGroup"],
  "instructionsEs" = 'Inclinate desde la cadera con la espalda recta y el core activo, sosteniendo las mancuernas debajo de los hombros. Con los codos ligeramente flexionados, eleva los brazos hacia los lados hasta la linea del torso, apretando la parte posterior de los hombros; baja lento sin balancearte ni encoger los hombros.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpdws6sp0029pm3rms0noxly';
