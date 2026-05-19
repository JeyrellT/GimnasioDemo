// =============================================================================
// BLACKLINE FITNESS — Dexie offline database schema
// Owner: data-app-builder.
//
// IndexedDB schema for full offline-first gym session execution.
// All tables that can sync carry a `syncStatus` field indexed for fast pending
// queries. LocalSession.serverId is populated after a successful sync so that
// dependent records (localSets) can reference the canonical server ID.
//
// Version strategy: increment ONLY when adding tables or modifying existing
// table indices. Avoid schema changes that require data migration if possible;
// if unavoidable, add a `.upgrade()` callback.
// =============================================================================

import Dexie, { type Table } from "dexie";
import type { ProgressPhotoView, BodyMetricSource } from "@/types/domain";
import type { RoutineSnapshot } from "@/types/domain";

// =============================================================================
// Demo tables — version 2 additions
// Used exclusively by src/lib/demo/* — never synced to server.
// =============================================================================

export interface DemoClientRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string; // ISO date
  parqStatus: "GREEN" | "REVIEW" | "RED" | "NOT_COMPLETED";
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE" | "PERFORMANCE" | "GENERAL_HEALTH" | null;
  weightKg: number | null;
  heightCm: number | null;
  locationCity: string | null;
  encryptedCedula: string | null;
  createdAt: string; // ISO datetime
}

export interface DemoTrainerClientRow {
  id: string;
  trainerUserId: string;
  clientUserId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "ENDED";
  monthlyPriceCRC: number;
  notesPrivate: string | null;
  startedAt: string; // ISO datetime
}

export interface DemoMetricRow {
  id: string;
  clientUserId: string;
  recordedAt: string; // ISO datetime
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  source: "MANUAL" | "OCR_SCALE" | "CONNECTED_DEVICE";
  notes: string | null;
}

export interface DemoRoutineDayExercise {
  id: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number;
  tempo: string | null;
  notes: string | null;
}

export interface DemoRoutineDay {
  id: string;
  dayIndex: number;
  name: string;
  exercises: DemoRoutineDayExercise[];
}

export interface DemoRoutineRow {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  goal: "HYPERTROPHY" | "STRENGTH" | "ENDURANCE" | "FAT_LOSS" | "GENERAL";
  splitDays: number;
  durationWeeks: number;
  isArchived: boolean;
  daysJson: DemoRoutineDay[];
  createdAt: string;
  updatedAt: string;
}

export interface DemoAssignedRoutineRow {
  id: string;
  clientUserId: string;
  routineTemplateId: string;
  startsOn: string; // ISO date
  endsOn: string | null; // ISO date
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  snapshotJson: unknown;
}

export interface DemoSessionSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isPr: boolean;
}

export interface DemoSessionRow {
  id: string;
  clientUserId: string;
  assignedRoutineId: string | null;
  dayIndex: number | null;
  status: "IN_PROGRESS" | "COMPLETED" | "ABORTED";
  startedAt: string; // ISO datetime
  completedAt: string | null; // ISO datetime
  totalDurationSec: number | null;
  bodyweightKg: number | null;
  subjectiveFatigue: number | null;
  notes: string | null;
  isFreeWorkout: boolean;
  setsJson: DemoSessionSet[];
}

export interface DemoLocationRow {
  id: string;
  trainerUserId: string;
  name: string;
  address: string | null;
  kind: "HOME" | "GYM" | "STUDIO" | "CLIENT_HOME" | "OUTDOOR" | "OTHER";
  costModel: "FLAT" | "PER_KM";
  costPerVisitCRC: number | null;
  costPerKmCRC: number | null;
  defaultKm: number | null;
  monthlyRentCRC: number | null;
  notes: string | null;
}

export interface DemoLocationVisitRow {
  id: string;
  trainerUserId: string;
  locationId: string;
  visitedAt: string; // ISO datetime
  kmTraveled: number | null;
  computedCostCRC: number;
  notes: string | null;
}

export interface DemoExpenseRow {
  id: string;
  trainerUserId: string;
  occurredAt: string; // ISO datetime
  amountCRC: number;
  category: "TRANSPORTE" | "ALQUILER_ESPACIO" | "EQUIPO" | "MARKETING" | "EDUCACION" | "SOFTWARE" | "COMIDAS" | "IMPUESTOS" | "SERVICIOS_PROFESIONALES" | "OTROS";
  locationId: string | null;
  description: string | null;
  source: "MANUAL" | "LOCATION_VISIT" | "RECURRING_RENT";
  visitId: string | null;
}

