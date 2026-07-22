"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  Clock,
  Pencil,
  Check,
  X,
  RotateCcw,
  Timer,
  Settings2,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import {
  setMyGlobalRestOffset,
  setMyExerciseRestOverride,
  clearMyExerciseRestOverride,
} from "@/app/actions/rest-preferences";
import {
  applyClientRestPrefs,
  clampGlobalOffset,
  formatRestLabel,
  REST_OVERRIDE_MAX,
  type ClientRestPrefs,
} from "@/lib/rest-preferences";

export interface UniqueExercise {
  exerciseId: string;
  nameEs: string;
  nameEn: string | null;
  slug: string | null;
  thumbnailUrl: string | null;
  baseRestSeconds: number;
}

export interface RoutineGroup {
  assignedRoutineId: string;
  routineName: string;
  exercises: UniqueExercise[];
}

interface Props {
  initialPrefs: ClientRestPrefs;
  routines: RoutineGroup[];
}

const GLOBAL_OFFSET_PRESETS = [-30, -15, 0, 15, 30, 60, 90] as const;
const OVERRIDE_PRESETS = [30, 45, 60, 90, 120, 180] as const;

function formatOffsetLabel(seconds: number): string {
  if (seconds === 0) return "Sin ajuste";
  const sign = seconds > 0 ? "+" : "−";
  const abs = Math.abs(seconds);
  return `${sign}${abs}s`;
}

