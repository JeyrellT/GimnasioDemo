"use client";

// =============================================================================
// BLACKLINE FITNESS — Coach AI tool declarations + executor
// Owner: ai-orchestrator.
//
// Defines the Gemini function-calling tools that the AI coach can invoke.
// Each tool maps to a server action — the AI decides when to call them.
//
// Tools exposed (10):
//   1. search_exercises   — Search exercise catalog
//   2. list_clients       — List trainer's clients
//   3. get_client_profile — Get detailed client info
//   4. list_routines      — List trainer's routines
//   5. get_routine_detail — Get full routine detail
//   6. create_routine     — Create new routine template
//   7. create_routine_from_ocr — Create routine from OCR data
//   8. record_body_metric — Record body measurements
//   9. assign_routine     — Assign routine to client
//  10. quick_add_client   — Add new client
// =============================================================================

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

import { searchExercises } from "@/app/actions/exercises";
import {
  listMyClients,
  getClientProfileDetail,
  quickAddClient,
} from "@/app/actions/clients";
import {
  listMyRoutines,
  getRoutine,
  createRoutineTemplate,
  createRoutineFromOcr,
  assignRoutineToClient,
} from "@/app/actions/routines";
import { recordBodyMetric } from "@/app/actions/metrics";

// -----------------------------------------------------------------------------
// Tool declarations (Gemini function calling schema)
// -----------------------------------------------------------------------------

