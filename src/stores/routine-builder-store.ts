"use client";

import { create } from "zustand";
import type { RoutineWithDays } from "@/types/domain";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftExercise {
  id: string; // local UUID for dnd-kit key
  routineExerciseId?: string; // set after save
  exerciseId: string;
  nameEs: string;
  nameEn?: string | null;
  slug?: string | null;
  thumbnailUrl?: string | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number;
  tempo: string | null;
  supersetGroup: number | null;
  notes: string | null;
  /** Per-routine video override (YouTube / Vimeo / Google Drive). */
  mediaUrl: string | null;
}

export interface DraftDay {
  id: string; // local UUID for dnd-kit key
  routineDayId?: string; // set after save
  dayIndex: number;
  name: string;
  exercises: DraftExercise[];
}

interface RoutineBuilderState {
  routineId: string | null;
  name: string;
  goal: string;
  splitDays: number;
  durationWeeks: number;
  days: DraftDay[];
  isDirty: boolean;

  // Actions
  initFromExisting: (routine: RoutineWithDays) => void;
  initEmpty: () => void;
  setMeta: (meta: Partial<Pick<RoutineBuilderState, "name" | "goal" | "splitDays" | "durationWeeks">>) => void;
  addDay: (name: string, routineDayId?: string) => void;
  removeDay: (dayId: string) => void;
  updateDayName: (dayId: string, name: string) => void;
  reorderDays: (orderedDayIds: string[]) => void;
  addExerciseToDay: (dayId: string, exercise: DraftExercise) => void;
  removeExerciseFromDay: (dayId: string, exerciseLocalId: string) => void;
  updateExercise: (dayId: string, exerciseLocalId: string, patch: Partial<DraftExercise>) => void;
  reorderExercisesInDay: (dayId: string, orderedIds: string[]) => void;
  /**
   * Agrupa `sourceExId` con `targetExId` en una superserie/circuito.
   *
   * - Si target ya tiene supersetGroup → source se une al mismo grupo.
   * - Si ninguno está agrupado → ambos toman el siguiente número libre (1–10).
   * - Source se mueve al índice inmediatamente después de target.
   * - Si el grupo previo de source queda con un único miembro, ese también se
   *   desagrupa (no se permiten grupos huérfanos de 1).
   *
   * Devuelve la nueva lista de ejercicios del día y el grupo asignado, o
   * `null` si no se pudo agrupar (mismo ejercicio, día inexistente, o tope
   * de 10 grupos alcanzado).
   */
  groupExercises: (
    dayId: string,
    sourceExId: string,
    targetExId: string,
  ) => { exercises: DraftExercise[]; group: number } | null;
  /**
   * Quita `exerciseLocalId` de su superserie. Si el grupo queda con un único
   * miembro, ese también se desagrupa. Devuelve la lista actualizada o `null`
   * si el ejercicio ya estaba sin grupo.
   */
  ungroupExercise: (
    dayId: string,
    exerciseLocalId: string,
  ) => { exercises: DraftExercise[] } | null;
  markSaved: () => void;
  reset: () => void;
}

function newLocalId(): string {
  return `local-${crypto.randomUUID()}`;
}

