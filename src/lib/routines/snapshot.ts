import { resolveRoutineExerciseThumbnail } from "@/lib/routines/exercise-media";
import type { RoutineAudienceValue } from "@/lib/routines/metadata";
import type {
	RoutineSnapshot,
	RoutineSnapshotDay,
	RoutineSnapshotExercise,
} from "@/types/domain";
import type { Prisma } from "@prisma/client";

export interface RoutineSnapshotSource {
	id: string;
	name: string;
	goal: string;
	audience: RoutineAudienceValue;
	splitDays: number;
	durationWeeks: number;
	days: Array<{
		dayIndex: number;
		name: string;
		exercises: Array<{
			exerciseId: string;
			order: number;
			targetSets: number;
			targetRepsMin: number;
			targetRepsMax: number;
			targetRpe: Prisma.Decimal | number | null;
			restSeconds: number;
			tempo: string | null;
			supersetGroup: number | null;
			notes: string | null;
			mediaUrl: string | null;
			exercise: {
				slug: string;
				nameEs: string;
				nameEn: string;
				gifUrl: string | null;
				thumbnailUrl: string | null;
				mediaUrl: string | null;
			};
		}>;
	}>;
}

/**
 * Build the client-facing snapshot from the current live template.
 *
 * The query supplying this source is responsible for excluding soft-deleted
 * days and exercises. Rebuilding it after every mutation makes additions,
 * removals, prescription edits and reordering visible to active clients.
 */
export function buildRoutineSnapshot(
	routine: RoutineSnapshotSource,
	snapshotAt = new Date(),
): RoutineSnapshot {
	const days: RoutineSnapshotDay[] = routine.days.map((day) => ({
		dayIndex: day.dayIndex,
		name: day.name,
		exercises: [...day.exercises]
			.sort((a, b) => a.order - b.order)
			.map(
				(routineExercise): RoutineSnapshotExercise => ({
					exerciseId: routineExercise.exerciseId,
					nameEs: routineExercise.exercise.nameEs,
					order: routineExercise.order,
					targetSets: routineExercise.targetSets,
					targetRepsMin: routineExercise.targetRepsMin,
					targetRepsMax: routineExercise.targetRepsMax,
					targetRpe:
						routineExercise.targetRpe !== null
							? Number(routineExercise.targetRpe)
							: null,
					restSeconds: routineExercise.restSeconds,
					tempo: routineExercise.tempo,
					supersetGroup: routineExercise.supersetGroup,
					notes: routineExercise.notes,
					slug: routineExercise.exercise.slug ?? null,
					thumbnailUrl: resolveRoutineExerciseThumbnail({
						routineMediaUrl: routineExercise.mediaUrl,
						catalogMediaUrl: routineExercise.exercise.mediaUrl,
						catalogThumbnailUrl: routineExercise.exercise.thumbnailUrl,
						catalogGifUrl: routineExercise.exercise.gifUrl,
					}),
					gifUrl: routineExercise.exercise.gifUrl ?? null,
					mediaUrl:
						routineExercise.mediaUrl ??
						routineExercise.exercise.mediaUrl ??
						null,
					nameEn: routineExercise.exercise.nameEn || null,
				}),
			),
	}));

	return {
		templateId: routine.id,
		templateName: routine.name,
		audience: routine.audience,
		goal: routine.goal,
		splitDays: routine.splitDays,
		durationWeeks: routine.durationWeeks,
		days,
		snapshotAt: snapshotAt.toISOString(),
	};
}
