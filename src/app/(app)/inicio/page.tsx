"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { TrainerDashboardClient } from "./trainer-dashboard-client";
import { ClientDashboardClient } from "./client-dashboard-client";

export default function InicioPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) router.replace("/admin");
  }, [isAdmin, router]);

  if (!user || isAdmin) return null;

  if (user.role === "CLIENT") {
    return <ClientDashboardClient userId={user.id} name={user.name} />;
  }

  return <TrainerDashboardClient trainerName={user.name} />;
}
