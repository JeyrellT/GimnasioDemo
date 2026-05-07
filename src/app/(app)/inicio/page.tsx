import { TrainerDashboardClient } from "./trainer-dashboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function InicioPage() {
  return <TrainerDashboardClient />;
}
