import SesionesPageContent from "./sesiones-page-content";

export async function generateStaticParams() {
  return [
    { clientId: "client-ana" },
    { clientId: "client-bruno" },
    { clientId: "client-carlos" },
    { clientId: "client-diana" },
  ];
}

interface Params {
  params: Promise<{ clientId: string }>;
}

export default async function ClienteSesionesPage({ params }: Params) {
  const { clientId } = await params;
  return <SesionesPageContent clientId={clientId} />;
}
