// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  searchExercises,
  getExerciseDetail,
  createPrivateExercise,
  updateExerciseFromForm as updateExercise,
  deleteExercise,
} from "@/server/actions/exercises.actions";
