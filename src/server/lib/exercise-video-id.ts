const SAFE_EXERCISE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Exercise IDs are usually CUIDs, but legacy catalog rows use stable IDs such
 * as `warmup_cardio_maquina`. Both forms are safe as a Prisma lookup key.
 */
export function isSafeExerciseVideoId(exerciseId: string): boolean {
	return SAFE_EXERCISE_ID_PATTERN.test(exerciseId);
}
