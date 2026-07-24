import { describe, expect, it } from "vitest";
import { isSafeExerciseVideoId } from "./exercise-video-id";

describe("isSafeExerciseVideoId", () => {
	it("accepts current CUID exercise IDs", () => {
		expect(isSafeExerciseVideoId("cm1234567890abcdefghijk")).toBe(true);
	});

	it("accepts legacy warmup IDs with underscores", () => {
		expect(isSafeExerciseVideoId("warmup_cardio_maquina")).toBe(true);
		expect(isSafeExerciseVideoId("warmup_zancadas_caminando")).toBe(true);
	});

	it("accepts safe IDs containing hyphens", () => {
		expect(isSafeExerciseVideoId("legacy-exercise-001")).toBe(true);
	});

	it("rejects path traversal and malformed IDs", () => {
		expect(isSafeExerciseVideoId("")).toBe(false);
		expect(isSafeExerciseVideoId("../warmup_cardio_maquina")).toBe(false);
		expect(isSafeExerciseVideoId("warmup/cardio")).toBe(false);
		expect(isSafeExerciseVideoId("a".repeat(65))).toBe(false);
	});
});
