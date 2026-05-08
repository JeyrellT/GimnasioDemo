// =============================================================================
// VIZION — Edit exercise page (server wrapper for static export)
// generateStaticParams must live in a server component.
// =============================================================================

import EditarEjercicioClient from "./_client";

export function generateStaticParams() {
  return [
    { exerciseId: "ex-press-banca" },
    { exerciseId: "ex-press-inclinado" },
    { exerciseId: "ex-aperturas" },
    { exerciseId: "ex-fondos" },
    { exerciseId: "ex-dominadas" },
    { exerciseId: "ex-remo-barra" },
    { exerciseId: "ex-jalon-polea" },
    { exerciseId: "ex-peso-muerto" },
    { exerciseId: "ex-press-militar" },
    { exerciseId: "ex-elevaciones-laterales" },
    { exerciseId: "ex-press-arnold" },
    { exerciseId: "ex-curl-barra" },
    { exerciseId: "ex-curl-martillo" },
    { exerciseId: "ex-extensiones-triceps" },
    { exerciseId: "ex-fondos-triceps" },
    { exerciseId: "ex-sentadilla" },
    { exerciseId: "ex-prensa" },
    { exerciseId: "ex-extension-cuadriceps" },
    { exerciseId: "ex-curl-femoral" },
    { exerciseId: "ex-peso-muerto-rumano" },
    { exerciseId: "ex-hip-thrust" },
    { exerciseId: "ex-zancadas" },
    { exerciseId: "ex-elevaciones-gemelos" },
    { exerciseId: "ex-gemelos-sentado" },
    { exerciseId: "ex-plancha" },
    { exerciseId: "ex-crunch" },
    { exerciseId: "ex-rueda-abdomen" },
    { exerciseId: "ex-burpee" },
    { exerciseId: "ex-clean-press" },
  ];
}

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  return <EditarEjercicioClient exerciseId={exerciseId} />;
}
