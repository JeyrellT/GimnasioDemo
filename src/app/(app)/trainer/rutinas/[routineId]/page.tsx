import RoutineDetailClient from "./routine-detail-client";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

export default async function RoutinePage({
  params,
  searchParams,
}: {
  params: Promise<{ routineId: string }>;
  searchParams: Promise<{
    clientId?: string | string[];
    assignedRoutineId?: string | string[];
  }>;
}) {
  const { routineId } = await params;
  const query = await searchParams;
  const clientId = firstParam(query.clientId);
  const assignedRoutineId = firstParam(query.assignedRoutineId);

  return (
    <RoutineDetailClient
      routineId={routineId}
      returnToClientId={clientId}
      assignedRoutineId={assignedRoutineId}
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