export const useRoutineBuilderStore = create<RoutineBuilderState>()((set) => ({
  routineId: null,
  name: "",
  goal: "HYPERTROPHY",
  splitDays: 4,
  durationWeeks: 8,
  days: [],
  isDirty: false,

  initFromExisting: (routine) => {
    set({
      routineId: routine.id,
      name: routine.name,
      goal: routine.goal,
      splitDays: routine.splitDays,
      durationWeeks: routine.durationWeeks,
      days: routine.days.map((d) => ({
        id: newLocalId(),
        routineDayId: d.id,
        dayIndex: d.dayIndex,
        name: d.name,
        exercises: d.exercises.map((e) => ({
          id: newLocalId(),
          routineExerciseId: e.id,
          exerciseId: e.exerciseId,
          nameEs: e.exercise.nameEs,
          nameEn: e.exercise.nameEn || null,
          slug: e.exercise.slug ?? null,
          thumbnailUrl: e.exercise.thumbnailUrl ?? null,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          targetRpe: e.targetRpe != null ? Number(e.targetRpe) : null,
          restSeconds: e.restSeconds,
          tempo: e.tempo ?? null,
          supersetGroup: e.supersetGroup ?? null,
          notes: e.notes ?? null,
          mediaUrl: (e as { mediaUrl?: string | null }).mediaUrl ?? null,
        })),
      })),
      isDirty: false,
    });
  },

  initEmpty: () => {
    set({
      routineId: null,
      name: "",
      goal: "HYPERTROPHY",
      splitDays: 4,
      durationWeeks: 8,
      days: [],
      isDirty: false,
    });
  },

  setMeta: (meta) => {
    set((state) => ({ ...state, ...meta, isDirty: true }));
  },

  addDay: (name, routineDayId) => {
    set((state) => ({
      days: [
        ...state.days,
        {
          id: newLocalId(),
          routineDayId, // server-side ID if persisted, undefined otherwise
          dayIndex: state.days.length,
          name,
          exercises: [],
        },
      ],
      isDirty: true,
    }));
  },

  removeDay: (dayId) => {
    set((state) => ({
      days: state.days
        .filter((d) => d.id !== dayId)
        .map((d, i) => ({ ...d, dayIndex: i })),
      isDirty: true,
    }));
  },

  updateDayName: (dayId, name) => {
    set((state) => ({
      days: state.days.map((d) => (d.id === dayId ? { ...d, name } : d)),
      isDirty: true,
    }));
  },

  reorderDays: (orderedDayIds) => {
    set((state) => {
      const dayMap = new Map(state.days.map((d) => [d.id, d]));
      return {
        days: orderedDayIds
          .map((id, i) => {
            const d = dayMap.get(id);
            return d ? { ...d, dayIndex: i } : null;
          })
          .filter((d): d is DraftDay => d !== null),
        isDirty: true,
      };
    });
  },

  addExerciseToDay: (dayId, exercise) => {
    set((state) => ({
      days: state.days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, exercise] }
          : d,
      ),
      isDirty: true,
    }));
  },

  removeExerciseFromDay: (dayId, exerciseLocalId) => {
    set((state) => ({
      days: state.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.filter((e) => e.id !== exerciseLocalId),
            }
          : d,
      ),
      isDirty: true,
    }));
  },

  updateExercise: (dayId, exerciseLocalId, patch) => {
    set((state) => ({
      days: state.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === exerciseLocalId ? { ...e, ...patch } : e,
              ),
            }
          : d,
      ),
      isDirty: true,
    }));
  },

  reorderExercisesInDay: (dayId, orderedIds) => {
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        const map = new Map(d.exercises.map((e) => [e.id, e]));
        return {
          ...d,
          exercises: orderedIds
            .map((id) => map.get(id))
            .filter((e): e is DraftExercise => e !== undefined),
        };
      }),
      isDirty: true,
    }));
  },

  groupExercises: (dayId, sourceExId, targetExId) => {
    if (sourceExId === targetExId) return null;

    let result: { exercises: DraftExercise[]; group: number } | null = null;

    set((state) => {
      const day = state.days.find((d) => d.id === dayId);
      if (!day) return state;

      const source = day.exercises.find((e) => e.id === sourceExId);
      const target = day.exercises.find((e) => e.id === targetExId);
      if (!source || !target) return state;

      // Resolver grupo destino: el del target si ya está agrupado, o el
      // siguiente entero libre (1-10) en este día.
      let group = target.supersetGroup;
      let targetGetsGroup = false;
      if (group === null) {
        const used = new Set(
          day.exercises
            .map((e) => e.supersetGroup)
            .filter((g): g is number => g !== null),
        );
        let next = 1;
        while (used.has(next) && next <= 10) next += 1;
        if (next > 10) return state; // schema cap (1..10)
        group = next;
        targetGetsGroup = true;
      }

      const sourceOldGroup = source.supersetGroup;

      // Aplicar grupo a source (y a target si recién se creó).
      const patched = day.exercises.map((e) => {
        if (e.id === sourceExId) return { ...e, supersetGroup: group };
        if (targetGetsGroup && e.id === targetExId) {
          return { ...e, supersetGroup: group };
        }
        return e;
      });

      // Mover source para que quede inmediatamente después del target.
      const withoutSource = patched.filter((e) => e.id !== sourceExId);
      const movedSource = patched.find((e) => e.id === sourceExId);
      const targetIdx = withoutSource.findIndex((e) => e.id === targetExId);
      const reordered =
        movedSource && targetIdx !== -1
          ? [
              ...withoutSource.slice(0, targetIdx + 1),
              movedSource,
              ...withoutSource.slice(targetIdx + 1),
            ]
          : patched;

      // Limpieza: si el grupo viejo del source queda con un único miembro,
      // ese también se desagrupa (no permitir grupos huérfanos de 1).
      let finalList = reordered;
      if (sourceOldGroup !== null && sourceOldGroup !== group) {
        const remaining = reordered.filter(
          (e) => e.supersetGroup === sourceOldGroup,
        );
        if (remaining.length === 1) {
          finalList = reordered.map((e) =>
            e.id === remaining[0]?.id ? { ...e, supersetGroup: null } : e,
          );
        }
      }

      result = { exercises: finalList, group };

      return {
        ...state,
        days: state.days.map((d) =>
          d.id === dayId ? { ...d, exercises: finalList } : d,
        ),
        isDirty: true,
      };
    });

    return result;
  },

  ungroupExercise: (dayId, exerciseLocalId) => {
    let result: { exercises: DraftExercise[] } | null = null;

    set((state) => {
      const day = state.days.find((d) => d.id === dayId);
      if (!day) return state;

      const ex = day.exercises.find((e) => e.id === exerciseLocalId);
      if (!ex || ex.supersetGroup === null) return state;

      const oldGroup = ex.supersetGroup;

      const cleared = day.exercises.map((e) =>
        e.id === exerciseLocalId ? { ...e, supersetGroup: null } : e,
      );

      // Si queda un único miembro en el grupo, también lo desagrupamos.
      const remaining = cleared.filter((e) => e.supersetGroup === oldGroup);
      let finalList = cleared;
      if (remaining.length === 1) {
        finalList = cleared.map((e) =>
          e.id === remaining[0]?.id ? { ...e, supersetGroup: null } : e,
        );
      }

      result = { exercises: finalList };

      return {
        ...state,
        days: state.days.map((d) =>
          d.id === dayId ? { ...d, exercises: finalList } : d,
        ),
        isDirty: true,
      };
    });

    return result;
  },

  markSaved: () => {
    set({ isDirty: false });
  },

  reset: () => {
    set({
      routineId: null,
      name: "",
      goal: "HYPERTROPHY",
      splitDays: 4,
      durationWeeks: 8,
      days: [],
      isDirty: false,
    });
  },
}));
