// =============================================================================
// BLACKLINE FITNESS — Direct Drive video proxy (by fileId)
//
// Streams a public Drive video from the Node runtime, bypassing the CORP
// `same-site` header that Drive sets and that the browser refuses inside a
// <video> element on a different site. See `server/lib/drive-video-proxy.ts`
// for the shared streaming logic.
//
// Two routes use this helper:
//   - This one: lookup by Drive fileId (used when the caller already has the
//     ID, e.g. testing or a low-level integration).
//   - /api/exercise/[exerciseId]/video: lookup by exerciseId — the route the
//     frontend uses, since the backend resolves the right Drive URL on its
//     side and the frontend never sees a Drive ID.
// =============================================================================

import { proxyDriveFile } from "@/server/lib/drive-video-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const { fileId } = await params;
  return proxyDriveFile(fileId, req.headers.get("range"));
}
