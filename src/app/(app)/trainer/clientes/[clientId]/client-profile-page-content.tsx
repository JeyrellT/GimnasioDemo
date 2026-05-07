"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Dumbbell, Loader2, MoreHorizontal } from "lucide-react";

import { getClientProfileDetail } from "@/app/actions/clients";

import { ClientHeroCard } from "@/components/shared/client-hero-card";
import { KpiHeroCard } from "@/components/shared/kpi-hero-card";
import { CircumferencesTable } from "@/components/shared/circumferences-table";
import { MeasurementSheetController } from "./_components/measurement-sheet-controller";
import { ClientProfileTabsClient } from "./_components/client-profile-tabs";

import { BodyMap } from "@/components/charts/body-map";
import type { BodyZone, ZoneData } from "@/components/charts/body-map";

import type {
  ClientProfileDetail as FrontendDetail,
  BodyComposition as FrontendComposition,
  ActiveRoutine as FrontendRoutine,
  RecentSession as FrontendSession,
  DeltaAlignment,
} from "@/types/profile";
import type {
  ClientProfileDetail as BackendDetail,
  BodyZone as BackendBodyZone,
} from "@/types/api";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function computeAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function genderLabel(gender: string | null): string | null {
  if (!gender) return null;
  const MAP: Record<string, string> = {
    MALE: "Masculino",
    FEMALE: "Femenino",
    OTHER: "Otro",
    PREFER_NOT_SAY: "Sin especificar",
    PREFER_NOT_TO_SAY: "Sin especificar",
  };
  return MAP[gender] ?? gender;
}

function fmt(v: number | null | undefined, decimals = 1, unit = ""): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(decimals)}${unit}`;
}

function bmiLabel(bmi: number | null): string {
  if (bmi === null) return "—";
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidad";
}

function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function fmtDelta(delta: number | null, unit: string, decimals = 1): string | undefined {
  if (delta === null || delta === undefined) return undefined;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toFixed(decimals)} ${unit}`;
}

function alignDelta(
  delta: number | null,
  goal: BackendDetail["profile"] extends infer P ? (P extends { goal: infer G } ? G : never) : never,
): DeltaAlignment {
  if (delta === null || delta === 0) return null;
  if (goal === "FAT_LOSS") return delta < 0 ? "good" : "bad";
  if (goal === "MUSCLE_GAIN") return delta > 0 ? "good" : delta < 0 ? "bad" : null;
  return "neutral";
}

// -----------------------------------------------------------------------------
// Adapter: backend → frontend
// -----------------------------------------------------------------------------

const BACKEND_TO_FRONTEND_ZONE: Record<BackendBodyZone, keyof FrontendComposition["freshness"]> = {
  neck: "neck",
  shoulderLeft: "shoulderL",
  shoulderRight: "shoulderR",
  chest: "chest",
  bicepLeft: "bicepL",
  bicepRight: "bicepR",
  forearmLeft: "forearmL",
  forearmRight: "forearmR",
  abdomen: "abdomen",
  waist: "waist",
  hip: "hip",
  glute: "gluteL",
  quadLeft: "quadL",
  quadRight: "quadR",
  hamstringLeft: "hamstringL",
  hamstringRight: "hamstringR",
  calfLeft: "calfL",
  calfRight: "calfR",
};

