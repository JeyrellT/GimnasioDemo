// =============================================================================
// Asset paths for the new branding landing page.
// El usuario debe copiar logo-transparent.png a public/branding/.
// Si no existe el archivo, el <img> falla silenciosamente (alt funciona).
// =============================================================================

export const BRANDING_LOGO_SRC = "/branding/logo-transparent.png";
export const BRANDING_LOGO_ALT = "Blackline Fitness";

// Imágenes de ejercicios del phone preview.
// Si faltan, las tarjetas usan el fallback `.ex-thumb.placeholder` (gradiente).
export const EXERCISE_IMAGES = [
  "/branding/exercise-1.png",
  "/branding/exercise-2.png",
  "/branding/exercise-3.png",
  "/branding/exercise-4.png",
] as const;
