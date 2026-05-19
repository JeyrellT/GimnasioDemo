// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  getTrainerBranding,
  getClientTrainerBranding,
  updateTrainerBranding,
} from "@/server/actions/branding.actions";

export type { TrainerBrandingData } from "@/server/actions/branding.actions";
