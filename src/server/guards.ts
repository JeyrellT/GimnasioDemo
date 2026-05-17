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
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logWarn } from "@/lib/logger";

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
// Public guard functions
// -----------------------------------------------------------------------------

/**
 * Get the currently authenticated user with profiles, or null if not signed in.
 * Does not throw — callers must handle null.
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

  return user;
}

/**
 * Require an authenticated user. Redirects to /ingresar if no session.
 * Throws AuthError if the session user no longer exists in the DB.
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

  return user;
}

/**
 * Require an authenticated user with the specified role.
 * Redirects to /ingresar if no session; throws ForbiddenError on role mismatch.
 */
export async function requireRole(role: UserRole): Promise<UserWithProfile> {
  const user = await requireUser();

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
 */
export async function requireAdmin(): Promise<UserWithProfile> {
  return requireRole("ADMIN");
}

/**
 * Assert that a trainer owns (has an active link to) a specific client.
 * Throws ForbiddenError if the TrainerClient record does not exist or the
 * link is in any state other than ACTIVE.
 *
 * Only checks ACTIVE links — a trainer cannot access a client whose link
 * has been PAUSED or ENDED.
 */
export async function assertOwnsClient(
  trainerId: string,
  clientId: string,
): Promise<void> {
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
 * @param trainerId  Optional — defaults to the current session's user id.
 */
export async function requireActiveSubscription(
  trainerId?: string,
): Promise<TrainerSubscription> {
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
