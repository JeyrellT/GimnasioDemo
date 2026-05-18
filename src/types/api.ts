// =============================================================================
// BLACKLINE FITNESS — API request / response types
// Owner: backend-api.
//
// Shapes used by Server Actions (returning Result<T>) and Route Handlers
// (returning NextResponse.json(...)). Keep these lean — derive from Zod
// schemas where possible (see lib/validation/).
// =============================================================================

import type { Result } from "@/lib/result";
import type { AppError } from "@/lib/errors";
import type {
  ClientListItem,
  RoutineSummary,
  RoutineSnapshot,
  NotificationItem,
  BodyMetric,
} from "./domain";
import type {
  AssignedRoutineStatus,
  ChargeStatus,
  InvoiceStatus,
  LpdpRequestStatus,
  LpdpRequestType,
} from "@prisma/client";

// =============================================================================
// Shared envelope
// =============================================================================

/** JSON body sent by Route Handlers on error. */
export interface ApiErrorBody {
  ok: false;
  code: string;
  message: string;
}

/** Unwrapped success body (Route Handlers only, Server Actions use Result). */
export interface ApiSuccessBody<T> {
  ok: true;
  data: T;
}

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;

// Convenience alias used in Server Actions
export type ActionResult<T> = Result<T, AppError>;

// =============================================================================
// Auth
// =============================================================================

export interface RequestMagicLinkResult {
  sent: boolean;
  email: string;
}

export interface UpdateProfileBasicInput {
  name?: string;
  avatarUrl?: string;
}

// =============================================================================
// Consents
// =============================================================================

export interface ConsentItem {
  type: import("@prisma/client").ConsentType;
  granted: boolean;
  version: string;
  grantedAt: Date | null;
  revokedAt: Date | null;
}

// =============================================================================
// Clients (trainer-facing)
// =============================================================================

export interface CreateInvitationResult {
  invitationId: string;
  invitationUrl: string;
  expiresAt: Date;
}

export interface AcceptInvitationResult {
  trainerClientId: string;
  trainerId: string;
  trainerName: string;
}

export interface ListClientsResult {
  clients: ClientListItem[];
  total: number;
}

export interface UpdateClientPriceInput {
  clientId: string;
  monthlyPriceCRC: number;
}

export interface UpdateTrainerNotesInput {
  clientId: string;
  notes: string;
}

// =============================================================================
// Routines
// =============================================================================

export interface CreateRoutineResult {
  routineId: string;
  name: string;
}

export interface AddExerciseToDayInput {
  routineDayId: string;
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe?: number;
  restSeconds?: number;
  tempo?: string;
  supersetGroup?: number;
  notes?: string;
}

export interface AssignRoutineResult {
  assignedRoutineId: string;
  snapshot: RoutineSnapshot;
  status: AssignedRoutineStatus;
}

// =============================================================================
// Sessions
// =============================================================================

export interface StartSessionResult {
  sessionId: string;
  /** Snapshot of the day's exercises to display in the gym UI */
  daySnapshot: RoutineSnapshot["days"][number] | null;
  isFreeWorkout: boolean;
}

export interface RecordSetResult {
  setId: string;
  isPr: boolean;
  prType?: "weight" | "volume" | "reps_at_weight";
}

export interface TodaySessionResult {
  hasActiveSession: boolean;
  sessionId: string | null;
  assignedRoutineId: string | null;
  routineDayName: string | null;
  exercises: RoutineSnapshot["days"][number]["exercises"] | null;
}

// =============================================================================
// Metrics
// =============================================================================

export interface RecordBodyMetricResult {
  metricId: string;
  bmi: number | null;
}

export interface UploadProgressPhotoInitResult {
  photoId: string;
  presignedUrl: string;
  /** Fields to POST with the file in a multipart form */
  presignedFields: Record<string, string>;
}

// =============================================================================
// Exercises
// =============================================================================

export interface ExerciseSearchResult {
  id: string;
  slug: string;
  nameEs: string;
  primaryMuscle: import("@prisma/client").MuscleGroup;
  equipment: import("@prisma/client").ExerciseEquipment;
  difficulty: import("@prisma/client").ExerciseDifficulty;
  gifUrl: string | null;
  thumbnailUrl: string | null;
}

// =============================================================================
// Billing
// =============================================================================

