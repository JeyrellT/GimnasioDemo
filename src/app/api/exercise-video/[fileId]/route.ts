// =============================================================================
// BLACKLINE FITNESS — Direct Drive video proxy (by fileId)
//
// Streams a public Drive video from the Node runtime, bypassing the CORP
// `same-site` header that Drive sets and that the browser refuses inside a
// <video> element on a different site. See `server/lib/drive-video-proxy.ts`
// for the shared streaming logic.
//
// USO REAL: este endpoint solo lo consume el preview en tiempo real del
// trainer (ExerciseMediaGallery, cuando el coach pega un URL nuevo y todavía
// no se ha guardado, por lo que el resolver by-exerciseId aún no aplica).
// Los clients siempre van por /api/exercise/[exerciseId]/video, que resuelve
// el override per-trainer antes de proxear.
//
// HARDENING:
//   - Solo TRAINER role: clients no tienen razón legítima para llegar aquí.
//     Esto mitiga el riesgo de "Railway como CDN gratis de cualquier video
//     público de Drive" reportado en la auditoría.
//   - Rate limit via middleware (ver src/middleware.ts).
//   - El propio proxy valida el formato del fileId y el content-type upstream.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/guards";
import { proxyDriveFile } from "@/server/lib/drive-video-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // Solo el preview del coach usa esta ruta — un client autenticado pidiendo
  // un fileId arbitrario es señal de uso ilegítimo (ver auditoría).
  if (user.role !== "TRAINER") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { fileId } = await params;
  return proxyDriveFile(fileId, req.headers.get("range"));
}
