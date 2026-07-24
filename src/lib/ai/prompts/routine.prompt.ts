// =============================================================================
// BLACKLINE FITNESS — Routine OCR prompt (browser-side Gemini)
// Owner: ai-orchestrator.
//
// Used by the browser-direct Gemini client to extract a complete training
// routine from a single image. Sources we support:
//   - Photo of a printed/handwritten plan from a trainer.
//   - Screenshot from a fitness app (Strong, Hevy, Jefit, Fitbod, etc.).
//   - PDF-style table rendered as image.
//   - A whiteboard or napkin sketch with day-by-day exercises.
//
// The output of this prompt is consumed by the routine-builder import flow,
// so the JSON shape MUST match `OcrRoutineResult` declared in the importer.
// =============================================================================

import { SchemaType } from "@google/generative-ai";

import type { GeminiSchema } from "../gemini-client";

export const ROUTINE_OCR_PROMPT_VERSION = "v1";

// -----------------------------------------------------------------------------
// Public types — mirrored exactly in the browser importer
// -----------------------------------------------------------------------------

export interface OcrRoutineExercise {
  nameEs: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes: string | null;
}

export interface OcrRoutineDay {
  name: string;
  exercises: OcrRoutineExercise[];
}

export interface OcrRoutineResult {
  name: string;
  goal:
    | "HYPERTROPHY"
    | "MUSCLE_GAIN"
    | "DEFINITION"
    | "STRENGTH"
    | "ENDURANCE"
    | "FAT_LOSS"
    | "GENERAL";
  splitDays: number;
  durationWeeks: number;
  days: OcrRoutineDay[];
}

// -----------------------------------------------------------------------------
// Prompt
// -----------------------------------------------------------------------------

