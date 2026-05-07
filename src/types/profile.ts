// =============================================================================
// FORJA — ClientProfileDetail types
// Owner: frontend-react (stub). backend-api owns the authoritative version in
// src/types/api.ts once getClientProfileDetail is implemented.
// =============================================================================

// These types mirror the shape defined in PROFILE_REDESIGN.md §6.
// When backend-api adds ClientProfileDetail to src/types/api.ts, import from
// there and delete this file.

import type { ParqStatus, Goal, Gender } from "@/types/domain";

export type BodyZone =
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "chest"
  | "bicepL"
  | "bicepR"
  | "forearmL"
  | "forearmR"
  | "abdomen"
  | "waist"
  | "hip"
  | "gluteL"
  | "gluteR"
  | "quadL"
  | "quadR"
  | "hamstringL"
  | "hamstringR"
  | "calfL"
  | "calfR";

export type DeltaAlignment = "good" | "neutral" | "bad" | null;

/** Color semantic sent from server to avoid client replicating medical rules. */
export type DeltaDirection = "positive" | "negative" | "neutral" | "warning";

export interface BodyComposition {
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  visceralFat: number | null;
  basalMetabolicRate: number | null;
  bmi: number | null;
  circumferences: {
    neckCm: number | null;
    shoulderLeftCm: number | null;
    shoulderRightCm: number | null;
    chestCm: number | null;
    leftBicepCm: number | null;
    rightBicepCm: number | null;
    leftForearmCm: number | null;
    rightForearmCm: number | null;
    abdomenCm: number | null;
    waistCm: number | null;
    hipCm: number | null;
    leftGluteCm: number | null;
    rightGluteCm: number | null;
    leftThighCm: number | null;
    rightThighCm: number | null;
    leftHamstringCm: number | null;
    rightHamstringCm: number | null;
    leftCalfCm: number | null;
    rightCalfCm: number | null;
  };
  freshness: Record<BodyZone, { lastMeasuredAt: Date | null; daysSince: number | null }>;
}

export interface ActiveRoutine {
  id: string;
  name: string;
  totalDays: number;
  currentDayIndex: number;
  completionPct: number;
  startsOn: Date;
  endsOn: Date | null;
}

export interface RecentSession {
  id: string;
  date: Date;
  durationSec: number;
  exerciseCount: number;
  setCount: number;
  prDetected: boolean;
}

export interface ClientProfileDetail {
  user: {
    id: string;
    name: string;
    email: string;
    dateOfBirth: Date | null;
    gender: Gender | null;
    avatarUrl: string | null;
    createdAt: Date;
  };
  profile: {
    parqStatus: ParqStatus;
    goal: Goal | null;
    locationCity: string | null;
    weightKg: number | null;
    heightCm: number | null;
  };
  bodyComposition: BodyComposition;
  activeRoutine: ActiveRoutine | null;
  recentSessions: RecentSession[];
  stats: {
    daysSinceStart: number;
    totalSessions: number;
    currentStreak: number;
    alertsCount: number;
  };
  adherence7d: number | null;
  adherence30d: number | null;
  /** Sparkline history — 12-week weekly snapshots, ascending. */
  weightHistory12w: number[];
  bodyFatHistory12w: number[];
  muscleMassHistory12w: number[];
}

export interface ScaleData {
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  visceralFat?: number;
  basalMetabolicRate?: number;
  confidence?: number;
}
