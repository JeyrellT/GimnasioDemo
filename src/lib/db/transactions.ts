// =============================================================================
// FORJA — Transaction helpers
// Owner: database-architect.
//
// API:
//   - withTx(fn, opts?)         : envuelve `prisma.$transaction` con timeout
//                                 y nivel de aislamiento configurables.
//                                 Usa la instancia CON extensión soft-delete activa.
//                                 Default: Serializable, 10 s.
//   - withTxRaw(fn, opts?)      : igual, pero usa `prismaWithDeleted` (sin filtro).
//                                 SOLO para handlers LPDP (export, hard-delete) y
//                                 procesos administrativos auditados.
//   - runInBatch(items, n, fn)  : procesa `items` en chunks de `n` dentro de
//                                 una transacción cada uno. Útil para seeds
//                                 y back-fills (~800 ejercicios, etc.).
//
// Notas de diseño:
//   - withTx usa `prisma` (con soft-delete). Las queries dentro de la transacción
//     tienen el mismo comportamiento que fuera: `findMany`, `findUnique`, `update`,
//     `delete`, etc. respetan automáticamente el filtro de soft-delete.
//   - withTxRaw usa `prismaWithDeleted`. Debe usarse ÚNICAMENTE cuando el caller
//     necesita operar sobre todas las filas sin importar su estado de borrado
//     (ej.: exportar datos LPDP, hard-delete, auditoría forense).
//   - En ambos casos el callback recibe `Prisma.TransactionClient` — las
//     extensiones del cliente base NO se propagan al TransactionClient de Prisma 5.
//     Por eso soft-delete en transacciones se aplica en la capa de extensión
//     del query ($allOperations), no con middleware — esto es correcto.
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma, prismaWithDeleted } from "./client";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_WAIT_MS = 5_000;

export interface WithTxOptions {
  /** Total transaction timeout in milliseconds. Default 10 000. */
  timeoutMs?: number;
  /** Max time to wait for a connection from the pool. Default 5 000. */
  maxWaitMs?: number;
  /** Postgres isolation level. Default Serializable. */
  isolation?: Prisma.TransactionIsolationLevel;
}

/**
 * Run a function inside a Prisma transaction with sane defaults.
 * Uses the soft-delete-extended client — the default safe choice for all
 * application transactions that don't need to touch soft-deleted rows.
 *
 * @example
 *   const result = await withTx(async (tx) => {
 *     const user = await tx.user.create({ data: ... });
 *     await tx.consent.createMany({ data: [...] });
 *     return user;
 *   });
 */
export async function withTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: WithTxOptions = {},
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    isolation = Prisma.TransactionIsolationLevel.Serializable,
  } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).$transaction(fn, {
    maxWait: maxWaitMs,
    timeout: timeoutMs,
    isolationLevel: isolation,
  }) as Promise<T>;
}

/**
 * Raw transaction — bypasses the soft-delete extension.
 * Use ONLY for:
 *   - LPDP export / hard-delete handlers
 *   - Admin back-fill scripts that must operate on all rows regardless of status
 *
 * @example
 *   // LPDP hard-delete: must reach soft-deleted rows too
 *   await withTxRaw(async (tx) => {
 *     await tx.user.delete({ where: { id: userId } });
 *   });
 */
export async function withTxRaw<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: WithTxOptions = {},
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    isolation = Prisma.TransactionIsolationLevel.Serializable,
  } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prismaWithDeleted as any).$transaction(fn, {
    maxWait: maxWaitMs,
    timeout: timeoutMs,
    isolationLevel: isolation,
  }) as Promise<T>;
}

/**
 * Process `items` in chunks of `batchSize` inside a transaction per chunk.
 * Used by seed scripts to insert thousands of rows without blowing the
 * transaction timeout, and to keep memory bounded.
 * Uses withTxRaw because seed/back-fill operations must reach all rows.
 *
 * @example
 *   await runInBatch(exercises, 100, async (chunk, tx) => {
 *     await tx.exercise.createMany({ data: chunk, skipDuplicates: true });
 *   });
 */
export async function runInBatch<T>(
  items: T[],
  batchSize: number,
  fn: (batch: T[], tx: Prisma.TransactionClient) => Promise<void>,
  opts: WithTxOptions = {},
): Promise<void> {
  if (batchSize <= 0) {
    throw new Error("runInBatch: batchSize must be > 0");
  }
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await withTxRaw((tx) => fn(chunk, tx), opts);
  }
}
