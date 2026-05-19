/**
 * Script de traducción batch — Blackline Fitness
 *
 * Lee el JSON de Free Exercise DB y genera/actualiza exercises-es-cr.json
 * llamando a Gemini Flash-Lite para traducir los ejercicios faltantes.
 *
 * SOLO PARA USO MANUAL. NO se invoca en el seed automático de producción.
 * La versión traducida ya está pre-generada en exercises-es-cr.json.
 *
 * Ejecutar: scripts/translate-batch.ts
 * Requiere: GEMINI_API_KEY en el entorno.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface RawExercise {
  id: string;
  name: string;
  instructions: string[];
  primaryMuscles: string[];
  equipment: string;
}

interface TranslatedExercise {
  id: string;
  nameEs: string;
  instructionsEs: string[];
}

interface GeminiTranslationOutput {
  nameEs: string;
  instructionsEs: string[];
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DATA_DIR = join(__dirname, "data");
const SOURCE_PATH = join(DATA_DIR, "free-exercise-db.json");
const OUTPUT_PATH = join(DATA_DIR, "exercises-es-cr.json");

/**
 * Modelo de Gemini a usar.
 * Flash-Lite: óptimo para tareas de traducción estructurada (costo bajo, latencia baja).
 * Ver PRODUCT_DECISIONS §4: "Flash-Lite para OCR ... Flash para razonamiento".
 */
const GEMINI_MODEL = "gemini-1.5-flash-8b";

// ---------------------------------------------------------------------------
// Lógica de traducción
// ---------------------------------------------------------------------------

/**
 * Construye el prompt de traducción para un ejercicio.
 * El prompt instruye voseo CR y terminología técnica fitness.
 */
function buildTranslationPrompt(exercise: RawExercise): string {
  return `Sos un traductor experto de fitness para español Costa Rica con voseo. Traducí el nombre y las instrucciones del siguiente ejercicio al español costarricense.

Reglas obligatorias:
- Usá voseo en todas las instrucciones (ej: "bajá", "llevá", "empujá", "colocá", "mantenés").
- Conservá terminología técnica en español cuando exista (ej: "press inclinado", "sentadilla", "peso muerto", "dominada", "remo").
- No inventés información que no esté en el original.
- Las instrucciones deben sonar naturales, como si las explicara un entrenador profesional costarricense.
- Devolvé ÚNICAMENTE un objeto JSON válido con la forma exacta: { "nameEs": string, "instructionsEs": string[] }

Ejercicio a traducir:
${JSON.stringify({ name: exercise.name, instructions: exercise.instructions }, null, 2)}`;
}

/**
 * Llama a Gemini Flash-Lite y parsea la respuesta JSON.
 * Retorna null si la respuesta no es parseable — el caller lo loggea y salta.
 */
async function translateWithGemini(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  exercise: RawExercise,
): Promise<GeminiTranslationOutput | null> {
  const prompt = buildTranslationPrompt(exercise);

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    // Gemini puede envolver el JSON en backticks — los limpiamos
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as GeminiTranslationOutput;

    if (
      typeof parsed.nameEs !== "string" ||
      !Array.isArray(parsed.instructionsEs)
    ) {
      console.error(
        `[translate] Respuesta con shape incorrecta para "${exercise.id}":`,
        cleaned.substring(0, 200),
      );
      return null;
    }

    return parsed;
  } catch (err) {
    console.error(
      `[translate] Error al traducir "${exercise.id}":`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Función principal exportable (usada por scripts/translate-batch.ts)
// ---------------------------------------------------------------------------

export async function runTranslateBatch(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no encontrada en el entorno. Configurá la variable antes de correr este script.",
    );
  }

  // Leer JSON fuente
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`No se encontró el archivo fuente: ${SOURCE_PATH}`);
  }

  const rawExercises: RawExercise[] = JSON.parse(
    readFileSync(SOURCE_PATH, "utf-8"),
  );

  // Leer traducciones existentes (puede no existir en un run inicial)
  const existing: TranslatedExercise[] = existsSync(OUTPUT_PATH)
    ? (JSON.parse(readFileSync(OUTPUT_PATH, "utf-8")) as TranslatedExercise[])
    : [];

  const existingIds = new Set(existing.map((t) => t.id));

  // Solo traducir ejercicios que no tengan traducción aún
  const pending = rawExercises.filter((e) => !existingIds.has(e.id));

  if (pending.length === 0) {
    console.log(
      "[translate] Todos los ejercicios ya están traducidos. Nada que hacer.",
    );
    return;
  }

  console.log(
    `[translate] Traduciendo ${pending.length} ejercicio(s) pendiente(s)...`,
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const results: TranslatedExercise[] = [...existing];
  let successCount = 0;
  let errorCount = 0;

  for (const exercise of pending) {
    console.log(`[translate] Procesando: ${exercise.name} (${exercise.id})`);

    const translation = await translateWithGemini(model, exercise);

    if (!translation) {
      errorCount++;
      continue;
    }

    results.push({
      id: exercise.id,
      nameEs: translation.nameEs,
      instructionsEs: translation.instructionsEs,
    });

    successCount++;

    // Pequeña pausa para evitar rate-limit en Gemini API
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }

  // Ordenar por id para diffs limpios en git
  results.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), "utf-8");

  console.log(
    `[translate] Completado: ${successCount} traducidos, ${errorCount} errores. Archivo escrito en: ${OUTPUT_PATH}`,
  );

  if (errorCount > 0) {
    console.warn(
      "[translate] Algunos ejercicios fallaron. Revisá los errores arriba y volvé a correr el script para reintentar.",
    );
  }
}