export const COACH_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_exercises",
    description:
      "Busca ejercicios en el catalogo por nombre, musculo principal o equipamiento. Usa esto para encontrar ejercicios existentes antes de crear rutinas.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description:
            "Termino de busqueda (nombre del ejercicio en español o ingles). Ej: 'press banca', 'bench press', 'curl'",
        },
        muscle: {
          type: SchemaType.STRING,
          description: "Filtrar por grupo muscular principal",
          enum: [
            "CHEST",
            "BACK",
            "SHOULDERS",
            "BICEPS",
            "TRICEPS",
            "QUADS",
            "HAMSTRINGS",
            "GLUTES",
            "ABS",
            "CALVES",
            "FOREARMS",
            "TRAPS",
            "FULL_BODY",
          ],
        },
        equipment: {
          type: SchemaType.STRING,
          description: "Filtrar por tipo de equipamiento",
          enum: [
            "BARBELL",
            "DUMBBELL",
            "MACHINE",
            "CABLE",
            "BODYWEIGHT",
            "BAND",
            "KETTLEBELL",
            "EZ_BAR",
            "SMITH",
          ],
        },
      },
      required: [],
    },
  },
  {
    name: "list_clients",
    description:
      "Lista los clientes del entrenador. Puede filtrar por nombre o email.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Buscar por nombre o email del cliente",
        },
      },
      required: [],
    },
  },
  {
    name: "get_client_profile",
    description:
      "Obtiene el perfil completo de un cliente: datos personales, medidas, rutina activa, historial de sesiones, adherencia. Necesitas el clientUserId (obtenelo de list_clients).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientUserId: {
          type: SchemaType.STRING,
          description: "ID del usuario cliente",
        },
      },
      required: ["clientUserId"],
    },
  },
  {
    name: "list_routines",
    description:
      "Lista todas las plantillas de rutina del entrenador con nombre, objetivo, dias y estado.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_routine_detail",
    description:
      "Obtiene el detalle completo de una rutina: dias, ejercicios por dia, series, reps, descanso, notas.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        routineId: {
          type: SchemaType.STRING,
          description: "ID de la rutina",
        },
      },
      required: ["routineId"],
    },
  },
  {
    name: "create_routine",
    description:
      "Crea una nueva plantilla de rutina vacia (sin ejercicios). Luego podes agregar ejercicios a cada dia.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Nombre de la rutina. Ej: 'PPL Hipertrofia 6 dias'",
        },
        goal: {
          type: SchemaType.STRING,
          description: "Objetivo de la rutina",
          enum: [
            "HYPERTROPHY",
            "STRENGTH",
            "ENDURANCE",
            "FAT_LOSS",
            "GENERAL",
          ],
        },
        splitDays: {
          type: SchemaType.INTEGER,
          description: "Numero de dias de entrenamiento por semana (1-7)",
        },
        durationWeeks: {
          type: SchemaType.INTEGER,
          description: "Duracion en semanas (1-52)",
        },
      },
      required: ["name", "goal", "splitDays"],
    },
  },
  {
    name: "create_routine_from_ocr",
    description:
      "Crea una rutina completa desde datos extraidos por OCR de una imagen. Incluye dias y ejercicios con series, reps y descanso. Usa esto cuando el coach suba una imagen de rutina y confirme que quiere crearla.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Nombre de la rutina" },
        goal: {
          type: SchemaType.STRING,
          enum: [
            "HYPERTROPHY",
            "STRENGTH",
            "ENDURANCE",
            "FAT_LOSS",
            "GENERAL",
          ],
        },
        splitDays: { type: SchemaType.INTEGER },
        durationWeeks: { type: SchemaType.INTEGER },
        days: {
          type: SchemaType.ARRAY,
          description: "Dias de la rutina con ejercicios",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: {
                type: SchemaType.STRING,
                description: "Nombre del dia. Ej: 'Dia 1 — Empuje'",
              },
              exercises: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    nameEs: {
                      type: SchemaType.STRING,
                      description: "Nombre del ejercicio en español",
                    },
                    targetSets: { type: SchemaType.INTEGER },
                    targetRepsMin: { type: SchemaType.INTEGER },
                    targetRepsMax: { type: SchemaType.INTEGER },
                    restSeconds: { type: SchemaType.INTEGER },
                    notes: {
                      type: SchemaType.STRING,
                      description: "Notas opcionales",
                      nullable: true,
                    },
                  },
                  required: [
                    "nameEs",
                    "targetSets",
                    "targetRepsMin",
                    "targetRepsMax",
                    "restSeconds",
                  ],
                },
              },
            },
            required: ["name", "exercises"],
          },
        },
      },
      required: ["name", "goal", "splitDays", "durationWeeks", "days"],
    },
  },
  {
    name: "record_body_metric",
    description:
      "Registra medidas corporales de un cliente: peso, grasa corporal, masa muscular, circunferencias. Todos los campos son opcionales excepto que al menos uno debe tener valor.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientUserId: {
          type: SchemaType.STRING,
          description:
            "ID del cliente. Si no se proporciona, se registra para el usuario actual.",
          nullable: true,
        },
        weightKg: {
          type: SchemaType.NUMBER,
          description: "Peso en kilogramos",
          nullable: true,
        },
        bodyFatPct: {
          type: SchemaType.NUMBER,
          description: "Porcentaje de grasa corporal",
          nullable: true,
        },
        muscleMassKg: {
          type: SchemaType.NUMBER,
          description: "Masa muscular en kg",
          nullable: true,
        },
        waistCm: {
          type: SchemaType.NUMBER,
          description: "Circunferencia de cintura en cm",
          nullable: true,
        },
        hipCm: {
          type: SchemaType.NUMBER,
          description: "Circunferencia de cadera en cm",
          nullable: true,
        },
        chestCm: {
          type: SchemaType.NUMBER,
          description: "Circunferencia de pecho en cm",
          nullable: true,
        },
        armCm: {
          type: SchemaType.NUMBER,
          description: "Circunferencia de brazo en cm",
          nullable: true,
        },
        thighCm: {
          type: SchemaType.NUMBER,
          description: "Circunferencia de muslo en cm",
          nullable: true,
        },
        notes: {
          type: SchemaType.STRING,
          description: "Notas adicionales",
          nullable: true,
        },
      },
      required: [],
    },
  },
  {
    name: "assign_routine",
    description:
      "Asigna una plantilla de rutina a un cliente. Crea un snapshot congelado que el cliente puede ejecutar.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientId: {
          type: SchemaType.STRING,
          description:
            "ID del registro TrainerClient (obtenelo de list_clients o get_client_profile)",
        },
        routineTemplateId: {
          type: SchemaType.STRING,
          description:
            "ID de la plantilla de rutina (obtenelo de list_routines)",
        },
        startsOn: {
          type: SchemaType.STRING,
          description: "Fecha de inicio en formato ISO (YYYY-MM-DD)",
        },
        endsOn: {
          type: SchemaType.STRING,
          description: "Fecha de fin opcional en formato ISO (YYYY-MM-DD)",
          nullable: true,
        },
      },
      required: ["clientId", "routineTemplateId", "startsOn"],
    },
  },
  {
    name: "quick_add_client",
    description:
      "Agrega un nuevo cliente rapidamente por email. Envia invitacion automatica.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        email: {
          type: SchemaType.STRING,
          description: "Email del cliente",
        },
        name: {
          type: SchemaType.STRING,
          description: "Nombre del cliente (opcional)",
          nullable: true,
        },
      },
      required: ["email"],
    },
  },
];

