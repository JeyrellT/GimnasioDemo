"use client";

import { useDemoUser } from "@/lib/demo/auth-context";
import { TrainerDashboardClient } from "./trainer-dashboard-client";
import { ClientDashboardClient } from "./client-dashboard-client";

export default function InicioPage() {
  const user = useDemoUser();

  if (user.role === "CLIENT") {
    return <ClientDashboardClient userId={user.id} name={user.name} />;
  }

  return <TrainerDashboardClient />;
}
