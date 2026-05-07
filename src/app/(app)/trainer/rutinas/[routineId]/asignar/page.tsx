// =============================================================================
// FORJA — Assign routine page (server wrapper for static export)
// generateStaticParams must live in a server component.
// =============================================================================

import AsignarClient from "./_client";

export function generateStaticParams() {
  return [
    { routineId: "routine-ppl" },
    { routineId: "routine-upper-lower" },
    { routineId: "routine-full-body" },
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