export interface DemoSaleRow {
  id: string;
  trainerUserId: string;
  clientUserId: string | null;
  occurredAt: string; // ISO datetime
  amountCRC: number;
  category: "SESION_PT" | "EVALUACION_INICIAL" | "PLAN_NUTRICIONAL" | "CLASE_GRUPAL" | "ASESORIA_ONLINE" | "PRODUCTO" | "OTROS";
  description: string | null;
  paymentMethod: string | null;
  paidStatus: "PAID" | "PENDING" | "CANCELLED";
}

export interface DemoOnboardingDraftRow {
  id: string;
  trainerId: string;
  mode: "TRAINER_SIDE" | "INVITE";
  currentStep: number;
  dataJson: unknown;
  aiConsentGranted: boolean;
  cedulaExtractionCount: number;
  workoutPhotoExtractionCount: number;
  expiresAt: string; // ISO datetime
  completedAt: string | null; // ISO datetime
  createdAt: string; // ISO datetime
}

export interface DemoExerciseRow {
  id: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  instructionsEs: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  gifUrl: string | null;
  thumbnailUrl: string | null;
  createdById: string | null;
  isPublic: boolean;
}

// -----------------------------------------------------------------------------
// Sync status — shared across all pending tables
// -----------------------------------------------------------------------------

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

// -----------------------------------------------------------------------------
// LocalSession — session started offline
// -----------------------------------------------------------------------------

export interface LocalSession {
  /** cuid2 generated locally. DIFFERENT from the server-assigned id. */
  id: string;
  assignedRoutineId: string | null;
  dayIndex: number | null;
  /**
   * 'in_progress' → started, not yet completed.
   * 'completed'   → user ended the session normally.
   * 'aborted'     → user discarded mid-session.
   */
  status: "in_progress" | "completed" | "aborted";
  startedAt: Date;
  completedAt: Date | null;
  totalDurationSec: number | null;
  subjectiveFatigue: number | null;
  notes: string | null;
  isFreeWorkout: boolean;
  bodyweightKg: number | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncAttempts: number;
  /** Populated once the server action succeeds and returns the canonical id. */
  serverId: string | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// LocalSet — performed set recorded offline
// -----------------------------------------------------------------------------

export interface LocalSet {
  /** cuid2 generated locally. */
  id: string;
  /** References LocalSession.id (local), NOT the server session id. */
  localSessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  restTakenSec: number | null;
  notes: string | null;
  isWarmup: boolean;
  failed: boolean;
  performedAt: Date;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncAttempts: number;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// LocalMetric — body metric recorded offline
// -----------------------------------------------------------------------------

export interface LocalMetric {
  /** cuid2 generated locally. */
  id: string;
  recordedAt: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  source: BodyMetricSource;
  notes: string | null;
  /**
   * If the user captured a scale photo while offline, the Blob lives in
   * photoQueue and this field references the LocalPhoto.id.
   */
  scalePhotoLocalId: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncAttempts: number;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// AssignedRoutineCache — routine snapshot for offline session start
// -----------------------------------------------------------------------------

export interface AssignedRoutineCache {
  /** Server-assigned id (same as AssignedRoutine.id in Prisma). */
  id: string;
  snapshot: RoutineSnapshot;
  startsOn: Date;
  endsOn: Date | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  /** UTC timestamp of when this cache entry was written. Used for staleness. */
  fetchedAt: Date;
}

// -----------------------------------------------------------------------------
// ExerciseCache — slim exercise data for offline display
// -----------------------------------------------------------------------------

export interface ExerciseCache {
  /** Server-assigned exercise id. */
  id: string;
  nameEs: string;
  instructionsEs: string | null;
  primaryMuscle: string;
  equipment: string;
  gifUrl: string | null;
  mediaUrl: string | null;
  fetchedAt: Date;
}

// -----------------------------------------------------------------------------
// LocalPhoto — photo pending upload to R2
// -----------------------------------------------------------------------------

export interface LocalPhoto {
  /** cuid2 generated locally. */
  id: string;
  /** Raw binary stored directly in IndexedDB — max ~50 MB per entry safe. */
  blob: Blob;
  bucket: "photos" | "documents";
  purpose: "progress" | "scale" | "cedula";
  takenAt: Date;
  /** Only present for progress photos. */
  view: ProgressPhotoView | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  retryCount: number;
  /** Populated after successful upload with the R2 object key. */
  storageKey: string | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// KvStore — key-value store for misc. state (no sync, just local prefs/meta)
// -----------------------------------------------------------------------------

export interface KvEntry {
  key: string;
  value: unknown;
}

// -----------------------------------------------------------------------------
// Well-known KV keys — use constants, never raw strings
// -----------------------------------------------------------------------------

export const KV_KEYS = {
  LAST_SYNC_AT: "lastSyncAt",
  CURRENT_SESSION_LOCAL_ID: "currentSessionLocalId",
  SYNC_IN_PROGRESS: "syncInProgress",
} as const;

// -----------------------------------------------------------------------------
// BlacklineFitnessDB class
// -----------------------------------------------------------------------------

export class BlacklineFitnessDB extends Dexie {
  // Existing version-1 tables
  localSessions!: Table<LocalSession, string>;
  localSets!: Table<LocalSet, string>;
  localMetrics!: Table<LocalMetric, string>;
  assignedRoutineCache!: Table<AssignedRoutineCache, string>;
  exerciseCache!: Table<ExerciseCache, string>;
  photoQueue!: Table<LocalPhoto, string>;
  kvStore!: Table<KvEntry, string>;

