import { BarChart2, ClipboardList, Timer, type LucideIcon } from "lucide-react";

export interface BrandingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const BRANDING_FEATURES: BrandingFeature[] = [
  {
    icon: ClipboardList,
    title: "Rutinas a medida",
    description:
      "Creá plantillas con días, ejercicios, series y RPE. Asignalas a tus clientes en segundos.",
  },
  {
    icon: Timer,
    title: "Sesiones en el gym",
    description:
      "Registrá cada set con timer de descanso automático. Funciona sin red y sincroniza cuando vuelve.",
  },
  {
    icon: BarChart2,
    title: "Métricas reales",
    description:
      "Peso, PRs, adherencia y volumen semanal. Datos que importan, sin ruido.",
  },
];
