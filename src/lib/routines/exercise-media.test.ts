import { describe, expect, it } from "vitest";
import { resolveRoutineExerciseThumbnail } from "./exercise-media";

const CATALOG_DRIVE_URL =
	"https://drive.google.com/file/d/catalogVideo123/view?usp=drive_link";

describe("resolveRoutineExerciseThumbnail", () => {
	it("derives a poster from the catalog video when the stored thumbnail is stale", () => {
		expect(
			resolveRoutineExerciseThumbnail({
				catalogMediaUrl: CATALOG_DRIVE_URL,
				catalogThumbnailUrl: "/exercises/removed-image.jpg",
			}),
		).toBe("https://lh3.googleusercontent.com/d/catalogVideo123=w600");
	});

	it("prefers a routine-specific video poster", () => {
		expect(
			resolveRoutineExerciseThumbnail({
				routineMediaUrl: "https://youtu.be/dQw4w9WgXcQ",
				catalogMediaUrl: CATALOG_DRIVE_URL,
			}),
		).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
	});

	it("uses the trainer video before the catalog video", () => {
		expect(
			resolveRoutineExerciseThumbnail({
				trainerMediaUrl: "https://drive.google.com/file/d/trainerVideo456/view",
				catalogMediaUrl: CATALOG_DRIVE_URL,
			}),
		).toBe("https://lh3.googleusercontent.com/d/trainerVideo456=w600");
	});

	it("falls back to the stored image when no video poster can be derived", () => {
		expect(
			resolveRoutineExerciseThumbnail({
				catalogThumbnailUrl: "https://example.com/exercise.jpg",
			}),
		).toBe("https://example.com/exercise.jpg");
	});
});
