import EditarEjercicioClient from "./_client";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  return <EditarEjercicioClient exerciseId={exerciseId} />;
}