export function AjustesClient({ initialPrefs, routines }: Props) {
  const [prefs, setPrefs] = useState<ClientRestPrefs>(initialPrefs);
  const [pending, startTransition] = useTransition();
  const hasRoutines = routines.length > 0;

  // Acordeón por rutina: todo colapsado al entrar para que el cliente vea
  // primero la lista de rutinas y elija dónde editar.
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleRoutine = (id: string) => {
    setExpandedRoutines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Global offset ─────────────────────────────────────────────────────────
  const handleSetOffset = (seconds: number) => {
    const clamped = clampGlobalOffset(seconds);
    // Optimistic update
    setPrefs((p) => ({ ...p, globalOffsetSec: clamped }));

    startTransition(async () => {
      const res = await setMyGlobalRestOffset(clamped);
      if (res.ok) {
        setPrefs(res.value);
        toast.success("Ajuste global guardado.");
      } else {
        toast.error(res.error.message ?? "No se pudo guardar.");
        setPrefs(initialPrefs);
      }
    });
  };

  // ── Per-exercise overrides ────────────────────────────────────────────────
  const handleSetExerciseOverride = (exerciseId: string, seconds: number) => {
    const next = { ...prefs.exerciseOverrides, [exerciseId]: seconds };
    setPrefs((p) => ({ ...p, exerciseOverrides: next }));

    startTransition(async () => {
      const res = await setMyExerciseRestOverride({ exerciseId, restSeconds: seconds });
      if (res.ok) {
        setPrefs(res.value);
        toast.success("Descanso del ejercicio guardado.");
      } else {
        toast.error(res.error.message ?? "No se pudo guardar.");
      }
    });
  };

  const handleClearExerciseOverride = (exerciseId: string) => {
    const next = { ...prefs.exerciseOverrides };
    delete next[exerciseId];
    setPrefs((p) => ({ ...p, exerciseOverrides: next }));

    startTransition(async () => {
      const res = await clearMyExerciseRestOverride({ exerciseId });
      if (res.ok) {
        setPrefs(res.value);
        toast.success("Override removido. Vuelve al valor del coach.");
      } else {
        toast.error(res.error.message ?? "No se pudo guardar.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/15">
            <Settings2 className="h-4 w-4 text-brand-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#FAFAFA]">Ajustes</h1>
            <p className="text-xs text-[#A1A1AA]">
              Personalizá tus descansos sin alterar la rutina del coach.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section: Global offset ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-4 sm:p-5 space-y-4">
        <header className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/15">
            <Clock className="h-4 w-4 text-brand-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">
              Ajuste global de descansos
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Se aplica a todos los descansos de tus rutinas. Útil si en general
              necesitás un poco más de recuperación entre series.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {GLOBAL_OFFSET_PRESETS.map((sec) => {
            const active = prefs.globalOffsetSec === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => handleSetOffset(sec)}
                disabled={pending}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium tabular transition-colors min-h-[36px] disabled:opacity-50",
                  active
                    ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/30"
                    : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]",
                ].join(" ")}
                aria-pressed={active}
              >
                {formatOffsetLabel(sec)}
              </button>
            );
          })}
        </div>

        {/* Preview row */}
        <div className="rounded-lg bg-[#09090B] border border-[#27272A] px-3 py-2 flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-[#71717A]" aria-hidden="true" />
          <span className="text-xs text-[#A1A1AA]">
            Ejemplo: un descanso de{" "}
            <span className="tabular text-[#FAFAFA]">60s</span> ahora dura{" "}
            <span className="tabular font-semibold text-brand-primary">
              {formatRestLabel(applyClientRestPrefs(60, "__example__", prefs))}
            </span>
          </span>
        </div>
      </section>

      {/* ── Section: Per-exercise overrides ─────────────────────────────── */}
      {/*
        Sólo se renderiza cuando el cliente tiene al menos una rutina ACTIVA
        con ejercicios. Sin rutina asignada, la sección entera desaparece — no
        tiene sentido editar descansos de ejercicios que no vas a hacer.
      */}
      {hasRoutines && (
        <section className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-4 sm:p-5 space-y-4">
          <header className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/15">
              <Pencil className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">
                Descanso por ejercicio
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Si un ejercicio específico te queda corto o largo, ajustalo acá.
                Este valor reemplaza el global para ese ejercicio.
              </p>
            </div>
          </header>

          <div className="space-y-3">
            {routines.map((routine) => {
              const isOpen = expandedRoutines.has(routine.assignedRoutineId);
              const panelId = `routine-panel-${routine.assignedRoutineId}`;
              return (
                <div
                  key={routine.assignedRoutineId}
                  className="rounded-xl border border-[#27272A] bg-[#0F0F11] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleRoutine(routine.assignedRoutineId)}
                    className="w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-[#18181B] transition-colors min-h-[48px]"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <ClipboardList
                      className="h-4 w-4 shrink-0 text-brand-primary"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-primary truncate">
                        {routine.routineName}
                      </h3>
                      <p className="text-[10px] text-[#71717A] tabular mt-0.5">
                        {routine.exercises.length}{" "}
                        {routine.exercises.length === 1
                          ? "ejercicio"
                          : "ejercicios"}
                      </p>
                    </div>
                    <ChevronDown
                      className={[
                        "h-4 w-4 shrink-0 text-[#71717A] transition-transform",
                        isOpen ? "rotate-180" : "",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <ul
                      id={panelId}
                      className="border-t border-[#27272A] p-2 space-y-2 bg-[#09090B]"
                    >
                      {routine.exercises.map((ex) => (
                        <ExerciseRow
                          key={`${routine.assignedRoutineId}:${ex.exerciseId}`}
                          exercise={ex}
                          override={
                            prefs.exerciseOverrides[ex.exerciseId] ?? null
                          }
                          onSet={(seconds) =>
                            handleSetExerciseOverride(ex.exerciseId, seconds)
                          }
                          onClear={() =>
                            handleClearExerciseOverride(ex.exerciseId)
                          }
                          disabled={pending}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-exercise row
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  override,
  onSet,
  onClear,
  disabled,
}: {
  exercise: UniqueExercise;
  override: number | null;
  onSet: (seconds: number) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingManual, setEditingManual] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingManual) {
      setDraft(String(override ?? exercise.baseRestSeconds));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editingManual, override, exercise.baseRestSeconds]);

  const effective = override ?? exercise.baseRestSeconds;
  const hasOverride = override !== null;

  const commit = () => {
    const next = Math.max(0, Math.min(REST_OVERRIDE_MAX, Number(draft) || 0));
    onSet(next);
    setEditingManual(false);
  };

  return (
    <li className="rounded-xl border border-[#27272A] bg-[#0F0F11] overflow-hidden">
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#18181B] transition-colors min-h-[56px]"
        aria-expanded={expanded}
      >
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#27272A]">
          <ExerciseThumbnail
            thumbnailUrl={exercise.thumbnailUrl}
            alt={exercise.nameEs}
            iconSize="sm"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#FAFAFA] truncate">
            {exercise.nameEs}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#71717A]">
            <Timer className="h-3 w-3" aria-hidden="true" />
            <span className="tabular">
              {hasOverride ? (
                <>
                  Tu ajuste:{" "}
                  <span className="font-semibold text-brand-primary">
                    {formatRestLabel(effective)}
                  </span>
                  {" · "}
                  <span className="line-through text-[#52525B]">
                    {formatRestLabel(exercise.baseRestSeconds)}
                  </span>
                </>
              ) : (
                <>
                  Coach: {formatRestLabel(exercise.baseRestSeconds)}
                </>
              )}
            </span>
          </div>
        </div>

        {hasOverride && (
          <span className="rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-primary">
            Personalizado
          </span>
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-[#27272A] px-3 py-3 space-y-3 bg-[#09090B]">
          {editingManual ? (
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`rest-input-${exercise.exerciseId}`}
                className="sr-only"
              >
                Descanso en segundos
              </Label>
              <Input
                ref={inputRef}
                id={`rest-input-${exercise.exerciseId}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={REST_OVERRIDE_MAX}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingManual(false);
                  }
                }}
                className="h-9 w-28 text-sm px-2 bg-[#09090B] border-[#3F3F46] focus:border-brand-primary"
              />
              <span className="text-xs text-[#71717A]">segundos</span>
              <button
                type="button"
                onClick={commit}
                disabled={disabled}
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-md bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
                aria-label="Guardar"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setEditingManual(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#3F3F46] text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {OVERRIDE_PRESETS.map((sec) => {
                  const active = override === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onSet(sec)}
                      disabled={disabled}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-medium tabular transition-colors min-h-[36px] disabled:opacity-50",
                        active
                          ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/30"
                          : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      {formatRestLabel(sec)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditingManual(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#3F3F46] px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-brand-primary hover:border-brand-primary transition-colors min-h-[36px]"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Editar manualmente
                </button>

                {hasOverride && (
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#3F3F46] px-2.5 py-1.5 text-xs text-[#71717A] hover:text-[#FAFAFA] hover:border-[#52525B] transition-colors min-h-[36px] disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Volver al del coach
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
