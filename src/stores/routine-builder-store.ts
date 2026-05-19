"use client";

import { create } from "zustand";
import type { RoutineWithDays } from "@/types/domain";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftExercise {
  id: string; // local UUID for dnd-kit key
  routineExerciseId?: string; // set after save
  exerciseId: string;
  nameEs: string;
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
  markSaved: () => void;
  reset: () => void;
}

function newLocalId(): string {
  return `local-${Math.random().toString(36).slice(2)}`;
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
