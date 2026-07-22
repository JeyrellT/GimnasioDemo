// =============================================================================
// BLACKLINE FITNESS — Rutina imprimible (PDF template)
// Owner: document-automation-architect.
//
// This is a PURE React component — NOT a Next.js Server Component.
// It has no async data fetching and no server-only APIs.
// It is rendered to an HTML string via renderToStaticMarkup() in ../index.ts
// and then passed to htmlToPdf().
//
// Props align with RoutineSnapshot from src/types/domain.ts.
// The shape is intentionally flattened for PDF (no Prisma references).
//
// Layout target: A4 vertical (210 × 297 mm), light mode, printable in black-and-
// white gym printers while still looking great in color.
// =============================================================================

import React from "react";

// -----------------------------------------------------------------------------
// Types (local, PDF-specific flat shape derived from RoutineSnapshot)
// -----------------------------------------------------------------------------

// NOTE: RoutineSnapshot in domain.ts uses templateName + snapshotAt.
// The PDF layer receives a pre-mapped flat shape so it stays decoupled from
// Prisma and domain evolution.  index.ts does the mapping.

export interface PdfRoutineExercise {
  order: number;
  exerciseName: string;        // mapped from nameEs
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number;
  tempo: string | null;
  supersetGroup: number | null;
  notes: string | null;
}

export interface PdfRoutineDay {
  dayIndex: number;
  name: string;
  description?: string | null;
  exercises: PdfRoutineExercise[];
}

export interface PdfRoutineData {
  name: string;             // mapped from templateName
  goal: string;             // human-readable goal label (caller maps enum)
  splitDays: number;
  durationWeeks: number;
  days: PdfRoutineDay[];
}

