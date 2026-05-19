// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  registerUser,
  requestMagicLink,
  updateProfile,
  updateTrainerProfile,
  searchTrainersByName,
} from "@/server/actions/auth.actions";
export type { TrainerSearchResult } from "@/server/actions/auth.actions";
