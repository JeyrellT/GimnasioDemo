import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_ID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

async function canReadAvatar(viewerId: string, viewerRole: string, targetUserId: string) {
  if (viewerId === targetUserId) return true;
  if (viewerRole === "ADMIN" || viewerRole === "SUPER_ADMIN") return true;

  if (viewerRole === "TRAINER") {
    const link = await prisma.trainerClient.findFirst({
      where: {
        trainerId: viewerId,
        clientId: targetUserId,
        status: { in: ["ACTIVE", "PENDING"] },
        deletedAt: null,
      },
      select: { id: true },
    });
    return Boolean(link);
  }

  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const { userId } = await params;

  if (!USER_ID_PATTERN.test(userId)) {
    return new NextResponse("Invalid userId", { status: 400 });
  }

  const session = await auth();
  const viewer = session?.user;
  if (!viewer?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allowed = await canReadAvatar(viewer.id, viewer.role, userId);
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const avatar = await prisma.userAvatar.findUnique({
    where: { userId },
    select: {
      data: true,
      mimeType: true,
      sizeBytes: true,
      updatedAt: true,
    },
  });

  if (!avatar) {
    return new NextResponse("Avatar not found", { status: 404 });
  }

  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Content-Length": String(avatar.sizeBytes),
      "Cache-Control": "private, max-age=3600",
      "Last-Modified": avatar.updatedAt.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
