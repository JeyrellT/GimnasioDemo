// =============================================================================
// BLACKLINE FITNESS — Assistant tool registry
// Owner: ai-orchestrator.
//
// Each tool declares a FunctionDeclaration the model sees + a handler that
// calls the matching server action. Tool handlers are async and run from the
// browser — Next.js server actions enforce auth/ownership server-side.
//
// Phase 1: read tools (search/list/get) — execute immediately.
// Phase 2: write tools (create/assign/record) — gated by confirmation card.
//
// To register a new tool:
//   1. Define an args interface and an AssistantTool<Args> constant.
//   2. Set kind: "read" for safe lookups, "write" for anything mutating.
//   3. Append the constant to ASSISTANT_TOOLS at the bottom.
// =============================================================================

"use client";

import { SchemaType } from "@google/generative-ai";

import { searchExercises, createPrivateExercise } from "@/app/actions/exercises";
import { listMyClients, getClientProfileDetail } from "@/app/actions/clients";
import {
  listMyRoutines,
  getRoutine,
  createRoutineTemplate,
  addExerciseToDay,
  assignRoutineToClient,
} from "@/app/actions/routines";
import { recordBodyMetric } from "@/app/actions/metrics";
import { searchKnowledge } from "@/app/actions/knowledge";

import type { AssistantTool } from "./types";

// -----------------------------------------------------------------------------
// search_exercises
// -----------------------------------------------------------------------------

interface SearchExercisesArgs {
  query?: string;
  primaryMuscle?: string;
  equipment?: string;
}

const searchExercisesTool: AssistantTool<SearchExercisesArgs> = {
  kind: "read",
  declaration: {
    name: "search_exercises",
    description:
      "Busca ejercicios en el catálogo de Blackline Fitness por nombre, músculo o equipamiento. Llamalo cuando el coach pregunte por ejercicios disponibles, alternativas, o quiera saber qué ejercicios existen para cierto músculo. Devuelve hasta 20 coincidencias con id, nombre y músculo principal.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description:
            "Texto libre — por ejemplo 'press inclinado', 'curl bíceps', 'sentadilla'. Opcional si se pasa un filtro de músculo/equipo.",
        },
        primaryMuscle: {
          type: SchemaType.STRING,
          description:
            "Filtro por músculo principal. Valores: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, ABS, OBLIQUES, GLUTES, QUADS, HAMSTRINGS, CALVES, NECK, FULL_BODY.",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "Filtro por equipamiento. Valores: BODYWEIGHT, BARBELL, DUMBBELL, KETTLEBELL, MACHINE, CABLE, BAND, OTHER.",
        },
      },
    },
  },
  summarize: (args) => {
    const parts: string[] = [];
    if (args.query) parts.push(`"${args.query}"`);
    if (args.primaryMuscle) parts.push(`músculo=${args.primaryMuscle}`);
    if (args.equipment) parts.push(`equipo=${args.equipment}`);
    return `Buscando ejercicios: ${parts.join(", ") || "todos"}`;
  },
  handler: async (args) => {
    const res = await searchExercises({
      query: args.query,
      primaryMuscle: args.primaryMuscle,
      equipment: args.equipment,
      limit: 20,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { exercises: Array<{ id: string; nameEs: string; primaryMuscle: string; equipment: string }>; total: number };
    return {
      total: r.total,
      results: r.exercises.slice(0, 20).map((e) => ({
        id: e.id,
        nameEs: e.nameEs,
        primaryMuscle: e.primaryMuscle,
        equipment: e.equipment,
      })),
    };
  },
};

// -----------------------------------------------------------------------------
// list_my_clients
// -----------------------------------------------------------------------------

interface ListMyClientsArgs {
  search?: string;
  status?: string;
}

const listMyClientsTool: AssistantTool<ListMyClientsArgs> = {
  kind: "read",
  declaration: {
    name: "list_my_clients",
    description:
      "Lista los clientes del coach autenticado. Usalo para resolver nombres a clientIds antes de hacer cualquier otra operación sobre un cliente. Por defecto devuelve activos; pasar status='ALL' para incluir pausados/terminados.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description:
            "Texto libre para buscar por nombre o apellido del cliente. Opcional.",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "Filtro de estado. Valores: ACTIVE, PENDING, PAUSED, ENDED, ALL. Default: ACTIVE.",
        },
      },
    },
  },
  summarize: (args) => {
    if (args.search) return `Buscando clientes: "${args.search}"`;
    if (args.status && args.status !== "ACTIVE") return `Listando clientes (${args.status})`;
    return "Listando clientes activos";
  },
  handler: async (args) => {
    const res = await listMyClients(args.search, args.status);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as {
      clients: Array<{ id: string; name: string; email: string; status: string }>;
      total: number;
    };
    return {
      total: r.total,
      clients: r.clients.map((c) => ({
        clientId: c.id,
        nombre: c.name,
        email: c.email,
        status: c.status,
      })),
    };
  },
};