// -----------------------------------------------------------------------------
// Human-readable labels for UI action cards
// -----------------------------------------------------------------------------

export const TOOL_LABELS: Record<string, string> = {
  search_exercises: "Buscando ejercicios",
  list_clients: "Consultando clientes",
  get_client_profile: "Cargando perfil del cliente",
  list_routines: "Consultando rutinas",
  get_routine_detail: "Cargando detalle de rutina",
  create_routine: "Creando rutina",
  create_routine_from_ocr: "Creando rutina desde imagen",
  record_body_metric: "Registrando medidas",
  assign_routine: "Asignando rutina",
  quick_add_client: "Agregando cliente",
};

export const TOOL_SUCCESS_LABELS: Record<string, string> = {
  search_exercises: "Ejercicios encontrados",
  list_clients: "Clientes consultados",
  get_client_profile: "Perfil cargado",
  list_routines: "Rutinas consultadas",
  get_routine_detail: "Rutina cargada",
  create_routine: "Rutina creada",
  create_routine_from_ocr: "Rutina importada",
  record_body_metric: "Medidas registradas",
  assign_routine: "Rutina asignada",
  quick_add_client: "Cliente agregado",
};

// -----------------------------------------------------------------------------
// Tool result type
// -----------------------------------------------------------------------------

export interface ToolCallResult {
  tool: string;
  args: Record<string, unknown>;
  success: boolean;
  data?: unknown;
  error?: string;
  label: string;
  /** Navigation hint for the UI (e.g., link to created routine) */
  navigateTo?: string;
}

// -----------------------------------------------------------------------------
// Executor — maps tool names to server actions
// -----------------------------------------------------------------------------