function adaptToFrontend(b: BackendDetail): FrontendDetail {
  const freshness = {} as FrontendComposition["freshness"];
  const allFrontKeys: Array<keyof FrontendComposition["freshness"]> = [
    "neck", "shoulderL", "shoulderR", "chest",
    "bicepL", "bicepR", "forearmL", "forearmR",
    "abdomen", "waist", "hip", "gluteL", "gluteR",
    "quadL", "quadR", "hamstringL", "hamstringR",
    "calfL", "calfR",
  ];
  for (const k of allFrontKeys) {
    freshness[k] = { lastMeasuredAt: null, daysSince: null };
  }
  for (const [bk, fr] of Object.entries(b.bodyComposition.freshness)) {
    const fk = BACKEND_TO_FRONTEND_ZONE[bk as BackendBodyZone];
    if (fk && fr) {
      freshness[fk] = {
        lastMeasuredAt: fr.lastMeasuredAt ? new Date(fr.lastMeasuredAt) : null,
        daysSince: fr.daysSince,
      };
    }
  }

  const weightHistory12w = b.metricsHistory
    .map((m) => (m.weightKg !== null ? Number(m.weightKg) : null))
    .filter((n): n is number => n !== null);
  const bodyFatHistory12w = b.metricsHistory
    .map((m) => (m.bodyFatPct !== null ? Number(m.bodyFatPct) : null))
    .filter((n): n is number => n !== null);
  const muscleMassHistory12w = b.metricsHistory
    .map((m) => (m.muscleMassKg !== null ? Number(m.muscleMassKg) : null))
    .filter((n): n is number => n !== null);

  const composition: FrontendComposition = {
    weightKg: b.bodyComposition.weightKg,
    bodyFatPct: b.bodyComposition.bodyFatPct,
    muscleMassKg: b.bodyComposition.muscleMassKg,
    visceralFat: b.bodyComposition.visceralFat,
    basalMetabolicRate: b.bodyComposition.basalMetabolicRate,
    bmi: b.bodyComposition.bmi
      ?? computeBmi(b.bodyComposition.weightKg, b.profile?.heightCm ?? null),
    circumferences: { ...b.bodyComposition.circumferences },
    freshness,
  };

  const activeRoutine: FrontendRoutine | null = b.activeRoutine
    ? {
        id: b.activeRoutine.id,
        name: b.activeRoutine.name,
        totalDays: b.activeRoutine.totalDays,
        currentDayIndex: b.activeRoutine.currentDayIndex,
        completionPct: b.activeRoutine.completionPct,
        startsOn: b.activeRoutine.startsOn ? new Date(b.activeRoutine.startsOn) : new Date(),
        endsOn: b.activeRoutine.endsOn ? new Date(b.activeRoutine.endsOn) : null,
      }
    : null;

  const recentSessions: FrontendSession[] = b.recentSessions.map((s) => ({
    id: s.id,
    date: new Date(s.date),
    durationSec: s.durationSec ?? 0,
    exerciseCount: s.exercisesCount,
    setCount: 0,
    prDetected: s.prDetected,
  }));

  return {
    user: {
      id: b.user.id,
      name: b.user.name,
      email: b.user.email,
      dateOfBirth: b.user.dateOfBirth ? new Date(b.user.dateOfBirth) : null,
      gender: b.user.gender as FrontendDetail["user"]["gender"],
      avatarUrl: b.user.avatarUrl,
      createdAt: new Date(b.user.createdAt),
    },
    profile: {
      parqStatus: b.profile?.parqStatus ?? "NOT_COMPLETED",
      goal: b.profile?.goal ?? null,
      locationCity: b.profile?.locationCity ?? null,
      weightKg: b.profile?.weightKg ?? null,
      heightCm: b.profile?.heightCm ?? null,
    },
    bodyComposition: composition,
    activeRoutine,
    recentSessions,
    stats: {
      daysSinceStart: b.stats.daysSinceStart,
      totalSessions: b.stats.totalSessions,
      currentStreak: b.stats.currentStreak,
      alertsCount: b.stats.alertsCount,
    },
    adherence7d: b.adherence7d,
    adherence30d: b.adherence30d,
    weightHistory12w,
    bodyFatHistory12w,
    muscleMassHistory12w,
  };
}

