import RoutineDetailClient from "./routine-detail-client";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

export default async function RoutinePage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  return <RoutineDetailClient routineId={routineId} />;
}
