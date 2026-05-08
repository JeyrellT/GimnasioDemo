// =============================================================================
// VIZION — Resend email client
// Owner: backend-api.
//
// Thin wrapper around the Resend SDK.
// Callers pass either `react` (React Email component) or `html` + `text`.
// =============================================================================

import { Resend } from "resend";
import type { ReactElement } from "react";

import { env } from "@/env";
import { ExternalServiceError } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";

const resend = new Resend(env.RESEND_API_KEY);

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  /** React Email component — if provided, `html` and `text` are ignored */
  react?: ReactElement;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id: string;
}

/**
 * Send a transactional email via Resend.
 *
 * @throws ExternalServiceError if Resend returns an error.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, react, html, text, replyTo } = input;

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(react ? { react } : { html, text: text ?? html ?? "" }),
    ...(replyTo ? { replyTo } : {}),
  });

  if (error ?? !data) {
    logError(error, { action: "sendEmail", subject });
    throw new ExternalServiceError(
      "RESEND_SEND_FAILED",
      "No se pudo enviar el correo. Intentá de nuevo en unos minutos.",
      error,
    );
  }

  logInfo("Email sent", { emailId: data.id, subject });
  return { id: data.id };
}
