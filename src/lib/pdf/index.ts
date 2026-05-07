// =============================================================================
// FORJA — PDF generation barrel
// Owner: document-automation-architect.
//
// Public API for the PDF layer.  Backend-api calls generateRoutinePdf() from
// a Route Handler after it has queried the DB and built the required inputs.
// This module never touches the DB or Prisma directly.
//
// Data contract with backend-api (src/app/api/rutinas/[id]/pdf/route.ts):
//   → backend-api queries AssignedRoutine, RoutineSnapshot JSON, trainer and
//     client profiles, then calls generateRoutinePdf() with the flat shape below.
//   → generateRoutinePdf() maps RoutineSnapshot → PdfRoutineData, renders HTML,
//     converts to PDF, and returns a Buffer + filename in a Result.
//
// Declared new dependencies for devops-deploy:
//   - puppeteer-core@^23          (headless browser, no bundled Chromium)
//   - @sparticuz/chromium@^131    (serverless-friendly Chromium binary for prod)
//   Both added as PRODUCTION deps (not devDep) because they run at request time.
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { format as formatDate } from "date-fns";

import type { RoutineSnapshot } from "@/types/domain";
import type { Result } from "@/lib/result";
import type { AppError } from "@/lib/errors";
import { ok, err, tryCatch } from "@/lib/result";
import { ExternalServiceError } from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";

import { htmlToPdf } from "./render";
import type { PdfRoutineData, PdfRoutineDay, PdfRoutineExercise } from "./templates/routine-print";
import { RoutinePrint } from "./templates/routine-print";

// -----------------------------------------------------------------------------
// Input type — what backend-api must provide
// -----------------------------------------------------------------------------

/**
 * Input contract for backend-api.
 * backend-api is responsible for:
 *   1. Verifying that the requesting trainer owns the assigned routine.
 *   2. Building RoutineSnapshot from AssignedRoutine.snapshotJson.
 *   3. Resolving trainer and client display names.
 *   4. Calling generateRoutinePdf() and streaming/returning the buffer.
 */
export interface GenerateRoutinePdfInput {
  /** Immutable routine snapshot frozen at assignment time. */
  snapshot: RoutineSnapshot;
  /** Trainer display name shown in the document header. */
  trainerName: string;
  /** Optional trainer logo URL (publicly accessible HTTPS; used in PDF header). */
  trainerLogo?: string | null;
  /** Client full name shown in the meta section. */
  clientName: string;
  /** Human-readable client goal label (backend-api maps the RoutineGoal enum). */
  clientGoal: string;
  /** When the routine was assigned (UTC). */
  assignedAt: Date;
  /** Routine start date (UTC). */
  startsOn: Date;
  /** Routine end date (UTC). Null if open-ended. */
  endsOn?: Date | null;
}

// -----------------------------------------------------------------------------
// Internal: CSS inlining
// -----------------------------------------------------------------------------

/**
 * Read the CSS file once at module load time and cache it.
 * In serverless environments the file system is read-only at request time,
 * so we read during module initialization (before the first request).
 *
 * Path is resolved relative to this file at compile time. Next.js bundles
 * files via `next/dist/build/webpack/loaders/...`, but since this is a
 * server-only module it is not bundled for the client — fs.readFileSync works.
 */
let _cachedCss: string | null = null;

function loadCss(): string {
  if (_cachedCss !== null) return _cachedCss;

  try {
    const cssPath = join(
      // In Next.js Edge runtime this path is resolved from the project root.
      // In Node.js runtime (default for Route Handlers) __dirname is available
      // after `import.meta.dirname` (Node 22) or we fall back to a known path.
      // TODO(document-automation-architect): if Next.js Edge runtime is used
      // for the PDF route, replace this with a bundled string import.
      // For Node.js runtime this works correctly.
      process.cwd(),
      "src/lib/pdf/templates/routine-print.css",
    );
    _cachedCss = readFileSync(cssPath, "utf-8");
    return _cachedCss;
  } catch (e) {
    logError(e, { context: "loadCss" });
    // Return empty string — PDF still generates, just without custom styles.
    // This should never happen in production where the file is part of the build.
    _cachedCss = "";
    return _cachedCss;
  }
}

// -----------------------------------------------------------------------------
// Internal: RoutineSnapshot → PdfRoutineData mapping
// -----------------------------------------------------------------------------

