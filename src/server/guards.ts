// =============================================================================
// VIZION — Real auth guard functions
// Owner: backend-api.
//
// All guards use auth() from ./auth.ts to read the JWT session, then query
// Prisma for the full user + profiles. Throw AppError subclasses on failure so
// Route Handler boundaries can catch them and return the correct HTTP status.
//
// Naming mirrors the demo stubs in src/lib/auth/guards.ts so callsites that
// import from this module need no changes when switching from demo mode.
//
// TypeScript types:
//   UserWithProfile         — User + optional trainerProfile + optional clientProfile
//   UserWithTrainerProfile  — User + required trainerProfile
//   UserWithClientProfile   — User + required clientProfile
// =============================================================================

import type {
  User,
  TrainerProfile,
  ClientProfile,
  TrainerSubscription,
  ConsentType,
  UserRole,
  SubscriptionStatus,
} from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logWarn } from "@/lib/logger";
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonation,
} from "@/lib/impersonation";

// -----------------------------------------------------------------------------
// TypeScript types
// -----------------------------------------------------------------------------

export type UserWithProfile = User & {
  trainerProfile: TrainerProfile | null;
  clientProfile: ClientProfile | null;
};

export type UserWithTrainerProfile = User & {
  trainerProfile: TrainerProfile;
  clientProfile: ClientProfile | null;
};

export type UserWithClientProfile = User & {
  trainerProfile: TrainerProfile | null;
  clientProfile: ClientProfile;
};

// -----------------------------------------------------------------------------
// Internal: shared user query
// -----------------------------------------------------------------------------

const USER_WITH_PROFILES_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  passwordHash: true,
  name: true,
  dateOfBirth: true,
  gender: true,
  role: true,
  locale: true,
  theme: true,
  pushOptIn: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  suspendedAt: true,
  suspendedReason: true,
  trainerProfile: true,
  clientProfile: true,
} as const;

async function fetchUserById(id: string): Promise<UserWithProfile | null> {
  // prisma (not prismaRaw) — soft-delete filter automatically applied.
  return prisma.user.findUnique({
    where: { id },
    select: USER_WITH_PROFILES_SELECT,
  });
}

// -----------------------------------------------------------------------------
// Active subscription statuses
// -----------------------------------------------------------------------------

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
];

// -----------------------------------------------------------------------------
// Impersonation: internal helper
// -----------------------------------------------------------------------------

/**
 * Reads the impersonation cookie and returns the target user id if all of the
 * following are true:
 *   1. The cookie is present and HMAC-valid (not tampered, not expired).
 *   2. The cookie's actorId matches the current JWT session user.
 *   3. That JWT session user has role === SUPER_ADMIN in the DB.
 *
 * Returns null on any failure — callers treat null as "no impersonation active".
 */
async function getImpersonatedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;

  const payload = verifyImpersonation(raw);
  if (!payload) return null;

  // The cookie must have been issued for the current session user
  if (payload.actorId !== session.user.id) return null;

  // The actor must still be SUPER_ADMIN in the DB (can't rely solely on JWT)
  const actor = await fetchUserById(session.user.id);
  if (!actor || actor.role !== "SUPER_ADMIN") return null;

  return payload.targetId;
}

// -----------------------------------------------------------------------------
// Public guard functions
// -----------------------------------------------------------------------------

/**
 * Get the currently authenticated user with profiles, or null if not signed in.
 * Does not throw — callers must handle null.
 *
 * If an active impersonation cookie is present AND the session user is
 * SUPER_ADMIN, returns the impersonation TARGET user instead of the actor.
 * This lets SUPER_ADMIN investigate any account transparently.
 */
export async function getCurrentUser(): Promise<UserWithProfile | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await fetchUserById(session.user.id);
  if (!user) {
    // Session points to a deleted or missing user — treat as signed out.
    logWarn("getCurrentUser: session userId not found in DB", {
      userId: session.user.id,
    });
    return null;
  }

  // Impersonation: if SUPER_ADMIN and a valid cookie exists, return target user
  if (user.role === "SUPER_ADMIN") {
    const targetId = await getImpersonatedUserId();
    if (targetId) {
      const target = await fetchUserById(targetId);
      if (target) return target;
    }
  }

  return user;
}

/**
 * Require an authenticated user. Redirects to /ingresar if no session.
 * Throws AuthError if the session user no longer exists in the DB.
 * Throws ForbiddenError if the user is suspended (non-SUPER_ADMIN only).
 *
 * Impersonation: same as getCurrentUser — SUPER_ADMIN with an active cookie
 * gets the target user returned as the subject of subsequent operations.
 */
