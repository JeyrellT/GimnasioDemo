import ClientProfilePageContent from "./client-profile-page-content";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface ClientProfilePageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientProfilePage({ params }: ClientProfilePageProps) {
  const { clientId } = await params;
  return <ClientProfilePageContent clientId={clientId} />;
}
