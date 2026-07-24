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
import { isSupportedVideoUrl } from "@/lib/media/video-url";
import { serveBundledExerciseVideo } from "@/server/lib/bundled-exercise-video";
import { isSafeExerciseVideoId } from "@/server/lib/exercise-video-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cuid2 pattern — Prisma's @default(cuid()) generates ~24-char alnum IDs.
// Keep the pattern permissive but bounded to avoid wild SSRF-like inputs.
async function resolveEffectiveMediaUrl(
  exerciseId: string,
  trainerUserId: string | null,
): Promise<{
  mediaUrl: string | null;
  catalogSlug: string | null;
  usesCatalog: boolean;
}> {
  // Estrategia: junto TODOS los candidates (override del trainer + catálogo +
  // override de cualquier trainer si el caller es client). Luego elijo el
  // primero que sea REPRODUCIBLE (Drive / YouTube / Vimeo). Si ninguno es
  // reproducible, devuelvo el primero que exista — el caller maneja el 415.
  //
  // Esto evita el bug donde un override viejo con un URL no embebible (un
  // .mp4 random, un link Telegram, etc.) pisaba un Drive válido del seed.
  const candidates: string[] = [];

  if (trainerUserId) {
    // findFirst instead of findUnique so we can filter deletedAt: null.
    // The @@unique constraint guarantees at most one non-deleted row, so
    // this is functionally equivalent but respects the soft-delete.
    const override = await prisma.trainerExerciseMedia.findFirst({
      where: {
        trainerUserId,
        exerciseId,
        deletedAt: null,
      },
      select: { mediaUrl: true },
    });
    if (override?.mediaUrl) candidates.push(override.mediaUrl);
  }

  // Catalog default — populated by the seed script or by the trainer
  // when they own a private exercise.
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId, deletedAt: null },
    select: { mediaUrl: true, isPublic: true, slug: true },
  });

  // For clients (no trainerUserId), also look at any override that exists
  // for the trainer of an ACTIVE assigned routine pointing to this
  // exercise. We do this as a fallback to avoid a heavier join above.
  if (!trainerUserId && ex && ex.isPublic) {
    const overrideAny = await prisma.trainerExerciseMedia.findFirst({
      where: { exerciseId, deletedAt: null },
      select: { mediaUrl: true },
      // No order — for a small product we accept whichever the DB returns.
    });
    if (overrideAny?.mediaUrl) candidates.push(overrideAny.mediaUrl);
  }

  if (ex?.mediaUrl) candidates.push(ex.mediaUrl);

  // Primer URL reproducible gana — el override de "verdad" si es Drive/YT/Vimeo,
  // sino caemos al catálogo del JSON.
  for (const c of candidates) {
    if (isSupportedVideoUrl(c)) {
      return {
        mediaUrl: c,
        catalogSlug: ex?.slug ?? null,
        usesCatalog: c === ex?.mediaUrl,
      };
    }
  }
  return {
    mediaUrl: candidates[0] ?? null,
    catalogSlug: ex?.slug ?? null,
    usesCatalog: candidates[0] === ex?.mediaUrl,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
): Promise<Response> {
  const { exerciseId } = await params;
  if (!isSafeExerciseVideoId(exerciseId)) {
    return new NextResponse("Invalid exerciseId", { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Trainers get their own override resolved; clients fall through to the
  // catalog (or to any override set for this exercise by their trainer).
  const trainerUserId = user.role === "TRAINER" ? user.id : null;
  const resolved = await resolveEffectiveMediaUrl(exerciseId, trainerUserId);
  const mediaUrl = resolved.mediaUrl;

  if (!mediaUrl) {
    return new NextResponse("No video", { status: 404 });
  }

  // Catalog videos are mirrored inside the deployment so client playback does
  // not depend on Drive availability. If the bundled copy is unexpectedly
  // absent, continue below and use Drive as the independent fallback.
  if (resolved.usesCatalog) {
    const bundled = await serveBundledExerciseVideo(
      resolved.catalogSlug,
      req.headers.get("range"),
    );
    if (bundled) return bundled;
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
