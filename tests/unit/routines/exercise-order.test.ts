import { getNextRoutineExerciseOrder } from "@/lib/routines/exercise-order";
import { describe, expect, it } from "vitest";

describe("getNextRoutineExerciseOrder", () => {
	it("starts at zero for an empty day", () => {
		expect(getNextRoutineExerciseOrder([])).toBe(0);
	});

	it("appends after the highest order even when that row is soft-deleted", () => {
		const rows = [
			{ order: 0, deletedAt: null },
			{ order: 1, deletedAt: new Date() },
		];

		expect(getNextRoutineExerciseOrder(rows)).toBe(2);
	});

	it("does not assume rows are already sorted", () => {
		expect(
			getNextRoutineExerciseOrder([{ order: 4 }, { order: 1 }, { order: 3 }]),
		).toBe(5);
	});
});
