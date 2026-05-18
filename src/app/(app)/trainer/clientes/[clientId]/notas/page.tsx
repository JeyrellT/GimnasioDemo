import NotasPageContent from "./notas-page-content";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface NotasPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function NotasPage({ params }: NotasPageProps) {
  const { clientId } = await params;
  return <NotasPageContent clientId={clientId} />;
}
