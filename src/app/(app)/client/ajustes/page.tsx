import { getMyRestPreferences } from "@/app/actions/rest-preferences";
import { getMyAssignedRoutines } from "@/app/actions/client-portal";
import { AjustesClient, type RoutineGroup, type UniqueExercise } from "./ajustes-client";
import type { RoutineSnapshot, RoutineSnapshotExercise } from "@/types/domain";

function parseSnapshot(json: unknown): RoutineSnapshot | null {
  if (!json || typeof json !== "object") return null;
  return json as RoutineSnapshot;
}

/**
 * Builds one RoutineGroup per ACTIVE assigned routine, with its unique
 * exercises (deduped by exerciseId within the routine, preserving the order
 * they appear across days). Non-ACTIVE assignments (COMPLETED / ARCHIVED /
 * CANCELLED) are skipped — the client is no longer working on them, so they
 * shouldn't clutter the per-exercise rest editor.
 */
function collectRoutineGroups(
  assignments: Array<{
    id: string;
    snapshotJson: unknown;
    status: string;
    assignedAt: Date;
  }>,
): RoutineGroup[] {
  const active = assignments
    .filter((a) => a.status === "ACTIVE")
    .sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
    );

  const groups: RoutineGroup[] = [];

  for (const assignment of active) {
    const snap = parseSnapshot(assignment.snapshotJson);
    if (!snap) continue;

    const seen = new Set<string>();
    const exercises: UniqueExercise[] = [];

    for (const day of snap.days ?? []) {
      const dayExercises = (day.exercises ?? []) as RoutineSnapshotExercise[];
      for (const ex of dayExercises) {
        if (!ex.exerciseId || seen.has(ex.exerciseId)) continue;
        seen.add(ex.exerciseId);
        exercises.push({
          exerciseId: ex.exerciseId,
          nameEs: ex.nameEs ?? "Ejercicio",
          slug: ex.slug ?? null,
          nameEn: ex.nameEn ?? null,
          thumbnailUrl: ex.thumbnailUrl ?? null,
          baseRestSeconds: ex.restSeconds ?? 0,
        });
      }
    }

    if (exercises.length === 0) continue;

    groups.push({
      assignedRoutineId: assignment.id,
      routineName: snap.templateName ?? "Rutina",
      exercises,
    });
  }

  return groups;
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
  const routines = collectRoutineGroups(
    assignments.map((a) => ({
      id: a.id,
      snapshotJson: a.snapshotJson,
      status: a.status,
      assignedAt: a.assignedAt,
    })),
  );

  return <AjustesClient initialPrefs={prefs} routines={routines} />;
}
