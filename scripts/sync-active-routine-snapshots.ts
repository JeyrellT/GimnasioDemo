import { type Prisma, PrismaClient } from "@prisma/client";
import {
	type RoutineSnapshotSource,
	buildRoutineSnapshot,
} from "../src/lib/routines/snapshot";

const prisma = new PrismaClient();
const shouldApply = process.argv.includes("--apply");
const snapshotAt = new Date();

const assignments = await prisma.assignedRoutine.findMany({
	where: {
		status: "ACTIVE",
		deletedAt: null,
		routineTemplate: { deletedAt: null },
	},
	select: {
		id: true,
		startsOn: true,
		snapshotJson: true,
		routineTemplate: {
			include: {
				days: {
					where: { deletedAt: null },
					orderBy: { dayIndex: "asc" },
					include: {
						exercises: {
							where: { deletedAt: null },
							orderBy: { order: "asc" },
							include: {
								exercise: {
									select: {
										slug: true,
										nameEs: true,
										nameEn: true,
										gifUrl: true,
										thumbnailUrl: true,
										mediaUrl: true,
									},
								},
							},
						},
					},
				},
			},
		},
	},
});

function exerciseCounts(snapshot: Prisma.JsonValue): number[] {
	if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
		return [];
	}

	const days = (snapshot as Prisma.JsonObject).days;
	if (!Array.isArray(days)) return [];

	return days.map((day) => {
		if (!day || typeof day !== "object" || Array.isArray(day)) return 0;
		const exercises = (day as Prisma.JsonObject).exercises;
		return Array.isArray(exercises) ? exercises.length : 0;
	});
}

const prepared = assignments.map((assignment) => {
	const snapshot = buildRoutineSnapshot(
		assignment.routineTemplate as RoutineSnapshotSource,
		snapshotAt,
	);
	const endsOn = new Date(assignment.startsOn);
	endsOn.setDate(
		endsOn.getDate() + assignment.routineTemplate.durationWeeks * 7,
	);

	return {
		id: assignment.id,
		snapshot,
		endsOn,
		changed:
			JSON.stringify(exerciseCounts(assignment.snapshotJson)) !==
			JSON.stringify(snapshot.days.map((day) => day.exercises.length)),
	};
});

console.log(
	JSON.stringify({
		mode: shouldApply ? "apply" : "dry-run",
		activeAssignments: prepared.length,
		exerciseCountMismatches: prepared.filter((item) => item.changed).length,
	}),
);

if (shouldApply) {
	for (let index = 0; index < prepared.length; index += 25) {
		const chunk = prepared.slice(index, index + 25);
		await prisma.$transaction(
			chunk.map((item) =>
				prisma.assignedRoutine.update({
					where: { id: item.id },
					data: {
						snapshotJson: item.snapshot as unknown as Prisma.InputJsonValue,
						endsOn: item.endsOn,
					},
				}),
			),
		);
	}

	console.log(JSON.stringify({ syncedAssignments: prepared.length }));
}

await prisma.$disconnect();