export interface RoutinePrintProps {
  trainerName: string;
  trainerLogo?: string | null;
  clientName: string;
  clientGoal: string;
  routine: PdfRoutineData;
  assignedAt: Date;
  startsOn: Date;
  endsOn?: Date | null;
  /** Current page and total pages. Puppeteer does not inject these for us when
   *  displayHeaderFooter is false, so the caller can pass them after rendering. */
  totalPages?: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

function formatDateEs(d: Date): string {
  return `${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function repsDisplay(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

function restDisplay(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, "0")}`;
}

// Superset label: group 1 → "SS-A", group 2 → "SS-B", etc.
function supersetLabel(group: number): string {
  return `SS-${String.fromCharCode(64 + group)}`;
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface ExerciseTableProps {
  exercises: PdfRoutineExercise[];
}

function ExerciseTable({ exercises }: ExerciseTableProps) {
  return (
    <table className="exercise-table" aria-label="Ejercicios del día">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Ejercicio</th>
          <th scope="col">Sets</th>
          <th scope="col">Reps</th>
          <th scope="col">RPE</th>
          <th scope="col">Descanso</th>
          <th scope="col">Tempo</th>
          <th scope="col">Notas</th>
        </tr>
      </thead>
      <tbody>
        {exercises.map((ex) => {
          const hasSS = ex.supersetGroup !== null && ex.supersetGroup > 0;
          return (
            <tr
              key={ex.order}
              className={hasSS ? "row-superset" : undefined}
            >
              <td className="col-order">{ex.order}</td>
              <td className="col-exercise">
                {hasSS && (
                  <span
                    className="superset-badge"
                    aria-label={`Superserie ${supersetLabel(ex.supersetGroup!)}`}
                  >
                    {supersetLabel(ex.supersetGroup!)}
                  </span>
                )}
                {ex.exerciseName}
              </td>
              <td className="col-num">{ex.targetSets}</td>
              <td className="col-num">{repsDisplay(ex.targetRepsMin, ex.targetRepsMax)}</td>
              <td className="col-num">{ex.targetRpe !== null ? ex.targetRpe : "—"}</td>
              <td className="col-rest">{restDisplay(ex.restSeconds)}</td>
              <td className="col-tempo">{ex.tempo ?? "—"}</td>
              <td className="col-notes">{ex.notes ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export function RoutinePrint({
  trainerName,
  trainerLogo,
  clientName,
  clientGoal,
  routine,
  assignedAt,
  startsOn,
  endsOn,
  totalPages,
}: RoutinePrintProps) {
  const vigencia = endsOn
    ? `${formatDateEs(startsOn)} — ${formatDateEs(endsOn)}`
    : `Desde ${formatDateEs(startsOn)}`;

  const appUrl = "blacklinefitness.app";

  return (
    <>
      {/* ── Page 1: cover / header ── */}
      <header className="doc-header" role="banner">
        <div className="header-brand">
          {trainerLogo ? (
            <img
              src={trainerLogo}
              alt={`Logo de ${trainerName}`}
              className="trainer-logo"
              width={80}
              height={40}
            />
          ) : (
            /* Wordmark fallback when no logo is provided */
            <span className="blackline-fitness-wordmark" aria-label="Blackline Fitness">
              Blackline Fitness
            </span>
          )}
        </div>

        <div className="header-trainer">
          <p className="trainer-name">{trainerName}</p>
          <p className="trainer-label">Entrenador</p>
        </div>
      </header>

      {/* ── Client & routine meta ── */}
      <section className="routine-meta" aria-label="Información de la rutina">
        <h1 className="routine-title">{routine.name}</h1>

        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Cliente</span>
            <span className="meta-value">{clientName}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Objetivo</span>
            <span className="meta-value">{clientGoal}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Asignada</span>
            <span className="meta-value">{formatDateEs(assignedAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Vigencia</span>
            <span className="meta-value">{vigencia}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Splits</span>
            <span className="meta-value">{routine.splitDays} días / semana</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Duración</span>
            <span className="meta-value">
              {routine.durationWeeks} {routine.durationWeeks === 1 ? "semana" : "semanas"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Days ── */}
      <main role="main">
        {routine.days.map((day, idx) => (
          <section
            key={day.dayIndex}
            className={`day-section${idx > 0 ? " page-break" : ""}`}
            aria-labelledby={`day-heading-${day.dayIndex}`}
          >
            <h2
              id={`day-heading-${day.dayIndex}`}
              className="day-heading"
            >
              <span className="day-number">Día {day.dayIndex}</span>
              <span className="day-separator" aria-hidden="true"> — </span>
              <span className="day-name">{day.name}</span>
            </h2>

            {day.description && (
              <p className="day-description">{day.description}</p>
            )}

            <ExerciseTable exercises={day.exercises} />
          </section>
        ))}
      </main>

      {/* ── Footer (rendered once per page via CSS @page / repeated footer trick) ── */}
      {/*
        Puppeteer's displayHeaderFooter injects templates per page at the OS level.
        For MVP we use a static footer at document end; it appears on the last page.
        To get true per-page footers, callers can pass displayHeaderFooter: true
        with a custom footerTemplate to htmlToPdf().  See routine-print.css for
        the CSS-based approach using position:running (WeasyPrint-style) which
        Puppeteer does NOT support — Puppeteer relies on the headerTemplate API.
      */}
      <footer className="doc-footer" role="contentinfo">
        <p className="footer-tagline">Tu línea, tu fuerza.</p>
        <p className="footer-url">{appUrl}</p>
        {totalPages !== undefined && totalPages > 0 && (
          <p className="footer-pages">
            Página 1 de {totalPages}
          </p>
        )}
      </footer>
    </>
  );
}

// -----------------------------------------------------------------------------
// CSS string exported separately for inlining into the HTML document.
// The actual styles live in ./routine-print.css (imported as a string in
// index.ts via fs.readFileSync or ?raw webpack/turbopack loader).
// This export is kept here as documentation for template consumers.
// -----------------------------------------------------------------------------

export const ROUTINE_PRINT_CSS_PATH = "./routine-print.css";
