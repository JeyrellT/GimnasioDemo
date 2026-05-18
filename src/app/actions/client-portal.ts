"use server";

// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  getMyTrainerInfo,
  getMyAssignedRoutines,
  getMyActiveRoutine,
  getMySessionHistory,
  getSessionDetail,
  getMyMetrics,
  recordBodyMetric,
} from "@/server/actions/client-portal.actions";
