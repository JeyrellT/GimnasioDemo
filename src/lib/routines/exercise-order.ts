type OrderedRoutineExercise = {
	order: number;
};

/**
 * Returns an unused append position for a routine day.
 *
 * Soft-deleted rows must be included because the database unique constraint
 * still reserves their `(routineDayId, order)` pair.
 */
export function getNextRoutineExerciseOrder(
	exercises: readonly OrderedRoutineExercise[],
): number {
	return (
		exercises.reduce(
			(highestOrder, exercise) => Math.max(highestOrder, exercise.order),
			-1,
		) + 1
	);
}
