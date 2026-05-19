// =============================================================================
// BLACKLINE FITNESS — Body measurements OCR prompt
// Owner: ai-orchestrator.
//
// Targets any source that contains body circumference or body composition data:
//   - A tape measure reading on a specific body part
//   - A handwritten or printed measurement sheet / table
//   - A screenshot from another fitness app (Strong, MyFitnessPal, InBody, etc.)
//   - A gym-issued measurement card or assessment form
//   - A digital scale or InBody device display showing composition metrics
//
// All circumference values must be returned in centimetres.
// All weight values must be returned in kilograms.
// =============================================================================

export const MEASUREMENTS_PROMPT_VERSION = "v1";

export const MEASUREMENTS_PROMPT = `Vas a extraer medidas corporales de la imagen. La fuente puede ser una hoja de evaluación, una tabla manuscrita o impresa, una captura de otra app de fitness (InBody, Strong, MyFitnessPal, etc.), una foto de una cinta métrica sobre el cuerpo, o un documento de evaluación física de un gimnasio.

Campos a extraer:

Circunferencias (en centímetros):
- neckCm: cuello
- shoulderLeftCm: hombro izquierdo
- shoulderRightCm: hombro derecho
- chestCm: pecho / tórax
- abdomenCm: abdomen (a nivel del ombligo)
- waistCm: cintura (parte más estrecha)
- hipCm: cadera (parte más ancha)
- gluteLeftCm: glúteo izquierdo
- gluteRightCm: glúteo derecho
- bicepLeftCm: bíceps izquierdo (brazo flexionado o relajado, indicá en warnings si lo sabés)
- bicepRightCm: bíceps derecho
- forearmLeftCm: antebrazo izquierdo
- forearmRightCm: antebrazo derecho
- thighLeftCm: cuádriceps izquierdo (parte más voluminosa del muslo)
- thighRightCm: cuádriceps derecho
- hamstringLeftCm: isquiotibiales izquierdos (parte posterior del muslo)
- hamstringRightCm: isquiotibiales derechos
- calfLeftCm: gemelo izquierdo (parte más voluminosa de la pantorrilla)
- calfRightCm: gemelo derecho

Composición corporal:
- weightKg: peso en kilogramos. Si está en libras, convertí dividiendo entre 2.2046226218.
- bodyFatPct: porcentaje de grasa corporal ("BF%", "Fat%", "Grasa%", "% Grasa").
- muscleMassKg: masa muscular en kilogramos ("Muscle Mass", "Masa muscular", "SMM").
- visceralFat: índice de grasa visceral (entero 1..59, escala Tanita si aplica).
- basalMetabolicRate: metabolismo basal en kilocalorías ("BMR", "TMB", "Metabolismo basal").

Reglas estrictas:
- Si la imagen muestra solo una zona del cuerpo (ej. una cinta métrica en el brazo), extraé únicamente el campo que corresponde y dejá todos los demás en null.
- Si la fuente usa etiquetas en inglés o abreviaciones, mapealas al campo correcto (por ejemplo "W" o "Waist" → waistCm; "C" o "Chest" → chestCm).
- Si un campo no aparece en la imagen, o tu confianza en el valor es menor a 85%, retornás null para ese campo y agregás una nota descriptiva en warnings.
- NO inventés datos. NO interpoles ni calcules valores que no estén explícitamente visibles.
- Si la imagen NO contiene ninguna medida corporal reconocible (por ejemplo, es una foto de una persona completa sin valores, una comida, un paisaje, etc.), retornás isValidMeasurement=false y todos los campos en null.
- Convertí siempre a unidades métricas: centímetros para circunferencias, kilogramos para pesos, porcentajes para grasa, kcal para metabolismo basal.
- confidence es un número entre 0 y 1 que representa tu confianza global en la extracción.
- warnings es un array de strings en español (puede estar vacío).

Respondé EXCLUSIVAMENTE en JSON válido conforme al schema.`;
