// =============================================================================
// BLACKLINE FITNESS — Bioimpedance scale OCR prompt
// Owner: ai-orchestrator.
//
// Targets common bathroom-scale displays available in Costa Rica:
//   Tanita BC-series, InBody Dial / H20N, Omron HBF-series, Withings Body+,
//   Xiaomi Mi Body Composition Scale, RENPHO, Eufy.
//
// The display shows different metrics depending on the model and screen
// rotation. We do NOT assume any specific model — we extract whatever
// is visible and consistent with the schema.
// =============================================================================

export const SCALE_PROMPT_VERSION = "v1";

export const SCALE_PROMPT = `Vas a extraer las métricas de bioimpedancia que muestra el display de una báscula corporal. Las marcas más comunes son Tanita, InBody, Omron, Withings, Xiaomi, RENPHO o Eufy. Cada modelo muestra distintos campos — extraé únicamente los que veas legibles.

Campos a extraer al schema:
- weightKg: peso corporal en kilogramos. Si la pantalla muestra libras (lb), convertí dividiendo entre 2.2046226218.
- bodyFatPct: porcentaje de grasa corporal (campo "BF%", "Fat%", "Grasa").
- muscleMassPct: porcentaje de masa muscular si la báscula lo reporta como porcentaje.
- muscleMassKg: masa muscular en kilogramos si la báscula lo reporta en kg.
- waterPct: porcentaje de agua corporal ("TBW%", "Agua%").
- boneMassKg: masa ósea en kilogramos ("Bone Mass", "Masa ósea").
- metabolicAge: edad metabólica en años (entero, "Metabolic Age", "Edad metabólica").
- visceralFat: índice de grasa visceral, número entero entre 1 y 59 (Tanita scale).
- bmrKcal: tasa metabólica basal en kilocalorías ("BMR", "TMB").
- bodyTypeRating: rating tipo de cuerpo si la báscula lo muestra (ej. "1-9" en Tanita, "Hidden", "Standard"). String corto.

Reglas estrictas:
- Si la pantalla muestra dos columnas o dos pantallas (modo dual o secuencia), usá los valores de la lectura MÁS RECIENTE — generalmente la pantalla a la derecha o la última en aparecer si hay timestamp.
- Si un campo no es legible, o tu confianza es menor a 85%, retornás null para ese campo y agregás una nota descriptiva en warnings.
- NO inventés datos. Si una báscula no reporta un campo, dejalo en null — NO calcules ni interpoles.
- Si la imagen NO es el display de una báscula corporal (es un cuerpo entero, una balanza de cocina, una persona en la báscula vista de pie sin zoom al display), retornás isValidScale=false y todos los campos en null.
- Convertí siempre a unidades métricas: kilogramos, porcentajes, kcal, años.
- confidence es un número entre 0 y 1 que representa tu confianza global en la extracción.
- warnings es un array de strings descriptivos en español (puede estar vacío).

Respondé EXCLUSIVAMENTE en JSON válido conforme al schema.`;
