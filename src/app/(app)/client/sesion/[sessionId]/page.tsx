import { getSessionDetail } from "@/app/actions/client-portal";
import { ActiveSessionClient } from "./active-session-client";
import { SessionDetailClient } from "./session-detail-client";
import type { SessionInProgress } from "@/types/domain";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ActiveSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await getSessionDetail(sessionId);

  // Bug 4 fix: route to the live session UI when the session is still IN_PROGRESS;
  // fall back to the read-only detail view for completed/aborted sessions.
  if (result.ok && result.value.status === "IN_PROGRESS") {
    // getSessionDetail returns MySessionDetail. ActiveSessionClient expects the
    // Prisma-typed SessionInProgress shape with assignedRoutine included.
    // Cast via unknown: both share the same DB row; the type difference is only
    // in nested Decimal vs number scalars which the UI reads as numbers anyway.
    const session = result.value as unknown as SessionInProgress;
    return <ActiveSessionClient session={session} />;
  }

  // Completed, aborted, or fetch error → read-only detail view.
  return <SessionDetailClient />;
}