// -----------------------------------------------------------------------------
// list_my_routines
// -----------------------------------------------------------------------------

interface ListMyRoutinesArgs {
  goal?: string;
  archived?: boolean;
}

const listMyRoutinesTool: AssistantTool<ListMyRoutinesArgs> = {
  kind: "read",
  declaration: {
    name: "list_my_routines",
    description:
      "Lista las plantillas de rutina del coach. Devuelve id, nombre, objetivo, días de split y duración. Usalo antes de asignar/duplicar/comentar sobre una rutina existente.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        goal: {
          type: SchemaType.STRING,
          description:
            "Objetivo. Valores comunes: HYPERTROPHY, STRENGTH, ENDURANCE, FAT_LOSS, GENERAL — o un objetivo custom del coach.",
        },
        archived: {
          type: SchemaType.BOOLEAN,
          description: "Incluir solo archivadas (true) o solo activas (false). Default: activas.",
        },
      },
    },
  },
  summarize: (args) => {
    if (args.goal) return `Listando rutinas (objetivo: ${args.goal})`;
    if (args.archived) return "Listando rutinas archivadas";
    return "Listando rutinas activas";
  },
  handler: async (args) => {
    const res = await listMyRoutines({ goal: args.goal, archived: args.archived });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as Array<{ id: string; name: string; goal: string; splitDays: number; durationWeeks: number; isArchived: boolean }>;
    return {
      total: r.length,
      routines: r.map((rt) => ({
        id: rt.id,
        name: rt.name,
        goal: rt.goal,
        splitDays: rt.splitDays,
        durationWeeks: rt.durationWeeks,
        isArchived: rt.isArchived,
      })),
    };
  },
};

// -----------------------------------------------------------------------------
// get_client_profile
// -----------------------------------------------------------------------------

interface GetClientProfileArgs {
  clientId: string;
}

const getClientProfileTool: AssistantTool<GetClientProfileArgs> = {
  kind: "read",
  declaration: {
    name: "get_client_profile",
    description:
      "Trae el perfil completo de un cliente: datos básicos, métricas recientes (peso, % grasa), última rutina activa y resumen de sesiones completadas. Necesita el clientId — usualmente obtenido primero con list_my_clients.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientId: {
          type: SchemaType.STRING,
          description: "El clientId devuelto por list_my_clients.",
        },
      },
      required: ["clientId"],
    },
  },
  summarize: (args) => `Cargando perfil del cliente ${args.clientId.slice(0, 8)}…`,
  handler: async (args) => {
    const res = await getClientProfileDetail(args.clientId);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    // Profile is a big object — return a curated subset to save tokens.
    if (!result) return { found: false };
    const r = result as {
      user: { name: string; email: string; dateOfBirth: string | null; gender: string | null };
      profile: { goal: string | null; weightKg: number | null; heightCm: number | null } | null;
      latestMetric: { weightKg: number | null; bodyFatPct: number | null } | null;
      activeRoutine: { name: string } | null;
      stats: { totalSessions: number; currentStreak: number; weightDelta28d: number | null };
      adherence7d: number | null;
      adherence30d: number | null;
    };
    return {
      nombre: r.user.name,
      email: r.user.email,
      genero: r.user.gender,
      objetivo: r.profile?.goal ?? null,
      pesoKg: r.latestMetric?.weightKg ?? r.profile?.weightKg ?? null,
      grasaPct: r.latestMetric?.bodyFatPct ?? null,
      alturaCm: r.profile?.heightCm ?? null,
      rutinaActiva: r.activeRoutine?.name ?? null,
      sesionesTotales: r.stats.totalSessions,
      rachaActual: r.stats.currentStreak,
      cambioPesoUltimos28d: r.stats.weightDelta28d,
      adherencia7d: r.adherence7d,
      adherencia30d: r.adherence30d,
    };
  },
};

