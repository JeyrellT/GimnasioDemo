// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  registerUser,
  requestMagicLink,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updateTrainerProfile,
  searchTrainersByName,
  uploadAvatar,
  deleteAvatar,
} from "@/server/actions/auth.actions";
export type { TrainerSearchResult } from "@/server/actions/auth.actions";
