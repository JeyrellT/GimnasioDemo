-- Data fix: classify private "Curl Scott" and "Elevaciones frontales" exercises.
-- The body-map model is unchanged; these map the exercises to existing muscle groups.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'BICEPS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['FOREARMS'::"MuscleGroup"],
  "instructionsEs" = 'Sentate en el banco Scott con el pecho apoyado y los brazos firmes sobre la almohadilla. Toma la barra o mancuernas con agarre supino, subi flexionando los codos hasta contraer el biceps y baja lento hasta casi extender los brazos, sin rebotar abajo ni despegar los codos del apoyo.',
  "updatedAt" = NOW()
WHERE
  lower("nameEs") = lower('Curl Scott')
  AND "createdById" IS NOT NULL;

UPDATE "Exercise"
SET
  "primaryMuscle" = 'SHOULDERS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['CHEST'::"MuscleGroup", 'BACK'::"MuscleGroup"],
  "instructionsEs" = 'De pie, sostene las mancuernas frente a los muslos con los codos ligeramente flexionados. Activa el core y eleva los brazos al frente de forma controlada hasta la altura de los hombros; baja lento sin balancear el cuerpo, sin encoger los hombros y sin arquear la espalda.',
  "updatedAt" = NOW()
WHERE
  lower("nameEs") = lower('Elevaciones frontales')
  AND "createdById" IS NOT NULL;
