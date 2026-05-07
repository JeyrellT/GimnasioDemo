import ClientProfilePageContent from "./client-profile-page-content";

export async function generateStaticParams() {
  return [
    { clientId: "client-ana" },
    { clientId: "client-bruno" },
    { clientId: "client-carlos" },
    { clientId: "client-diana" },
  ];
}

interface ClientProfilePageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientProfilePage({ params }: ClientProfilePageProps) {
  const { clientId } = await params;
  return <ClientProfilePageContent clientId={clientId} />;
}