  // Version-2 demo tables
  demoClients!: Table<DemoClientRow, string>;
  demoTrainerClients!: Table<DemoTrainerClientRow, string>;
  demoMetrics!: Table<DemoMetricRow, string>;
  demoRoutines!: Table<DemoRoutineRow, string>;
  demoAssignedRoutines!: Table<DemoAssignedRoutineRow, string>;
  demoSessions!: Table<DemoSessionRow, string>;
  demoLocations!: Table<DemoLocationRow, string>;
  demoLocationVisits!: Table<DemoLocationVisitRow, string>;
  demoExpenses!: Table<DemoExpenseRow, string>;
  demoSales!: Table<DemoSaleRow, string>;
  demoOnboardingDrafts!: Table<DemoOnboardingDraftRow, string>;
  demoExercises!: Table<DemoExerciseRow, string>;

  constructor() {
    super("blackline-fitness-offline-v1");

    this.version(1).stores({
      // localSessions: primary key=id, indices on syncStatus, assignedRoutineId
      localSessions: [
        "id",
        "syncStatus",
        "assignedRoutineId",
        "[assignedRoutineId+dayIndex]",
        "status",
        "startedAt",
      ].join(", "),

      // localSets: primary key=id, indices on localSessionId and syncStatus
      localSets: [
        "id",
        "localSessionId",
        "syncStatus",
        "[localSessionId+exerciseId]",
        "performedAt",
      ].join(", "),

      // localMetrics: primary key=id, indices on syncStatus and recordedAt
      localMetrics: ["id", "syncStatus", "recordedAt"].join(", "),

      // assignedRoutineCache: primary key=id (server id), index on status
      assignedRoutineCache: ["id", "status", "fetchedAt"].join(", "),

      // exerciseCache: primary key=id (server id)
      exerciseCache: ["id", "fetchedAt"].join(", "),

      // photoQueue: primary key=id, index on syncStatus, bucket, purpose
      photoQueue: ["id", "syncStatus", "bucket", "purpose", "takenAt"].join(
        ", ",
      ),

      // kvStore: primary key=key
      kvStore: "key",
    });

    // Version 2: demo tables (no upgrade needed — pure additions)
    this.version(2).stores({
      demoClients: "id, email, parqStatus, goal",
      demoTrainerClients: "id, trainerUserId, clientUserId, status",
      demoMetrics: "id, clientUserId, recordedAt",
      demoRoutines: "id, trainerId, isArchived",
      demoAssignedRoutines: "id, clientUserId, routineTemplateId, status",
      demoSessions: "id, clientUserId, status, completedAt",
      demoLocations: "id, trainerUserId",
      demoLocationVisits: "id, trainerUserId, locationId, visitedAt",
      demoExpenses: "id, trainerUserId, occurredAt, category",
      demoSales: "id, trainerUserId, occurredAt, category",
      demoOnboardingDrafts: "id, trainerId, completedAt",
      demoExercises: "id, slug, primaryMuscle, equipment",
    });

    // Version 3: compound indexes for common .where({field1, field2}) queries
    this.version(3).stores({
      demoTrainerClients: "id, trainerUserId, clientUserId, status, [trainerUserId+status]",
      demoAssignedRoutines: "id, clientUserId, routineTemplateId, status, [clientUserId+status]",
      demoSessions: "id, clientUserId, status, completedAt, [clientUserId+status]",
    });
  }
}

// -----------------------------------------------------------------------------
// Singleton — import this everywhere, never instantiate BlacklineFitnessDB directly.
// Safe to import in both client components and service workers.
// -----------------------------------------------------------------------------

export const db = new BlacklineFitnessDB();
