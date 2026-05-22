"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  ClipboardList,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Play,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { useAuth } from "@/components/providers/auth-provider";
import { getMyAssignedRoutines } from "@/app/actions/client-portal";
import { needsMedicalPrompt } from "@/app/actions/medical-conditions";
import { needsParqPrompt } from "@/app/actions/clients";
import { MedicalConditionsPrompt } from "@/components/forms/medical-conditions-prompt";
import { ParqClientPrompt } from "@/components/forms/parq-client-prompt";
import { RoutinePlayerDialog } from "./_components/routine-player-dialog";
import type { MyAssignedRoutine } from "@/server/actions/client-portal.actions";
import type {
  RoutineSnapshot,
  RoutineSnapshotDay,
  RoutineSnapshotExercise,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoutineCard {
  assigned: MyAssignedRoutine;
  snapshot: RoutineSnapshot | null;
}

interface PlayerState {
  routineName: string;
  dayName: string;
  exercises: RoutineSnapshotExercise[];
  startIndex: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSnapshot(json: unknown): RoutineSnapshot | null {
  if (!json || typeof json !== "object") return null;
  return json as RoutineSnapshot;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientRutinasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);

  // Live-refresh: refetch on window focus, every 30s while the tab is open,
  // and consider results immediately stale so navigating back to the page
  // shows the trainer's latest assignment without a manual reload.
  const routinesQuery = useQuery({
    queryKey: ["my-assigned-routines", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const result = await getMyAssignedRoutines();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const medicalQuery = useQuery({
    queryKey: ["medical-prompt-needed", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const result = await needsMedicalPrompt();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [showMedicalPrompt, setShowMedicalPrompt] = useState(false);
  useEffect(() => {
    if (medicalQuery.data?.shouldShow) {
      setShowMedicalPrompt(true);
    }
  }, [medicalQuery.data]);

  // PAR-Q gate: show modal the moment the client lands here while parqStatus
  // is NOT_COMPLETED. Dismissible (so they can still browse) but reopens on
  // the next visit until they actually submit it.
  const parqQuery = useQuery({
    queryKey: ["parq-prompt-needed", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const result = await needsParqPrompt();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [showParqPrompt, setShowParqPrompt] = useState(false);
  useEffect(() => {
    if (parqQuery.data?.shouldShow) {
      setShowParqPrompt(true);
    }
  }, [parqQuery.data]);

  const cards = useMemo<RoutineCard[]>(() => {
    const loaded: RoutineCard[] = (routinesQuery.data ?? []).map((ar) => ({
      assigned: ar,
      snapshot: parseSnapshot(ar.snapshotJson),
    }));
    return loaded.sort((a, b) => {
      if (a.assigned.status === "ACTIVE" && b.assigned.status !== "ACTIVE")
        return -1;
      if (b.assigned.status === "ACTIVE" && a.assigned.status !== "ACTIVE")
        return 1;
      return (
        new Date(b.assigned.assignedAt).getTime() -
        new Date(a.assigned.assignedAt).getTime()
      );
    });
  }, [routinesQuery.data]);

  // Auto-expand the active routine the first time it loads. The ref guards
  // against re-expanding after the user manually collapses it.
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (autoExpandedRef.current) return;
    const active = cards.find((c) => c.assigned.status === "ACTIVE");
    if (active) {
      setExpandedRoutine(active.assigned.id);
      autoExpandedRef.current = true;
    }
  }, [cards]);

  const loading = routinesQuery.isLoading && !routinesQuery.data;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#71717A]" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <>
        <MedicalConditionsPrompt
          open={showMedicalPrompt}
          onClose={() => setShowMedicalPrompt(false)}
        />
        {user?.id && (
          <ParqClientPrompt
            open={showParqPrompt}
            clientUserId={user.id}
            onDismiss={() => setShowParqPrompt(false)}
            onCompleted={() => {
              setShowParqPrompt(false);
              void queryClient.invalidateQueries({
                queryKey: ["parq-prompt-needed", user.id ?? null],
              });
            }}
          />
        )}
        <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
          <ClipboardList className="h-12 w-12 text-[#52525B] mx-auto" />
          <h2 className="text-xl font-bold text-[#FAFAFA]">
            Sin rutinas asignadas
          </h2>
          <p className="text-sm text-[#A1A1AA]">
            Tu entrenador aun no te ha asignado una rutina.
          </p>
        </div>
      </>
    );
  }

  const activeCount = cards.filter((c) => c.assigned.status === "ACTIVE").length;

  function openPlayer(
    snapshot: RoutineSnapshot,
    day: RoutineSnapshotDay,
    startIndex: number,
  ) {
    setPlayer({
      routineName: snapshot.templateName,
      dayName: day.name,
      exercises: day.exercises,
      startIndex,
    });
  }

  return (
    <>
      <MedicalConditionsPrompt
        open={showMedicalPrompt}
        onClose={() => setShowMedicalPrompt(false)}
      />
      {user?.id && (
        <ParqClientPrompt
          open={showParqPrompt}
          clientUserId={user.id}
          onDismiss={() => setShowParqPrompt(false)}
          onCompleted={() => {
            setShowParqPrompt(false);
            void queryClient.invalidateQueries({
              queryKey: ["parq-prompt-needed", user.id ?? null],
            });
          }}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Mis rutinas</h1>
          <p className="text-sm text-[#71717A] mt-1">
            {activeCount} activa{activeCount !== 1 ? "s" : ""} de{" "}
            {cards.length} total
          </p>
        </div>

        {/* Routine cards */}
        <div className="space-y-4">
          {cards.map((card) => {
            const { assigned, snapshot } = card;
            const isActive = assigned.status === "ACTIVE";
            const isExpanded = expandedRoutine === assigned.id;
            const days: RoutineSnapshotDay[] = snapshot?.days ?? [];

            return (
              <div
                key={assigned.id}
                className={[
                  "rounded-xl border overflow-hidden transition-colors",
                  isActive
                    ? "border-brand-primary/40 bg-[#18181B]"
                    : "border-[#3F3F46] bg-[#18181B]/60 opacity-70",
                ].join(" ")}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedRoutine(isExpanded ? null : assigned.id)
                  }
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isActive ? "bg-brand-primary/15" : "bg-[#27272A]",
                      ].join(" ")}
                    >
                      <Dumbbell
                        className={[
                          "h-5 w-5",
                          isActive ? "text-brand-primary" : "text-[#52525B]",
                        ].join(" ")}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#FAFAFA]">
                          {snapshot?.templateName ?? "Sin nombre"}
                        </p>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E] uppercase tracking-wide">
                            Activa
                          </span>
                        )}
                        {!isActive && (
                          <span className="shrink-0 rounded-full bg-[#27272A] px-2 py-0.5 text-[10px] font-semibold text-[#71717A] uppercase tracking-wide">
                            {assigned.status === "COMPLETED"
                              ? "Completada"
                              : "Archivada"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-[#71717A]">
                        {snapshot && (
                          <>
                            <span>{snapshot.splitDays} dias/sem</span>
                            <span>{snapshot.durationWeeks} semanas</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(assigned.startsOn).toLocaleDateString(
                            "es-CR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[#71717A]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#71717A]" />
                  )}
                </button>

                {/* Expanded content: days */}
                {isExpanded && days.length > 0 && (
                  <div className="border-t border-[#3F3F46]/60 px-4 pb-4 pt-3 space-y-2">
                    {days.map((day: RoutineSnapshotDay) => {
                      const dayKey = `${assigned.id}-${day.dayIndex}`;
                      const dayOpen = expandedDay === dayKey;

                      return (
                        <div
                          key={dayKey}
                          className="rounded-lg border border-[#3F3F46]/60 bg-[#09090B]/50 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDay(dayOpen ? null : dayKey)
                            }
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                                {day.dayIndex + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#FAFAFA]">
                                  {day.name}
                                </p>
                                <p className="text-[11px] text-[#52525B]">
                                  {day.exercises.length} ejercicios
                                </p>
                              </div>
                            </div>
                            {dayOpen ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[#52525B]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[#52525B]" />
                            )}
                          </button>

                          {dayOpen && snapshot && (
                            <div className="border-t border-[#3F3F46]/40 divide-y divide-[#3F3F46]/30">
                              {day.exercises.map(
                                (
                                  ex: RoutineSnapshotExercise,
                                  idx: number,
                                ) => (
                                  <button
                                    type="button"
                                    key={ex.exerciseId}
                                    onClick={() => openPlayer(snapshot, day, idx)}
                                    aria-label={`Reproducir ${ex.nameEs}`}
                                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#18181B] transition-colors"
                                  >
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#27272A]">
                                      <ExerciseThumbnail
                                        thumbnailUrl={ex.thumbnailUrl}
                                        gifUrl={ex.gifUrl}
                                        slug={ex.slug}
                                        nameEn={ex.nameEn}
                                        alt={ex.nameEs}
                                        iconSize="sm"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play
                                          className="h-4 w-4 fill-white text-white"
                                          aria-hidden="true"
                                        />
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-[#E4E4E7]">
                                        {ex.nameEs}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#71717A]">
                                        <span>{ex.targetSets} series</span>
                                        <span>
                                          {ex.targetRepsMin === ex.targetRepsMax
                                            ? `${ex.targetRepsMin} reps`
                                            : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`}
                                        </span>
                                        {ex.targetRpe && (
                                          <span>RPE {ex.targetRpe}</span>
                                        )}
                                        <span className="inline-flex items-center gap-0.5">
                                          <Clock className="h-3 w-3" />
                                          {ex.restSeconds}s
                                        </span>
                                      </div>
                                      {ex.notes && (
                                        <p className="mt-1 text-xs text-[#52525B] italic">
                                          {ex.notes}
                                        </p>
                                      )}
                                    </div>
                                    <Play
                                      className="h-4 w-4 shrink-0 text-[#52525B] group-hover:text-brand-primary transition-colors"
                                      aria-hidden="true"
                                    />
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {player && (
        <RoutinePlayerDialog
          open={!!player}
          onOpenChange={(v) => {
            if (!v) setPlayer(null);
          }}
          routineName={player.routineName}
          dayName={player.dayName}
          exercises={player.exercises}
          startIndex={player.startIndex}
        />
      )}
    </>
  );
}