export interface GenerateMonthlyChargesResult {
  generated: number;
  skipped: number;
  errors: number;
}

export interface GenerateInvoiceXmlResult {
  invoiceId: string;
  claveNumerica: string;
  consecutivo: string;
  status: InvoiceStatus;
  xmlStorageKey: string;
}

export interface InvoiceListItem {
  invoiceId: string;
  chargeId: string;
  clientName: string;
  amountCRC: string;
  periodStart: Date;
  periodEnd: Date;
  chargeStatus: ChargeStatus;
  invoiceStatus: InvoiceStatus;
  issuedAt: Date | null;
  claveNumerica: string;
}

// =============================================================================
// Upload presigned
// =============================================================================

export interface PresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
  expiresAt: number; // Unix timestamp
}

// =============================================================================
// OCR
// =============================================================================

export interface OcrCedulaResponse {
  extracted: {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO date
  };
  confidence: number;
}

export interface OcrScaleResponse {
  measurements: {
    weightKg?: number;
    bodyFatPct?: number;
    muscleMassKg?: number;
  };
  confidence: number;
  metricId: string;
}

// =============================================================================
// LPDP
// =============================================================================

export interface LpdpRequestResult {
  requestId: string;
  type: LpdpRequestType;
  status: LpdpRequestStatus;
  message: string;
}

// =============================================================================
// Notifications
// =============================================================================

export interface NotificationsResult {
  items: NotificationItem[];
  unreadCount: number;
}

// =============================================================================
// Client profile detail (trainer-facing, profile redesign)
// =============================================================================

/**
 * All measurable body zones. Lateral fields (L/R) are duplicated from the
 * single DB column in MVP until the lateralized migration runs.
 *
 * TODO (database-architect): add leftArmCm/rightArmCm, leftThighCm/rightThighCm,
 * leftCalfCm/rightCalfCm, leftShoulderCm/rightShoulderCm, leftGluteCm/rightGluteCm,
 * leftHamstringCm/rightHamstringCm, abdomenCm to BodyMetric.
 */
export type BodyZone =
  | "neck"
  | "shoulderLeft"
  | "shoulderRight"
  | "chest"
  | "bicepLeft"
  | "bicepRight"
  | "forearmLeft"
  | "forearmRight"
  | "abdomen"
  | "waist"
  | "hip"
  | "glute"
  | "quadLeft"
  | "quadRight"
  | "hamstringLeft"
  | "hamstringRight"
  | "calfLeft"
  | "calfRight";

/** Per-zone current measurement with delta and 12-week sparkline data. */
export interface ZoneMetric {
  /** Latest measurement in cm. */
  valueCm: number;
  /** Delta vs. the previous BodyMetric that had this zone non-null, in cm. */
  deltaCm: number;
  /** ISO timestamp of the latest measurement for this zone. */
  measuredAt: string;
  /**
   * Up to 12 weekly data points (oldest → newest) used by the sparkline.
   * Each entry is the cm value for that week. Missing weeks are omitted
   * (sparse array by design — the chart interpolates).
   */
  trendSparkline: number[];
}

/**
 * Structured body-composition snapshot derived from the latest BodyMetric.
 *
 * TODO (database-architect): visceralFat and basalMetabolicRate will be
 * persisted once BodyMetric.visceralFat (Int?) and BodyMetric.bmrKcal (Int?)
 * columns are added in the pending migration.
 */