function buildBodyMapZones(bc: FrontendComposition): Record<BodyZone, ZoneData | null> {
  const c = bc.circumferences;
  const f = bc.freshness;

  function zone(value: number | null, freshKey: keyof typeof f): ZoneData | null {
    if (value === null) return null;
    const fr = f[freshKey];
    return {
      valueCm: value,
      deltaCm: 0,
      measuredAt: fr?.lastMeasuredAt ?? new Date(0),
    };
  }

  return {
    neck: zone(c.neckCm, "neck"),
    shoulderLeft: zone(c.shoulderLeftCm, "shoulderL"),
    shoulderRight: zone(c.shoulderRightCm, "shoulderR"),
    chest: zone(c.chestCm, "chest"),
    bicepLeft: zone(c.leftBicepCm, "bicepL"),
    bicepRight: zone(c.rightBicepCm, "bicepR"),
    forearmLeft: zone(c.leftForearmCm, "forearmL"),
    forearmRight: zone(c.rightForearmCm, "forearmR"),
    abdomen: zone(c.abdomenCm, "abdomen"),
    waist: zone(c.waistCm, "waist"),
    hip: zone(c.hipCm, "hip"),
    glute: zone(c.leftGluteCm ?? c.rightGluteCm, "gluteL"),
    quadLeft: zone(c.leftThighCm, "quadL"),
    quadRight: zone(c.rightThighCm, "quadR"),
    hamstringLeft: zone(c.leftHamstringCm, "hamstringL"),
    hamstringRight: zone(c.rightHamstringCm, "hamstringR"),
    calfLeft: zone(c.leftCalfCm, "calfL"),
    calfRight: zone(c.rightCalfCm, "calfR"),
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ClientProfilePageContent({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [backendDetail, setBackendDetail] = useState<BackendDetail | null>(null);

  useEffect(() => {
    getClientProfileDetail(clientId).then((result) => {
      if (result.ok) setBackendDetail(result.value);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6A1A]" aria-label="Cargando perfil" />
      </div>
    );
  }

  if (!backendDetail) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#71717A]">
        Cliente no encontrado.
      </div>
    );
  }

  const profile = adaptToFrontend(backendDetail);

  const ageYears = computeAge(profile.user.dateOfBirth);
  const gl = genderLabel(profile.user.gender);
  const bc = profile.bodyComposition;
  const bodyMapZones = buildBodyMapZones(bc);
  const hasNoMetrics = bc.weightKg === null && bc.bodyFatPct === null;

  const weightDelta = backendDetail.stats.weightDelta28d;
  const bodyFatDelta = backendDetail.stats.bodyFatDelta28d;

  const kpiCards: Array<{
    label: string;
    value: string;
    unit: string;
    delta?: string;
    deltaLabel?: string;
    sparklineData?: number[];
    goalAlignment: DeltaAlignment;
  }> = [
    {
      label: "Peso",
      value: fmt(bc.weightKg, 1),
      unit: bc.weightKg !== null ? "kg" : "",
      delta: fmtDelta(weightDelta, "kg"),
      deltaLabel: "vs hace 4 semanas",
      sparklineData: profile.weightHistory12w,
      goalAlignment: alignDelta(weightDelta, profile.profile.goal),
    },
    {
      label: "% Grasa",
      value: fmt(bc.bodyFatPct, 1),
      unit: bc.bodyFatPct !== null ? "%" : "",
      delta: fmtDelta(bodyFatDelta, "%"),
      deltaLabel: "vs hace 4 semanas",
      sparklineData: profile.bodyFatHistory12w,
      goalAlignment: alignDelta(bodyFatDelta, profile.profile.goal),
    },
    {
      label: "IMC",
      value: bc.bmi !== null ? fmt(bc.bmi, 1) : "—",
      unit: "",
      delta: bc.bmi !== null ? bmiLabel(bc.bmi) : undefined,
      goalAlignment: null,
    },
    {
      label: "Músculo",
      value: fmt(bc.muscleMassKg, 1),
      unit: bc.muscleMassKg !== null ? "kg" : "",
      sparklineData: profile.muscleMassHistory12w,
      goalAlignment: null,
    },
    {
      label: "Racha",
      value:
        profile.stats.currentStreak > 0
          ? profile.stats.currentStreak.toString()
          : "—",
      unit: profile.stats.currentStreak > 0 ? "días" : "",
      goalAlignment: profile.stats.currentStreak >= 3 ? "good" : null,
    },
  ];

  const routineHref = `/trainer/clientes/${clientId}/rutinas`;

  return (
    <div className="space-y-8 pb-10">
      {/* Breadcrumb sticky */}
      <nav
        aria-label="Navegación"
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#27272A] bg-[rgba(9,9,11,0.95)] px-4 backdrop-blur-md"
      >
        <Link
          href="/trainer/clientes"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[#A1A1AA] transition-colors hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
          aria-label="Volver al listado de clientes"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Clientes
        </Link>

        <Link
          href={`/trainer/clientes/${clientId}/ajustes`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
          aria-label="Más acciones para este cliente"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </Link>
      </nav>

      {/* 1. Hero */}
      <ClientHeroCard
        name={profile.user.name}
        email={profile.user.email}
        avatarUrl={profile.user.avatarUrl}
        ageYears={ageYears}
        genderLabel={gl}
        goalLabel={profile.profile.goal}
        daysSinceStart={profile.stats.daysSinceStart}
        parqStatus={profile.profile.parqStatus}
        hasActiveRoutine={profile.activeRoutine !== null}
        routineHref={routineHref}
        clientId={clientId}
      />

      <MeasurementSheetController clientId={clientId} />

      {/* Banner: sin mediciones */}
      {hasNoMetrics && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] px-5 py-4"
        >
          <p className="text-sm text-[#F59E0B]">
            Aún no tenés mediciones de {profile.user.name}. Tomá la primera ahora.
          </p>
          <Link
            href={`/trainer/clientes/${clientId}/metricas`}
            className="shrink-0 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#09090B] transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
          >
            + Nueva medición
          </Link>
        </div>
      )}

      {/* 2. KPI strip */}
      <section aria-label="Indicadores de estado actual">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpiCards.map((kpi, idx) => (
            <KpiHeroCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              deltaLabel={kpi.deltaLabel}
              sparklineData={kpi.sparklineData}
              goalAlignment={kpi.goalAlignment}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* Section divider */}
      <div
        aria-hidden="true"
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(63,63,70,0.6) 20%, rgba(63,63,70,0.6) 80%, transparent 100%)",
        }}
      />

      {/* 3. Composición corporal */}
      <section aria-label="Composición corporal">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,106,26,0.12)] border border-[rgba(255,106,26,0.2)]">
            <Dumbbell className="h-3.5 w-3.5 text-[#FF6A1A]" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
            Composición corporal
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-[rgba(63,63,70,0.7)] bg-gradient-to-b from-[#1A1A1D] to-[#18181B] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <BodyMap zones={bodyMapZones} className="w-full" />
          </div>
          <div className="rounded-2xl border border-[rgba(63,63,70,0.7)] bg-gradient-to-b from-[#1A1A1D] to-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.1em] text-[#71717A]">
              Circunferencias
            </h3>
            <CircumferencesTable data={bc} />
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div
        aria-hidden="true"
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(63,63,70,0.6) 20%, rgba(63,63,70,0.6) 80%, transparent 100%)",
        }}
      />

      {/* 4. Tabs de contexto */}
      <section aria-label="Contexto histórico">
        <ClientProfileTabsClient
          clientId={clientId}
          activeRoutine={profile.activeRoutine}
          recentSessions={profile.recentSessions}
          weightHistory={profile.weightHistory12w}
          bodyFatHistory={profile.bodyFatHistory12w}
          muscleMassHistory={profile.muscleMassHistory12w}
          initialNotes={backendDetail.trainerNotes ?? ""}
        />
      </section>
    </div>
  );
}
