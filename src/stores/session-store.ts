"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { RoutineSnapshotDay } from "@/types/domain";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SetRecord {
  setId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  completedAt: number; // Unix ms
  isPr: boolean;
  synced: boolean;
}

export interface ActiveSession {
  sessionId: string;
  assignedRoutineId: string | null;
  dayIndex: number;
  daySnapshot: RoutineSnapshotDay | null;
  startedAt: number; // Unix ms
  isFreeWorkout: boolean;
}

interface SessionState {
  currentSession: ActiveSession | null;
  currentExerciseIndex: number;
  setsByExerciseId: Record<string, SetRecord[]>;
  restTimerActive: boolean;
  restTimerSecondsLeft: number;
  pendingSyncCount: number;

  // Actions
  startSession: (session: ActiveSession) => void;
  recordSet: (set: SetRecord) => void;
  markSetSynced: (exerciseId: string, setId: string) => void;
  advanceExercise: () => void;
  setCurrentExerciseIndex: (index: number) => void;
  setRestTimerActive: (active: boolean) => void;
  setRestTimerSecondsLeft: (seconds: number | ((prev: number) => number)) => void;
  abortSession: () => void;
  completeSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        currentSession: null,
        currentExerciseIndex: 0,
        setsByExerciseId: {},
        restTimerActive: false,
        restTimerSecondsLeft: 0,
        pendingSyncCount: 0,

        startSession: (session) => {
          set({
            currentSession: session,
            currentExerciseIndex: 0,
            setsByExerciseId: {},
            restTimerActive: false,
            restTimerSecondsLeft: 0,
          });
        },

        recordSet: (setRecord) => {
          set((state) => {
            const existing =
              state.setsByExerciseId[setRecord.exerciseId] ?? [];
            const updated = [...existing, setRecord];
            const unsynced = updated.filter((s) => !s.synced).length;
            const allUnsyncedCount = Object.values({
              ...state.setsByExerciseId,
              [setRecord.exerciseId]: updated,
            })
              .flat()
              .filter((s) => !s.synced).length;

            return {
              setsByExerciseId: {
                ...state.setsByExerciseId,
                [setRecord.exerciseId]: updated,
              },
              pendingSyncCount: allUnsyncedCount,
            };
          });
        },

        markSetSynced: (exerciseId, setId) => {
          set((state) => {
            const sets = state.setsByExerciseId[exerciseId] ?? [];
            const updated = sets.map((s) =>
              s.setId === setId ? { ...s, synced: true } : s,
            );
            const allUnsyncedCount = Object.values({
              ...state.setsByExerciseId,
              [exerciseId]: updated,
            })
              .flat()
              .filter((s) => !s.synced).length;

            return {
              setsByExerciseId: {
                ...state.setsByExerciseId,
                [exerciseId]: updated,
              },
              pendingSyncCount: allUnsyncedCount,
            };
          });
        },

        advanceExercise: () => {
          const { currentSession, currentExerciseIndex } = get();
          const total =
            currentSession?.daySnapshot?.exercises?.length ?? 0;
          if (currentExerciseIndex < total - 1) {
            set({ currentExerciseIndex: currentExerciseIndex + 1 });
          }
        },

        setCurrentExerciseIndex: (index) => {
          set({ currentExerciseIndex: index });
        },

        setRestTimerActive: (active) => {
          set({ restTimerActive: active });
        },

        setRestTimerSecondsLeft: (seconds) => {
          if (typeof seconds === "function") {
            set((state) => ({
              restTimerSecondsLeft: seconds(state.restTimerSecondsLeft),
            }));
          } else {
            set({ restTimerSecondsLeft: seconds });
          }
        },

        abortSession: () => {
          set({
            currentSession: null,
            currentExerciseIndex: 0,
            setsByExerciseId: {},
            restTimerActive: false,
            restTimerSecondsLeft: 0,
            pendingSyncCount: 0,
          });
        },

        completeSession: () => {
          // Keep sets in memory for post-session summary, then clear
          set((state) => ({
            currentSession: null,
            currentExerciseIndex: 0,
            restTimerActive: false,
            restTimerSecondsLeft: 0,
            // Keep setsByExerciseId for summary screen
          }));
        },
      }),
      {
        name: "vizion-session",
        partialize: (state) => ({
          currentSession: state.currentSession,
          currentExerciseIndex: state.currentExerciseIndex,
          setsByExerciseId: state.setsByExerciseId,
          pendingSyncCount: state.pendingSyncCount,
        }),
      },
    ),
  ),
);
