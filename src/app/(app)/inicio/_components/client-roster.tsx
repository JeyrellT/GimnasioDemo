"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Users, Search, ChevronDown } from "lucide-react";
import type { Goal, ParqStatus } from "@prisma/client";
import type { DashboardRosterItem } from "@/types/dashboard";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 8;

const GOAL_LABELS: Record<Goal, string> = {
  FAT_LOSS: "Pérdida de grasa",
  MUSCLE_GAIN: "Ganancia muscular",
  MAINTENANCE: "Mantenimiento",
  PERFORMANCE: "Performance",
  GENERAL_HEALTH: "Salud general",
};

type SortKey =
  | "adherence-desc"
  | "adherence-asc"
  | "last-session-desc"
  | "last-session-asc"
  | "name-asc"
  | "alerts-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "adherence-desc", label: "Adherencia ↓" },
  { value: "adherence-asc", label: "Adherencia ↑" },
  { value: "last-session-desc", label: "Última sesión ↓" },
  { value: "last-session-asc", label: "Última sesión ↑" },
  { value: "name-asc", label: "Nombre A-Z" },
  { value: "alerts-desc", label: "Alertas ↓" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeDate(isoString: string | null): string {
  if (!isoString) return "Nunca";

  const now = new Date();
  const date = new Date(isoString);

  // Normalize to date-only for day comparison
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = nowDay.getTime() - dateDay.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 14) return "Hace 1 semana";
  const weeks = Math.round(diffDays / 7);
  return `Hace ${weeks} semanas`;
}

function adherenceColor(pct: number | null): string {
  if (pct === null) return "#52525B";
  if (pct >= 80) return "#22C55E";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function buildSubtitle(item: DashboardRosterItem): string {
  const goalLabel = item.goal ? GOAL_LABELS[item.goal] : null;
  if (item.activeRoutineName && goalLabel) {
    return `${item.activeRoutineName} · ${goalLabel}`;
  }
  if (item.activeRoutineName) return item.activeRoutineName;
  if (goalLabel) return goalLabel;
  return "Sin rutina activa";
}

function sortItems(items: DashboardRosterItem[], sortBy: SortKey): DashboardRosterItem[] {
  const copy = [...items];
  switch (sortBy) {
    case "adherence-desc":
      return copy.sort((a, b) => (b.adherencePct7d ?? -1) - (a.adherencePct7d ?? -1));
    case "adherence-asc":
      return copy.sort((a, b) => (a.adherencePct7d ?? 999) - (b.adherencePct7d ?? 999));
    case "last-session-desc":
      return copy.sort(
        (a, b) =>
          new Date(b.lastSessionAt ?? 0).getTime() -
          new Date(a.lastSessionAt ?? 0).getTime(),
      );
    case "last-session-asc":
      return copy.sort(
        (a, b) =>
          new Date(a.lastSessionAt ?? 0).getTime() -
          new Date(b.lastSessionAt ?? 0).getTime(),
      );
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "alerts-desc":
      return copy.sort((a, b) => b.alertCount - a.alertCount);
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface RosterAvatarProps {
  src: string | null;
  name: string;
}

function RosterAvatar({ src, name }: RosterAvatarProps) {
  const initials = getInitials(name);
  return (
    <div className="relative h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#FF6A1A] to-[#C04A00] p-[1.5px]">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#1C1C1F]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#FF6A1A]">{initials}</span>
        )}
      </div>
    </div>
  );
}

interface ParqBadgeProps {
  status: ParqStatus;
}

function ParqBadge({ status }: ParqBadgeProps) {
  if (status === "RED") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
        style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
        Alerta
      </span>
    );
  }
  if (status === "REVIEW") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
        style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
        PAR-Q
      </span>
    );
  }
  return <span className="text-xs text-[#52525B]">&mdash;</span>;
}

interface AlertChipProps {
  count: number;
}

function AlertChip({ count }: AlertChipProps) {
  if (count === 0) {
    return <span className="text-xs text-[#52525B]">&mdash;</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
      style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
      ⚠{count}
    </span>
  );
}

interface AdherenceBarProps {
  pct: number | null;
}

