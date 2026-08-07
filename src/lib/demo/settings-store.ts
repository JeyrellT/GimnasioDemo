// =============================================================================
// BLACKLINE FITNESS — Demo settings: localStorage helpers (Gemini key + demo prefs)
//
// La clave de Gemini se guarda POR PERFIL (userId), nunca compartida. Antes
// vivía bajo una única llave de localStorage: si dos cuentas usaban el mismo
// navegador (super admin espejando a un coach vía /admin/users, dos coaches
// en el mismo equipo, el navegador usado para capturas de marketing) la clave
// de una se filtraba a la otra con solo cambiar de sesión.
//
// setActiveProfile(userId) la llama AuthProvider — SINCRÓNICAMENTE durante el
// render (no en un useEffect) para garantizar que quede fijada antes de que
// cualquier componente hijo lea getGeminiKey()/hasGeminiKey() en su propio
// mount effect (los effects de React se disparan de adentro hacia afuera, así
// que un effect hijo puede correr antes que el del provider si este último
// también fuera un effect). Durante una impersonación (mirror), el id activo
// es el del coach espejado, no el del super admin real — la clave queda atada
// al perfil que se está viendo, sea quien sea quien esté frente al teclado.
//
// Sin perfil activo (SSR, o antes de resolver sesión) get/set/clear son no-op:
// mejor "IA no disponible" un instante que arriesgar filtrar la clave de otro.
// =============================================================================

const GEMINI_KEY_PREFIX = "blackline-fitness_demo_gemini_key__";
// Llave pre-scoping (compartida entre perfiles). Se purga, nunca se migra:
// no hay forma segura de saber a qué perfil pertenecía.
const LEGACY_GEMINI_KEY = "blackline-fitness_demo_gemini_key";
const DEMO_ACTIVE_KEY = "blackline-fitness_demo_active";

let activeUserId: string | null = null;
let legacyPurged = false;

/** Perfil activo en este tab. Ver comentario de cabecera. */
export function setActiveProfile(userId: string | null): void {
  activeUserId = userId;
  purgeLegacyGeminiKey();
}

/**
 * Lectura del perfil activo para otros stores que también deben aislar datos
 * por cuenta (ej.: assistant-store.ts, que guarda el historial del chat de IA
 * con PII de clientes en IndexedDB). No dispara la purga de la llave legacy —
 * eso es específico de la clave de Gemini.
 */
export function getActiveProfile(): string | null {
  return activeUserId;
}

function purgeLegacyGeminiKey(): void {
  if (legacyPurged || typeof window === "undefined") return;
  legacyPurged = true;
  localStorage.removeItem(LEGACY_GEMINI_KEY);
}

function geminiStorageKey(userId: string): string {
  return `${GEMINI_KEY_PREFIX}${userId}`;
}

// ── Gemini API key ─────────────────────────────────────────────────────────────

export function getGeminiKey(): string | null {
  if (typeof window === "undefined" || !activeUserId) return null;
  return localStorage.getItem(geminiStorageKey(activeUserId));
}

export function setGeminiKey(key: string): void {
  if (typeof window === "undefined" || !activeUserId) return;
  localStorage.setItem(geminiStorageKey(activeUserId), key);
}

export function clearGeminiKey(): void {
  if (typeof window === "undefined" || !activeUserId) return;
  localStorage.removeItem(geminiStorageKey(activeUserId));
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

// ── Demo mode flag ─────────────────────────────────────────────────────────────

export function isDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_ACTIVE_KEY) === "true";
}

export function setDemoActive(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    localStorage.setItem(DEMO_ACTIVE_KEY, "true");
  } else {
    localStorage.removeItem(DEMO_ACTIVE_KEY);
  }
}