function mapSnapshotToPdf(snapshot: RoutineSnapshot): PdfRoutineData {
  const days: PdfRoutineDay[] = snapshot.days.map((day): PdfRoutineDay => {
    const exercises: PdfRoutineExercise[] = day.exercises.map(
      (ex): PdfRoutineExercise => ({
        order: ex.order,
        exerciseName: ex.nameEs,
        targetSets: ex.targetSets,
        targetRepsMin: ex.targetRepsMin,
        targetRepsMax: ex.targetRepsMax,
        targetRpe: ex.targetRpe,
        restSeconds: ex.restSeconds,
        tempo: ex.tempo,
        supersetGroup: ex.supersetGroup,
        notes: ex.notes,
      }),
    );

    // Sort by order ascending; domain should already guarantee this but we
    // enforce it here for PDF correctness regardless.
    exercises.sort((a, b) => a.order - b.order);

    return {
      dayIndex: day.dayIndex,
      name: day.name,
      description: null, // RoutineSnapshotDay does not carry description in v1
      exercises,
    };
  });

  // Sort days by dayIndex ascending
  days.sort((a, b) => a.dayIndex - b.dayIndex);

  return {
    name: snapshot.templateName,
    goal: snapshot.goal as string, // enum label — clientGoal from input is the human-readable version
    splitDays: snapshot.splitDays,
    durationWeeks: snapshot.durationWeeks,
    days,
  };
}

// -----------------------------------------------------------------------------
// Internal: slug helper
// -----------------------------------------------------------------------------

/**
 * Converts an arbitrary string to a URL-safe slug for use in filenames.
 * Example: "Hipertrofia Avanzada" → "hipertrofia-avanzada"
 */
function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60); // cap length for filesystem safety
}

// -----------------------------------------------------------------------------
// Internal: HTML document builder
// -----------------------------------------------------------------------------

function buildHtmlDocument(innerHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="es-CR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="Forja PDF v1" />
  <title>Rutina Forja</title>
  <style>${css}</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Generates a printable A4 PDF for an assigned routine.
 *
 * CALLER (backend-api) is responsible for:
 *   - DB query and authorization check before calling this function.
 *   - Providing a human-readable `clientGoal` string (mapping RoutineGoal enum).
 *   - Streaming or attaching the returned `pdfBuffer` in the Route Handler.
 *
 * Returns:
 *   ok({ pdfBuffer, filename }) on success.
 *   err(AppError)             on any failure (browser unavailable, render error).
 *
 * Filename format: rutina-{slug}-{YYYY-MM-dd}.pdf
 * Example:         rutina-hipertrofia-avanzada-2026-05-06.pdf
 */
export async function generateRoutinePdf(
  input: GenerateRoutinePdfInput,
): Promise<Result<{ pdfBuffer: Buffer; filename: string }, AppError>> {
  const {
    snapshot,
    trainerName,
    trainerLogo,
    clientName,
    clientGoal,
    assignedAt,
    startsOn,
    endsOn,
  } = input;

  return tryCatch(async () => {
    // 1. Map domain snapshot to flat PDF shape
    const pdfRoutineData = mapSnapshotToPdf(snapshot);

    // 2. Render React component to static HTML string (no hydration needed)
    const componentHtml = renderToStaticMarkup(
      React.createElement(RoutinePrint, {
        trainerName,
        trainerLogo: trainerLogo ?? null,
        clientName,
        clientGoal,
        routine: pdfRoutineData,
        assignedAt,
        startsOn,
        endsOn: endsOn ?? null,
      }),
    );

    // 3. Inline CSS (read once, cached)
    const css = loadCss();

    // 4. Wrap in full HTML document
    const fullHtml = buildHtmlDocument(componentHtml, css);

    // 5. Generate PDF buffer via Puppeteer
    const pdfBuffer = await htmlToPdf({
      html: fullHtml,
      options: {
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        // Allow extra time for Google Fonts CDN in dev environments.
        // In production where the CDN is unreachable, set INTER_FONT_EMBEDDED=true
        // and swap to base64 font faces (see routine-print.css comment).
        extraWaitMs: process.env.NODE_ENV === "development" ? 500 : 0,
      },
    });

    // 6. Build deterministic filename
    const dateStr = formatDate(assignedAt, "yyyy-MM-dd");
    const nameSlug = slug(snapshot.templateName);
    const filename = `rutina-${nameSlug}-${dateStr}.pdf`;

    logInfo("PDF de rutina generado", {
      filename,
      bytes: pdfBuffer.byteLength,
      clientName, // name is not a PII-sensitive field per Ley 8968 (it's display data)
    });

    return { pdfBuffer, filename };
  });
}

// -----------------------------------------------------------------------------
// Re-exports for consumers that need the input type without importing index.ts
// -----------------------------------------------------------------------------

export type { PdfRoutineData, PdfRoutineDay, PdfRoutineExercise } from "./templates/routine-print";
