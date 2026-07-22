import EditarEjercicioClient from "@/app/(app)/trainer/ejercicios/[exerciseId]/editar/_client";

export default async function EditarCalentamientoPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  return <EditarEjercicioClient exerciseId={exerciseId} basePath="/trainer/calentamientos" />;
}
