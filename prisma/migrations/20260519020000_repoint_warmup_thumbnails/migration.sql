-- Repoint warmup thumbnailUrl/gifUrl/mediaUrl to the real warmup images that
-- now live in public/exercises/ (downloaded via scripts/download-warmup-images.mjs
-- from yuhonas/free-exercise-db).
--
-- The previous migration 20260519010000_backfill_warmup_thumbnails set these
-- columns to proxy images (e.g. barbell-back-squat.jpg) because real warmup
-- images did not exist yet. Now they do, so we point each row to its own
-- /exercises/<spanish-slug>.jpg.
--
-- Unconditional UPDATE (no NULL filter) — this overwrites the proxies set by
-- the previous migration. Re-runs are no-ops since we always set to the same
-- canonical URL.

-- ── CARDIO ─────────────────────────────────────────────────────────────────
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/cardio-en-maquina.jpg',           "gifUrl"='/exercises/cardio-en-maquina.jpg',           "mediaUrl"='/exercises/cardio-en-maquina.jpg'           WHERE slug='cardio-en-maquina';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/saltos-de-tijera.jpg',            "gifUrl"='/exercises/saltos-de-tijera.jpg',            "mediaUrl"='/exercises/saltos-de-tijera.jpg'            WHERE slug='saltos-de-tijera';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/rodillas-altas.jpg',              "gifUrl"='/exercises/rodillas-altas.jpg',              "mediaUrl"='/exercises/rodillas-altas.jpg'              WHERE slug='rodillas-altas';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/talones-a-gluteos.jpg',           "gifUrl"='/exercises/talones-a-gluteos.jpg',           "mediaUrl"='/exercises/talones-a-gluteos.jpg'           WHERE slug='talones-a-gluteos';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/saltar-la-cuerda.jpg',            "gifUrl"='/exercises/saltar-la-cuerda.jpg',            "mediaUrl"='/exercises/saltar-la-cuerda.jpg'            WHERE slug='saltar-la-cuerda';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/mountain-climbers.jpg',           "gifUrl"='/exercises/mountain-climbers.jpg',           "mediaUrl"='/exercises/mountain-climbers.jpg'           WHERE slug='mountain-climbers';

-- ── MOVILIDAD ──────────────────────────────────────────────────────────────
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/circulos-de-hombros.jpg',         "gifUrl"='/exercises/circulos-de-hombros.jpg',         "mediaUrl"='/exercises/circulos-de-hombros.jpg'         WHERE slug='circulos-de-hombros';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/circulos-de-brazos.jpg',          "gifUrl"='/exercises/circulos-de-brazos.jpg',          "mediaUrl"='/exercises/circulos-de-brazos.jpg'          WHERE slug='circulos-de-brazos';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/circulos-de-cadera.jpg',          "gifUrl"='/exercises/circulos-de-cadera.jpg',          "mediaUrl"='/exercises/circulos-de-cadera.jpg'          WHERE slug='circulos-de-cadera';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/circulos-de-tobillos.jpg',        "gifUrl"='/exercises/circulos-de-tobillos.jpg',        "mediaUrl"='/exercises/circulos-de-tobillos.jpg'        WHERE slug='circulos-de-tobillos';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/gato-camello.jpg',                "gifUrl"='/exercises/gato-camello.jpg',                "mediaUrl"='/exercises/gato-camello.jpg'                WHERE slug='gato-camello';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/worlds-greatest-stretch.jpg',     "gifUrl"='/exercises/worlds-greatest-stretch.jpg',     "mediaUrl"='/exercises/worlds-greatest-stretch.jpg'     WHERE slug='worlds-greatest-stretch';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/inchworm.jpg',                    "gifUrl"='/exercises/inchworm.jpg',                    "mediaUrl"='/exercises/inchworm.jpg'                    WHERE slug='inchworm';

