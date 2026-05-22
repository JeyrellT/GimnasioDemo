// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  searchExercises,
  getExerciseDetail,
  createPrivateExercise,
  updateExerciseFromForm as updateExercise,
  updateExerciseInstructions,
  deleteExercise,
  setExerciseTrainerMedia,
} from "@/server/actions/exercises.actions";
