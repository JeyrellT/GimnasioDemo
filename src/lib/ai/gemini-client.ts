// =============================================================================
// VIZION — Demo mode Gemini client shim
// All AI calls go through the browser-direct client that reads the API key
// from localStorage. The original server-side gemini-client is unused in the
// static export build; this re-export keeps the existing call sites
// (ocr-cedula.ts, extract-workout-photos.ts, ocr-scale.ts, lib/ai/index.ts)
// working unchanged.
// =============================================================================

export {
  getModel,
  generateStructured,
  parseAndValidate,
  pingGeminiKey,
  GeminiKeyMissingError,
} from "@/lib/demo/gemini-browser";

export type {
  ModelKind,
  UserPart,
  GeminiSchema,
  GenerateStructuredArgs,
  GenerateStructuredResult,
} from "@/lib/demo/gemini-browser";
