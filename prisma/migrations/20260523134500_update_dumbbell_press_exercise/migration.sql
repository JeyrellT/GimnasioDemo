-- Data fix: classify the private "Press con mancuernas" exercise.
-- The body-map model is unchanged; this maps dumbbell shoulder press to the
-- closest existing muscle groups.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'SHOULDERS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['TRICEPS'::"MuscleGroup", 'CHEST'::"MuscleGroup"],
    "instructionsEs" = 'Sentate o parate con una mancuerna en cada mano a la altura de los hombros, palmas al frente o ligeramente hacia adentro. Contrae el core, mantene el pecho arriba y presiona las mancuernas hacia arriba y ligeramente hacia adentro hasta extender los brazos sin bloquear fuerte los codos. Baja controlado hasta volver a la altura de los hombros, evitando arquear la espalda o dejar que las mancuernas se vayan muy al frente.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpdws6so001lpm3lr38iwwo0'
  OR (
    lower("nameEs") = lower('Press con mancuernas')
    AND "createdById" IS NOT NULL
  );
