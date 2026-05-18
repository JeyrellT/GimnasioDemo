import ExerciseDetailClient from "./exercise-detail-client";

// Production: all exercise detail pages are dynamically rendered.
// Demo (GitHub Pages export) uses generateStaticParams in a separate branch.

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  return <ExerciseDetailClient exerciseId={exerciseId} />;
}
