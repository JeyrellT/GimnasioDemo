import { db } from "@/lib/offline/db";

const DEMO_TABLES = [
  db.demoClients,
  db.demoTrainerClients,
  db.demoMetrics,
  db.demoRoutines,
  db.demoAssignedRoutines,
  db.demoSessions,
  db.demoLocations,
  db.demoLocationVisits,
  db.demoExpenses,
  db.demoSales,
  db.demoExercises,
  db.demoOnboardingDrafts,
] as const;

export async function resetDemoData(): Promise<void> {
  await db.transaction("rw", [...DEMO_TABLES], async () => {
    for (const table of DEMO_TABLES) {
      await table.clear();
    }
  });
}
