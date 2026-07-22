import { describe, expect, it } from "vitest";
import { serveBundledExerciseVideo } from "./bundled-exercise-video";

describe("serveBundledExerciseVideo", () => {
  it("streams a byte range from a mirrored catalog video", async () => {
    const response = await serveBundledExerciseVideo(
      "barbell-bench-press",
      "bytes=0-1023",
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-type")).toBe("video/mp4");
    expect(response?.headers.get("accept-ranges")).toBe("bytes");
    expect(response?.headers.get("content-length")).toBe("1024");
    expect(response?.headers.get("content-range")).toMatch(
      /^bytes 0-1023\/\d+$/,
    );
    await response?.body?.cancel();
  });

  it("supports suffix ranges used by browser media players", async () => {
    const response = await serveBundledExerciseVideo(
      "barbell-bench-press",
      "bytes=-512",
    );

    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-length")).toBe("512");
    await response?.body?.cancel();
  });

  it("returns 416 for an invalid or unsatisfiable range", async () => {
    const response = await serveBundledExerciseVideo(
      "barbell-bench-press",
      "bytes=999999999-",
    );

    expect(response?.status).toBe(416);
    expect(response?.headers.get("content-range")).toMatch(/^bytes \*\/\d+$/);
  });

  it("falls back safely for missing or unsafe slugs", async () => {
    await expect(
      serveBundledExerciseVideo("../../secret", null),
    ).resolves.toBeNull();
    await expect(
      serveBundledExerciseVideo("exercise-that-does-not-exist", null),
    ).resolves.toBeNull();
  });
});
