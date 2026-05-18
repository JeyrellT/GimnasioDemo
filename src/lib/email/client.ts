// =============================================================================
// BLACKLINE FITNESS — Gmail SMTP email client (via nodemailer)
// Owner: backend-api.
//
// Thin wrapper around nodemailer's Gmail SMTP transport with explicit host/port
// config (more debuggable than the `service: "gmail"` shortcut).
//
// Callers pass either `react` (React Email component) or `html` + `text`.
// The same `sendEmail(input)` interface remains stable so callers don't change
// when the underlying transport does.
//
// Auth: requires a Gmail account with 2FA + App Password.
//   GMAIL_USER          — full Gmail address (e.g. gerencia@jcanalytic.com)
//   GMAIL_APP_PASSWORD  — 16-char app password from myaccount.google.com/apppasswords
//   GMAIL_FROM_NAME     — display name shown to recipients (e.g. "Blackline Fitness")
//
// Limits: Gmail free caps ~500 emails/day; Google Workspace caps ~2000/day.
//
// Network note: SMTP is blocked on Railway Free/Hobby/Trial plans. Pro plan
// or above is required for outbound SMTP to smtp.gmail.com:465.
// =============================================================================

import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

import { serverEnv as env } from "@/server/env";
import { ExternalServiceError } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";

// ── Constants ─────────────────────────────────────────────────────────────────

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT_SSL = 465;     // SSL/TLS on connect (preferred for Gmail)
// const SMTP_PORT_STARTTLS = 587;  // STARTTLS upgrade (alternative)

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
    host: SMTP_HOST,
    port: SMTP_PORT_SSL,
    secure: true, // SSL/TLS — required for port 465
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
    // Hard timeouts so a stuck SMTP handshake never hangs a server action.
    connectionTimeout: 10_000, // 10s to open the TCP connection
    greetingTimeout: 10_000,   // 10s to receive the server greeting
    socketTimeout: 15_000,     // 15s of inactivity on an open socket
    // Connection pool — reuse 1 connection across multiple sends.
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
  });

  return cachedTransporter;
}

// ── Error classification ──────────────────────────────────────────────────────

export type EmailErrorClass =
  | "EAUTH"          // Gmail rejected credentials (wrong App Password)
  | "ETIMEDOUT"      // Connection timed out (Railway blocking SMTP, network down)
  | "ECONNECTION"    // Could not connect (DNS, firewall, server down)
  | "EENVELOPE"      // Invalid sender or recipient address
  | "ERATELIMIT"     // Gmail daily limit hit (500/day free, 2000/day Workspace)
  | "ENOTCONFIGURED" // Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars
  | "UNKNOWN";

interface ClassifiedError {
  class: EmailErrorClass;
  message: string;
}

function classifyError(error: unknown): ClassifiedError {
  const err = error as {
    code?: string;
    responseCode?: number;
    command?: string;
    message?: string;
  };
  const code = err?.code ?? "";
  const responseCode = err?.responseCode ?? 0;
  const msg = err?.message ?? "";

  if (code === "EAUTH" || responseCode === 535 || /invalid login|username and password not accepted/i.test(msg)) {
    return {
      class: "EAUTH",
      message:
        "Gmail rechazó las credenciales. Verificá que el App Password sea correcto y que 2FA esté activo en la cuenta.",
    };
  }
  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    code === "ECONNRESET" ||
    /timeout/i.test(msg)
  ) {
    return {
      class: "ETIMEDOUT",
      message:
        "No se pudo conectar a Gmail dentro del tiempo límite. En Railway: este error suele significar que el plan no permite SMTP (Free/Hobby/Trial lo bloquean — Pro o superior lo desbloquea).",
    };
  }
  if (code === "ECONNECTION" || code === "ENOTFOUND" || code === "EDNS") {
    return {
      class: "ECONNECTION",
      message:
        "No se pudo establecer conexión con smtp.gmail.com. Verificá que la red permita tráfico saliente al puerto 465.",
    };
  }
  if (code === "EENVELOPE") {
    return {
      class: "EENVELOPE",
      message: "Direcciones de correo inválidas (remitente o destinatario).",
    };
  }
  if (responseCode === 421 || responseCode === 451 || responseCode === 550) {
    return {
      class: "ERATELIMIT",
      message:
        "Gmail rechazó el envío (posible límite diario alcanzado: 500/día gratis o 2000/día Workspace).",
    };
  }
  return {
    class: "UNKNOWN",
    message: msg || "Error desconocido al enviar el correo.",
  };
}

// ── Health check (used by /api/health/email) ──────────────────────────────────

export interface EmailHealthStatus {
  configured: boolean;
  reachable: boolean;
  errorClass?: EmailErrorClass;
  errorMessage?: string;
}

/**
 * Verifies the SMTP transport without sending an email.
 * Runs the standard nodemailer `verify()` which performs auth + handshake.
 * Safe to call from a healthcheck endpoint.
 */
export async function verifyEmailTransport(): Promise<EmailHealthStatus> {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    return {
      configured: false,
      reachable: false,
      errorClass: "ENOTCONFIGURED",
      errorMessage:
        "Faltan variables de entorno GMAIL_USER y/o GMAIL_APP_PASSWORD.",
    };
  }

  try {
    await getTransporter().verify();
    return { configured: true, reachable: true };
  } catch (error) {
    const classified = classifyError(error);
    return {
      configured: true,
      reachable: false,
      errorClass: classified.class,
      errorMessage: classified.message,
    };
  }
}

// ── Public sendEmail API (preserved from Resend client) ───────────────────────

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

  const fromName = env.GMAIL_FROM_NAME ?? "Blackline Fitness";
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

    logInfo("email.sent", {
      messageId: info.messageId,
      subject,
      to,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return { id: info.messageId };
  } catch (error) {
    const classified = classifyError(error);
    logError(error, {
      action: "email.failed",
      subject,
      to,
      errorClass: classified.class,
      errorMessage: classified.message,
    });
    throw new ExternalServiceError(
      `EMAIL_${classified.class}`,
      classified.message,
      error,
    );
  }
}
