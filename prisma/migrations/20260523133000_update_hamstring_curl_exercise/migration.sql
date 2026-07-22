-- Data fix: classify the private "Curl femoral" exercise.
-- The body-map model is unchanged; this only maps the exercise to the closest
-- existing muscle groups and fills the empty instruction text shown in production.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'HAMSTRINGS'::"MuscleGroup",
  "secondaryMuscles" = ARRAY['CALVES'::"MuscleGroup"],
  "instructionsEs" = 'Acostate boca abajo en la máquina de curl femoral con el rodillo justo por encima de los talones y las rodillas alineadas con el eje de la máquina. Agarrá las manijas, mantené las caderas pegadas al banco y flexioná las rodillas llevando los talones hacia los glúteos. Apretá los femorales arriba y bajá lento, sin dejar caer el peso ni arquear la espalda.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpdws6rn001bpm3rdvf1znyr'
  OR (
    lower("nameEs") = lower('Curl femoral')
    AND "createdById" IS NOT NULL
  );
