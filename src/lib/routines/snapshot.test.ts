import { describe, expect, it } from "vitest";
import { type RoutineSnapshotSource, buildRoutineSnapshot } from "./snapshot";

function exercise(
	exerciseId: string,
	order: number,
): RoutineSnapshotSource["days"][number]["exercises"][number] {
	return {
		exerciseId,
		order,
		targetSets: 3,
		targetRepsMin: 8,
		targetRepsMax: 12,
		targetRpe: null,
		restSeconds: 90,
		tempo: null,
		supersetGroup: null,
		notes: null,
		mediaUrl: null,
		exercise: {
			slug: exerciseId,
			nameEs: exerciseId,
			nameEn: exerciseId,
			gifUrl: null,
			thumbnailUrl: null,
			mediaUrl: null,
		},
	};
}

function routine(
	dayThreeExercises: RoutineSnapshotSource["days"][number]["exercises"],
): RoutineSnapshotSource {
	return {
		id: "routine-1",
		name: "Hipertrofia Principiante",
		goal: "HYPERTROPHY",
		audience: "UNISEX",
		splitDays: 4,
		durationWeeks: 8,
		days: [
			{
				dayIndex: 2,
				name: "Día 3",
				exercises: dayThreeExercises,
			},
		],
	};
}

describe("buildRoutineSnapshot", () => {
	it("includes newly added exercises and orders them for the client", () => {
		const source = routine([
			exercise("extension-piernas", 1),
			exercise("abdominal-rueda", 0),
			exercise("triceps-polea", 2),
		]);

		const snapshot = buildRoutineSnapshot(
			source,
			new Date("2026-07-24T00:00:00.000Z"),
		);

		expect(snapshot.days[0]?.exercises.map((item) => item.exerciseId)).toEqual([
			"abdominal-rueda",
			"extension-piernas",
			"triceps-polea",
		]);
		expect(snapshot.days[0]?.exercises).toHaveLength(3);
	});

	it("omits exercises no longer present in the live template source", () => {
		const before = buildRoutineSnapshot(
			routine([
				exercise("abdominal-rueda", 0),
				exercise("extension-piernas", 1),
				exercise("triceps-polea", 2),
			]),
		);
		const after = buildRoutineSnapshot(
			routine([exercise("abdominal-rueda", 0), exercise("triceps-polea", 1)]),
		);

		expect(before.days[0]?.exercises).toHaveLength(3);
		expect(after.days[0]?.exercises.map((item) => item.exerciseId)).toEqual([
			"abdominal-rueda",
			"triceps-polea",
		]);
	});
});
