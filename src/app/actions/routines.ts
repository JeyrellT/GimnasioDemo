// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  createRoutineTemplate,
  updateRoutineTemplate,
  archiveRoutine,
  deleteRoutine,
  duplicateRoutine,
  addRoutineDay,
  updateRoutineDay,
  deleteRoutineDay,
  addExerciseToDay,
  removeExerciseFromDay,
  updateExerciseInDay,
  reorderExercises,
  assignRoutineToClient,
  addRoutineComment,
  listMyRoutines,
  getClientRoutines,
} from "@/server/actions/routines.actions";
