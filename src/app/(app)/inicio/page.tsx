"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { TrainerDashboardClient } from "./trainer-dashboard-client";
import { ClientDashboardClient } from "./client-dashboard-client";

export default function InicioPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "CLIENT") {
    return <ClientDashboardClient userId={user.id} name={user.name} />;
  }

  return <TrainerDashboardClient />;
}
