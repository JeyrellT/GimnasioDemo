-- Data fix: classify the private "Elevación de talones" exercise.
-- The body-map model is unchanged; gastrocnemius and soleus are represented
-- by the existing CALVES group.

UPDATE "Exercise"
SET
  "primaryMuscle" = 'CALVES'::"MuscleGroup",
  "secondaryMuscles" = ARRAY[]::"MuscleGroup"[],
  "instructionsEs" = 'Parate con la punta de los pies sobre la plataforma y los talones libres para bajar. Mantené el torso erguido, las rodillas extendidas sin bloquear y agarrate para estabilizarte. Bajá los talones de forma controlada hasta sentir estiramiento en las pantorrillas, luego empujá fuerte con la punta de los pies para subir lo más alto posible. Pausá un segundo arriba y descendé lento sin rebotar.',
  "updatedAt" = NOW()
WHERE
  "id" = 'cmpdws6rs001fpm3rvf3kaocx'
  OR (
    lower("nameEs") = lower('Elevación de talones')
    AND "createdById" IS NOT NULL
  );
