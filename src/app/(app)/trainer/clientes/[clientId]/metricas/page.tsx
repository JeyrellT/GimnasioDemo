import MetricasPageContent from "./metricas-page-content";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface MetricasPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function MetricasPage({ params }: MetricasPageProps) {
  const { clientId } = await params;
  return <MetricasPageContent clientId={clientId} />;
}