// -----------------------------------------------------------------------------
// get_routine_detail (read) — needed to discover RoutineDay IDs for
// add_exercise_to_day. Without this, the model has no way to obtain the
// dayId after listing routines.
// -----------------------------------------------------------------------------

interface GetRoutineDetailArgs {
  routineId: string;
}

const getRoutineDetailTool: AssistantTool<GetRoutineDetailArgs> = {
  kind: "read",
  declaration: {
    name: "get_routine_detail",
    description:
      "Trae el detalle completo de una rutina: nombre, objetivo, splitDays y la lista de días con sus IDs y ejercicios actuales. Llamalo ANTES de agregar ejercicios a un día (necesitás el routineDayId).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        routineId: {
          type: SchemaType.STRING,
          description: "ID de la rutina obtenido de list_my_routines.",
        },
      },
      required: ["routineId"],
    },
  },
  summarize: (args) => `Cargando rutina ${args.routineId.slice(0, 8)}…`,
  handler: async (args) => {
    const res = await getRoutine(args.routineId);
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as {
      id: string;
      name: string;
      goal: string;
      splitDays: number;
      durationWeeks: number;
      days: Array<{
        id: string;
        dayIndex: number;
        name: string;
        exercises: Array<{ exercise: { nameEs: string }; order: number }>;
      }>;
    };
    return {
      id: r.id,
      name: r.name,
      goal: r.goal,
      splitDays: r.splitDays,
      durationWeeks: r.durationWeeks,
      days: r.days.map((d) => ({
        routineDayId: d.id,
        dayIndex: d.dayIndex,
        name: d.name,
        ejercicios: d.exercises
          .sort((a, b) => a.order - b.order)
          .map((e) => e.exercise.nameEs),
      })),
    };
  },
};

// -----------------------------------------------------------------------------
// search_knowledge (read) — corpus científico + contexto costarricense.
// Usalo para responder preguntas sobre evidencia (dosis-respuesta, volumen,
// intensidad, proteína, periodización, biomecánica, recuperación) y sobre
// instituciones / atletas / certificaciones de Costa Rica.
// -----------------------------------------------------------------------------

interface SearchKnowledgeArgs {
  query: string;
  tags?: string[];
  limit?: number;
}