export async function executeCoachTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const label = TOOL_LABELS[name] ?? name;

  try {
    switch (name) {
      // ── Search exercises ────────────────────────────────────────────
      case "search_exercises": {
        const query = (args.query as string) ?? "";
        const filters: Record<string, string> = {};
        if (args.muscle) filters.muscle = args.muscle as string;
        if (args.equipment) filters.equipment = args.equipment as string;
        const result = await searchExercises(query, filters, 1, 20);
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: {
            count: result.value.exercises.length,
            exercises: result.value.exercises.map((e) => ({
              id: e.id,
              nameEs: e.nameEs,
              primaryMuscle: e.primaryMuscle,
              equipment: e.equipment,
              difficulty: e.difficulty,
            })),
          },
          label: `${TOOL_SUCCESS_LABELS[name]}: ${result.value.exercises.length} resultados`,
        };
      }

      // ── List clients ────────────────────────────────────────────────
      case "list_clients": {
        const search = args.search as string | undefined;
        const result = await listMyClients(search);
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: {
            count: result.value.clients.length,
            clients: result.value.clients.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              parqStatus: c.parqStatus,
              lastSessionAt: c.lastSessionAt,
            })),
          },
          label: `${TOOL_SUCCESS_LABELS[name]}: ${result.value.clients.length}`,
        };
      }

      // ── Get client profile ──────────────────────────────────────────
      case "get_client_profile": {
        const clientUserId = args.clientUserId as string;
        const result = await getClientProfileDetail(clientUserId);
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        if (!result.value)
          return { tool: name, args, success: false, error: "Cliente no encontrado", label };
        const p = result.value;
        return {
          tool: name,
          args,
          success: true,
          data: {
            name: p.user?.name,
            email: p.user?.email,
            goal: p.profile?.goal,
            latestWeight: p.latestMetric?.weightKg,
            latestBodyFat: p.latestMetric?.bodyFatPct,
            activeRoutine: p.activeRoutine
              ? { id: p.activeRoutine.id }
              : null,
            stats: p.stats,
            trainerNotes: p.trainerNotes,
          },
          label: TOOL_SUCCESS_LABELS[name]!,
        };
      }

      // ── List routines ───────────────────────────────────────────────
      case "list_routines": {
        const result = await listMyRoutines();
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: {
            count: result.value.length,
            routines: result.value.map((r) => ({
              id: r.id,
              name: r.name,
              goal: r.goal,
              splitDays: r.splitDays,
              durationWeeks: r.durationWeeks,
              isArchived: r.isArchived,
            })),
          },
          label: `${TOOL_SUCCESS_LABELS[name]}: ${result.value.length}`,
        };
      }

      // ── Get routine detail ──────────────────────────────────────────
      case "get_routine_detail": {
        const routineId = args.routineId as string;
        const result = await getRoutine(routineId);
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: TOOL_SUCCESS_LABELS[name]!,
          navigateTo: `/trainer/rutinas/${routineId}`,
        };
      }

      // ── Create routine (empty template) ─────────────────────────────
      case "create_routine": {
        const result = await createRoutineTemplate({
          name: args.name as string,
          goal: args.goal as string,
          splitDays: Number(args.splitDays) || 3,
          durationWeeks: Number(args.durationWeeks) || 8,
        });
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: `${TOOL_SUCCESS_LABELS[name]}: ${args.name}`,
          navigateTo: `/trainer/rutinas/${result.value.routineId}`,
        };
      }

      // ── Create routine from OCR ─────────────────────────────────────
      case "create_routine_from_ocr": {
        const result = await createRoutineFromOcr({
          name: args.name as string,
          goal: args.goal as string,
          splitDays: args.splitDays as number,
          durationWeeks: args.durationWeeks as number,
          days: args.days as Array<{
            name: string;
            exercises: Array<{
              nameEs: string;
              targetSets: number;
              targetRepsMin: number;
              targetRepsMax: number;
              restSeconds: number;
              notes: string | null;
            }>;
          }>,
        });
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: `${TOOL_SUCCESS_LABELS[name]}: ${args.name}`,
          navigateTo: `/trainer/rutinas/${result.value.routineId}`,
        };
      }

      // ── Record body metric ──────────────────────────────────────────
      case "record_body_metric": {
        const input: Record<string, unknown> = {};
        if (args.clientUserId) input.clientUserId = args.clientUserId;
        if (args.weightKg != null) input.weightKg = args.weightKg;
        if (args.bodyFatPct != null) input.bodyFatPct = args.bodyFatPct;
        if (args.muscleMassKg != null) input.muscleMassKg = args.muscleMassKg;
        if (args.waistCm != null) input.waistCm = args.waistCm;
        if (args.hipCm != null) input.hipCm = args.hipCm;
        if (args.chestCm != null) input.chestCm = args.chestCm;
        if (args.armCm != null) input.armCm = args.armCm;
        if (args.thighCm != null) input.thighCm = args.thighCm;
        if (args.notes) input.notes = args.notes;
        const result = await recordBodyMetric(input);
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: TOOL_SUCCESS_LABELS[name]!,
        };
      }

      // ── Assign routine ──────────────────────────────────────────────
      case "assign_routine": {
        const result = await assignRoutineToClient({
          clientId: args.clientId as string,
          routineTemplateId: args.routineTemplateId as string,
          startsOn: args.startsOn as string,
          ...(args.endsOn ? { endsOn: args.endsOn as string } : {}),
        });
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: TOOL_SUCCESS_LABELS[name]!,
        };
      }

      // ── Quick add client ────────────────────────────────────────────
      case "quick_add_client": {
        const result = await quickAddClient({
          email: args.email as string,
          name: (args.name as string) || undefined,
        });
        if (!result.ok)
          return { tool: name, args, success: false, error: result.error.message, label };
        return {
          tool: name,
          args,
          success: true,
          data: result.value,
          label: `${TOOL_SUCCESS_LABELS[name]}: ${args.name ?? args.email}`,
        };
      }

      default:
        return {
          tool: name,
          args,
          success: false,
          error: `Tool desconocido: ${name}`,
          label: name,
        };
    }
  } catch (e) {
    return {
      tool: name,
      args,
      success: false,
      error: e instanceof Error ? e.message : "Error inesperado",
      label,
    };
  }
}
