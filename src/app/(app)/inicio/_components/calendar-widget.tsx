"use client";

// =============================================================================
// BLACKLINE FITNESS — CalendarWidget
// Owner: frontend-react (Agent 5).
//
// Displays a 14-day heatstrip + grouped event list for the trainer dashboard.
// Props flow from a Server Component that calls getDashboardCalendarEvents().
// =============================================================================

import * as React from "react";
import { useCallback, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Calendar, Clock, MoonStar, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardCalendar, DashboardCalendarEvent, CalendarHeatDay } from "@/types/dashboard";

// =============================================================================
// Types & constants
// =============================================================================

export interface CalendarWidgetProps {
  /** Initial calendar data fetched server-side */
  calendar: DashboardCalendar;
  className?: string;
}

// Day-of-week letters in es-CR (lunes = 0 in our offset logic)
const DOW_LETTERS = ["D", "L", "M", "X", "J", "V", "S"] as const;

// Heatmap bar intensity → color
const INTENSITY_COLOR: Record<CalendarHeatDay["intensity"], string> = {
  none: "#27272A",
  low: "rgba(255,106,26,0.30)",
  medium: "rgba(255,106,26,0.60)",
  high: "#3B82F6",
};

// Max bars to show before collapsing into "ESTA SEMANA" summary
const EXPANDED_DAY_LIMIT = 5;

// =============================================================================
// Date helpers (no extra deps beyond date-fns already in package.json)
// =============================================================================

/**
 * Returns midnight local time for a given YYYY-MM-DD string, interpreted as
 * local date (avoids UTC-offset issues when comparing with today).
 */
function localMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(y, (m as number) - 1, d as number, 0, 0, 0, 0);
}

/** Today at midnight (local). */
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Day difference between two local-midnight dates.
 * Positive = target is in the future.
 */
function diffDays(target: Date, reference: Date): number {
  return Math.round((target.getTime() - reference.getTime()) / 86_400_000);
}

/**
 * Day-of-week letter for a Date (Sunday = 0 in JS).
 * Maps: 0→D, 1→L, 2→M, 3→X, 4→J, 5→V, 6→S
 */
function dowLetter(date: Date): string {
  return DOW_LETTERS[date.getDay()] ?? "?";
}

/**
 * Builds the day header label for the event list.
 * "HOY" / "MAÑANA" / "Jueves 8 de mayo" (es-CR capitalised).
 */
function dayHeaderLabel(dateStr: string): string {
  const today = todayMidnight();
  const target = localMidnight(dateStr);
  const diff = diffDays(target, today);

  if (diff === 0) return "HOY";
  if (diff === 1) return "MAÑANA";
  if (diff === -1) return "AYER";

  // Full date label capitalised
  const raw = target.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Short date for day header subtitle (e.g. "Miércoles 7 de mayo").
 */
function daySubLabel(dateStr: string): string {
  const target = localMidnight(dateStr);
  const raw = target.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Formats a day-of-month number from a YYYY-MM-DD string.
 */
function dayOfMonth(dateStr: string): number {
  return localMidnight(dateStr).getDate();
}

// =============================================================================
// Sub-components
// =============================================================================

// ── EventTypeIcon ──────────────────────────────────────────────────────────────

interface EventTypeIconProps {
  type: DashboardCalendarEvent["type"];
}

function EventTypeIcon({ type }: EventTypeIconProps) {
  if (type === "session_completed") {
    return (
      <CircleDot
        className="h-3.5 w-3.5 shrink-0 text-[#22C55E]"
        aria-hidden
      />
    );
  }
  if (type === "routine_ending") {
    return (
      <MoonStar
        className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]"
        aria-hidden
      />
    );
  }
  // session_today
  return (
    <Clock
      className="h-3.5 w-3.5 shrink-0 text-[#3B82F6]"
      aria-hidden
    />
  );
}

// ── EventRow ───────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: DashboardCalendarEvent;
  index: number;
  reduced: boolean;
}