export const ROUTINE_OCR_PROMPT = `Sos un asistente especializado en extraer planes de entrenamiento desde imágenes. La fuente puede ser una foto de una rutina impresa, una captura de pantalla de una app (Strong, Hevy, Jefit, Fitbod, etc.), una hoja manuscrita, una pizarra, o una tabla estilo PDF renderizada como imagen.

Tu trabajo: devolver UN ÚNICO objeto JSON que represente la rutina completa, con todos sus días y ejercicios, conforme al schema.

Campos a extraer:

1. name (string, 2-100 caracteres):
   Nombre de la rutina. Si no está escrito explícitamente, inferí uno corto y descriptivo a partir del contenido (ej. "PPL 6 días", "Full body 3x semana", "Split torso-pierna", "Rutina de fuerza 4 días"). Nunca devuelvas string vacío.

2. goal (enum estricto, uno de los siguientes):
   - "HYPERTROPHY" — si predominan ejercicios de aislamiento, rangos 8-15 reps, descansos 60-90s, volumen alto, splits tipo bro-split o PPL.
   - "MUSCLE_GAIN" — si la fuente indica explícitamente volumen, masa, bulk o ganancia muscular.
   - "DEFINITION" — si la fuente indica explícitamente definición, tonificación o recomposición con conservación muscular.
   - "STRENGTH" — si predominan compuestos pesados (sentadilla, peso muerto, press banca, press militar), rangos 1-6 reps, descansos > 2 min, programación tipo 5x5 / 5/3/1 / Texas Method.
   - "ENDURANCE" — si predominan circuitos, rangos > 15 reps, descansos cortos < 45s, AMRAP, EMOM, WODs.
   - "FAT_LOSS" — si la rutina mezcla full-body + cardio/HIIT, supersets y/o nota explícita de cutting/déficit/quema.
   - "GENERAL" — fitness general, principiantes, salud, fallback cuando no es claro.
   Si el objetivo está escrito en la imagen (ej. "hipertrofia", "fuerza máxima", "pérdida de grasa"), respetalo siempre por encima de tu inferencia.

3. splitDays (entero, 1-6):
   Cantidad de días ÚNICOS detectados en la rutina (Día 1, Día 2, … o "Empuje/Tirón/Pierna"). NO cuentes días de descanso ni repeticiones del mismo día (ej. "PPL x 2" = 3 días únicos, no 6). Si solo ves un día, devolvé 1.

4. durationWeeks (entero, 1-52):
   Duración en semanas si está escrita ("8 semanas", "Mesociclo 12 sem", "Bloque 4 wks"). Si no aparece, devolvé 8 como default razonable.

5. days (array, 1-6 items):
   Para cada día único:
   - name (string): nombre del día tal como aparece en la imagen ("Empuje", "Día 1 — Pecho y Tríceps", "Lunes — Push", "Pierna A"). Mantené el nombre original en español. Si está en inglés, traducí ("Push" → "Empuje", "Pull" → "Tirón", "Legs" → "Pierna", "Upper" → "Tren Superior", "Lower" → "Tren Inferior", "Chest & Tris" → "Pecho y Tríceps", "Back & Bis" → "Espalda y Bíceps").
   - exercises (array, mínimo 1): lista ordenada de ejercicios de ese día con los campos siguientes.

6. Para cada ejercicio en days[i].exercises:
   - nameEs (string): nombre del ejercicio en español. Si está en inglés, traducí. Mapeos obligatorios:
       bench press → press de banca
       incline bench press → press inclinado
       decline bench press → press declinado
       dumbbell bench press → press con mancuernas
       squat / back squat → sentadilla
       front squat → sentadilla frontal
       hack squat → sentadilla hack
       leg press → prensa de piernas
       leg extension → extensión de cuádriceps
       leg curl → curl femoral
       deadlift → peso muerto
       romanian deadlift / RDL → peso muerto rumano
       sumo deadlift → peso muerto sumo
       row / bent over row → remo
       barbell row → remo con barra
       dumbbell row → remo con mancuerna
       seated cable row → remo en polea sentado
       t-bar row → remo en T
       pull-up / chin-up → dominada
       lat pulldown → jalón al pecho
       face pull → face pull (mantener)
       overhead press / OHP / military press → press militar
       dumbbell shoulder press → press de hombro con mancuernas
       lateral raise / side raise → elevaciones laterales
       front raise → elevaciones frontales
       rear delt fly → vuelos posteriores
       biceps curl / barbell curl → curl de bíceps
       hammer curl → curl martillo
       preacher curl → curl Scott
       triceps extension / skullcrusher → extensión de tríceps
       triceps pushdown → extensión de tríceps en polea
       dips → fondos
       hip thrust → empuje de cadera
       glute bridge → puente de glúteo
       calf raise → elevación de talones
       lunges → zancadas
       plank → plancha
       crunch → abdominal corto
       russian twist → giro ruso
       hanging leg raise → elevación de piernas colgado

   - targetSets (entero, 1-20): número de series. Si la imagen muestra "3x10" entonces sets=3. Si solo aparece un número aislado en columna SETS, usalo. Si no se indica, asumí 3.

   - targetRepsMin y targetRepsMax (enteros, 1-100):
       * Si las reps se muestran como rango ("8-12", "6 a 10"), usá ambos valores tal cual.
       * Si se muestra UN solo número ("10", "12 reps"), poné min = max = ese número.
       * Si se indican reps por tiempo ("30 seg", "1 min"), convertí a una estimación razonable: 30s ≈ 12-15, 45s ≈ 15-20, 60s ≈ 20-25.
       * Si dice AMRAP o "al fallo", usá min = 6, max = 12 y notalo en notes.
       * Garantizá siempre que targetRepsMin <= targetRepsMax.

   - restSeconds (entero, 0-600): descanso entre series en segundos.
       * "90s", "1:30", "1 min 30" → 90.
       * "2 min" → 120; "3 min" → 180.
       * Si no se indica, devolvé 90 como default.
       * Si la rutina marca explícitamente "sin descanso" o "superset", devolvé 30.

   - notes (string | null): cualquier indicación extra visible para ese ejercicio (tempo, RPE/RIR, técnica como "drop set", "rest-pause", "lento en la excéntrica", "agarre cerrado"). Si no hay nada, devolvé null. Mantené el texto corto (< 200 caracteres) y en español.

Reglas estrictas:
- NO devuelvas markdown, ni \`\`\`json, ni comentarios. SOLO un objeto JSON válido que cumpla el schema.
- NO inventés ejercicios que no estén en la imagen. Si un día solo tiene 2 ejercicios visibles, devolvé esos 2 — no rellenes con genéricos.
- NO devuelvas días vacíos (sin ejercicios). Si ves un día rotulado pero sin contenido legible, omitilo y ajustá splitDays.
- Costa Rica usa kilos. Si la imagen muestra pesos en libras (lb), NO los incluyas en el JSON (este schema no tiene campo de peso); podés mencionarlo en notes del ejercicio si es relevante.
- Si la imagen es ilegible o claramente NO es una rutina (recibo, foto random, comida, etc.), devolvé igualmente la mejor aproximación posible con al menos un día y un ejercicio placeholder ("Ejercicio ilegible") y goal="GENERAL" — el cliente decidirá descartarlo, pero el JSON debe ser válido.
- Respondé EXCLUSIVAMENTE con el objeto JSON conforme al schema, sin texto adicional antes ni después.`;

// -----------------------------------------------------------------------------
// JSON Schema for Gemini structured output (responseSchema)
// -----------------------------------------------------------------------------

const exerciseSchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    nameEs: { type: SchemaType.STRING },
    targetSets: { type: SchemaType.INTEGER },
    targetRepsMin: { type: SchemaType.INTEGER },
    targetRepsMax: { type: SchemaType.INTEGER },
    restSeconds: { type: SchemaType.INTEGER },
    notes: { type: SchemaType.STRING, nullable: true },
  },
  required: [
    "nameEs",
    "targetSets",
    "targetRepsMin",
    "targetRepsMax",
    "restSeconds",
    "notes",
  ],
};

const daySchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    exercises: {
      type: SchemaType.ARRAY,
      items: exerciseSchema,
    },
  },
  required: ["name", "exercises"],
};

export const ROUTINE_OCR_SCHEMA: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    goal: {
      type: SchemaType.STRING,
      enum: [
        "HYPERTROPHY",
        "MUSCLE_GAIN",
        "DEFINITION",
        "STRENGTH",
        "ENDURANCE",
        "FAT_LOSS",
        "GENERAL",
      ],
      format: "enum",
    },
    splitDays: { type: SchemaType.INTEGER },
    durationWeeks: { type: SchemaType.INTEGER },
    days: {
      type: SchemaType.ARRAY,
      items: daySchema,
    },
  },
  required: ["name", "goal", "splitDays", "durationWeeks", "days"],
};
