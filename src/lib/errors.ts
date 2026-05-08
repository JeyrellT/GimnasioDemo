// =============================================================================
// VIZION — Error hierarchy
// Owner: backend-api.
//
// All errors extend AppError, which extends the native Error so that:
//   - instanceof checks work across boundaries
//   - stack traces are preserved in dev / Sentry
//   - httpStatus is always available at Route Handler boundaries
//
// Code prefix convention:
//   VAL_*  — ValidationError (400)
//   AUTH_* — AuthError       (401)
//   FBN_*  — ForbiddenError  (403)
//   NF_*   — NotFoundError   (404)
//   CFL_*  — ConflictError   (409)
//   RTL_*  — RateLimitError  (429)
//   EXT_*  — ExternalServiceError (502)
//   INT_*  — InternalError   (500)
// =============================================================================

import type { Result } from "./result";

// -----------------------------------------------------------------------------
// Base class
// -----------------------------------------------------------------------------

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly cause: unknown;

  constructor({
    code,
    message,
    httpStatus,
    cause,
  }: {
    code: string;
    message: string;
    httpStatus: number;
    cause?: unknown;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.cause = cause;

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// -----------------------------------------------------------------------------
// Concrete error classes
// -----------------------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `VAL_${code}`, message, httpStatus: 400, cause });
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `AUTH_${code}`, message, httpStatus: 401, cause });
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `FBN_${code}`, message, httpStatus: 403, cause });
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `NF_${code}`, message, httpStatus: 404, cause });
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `CFL_${code}`, message, httpStatus: 409, cause });
  }
}

export class RateLimitError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `RTL_${code}`, message, httpStatus: 429, cause });
  }
}

export class ExternalServiceError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `EXT_${code}`, message, httpStatus: 502, cause });
  }
}

export class InternalError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super({ code: `INT_${code}`, message, httpStatus: 500, cause });
  }
}

// -----------------------------------------------------------------------------
// Type narrowing helper
// -----------------------------------------------------------------------------

/** Convert any thrown value into Result<T, AppError>. */
export function errorToResult<T>(e: unknown): Result<T, AppError> {
  if (e instanceof AppError) {
    return { ok: false, error: e };
  }

  const message =
    e instanceof Error ? e.message : "Error interno. Equipo Vizion fue notificado.";

  return {
    ok: false,
    error: new InternalError("UNEXPECTED", message, e),
  };
}
