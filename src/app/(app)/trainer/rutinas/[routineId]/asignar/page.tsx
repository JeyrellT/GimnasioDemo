// =============================================================================
// VIZION — Assign routine page (server wrapper for static export)
// generateStaticParams must live in a server component.
// =============================================================================

import AsignarClient from "./_client";

export function generateStaticParams() {
  return [
    { routineId: "routine-programa-macho" },
  ];
}

export default async function AsignarPage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  return <AsignarClient routineId={routineId} />;
}
