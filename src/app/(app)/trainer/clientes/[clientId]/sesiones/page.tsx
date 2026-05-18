import SesionesPageContent from "./sesiones-page-content";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface Params {
  params: Promise<{ clientId: string }>;
}

export default async function ClienteSesionesPage({ params }: Params) {
  const { clientId } = await params;
  return <SesionesPageContent clientId={clientId} />;
}
