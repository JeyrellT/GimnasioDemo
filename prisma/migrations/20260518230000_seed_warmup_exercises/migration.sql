-- Seed: 30 public warmup exercises (category = WARMUP)
-- Grouped: 6 cardio, 7 movilidad, 9 activacion, 8 estiramientos
-- The searchVector trigger maintains tsvector automatically on INSERT.

INSERT INTO "Exercise" (
  id, slug, "nameEs", "nameEn", "instructionsEs",
  "primaryMuscle", "secondaryMuscles", equipment, difficulty, category,
  "isPublic", "createdAt", "updatedAt"
) VALUES

-- ═══════════════════════════════════════════════════════════════════════════════
-- CARDIO DE CALENTAMIENTO (6)
-- ═══════════════════════════════════════════════════════════════════════════════

(
  'warmup_cardio_maquina', 'cardio-en-maquina',
  'Cardio en máquina', 'Machine Cardio',
  'Elegí cinta, bici estática o remo. Empezá a una intensidad baja (RPE 3-4) y subí gradualmente durante los primeros 2 minutos hasta llegar a una intensidad moderada (RPE 5-6). Mantené una postura erguida, hombros relajados y respiración controlada. El objetivo es elevar la frecuencia cardíaca y aumentar la temperatura corporal. Duración: 3 a 5 minutos.',
  'QUADS', ARRAY['CALVES','GLUTES','HAMSTRINGS']::"MuscleGroup"[],
  'MACHINE', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_saltos_tijera', 'saltos-de-tijera',
  'Saltos de tijera', 'Jumping Jacks',
  'De pie con pies juntos y brazos al costado del cuerpo. Saltá abriendo las piernas al ancho de hombros mientras subís los brazos por encima de la cabeza. Volvé a la posición inicial con otro salto. Mantené las rodillas ligeramente flexionadas al aterrizar para absorber el impacto. Ritmo constante y controlado. Duración: 30 a 60 segundos.',
  'QUADS', ARRAY['CALVES','SHOULDERS','GLUTES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_rodillas_altas', 'rodillas-altas',
  'Rodillas altas', 'High Knees',
  'De pie con los pies al ancho de caderas. Empezá a trotar en el lugar llevando las rodillas hasta la altura de la cadera. Acompañá con un braceo enérgico: cuando sube la rodilla derecha, el brazo izquierdo va adelante y viceversa. Mantené el core activado y la espalda recta. El contacto con el suelo es con la punta de los pies. Duración: 20 a 30 segundos.',
  'QUADS', ARRAY['ABS','GLUTES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_talones_gluteos', 'talones-a-gluteos',
  'Talones a glúteos', 'Butt Kicks',
  'De pie, empezá a trotar en el lugar llevando los talones hacia los glúteos en cada zancada. Mantené el torso erguido y los muslos relativamente perpendiculares al suelo. El movimiento es rápido y ligero, con contacto en la punta de los pies. Ayuda a activar los isquiotibiales y elevar la frecuencia cardíaca. Duración: 20 a 30 segundos.',
  'HAMSTRINGS', ARRAY['CALVES','GLUTES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_saltar_cuerda', 'saltar-la-cuerda',
  'Saltar la cuerda', 'Jump Rope',
  'Agarrá la cuerda con ambas manos a la altura de la cadera. Saltá con rebotes pequeños sobre la punta de los pies, manteniendo las rodillas ligeramente flexionadas. El movimiento de rotación viene de las muñecas, no de los hombros. Mantené el core activado y la mirada al frente. Si no tenés cuerda, simulá el movimiento con los brazos. Duración: 60 a 120 segundos.',
  'CALVES', ARRAY['SHOULDERS','ABS']::"MuscleGroup"[],
  'OTHER', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_mountain_climbers', 'mountain-climbers',
  'Mountain climbers', 'Mountain Climbers',
  'Colocate en posición de plancha alta con las manos debajo de los hombros y el cuerpo en línea recta. Llevá una rodilla al pecho y volvé a la posición inicial mientras llevás la otra rodilla al pecho de forma alternada. Mantené la cadera estable sin que suba ni baje. El ritmo puede ser moderado para calentamiento. Duración: 30 segundos.',
  'ABS', ARRAY['SHOULDERS','QUADS']::"MuscleGroup"[],
  'BODYWEIGHT', 'INTERMEDIATE', 'WARMUP',
  true, NOW(), NOW()
),

-- ═══════════════════════════════════════════════════════════════════════════════
-- MOVILIDAD ARTICULAR (7)
-- ═══════════════════════════════════════════════════════════════════════════════

(
  'warmup_circulos_hombros', 'circulos-de-hombros',
  'Círculos de hombros', 'Shoulder Circles',
  'De pie con los brazos relajados al costado del cuerpo. Elevá los hombros hacia las orejas, llevalos hacia atrás, bajá y completá el círculo hacia adelante. Hacé 10 repeticiones hacia atrás y luego 10 hacia adelante. Los círculos deben ser amplios y controlados. Esto lubrica la articulación glenohumeral y relaja el trapecio.',
  'SHOULDERS', ARRAY['BACK']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_circulos_brazos', 'circulos-de-brazos',
  'Círculos de brazos', 'Arm Circles',
  'De pie, extendé los brazos a los lados en forma de cruz. Empezá haciendo círculos pequeños hacia adelante durante 10 repeticiones, luego aumentá gradualmente el tamaño de los círculos por 10 repeticiones más. Repetí en dirección opuesta. Mantené los brazos rectos y el core activado. Esto activa el deltoides y calienta el manguito rotador.',
  'SHOULDERS', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_circulos_cadera', 'circulos-de-cadera',
  'Círculos de cadera', 'Hip Circles',
  'De pie con las manos en la cintura y los pies al ancho de hombros. Dibujá círculos amplios con la cadera en el sentido de las agujas del reloj durante 8 repeticiones, luego cambiá de dirección. El movimiento debe ser fluido y controlado. Esto mejora la movilidad de la articulación coxofemoral y activa los glúteos y oblicuos.',
  'GLUTES', ARRAY['OBLIQUES','ABS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_circulos_tobillos', 'circulos-de-tobillos',
  'Círculos de tobillos', 'Ankle Circles',
  'De pie, levantá un pie del suelo ligeramente. Rotá el tobillo describiendo círculos amplios: 10 repeticiones en sentido horario y 10 en sentido antihorario. Cambiá de pie y repetí. Podés apoyarte en una pared para mantener el equilibrio. Esto mejora la movilidad del tobillo y activa los músculos estabilizadores del pie.',
  'CALVES', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_gato_camello', 'gato-camello',
  'Gato-camello', 'Cat-Cow',
  'En posición de cuadrupedia con las manos debajo de los hombros y las rodillas debajo de las caderas. Fase gato: redondeá la espalda llevando el mentón al pecho y empujando la columna hacia el techo. Fase camello (vaca): dejá caer el abdomen hacia el suelo, levantá la cabeza y sacá pecho. Alterná entre ambas posiciones de forma fluida. 8 a 10 ciclos completos.',
  'BACK', ARRAY['ABS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_worlds_greatest', 'worlds-greatest-stretch',
  'World''s greatest stretch', 'World''s Greatest Stretch',
  'Desde posición de pie, dá un paso largo al frente en zancada profunda. Colocá la mano del mismo lado del pie adelantado en el suelo. Bajá el codo del lado contrario hacia el pie adelantado. Luego rotá el torso abriendo el brazo hacia el techo y seguilo con la mirada. Volvé a la posición inicial y cambiá de lado. 4 a 6 repeticiones por lado. Este ejercicio trabaja movilidad de cadera, torácica, isquiotibiales y dorsales simultáneamente.',
  'GLUTES', ARRAY['BACK','CHEST','HAMSTRINGS']::"MuscleGroup"[],
  'BODYWEIGHT', 'INTERMEDIATE', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_inchworm', 'inchworm',
  'Inchworm', 'Inchworm',
  'De pie con los pies juntos, inclinarte hacia adelante y colocá las manos en el suelo (podés flexionar ligeramente las rodillas). Caminá con las manos hacia adelante hasta llegar a posición de plancha alta. Mantené un segundo y luego caminá con los pies hacia las manos manteniendo las piernas lo más rectas posible. Ponete de pie y repetí. 5 a 8 repeticiones. Excelente para movilidad de isquiotibiales, core y hombros.',
  'HAMSTRINGS', ARRAY['CALVES','ABS','SHOULDERS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),

-- ═══════════════════════════════════════════════════════════════════════════════
-- ACTIVACION DINAMICA (9)
-- ═══════════════════════════════════════════════════════════════════════════════

(
  'warmup_sentadilla_corporal', 'sentadilla-con-peso-corporal',
  'Sentadilla con peso corporal', 'Bodyweight Squat',
  'De pie con los pies al ancho de hombros y las puntas ligeramente hacia afuera. Bajá flexionando caderas y rodillas como si fueras a sentarte, hasta que los muslos estén paralelos al suelo o un poco más abajo. Mantené el pecho arriba, la espalda recta y las rodillas alineadas con los pies. Empujá el suelo para volver a la posición inicial. 2 series de 10 a 15 repeticiones.',
  'QUADS', ARRAY['GLUTES','HAMSTRINGS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_zancadas_caminando', 'zancadas-caminando',
  'Zancadas caminando', 'Walking Lunges',
  'De pie, dá un paso largo hacia adelante y flexioná ambas rodillas a 90 grados. La rodilla trasera casi toca el suelo. Empujá con el pie delantero y llevá el pie trasero hacia adelante para dar el siguiente paso. Mantené el torso erguido y el core activado durante todo el movimiento. 8 a 10 repeticiones por pierna.',
  'QUADS', ARRAY['GLUTES','HAMSTRINGS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_puente_gluteo', 'puente-de-gluteo',
  'Puente de glúteo', 'Glute Bridge',
  'Acostado boca arriba con las rodillas flexionadas y los pies apoyados en el suelo al ancho de caderas. Los brazos extendidos al costado del cuerpo. Apretá los glúteos y levantá las caderas hasta formar una línea recta desde los hombros hasta las rodillas. Mantené la posición arriba por 1-2 segundos apretando glúteos. Bajá controladamente. 10 a 15 repeticiones.',
  'GLUTES', ARRAY['HAMSTRINGS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_bird_dog', 'bird-dog',
  'Bird dog', 'Bird Dog',
  'En posición de cuadrupedia con las manos debajo de los hombros y las rodillas debajo de las caderas. Extendé el brazo derecho hacia adelante y la pierna izquierda hacia atrás simultáneamente, formando una línea recta. Mantené 2 segundos con el core activado y la cadera nivelada. Volvé a la posición inicial y repetí con el brazo izquierdo y la pierna derecha. 8 a 10 repeticiones por lado.',
  'ABS', ARRAY['GLUTES','BACK']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_plancha', 'plancha-isometrica',
  'Plancha', 'Plank',
  'Apoyá los antebrazos y las puntas de los pies en el suelo. El cuerpo debe formar una línea recta desde la cabeza hasta los talones. Activá el core contrayendo el abdomen como si fueras a recibir un golpe. No dejes que la cadera suba ni baje. Mantené la mirada hacia el suelo y respirá de forma controlada. Mantener 20 a 30 segundos.',
  'ABS', ARRAY['GLUTES','SHOULDERS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_pushups_lentos', 'push-ups-lentos',
  'Push-ups lentos', 'Slow Push-ups',
  'En posición de plancha alta con las manos ligeramente más anchas que los hombros. Bajá el pecho hacia el suelo de forma controlada (3 segundos bajando) manteniendo el cuerpo en línea recta. Empujá de vuelta a la posición inicial. Mantené el core activado y los codos a unos 45 grados del torso. El ritmo lento aumenta la activación muscular. 5 a 10 repeticiones.',
  'CHEST', ARRAY['TRICEPS','SHOULDERS','ABS']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_band_pull_aparts', 'band-pull-aparts',
  'Band pull-aparts', 'Band Pull-Aparts',
  'De pie, sostené una banda elástica frente al pecho con los brazos extendidos y las manos al ancho de hombros. Tirá la banda separando las manos hacia los lados apretando las escápulas entre sí. Mantené los brazos rectos durante todo el movimiento. Volvé controladamente a la posición inicial. 2 series de 15 a 20 repeticiones. Excelente para activar el deltoides posterior y los romboides antes de entrenar tren superior.',
  'SHOULDERS', ARRAY['BACK']::"MuscleGroup"[],
  'BAND', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_face_pulls_banda', 'face-pulls-con-banda',
  'Face pulls con banda', 'Band Face Pulls',
  'Anclá una banda elástica a la altura de la cara. Agarrá la banda con ambas manos, palmas hacia abajo. Tirá la banda hacia la cara con los codos altos y hacia afuera, abriendo las manos a los lados de la cabeza. Apretá las escápulas al final del movimiento. Volvé controladamente. 2 series de 15 repeticiones. Fundamental para la salud del manguito rotador y la postura.',
  'SHOULDERS', ARRAY['BACK']::"MuscleGroup"[],
  'BAND', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_monster_walks', 'monster-walks-con-banda',
  'Monster walks con banda', 'Banded Monster Walks',
  'Colocá una banda elástica alrededor de los muslos, justo por encima de las rodillas. Adoptar una posición de media sentadilla con los pies al ancho de hombros. Dá pasos pequeños hacia adelante manteniendo tensión constante en la banda. Después de 10 pasos, volvé caminando hacia atrás. Mantené las rodillas empujando hacia afuera contra la banda en todo momento. 10 pasos en cada dirección.',
  'GLUTES', ARRAY[]::"MuscleGroup"[],
  'BAND', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),

-- ═══════════════════════════════════════════════════════════════════════════════
-- ESTIRAMIENTOS ESTATICOS POST-ENTRENO (8)
-- ═══════════════════════════════════════════════════════════════════════════════

(
  'warmup_estiramiento_cuadriceps', 'estiramiento-cuadriceps-de-pie',
  'Estiramiento de cuádriceps de pie', 'Standing Quad Stretch',
  'De pie, flexioná una rodilla y agarrá el tobillo con la mano del mismo lado. Tirá el talón suavemente hacia el glúteo manteniendo las rodillas juntas y el torso erguido. Apretá el glúteo del lado que estirás para aumentar la elongación. Si necesitás equilibrio, apoyate en una pared. Mantené 20 a 30 segundos por pierna. Respirá profundamente durante el estiramiento.',
  'QUADS', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_estiramiento_isquios', 'estiramiento-isquiotibiales-sentado',
  'Estiramiento de isquiotibiales sentado', 'Seated Hamstring Stretch',
  'Sentado en el suelo con las piernas extendidas al frente y los pies en flexión dorsal. Con la espalda recta, inclinarte hacia adelante desde las caderas (no desde la cintura) intentando alcanzar los pies. No redondeés la espalda. Sentí el estiramiento en la parte posterior de los muslos. Mantené 30 segundos, descansá y repetí una vez más.',
  'HAMSTRINGS', ARRAY['CALVES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_estiramiento_gemelos', 'estiramiento-gemelos-en-pared',
  'Estiramiento de gemelos en pared', 'Wall Calf Stretch',
  'De pie frente a una pared con las manos apoyadas. Llevá una pierna hacia atrás con la rodilla recta y el talón firmemente apoyado en el suelo. La pierna delantera queda flexionada. Empujá la pared suavemente hasta sentir el estiramiento en la pantorrilla de la pierna trasera. Mantené 30 segundos por pierna. Para estirar el sóleo, flexioná ligeramente la rodilla trasera.',
  'CALVES', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_figura_4_supino', 'figura-4-supino',
  'Figura 4 supino', 'Supine Figure 4 Stretch',
  'Acostado boca arriba, cruzá el tobillo derecho sobre la rodilla izquierda formando un "4". Agarrá el muslo izquierdo con ambas manos y tirá suavemente hacia el pecho. Sentí el estiramiento profundo en el glúteo derecho y el piriforme. Mantené la cabeza apoyada en el suelo y los hombros relajados. 30 segundos por lado.',
  'GLUTES', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_flexor_cadera', 'estiramiento-flexor-de-cadera',
  'Estiramiento de flexor de cadera', 'Kneeling Hip Flexor Stretch',
  'En posición de medio arrodillado: rodilla derecha en el suelo, pie izquierdo adelante con rodilla a 90 grados. Apretá el glúteo derecho y empujá las caderas suavemente hacia adelante sin arquear la espalda baja. Sentí el estiramiento en la parte frontal de la cadera y el muslo derecho (iliopsoas). Mantené 30 segundos por lado. Podés levantar el brazo del lado que estirás para intensificar.',
  'QUADS', ARRAY['GLUTES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_pecho_puerta', 'estiramiento-pecho-en-puerta',
  'Estiramiento de pecho en puerta', 'Doorway Chest Stretch',
  'Parate en el marco de una puerta. Colocá el antebrazo en el marco con el codo a la altura del hombro formando un ángulo de 90 grados. Dá un paso adelante con el pie del mismo lado hasta sentir el estiramiento en el pectoral. Mantené el core activado y no arquees la espalda. 30 segundos por lado. Podés variar la altura del codo para estirar diferentes fibras del pectoral.',
  'CHEST', ARRAY[]::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_postura_nino', 'postura-del-nino',
  'Postura del niño', 'Child''s Pose',
  'Arrodillado en el suelo, sentate sobre los talones. Extendé los brazos hacia adelante por el suelo mientras bajás el torso y apoyás la frente en el piso. Mantené los brazos activos estirándolos lo más lejos posible. Sentí cómo se estiran los dorsales, los erectores y los glúteos. Respirá profundamente expandiendo las costillas laterales. Mantener 30 a 60 segundos.',
  'BACK', ARRAY['GLUTES']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
),
(
  'warmup_estiramiento_triceps', 'estiramiento-triceps-sobre-cabeza',
  'Estiramiento de tríceps sobre la cabeza', 'Overhead Triceps Stretch',
  'De pie o sentado, levantá un brazo por encima de la cabeza y flexionalo llevando la mano hacia la escápula opuesta. Con la otra mano, empujá suavemente el codo hacia abajo y hacia atrás. Sentí el estiramiento en el tríceps y la parte lateral del torso. Mantené el torso erguido sin inclinar hacia los lados. 20 a 30 segundos por brazo.',
  'TRICEPS', ARRAY['BACK']::"MuscleGroup"[],
  'BODYWEIGHT', 'BEGINNER', 'WARMUP',
  true, NOW(), NOW()
);