function AdherenceBar({ pct }: AdherenceBarProps) {
  if (pct === null) {
    return <span className="text-xs text-[#52525B]">Sin datos</span>;
  }
  const color = adherenceColor(pct);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-[#3F3F46]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="min-w-[2.5rem] text-right text-xs font-medium tabular-nums"
        style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ── Roster Row ─────────────────────────────────────────────────────────────────

interface RosterRowProps {
  item: DashboardRosterItem;
  index: number;
  reduceMotion: boolean;
}

function RosterRow({ item, index, reduceMotion }: RosterRowProps) {
  const delay = reduceMotion ? 0 : Math.min(index * 40, 480);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: delay / 1000, ease: "easeOut" }}
    >
      <Link
        href={`/trainer/clientes/${item.clientId}`}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 transition-all duration-150",
          "hover:bg-[#27272A] active:bg-[#27272A]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A] focus-visible:ring-inset",
        )}
        style={
          reduceMotion
            ? undefined
            : {
                // Subtle hover translate via CSS var for performance
                transition: "background-color 150ms ease, transform 150ms ease",
              }
        }
      >
        {/* Main row content */}
        <motion.div
          className="flex w-full min-w-0 items-start gap-3"
          whileHover={reduceMotion ? undefined : { x: 2, scale: 1.005 }}
          transition={{ duration: 0.12 }}
        >
          {/* Avatar */}
          <RosterAvatar src={item.avatarUrl} name={item.name} />

          {/* Name + subtitle */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#FAFAFA]">{item.name}</p>
            <p className="truncate text-xs text-[#71717A]">{buildSubtitle(item)}</p>
          </div>

          {/* Right-side stats — on mobile these stack below (see wrapper grid) */}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-1">
            {/* Adherence bar */}
            <div className="hidden sm:flex">
              <AdherenceBar pct={item.adherencePct7d} />
            </div>

            {/* Last session */}
            <span className="hidden w-24 text-right text-xs text-[#71717A] sm:block">
              {formatRelativeDate(item.lastSessionAt)}
            </span>

            {/* PAR-Q badge */}
            <div className="w-14 text-right">
              <ParqBadge status={item.parqStatus} />
            </div>

            {/* Alert chip */}
            <div className="w-10 text-right">
              <AlertChip count={item.alertCount} />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Mobile-only second line */}
      <div className="flex items-center gap-4 px-4 pb-2 sm:hidden">
        <div className="w-8 shrink-0" /> {/* avatar placeholder */}
        <AdherenceBar pct={item.adherencePct7d} />
        <span className="ml-auto text-xs text-[#71717A]">
          {formatRelativeDate(item.lastSessionAt)}
        </span>
      </div>
    </motion.div>
  );
}

// ── Sort Dropdown ──────────────────────────────────────────────────────────────

interface SortDropdownProps {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const current = SORT_OPTIONS.find((o) => o.value === value);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Ordenar clientes por"
        className={cn(
          "appearance-none rounded-lg border border-[#3F3F46] bg-[#27272A]",
          "pl-3 pr-8 py-1.5 text-xs font-medium text-[#FAFAFA]",
          "cursor-pointer transition-colors hover:border-[#52525B]",
          "focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]",
        )}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]"
        aria-hidden="true"
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export interface ClientRosterProps {
  /** Initial items fetched server-side */
  items: DashboardRosterItem[];
  className?: string;
}

export function ClientRoster({ items, className }: ClientRosterProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("adherence-desc");
  const reduceMotion = useReducedMotion() ?? false;

  const sortedAndFiltered = useMemo<DashboardRosterItem[]>(() => {
    let result = [...items];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q),
      );
    }

    return sortItems(result, sortBy);
  }, [items, search, sortBy]);

  const visible = sortedAndFiltered.slice(0, MAX_VISIBLE);
  const overflow = sortedAndFiltered.length - MAX_VISIBLE;
  const isSearchActive = search.trim().length > 0;

  return (
    <section
      className={cn(
        "rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4",
        className,
      )}
      aria-label="Roster de clientes"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Tus clientes
          </h2>
          <p className="mt-0.5 text-sm text-[#A1A1AA]">
            {sortedAndFiltered.length === 1
              ? "1 mostrado"
              : `${sortedAndFiltered.length} mostrados`}
          </p>
        </div>
        <Link
          href="/trainer/clientes"
          className="shrink-0 text-xs font-medium text-[#FF6A1A] transition-colors hover:text-[#C04A00] focus-visible:outline-none focus-visible:underline"
        >
          Ver todos
        </Link>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <SortDropdown value={sortBy} onChange={setSortBy} />
        <div className="relative min-w-[160px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525B]"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar cliente"
            className={cn(
              "w-full rounded-lg border border-[#3F3F46] bg-[#27272A]",
              "pl-8 pr-3 py-1.5 text-xs text-[#FAFAFA] placeholder:text-[#52525B]",
              "transition-colors hover:border-[#52525B]",
              "focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]",
            )}
          />
        </div>
      </div>

      {/* Roster list */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isSearchActive ? "Sin coincidencias" : "Sin clientes"}
          description={
            isSearchActive
              ? "No hay clientes que coincidan con los filtros."
              : "Todavía no tenés clientes activos asignados."
          }
          {...(isSearchActive
            ? {}
            : {
                action: {
                  label: "Ir a clientes",
                  href: "/trainer/clientes",
                },
              })}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#3F3F46]">
          {/* Column headers — visible sm+ */}
          <div className="hidden grid-cols-[1fr_auto] items-center border-b border-[#3F3F46] px-4 py-2 sm:grid">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#52525B]">
              Cliente
            </span>
            <div className="flex items-center gap-x-4">
              <span className="w-28 text-right text-[10px] font-medium uppercase tracking-wider text-[#52525B]">
                Adherencia 7d
              </span>
              <span className="w-24 text-right text-[10px] font-medium uppercase tracking-wider text-[#52525B]">
                Última sesión
              </span>
              <span className="w-14 text-right text-[10px] font-medium uppercase tracking-wider text-[#52525B]">
                PAR-Q
              </span>
              <span className="w-10 text-right text-[10px] font-medium uppercase tracking-wider text-[#52525B]">
                Alertas
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#3F3F46]">
            {visible.map((item, index) => (
              <RosterRow
                key={item.clientId}
                item={item}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
      )}

      {/* "Ver X más" footer */}
      {overflow > 0 && (
        <div className="pt-1 text-center">
          <Link
            href="/trainer/clientes"
            className="text-xs font-medium text-[#71717A] transition-colors hover:text-[#FF6A1A] focus-visible:outline-none focus-visible:underline"
          >
            + {overflow} {overflow === 1 ? "más" : "más"}
          </Link>
        </div>
      )}
    </section>
  );
}
