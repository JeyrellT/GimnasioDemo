import { getMyRestPreferences } from "@/app/actions/rest-preferences";
import { getMyAssignedRoutines } from "@/app/actions/client-portal";
import { AjustesClient, type UniqueExercise } from "./ajustes-client";
import type { RoutineSnapshot, RoutineSnapshotExercise } from "@/types/domain";

function parseSnapshot(json: unknown): RoutineSnapshot | null {
  if (!json || typeof json !== "object") return null;
  return json as RoutineSnapshot;
}

/**
 * Collects all unique exercises (by exerciseId) across the client's assigned
 * routines, keeping the base restSeconds the trainer prescribed so the editor
 * can show "Original: 60s · Tu ajuste: 90s".
 *
 * Strategy: iterate active assignments first so their baseline wins for shared
 * exercises across overlapping routines.
 */
function collectUniqueExercises(
  assignments: Array<{ snapshotJson: unknown; status: string }>,
): UniqueExercise[] {
  const map = new Map<string, UniqueExercise>();

  const ordered = [...assignments].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "ACTIVE" ? -1 : 1;
  });

  for (const assignment of ordered) {
    const snap = parseSnapshot(assignment.snapshotJson);
    if (!snap) continue;
    for (const day of snap.days ?? []) {
      const exercises = (day.exercises ?? []) as RoutineSnapshotExercise[];
      for (const ex of exercises) {
        if (!ex.exerciseId || map.has(ex.exerciseId)) continue;
        map.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          nameEs: ex.nameEs ?? "Ejercicio",
          slug: ex.slug ?? null,
          nameEn: null,
          thumbnailUrl: ex.thumbnailUrl ?? null,
          baseRestSeconds: ex.restSeconds ?? 0,
        });
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.nameEs.localeCompare(b.nameEs, "es", { sensitivity: "base" }),
  );
}

export default async function AjustesPage() {
  const [prefsResult, routinesResult] = await Promise.all([
    getMyRestPreferences(),
    getMyAssignedRoutines(),
  ]);

  const prefs = prefsResult.ok
    ? prefsResult.value
    : { globalOffsetSec: 0, exerciseOverrides: {} };

  const assignments = routinesResult.ok ? routinesResult.value : [];
  const uniqueExercises = collectUniqueExercises(
    assignments.map((a) => ({ snapshotJson: a.snapshotJson, status: a.status })),
  );

  return (
    <AjustesClient
      initialPrefs={prefs}
      exercises={uniqueExercises}
    />
  );
}
