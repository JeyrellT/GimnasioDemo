// =============================================================================
// FORJA — Domain types
// Owner: backend-api. Read by frontend-react, data-viz, data-app-builder.
//
// Single source of truth for Prisma-derived types and composite shapes used
// across the full stack. Import from here, never from @prisma/client directly
// in application code (except lib/db/client.ts).
// =============================================================================

// Re-export all Prisma enums so consumers don't need a direct @prisma/client dep
export type {
  User,
  TrainerProfile,
  ClientProfile,
  TrainerClient,
  Invitation,
  InitialAssessment,
  ParqAnswer,
  BodyMetric,
  ProgressPhoto,
  Exercise,
  RoutineTemplate,
  RoutineDay,
  RoutineExercise,
  AssignedRoutine,
  WorkoutSession,
  PerformedSet,
  RoutineComment,
  SubscriptionPlan,
  TrainerSubscription,
  ClientCharge,
  Invoice,
  PaymentEvent,
  AuditLog,
  LpdpRequest,
  Notification,
  Consent,
} from "@prisma/client";

export {
  UserRole,
  Gender,
  TrainerClientStatus,
  ParqStatus,
  Goal,
  ConsentType,
  BodyMetricSource,
  ProgressPhotoView,
  ExerciseDifficulty,
  ExerciseEquipment,
  MuscleGroup,
  RoutineGoal,
  AssignedRoutineStatus,
  WorkoutSessionStatus,
  SubscriptionTier,
  SubscriptionStatus,
  ChargeStatus,
  InvoiceStatus,
  PaymentEventType,
  LpdpRequestType,
  LpdpRequestStatus,
  AuditAction,
} from "@prisma/client";

// Re-export Decimal for callers that format monetary values
export type { Decimal } from "@prisma/client/runtime/library";

// =============================================================================
// Composite domain shapes
// =============================================================================

import type { Prisma } from "@prisma/client";

// ── User ─────────────────────────────────────────────────────────────────────

export type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    trainerProfile: true;
    clientProfile: true;
  };
}>;

// ── Trainer ──────────────────────────────────────────────────────────────────

export type TrainerWithStats = Prisma.UserGetPayload<{
  include: {
    trainerProfile: true;
    trainerSubscription: true;
    asTrainer: {
      where: { status: "ACTIVE" };
      include: {
        client: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
            clientProfile: { select: { parqStatus: true; goal: true } };
          };
        };
      };
    };
  };
}>;

// ── Client ───────────────────────────────────────────────────────────────────

export type ClientWithCurrentRoutine = Prisma.UserGetPayload<{
  include: {
    clientProfile: true;
    assignedRoutines: {
      where: { status: "ACTIVE" };
      include: {
        routineTemplate: {
          include: { days: { include: { exercises: { include: { exercise: true } } } } };
        };
      };
      take: 1;
    };
  };
}>;

/** Lightweight client row shown in trainer's client list. */
export interface ClientListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  parqStatus: import("@prisma/client").ParqStatus;
  goal: import("@prisma/client").Goal | null;
  /** Plain number (not Decimal) — serializable across the RSC boundary. */
  monthlyPriceCRC: number | null;
  lastSessionAt: Date | null;
  /** 0–100. Sessions completed vs. assigned over the last 7 days. */
  adherencePct7d: number;
  nextChargeDate: Date | null;
  trainerClientId: string;
  status: import("@prisma/client").TrainerClientStatus;
}

// ── Routine ───────────────────────────────────────────────────────────────────

export type RoutineWithDays = Prisma.RoutineTemplateGetPayload<{
  include: {
    days: {
      include: {
        exercises: {
          include: { exercise: true };
          orderBy: { order: "asc" };
        };
      };
      orderBy: { dayIndex: "asc" };
    };
  };
}>;

/** Slim card shown in routine list. */
export type RoutineSummary = Pick<
  import("@prisma/client").RoutineTemplate,
  | "id"
  | "name"
  | "goal"
  | "splitDays"
  | "durationWeeks"
  | "isArchived"
  | "createdAt"
  | "updatedAt"
>;

// ── Routine Snapshot — immutable prescription frozen at assignment time ───────

export interface RoutineSnapshotExercise {
  exerciseId: string;
  nameEs: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number;
  tempo: string | null;
  supersetGroup: number | null;
  notes: string | null;
}

export interface RoutineSnapshotDay {
  dayIndex: number;
  name: string;
  exercises: RoutineSnapshotExercise[];
}

/**
 * Schema for AssignedRoutine.snapshotJson.
 * Validated via assignedRoutineSnapshotSchema (Zod) before every insert.
 * Once persisted, never mutated — trainer edits to the template do NOT
 * affect the frozen copy the client is executing.
 */
export interface RoutineSnapshot {
  templateId: string;
  templateName: string;
  goal: import("@prisma/client").RoutineGoal;
  splitDays: number;
  durationWeeks: number;
  days: RoutineSnapshotDay[];
  snapshotAt: string; // ISO 8601 UTC
}

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionInProgress = Prisma.WorkoutSessionGetPayload<{
  include: {
    performedSets: {
      include: { exercise: { select: { id: true; nameEs: true } } };
      orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }];
    };
    assignedRoutine: true;
  };
}>;

// ── Billing ───────────────────────────────────────────────────────────────────

export type ChargeWithInvoice = Prisma.ClientChargeGetPayload<{
  include: { invoice: true };
}>;

// ── Notification ─────────────────────────────────────────────────────────────

export type NotificationItem = Pick<
  import("@prisma/client").Notification,
  "id" | "type" | "title" | "body" | "data" | "readAt" | "createdAt"
>;
