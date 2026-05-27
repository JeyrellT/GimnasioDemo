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
  CheckCircle2,
  Link2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { SupersetBadge } from "@/components/shared/superset-badge";
import {
  getSupersetColor,
  getSupersetLetter,
} from "@/lib/supersets";
import { useAuth } from "@/components/providers/auth-provider";
import { getMyAssignedRoutines } from "@/app/actions/client-portal";
import { needsMedicalPrompt } from "@/app/actions/medical-conditions";
import { needsParqPrompt } from "@/app/actions/clients";
import { cn } from "@/lib/utils";
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
  /** Required so the player can call startSession(assignedRoutineId, dayIndex)
      to persist the workout when the client taps Comenzar and complete it
      when the routine ends. */
  assignedRoutineId: string;
  dayIndex: number;
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

  // `parqResolvedInSession` se activa cuando el cliente envía exitosamente el
  // PAR-Q en esta carga de página. Garantiza el contrato "una vez mandado,
  // nunca más" incluso si la query trae un valor stale por alguna razón
  // (refetch racing, error transitorio, etc). El estado se resetea solo en
  // un reload — para entonces parqStatus ya es GREEN/REVIEW/RED y la query
  // devuelve shouldShow=false naturalmente.
  const [parqResolvedInSession, setParqResolvedInSession] = useState(false);
  const [showParqPrompt, setShowParqPrompt] = useState(false);
  useEffect(() => {
    if (parqQuery.data?.shouldShow && !parqResolvedInSession) {
      setShowParqPrompt(true);
    }
  }, [parqQuery.data, parqResolvedInSession]);

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
              setParqResolvedInSession(true);
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
    assignedRoutineId: string,
    snapshot: RoutineSnapshot,
    day: RoutineSnapshotDay,
    startIndex: number,
  ) {
    setPlayer({
      assignedRoutineId,
      dayIndex: day.dayIndex,
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
            setParqResolvedInSession(true);
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
            const completedDays = new Set(assigned.completedDayIndexes ?? []);

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
                        {assigned.completedSessionCount > 0 && (
                          <span className="text-[#22C55E]">
                            {assigned.completedSessionCount} hechas
                          </span>
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
                      const dayCompleted = completedDays.has(day.dayIndex);

                      return (
                        <div
                          key={dayKey}
                          className={cn(
                            "overflow-hidden rounded-lg border bg-[#09090B]/50",
                            dayCompleted
                              ? "border-[#22C55E]/35"
                              : "border-[#3F3F46]/60",
                          )}
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
                                {dayCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                                ) : (
                                  day.dayIndex + 1
                                )}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-[#FAFAFA]">
                                    {day.name}
                                  </p>
                                  {dayCompleted && (
                                    <span className="rounded-full bg-[#22C55E]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#22C55E]">
                                      Hecha
                                    </span>
                                  )}
                                </div>
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
                              {(() => {
                                // Track repeated exercise IDs within the day so
                                // we can label 2nd / 3rd appearances clearly.
                                // This is legitimate in hypertrophy (back-off
                                // sets, eccentric-only round, drop sets) but
                                // looks like a "duplicate bug" without a label.
                                const seenCount = new Map<string, number>();
                                const totalCount = new Map<string, number>();
                                for (const e of day.exercises) {
                                  totalCount.set(
                                    e.exerciseId,
                                    (totalCount.get(e.exerciseId) ?? 0) + 1,
                                  );
                                }

                                // Helper para renderizar un row de ejercicio.
                                // Cuando `insideSuperset` es true, agregamos
                                // padding extra a la izquierda + SS badge para
                                // dejar claro que pertenece al grupo.
                                const renderExerciseRow = (
                                  ex: RoutineSnapshotExercise,
                                  idx: number,
                                  insideSuperset: boolean,
                                ) => {
                                  const occurrence =
                                    (seenCount.get(ex.exerciseId) ?? 0) + 1;
                                  seenCount.set(ex.exerciseId, occurrence);
                                  const total =
                                    totalCount.get(ex.exerciseId) ?? 1;
                                  const isRepeat = total > 1;
                                  return (
                                    <button
                                      type="button"
                                      key={`${ex.exerciseId}_${idx}`}
                                      onClick={() =>
                                        openPlayer(
                                          assigned.id,
                                          snapshot,
                                          day,
                                          idx,
                                        )
                                      }
                                      aria-label={`Reproducir ${ex.nameEs}${isRepeat ? ` (vuelta ${occurrence} de ${total})` : ""}`}
                                      className={cn(
                                        "group flex w-full items-center gap-3 py-2.5 text-left hover:bg-[#18181B] transition-colors",
                                        insideSuperset ? "px-3 pl-5" : "px-3",
                                      )}
                                    >
                                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#27272A]">
                                        <ExerciseThumbnail
                                          thumbnailUrl={ex.thumbnailUrl}
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
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                          <p className="text-sm font-medium text-[#E4E4E7]">
                                            {ex.nameEs}
                                          </p>
                                          {isRepeat && (
                                            <span className="inline-flex items-center rounded-full bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                              Vuelta {occurrence}/{total}
                                            </span>
                                          )}
                                          {insideSuperset && (
                                            <SupersetBadge
                                              group={ex.supersetGroup}
                                              size="xs"
                                            />
                                          )}
                                        </div>
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
                                  );
                                };

                                // Computo de segmentos: ejercicios consecutivos
                                // con el mismo supersetGroup forman un cluster.
                                type Segment =
                                  | { kind: "single"; exercise: RoutineSnapshotExercise; idx: number }
                                  | {
                                      kind: "group";
                                      group: number;
                                      exercises: RoutineSnapshotExercise[];
                                      startIdx: number;
                                    };
                                const segments: Segment[] = [];
                                {
                                  let i = 0;
                                  while (i < day.exercises.length) {
                                    const ex = day.exercises[i];
                                    if (!ex) break;
                                    if (
                                      ex.supersetGroup === null ||
                                      ex.supersetGroup === undefined
                                    ) {
                                      segments.push({
                                        kind: "single",
                                        exercise: ex,
                                        idx: i,
                                      });
                                      i += 1;
                                      continue;
                                    }
                                    const group = ex.supersetGroup;
                                    const startIdx = i;
                                    while (
                                      i < day.exercises.length &&
                                      day.exercises[i]?.supersetGroup === group
                                    ) {
                                      i += 1;
                                    }
                                    segments.push({
                                      kind: "group",
                                      group,
                                      exercises: day.exercises.slice(
                                        startIdx,
                                        i,
                                      ),
                                      startIdx,
                                    });
                                  }
                                }

                                return segments.map((seg) => {
                                  if (seg.kind === "single") {
                                    return renderExerciseRow(
                                      seg.exercise,
                                      seg.idx,
                                      false,
                                    );
                                  }
                                  const color = getSupersetColor(seg.group);
                                  const letter = getSupersetLetter(seg.group);
                                  const count = seg.exercises.length;
                                  return (
                                    <div
                                      key={`ss-${day.dayIndex}-${seg.group}`}
                                      className="overflow-hidden"
                                      style={{
                                        borderLeft: `3px solid ${color}`,
                                        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
                                      }}
                                    >
                                      {/* Group header strip */}
                                      <div
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                                        style={{ color }}
                                      >
                                        <Link2
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        <span>Superserie {letter}</span>
                                        <span className="text-[#71717A] font-medium normal-case tracking-normal">
                                          · {count} ejercicios en bloque
                                        </span>
                                      </div>
                                      <div className="divide-y divide-[#3F3F46]/30">
                                        {seg.exercises.map((ex, i) =>
                                          renderExerciseRow(
                                            ex,
                                            seg.startIdx + i,
                                            true,
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
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
          assignedRoutineId={player.assignedRoutineId}
          dayIndex={player.dayIndex}
          routineName={player.routineName}
          dayName={player.dayName}
          exercises={player.exercises}
          startIndex={player.startIndex}
          onCompleted={() => {
            // Refresh assigned routines so any updated state shows up.
            void queryClient.invalidateQueries({
              queryKey: ["my-assigned-routines"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["client-active-routine"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["client-sessions-history"],
            });
          }}
        />
      )}
    </>
  );
}
