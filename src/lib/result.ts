// =============================================================================
// BLACKLINE FITNESS — Result<T, E> type and helpers
// Owner: backend-api.
//
// All Server Actions and Route Handler boundaries return Result<T, AppError>.
// Internal lib functions may throw; boundaries catch and convert via err().
//
// Pattern:
//   return ok({ id, name });
//   return err(new NotFoundError("NF_CLIENT", "Cliente no encontrado"));
// =============================================================================

import type { AppError } from "./errors";

// -----------------------------------------------------------------------------
// Core discriminated union
// -----------------------------------------------------------------------------

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Unwrap a Result, throwing the error if not ok.
 * Use ONLY in internal code where the caller can't handle Result (e.g. tests).
 * Never call in production boundaries — those must handle both arms.
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/**
 * Map the success value of a Result without touching the error channel.
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}

/**
 * Execute an async function and wrap thrown exceptions into Result<T, AppError>.
 *
 * Catches:
 *   - AppError subclasses → returned as-is inside err()
 *   - Any other thrown value → wrapped in InternalError
 *
 * Use this at every async boundary to convert throws into the Result protocol.
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
): Promise<Result<T, AppError>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    // Next.js redirect() and notFound() throw special non-Error objects that
    // must be re-thrown so the framework can handle them correctly.
    if (
      e !== null &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: unknown }).digest === "string" &&
      ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (e as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
    ) {
      throw e;
    }

    const { errorToResult } = await import("./errors");
    const result = errorToResult<T>(e);

    // Strip class instances to plain objects so Next.js can serialize
    // the result across the server/client boundary without errors.
    if (!result.ok) {
      return {
        ok: false,
        error: {
          name: result.error.name,
          code: result.error.code,
          message: result.error.message,
          httpStatus: result.error.httpStatus,
        } as unknown as AppError,
      };
    }

    return result;
  }
}
