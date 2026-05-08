// =============================================================================
// VIZION — PAR-Q+ 2024 validation schema
// Owner: backend-api.
//
// PAR-Q+ (Physical Activity Readiness Questionnaire Plus), 2024 edition.
// Translated to voseo CR.
//
// Questions P1–P7 are general. P8–P10 have conditional follow-ups.
// Any "Sí" on P1 triggers the full medical evaluation recommendation.
//
// Business rule (from PRODUCT_DECISIONS §3 step 6):
//   If ANY question returns `answer: true` → ClientProfile.parqStatus = RED / REVIEW
//   depending on clinical severity (P1 = RED, P2–P10 = REVIEW).
// =============================================================================

import { z } from "zod";

// ── Question definitions ──────────────────────────────────────────────────────

export interface ParqQuestionDef {
  code: string;
  text: string;
  followUpPrompt?: string;
  /** If true, a YES answer triggers immediate block + RED status */
  critical: boolean;
}

export const PARQ_QUESTIONS: ParqQuestionDef[] = [
  {
    code: "P1",
    text: "¿Te ha dicho alguna vez un médico o profesional de salud que tenés una afección cardíaca y que solo debés realizar actividad física recomendada por un médico?",
    critical: true,
  },
  {
    code: "P2",
    text: "¿Sentís dolor en el pecho cuando realizás actividad física?",
    followUpPrompt:
      "Describí brevemente cuándo ocurre y si has consultado un médico.",
    critical: true,
  },
  {
    code: "P3",
    text: "En el último mes, ¿has sentido dolor en el pecho cuando NO estabas haciendo actividad física?",
    critical: false,
  },
  {
    code: "P4",
    text: "¿Perdés el equilibrio a causa de mareos, o alguna vez perdiste el conocimiento?",
    followUpPrompt: "Indicá cuándo fue el último episodio y si tenés diagnóstico.",
    critical: false,
  },
  {
    code: "P5",
    text: "¿Tenés algún problema óseo o articular (como en la espalda, rodilla o cadera) que podría empeorar con la actividad física?",
    followUpPrompt: "¿Cuál es la articulación o zona afectada?",
    critical: false,
  },
  {
    code: "P6",
    text: "¿Actualmente te recetan medicamentos para la presión arterial o el corazón?",
    followUpPrompt: "Indicá el nombre del medicamento si lo tenés a mano.",
    critical: false,
  },
  {
    code: "P7",
    text: "¿Hay alguna otra razón por la que NO debas hacer actividad física?",
    followUpPrompt: "Describí brevemente la razón.",
    critical: false,
  },
  // Extended health screening questions (P8–P10)
  {
    code: "P8",
    text: "¿Tenés diabetes tipo 1 o tipo 2?",
    followUpPrompt:
      "¿Usás insulina o algún medicamento para controlar el azúcar en sangre?",
    critical: false,
  },
  {
    code: "P9",
    text: "¿Has sido hospitalizado en los últimos 12 meses por alguna razón cardíaca, respiratoria o neurológica?",
    followUpPrompt: "Indicá el motivo de la hospitalización.",
    critical: false,
  },
  {
    code: "P10",
    text: "¿Estás embarazada o hubo un embarazo en los últimos 6 meses?",
    followUpPrompt:
      "¿En qué etapa estás o cuándo fue el parto/cesárea? Esto ayuda a adaptar la intensidad.",
    critical: false,
  },
];

export const PARQ_QUESTION_CODES = PARQ_QUESTIONS.map((q) => q.code) as [
  string,
  ...string[],
];

// ── Zod schema ────────────────────────────────────────────────────────────────

const parqAnswerSchema = z.object({
  questionCode: z.enum(PARQ_QUESTION_CODES, {
    errorMap: () => ({ message: "Código de pregunta PAR-Q inválido" }),
  }),
  answer: z.boolean({ required_error: "Respondé Sí o No a esta pregunta" }),
  followUpNotes: z.string().trim().max(1000).optional(),
});

export type ParqAnswer = z.infer<typeof parqAnswerSchema>;

/**
 * Full PAR-Q form schema.
 * All 10 questions must be answered. Follow-up notes are optional but
 * encouraged when answer is true.
 */
export const parqAnswersSchema = z
  .object({
    assessmentId: z.string().optional(), // filled by server on creation
    answers: z
      .array(parqAnswerSchema)
      .length(10, "Debés responder las 10 preguntas del PAR-Q+"),
  })
  .refine(
    (data) => {
      const codes = data.answers.map((a) => a.questionCode);
      const unique = new Set(codes);
      return unique.size === 10;
    },
    { message: "Cada pregunta debe aparecer exactamente una vez" },
  );

export type ParqAnswersInput = z.infer<typeof parqAnswersSchema>;

// ── PAR-Q result evaluation ───────────────────────────────────────────────────

export type ParqEvalResult =
  | { status: "GREEN"; message: null }
  | { status: "REVIEW"; message: string; redFlags: string[] }
  | { status: "RED"; message: string; redFlags: string[] };

/**
 * Evaluate PAR-Q answers and return a status.
 * Called server-side before persisting.
 */
export function evaluateParq(answers: ParqAnswer[]): ParqEvalResult {
  const yesAnswers = answers.filter((a) => a.answer);

  if (yesAnswers.length === 0) {
    return { status: "GREEN", message: null };
  }

  const criticalCodes = PARQ_QUESTIONS.filter((q) => q.critical).map(
    (q) => q.code,
  );
  const hasCritical = yesAnswers.some((a) => criticalCodes.includes(a.questionCode));
  const redFlags = yesAnswers.map((a) => a.questionCode);

  if (hasCritical) {
    return {
      status: "RED",
      message:
        "Antes de comenzar, necesitamos que consultes con un médico. Tu entrenador ya fue notificado.",
      redFlags,
    };
  }

  return {
    status: "REVIEW",
    message:
      "Tenés algunas respuestas que tu entrenador revisará antes de asignarte rutina.",
    redFlags,
  };
}
