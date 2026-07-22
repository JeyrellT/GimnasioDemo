-- Data fix: classify the private assisted dip / triceps dip exercise.
-- The body-map model is unchanged; this maps the exercise to existing muscle groups.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'TRICEPS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['CHEST'::"MuscleGroup", 'SHOULDERS'::"MuscleGroup"],
  "instructionsEs" = 'Ajusta la asistencia de la maquina, apoya las rodillas o pies en la plataforma y toma las barras con agarre firme. Mantene el pecho arriba, hombros abajo y codos cerca del cuerpo; baja controlado hasta que los codos queden cerca de 90 grados y empuja hasta extender los brazos sin bloquearlos fuerte.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpe8xx1z001wqm3rfl17wgme';
