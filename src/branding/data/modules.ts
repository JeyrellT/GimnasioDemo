export interface BrandingModule {
  num: string;
  title: string;
  desc: string;
  metaLeft: string;
  metaRight: string;
  /** Opcional: ruta de imagen de fondo. Si presente, la card renderiza con overlay oscuro para legibilidad. */
  bgImage?: string;
}

export const BRANDING_MODULES: BrandingModule[] = [
  {
    num: "/ 01",
    title: "Rutinas",
    desc: "Constructor con días, ejercicios, series y RPE. Plantillas reutilizables. Asignás a un cliente o a un grupo con un tap.",
    metaLeft: "Builder",
    metaRight: "+ Plantillas",
  },
  {
    num: "/ 02",
    title: "Sesiones offline",
    desc: "Tus clientes registran cada set sin señal. Timer de descanso automático. Sincronización al volver online. Funciona en el gym de sótano.",
    metaLeft: "Offline-first",
    metaRight: "+ PWA",
  },
  {
    num: "/ 03",
    title: "Métricas reales",
    desc: "PRs, adherencia, volumen semanal y body metrics. Gráficos por cliente. Sabés quién progresa y quién se cae.",
    metaLeft: "Por cliente",
    metaRight: "+ Trends",
  },
  {
    num: "/ 04",
    title: "Clientes",
    desc: "Roster con perfiles, objetivos, PAR-Q y consentimientos LPDP. Onboarding guiado. Portal del cliente incluido.",
    metaLeft: "Multi-rol",
    metaRight: "+ LPDP CR",
  },
  {
    num: "/ 05",
    title: "Finanzas",
    desc: "Ingresos, gastos categorizados, facturas y cobros. P&L mensual. Es tu contabilidad operativa, no solo workouts.",
    metaLeft: "Mensual",
    metaRight: "+ Facturación",
  },
  {
    num: "/ 06",
    title: "Tu marca",
    desc: "Logo, paleta y branding personalizable. La app se ve como tu negocio, no como Blackline. Tus clientes ven tu marca, no la nuestra.",
    metaLeft: "White-label",
    metaRight: "+ Identidad",
  },
];
