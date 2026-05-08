// =============================================================================
// VIZION — Hacienda CR 4.4 invoice numbering
// Owner: backend-api.
//
// Implements:
//   - generateClaveNumerica(...)  → 50-digit unique invoice key
//   - generateConsecutivo(...)    → 20-digit sequential number
//
// Reference: "Especificaciones técnicas XML versión 4.4"
// Ministerio de Hacienda — Dirección General de Tributación, Costa Rica.
//
// NOTE: These functions produce the NUMBER strings only. Digital signature
// (.p12) and submission to Hacienda ATV are gated behind BILLING_LIVE flag
// and will be implemented in V1.1.
// =============================================================================

import {
  PAIS_ISO_COSTA_RICA,
  HACIENDA_DEFAULT_SUCURSAL,
  HACIENDA_DEFAULT_TERMINAL,
} from "@/lib/consts";

// ── Tipo de comprobante ───────────────────────────────────────────────────────
// 01 Factura Electrónica
// 02 Nota de Débito
// 03 Nota de Crédito
// 04 Tiquete Electrónico
// 09 Factura Electrónica de Compra
// 10 Factura Electrónica de Exportación

export type TipoComprobante = "01" | "02" | "03" | "04" | "09" | "10";

// ── Situación del comprobante ─────────────────────────────────────────────────
// 1 Normal
// 2 Contingencia
// 3 Sin internet

export type SituacionComprobante = "1" | "2" | "3";

// =============================================================================
// generateClaveNumerica
//
// Structure (50 digits total):
//  [3]  País ISO 3166-1 numeric (506)
//  [6]  FechaEmision DDMMYY
//  [12] Cédula del emisor (without hyphens, zero-padded left to 12)
//  [3]  Sucursal (3 digits, zero-padded)
//  [5]  Terminal (5 digits, zero-padded)
//  [2]  TipoComprobante
//  [10] NumConsecutivo (the 10-digit sequence portion from consecutivo)
//  [8]  Código de seguridad (random 8 digits — generated here)
//  [1]  Situación
//
// = 3+6+12+3+5+2+10+8+1 = 50 ✓
// =============================================================================

export interface GenerateClaveNumericaParams {
  /** Emisor's cédula WITHOUT hyphens (e.g. "012345678" or "3102123456") */
  emisorCedula: string;
  sucursal?: string;   // default "001"
  terminal?: string;   // default "00001"
  tipoComprobante?: TipoComprobante; // default "01"
  situacion?: SituacionComprobante;  // default "1"
  /** Consecutive sequence number used in the key (number, not the full 20-char consecutivo) */
  consecutivoNumero: number;
  fechaEmision?: Date;   // defaults to now
}

/**
 * Generate the 50-digit clave numérica as per Hacienda spec 4.4.
 */
export function generateClaveNumerica({
  emisorCedula,
  sucursal = HACIENDA_DEFAULT_SUCURSAL,
  terminal = HACIENDA_DEFAULT_TERMINAL,
  tipoComprobante = "01",
  situacion = "1",
  consecutivoNumero,
  fechaEmision = new Date(),
}: GenerateClaveNumericaParams): string {
  // Part 1: País (3)
  const pais = PAIS_ISO_COSTA_RICA.padStart(3, "0");

  // Part 2: Fecha DDMMYY (6)
  const dd = String(fechaEmision.getUTCDate()).padStart(2, "0");
  const mm = String(fechaEmision.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(fechaEmision.getUTCFullYear()).slice(-2);
  const fecha = `${dd}${mm}${yy}`;

  // Part 3: Cédula emisor (12, zero-padded left)
  const cedula = emisorCedula.replace(/\D/g, "").padStart(12, "0").slice(0, 12);

  // Part 4: Sucursal (3)
  const suc = sucursal.padStart(3, "0").slice(0, 3);

  // Part 5: Terminal (5)
  const term = terminal.padStart(5, "0").slice(0, 5);

  // Part 6: TipoComprobante (2)
  const tipo = tipoComprobante.padStart(2, "0");

  // Part 7: NumConsecutivo — 10 digits (last 10 of the full consecutivo)
  const consec = String(consecutivoNumero).padStart(10, "0").slice(-10);

  // Part 8: Código de seguridad (8 random digits)
  const secCode = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");

  // Part 9: Situación (1)
  const sit = situacion;

  const clave = `${pais}${fecha}${cedula}${suc}${term}${tipo}${consec}${secCode}${sit}`;

  if (clave.length !== 50) {
    throw new Error(
      `ClaveNumerica length assertion failed: expected 50, got ${clave.length}. Parts: ${JSON.stringify({ pais, fecha, cedula, suc, term, tipo, consec, secCode, sit })}`,
    );
  }

  return clave;
}

// =============================================================================
// generateConsecutivo
//
// Structure (20 digits total):
//  [3]  Sucursal (zero-padded)
//  [5]  Terminal (zero-padded)
//  [2]  TipoComprobante
//  [10] SecuencialComprobante (the actual sequence number, zero-padded)
//
// = 3+5+2+10 = 20 ✓
// =============================================================================

export interface GenerateConsecutivoParams {
  sucursal?: string;
  terminal?: string;
  tipoComprobante?: TipoComprobante;
  /**
   * The last used sequential number for this sucursal+terminal+tipo combination.
   * Pass 0 for the very first invoice.
   */
  lastConsecutivoNumber: number;
}

/**
 * Generate the 20-digit consecutivo for the next invoice.
 */
export function generateConsecutivo({
  sucursal = HACIENDA_DEFAULT_SUCURSAL,
  terminal = HACIENDA_DEFAULT_TERMINAL,
  tipoComprobante = "01",
  lastConsecutivoNumber,
}: GenerateConsecutivoParams): string {
  const next = lastConsecutivoNumber + 1;

  const suc = sucursal.padStart(3, "0").slice(0, 3);
  const term = terminal.padStart(5, "0").slice(0, 5);
  const tipo = tipoComprobante.padStart(2, "0");
  const seq = String(next).padStart(10, "0");

  const consecutivo = `${suc}${term}${tipo}${seq}`;

  if (consecutivo.length !== 20) {
    throw new Error(
      `Consecutivo length assertion failed: expected 20, got ${consecutivo.length}`,
    );
  }

  return consecutivo;
}

/**
 * Extract the sequential number from a full 20-digit consecutivo string.
 * Useful when reading from DB to compute the next number.
 */
export function parseConsecutivoNumber(consecutivo: string): number {
  if (consecutivo.length !== 20) {
    throw new Error(`Invalid consecutivo length: ${consecutivo.length}`);
  }
  // Last 10 digits are the sequence
  return Number.parseInt(consecutivo.slice(10), 10);
}
