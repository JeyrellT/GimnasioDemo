// =============================================================================
// VIZION — Gmail SMTP email client (via nodemailer)
// Owner: backend-api.
//
// Thin wrapper around nodemailer's Gmail SMTP transport.
// Callers pass either `react` (React Email component) or `html` + `text`.
//
// Auth: requires a Gmail account with 2FA + App Password.
//   GMAIL_USER          — full Gmail address (e.g. gerencia@jcanalytic.com)
//   GMAIL_APP_PASSWORD  — 16-char app password from myaccount.google.com/apppasswords
//   GMAIL_FROM_NAME     — display name shown to recipients (e.g. "Vizion")
//
// Limits: Gmail free caps ~500 emails/day; Google Workspace caps ~2000/day.
// =============================================================================

import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

import { serverEnv as env } from "@/server/env";
import { ExternalServiceError } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";

// ── Lazy-initialised transporter (one TCP connection pool per process) ────────

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    throw new ExternalServiceError(
      "GMAIL_NOT_CONFIGURED",
      "El servicio de correo no está configurado. Falta GMAIL_USER o GMAIL_APP_PASSWORD.",
    );
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });

  return cachedTransporter;
}

// ── Public API (preserved from Resend client for caller compatibility) ────────

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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, react, html, text, replyTo } = input;

  // React Email components → render to HTML + plain-text fallback
  let finalHtml = html;
  let finalText = text;
  if (react) {
    finalHtml = await render(react);
    finalText = await render(react, { plainText: true });
  }

  const fromName = env.GMAIL_FROM_NAME ?? "Vizion";
  const fromAddress = env.GMAIL_USER ?? "";
  const from = `${fromName} <${fromAddress}>`;

  try {
    const info = await getTransporter().sendMail({
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: finalHtml,
      text: finalText ?? finalHtml ?? "",
      ...(replyTo ? { replyTo } : {}),
    });

    logInfo("Email sent", { messageId: info.messageId, subject, to });
    return { id: info.messageId };
  } catch (error) {
    logError(error, { action: "sendEmail", subject, to });
    throw new ExternalServiceError(
      "GMAIL_SEND_FAILED",
      "No se pudo enviar el correo. Intentá de nuevo en unos minutos.",
      error,
    );
  }
}