export interface BodyComposition {
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  /** TODO: requires BodyMetric.visceralFat column (pending migration). */
  visceralFat: number | null;
  /** TODO: requires BodyMetric.bmrKcal column (pending migration). */
  basalMetabolicRate: number | null;
  /** Computed server-side: weightKg / (heightCm/100)^2. Null if either is missing. */
  bmi: number | null;
  /**
   * Circumferences from the latest BodyMetric.
   *
   * MVP note: DB stores single armCm / thighCm / calfCm without laterality.
   * The leftX / rightX fields below are duplicated from the same column until
   * the lateralized migration runs (TODO: database-architect).
   */
  circumferences: {
    neckCm: number | null;
    /** TODO: requires BodyMetric.leftShoulderCm column. */
    shoulderLeftCm: number | null;
    /** TODO: requires BodyMetric.rightShoulderCm column. */
    shoulderRightCm: number | null;
    chestCm: number | null;
    /** MVP: duplicated from BodyMetric.armCm. TODO: lateralize. */
    leftBicepCm: number | null;
    /** MVP: duplicated from BodyMetric.armCm. TODO: lateralize. */
    rightBicepCm: number | null;
    /** TODO: requires BodyMetric.leftForearmCm column. */
    leftForearmCm: number | null;
    /** TODO: requires BodyMetric.rightForearmCm column. */
    rightForearmCm: number | null;
    /** TODO: requires BodyMetric.abdomenCm column. */
    abdomenCm: number | null;
    waistCm: number | null;
    hipCm: number | null;
    /** TODO: requires BodyMetric.leftGluteCm column. */
    leftGluteCm: number | null;
    /** TODO: requires BodyMetric.rightGluteCm column. */
    rightGluteCm: number | null;
    /** MVP: duplicated from BodyMetric.thighCm. TODO: lateralize. */
    leftThighCm: number | null;
    /** MVP: duplicated from BodyMetric.thighCm. TODO: lateralize. */
    rightThighCm: number | null;
    /** TODO: requires BodyMetric.leftHamstringCm column. */
    leftHamstringCm: number | null;
    /** TODO: requires BodyMetric.rightHamstringCm column. */
    rightHamstringCm: number | null;
    /** MVP: duplicated from a future BodyMetric.calfCm column. Currently null. */
    leftCalfCm: number | null;
    /** MVP: duplicated from a future BodyMetric.calfCm column. Currently null. */
    rightCalfCm: number | null;
  };
  /**
   * Per-zone freshness for the body-map heatmap.
   * Derived from the most recent BodyMetric where the corresponding field is non-null.
   */
  freshness: Record<
    BodyZone,
    { lastMeasuredAt: string | null; daysSince: number | null }
  >;
}

export interface ActiveRoutine {
  id: string;
  name: string;
  totalDays: number;
  currentDayIndex: number;
  /** Fraction 0..1 (sessions completed / total days × duration weeks, capped at 1). */
  completionPct: number;
  startsOn: string; // ISO
  endsOn: string | null; // ISO
}

export interface RecentSession {
  id: string;
  date: string; // ISO
  durationSec: number | null;
  exercisesCount: number;
  prDetected: boolean;
}

/**
 * Full profile detail returned by getClientProfileDetail.
 * All dates are serialized as ISO strings (server actions cross the React
 * boundary as plain JSON; Date objects would not survive serialization).
 */
export interface ClientProfileDetail {
  user: {
    id: string;
    name: string;
    email: string;
    dateOfBirth: string | null; // ISO
    gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY" | null;
    avatarUrl: string | null;
    createdAt: string; // ISO
  };
  profile: {
    parqStatus: "GREEN" | "REVIEW" | "RED" | "NOT_COMPLETED";
    goal:
      | "FAT_LOSS"
      | "MUSCLE_GAIN"
      | "MAINTENANCE"
      | "PERFORMANCE"
      | "GENERAL_HEALTH"
      | null;
    locationCity: string | null;
    weightKg: number | null;
    heightCm: number | null;
  } | null;
  latestMetric: BodyMetric | null;
  /** Last 12 weeks of metrics, ascending by recordedAt. */
  metricsHistory: BodyMetric[];
  bodyComposition: BodyComposition;
  /** Body-map zone map. null for a zone means no measurement exists at all. */
  zones: Record<BodyZone, ZoneMetric | null>;
  activeRoutine: ActiveRoutine | null;
  /** Last 5 completed sessions. */
  recentSessions: RecentSession[];
  stats: {
    daysSinceStart: number;
    totalSessions: number;
    currentStreak: number;
    alertsCount: number;
    weightDelta28d: number | null; // kg
    bodyFatDelta28d: number | null; // percentage points
  };
  /** Fraction 0..1 of planned sessions completed in the last 7 days. null = no active routine. */
  adherence7d: number | null;
  /** Fraction 0..1 of planned sessions completed in the last 30 days. null = no active routine. */
  adherence30d: number | null;
  trainerNotes: string | null;
}

export type ClientProfileDetailResult = ActionResult<ClientProfileDetail>;

// =============================================================================
// Summary type re-exports for convenience
// =============================================================================

export type { RoutineSummary, ClientListItem };
