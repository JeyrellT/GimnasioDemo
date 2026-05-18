import RutinasPageContent from "./rutinas-page-content";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface Params {
  params: Promise<{ clientId: string }>;
}

export default async function ClienteRutinasPage({ params }: Params) {
  const { clientId } = await params;
  return <RutinasPageContent clientId={clientId} />;
}
