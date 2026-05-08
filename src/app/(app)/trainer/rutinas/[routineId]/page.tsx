import RoutineDetailClient from "./routine-detail-client";

export function generateStaticParams() {
  return [
    { routineId: "routine-ppl" },
    { routineId: "routine-upper-lower" },
    { routineId: "routine-fullbody" },
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
