// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  registerUser,
  requestMagicLink,
  updateProfile,
  updateTrainerProfile,
} from "@/server/actions/auth.actions";
