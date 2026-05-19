-- Backfill thumbnailUrl + gifUrl + mediaUrl on warmup exercises and any
-- Spanish-slug exercises that were left with NULL media. Each slug is
-- mapped to the closest existing image in /public/exercises/ (English-named).
-- The client-side ExerciseThumbnail fallback chain would resolve these too,
-- but populating the DB lets the same URLs be reused outside the UI (emails,
-- snapshots, exports) without re-running the resolver.

-- ═══════════════════════════════════════════════════════════════════════════
-- WARMUPS (30 rows)
-- ═══════════════════════════════════════════════════════════════════════════

-- Cardio
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='cardio-en-maquina' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='saltos-de-tijera' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='rodillas-altas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/lying-leg-curl.jpg', "gifUrl"='/exercises/lying-leg-curl.jpg', "mediaUrl"='/exercises/lying-leg-curl.jpg' WHERE slug='talones-a-gluteos' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='saltar-la-cuerda' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='mountain-climbers' AND "thumbnailUrl" IS NULL;

-- Movilidad
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='circulos-de-hombros' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='circulos-de-brazos' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hip-thrust.jpg', "gifUrl"='/exercises/hip-thrust.jpg', "mediaUrl"='/exercises/hip-thrust.jpg' WHERE slug='circulos-de-cadera' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='circulos-de-tobillos' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='gato-camello' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-lunge.jpg', "gifUrl"='/exercises/barbell-lunge.jpg', "mediaUrl"='/exercises/barbell-lunge.jpg' WHERE slug='worlds-greatest-stretch' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='inchworm' AND "thumbnailUrl" IS NULL;

-- Activacion
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='sentadilla-con-peso-corporal' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-lunge.jpg', "gifUrl"='/exercises/barbell-lunge.jpg', "mediaUrl"='/exercises/barbell-lunge.jpg' WHERE slug='zancadas-caminando' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hip-thrust.jpg', "gifUrl"='/exercises/hip-thrust.jpg', "mediaUrl"='/exercises/hip-thrust.jpg' WHERE slug='puente-de-gluteo' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='bird-dog' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='plancha-isometrica' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dips.jpg', "gifUrl"='/exercises/dips.jpg', "mediaUrl"='/exercises/dips.jpg' WHERE slug='push-ups-lentos' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='band-pull-aparts' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='face-pulls-con-banda' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hip-thrust.jpg', "gifUrl"='/exercises/hip-thrust.jpg', "mediaUrl"='/exercises/hip-thrust.jpg' WHERE slug='monster-walks-con-banda' AND "thumbnailUrl" IS NULL;

