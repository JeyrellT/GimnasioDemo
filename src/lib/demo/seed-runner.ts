// =============================================================================
// FORJA — Demo seed runner
// Idempotent: checks KV flag before seeding. Call from layout or provider.
// =============================================================================

import { db } from "@/lib/offline/db";
import {
  DEMO_CLIENTS,
  DEMO_TRAINER_CLIENTS,
  DEMO_EXERCISES,
  DEMO_ROUTINES,
  DEMO_ASSIGNED_ROUTINES,
  DEMO_SESSIONS,
  DEMO_METRICS,
  DEMO_LOCATIONS,
  DEMO_LOCATION_VISITS,
  DEMO_EXPENSES,
  DEMO_SALES,
} from "./seed-data";

const SEED_KEY = "demo_seeded_v1";

export async function ensureDemoSeeded(): Promise<void> {
  const flag = await db.kvStore.get(SEED_KEY);
  if (flag) return;

  await db.transaction(
    "rw",
    [
      db.demoClients,
      db.demoTrainerClients,
      db.demoExercises,
      db.demoRoutines,
      db.demoAssignedRoutines,
      db.demoSessions,
      db.demoMetrics,
      db.demoLocations,
      db.demoLocationVisits,
      db.demoExpenses,
      db.demoSales,
      db.demoOnboardingDrafts,
      db.kvStore,
    ],
    async () => {
      await db.demoClients.bulkPut(DEMO_CLIENTS);
      await db.demoTrainerClients.bulkPut(DEMO_TRAINER_CLIENTS);
      await db.demoExercises.bulkPut(DEMO_EXERCISES);
      await db.demoRoutines.bulkPut(DEMO_ROUTINES);
      await db.demoAssignedRoutines.bulkPut(DEMO_ASSIGNED_ROUTINES);
      await db.demoSessions.bulkPut(DEMO_SESSIONS);
      await db.demoMetrics.bulkPut(DEMO_METRICS);
      await db.demoLocations.bulkPut(DEMO_LOCATIONS);
      await db.demoLocationVisits.bulkPut(DEMO_LOCATION_VISITS);
      await db.demoExpenses.bulkPut(DEMO_EXPENSES);
      await db.demoSales.bulkPut(DEMO_SALES);
      await db.kvStore.put({ key: SEED_KEY, value: Date.now() });
    },
  );

  console.info("[forja-demo] seed v1 completed");
}

export async function resetDemoData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.demoClients,
      db.demoTrainerClients,
      db.demoExercises,
      db.demoRoutines,
      db.demoAssignedRoutines,
      db.demoSessions,
      db.demoMetrics,
      db.demoLocations,
      db.demoLocationVisits,
      db.demoExpenses,
      db.demoSales,
      db.demoOnboardingDrafts,
      db.kvStore,
    ],
    async () => {
      await db.demoClients.clear();
      await db.demoTrainerClients.clear();
      await db.demoExercises.clear();
      await db.demoRoutines.clear();
      await db.demoAssignedRoutines.clear();
      await db.demoSessions.clear();
      await db.demoMetrics.clear();
      await db.demoLocations.clear();
      await db.demoLocationVisits.clear();
      await db.demoExpenses.clear();
      await db.demoSales.clear();
      await db.demoOnboardingDrafts.clear();
      await db.kvStore.delete(SEED_KEY);
    },
  );

  await ensureDemoSeeded();
  console.info("[forja-demo] data reset and re-seeded");
}
