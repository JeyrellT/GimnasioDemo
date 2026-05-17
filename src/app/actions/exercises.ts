// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  searchExercises,
  getExerciseDetail,
  createPrivateExercise,
  updateExercise,
  deleteExercise,
} from "@/server/actions/exercises.actions";
