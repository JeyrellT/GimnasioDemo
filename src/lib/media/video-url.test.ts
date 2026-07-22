import { describe, expect, it } from "vitest";
import {
  firstSupportedVideoUrl,
  getVideoLoopEmbed,
  toClientMediaUrl,
} from "./video-url";

describe("firstSupportedVideoUrl", () => {
  const driveUrl =
    "https://drive.google.com/file/d/1k2wN1LWFy-fda0UrGclBHGeJC92kmYv0/view?usp=drive_link";

  it("skips a stale snapshot image and selects the live Drive video", () => {
    expect(
      firstSupportedVideoUrl(
        "/exercises/barbell-bench-press.jpg",
        null,
        driveUrl,
      ),
    ).toBe(driveUrl);
  });

  it("keeps the first playable URL in the precedence chain", () => {
    const routineOverride = "https://youtu.be/dQw4w9WgXcQ";

    expect(firstSupportedVideoUrl(routineOverride, driveUrl)).toBe(
      routineOverride,
    );
  });

  it("recognizes the authenticated same-origin exercise proxy", () => {
    expect(
      firstSupportedVideoUrl(
        "/exercises/placeholder.jpg",
        "/api/exercise/cmpc76f8p000kl7cczo598c8u/video",
      ),
    ).toBe("/api/exercise/cmpc76f8p000kl7cczo598c8u/video");
  });

  it("returns null when none of the candidates is a playable video", () => {
    expect(
      firstSupportedVideoUrl(
        null,
        "/exercises/placeholder.jpg",
        "https://example.com/manual.pdf",
      ),
    ).toBeNull();
  });

  it("turns a catalog Drive URL into the video source used by the routine player", () => {
    const clientUrl = toClientMediaUrl(driveUrl, "exercise123");

    expect(clientUrl).toBe("/api/exercise/exercise123/video");
    expect(getVideoLoopEmbed(clientUrl)).toEqual({
      kind: "video",
      src: "/api/exercise/exercise123/video",
    });
  });
});
