/**
 * Maps exercise slugs to their static image filename in /public/exercises/.
 * Used as fallback when thumbnailUrl is missing or broken and the slug
 * doesn't match the filename directly (e.g., Spanish slug → English image).
 *
 * Key   = exercise slug (from DB)
 * Value = filename inside /public/exercises/  (e.g. "barbell-bench-press.jpg")
 */
export const SLUG_IMAGE_MAP: Record<string, string> = {
  // ── Production slug mismatches (slug ≠ filename) ────────────────────────
  "incline-barbell-bench-press": "incline-bench-press.jpg",
  "cable-lat-pulldown": "lat-pulldown.jpg",
  "cable-tricep-pushdown": "cable-pushdown.jpg",
  "ab-wheel-rollout": "ab-rollout.jpg",

  // ── Production slugs with no exact image — best-match fallback ──────────
  "push-up": "dips.jpg",
  "dumbbell-bench-press": "barbell-bench-press.jpg",
  "close-grip-pull-up": "pull-up.jpg",
  "dumbbell-single-arm-row": "barbell-bent-over-row.jpg",
  "seated-cable-row": "lat-pulldown.jpg",
  "ez-bar-skull-crusher": "cable-pushdown.jpg",
  "dumbbell-front-raise": "dumbbell-lateral-raise.jpg",
  "cable-rear-delt-fly": "dumbbell-lateral-raise.jpg",
  "hanging-leg-raise": "plank.jpg",

  // ── Demo / Spanish slugs → English image files ──────────────────────────
  // Chest
  "press-de-banca-con-barra": "barbell-bench-press.jpg",
  "press-inclinado-mancuernas": "incline-bench-press.jpg",
  "aperturas-mancuernas-plano": "dumbbell-fly.jpg",
  "fondos-pecho": "dips.jpg",

  // Back
  "dominadas-agarre-prono": "pull-up.jpg",
  "remo-con-barra": "barbell-bent-over-row.jpg",
  "jalon-polea-agarre-amplio": "lat-pulldown.jpg",
  "peso-muerto-convencional": "conventional-deadlift.png",
  "remo-con-mancuerna": "barbell-bent-over-row.jpg",
  "pullover-mancuerna": "dumbbell-fly.jpg",

  // Shoulders
  "press-militar-con-barra": "overhead-press.jpg",
  "elevaciones-laterales-mancuernas": "dumbbell-lateral-raise.jpg",
  "press-arnold": "arnold-press.jpg",
  "press-militar-mancuernas": "overhead-press.jpg",
  "remo-al-cuello-barra-z": "dumbbell-lateral-raise.jpg",

  // Biceps
  "curl-de-biceps-con-barra": "barbell-curl.jpg",
  "curl-martillo-mancuernas": "hammer-curl.jpg",
  "curl-biceps-mancuerna": "barbell-curl.jpg",
  "biceps-hold-isometrico": "hammer-curl.jpg",

  // Triceps
  "extensiones-triceps-polea": "cable-pushdown.jpg",
  "fondos-triceps-banco": "bench-dip.jpg",

  // Quads
  "sentadilla-con-barra": "barbell-back-squat.jpg",
  "prensa-de-piernas": "leg-press.jpg",
  "extension-de-cuadriceps-maquina": "leg-extension.jpg",
  "desplante-bulgaro-mancuerna": "barbell-lunge.jpg",
  "salto-con-sentadilla": "barbell-back-squat.jpg",
  "sentadilla-isometrica-pared": "barbell-back-squat.jpg",
  "step-up-banco": "barbell-lunge.jpg",

  // Hamstrings
  "curl-femoral-tumbado": "lying-leg-curl.jpg",
  "peso-muerto-rumano": "romanian-deadlift.jpg",

  // Glutes
  "hip-thrust-con-barra": "hip-thrust.jpg",
  "zancadas-mancuernas": "barbell-lunge.jpg",

  // Calves
  "elevaciones-de-gemelos-maquina": "standing-calf-raise.jpg",
  "elevaciones-gemelos-sentado": "seated-calf-raise.jpg",
  "elevacion-talon-smith": "standing-calf-raise.jpg",

  // Abs
  "plancha-isometrica": "plank.jpg",
  "crunch-abdominal": "crunch.jpg",
  "rueda-de-abdomen": "ab-rollout.jpg",
  "russian-twist": "crunch.jpg",

  // Full body
  "clean-and-press-mancuernas": "dumbbell-clean-and-press.jpg",

  // ── Warmup / Calentamiento slugs ──────────────────────────────────────────
  // Cardio
  "saltos-de-tijera": "barbell-back-squat.jpg",
  "rodillas-altas": "barbell-back-squat.jpg",
  "talones-a-gluteos": "lying-leg-curl.jpg",
  "mountain-climbers": "plank.jpg",

  // Movilidad
  "circulos-de-hombros": "dumbbell-lateral-raise.jpg",
  "circulos-de-brazos": "dumbbell-lateral-raise.jpg",
  "circulos-de-cadera": "hip-thrust.jpg",
  "circulos-de-tobillos": "standing-calf-raise.jpg",
  "gato-camello": "plank.jpg",
  "worlds-greatest-stretch": "barbell-lunge.jpg",
  "inchworm": "plank.jpg",

  // Activacion
  "sentadilla-con-peso-corporal": "barbell-back-squat.jpg",
  "zancadas-caminando": "barbell-lunge.jpg",
  "puente-de-gluteo": "hip-thrust.jpg",
  "bird-dog": "plank.jpg",
  "push-ups-lentos": "dips.jpg",
  "band-pull-aparts": "dumbbell-lateral-raise.jpg",
  "face-pulls-con-banda": "dumbbell-lateral-raise.jpg",
  "monster-walks-con-banda": "barbell-back-squat.jpg",

  // Estiramientos
  "estiramiento-cuadriceps-de-pie": "barbell-back-squat.jpg",
  "estiramiento-isquiotibiales-sentado": "romanian-deadlift.jpg",
  "estiramiento-gemelos-en-pared": "standing-calf-raise.jpg",
  "figura-4-supino": "hip-thrust.jpg",
  "estiramiento-flexor-de-cadera": "barbell-lunge.jpg",
  "estiramiento-pecho-en-puerta": "dumbbell-fly.jpg",
  "postura-del-nino": "plank.jpg",
  "estiramiento-triceps-sobre-cabeza": "cable-pushdown.jpg",
};