-- Estiramientos
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/leg-extension.jpg', "gifUrl"='/exercises/leg-extension.jpg', "mediaUrl"='/exercises/leg-extension.jpg' WHERE slug='estiramiento-cuadriceps-de-pie' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/lying-leg-curl.jpg', "gifUrl"='/exercises/lying-leg-curl.jpg', "mediaUrl"='/exercises/lying-leg-curl.jpg' WHERE slug='estiramiento-isquiotibiales-sentado' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='estiramiento-gemelos-en-pared' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hip-thrust.jpg', "gifUrl"='/exercises/hip-thrust.jpg', "mediaUrl"='/exercises/hip-thrust.jpg' WHERE slug='figura-4-supino' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/leg-extension.jpg', "gifUrl"='/exercises/leg-extension.jpg', "mediaUrl"='/exercises/leg-extension.jpg' WHERE slug='estiramiento-flexor-de-cadera' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-bench-press.jpg', "gifUrl"='/exercises/barbell-bench-press.jpg', "mediaUrl"='/exercises/barbell-bench-press.jpg' WHERE slug='estiramiento-pecho-en-puerta' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plank.jpg', "gifUrl"='/exercises/plank.jpg', "mediaUrl"='/exercises/plank.jpg' WHERE slug='postura-del-nino' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/cable-pushdown.jpg', "gifUrl"='/exercises/cable-pushdown.jpg', "mediaUrl"='/exercises/cable-pushdown.jpg' WHERE slug='estiramiento-triceps-sobre-cabeza' AND "thumbnailUrl" IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO / SPANISH STRENGTH EXERCISES that may have NULL thumbnails
-- (idempotent — only updates when current value is NULL)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-bench-press.jpg', "gifUrl"='/exercises/barbell-bench-press.jpg', "mediaUrl"='/exercises/barbell-bench-press.jpg' WHERE slug='press-de-banca-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/incline-bench-press.jpg', "gifUrl"='/exercises/incline-bench-press.jpg', "mediaUrl"='/exercises/incline-bench-press.jpg' WHERE slug='press-inclinado-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-fly.jpg', "gifUrl"='/exercises/dumbbell-fly.jpg', "mediaUrl"='/exercises/dumbbell-fly.jpg' WHERE slug='aperturas-mancuernas-plano' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dips.jpg', "gifUrl"='/exercises/dips.jpg', "mediaUrl"='/exercises/dips.jpg' WHERE slug='fondos-pecho' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/pull-up.jpg', "gifUrl"='/exercises/pull-up.jpg', "mediaUrl"='/exercises/pull-up.jpg' WHERE slug='dominadas-agarre-prono' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-bent-over-row.jpg', "gifUrl"='/exercises/barbell-bent-over-row.jpg', "mediaUrl"='/exercises/barbell-bent-over-row.jpg' WHERE slug='remo-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/lat-pulldown.jpg', "gifUrl"='/exercises/lat-pulldown.jpg', "mediaUrl"='/exercises/lat-pulldown.jpg' WHERE slug='jalon-polea-agarre-amplio' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/conventional-deadlift.png', "gifUrl"='/exercises/conventional-deadlift.png', "mediaUrl"='/exercises/conventional-deadlift.png' WHERE slug='peso-muerto-convencional' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-bent-over-row.jpg', "gifUrl"='/exercises/barbell-bent-over-row.jpg', "mediaUrl"='/exercises/barbell-bent-over-row.jpg' WHERE slug='remo-con-mancuerna' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-fly.jpg', "gifUrl"='/exercises/dumbbell-fly.jpg', "mediaUrl"='/exercises/dumbbell-fly.jpg' WHERE slug='pullover-mancuerna' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/overhead-press.jpg', "gifUrl"='/exercises/overhead-press.jpg', "mediaUrl"='/exercises/overhead-press.jpg' WHERE slug='press-militar-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='elevaciones-laterales-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/arnold-press.jpg', "gifUrl"='/exercises/arnold-press.jpg', "mediaUrl"='/exercises/arnold-press.jpg' WHERE slug='press-arnold' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/overhead-press.jpg', "gifUrl"='/exercises/overhead-press.jpg', "mediaUrl"='/exercises/overhead-press.jpg' WHERE slug='press-militar-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-lateral-raise.jpg', "gifUrl"='/exercises/dumbbell-lateral-raise.jpg', "mediaUrl"='/exercises/dumbbell-lateral-raise.jpg' WHERE slug='remo-al-cuello-barra-z' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-curl.jpg', "gifUrl"='/exercises/barbell-curl.jpg', "mediaUrl"='/exercises/barbell-curl.jpg' WHERE slug='curl-de-biceps-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hammer-curl.jpg', "gifUrl"='/exercises/hammer-curl.jpg', "mediaUrl"='/exercises/hammer-curl.jpg' WHERE slug='curl-martillo-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-curl.jpg', "gifUrl"='/exercises/barbell-curl.jpg', "mediaUrl"='/exercises/barbell-curl.jpg' WHERE slug='curl-biceps-mancuerna' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hammer-curl.jpg', "gifUrl"='/exercises/hammer-curl.jpg', "mediaUrl"='/exercises/hammer-curl.jpg' WHERE slug='biceps-hold-isometrico' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/cable-pushdown.jpg', "gifUrl"='/exercises/cable-pushdown.jpg', "mediaUrl"='/exercises/cable-pushdown.jpg' WHERE slug='extensiones-triceps-polea' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/bench-dip.jpg', "gifUrl"='/exercises/bench-dip.jpg', "mediaUrl"='/exercises/bench-dip.jpg' WHERE slug='fondos-triceps-banco' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='sentadilla-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/leg-press.jpg', "gifUrl"='/exercises/leg-press.jpg', "mediaUrl"='/exercises/leg-press.jpg' WHERE slug='prensa-de-piernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/leg-extension.jpg', "gifUrl"='/exercises/leg-extension.jpg', "mediaUrl"='/exercises/leg-extension.jpg' WHERE slug='extension-de-cuadriceps-maquina' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-lunge.jpg', "gifUrl"='/exercises/barbell-lunge.jpg', "mediaUrl"='/exercises/barbell-lunge.jpg' WHERE slug='desplante-bulgaro-mancuerna' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='salto-con-sentadilla' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='sentadilla-isometrica-pared' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-lunge.jpg', "gifUrl"='/exercises/barbell-lunge.jpg', "mediaUrl"='/exercises/barbell-lunge.jpg' WHERE slug='step-up-banco' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/lying-leg-curl.jpg', "gifUrl"='/exercises/lying-leg-curl.jpg', "mediaUrl"='/exercises/lying-leg-curl.jpg' WHERE slug='curl-femoral-tumbado' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/romanian-deadlift.jpg', "gifUrl"='/exercises/romanian-deadlift.jpg', "mediaUrl"='/exercises/romanian-deadlift.jpg' WHERE slug='peso-muerto-rumano' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/hip-thrust.jpg', "gifUrl"='/exercises/hip-thrust.jpg', "mediaUrl"='/exercises/hip-thrust.jpg' WHERE slug='hip-thrust-con-barra' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-lunge.jpg', "gifUrl"='/exercises/barbell-lunge.jpg', "mediaUrl"='/exercises/barbell-lunge.jpg' WHERE slug='zancadas-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='elevaciones-de-gemelos-maquina' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/seated-calf-raise.jpg', "gifUrl"='/exercises/seated-calf-raise.jpg', "mediaUrl"='/exercises/seated-calf-raise.jpg' WHERE slug='elevaciones-gemelos-sentado' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/standing-calf-raise.jpg', "gifUrl"='/exercises/standing-calf-raise.jpg', "mediaUrl"='/exercises/standing-calf-raise.jpg' WHERE slug='elevacion-talon-smith' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/crunch.jpg', "gifUrl"='/exercises/crunch.jpg', "mediaUrl"='/exercises/crunch.jpg' WHERE slug='crunch-abdominal' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/ab-rollout.jpg', "gifUrl"='/exercises/ab-rollout.jpg', "mediaUrl"='/exercises/ab-rollout.jpg' WHERE slug='rueda-de-abdomen' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/crunch.jpg', "gifUrl"='/exercises/crunch.jpg', "mediaUrl"='/exercises/crunch.jpg' WHERE slug='russian-twist' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/dumbbell-clean-and-press.jpg', "gifUrl"='/exercises/dumbbell-clean-and-press.jpg', "mediaUrl"='/exercises/dumbbell-clean-and-press.jpg' WHERE slug='clean-and-press-mancuernas' AND "thumbnailUrl" IS NULL;
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/barbell-back-squat.jpg', "gifUrl"='/exercises/barbell-back-squat.jpg', "mediaUrl"='/exercises/barbell-back-squat.jpg' WHERE slug='burpee' AND "thumbnailUrl" IS NULL;
