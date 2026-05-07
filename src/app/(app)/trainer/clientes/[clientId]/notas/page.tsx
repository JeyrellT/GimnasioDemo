import NotasPageContent from "./notas-page-content";

export async function generateStaticParams() {
  return [
    { clientId: "client-ana" },
    { clientId: "client-bruno" },
    { clientId: "client-carlos" },
    { clientId: "client-diana" },
  ];
}

interface NotasPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function NotasPage({ params }: NotasPageProps) {
  const { clientId } = await params;
  return <NotasPageContent clientId={clientId} />;
}
