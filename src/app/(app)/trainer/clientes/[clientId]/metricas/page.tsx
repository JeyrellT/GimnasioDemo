import MetricasPageContent from "./metricas-page-content";

export async function generateStaticParams() {
  return [
    { clientId: "client-ana" },
    { clientId: "client-bruno" },
    { clientId: "client-carlos" },
    { clientId: "client-diana" },
  ];
}

interface MetricasPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function MetricasPage({ params }: MetricasPageProps) {
  const { clientId } = await params;
  return <MetricasPageContent clientId={clientId} />;
}