export async function requireUser(): Promise<UserWithProfile> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/ingresar");
  }

  const user = await fetchUserById(session.user.id);

  if (!user) {
    throw new AuthError(
      "USER_NOT_FOUND",
      "Tu sesión apunta a una cuenta que ya no existe. Ingresá de nuevo.",
    );
  }

  // Impersonation: if SUPER_ADMIN and a valid cookie exists, return target user.
  // Suspended targets are allowed — SUPER_ADMIN needs to be able to investigate.
  if (user.role === "SUPER_ADMIN") {
    const targetId = await getImpersonatedUserId();
    if (targetId) {
      const target = await fetchUserById(targetId);
      if (target) return target;
    }
  }

  // Suspended non-SUPER_ADMIN users are blocked at this gate
  if (user.suspendedAt !== null && user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError(
      "USER_SUSPENDED",
      "Tu cuenta está suspendida. Contactá soporte.",
    );
  }

  return user;
}

/**
 * Require only the SUPER_ADMIN role.
 * Throws ForbiddenError if the user is not SUPER_ADMIN.
 * Throws ForbiddenError if the SUPER_ADMIN account itself is suspended
 * (edge case: a higher-privileged operator suspended the account via DB).
 *
 * NOTE: impersonation is NOT applied here — this guard always returns the real
 * session actor, never the impersonation target. That is intentional: admin
 * actions must always execute as the real SUPER_ADMIN identity.
 */
export async function requireSuperAdmin(): Promise<UserWithProfile> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/ingresar");
  }

  const user = await fetchUserById(session.user.id);

  if (!user) {
    throw new AuthError(
      "USER_NOT_FOUND",
      "Tu sesión apunta a una cuenta que ya no existe. Ingresá de nuevo.",
    );
  }

  if (user.role !== "SUPER_ADMIN") {
    logWarn("requireSuperAdmin: role mismatch", {
      userId: user.id,
      actual: user.role,
    });
    throw new ForbiddenError(
      "SUPER_ADMIN_REQUIRED",
      "Esta sección requiere privilegios de Super Admin.",
    );
  }

  if (user.suspendedAt !== null) {
    throw new ForbiddenError(
      "USER_SUSPENDED",
      "Tu cuenta de Super Admin está suspendida. Contactá soporte.",
    );
  }

  return user;
}

/**
 * Require an authenticated user with the specified role.
 * Redirects to /ingresar if no session; throws ForbiddenError on role mismatch.
 *
 * SUPER_ADMIN bypasses all role checks — they pass any requireRole() gate.
 */
export async function requireRole(role: UserRole): Promise<UserWithProfile> {
  const user = await requireUser();

  // SUPER_ADMIN is a superset of all roles
  if (user.role === "SUPER_ADMIN") return user;

  if (user.role !== role) {
    logWarn("requireRole: role mismatch", {
      userId: user.id,
      expected: role,
      actual: user.role,
    });
    throw new ForbiddenError(
      "ROLE_MISMATCH",
      "No tenés permiso para acceder a esta sección.",
    );
  }

  return user;
}

/**
 * Require the authenticated user to be a TRAINER with a TrainerProfile.
 * Throws ForbiddenError if not TRAINER or profile is missing.
 *
 * NOTE: SUPER_ADMIN does NOT bypass this guard. If a SUPER_ADMIN needs to act
 * as a trainer (e.g., to read trainer-scoped data), they must start an
 * impersonation session targeting a real TRAINER account. This preserves the
 * invariant that trainerProfile is always non-null in UserWithTrainerProfile.
 */
export async function requireTrainer(): Promise<UserWithTrainerProfile> {
  const user = await requireRole("TRAINER");

  if (!user.trainerProfile) {
    throw new ForbiddenError(
      "TRAINER_PROFILE_MISSING",
      "Tu perfil de entrenador está incompleto. Contactá soporte.",
    );
  }

  return user as UserWithTrainerProfile;
}

/**
 * Require the authenticated user to be a CLIENT with a ClientProfile.
 * Throws ForbiddenError if not CLIENT or profile is missing.
 *
 * NOTE: SUPER_ADMIN does NOT bypass this guard — same reasoning as requireTrainer().
 * Impersonate a real CLIENT to access client-scoped data.
 */
export async function requireClient(): Promise<UserWithClientProfile> {
  const user = await requireRole("CLIENT");

  if (!user.clientProfile) {
    throw new ForbiddenError(
      "CLIENT_PROFILE_MISSING",
      "Tu perfil de cliente está incompleto. Contactá soporte.",
    );
  }

  return user as UserWithClientProfile;
}

/**
 * Require the authenticated user to be an ADMIN.
 * SUPER_ADMIN also passes (ADMIN is a subset of SUPER_ADMIN's powers).
 */
export async function requireAdmin(): Promise<UserWithProfile> {
  const user = await requireUser();

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    logWarn("requireAdmin: insufficient role", {
      userId: user.id,
      actual: user.role,
    });
    throw new ForbiddenError(
      "ADMIN_REQUIRED",
      "Esta sección requiere privilegios de administrador.",
    );
  }

  return user;
}