-- ── ACTIVACION ─────────────────────────────────────────────────────────────
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/sentadilla-con-peso-corporal.jpg',"gifUrl"='/exercises/sentadilla-con-peso-corporal.jpg',"mediaUrl"='/exercises/sentadilla-con-peso-corporal.jpg' WHERE slug='sentadilla-con-peso-corporal';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/zancadas-caminando.jpg',          "gifUrl"='/exercises/zancadas-caminando.jpg',          "mediaUrl"='/exercises/zancadas-caminando.jpg'          WHERE slug='zancadas-caminando';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/puente-de-gluteo.jpg',            "gifUrl"='/exercises/puente-de-gluteo.jpg',            "mediaUrl"='/exercises/puente-de-gluteo.jpg'            WHERE slug='puente-de-gluteo';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/bird-dog.jpg',                    "gifUrl"='/exercises/bird-dog.jpg',                    "mediaUrl"='/exercises/bird-dog.jpg'                    WHERE slug='bird-dog';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/plancha-isometrica.jpg',          "gifUrl"='/exercises/plancha-isometrica.jpg',          "mediaUrl"='/exercises/plancha-isometrica.jpg'          WHERE slug='plancha-isometrica';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/push-ups-lentos.jpg',             "gifUrl"='/exercises/push-ups-lentos.jpg',             "mediaUrl"='/exercises/push-ups-lentos.jpg'             WHERE slug='push-ups-lentos';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/band-pull-aparts.jpg',            "gifUrl"='/exercises/band-pull-aparts.jpg',            "mediaUrl"='/exercises/band-pull-aparts.jpg'            WHERE slug='band-pull-aparts';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/face-pulls-con-banda.jpg',        "gifUrl"='/exercises/face-pulls-con-banda.jpg',        "mediaUrl"='/exercises/face-pulls-con-banda.jpg'        WHERE slug='face-pulls-con-banda';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/monster-walks-con-banda.jpg',     "gifUrl"='/exercises/monster-walks-con-banda.jpg',     "mediaUrl"='/exercises/monster-walks-con-banda.jpg'     WHERE slug='monster-walks-con-banda';

-- ── ESTIRAMIENTOS ──────────────────────────────────────────────────────────
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-cuadriceps-de-pie.jpg',      "gifUrl"='/exercises/estiramiento-cuadriceps-de-pie.jpg',      "mediaUrl"='/exercises/estiramiento-cuadriceps-de-pie.jpg'      WHERE slug='estiramiento-cuadriceps-de-pie';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-isquiotibiales-sentado.jpg', "gifUrl"='/exercises/estiramiento-isquiotibiales-sentado.jpg', "mediaUrl"='/exercises/estiramiento-isquiotibiales-sentado.jpg' WHERE slug='estiramiento-isquiotibiales-sentado';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-gemelos-en-pared.jpg',       "gifUrl"='/exercises/estiramiento-gemelos-en-pared.jpg',       "mediaUrl"='/exercises/estiramiento-gemelos-en-pared.jpg'       WHERE slug='estiramiento-gemelos-en-pared';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/figura-4-supino.jpg',                     "gifUrl"='/exercises/figura-4-supino.jpg',                     "mediaUrl"='/exercises/figura-4-supino.jpg'                     WHERE slug='figura-4-supino';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-flexor-de-cadera.jpg',       "gifUrl"='/exercises/estiramiento-flexor-de-cadera.jpg',       "mediaUrl"='/exercises/estiramiento-flexor-de-cadera.jpg'       WHERE slug='estiramiento-flexor-de-cadera';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-pecho-en-puerta.jpg',        "gifUrl"='/exercises/estiramiento-pecho-en-puerta.jpg',        "mediaUrl"='/exercises/estiramiento-pecho-en-puerta.jpg'        WHERE slug='estiramiento-pecho-en-puerta';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/postura-del-nino.jpg',                    "gifUrl"='/exercises/postura-del-nino.jpg',                    "mediaUrl"='/exercises/postura-del-nino.jpg'                    WHERE slug='postura-del-nino';
UPDATE "Exercise" SET "thumbnailUrl"='/exercises/estiramiento-triceps-sobre-cabeza.jpg',   "gifUrl"='/exercises/estiramiento-triceps-sobre-cabeza.jpg',   "mediaUrl"='/exercises/estiramiento-triceps-sobre-cabeza.jpg'   WHERE slug='estiramiento-triceps-sobre-cabeza';