function EventRow({ event, index, reduced }: EventRowProps) {
  return (
    <motion.li
      initial={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.22, delay: 0.35 + index * 0.04 }}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#27272A] transition-colors duration-150"
    >
      <EventTypeIcon type={event.type} />
      <span className="min-w-0 flex-1 truncate text-sm text-[#D4D4D8]">
        {event.title}
      </span>
      {event.time !== undefined && (
        <span className="shrink-0 font-mono text-xs text-[#71717A]" aria-label={`hora ${event.time}`}>
          {event.time}
        </span>
      )}
    </motion.li>
  );
}

// ── DaySection ────────────────────────────────────────────────────────────────

interface DaySectionProps {
  dateStr: string;
  events: DashboardCalendarEvent[];
  isHighlighted: boolean;
  sectionId: string;
  reduced: boolean;
}

function DaySection({ dateStr, events, isHighlighted, sectionId, reduced }: DaySectionProps) {
  const today = todayMidnight();
  const target = localMidnight(dateStr);
  const diff = diffDays(target, today);

  const relLabel = dayHeaderLabel(dateStr);
  const subLabel = diff === 0 || diff === 1 || diff === -1 ? daySubLabel(dateStr) : null;

  return (
    <section
      id={sectionId}
      aria-label={relLabel}
      className={cn(
        "rounded-lg border transition-all duration-300",
        isHighlighted
          ? "border-[#3B82F6]/40 bg-[#3B82F6]/5"
          : "border-transparent",
      )}
    >
      {/* Day header */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.1em]",
              diff === 0
                ? "text-[#3B82F6]"
                : diff < 0
                  ? "text-[#52525B]"
                  : "text-[#A1A1AA]",
            )}
          >
            {relLabel}
          </span>
          {subLabel && (
            <span className="text-[11px] text-[#52525B]">{subLabel}</span>
          )}
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <p className="px-2 pb-2 text-xs text-[#52525B] italic">Sin eventos</p>
      ) : (
        <ul className="px-1 pb-1.5">
          {events.map((ev, i) => (
            <EventRow key={ev.id} event={ev} index={i} reduced={reduced} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── WeekSummary ───────────────────────────────────────────────────────────────

interface WeekSummaryProps {
  events: DashboardCalendarEvent[];
  reduced: boolean;
}

function WeekSummary({ events, reduced }: WeekSummaryProps) {
  const sessions = events.filter((e) => e.type === "session_completed" || e.type === "session_today");
  const routines = events.filter((e) => e.type === "routine_ending");

  const parts: string[] = [];
  if (sessions.length > 0) {
    parts.push(`${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"}`);
  }
  if (routines.length > 0) {
    parts.push(`${routines.length} ${routines.length === 1 ? "rutina vence" : "rutinas vencen"}`);
  }

  if (parts.length === 0) return null;

  return (
    <motion.section
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.25, delay: 0.55 }}
      aria-label="Resumen de esta semana"
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
        Esta semana
      </p>
      <div className="flex flex-wrap gap-3 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-2">
        {sessions.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-[#D4D4D8]">
            <CircleDot className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden />
            {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        )}
        {routines.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-[#D4D4D8]">
            <MoonStar className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden />
            {routines.length} {routines.length === 1 ? "rutina vence" : "rutinas vencen"}
          </span>
        )}
      </div>
    </motion.section>
  );
}

// ── HeatBar ───────────────────────────────────────────────────────────────────

interface HeatBarProps {
  day: CalendarHeatDay;
  isToday: boolean;
  isSelected: boolean;
  barIndex: number;
  reduced: boolean;
  onClick: () => void;
  sectionId: string;
}

function HeatBar({ day, isToday, isSelected, barIndex, reduced, onClick, sectionId }: HeatBarProps) {
  const date = localMidnight(day.date);
  const domLabel = dowLetter(date);
  const dayNum = dayOfMonth(day.date);
  const color = INTENSITY_COLOR[day.intensity];

  // Bar height: proportional to eventCount, clamped 20%–100%
  const heightPct = day.eventCount === 0 ? 20 : Math.min(20 + day.eventCount * 16, 100);

  return (
    <motion.div
      initial={reduced ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.4 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: 0.3,
              delay: Math.min(barIndex * 0.05, 0.7),
              ease: [0, 0, 0.2, 1],
            }
      }
      style={{ transformOrigin: "bottom" }}
      className="group relative flex flex-1 flex-col items-center gap-1"
    >
      {/* Day-of-week letter */}
      <span
        className={cn(
          "text-xs font-medium leading-none",
          isToday ? "text-[#3B82F6]" : "text-[#52525B]",
        )}
        aria-hidden
      >
        {domLabel}
      </span>

      {/* Bar + tooltip */}
      <div className="relative flex w-full flex-col items-center">
        <button
          type="button"
          aria-label={`${day.date}: ${day.eventCount} ${day.eventCount === 1 ? "evento" : "eventos"}`}
          aria-controls={sectionId}
          aria-pressed={isSelected}
          onClick={onClick}
          className={cn(
            "relative w-full rounded-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2",
            isSelected ? "ring-1 ring-[#3B82F6] ring-offset-1 ring-offset-[#09090B]" : "",
          )}
          style={{
            height: 48,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          {/* The actual bar */}
          <span
            className="w-full rounded-sm transition-all duration-200"
            style={{
              height: `${heightPct}%`,
              backgroundColor: color,
              opacity: isSelected ? 1 : undefined,
            }}
            aria-hidden
          />
        </button>

        {/* Tooltip on hover */}
        <span
          className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#27272A] px-2 py-1 text-[10px] text-[#FAFAFA] opacity-0 shadow-md transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          role="tooltip"
          aria-hidden
        >
          {day.eventCount === 0
            ? "Sin eventos"
            : `${day.eventCount} ${day.eventCount === 1 ? "evento" : "eventos"}`}
        </span>
      </div>

      {/* Day-of-month */}
      <span
        className={cn(
          "text-[10px] leading-none tabular-nums",
          isToday ? "font-bold text-[#3B82F6]" : "text-[#52525B]",
        )}
        aria-hidden
      >
        {dayNum}
      </span>

      {/* Today dot */}
      {isToday && (
        <span
          className="h-1 w-1 rounded-full bg-[#3B82F6]"
          aria-hidden
        />
      )}
    </motion.div>
  );
}

// =============================================================================
// CalendarWidget (main)
// =============================================================================

export function CalendarWidget({ calendar, className }: CalendarWidgetProps) {
  const reduced = useReducedMotion() ?? false;
  const baseId = useId();

  // ── State ──────────────────────────────────────────────────────────────────

  // Which heatmap day is selected (by date string). null = none.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────

  const eventListRef = useRef<HTMLDivElement>(null);

  // ── Derived data ───────────────────────────────────────────────────────────

  const todayStr = React.useMemo(() => {
    const d = todayMidnight();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  /**
   * Group events by date string. Only include dates that appear in the heatmap
   * (today + future 13 days) for the expanded section.
   */
  const { expandedDays, summaryEvents, allHeatmapDates } = React.useMemo(() => {
    const heatmapDates = new Set(calendar.heatmap.map((h) => h.date));
    const allDates = [...heatmapDates].sort();

    // Group all events by date
    const byDate = new Map<string, DashboardCalendarEvent[]>();
    for (const ev of calendar.events) {
      const bucket = byDate.get(ev.date) ?? [];
      bucket.push(ev);
      byDate.set(ev.date, bucket);
    }

    // Expanded days: up to EXPANDED_DAY_LIMIT dates from today forward that have events,
    // always including today even if 0 events.
    const today = todayMidnight();
    const forwardDates = allDates.filter((ds) => diffDays(localMidnight(ds), today) >= 0);

    const expanded: { dateStr: string; events: DashboardCalendarEvent[] }[] = [];
    for (const ds of forwardDates) {
      if (expanded.length >= EXPANDED_DAY_LIMIT) break;
      expanded.push({ dateStr: ds, events: byDate.get(ds) ?? [] });
    }

    // If today is somehow missing (shouldn't happen given backend contract), inject it
    if (expanded.length === 0 || expanded[0]?.dateStr !== todayStr) {
      expanded.unshift({ dateStr: todayStr, events: byDate.get(todayStr) ?? [] });
    }

    // Summary events: everything beyond expanded days
    const expandedSet = new Set(expanded.map((e) => e.dateStr));
    const summary: DashboardCalendarEvent[] = calendar.events.filter(
      (ev) => !expandedSet.has(ev.date),
    );

    return {
      expandedDays: expanded,
      summaryEvents: summary,
      allHeatmapDates: allDates,
    };
  }, [calendar.events, calendar.heatmap, todayStr]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleBarClick = useCallback(
    (dateStr: string) => {
      setSelectedDate((prev) => (prev === dateStr ? null : dateStr));

      // Scroll to the day section if it's in expanded area
      const targetId = `${baseId}-day-${dateStr}`;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      }
    },
    [baseId, reduced],
  );

  const handleTodayClick = useCallback(() => {
    setSelectedDate(todayStr);
    const el = document.getElementById(`${baseId}-day-${todayStr}`);
    if (el) {
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    }
  }, [baseId, todayStr, reduced]);

  // ── Empty state ────────────────────────────────────────────────────────────

  const hasAnyEvent = calendar.events.length > 0;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      className={cn(
        "rounded-xl border border-[#3F3F46] bg-[#18181B] p-5",
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#3B82F6]" aria-hidden />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
              Calendario
            </p>
            <p className="text-xs text-[#52525B]">Próximos 14 días</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTodayClick}
          className="shrink-0 rounded-full border border-[#3F3F46] bg-[#27272A] px-3 py-1 text-xs font-medium text-[#A1A1AA] transition-all duration-150 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
          aria-label="Ir a hoy en el calendario"
        >
          Hoy
        </button>
      </div>

      {/* ── Heatstrip ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.2 }}
        className="mb-4"
        role="group"
        aria-label="Mapa de calor de los próximos 14 días"
      >
        <div className="flex gap-0.5 sm:gap-1">
          {calendar.heatmap.map((day, i) => (
            <HeatBar
              key={day.date}
              day={day}
              isToday={day.date === todayStr}
              isSelected={selectedDate === day.date}
              barIndex={i}
              reduced={reduced}
              onClick={() => handleBarClick(day.date)}
              sectionId={`${baseId}-day-${day.date}`}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="mb-4 h-px bg-[#27272A]" aria-hidden />

      {/* ── Event list ─────────────────────────────────────────────────────── */}
      <div ref={eventListRef} className="space-y-3">
        {!hasAnyEvent ? (
          /* ── Empty state ──────────────────────────────────────────────── */
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.25, delay: 0.3 }}
            className="flex flex-col items-center gap-2 py-8 text-center"
            role="status"
            aria-live="polite"
          >
            <Calendar className="h-8 w-8 text-[#3F3F46]" aria-hidden />
            <p className="text-sm text-[#52525B]">
              Sin eventos en los próximos 14 días.
            </p>
          </motion.div>
        ) : (
          <>
            {/* ── Expanded days ─────────────────────────────────────────── */}
            <AnimatePresence initial={false}>
              {expandedDays.map(({ dateStr, events }) => (
                <motion.div
                  key={dateStr}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.22, delay: 0.3 }
                  }
                >
                  <DaySection
                    dateStr={dateStr}
                    events={events}
                    isHighlighted={selectedDate === dateStr}
                    sectionId={`${baseId}-day-${dateStr}`}
                    reduced={reduced}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ── Week summary (collapsed remainder) ────────────────────── */}
            {summaryEvents.length > 0 && (
              <WeekSummary events={summaryEvents} reduced={reduced} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
