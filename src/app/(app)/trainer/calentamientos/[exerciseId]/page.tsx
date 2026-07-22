import ExerciseDetailClient from "@/app/(app)/trainer/ejercicios/[exerciseId]/exercise-detail-client";

export default async function CalentamientoDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  return <ExerciseDetailClient exerciseId={exerciseId} basePath="/trainer/calentamientos" />;
}
