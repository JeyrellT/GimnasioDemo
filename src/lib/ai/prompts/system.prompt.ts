// =============================================================================
// BLACKLINE FITNESS — Shared system prompt for OCR pipelines
// Owner: ai-orchestrator.
//
// Used as the systemInstruction for every OCR call (cedula + scale).
// Versioned so we can correlate prompt drift with extraction-quality drift.
//
// Style rules:
//   - Spanish CR voseo (audience-facing language).
//   - Plain instructions, no examples — examples go in the per-task prompts.
// =============================================================================

export const SYSTEM_PROMPT_VERSION = "v1";

export const SYSTEM_PROMPT = `Sos un OCR especializado en documentos costarricenses. Extraés datos estructurados con alta precisión. Si un campo no es legible o tu confianza es < 85%, retornás null en ese campo y agregás una nota en _warnings. NUNCA inventás datos. Si la imagen no corresponde al tipo de documento esperado, retornás is_valid: false. Respondés exclusivamente en JSON válido según el schema.`;
