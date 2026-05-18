"use server";

// PRODUCTION — re-exports from real server actions (Prisma / PostgreSQL)
export {
  listMetrics,
  getLatestMetric,
  recordBodyMetric,
} from "@/server/actions/metrics.actions";
