import AsignarClient from "./_client";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

export default async function AsignarPage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  return <AsignarClient routineId={routineId} />;
}
