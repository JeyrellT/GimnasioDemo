/**
 * YouTube video IDs for exercise tutorials.
 * Used by the client ExerciseVideoModal to show tutorial videos.
 */
export const EXERCISE_VIDEOS: Record<string, string> = {
  // --- Pecho ---
  "ex-press-banca": "fqsTgdTPRQU",          // COMO HACER PRESS de BANCA con BARRA CORRECTAMENTE | Ejercicios en 1 minuto
  "ex-press-inclinado": "oTD5g77GgSA",       // Como Hacer Press Inclinado Con Mancuernas (Tutorial Paso a Paso)
  "ex-aperturas": "xyHdY99F640",             // Aperturas con Mancuernas / Dumbbell Fly
  "ex-fondos": "jNCZEiqbrLM",               // COMO HACER FONDOS EN PARALELAS PARA PECHO (la verdad)

  // --- Espalda ---
  "ex-dominadas": "ashv772miEw",             // Como hacer Dominadas Con Agarre en Pronacion || Ejercicio para Espalda
  "ex-remo-barra": "VBhFIZWMKUs",           // Como Hacer el Remo con Barra (Paso a Paso Tutorial)
  "ex-jalon-polea": "WakfOFnr5oM",          // JALON al PECHO con AGARRE AMPLIO - Tecnica PERFECTA para ESPALDA ANCHA
  "ex-peso-muerto": "kancsOn7CJY",          // Como hacer PESO MUERTO CONVENCIONAL como un PROFESIONAL (guia completa)

  // --- Hombros ---
  "ex-press-militar": "OHxSwnkSxB8",        // Como Hacer Press Militar Con Barra (Tutorial Paso a Paso)
  "ex-elevaciones-laterales": "V3LaKO8iZUE", // Como Hacer Elevaciones Laterales con Mancuernas (Tutorial Paso a Paso)
  "ex-press-arnold": "JdMgGoAPKjg",         // Como Hacer Press Arnold Con Mancuerna (Tutorial Paso a Paso)

  // --- Brazos ---
  "ex-curl-barra": "9LwedVKzjk8",           // CURL DE BICEPS CON BARRA - Tutorial Completo
  "ex-curl-martillo": "RHdacbwKbTo",         // Como Hacer Curl Martillo Con Mancuerna (Tutorial Paso a Paso)
  "ex-extensiones-triceps": "Y-NCnt3OhNU",   // Como hacer EXTENSIONES de TRICEPS en polea
  "ex-fondos-triceps": "EZSjDiiTi2o",       // Fondos en Banco para TRICEPS - TUTORIAL Y TIPS

  // --- Piernas ---
  "ex-sentadilla": "9D7zI27gFHM",           // Como Hacer SENTADILLA con Barra (Guia Completa Paso a Paso)
  "ex-prensa": "hl-EJUQ2yuc",              // PRENSA PARA PIERNAS - LEG PRESS - Tecnica correcta en 3 minutos
  "ex-extension-cuadriceps": "GwkdX6k9314",  // Extension de CUADRICEPS en MAQUINA [Manual de instrucciones]
  "ex-curl-femoral": "sRMO3SbTqjk",         // Como Hacer CURL FEMORAL TUMBADO EN MAQUINA - Ejercicios Para Piernas
  "ex-peso-muerto-rumano": "hfXVQumhty8",    // PESO MUERTO RUMANO | Tutorial desde cero
  "ex-hip-thrust": "2DVaazHpotc",           // Como Hacer Hip Thrust Con Barra (Tutorial Paso a Paso)
  "ex-zancadas": "6SfmtrsF8wQ",             // COMO HACER ZANCADAS (ESTANCADAS) CON MANCUERNAS
  "ex-elevaciones-gemelos": "RLX8HFAOIhg",   // Elevaciones de gemelos (talones) de pie en maquina
  "ex-gemelos-sentado": "rfkYC-mbQus",       // Como Hacer Gemelos Sentado en Maquina | Tecnica Correcta

  // --- Core ---
  "ex-plancha": "nR7J73LCL1w",              // ABDOMINALES Y CORE COMO HACER LA PLANCHA ISOMETRICA PERFECTA
  "ex-crunch": "uDWm47pvCU8",               // Como hacer un CRUNCH y tipos | ABDOMINALES en casa
  "ex-rueda-abdomen": "lCHxLrkHd8g",        // Tutorial Abdominales con Rueda (Rollout) / RUTINA DE ABDOMEN

  // --- Full-body / Compuestos ---
  "ex-burpee": "IYusabTdFEo",               // COMO HACER BURPEES - BASICO Y AVANZADO
  "ex-clean-press": "NJ09m_NBobo",           // CLEAN AND PRESS con mancuernas! El MEJOR Ejercicio FULL BODY
  "ex-press-militar-manc": "WeCyPErNDxo",    // Como Hacer Press Militar Con Mancuerna (Tutorial Paso a Paso)
  "ex-remo-mancuerna": "-Cz7-dqpLOE",       // Como Hacer Remo con Mancuernas (Paso a Paso Tutorial)
  "ex-pullover-mancuerna": "IYyI96p0yH4",    // PULL OVER con mancuerna - TUTORIAL COMPLETO
  "ex-curl-mancuerna": "D1DxpRE5FkU",       // Dumbbell Bicep Curls En Espanol (Curl De Bicep con Mancuerna)
  "ex-remo-cuello": "bx8Ew38PlR8",          // REMO AL CUELLO CON BARRA Z / EJERCICIO COMPUESTO PARA HOMBRO
  "ex-biceps-hold": "XaR3mSM3-7g",          // Curl Biceps con Mancuerna Isometrico/Dinamico
  "ex-desplante-bulgaro": "DzSjRCfz4ZE",     // Desplante bulgaro con mancuernas
  "ex-salto-sentadilla": "O9cq2hHpLkU",     // SENTADILLA CON SALTO (SQUAT JUMP)
  "ex-sentadilla-isometrica": "xC9f2zwCoRY", // Wall Sit - Sentadilla contra la pared | Ejercicio Isometrico Pierna
  "ex-step-up": "jY7t0IYJo5I",              // Como Hacer el Step Up Ejercicio (Subida al Banco) paso a paso
  "ex-elevacion-talon-smith": "ejMA4IR57bw",  // Elevacion de Talones en Maquina Smith
  "ex-russian-twist": "JyUqwkVpsi8",        // Russian Twist
};

/** Get YouTube embed URL for an exercise, or null if no video mapped */
export function getExerciseVideoUrl(exerciseId: string): string | null {
  const videoId = EXERCISE_VIDEOS[exerciseId];
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}
