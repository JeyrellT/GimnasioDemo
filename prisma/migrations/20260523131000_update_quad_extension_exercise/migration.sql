-- Data fix: classify the private "Extensión de cuádriceps" exercise.
-- The body-map model is unchanged; this only maps the exercise to QUADS and
-- fills the empty instruction text shown in production.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'QUADS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY[]::"MuscleGroup"[],
  "instructionsEs" = 'Sentate en la máquina con la espalda firme contra el respaldo y el rodillo justo sobre los tobillos. Alineá las rodillas con el eje de la máquina, agarrá las manijas y extendé las piernas de forma controlada hasta casi bloquear, apretando los cuádriceps arriba. Bajá lento sin dejar caer el peso ni despegar las caderas del asiento.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpe8xwwt000sqm3rtx4oga5r'
  OR (
    lower("nameEs") = lower('Extensión de cuádriceps')
    AND "createdById" IS NOT NULL
  );
