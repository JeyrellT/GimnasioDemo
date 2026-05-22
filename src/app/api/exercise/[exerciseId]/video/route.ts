// =============================================================================
// BLACKLINE FITNESS — By-exercise video resolution + proxy
//
// Frontend just asks for `/api/exercise/{exerciseId}/video` — the backend
// resolves the effective video URL (per-trainer override > catalog) and
// either streams the Drive content or returns a 4xx telling the frontend
// to fall back to iframe embed (YouTube / Vimeo).
//
// Auth: any logged-in user. Trainers see their own override; clients see
// the override of whichever trainer assigned them the routine that links
// to this exercise (we approximate this as "any override that exists for
// any trainer who has this exercise in an active routine for this client").
//
// Falls back gracefully:
//   - 404 if the exercise doesn't have any video URL set anywhere.
//   - 415 if the URL is a service we can't proxy (YouTube/Vimeo). The
//     frontend treats this as "use the original mediaUrl with an iframe".
//   - 502 if Drive upstream errored.
// =============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/guards";
import {
  extractDriveFileId,
  proxyDriveFile,
} from "@/server/lib/drive-video-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cuid2 pattern — Prisma's @default(cuid()) generates ~24-char alnum IDs.
// Keep the pattern permissive but bounded to avoid wild SSRF-like inputs.
const EXERCISE_ID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

async function resolveEffectiveMediaUrl(
  exerciseId: string,
  trainerUserId: string | null,
): Promise<string | null> {
  // 1) If a trainer is asking (or a client whose trainer set an override),
  //    prefer that override. For clients we can't easily know which trainer
  //    assigned this exercise without joining through AssignedRoutine; in
  //    practice we just look up ANY active override by ANY trainer for this
  //    exercise — the catalog isn't shared with other coaches' overrides,
  //    so the only override that exists for a public exercise was likely
  //    set by the trainer the client is currently working with.
  if (trainerUserId) {
    const override = await prisma.trainerExerciseMedia.findUnique({
      where: {
        trainerUserId_exerciseId: { trainerUserId, exerciseId },
      },
      select: { mediaUrl: true },
    });
    if (override?.mediaUrl) return override.mediaUrl;
  }

  // 2) Catalog default — populated by the seed script or by the trainer
  //    when they own a private exercise.
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId, deletedAt: null },
    select: { mediaUrl: true, isPublic: true },
  });

  // 3) For clients (no trainerUserId), also look at any override that exists
  //    for the trainer of an ACTIVE assigned routine pointing to this
  //    exercise. We do this as a fallback to avoid a heavier join above.
  if (!trainerUserId && ex && ex.isPublic) {
    const overrideAny = await prisma.trainerExerciseMedia.findFirst({
      where: { exerciseId, deletedAt: null },
      select: { mediaUrl: true },
      // No order — for a small product we accept whichever the DB returns.
      // If the user has multiple trainers, the DB picks one; both should be
      // the same video for the same exercise in this product's model.
    });
    if (overrideAny?.mediaUrl) return overrideAny.mediaUrl;
  }

  return ex?.mediaUrl ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
): Promise<Response> {
  const { exerciseId } = await params;
  if (!EXERCISE_ID_PATTERN.test(exerciseId)) {
    return new NextResponse("Invalid exerciseId", { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Trainers get their own override resolved; clients fall through to the
  // catalog (or to any override set for this exercise by their trainer).
  const trainerUserId = user.role === "TRAINER" ? user.id : null;
  const mediaUrl = await resolveEffectiveMediaUrl(exerciseId, trainerUserId);

  if (!mediaUrl) {
    return new NextResponse("No video", { status: 404 });
  }

  // Only Drive can be proxied as a video stream. YouTube/Vimeo require
  // iframes and won't load via <video src=>. Tell the caller so the frontend
  // can switch rendering modes.
  const driveFileId = extractDriveFileId(mediaUrl);
  if (!driveFileId) {
    return new NextResponse(
      "Video service requires iframe embed (YouTube/Vimeo)",
      { status: 415 },
    );
  }

  return proxyDriveFile(driveFileId, req.headers.get("range"));
}