/**
 * Assert that a trainer owns (has an active link to) a specific client.
 * Throws ForbiddenError if the TrainerClient record does not exist or the
 * link is in any state other than ACTIVE.
 *
 * Only checks ACTIVE links — a trainer cannot access a client whose link
 * has been PAUSED or ENDED.
 *
 * SUPER_ADMIN bypass: if the current session user (JWT actor, NOT the
 * impersonation target) is SUPER_ADMIN, the ownership check is skipped.
 * This lets SUPER_ADMIN investigate any trainer–client relationship without
 * needing to impersonate first.
 */
export async function assertOwnsClient(
  trainerId: string,
  clientId: string,
): Promise<void> {
  // Check the real JWT actor's role, not the impersonation target
  const session = await auth();
  if (session?.user?.id) {
    const actor = await fetchUserById(session.user.id);
    if (actor?.role === "SUPER_ADMIN") return; // bypass
  }

  const link = await prisma.trainerClient.findUnique({
    where: { trainerId_clientId: { trainerId, clientId } },
    select: { status: true },
  });

  if (!link || link.status !== "ACTIVE") {
    logWarn("assertOwnsClient: no active link", { trainerId, clientId });
    throw new ForbiddenError(
      "NOT_YOUR_CLIENT",
      "No tenés acceso a este cliente.",
    );
  }
}

/**
 * Get the active TrainerSubscription for a trainer.
 * Returns null if the trainer has no active subscription (TRIAL or ACTIVE).
 *
 * @param trainerId  Optional — defaults to the current session's user id.
 */
export async function getActiveTrainerSubscription(
  trainerId?: string,
): Promise<TrainerSubscription | null> {
  let resolvedId = trainerId;

  if (!resolvedId) {
    const session = await auth();
    resolvedId = session?.user?.id;
  }

  if (!resolvedId) return null;

  // Look for any subscription in an "active-enough" state.
  // READ_ONLY / PAST_DUE / CANCELLED are intentionally excluded.
  const sub = await prisma.trainerSubscription.findFirst({
    where: {
      trainerUserId: resolvedId,
      status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
    },
  });

  return sub;
}

/**
 * Require an active (TRIAL or ACTIVE) TrainerSubscription.
 * Throws ForbiddenError with a clear message if no subscription is found.
 *
 * SUPER_ADMIN bypass: if the calling JWT actor is SUPER_ADMIN (or the
 * trainerId being checked is the impersonation target of an active SUPER_ADMIN
 * session), the check is skipped. This lets SUPER_ADMIN access trainer-scoped
 * subscription-gated actions during investigations.
 *
 * @param trainerId  Optional — defaults to the current session's user id.
 */
export async function requireActiveSubscription(
  trainerId?: string,
): Promise<TrainerSubscription> {
  // SUPER_ADMIN bypass — check JWT actor role directly
  const session = await auth();
  if (session?.user?.id) {
    const actor = await fetchUserById(session.user.id);
    if (actor?.role === "SUPER_ADMIN") {
      // Return a synthetic subscription so callers don't need to null-check.
      // Using the real one if it exists, otherwise a safe sentinel.
      const real = await getActiveTrainerSubscription(
        trainerId ?? session.user.id,
      );
      if (real) return real;

      // No real sub — fabricate a minimal sentinel so SUPER_ADMIN can proceed.
      // This value is never persisted; it only satisfies the return type.
      const now = new Date();
      return {
        id: "__super_admin_bypass__",
        trainerUserId: trainerId ?? actor.id,
        planTier: "STUDIO",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        trialEndsAt: null,
        paymentMethodToken: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      } satisfies TrainerSubscription;
    }
  }

  const sub = await getActiveTrainerSubscription(trainerId);

  if (!sub) {
    throw new ForbiddenError(
      "NO_ACTIVE_SUBSCRIPTION",
      "Tu suscripción ha vencido o fue cancelada. Actualizá tu plan para continuar.",
    );
  }

  return sub;
}

/**
 * Assert that a user has explicitly granted a specific type of consent.
 * Throws ForbiddenError if no granted, non-revoked consent record exists.
 *
 * Used to enforce LPDP / Ley 8968 consent gates before processing sensitive
 * operations (e.g., AI processing, health data access).
 *
 * IMPORTANT: This guard is intentionally NOT bypassed for SUPER_ADMIN.
 * Technical access does not grant legal consent under LPDP / Ley 8968.
 * SUPER_ADMIN must impersonate the data subject and use the normal consent
 * flow, or obtain explicit consent through other legal channels.
 */
export async function assertHasConsent(
  userId: string,
  type: ConsentType,
): Promise<void> {
  const consent = await prisma.consent.findFirst({
    where: {
      userId,
      type,
      granted: true,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!consent) {
    logWarn("assertHasConsent: missing consent", { userId, type });
    throw new ForbiddenError(
      "CONSENT_REQUIRED",
      `Se requiere tu consentimiento para "${type}" antes de continuar.`,
    );
  }
}

// Re-export NotFoundError so callers can build guard-like assertions
// (e.g., "entity must exist") without an extra import.
export { NotFoundError };
