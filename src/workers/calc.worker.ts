/**
 * Web Worker de cálculos — Forja
 *
 * Ejecuta cálculos pesados (TMB, TDEE, 1RM, volumen, macros) fuera del hilo principal
 * para no bloquear la UI durante el onboarding y la ejecución de sesiones.
 *
 * Protocolo de mensajes:
 * IN:  { id: string; op: CalcOperation; params: unknown }
 * OUT: { id: string; result: unknown } | { id: string; error: string }
 *
 * El campo `id` permite correlacionar respuestas con requests en el hilo principal.
 * Usar un UUID v4 generado en el llamador es la convención.
 *
 * PRIVACIDAD (Ley 8968): este worker NUNCA envía datos a redes externas.
 * Todos los cálculos son determinísticos y locales.
 */

import {
  recommendedTmb,
  type RecommendedTmbParams,
} from "@/lib/calc/tmb";

import {
  calculateTdee,
  tdeeWithDeficit,
  type TdeeParams,
} from "@/lib/calc/tdee";

import {
  predictOneRM,
  type OneRmParams,
} from "@/lib/calc/one-rm";

import {
  sessionVolumeByMuscle,
  weeklyVolumeByMuscle,
  type SetEntry,
  type SessionEntry,
} from "@/lib/calc/volume";

import {
  recommendMacros,
  type MacrosParams,
} from "@/lib/calc/macros";

import {
  calculateBmi,
  classifyBmi,
  type BmiParams,
} from "@/lib/calc/bmi";

// --- Tipos del protocolo de mensajes ---

export type CalcOperation =
  | "tmb"
  | "tdee"
  | "tdee_with_deficit"
  | "1rm"
  | "volume_session"
  | "volume_weekly"
  | "macros"
  | "bmi";

export interface WorkerRequest {
  id: string;
  op: CalcOperation;
  params: unknown;
}

export interface WorkerResponse {
  id: string;
  result?: unknown;
  error?: string;
}

// Params tipados por operación
interface TdeeWithDeficitParams {
  tdee: number;
  deficitPct: number;
}

interface VolumeSessionParams {
  sets: SetEntry[];
}

interface VolumeWeeklyParams {
  sessions: SessionEntry[];
  weekStart: string; // ISO string — Date no es serializable en postMessage sin esfuerzo extra
}

interface BmiFullParams extends BmiParams {
  classify?: boolean;
}

/**
 * Dispatcher principal.
 * Cada case delega al módulo correspondiente en src/lib/calc/*.
 */
function dispatch(op: CalcOperation, params: unknown): unknown {
  switch (op) {
    case "tmb": {
      return recommendedTmb(params as RecommendedTmbParams);
    }

    case "tdee": {
      return calculateTdee(params as TdeeParams);
    }

    case "tdee_with_deficit": {
      return tdeeWithDeficit(params as TdeeWithDeficitParams);
    }

    case "1rm": {
      return predictOneRM(params as OneRmParams);
    }

    case "volume_session": {
      const { sets } = params as VolumeSessionParams;
      return sessionVolumeByMuscle(sets);
    }

    case "volume_weekly": {
      const { sessions, weekStart } = params as VolumeWeeklyParams;
      // Reconstruir Dates desde ISO strings (postMessage serializa a primitivos)
      const sessionsWithDates: SessionEntry[] = sessions.map((s) => ({
        ...s,
        date: new Date(s.date as unknown as string),
      }));
      return weeklyVolumeByMuscle(sessionsWithDates, new Date(weekStart));
    }

    case "macros": {
      return recommendMacros(params as MacrosParams);
    }

    case "bmi": {
      const { weightKg, heightCm, classify } = params as BmiFullParams;
      const bmiValue = calculateBmi({ weightKg, heightCm });
      if (classify) {
        return { bmi: bmiValue, classification: classifyBmi(bmiValue) };
      }
      return { bmi: bmiValue };
    }

    default: {
      // Exhaustive check — TypeScript debería capturar esto en compile-time
      const exhaustive: never = op;
      throw new Error(`Operación desconocida: ${String(exhaustive)}`);
    }
  }
}

// --- Handler del Worker ---

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, op, params } = event.data;

  if (!id || !op) {
    // Mensaje malformado — no hay id para responder, log silencioso
    return;
  }

  try {
    const result = dispatch(op, params);
    const response: WorkerResponse = { id, result };
    self.postMessage(response);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Error desconocido en Worker";
    const response: WorkerResponse = { id, error: errorMsg };
    self.postMessage(response);
  }
};

// Exportación vacía para que TypeScript trate este archivo como módulo ES
export {};
