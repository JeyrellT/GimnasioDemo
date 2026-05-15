import RoutineDetailClient from "./routine-detail-client";

export function generateStaticParams() {
  return [
    { routineId: "routine-programa-macho" },
  ];
}

export default async function RoutinePage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  return <RoutineDetailClient routineId={routineId} />;
}