const searchKnowledgeTool: AssistantTool<SearchKnowledgeArgs> = {
  kind: "read",
  declaration: {
    name: "search_knowledge",
    description:
      "Busca en la base de conocimiento técnico-científica de Blackline Fitness (ciencias del ejercicio, dosis-respuesta, biomecánica, recuperación, tendencias 2026, atletas e instituciones de Costa Rica). Llamalo SIEMPRE antes de responder preguntas sobre evidencia, recomendaciones de volumen/intensidad/proteína, periodización, o referentes locales — los hits traen citas en formato APA que debés incluir en tu respuesta.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description:
            "Texto libre. Usá términos técnicos cuando los conozcas (ej: 'volumen hipertrofia series semana', 'autorregulación RPE RIR', 'atletas CrossFit Costa Rica', 'PAR-Q derivación médica').",
        },
        tags: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            "Filtro opcional. Tags disponibles: hipertrofia, fuerza, cardio, movilidad, recuperacion, nutricion, principiante, intermedio, avanzado, periodizacion, volumen, biomecanica, anatomia, evaluacion, coaching, atletas-cr, instituciones-cr, costa-rica, certificaciones, tendencias-2026, evidencia, taxonomia.",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Máximo de chunks a devolver. Default 5, máximo 15.",
        },
      },
      required: ["query"],
    },
  },
  summarize: (args) => {
    const tagStr = args.tags?.length ? ` · tags: ${args.tags.join(", ")}` : "";
    return `Consultando base de conocimiento: "${args.query}"${tagStr}`;
  },
  handler: async (args) => {
    const res = await searchKnowledge({
      query: args.query,
      tags: args.tags,
      limit: args.limit ?? 5,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as {
      hits: Array<{
        title: string;
        section: string;
        excerpt: string;
        tags: string[];
        evidenceStrength: string | null;
        sourceDocument: string;
        rank: number;
      }>;
      total: number;
    };
    return {
      total: r.total,
      hits: r.hits.map((h) => ({
        section: h.section,
        title: h.title,
        excerpt: h.excerpt,
        tags: h.tags,
        evidenceStrength: h.evidenceStrength,
        sourceDocument: h.sourceDocument,
      })),
    };
  },
};

// =============================================================================
// WRITE TOOLS — all gated by a confirmation card. The model is instructed in
// the system prompt to gather all required parameters BEFORE emitting the call
// (we don't have a way to ask the coach mid-call).
// =============================================================================

// -----------------------------------------------------------------------------
// create_routine
// -----------------------------------------------------------------------------

interface CreateRoutineArgs {
  name: string;
  goal: string;
  splitDays: number;
  durationWeeks?: number;
  description?: string;
}

const createRoutineTool: AssistantTool<CreateRoutineArgs> = {
  kind: "write",
  declaration: {
    name: "create_routine",
    description:
      "Crea una plantilla de rutina nueva. Se generan automáticamente N días vacíos según splitDays (1-6). El coach puede agregarle ejercicios después con add_exercise_to_day. NO asigna automáticamente a ningún cliente.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Nombre descriptivo. Ej: 'PPL hipertrofia 6 días', 'Full body principiante'.",
        },
        goal: {
          type: SchemaType.STRING,
          description:
            "Objetivo principal. Valores: HYPERTROPHY, STRENGTH, ENDURANCE, FAT_LOSS, GENERAL — o un objetivo custom previamente creado por el coach.",
        },
        splitDays: {
          type: SchemaType.INTEGER,
          description: "Cantidad de días únicos por semana (1-6).",
        },
        durationWeeks: {
          type: SchemaType.INTEGER,
          description: "Semanas de duración del mesociclo. Default: 8.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Descripción opcional de la rutina.",
        },
      },
      required: ["name", "goal", "splitDays"],
    },
  },
  summarize: (args) =>
    `Crear rutina "${args.name}" — ${args.goal}, ${args.splitDays} días, ${args.durationWeeks ?? 8} semanas`,
  handler: async (args) => {
    const res = await createRoutineTemplate({
      name: args.name,
      description: args.description,
      goal: args.goal,
      splitDays: args.splitDays,
      durationWeeks: args.durationWeeks ?? 8,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { routineId: string; name: string };
    return { routineId: r.routineId, name: r.name, created: true };
  },
};

// -----------------------------------------------------------------------------
// create_private_exercise
// -----------------------------------------------------------------------------

interface CreatePrivateExerciseArgs {
  nameEs: string;
  instructionsEs: string;
  primaryMuscle: string;
  equipment: string;
  difficulty?: string;
  nameEn?: string;
  category?: string;
}

const createPrivateExerciseTool: AssistantTool<CreatePrivateExerciseArgs> = {
  kind: "write",
  declaration: {
    name: "create_private_exercise",
    description:
      "Crea un ejercicio privado del coach (no aparece en el catálogo público). Usalo cuando el coach quiera registrar una variante o ejercicio nuevo que no encontraste con search_exercises.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nameEs: {
          type: SchemaType.STRING,
          description: "Nombre en español. Ej: 'Press inclinado con mancuernas a 30°'.",
        },
        instructionsEs: {
          type: SchemaType.STRING,
          description:
            "Instrucciones de ejecución cortas (1-3 oraciones). Si el coach no las da, escribilas vos en base al nombre.",
        },
        primaryMuscle: {
          type: SchemaType.STRING,
          description:
            "Músculo principal. Valores: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, ABS, OBLIQUES, GLUTES, QUADS, HAMSTRINGS, CALVES, NECK, FULL_BODY.",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "Equipamiento. Valores: BODYWEIGHT, BARBELL, DUMBBELL, KETTLEBELL, MACHINE, CABLE, BAND, OTHER.",
        },
        difficulty: {
          type: SchemaType.STRING,
          description: "BEGINNER, INTERMEDIATE o ADVANCED. Default: INTERMEDIATE.",
        },
        nameEn: {
          type: SchemaType.STRING,
          description: "Nombre en inglés opcional.",
        },
        category: {
          type: SchemaType.STRING,
          description: "STRENGTH (default) o WARMUP.",
        },
      },
      required: ["nameEs", "instructionsEs", "primaryMuscle", "equipment"],
    },
  },
  summarize: (args) =>
    `Crear ejercicio "${args.nameEs}" — ${args.primaryMuscle} / ${args.equipment}`,
  handler: async (args) => {
    const res = await createPrivateExercise({
      nameEs: args.nameEs,
      nameEn: args.nameEn,
      instructionsEs: args.instructionsEs,
      primaryMuscle: args.primaryMuscle,
      equipment: args.equipment,
      difficulty: args.difficulty ?? "INTERMEDIATE",
      category: args.category,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { exerciseId: string };
    return { exerciseId: r.exerciseId, created: true };
  },
};

// -----------------------------------------------------------------------------
// add_exercise_to_day
// -----------------------------------------------------------------------------

interface AddExerciseToDayArgs {
  routineDayId: string;
  exerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restSeconds?: number;
  notes?: string;
}

const addExerciseToDayTool: AssistantTool<AddExerciseToDayArgs> = {
  kind: "write",
  declaration: {
    name: "add_exercise_to_day",
    description:
      "Agrega un ejercicio existente a un día de una rutina. Necesitás el routineDayId (de get_routine_detail) y el exerciseId (de search_exercises o create_private_exercise). El `order` se calcula automáticamente.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        routineDayId: {
          type: SchemaType.STRING,
          description: "ID del RoutineDay obtenido con get_routine_detail.",
        },
        exerciseId: {
          type: SchemaType.STRING,
          description: "ID del ejercicio del catálogo o privado.",
        },
        targetSets: {
          type: SchemaType.INTEGER,
          description: "Series. Default: 3.",
        },
        targetRepsMin: {
          type: SchemaType.INTEGER,
          description: "Repeticiones mínimas. Default: 8.",
        },
        targetRepsMax: {
          type: SchemaType.INTEGER,
          description: "Repeticiones máximas. Default: 12.",
        },
        restSeconds: {
          type: SchemaType.INTEGER,
          description: "Descanso entre series en segundos. Default: 90.",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Notas de técnica/tempo/RPE para el coach. Opcional.",
        },
      },
      required: ["routineDayId", "exerciseId"],
    },
  },
  summarize: (args) => {
    const sets = args.targetSets ?? 3;
    const reps =
      args.targetRepsMin && args.targetRepsMax
        ? `${args.targetRepsMin}-${args.targetRepsMax}`
        : "8-12";
    return `Agregar ejercicio al día — ${sets}×${reps} reps, descanso ${args.restSeconds ?? 90}s`;
  },
  handler: async (args) => {
    const res = await addExerciseToDay({
      routineDayId: args.routineDayId,
      exerciseId: args.exerciseId,
      targetSets: args.targetSets,
      targetRepsMin: args.targetRepsMin,
      targetRepsMax: args.targetRepsMax,
      restSeconds: args.restSeconds,
      notes: args.notes ?? null,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { routineExerciseId: string };
    return { routineExerciseId: r.routineExerciseId, added: true };
  },
};

// -----------------------------------------------------------------------------
// record_body_metric
// -----------------------------------------------------------------------------

interface RecordBodyMetricArgs {
  clientUserId: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  notes?: string;
}

const recordBodyMetricTool: AssistantTool<RecordBodyMetricArgs> = {
  kind: "write",
  declaration: {
    name: "record_body_metric",
    description:
      "Registra una medición corporal de un cliente: peso, %grasa, masa muscular, cintura, etc. Al menos una métrica numérica debe estar presente. Usá list_my_clients primero para obtener el clientUserId.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientUserId: {
          type: SchemaType.STRING,
          description: "User id del cliente (el clientId que devuelve list_my_clients).",
        },
        weightKg: { type: SchemaType.NUMBER, description: "Peso en kilogramos." },
        bodyFatPct: { type: SchemaType.NUMBER, description: "Porcentaje de grasa corporal (0-60)." },
        muscleMassKg: { type: SchemaType.NUMBER, description: "Masa muscular en kg." },
        waistCm: { type: SchemaType.NUMBER, description: "Cintura en cm." },
        hipCm: { type: SchemaType.NUMBER, description: "Cadera en cm." },
        chestCm: { type: SchemaType.NUMBER, description: "Pecho en cm." },
        armCm: { type: SchemaType.NUMBER, description: "Brazo en cm." },
        thighCm: { type: SchemaType.NUMBER, description: "Muslo en cm." },
        notes: { type: SchemaType.STRING, description: "Observaciones del coach." },
      },
      required: ["clientUserId"],
    },
  },
  summarize: (args) => {
    const parts: string[] = [];
    if (args.weightKg !== undefined) parts.push(`peso ${args.weightKg}kg`);
    if (args.bodyFatPct !== undefined) parts.push(`grasa ${args.bodyFatPct}%`);
    if (args.muscleMassKg !== undefined) parts.push(`músculo ${args.muscleMassKg}kg`);
    if (args.waistCm !== undefined) parts.push(`cintura ${args.waistCm}cm`);
    if (args.hipCm !== undefined) parts.push(`cadera ${args.hipCm}cm`);
    if (args.chestCm !== undefined) parts.push(`pecho ${args.chestCm}cm`);
    if (args.armCm !== undefined) parts.push(`brazo ${args.armCm}cm`);
    if (args.thighCm !== undefined) parts.push(`muslo ${args.thighCm}cm`);
    return `Registrar medición — ${parts.join(", ") || "sin valores"}`;
  },
  handler: async (args) => {
    const res = await recordBodyMetric({
      clientUserId: args.clientUserId,
      weightKg: args.weightKg,
      bodyFatPct: args.bodyFatPct,
      muscleMassKg: args.muscleMassKg,
      waistCm: args.waistCm,
      hipCm: args.hipCm,
      chestCm: args.chestCm,
      armCm: args.armCm,
      thighCm: args.thighCm,
      notes: args.notes,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { metricId: string; bmi: number | null };
    return { metricId: r.metricId, bmi: r.bmi, saved: true };
  },
};

// -----------------------------------------------------------------------------
// assign_routine_to_client
// -----------------------------------------------------------------------------

interface AssignRoutineArgs {
  clientId: string;
  routineTemplateId: string;
  startsOn: string;
  trainerNotes?: string;
}

const assignRoutineTool: AssistantTool<AssignRoutineArgs> = {
  kind: "write",
  declaration: {
    name: "assign_routine_to_client",
    description:
      "Asigna una rutina a un cliente. La fecha de inicio (startsOn) debe ser ISO YYYY-MM-DD. Si el cliente ya tiene una rutina activa, ese assigned se cancela automáticamente.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientId: {
          type: SchemaType.STRING,
          description: "clientId de list_my_clients.",
        },
        routineTemplateId: {
          type: SchemaType.STRING,
          description: "ID de la rutina (list_my_routines o create_routine).",
        },
        startsOn: {
          type: SchemaType.STRING,
          description: "Fecha de inicio en formato YYYY-MM-DD.",
        },
        trainerNotes: {
          type: SchemaType.STRING,
          description: "Nota para el cliente sobre esta asignación.",
        },
      },
      required: ["clientId", "routineTemplateId", "startsOn"],
    },
  },
  summarize: (args) =>
    `Asignar rutina al cliente — inicio ${args.startsOn}${args.trainerNotes ? ` · nota: "${args.trainerNotes.slice(0, 60)}"` : ""}`,
  handler: async (args) => {
    const res = await assignRoutineToClient({
      clientId: args.clientId,
      routineTemplateId: args.routineTemplateId,
      startsOn: args.startsOn,
      trainerNotes: args.trainerNotes,
    });
    if (!res.ok) throw new Error(res.error.message);
    return res.value;
  },
  formatResult: (result) => {
    const r = result as { assignedRoutineId: string; status: string };
    return { assignedRoutineId: r.assignedRoutineId, status: r.status, assigned: true };
  },
};

// =============================================================================
// Registry
// =============================================================================

/**
 * Central catalog. Add new tools here. Keep declarations stable — renaming
 * a tool invalidates the model's running context (it won't find the name in
 * the registry mid-conversation).
 */
export const ASSISTANT_TOOLS: AssistantTool[] = [
  // -- read --
  searchExercisesTool as unknown as AssistantTool,
  listMyClientsTool as unknown as AssistantTool,
  listMyRoutinesTool as unknown as AssistantTool,
  getClientProfileTool as unknown as AssistantTool,
  getRoutineDetailTool as unknown as AssistantTool,
  searchKnowledgeTool as unknown as AssistantTool,
  // -- write --
  createRoutineTool as unknown as AssistantTool,
  createPrivateExerciseTool as unknown as AssistantTool,
  addExerciseToDayTool as unknown as AssistantTool,
  recordBodyMetricTool as unknown as AssistantTool,
  assignRoutineTool as unknown as AssistantTool,
];

export function findTool(name: string): AssistantTool | undefined {
  return ASSISTANT_TOOLS.find((t) => t.declaration.name === name);
}

export const TOOL_DECLARATIONS = ASSISTANT_TOOLS.map((t) => t.declaration);
