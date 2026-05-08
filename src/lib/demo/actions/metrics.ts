// =============================================================================
// VIZION — Demo actions: body metrics
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, tryCatch } from "@/lib/result";
import * as store from "../store";
import type { ActionResult } from "@/types/api";
import type { DemoMetricRow } from "@/lib/offline/db";

const DEMO_CLIENT_ID = "client-ana";

export async function listMetrics(clientUserId?: string): Promise<ActionResult<DemoMetricRow[]>> {
  return tryCatch(async () => {
    return store.listMetricsForClient(clientUserId ?? DEMO_CLIENT_ID);
  });
}

export async function getLatestMetric(clientUserId?: string): Promise<ActionResult<DemoMetricRow | null>> {
  return tryCatch(async () => {
    const result = await store.getLatestMetric(clientUserId ?? DEMO_CLIENT_ID);
    return result ?? null;
  });
}

export async function recordBodyMetric(raw: unknown): Promise<ActionResult<{ metricId: string; bmi: number | null }>> {
  return tryCatch(async () => {
    const input = raw as {
      clientUserId?: string;
      weightKg?: number;
      bodyFatPct?: number;
      muscleMassKg?: number;
      waistCm?: number;
      hipCm?: number;
      neckCm?: number;
      chestCm?: number;
      armCm?: number;
      thighCm?: number;
      source?: "MANUAL" | "OCR_SCALE" | "CONNECTED_DEVICE";
      notes?: string;
    };

    const clientUserId = input.clientUserId ?? DEMO_CLIENT_ID;
    const id = `metric-demo-${Date.now()}`;

    await db.demoMetrics.put({
      id,
      clientUserId,
      recordedAt: new Date().toISOString(),
      weightKg: input.weightKg ?? null,
      bodyFatPct: input.bodyFatPct ?? null,
      muscleMassKg: input.muscleMassKg ?? null,
      waistCm: input.waistCm ?? null,
      hipCm: input.hipCm ?? null,
      neckCm: input.neckCm ?? null,
      chestCm: input.chestCm ?? null,
      armCm: input.armCm ?? null,
      thighCm: input.thighCm ?? null,
      source: input.source ?? "MANUAL",
      notes: input.notes ?? null,
    });

    const client = await db.demoClients.get(clientUserId);
    const bmi =
      input.weightKg && client?.heightCm
        ? Math.round((input.weightKg / Math.pow(client.heightCm / 100, 2)) * 10) / 10
        : null;

    return { metricId: id, bmi };
  });
}
