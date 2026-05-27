"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Dumbbell,
  Target,
  Calendar,
  Clock,
  Save,
  Pencil,
  Check,
  Link2,
  Link2Off,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { SupersetBadge } from "@/components/shared/superset-badge";
import { getSupersetColor, getSupersetLetter } from "@/lib/supersets";
import { useRoutineBuilderStore } from "@/stores/routine-builder-store";
import type { DraftExercise, DraftDay } from "@/stores/routine-builder-store";
import {
  createRoutineTemplate,
  updateRoutineTemplate,
  addExerciseToDay,
  removeExerciseFromDay as removeExerciseFromDayAction,
  updateExerciseInDay,
  addRoutineDay,
  deleteRoutineDay,
  reorderExercises as reorderExercisesAction,
  createCustomGoal,
  listCustomGoals,
} from "@/app/actions/routines";
import { searchExercises } from "@/app/actions/exercises";
import { useDebounce } from "@/hooks/use-debounce";
import type { ExerciseSearchResult } from "@/types/api";

// ── Schema ────────────────────────────────────────────────────────────────────

const metaSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").max(100),
  goal: z.string().min(1, "Seleccioná un objetivo"),
  splitDays: z.number().min(1).max(7),
  durationWeeks: z.number().min(1).max(52),
});

type MetaValues = z.infer<typeof metaSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS: Array<{ value: string; label: string; color: string }> = [
  { value: "HYPERTROPHY", label: "Hipertrofia",        color: "var(--brand-primary)" },
  { value: "STRENGTH",    label: "Fuerza",             color: "var(--brand-primary)" },
  { value: "ENDURANCE",   label: "Resistencia",        color: "#22C55E" },
  { value: "FAT_LOSS",    label: "Pérdida de grasa",   color: "#F59E0B" },
  { value: "GENERAL",     label: "General / Mantenimiento", color: "#A855F7" },
];

const DAY_COLORS = [
  "var(--brand-primary)", // Day 1
  "var(--brand-primary)", // Day 2
  "#22C55E", // Day 3 — green
  "#A855F7", // Day 4 — purple
  "#F59E0B", // Day 5 — amber
  "#EC4899", // Day 6+ — pink
] as const;

function getDayColor(index: number): string {
  return DAY_COLORS[Math.min(index, DAY_COLORS.length - 1)] ?? "#EC4899";
}

// ── Superset visuals — getSupersetColor / getSupersetLetter viven en
//    `@/lib/supersets` (compartidos con el player del cliente). ─────────────

/**
 * Decide qué tipo de drop está intentando el usuario en base a la posición
 * vertical del puntero relativa al rectángulo del target.
 *
 * Banda central (35%–65% de la altura) → "group" (agrupar A con B).
 * Resto → "reorder" (insertar antes o después según el lado).
 */
function detectDropZone(pointerY: number, rect: { top: number; height: number }): "group" | "reorder" {
  if (rect.height <= 0) return "reorder";
  const relY = (pointerY - rect.top) / rect.height;
  return relY >= 0.35 && relY <= 0.65 ? "group" : "reorder";
}

// ── Rest Seconds Selector ─────────────────────────────────────────────────────

const REST_PRESETS = [30, 45, 60, 90, 120, 180] as const;

function formatRestLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RestSecondsSelector({
  value,
  onChange,
  inputId,
}: {
  value: number;
  onChange: (seconds: number) => void;
  inputId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  const commit = () => {
    const next = Math.max(0, Math.min(900, Number(draft) || 0));
    onChange(next);
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  const isPreset = (REST_PRESETS as readonly number[]).includes(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={inputId}
          className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#52525B]"
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          Descanso entre sets
        </Label>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] text-[#71717A] hover:text-brand-primary transition-colors min-h-[28px] px-1.5"
            aria-label="Editar descanso manualmente"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            max={900}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="h-8 w-24 text-xs px-2 bg-[#09090B] border-[#3F3F46] focus:border-brand-primary"
          />
          <span className="text-[11px] text-[#71717A]">segundos</span>
          <button
            type="button"
            onClick={commit}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors"
            aria-label="Guardar descanso"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={cancel}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3F3F46] text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {REST_PRESETS.map((sec) => {
            const active = value === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => onChange(sec)}
                className={[
                  "rounded-full px-2.5 py-1 text-[11px] font-medium tabular transition-colors min-h-[28px]",
                  active
                    ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/30"
                    : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]",
                ].join(" ")}
                aria-pressed={active}
              >
                {formatRestLabel(sec)}
              </button>
            );
          })}
          {!isPreset && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2.5 py-1 text-[11px] font-medium tabular text-white shadow-sm shadow-brand-primary/30"
              aria-label={`Descanso personalizado de ${value} segundos`}
            >
              {formatRestLabel(value)}
              <span className="text-[9px] uppercase tracking-wide opacity-80">custom</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Day exercise rendering — segments + cluster wrapper ──────────────────────

type DaySegment =
  | { kind: "single"; exercise: DraftExercise }
  | { kind: "group"; group: number; exercises: DraftExercise[] };

/**
 * Convierte la lista de ejercicios de un día en "segmentos" para el render:
 * - Ejercicios consecutivos con el mismo `supersetGroup` forman un segmento
 *   `group` (se renderizará dentro de un <SupersetCluster>).
 * - Cada ejercicio sin grupo (o cuyo grupo no es contiguo) es un segmento
 *   `single`.
 *
 * La adyacencia la mantiene la action `groupExercises` del store, así que en
 * la práctica los miembros de un grupo siempre quedan consecutivos.
 */
function computeDaySegments(exercises: DraftExercise[]): DaySegment[] {
  const segments: DaySegment[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (!ex) break;
    if (ex.supersetGroup === null) {
      segments.push({ kind: "single", exercise: ex });
      i += 1;
      continue;
    }
    const group = ex.supersetGroup;
    const start = i;
    while (i < exercises.length && exercises[i]?.supersetGroup === group) {
      i += 1;
    }
    segments.push({
      kind: "group",
      group,
      exercises: exercises.slice(start, i),
    });
  }
  return segments;
}

/**
 * Card visual que envuelve los miembros consecutivos de una superserie.
 * - Header coloreado: badge SS-X + "Superserie X" + conteo + acciones.
 * - Cuerpo: expandido (default) renderiza los children (rows sortable).
 *   Colapsado renderiza chips con los nombres de los miembros.
 * - Botón "Disolver" rompe el grupo entero (todos los miembros vuelven a
 *   estar sueltos).
 */
function SupersetCluster({
  group,
  members,
  onDissolve,
  forceExpanded,
  children,
}: {
  group: number;
  members: DraftExercise[];
  onDissolve: (group: number) => void;
  /** Cuando true, ignora el state local de colapsado — siempre renderiza
   *  expandido. Lo usamos durante drag para que los miembros sean drop
   *  targets aunque el usuario los hubiera colapsado. */
  forceExpanded: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const effectivelyCollapsed = collapsed && !forceExpanded;
  const color = getSupersetColor(group);
  const letter = getSupersetLetter(group);
  const count = members.length;

  return (
    <div
      className="rounded-xl border-2 bg-[#0F0F11] overflow-hidden"
      style={{ borderColor: color }}
    >
      {/* Header con tinte del color del grupo. El ícono de cadena toma el
          color del grupo y reemplaza al badge "SS-X" — el título a la derecha
          ya dice "Superserie A" explícitamente, así que el badge sería
          redundante (la pregunta "¿qué significa SS-A?" salió varias veces). */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{
          borderBottomColor: color,
          backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          }}
          aria-hidden="true"
        >
          <Link2 className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color }}>
            Superserie {letter}
          </p>
          <p className="text-[10px] text-[#A1A1AA] tabular">
            {count} {count === 1 ? "ejercicio" : "ejercicios"} ·{" "}
            <span className="text-[#71717A]">
              hacer en bloque sin descanso largo entre miembros
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDissolve(group)}
          className="inline-flex items-center gap-1 rounded-md border border-[#3F3F46] px-2 py-1 text-[10px] text-[#A1A1AA] hover:border-[#EF4444] hover:text-[#EF4444] transition-colors min-h-[28px]"
          title="Disolver toda la superserie"
          aria-label={`Disolver superserie ${letter}`}
        >
          <Link2Off className="h-3 w-3" aria-hidden="true" />
          Disolver
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          disabled={forceExpanded}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors disabled:opacity-50"
          aria-label={effectivelyCollapsed ? "Expandir superserie" : "Colapsar superserie"}
          aria-expanded={!effectivelyCollapsed}
        >
          {effectivelyCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Body: expandido (rows completos) o colapsado (chips). */}
      {effectivelyCollapsed ? (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span
              key={m.id}
              className="rounded-full bg-[#27272A] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]"
            >
              {m.nameEs}
            </span>
          ))}
        </div>
      ) : (
        <div className="p-2 space-y-2">{children}</div>
      )}
    </div>
  );
}

// ── Exercise Row ──────────────────────────────────────────────────────────────

function SortableExerciseRow({
  exercise,
  dayId,
  index,
  isGroupDropTarget,
  insideCluster,
  onUngroup,
}: {
  exercise: DraftExercise;
  dayId: string;
  index: number;
  /** True cuando otro ejercicio se está arrastrando sobre la zona central
   *  de este (= drop = agrupar con éste). Pinta indicador visual. */
  isGroupDropTarget: boolean;
  /** True cuando el row vive dentro de un <SupersetCluster>. En ese caso
   *  ocultamos el badge SS-X inline (el header del cluster lo lleva) y la
   *  banda lateral de color (el wrapper la pinta). Sigue mostrando "Desagrupar"
   *  para sacar individualmente al ejercicio de la superserie. */
  insideCluster: boolean;
  /** Quita este ejercicio de su superserie. */
  onUngroup: (exerciseId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id });
  const removeExerciseFromDay = useRoutineBuilderStore((s) => s.removeExerciseFromDay);
  const updateExercise = useRoutineBuilderStore((s) => s.updateExercise);
  const [removing, setRemoving] = useState(false);

  const supersetColor =
    exercise.supersetGroup !== null ? getSupersetColor(exercise.supersetGroup) : null;
  const supersetLetter =
    exercise.supersetGroup !== null ? getSupersetLetter(exercise.supersetGroup) : null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    // Sólo aplicamos la banda lateral cuando el row está suelto. Dentro de
    // un cluster, el wrapper se encarga de comunicar la pertenencia visual.
    ...(supersetColor && !insideCluster
      ? { borderLeftColor: supersetColor, borderLeftWidth: 3 }
      : {}),
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);

    // If this exercise has a server-side ID, delete it in DB first
    if (exercise.routineExerciseId) {
      const result = await removeExerciseFromDayAction(exercise.routineExerciseId);
      if (!result.ok) {
        toast.error("No se pudo eliminar el ejercicio.");
        setRemoving(false);
        return;
      }
    }

    // Remove from local store
    removeExerciseFromDay(dayId, exercise.id);
  };

  const prescriptionSummary = `${exercise.targetSets} × ${exercise.targetRepsMin}–${exercise.targetRepsMax}${exercise.targetRpe != null ? ` @ RPE ${exercise.targetRpe}` : ""} · ${exercise.restSeconds}s desc`;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: isDragging ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ duration: 0.18 }}
      className={[
        "relative flex items-start gap-2 rounded-lg border border-[#3F3F46] p-3 transition-shadow",
        index % 2 === 0 ? "bg-[#18181B]" : "bg-[#1C1C1F]",
        isDragging ? "shadow-xl shadow-black/50 ring-1 ring-brand-primary/40" : "",
        // Indicador visual cuando otro ejercicio está siendo arrastrado sobre
        // la zona central de éste (= agrupar con éste al soltar).
        isGroupDropTarget
          ? "ring-2 ring-brand-primary ring-offset-1 ring-offset-[#0F0F11] bg-brand-primary/5"
          : "",
      ].join(" ")}
      aria-label={
        supersetLetter
          ? `${exercise.nameEs} (Superserie ${supersetLetter})`
          : exercise.nameEs
      }
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 text-[#3F3F46] hover:text-brand-primary cursor-grab active:cursor-grabbing min-h-[24px] min-w-[24px] flex items-center transition-colors duration-150"
        aria-label="Arrastrar para reordenar o soltar encima de otro para agrupar"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Overlay "Agrupar" mientras se arrastra otro ejercicio sobre la zona
          central de este. Pointer-events-none para no interferir con dnd-kit. */}
      {isGroupDropTarget && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-brand-primary/10 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-primary/30">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Agrupar en superserie
          </span>
        </div>
      )}

      <div className="flex-1 space-y-2.5">
        {/* Exercise name + thumbnail + superset badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[#27272A]">
            <ExerciseThumbnail
              thumbnailUrl={exercise.thumbnailUrl}
              videoUrl={exercise.mediaUrl}
              alt={exercise.nameEs}
              iconSize="sm"
            />
          </div>
          <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">{exercise.nameEs}</p>
          {/* Cuando el row está suelto (no en cluster), mostramos el badge
              y el botón de desagrupar inline. Dentro de un cluster, el
              header carga la identidad del grupo y agregamos sólo el botón
              "Sacar" pequeñito para sacar individualmente. */}
          {!insideCluster && (
            <SupersetBadge group={exercise.supersetGroup} size="sm" />
          )}
          {supersetLetter && (
            <button
              type="button"
              onClick={() => onUngroup(exercise.id)}
              className="inline-flex items-center gap-1 rounded-md border border-[#3F3F46] px-1.5 py-0.5 text-[10px] text-[#71717A] hover:border-[#52525B] hover:text-[#FAFAFA] transition-colors"
              title={
                insideCluster
                  ? "Sacar este ejercicio de la superserie"
                  : "Quitar de superserie"
              }
              aria-label={`Quitar ${exercise.nameEs} de la superserie ${supersetLetter}`}
            >
              <Link2Off className="h-3 w-3" aria-hidden="true" />
              {insideCluster ? "Sacar" : "Desagrupar"}
            </button>
          )}
        </div>

        {/* Prescription summary pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#27272A] px-2.5 py-1 text-[11px] font-mono text-[#A1A1AA]">
          <Target className="h-3 w-3 text-brand-primary" aria-hidden="true" />
          {prescriptionSummary}
        </div>

        {/* Numeric inputs: sets / reps min / reps max */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["targetSets",    "Sets"],
              ["targetRepsMin", "Reps mín"],
              ["targetRepsMax", "Reps máx"],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="space-y-0.5">
              <Label className="text-[10px] uppercase tracking-wide text-[#52525B]">{label}</Label>
              <Input
                type="number"
                inputMode="numeric"
                className="h-7 text-xs px-2 bg-[#09090B] border-[#3F3F46] focus:border-brand-primary"
                value={exercise[field] ?? ""}
                onChange={(e) =>
                  updateExercise(dayId, exercise.id, {
                    [field]: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          ))}
        </div>

        {/* Rest selector: preset chips + pencil to edit manually */}
        <RestSecondsSelector
          value={exercise.restSeconds}
          onChange={(seconds) =>
            updateExercise(dayId, exercise.id, { restSeconds: seconds })
          }
          inputId={`rest-${exercise.id}`}
        />
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="mt-0.5 text-[#3F3F46] hover:text-[#EF4444] transition-colors duration-150 hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-50"
        aria-label={"Eliminar " + exercise.nameEs}
      >
        {removing
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Trash2 className="h-4 w-4" aria-hidden="true" />}
      </button>
    </motion.div>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────

function DayCard({
  day,
  onAddExercise,
}: {
  day: DraftDay;
  onAddExercise: (dayId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [removingDay, setRemovingDay] = useState(false);
  const removeDay = useRoutineBuilderStore((s) => s.removeDay);
  const updateDayName = useRoutineBuilderStore((s) => s.updateDayName);
  const reorderExercisesInDay = useRoutineBuilderStore((s) => s.reorderExercisesInDay);
  const groupExercises = useRoutineBuilderStore((s) => s.groupExercises);
  const ungroupExercise = useRoutineBuilderStore((s) => s.ungroupExercise);
  const dissolveSuperset = useRoutineBuilderStore((s) => s.dissolveSuperset);
  const normalizeOrphansInDay = useRoutineBuilderStore(
    (s) => s.normalizeOrphansInDay,
  );
  const accentColor = getDayColor(day.dayIndex);

  // Segmentos del día: clusters de superserie + ejercicios sueltos. Se
  // recalculan en cada render (la lista es pequeña). El SortableContext
  // sigue recibiendo todos los IDs en orden, así que dnd-kit no se entera
  // de los clusters — son sólo un wrapper visual.
  const daySegments = computeDaySegments(day.exercises);

  // Estado del drag: cuál ejercicio se está arrastrando (active) y cuál es el
  // target de agrupación (sólo seteado cuando el puntero está en la banda
  // central del item). Drives the visual "Agrupar" indicator.
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [groupHoverTargetId, setGroupHoverTargetId] = useState<string | null>(null);
  // Ref espejo del state para leer dentro de handleDragEnd sin depender de
  // re-renders (el callback se cierra sobre el valor inicial).
  const groupHoverTargetRef = useRef<string | null>(null);
  useEffect(() => {
    groupHoverTargetRef.current = groupHoverTargetId;
  }, [groupHoverTargetId]);

  const handleRemoveDay = async () => {
    if (removingDay) return;
    if (!confirm(`Eliminar "${day.name}" y todos sus ejercicios?`)) return;

    setRemovingDay(true);
    if (day.routineDayId) {
      const result = await deleteRoutineDay(day.routineDayId);
      if (!result.ok) {
        toast.error("No se pudo eliminar el día.");
        setRemovingDay(false);
        return;
      }
    }
    removeDay(day.id);
    toast.success("Día eliminado.");
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setGroupHoverTargetId(null);
  };

  /**
   * Mientras se arrastra: determina si el puntero está en la banda central
   * del ejercicio sobre el que se hover (intención = agrupar) o en los
   * extremos (intención = reordenar). Actualiza el indicador visual.
   *
   * Caso especial — cross-group move: si la fuente YA está en una superserie
   * y el target está en una superserie DIFERENTE, tratamos cualquier drop
   * (no sólo zona central) como "mover al grupo del target". Coincide con la
   * expectativa natural del usuario: si arrastrás un miembro de SS-A sobre
   * cualquier parte de un miembro de SS-B, querés que SE MUEVA a SS-B.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, delta, activatorEvent } = event;
    if (!over || over.id === active.id) {
      if (groupHoverTargetRef.current !== null) setGroupHoverTargetId(null);
      return;
    }

    const sourceEx = day.exercises.find((e) => e.id === active.id);
    const targetEx = day.exercises.find((e) => e.id === over.id);
    const isCrossGroupMove =
      sourceEx?.supersetGroup != null &&
      targetEx?.supersetGroup != null &&
      sourceEx.supersetGroup !== targetEx.supersetGroup;

    if (isCrossGroupMove) {
      const next = String(over.id);
      if (next !== groupHoverTargetRef.current) setGroupHoverTargetId(next);
      return;
    }

    const rect = over.rect;
    if (!rect || rect.height <= 0) return;

    // Reconstruir Y del puntero: clientY al iniciar el drag + delta acumulado.
    const startY =
      typeof (activatorEvent as PointerEvent).clientY === "number"
        ? (activatorEvent as PointerEvent).clientY
        : 0;
    const pointerY = startY + delta.y;

    const zone = detectDropZone(pointerY, { top: rect.top, height: rect.height });
    const nextTarget = zone === "group" ? String(over.id) : null;
    if (nextTarget !== groupHoverTargetRef.current) {
      setGroupHoverTargetId(nextTarget);
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setGroupHoverTargetId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const groupTarget = groupHoverTargetRef.current;
    // Limpiar estado visual antes de procesar.
    setActiveDragId(null);
    setGroupHoverTargetId(null);

    if (!over || active.id === over.id) return;

    // ── Drop sobre la zona central → AGRUPAR ────────────────────────────
    if (groupTarget && groupTarget === String(over.id)) {
      const sourceId = String(active.id);
      const targetId = groupTarget;

      // Snapshot para rollback.
      const oldExercises = day.exercises.map((e) => ({ ...e }));

      const result = groupExercises(day.id, sourceId, targetId);
      if (!result) {
        toast.error("No se pudo agrupar. Probablemente alcanzaste el tope de 10 superseries.");
        return;
      }

      // Persistir solo si todo tiene server ID. Si la rutina aún no se ha
      // guardado por primera vez, dejamos que el botón Guardar haga el flush.
      const allPersisted = result.exercises.every((e) => e.routineExerciseId);
      if (!day.routineDayId || !allPersisted) {
        toast.success(`Agrupado en superserie ${getSupersetLetter(result.group)}.`);
        return;
      }

      // Detectar qué ejercicios cambiaron de supersetGroup para no spamear
      // updates innecesarios. Compara contra oldExercises.
      const oldGroupById = new Map(oldExercises.map((e) => [e.id, e.supersetGroup]));
      const changedExercises = result.exercises.filter(
        (e) => oldGroupById.get(e.id) !== e.supersetGroup,
      );

      // 1) Actualizar supersetGroup de los ejercicios afectados.
      // 2) Reordenar día completo para reflejar la nueva adyacencia.
      try {
        const updates = changedExercises.map((e) =>
          e.routineExerciseId
            ? updateExerciseInDay({
                routineExerciseId: e.routineExerciseId,
                supersetGroup: e.supersetGroup,
              })
            : Promise.resolve({ ok: true as const, value: { updated: true as const } }),
        );
        const serverIds = result.exercises
          .map((e) => e.routineExerciseId)
          .filter((id): id is string => Boolean(id));
        const reorder = reorderExercisesAction({
          routineDayId: day.routineDayId,
          orderedIds: serverIds,
        });

        const [updateResults, reorderResult] = await Promise.all([
          Promise.all(updates),
          reorder,
        ]);

        const failedUpdate = updateResults.find((r) => !r.ok);
        if (failedUpdate || !reorderResult.ok) {
          throw new Error("group_persist_failed");
        }

        toast.success(`Agrupado en superserie ${getSupersetLetter(result.group)}.`);
      } catch {
        // Rollback completo a la lista previa.
        reorderExercisesInDay(day.id, oldExercises.map((e) => e.id));
        for (const e of oldExercises) {
          // No hacemos update remoto del rollback: si el server rechazó,
          // las filas en DB siguen con su valor original.
          // Solo restauramos el store para reflejar realidad.
          const current = day.exercises.find((x) => x.id === e.id);
          if (current && current.supersetGroup !== e.supersetGroup) {
            // updateExercise vive en store; importarlo arriba.
            useRoutineBuilderStore
              .getState()
              .updateExercise(day.id, e.id, { supersetGroup: e.supersetGroup });
          }
        }
        toast.error("No se pudo guardar la superserie.");
      }
      return;
    }

    // ── Drop fuera de la zona central → REORDENAR (+ normalizar huérfanos) ─
    const oldIndex = day.exercises.findIndex((e) => e.id === active.id);
    const newIndex = day.exercises.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...day.exercises];
    const [moved] = reordered.splice(oldIndex, 1);
    if (!moved) return;
    reordered.splice(newIndex, 0, moved);

    // Snapshot pre-reorder para rollback completo (orden + supersetGroup
    // de cualquier huérfano que normalicemos abajo).
    const beforeExercises = day.exercises.map((e) => ({ ...e }));

    // Optimistic: aplicar reorder y luego normalizar huérfanos.
    reorderExercisesInDay(day.id, reordered.map((e) => e.id));
    const { affectedIds } = normalizeOrphansInDay(day.id);
    // Leer el state post-normalización para conocer los routineExerciseId
    // de los huérfanos que hay que persistir como supersetGroup=null.
    const afterExercises =
      useRoutineBuilderStore
        .getState()
        .days.find((d) => d.id === day.id)?.exercises ?? reordered;

    // Persist: reorder + updates de huérfanos en paralelo.
    const serverIds = afterExercises
      .map((e) => e.routineExerciseId)
      .filter((id): id is string => Boolean(id));
    if (day.routineDayId && serverIds.length === afterExercises.length) {
      const orphanUpdates = afterExercises
        .filter(
          (e) =>
            affectedIds.includes(e.id) && Boolean(e.routineExerciseId),
        )
        .map((e) =>
          updateExerciseInDay({
            routineExerciseId: e.routineExerciseId as string,
            supersetGroup: null,
          }),
        );
      const [reorderResult, ...updateResults] = await Promise.all([
        reorderExercisesAction({
          routineDayId: day.routineDayId,
          orderedIds: serverIds,
        }),
        ...orphanUpdates,
      ]);
      const reorderOk = reorderResult?.ok === true;
      const updatesOk = updateResults.every((r) => r.ok);
      if (!reorderOk || !updatesOk) {
        // Rollback: orden + supersetGroup originales.
        reorderExercisesInDay(
          day.id,
          beforeExercises.map((e) => e.id),
        );
        for (const e of beforeExercises) {
          useRoutineBuilderStore
            .getState()
            .updateExercise(day.id, e.id, { supersetGroup: e.supersetGroup });
        }
        // Surface el error específico del server para que sea debuggable
        // ("INVALID_EXERCISE_ID: x no pertenece a este día." etc.) en vez del
        // mensaje genérico que oculta la causa.
        const failedReorder =
          !reorderOk && reorderResult && !reorderResult.ok
            ? reorderResult.error.message
            : null;
        const failedUpdate = updateResults.find((r) => !r.ok);
        const failedUpdateMsg =
          failedUpdate && !failedUpdate.ok ? failedUpdate.error.message : null;
        const detail = failedReorder ?? failedUpdateMsg ?? "Error desconocido";
        console.error("[reorder] failed:", {
          reorder: reorderResult,
          updates: updateResults,
          orderedIds: serverIds,
          orphanIds: orphanUpdates.length,
        });
        toast.error(`No se pudo guardar el orden — ${detail}`);
        return;
      }
      if (affectedIds.length > 0) {
        toast.success(
          affectedIds.length === 1
            ? "Ejercicio sacado de la superserie."
            : `${affectedIds.length} ejercicios sacados de su superserie.`,
        );
      }
    }
  };

  /**
   * Quita un ejercicio de su superserie y persiste. Si la limpieza del store
   * dejó otro ejercicio sin grupo (porque era el último par del grupo viejo),
   * también lo guarda.
   */
  const handleUngroup = async (exerciseLocalId: string) => {
    const before = day.exercises.map((e) => ({ ...e }));
    const result = ungroupExercise(day.id, exerciseLocalId);
    if (!result) return; // no estaba agrupado

    const oldGroupById = new Map(before.map((e) => [e.id, e.supersetGroup]));
    const changed = result.exercises.filter(
      (e) => oldGroupById.get(e.id) !== e.supersetGroup,
    );

    const persistable = changed.filter((e) => e.routineExerciseId);
    if (persistable.length === 0) return;

    try {
      const updates = persistable.map((e) =>
        updateExerciseInDay({
          routineExerciseId: e.routineExerciseId as string,
          supersetGroup: e.supersetGroup,
        }),
      );
      const results = await Promise.all(updates);
      if (results.some((r) => !r.ok)) throw new Error("ungroup_persist_failed");
      toast.success("Ejercicio sacado de la superserie.");
    } catch {
      // Rollback local — restaurar supersetGroup previo.
      for (const e of before) {
        useRoutineBuilderStore
          .getState()
          .updateExercise(day.id, e.id, { supersetGroup: e.supersetGroup });
      }
      toast.error("No se pudo guardar el cambio.");
    }
  };

  /**
   * Disuelve una superserie completa: todos los miembros pierden su
   * `supersetGroup`. Mismo patrón de rollback que handleUngroup.
   */
  const handleDissolve = async (group: number) => {
    const letter = getSupersetLetter(group);
    if (!confirm(`¿Disolver la Superserie ${letter}? Los ejercicios quedarán sueltos.`)) {
      return;
    }

    const before = day.exercises.map((e) => ({ ...e }));
    const result = dissolveSuperset(day.id, group);
    if (!result) return;

    // Los IDs afectados son locales — necesitamos su routineExerciseId.
    const affectedSet = new Set(result.affectedExerciseIds);
    const persistable = result.exercises.filter(
      (e) => affectedSet.has(e.id) && e.routineExerciseId,
    );
    if (persistable.length === 0) {
      toast.success(`Superserie ${letter} disuelta.`);
      return;
    }

    try {
      const updates = persistable.map((e) =>
        updateExerciseInDay({
          routineExerciseId: e.routineExerciseId as string,
          supersetGroup: null,
        }),
      );
      const results = await Promise.all(updates);
      if (results.some((r) => !r.ok)) throw new Error("dissolve_persist_failed");
      toast.success(`Superserie ${letter} disuelta.`);
    } catch {
      for (const e of before) {
        useRoutineBuilderStore
          .getState()
          .updateExercise(day.id, e.id, { supersetGroup: e.supersetGroup });
      }
      toast.error("No se pudo disolver la superserie.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22 }}
      className="rounded-xl border border-[#3F3F46] bg-[#18181B] overflow-hidden"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3F3F46]">
        {/* Day number circle */}
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        >
          {day.dayIndex + 1}
        </span>

        {/* Editable name */}
        <input
          value={day.name}
          onChange={(e) => updateDayName(day.id, e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold text-[#FAFAFA] focus:outline-none placeholder:text-[#52525B]"
          placeholder="Nombre del día"
          aria-label={"Nombre del día " + (day.dayIndex + 1)}
        />

        {/* Exercise count badge */}
        {day.exercises.length > 0 && (
          <span className="rounded-full bg-[#27272A] px-2 py-0.5 text-[11px] font-semibold text-[#A1A1AA]">
            {day.exercises.length} {day.exercises.length === 1 ? "ejercicio" : "ejercicios"}
          </span>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-[#52525B] hover:text-[#A1A1AA] min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
          aria-label={collapsed ? "Expandir día" : "Colapsar día"}
        >
          {collapsed
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronUp className="h-4 w-4" />}
        </button>

        {/* Remove day */}
        <button
          type="button"
          onClick={handleRemoveDay}
          disabled={removingDay}
          className="text-[#52525B] hover:text-[#EF4444] transition-colors duration-150 hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.5)] min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-50"
          aria-label={"Eliminar día " + day.name}
        >
          {removingDay
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Collapsed summary */}
      <AnimatePresence initial={false}>
        {collapsed && day.exercises.length > 0 && (
          <motion.div
            key="summary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
              {day.exercises.map((ex) => (
                <span
                  key={ex.id}
                  className="rounded-full bg-[#27272A] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]"
                >
                  {ex.nameEs}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragCancel={handleDragCancel}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={day.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence initial={false}>
                    {daySegments.map((segment) => {
                      if (segment.kind === "single") {
                        const ex = segment.exercise;
                        const idx = day.exercises.findIndex((e) => e.id === ex.id);
                        return (
                          <SortableExerciseRow
                            key={ex.id}
                            exercise={ex}
                            dayId={day.id}
                            index={idx}
                            isGroupDropTarget={
                              activeDragId !== null &&
                              activeDragId !== ex.id &&
                              groupHoverTargetId === ex.id
                            }
                            insideCluster={false}
                            onUngroup={handleUngroup}
                          />
                        );
                      }
                      // Cluster de superserie
                      return (
                        <SupersetCluster
                          key={`cluster-${day.id}-${segment.group}`}
                          group={segment.group}
                          members={segment.exercises}
                          onDissolve={handleDissolve}
                          forceExpanded={activeDragId !== null}
                        >
                          {segment.exercises.map((ex) => {
                            const idx = day.exercises.findIndex(
                              (e) => e.id === ex.id,
                            );
                            return (
                              <SortableExerciseRow
                                key={ex.id}
                                exercise={ex}
                                dayId={day.id}
                                index={idx}
                                isGroupDropTarget={
                                  activeDragId !== null &&
                                  activeDragId !== ex.id &&
                                  groupHoverTargetId === ex.id
                                }
                                insideCluster={true}
                                onUngroup={handleUngroup}
                              />
                            );
                          })}
                        </SupersetCluster>
                      );
                    })}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              {day.exercises.length >= 2 && (
                <p className="px-1 text-[10px] text-[#52525B]">
                  Tip: arrastrá un ejercicio sobre <span className="font-medium text-[#71717A]">otro</span> para agruparlos como superserie.
                </p>
              )}

              {day.exercises.length === 0 && (
                <p className="py-4 text-center text-xs text-[#52525B]">
                  Sin ejercicios. Agregá el primero abajo.
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddExercise(day.id)}
                className="w-full gap-2 border-dashed border-[#3F3F46] text-[#71717A] hover:border-brand-primary hover:text-brand-primary transition-colors mt-1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar ejercicio
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Muscle Group Colors (badges) ──────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, { label: string; color: string }> = {
  CHEST:       { label: "Pecho",         color: "#EF4444" },
  BACK:        { label: "Espalda",       color: "var(--brand-primary)" },
  SHOULDERS:   { label: "Hombros",       color: "#F59E0B" },
  BICEPS:      { label: "Bíceps",        color: "#A855F7" },
  TRICEPS:     { label: "Tríceps",       color: "#EC4899" },
  QUADS:       { label: "Cuádriceps",    color: "#22C55E" },
  HAMSTRINGS:  { label: "Isquiotibiales", color: "#14B8A6" },
  GLUTES:      { label: "Glúteos",       color: "#F97316" },
  CALVES:      { label: "Gemelos",       color: "#6366F1" },
  ABS:         { label: "Abdomen",       color: "#06B6D4" },
  OBLIQUES:    { label: "Oblicuos",      color: "#0EA5E9" },
  FOREARMS:    { label: "Antebrazos",    color: "#84CC16" },
  NECK:        { label: "Cuello",        color: "#A1A1AA" },
  FULL_BODY:   { label: "Cuerpo entero", color: "#8B5CF6" },
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL:    "Barra",
  DUMBBELL:   "Mancuerna",
  MACHINE:    "Máquina",
  CABLE:      "Cable",
  BAND:       "Banda",
  BODYWEIGHT: "Peso corporal",
  KETTLEBELL: "Kettlebell",
  OTHER:      "Otro",
};

// ── Exercise Search Panel — REAL search with persistence ─────────────────────

function ExerciseSearchPanel({
  dayId,
  routineDayId, // server-side ID; null when day is local-only (not yet saved)
  onAdded,
  onCancel,
}: {
  dayId: string;
  routineDayId: string | null;
  onAdded: (dayId: string, exercise: DraftExercise) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null); // exerciseId being added
  const debouncedSearch = useDebounce(search, 250);

  // exerciseIds que ya están en el día (para bloquear duplicados antes de
  // enviar la request al server). Se recalcula reactivamente.
  const existingExerciseIds = useRoutineBuilderStore((s) => {
    const day = s.days.find((d) => d.id === dayId);
    return new Set((day?.exercises ?? []).map((e) => e.exerciseId));
  });

  // Real search effect — fires when debouncedSearch changes
  useEffect(() => {
    let cancelled = false;
    const query = debouncedSearch.trim();

    if (query.length === 0) {
      // Empty query: show first 12 exercises (browse mode)
      setSearching(true);
      searchExercises("", undefined, 1, 12).then((res) => {
        if (cancelled) return;
        setResults(res.ok ? res.value.exercises : []);
        setSearching(false);
      });
      return;
    }

    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchExercises(query, undefined, 1, 12).then((res) => {
      if (cancelled) return;
      setResults(res.ok ? res.value.exercises : []);
      setSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const handleSelect = async (ex: ExerciseSearchResult) => {
    if (adding) return; // prevent double-clicks

    if (!routineDayId) {
      toast.error("Guardá la rutina primero antes de agregar ejercicios.");
      return;
    }

    // Pre-check de duplicados (cliente). El server también valida defensivamente.
    if (existingExerciseIds.has(ex.id)) {
      toast.error(
        `"${ex.nameEs}" ya está en este día. Aumentá sets o agregá una superserie en vez de duplicarlo.`,
      );
      return;
    }

    setAdding(ex.id);

    const result = await addExerciseToDay({
      routineDayId,
      exerciseId: ex.id,
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: 90,
    });

    setAdding(null);

    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo agregar el ejercicio.");
      return;
    }

    if (!result.value.routineExerciseId) {
      toast.error("Error interno: el servidor no devolvió un ID. Volvé a intentar.");
      return;
    }

    // Update local store with the real DB ID
    const draft: DraftExercise = {
      id: "local-" + Math.random().toString(36).slice(2),
      routineExerciseId: result.value.routineExerciseId,
      exerciseId: ex.id,
      nameEs: ex.nameEs,
      nameEn: ex.nameEn ?? null,
      slug: ex.slug ?? null,
      thumbnailUrl: ex.thumbnailUrl ?? null,
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetRpe: null,
      restSeconds: 90,
      tempo: null,
      supersetGroup: null,
      notes: null,
      mediaUrl: null,
    };

    onAdded(dayId, draft);
    toast.success(`"${ex.nameEs}" agregado.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-brand-primary/30 bg-[#18181B] p-4 space-y-3 shadow-lg shadow-black/40"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/15">
            <Search className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[#FAFAFA]">Buscar ejercicio</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#27272A] transition-colors"
          aria-label="Cerrar búsqueda"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525B]" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ej: Press de banca, Sentadilla, Curl..."
          autoFocus
          className="pl-9 h-11 bg-[#09090B] border-[#3F3F46] focus:border-brand-primary text-sm placeholder:text-[#52525B]"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-primary animate-spin" aria-hidden="true" />
        )}
      </div>

      {/* Results list */}
      <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
        {!searching && results.length === 0 && search.trim().length >= 2 && (
          <p className="text-center text-xs text-[#52525B] py-6">
            Sin resultados para "{search.trim()}"
          </p>
        )}

        {!searching && results.length === 0 && search.trim().length === 0 && (
          <p className="text-center text-xs text-[#52525B] py-6">
            Cargando biblioteca...
          </p>
        )}

        {results.map((ex) => {
          const muscle = MUSCLE_LABELS[ex.primaryMuscle];
          const equipment = EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment;
          const isAdding = adding === ex.id;
          const alreadyAdded = existingExerciseIds.has(ex.id);

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelect(ex)}
              disabled={isAdding || adding !== null || alreadyAdded}
              title={alreadyAdded ? "Ya está en este día" : undefined}
              className={[
                "w-full text-left rounded-lg border p-2.5 transition-colors flex items-center gap-3 group",
                alreadyAdded
                  ? "border-[#27272A] bg-[#0F0F11] cursor-not-allowed"
                  : "border-[#3F3F46] bg-[#09090B] hover:border-brand-primary hover:bg-brand-primary/5",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[#27272A]">
                <ExerciseThumbnail
                  thumbnailUrl={ex.thumbnailUrl}
                  alt={ex.nameEs}
                  iconSize="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={[
                      "text-sm font-medium truncate transition-colors",
                      alreadyAdded
                        ? "text-[#71717A]"
                        : "text-[#FAFAFA] group-hover:text-brand-primary",
                    ].join(" ")}
                  >
                    {ex.nameEs}
                  </p>
                  {alreadyAdded && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#22C55E]">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                      Ya agregado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {muscle && (
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: muscle.color, backgroundColor: `${muscle.color}1A` }}
                    >
                      {muscle.label}
                    </span>
                  )}
                  <span className="text-[10px] text-[#71717A]">·</span>
                  <span className="text-[10px] text-[#71717A]">{equipment}</span>
                </div>
              </div>
              {isAdding ? (
                <Loader2 className="h-4 w-4 text-brand-primary animate-spin shrink-0" aria-hidden="true" />
              ) : alreadyAdded ? (
                <Check
                  className="h-4 w-4 text-[#52525B] shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Plus className="h-4 w-4 text-[#52525B] group-hover:text-brand-primary transition-colors shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {!routineDayId && (
        <p className="text-center text-[11px] text-[#F59E0B] bg-[#F59E0B]/10 rounded-md py-2 px-3">
          Guardá la rutina primero para poder agregar ejercicios.
        </p>
      )}
    </motion.div>
  );
}

// ── Meta Form ─────────────────────────────────────────────────────────────────

function MetaForm({
  form,
  customGoals,
  onCreateGoal,
}: {
  form: ReturnType<typeof useForm<MetaValues>>;
  customGoals: Array<{ id: string; name: string }>;
  onCreateGoal: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-1 border-b border-[#27272A]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary/15">
          <Dumbbell className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
          Configuración de la rutina
        </p>
      </div>

      <Form {...form}>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name — full width */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs text-[#A1A1AA] uppercase tracking-wide">
                  Nombre de la rutina
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Full Body 4 días"
                    className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Goal */}
          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs text-[#A1A1AA] uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-brand-primary" aria-hidden="true" />
                  Objetivo
                </FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#09090B] border-[#3F3F46] h-11 text-sm">
                        <SelectValue placeholder="Elegí un objetivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#18181B] border-[#3F3F46]">
                      {GOALS.map((g) => (
                        <SelectItem key={g.value} value={g.value} className="text-sm">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: g.color }}
                              aria-hidden="true"
                            />
                            {g.label}
                          </div>
                        </SelectItem>
                      ))}
                      {customGoals.map((g) => (
                        <SelectItem key={g.id} value={g.name} className="text-sm">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 bg-[#A1A1AA]"
                              aria-hidden="true"
                            />
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onCreateGoal}
                    title="Crear objetivo"
                    className="h-11 w-11 shrink-0 border-[#3F3F46] bg-[#09090B] text-[#A1A1AA] hover:border-brand-primary hover:text-brand-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Split days */}
          <FormField
            control={form.control}
            name="splitDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-[#A1A1AA] uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-brand-primary" aria-hidden="true" />
                  Días/semana
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm pr-12"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#52525B]">
                      días
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationWeeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-[#A1A1AA] uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-brand-primary" aria-hidden="true" />
                  Duración
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary h-11 text-sm pr-16"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#52525B]">
                      semanas
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────

interface RoutineBuilderProps {
  routineId?: string;
  onSaved?: (routineId: string) => void;
}

export function RoutineBuilder({ routineId: _routineId, onSaved }: RoutineBuilderProps) {
  const router = useRouter();

  // Bug #1: per-field selectors — never subscribe to the whole store
  const routineId   = useRoutineBuilderStore((s) => s.routineId);
  const storeName   = useRoutineBuilderStore((s) => s.name);
  const storeGoal   = useRoutineBuilderStore((s) => s.goal);
  const splitDays   = useRoutineBuilderStore((s) => s.splitDays);
  const durationWeeks = useRoutineBuilderStore((s) => s.durationWeeks);
  const days        = useRoutineBuilderStore((s) => s.days);
  const isDirty     = useRoutineBuilderStore((s) => s.isDirty);
  const setMeta     = useRoutineBuilderStore((s) => s.setMeta);
  const markSaved   = useRoutineBuilderStore((s) => s.markSaved);
  const addDay      = useRoutineBuilderStore((s) => s.addDay);
  const addExerciseToDayStore = useRoutineBuilderStore((s) => s.addExerciseToDay);

  const [saving, setSaving] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [, startTransition] = useTransition();
  const [addExerciseDayId, setAddExerciseDayId] = useState<string | null>(null);
  const [customGoals, setCustomGoals] = useState<Array<{ id: string; name: string }>>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // Bug #2: warn on unsaved changes before leaving
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const form = useForm<MetaValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      name: storeName,
      goal: storeGoal,
      splitDays: splitDays,
      durationWeeks: durationWeeks,
    },
  });

  useEffect(() => {
    listCustomGoals().then((r) => { if (r.ok) setCustomGoals(r.value); });
  }, []);

  // Sync form defaults when store changes (e.g. on initFromExisting)
  useEffect(() => {
    form.reset({
      name: storeName,
      goal: storeGoal,
      splitDays: splitDays,
      durationWeeks: durationWeeks,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId]);

  const handleSave = async (values: MetaValues) => {
    setSaving(true);
    try {
      setMeta(values);

      if (!routineId) {
        // New routine: create template only (exercises must be added after navigation)
        const result = await createRoutineTemplate(values);
        if (!result.ok) {
          toast.error("No se pudo crear la rutina. Reintentá.");
          return;
        }
        markSaved();
        onSaved?.(result.value.routineId);
        toast.success("Rutina creada. Ya podés agregar ejercicios.");
        router.push(`/trainer/rutinas/${result.value.routineId}`);
        return;
      }

      // Existing routine: persist meta updates
      const updateResult = await updateRoutineTemplate({
        routineId: routineId,
        ...values,
      });
      if (!updateResult.ok) {
        toast.error(updateResult.error.message ?? "No se pudieron guardar los cambios.");
        return;
      }

      // Persist prescription edits for each existing exercise
      const updates: Promise<unknown>[] = [];
      for (const day of days) {
        for (const ex of day.exercises) {
          if (!ex.routineExerciseId) continue;
          updates.push(
            updateExerciseInDay({
              routineExerciseId: ex.routineExerciseId,
              targetSets: ex.targetSets,
              targetRepsMin: ex.targetRepsMin,
              targetRepsMax: ex.targetRepsMax,
              restSeconds: ex.restSeconds,
              targetRpe: ex.targetRpe,
              tempo: ex.tempo,
              supersetGroup: ex.supersetGroup,
              notes: ex.notes,
              mediaUrl: ex.mediaUrl,
            }),
          );
        }
      }
      await Promise.all(updates);

      markSaved();
      toast.success("Cambios guardados.");
      // Refresh server data so the page reflects the latest state
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  };

  const handleExerciseAdded = (dayId: string, exercise: DraftExercise) => {
    addExerciseToDayStore(dayId, exercise);
    markSaved(); // already persisted to DB
    setAddExerciseDayId(null);
    startTransition(() => router.refresh());
  };

  // Find the routineDayId (server-side ID) for the day being added to
  const targetRoutineDayId =
    addExerciseDayId
      ? days.find((d) => d.id === addExerciseDayId)?.routineDayId ?? null
      : null;

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div className="space-y-5">
      {/* Meta form */}
      <MetaForm form={form} customGoals={customGoals} onCreateGoal={() => setGoalDialogOpen(true)} />

      {/* Stats chips */}
      {(days.length > 0 || totalExercises > 0) && (
        <div className="flex flex-wrap gap-2 px-1">
          {[
            { icon: Calendar, label: `${days.length} ${days.length === 1 ? "día" : "días"}` },
            { icon: Dumbbell, label: `${totalExercises} ejercicios` },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3F3F46] bg-[#18181B] px-3 py-1 text-xs text-[#A1A1AA]"
            >
              <Icon className="h-3 w-3 text-brand-primary" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Day cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Días de entrenamiento
          </p>
          <div className="h-px flex-1 bg-[#27272A]" />
        </div>

        <AnimatePresence initial={false}>
          {days.map((day) => (
            <DayCard key={day.id} day={day} onAddExercise={setAddExerciseDayId} />
          ))}
        </AnimatePresence>

        <Button
          type="button"
          variant="outline"
          disabled={addingDay || !routineId}
          onClick={async () => {
            if (!routineId) {
              toast.error("Guardá la rutina primero antes de agregar días.");
              return;
            }
            setAddingDay(true);
            const dayName = "Día " + (days.length + 1);
            const result = await addRoutineDay({
              routineId: routineId,
              dayIndex: days.length,
              name: dayName,
            });
            setAddingDay(false);
            if (!result.ok) {
              toast.error(result.error.message ?? "No se pudo crear el día.");
              return;
            }
            addDay(dayName, result.value.dayId);
            toast.success("Día agregado.");
            startTransition(() => router.refresh());
          }}
          className="w-full gap-2 border-dashed border-[#3F3F46] text-[#71717A] hover:border-brand-primary hover:text-brand-primary transition-colors h-11 disabled:opacity-50"
        >
          {addingDay
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Plus className="h-4 w-4" aria-hidden="true" />}
          {addingDay ? "Creando día..." : "Agregar día"}
        </Button>
      </div>

      {/* Exercise search panel */}
      <AnimatePresence>
        {addExerciseDayId && (
          <ExerciseSearchPanel
            key={addExerciseDayId}
            dayId={addExerciseDayId}
            routineDayId={targetRoutineDayId}
            onAdded={handleExerciseAdded}
            onCancel={() => setAddExerciseDayId(null)}
          />
        )}
      </AnimatePresence>

      {/* Save button */}
      <button
        type="button"
        onClick={form.handleSubmit(handleSave)}
        disabled={saving}
        className={[
          "relative w-full h-12 rounded-xl font-semibold text-white text-sm",
          "bg-gradient-to-r from-brand-primary to-brand-primary-hover",
          "transition-all duration-200",
          "flex items-center justify-center gap-2.5",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
          "enabled:hover:shadow-[0_0_20px_rgba(255,106,26,0.45)] enabled:hover:brightness-110",
          "enabled:active:scale-[0.98]",
        ].join(" ")}
        aria-disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar rutina
          </>
        )}
      </button>

      {goalDialogOpen && (
        <CreateGoalInlineDialog
          onClose={() => setGoalDialogOpen(false)}
          onCreated={(g) => {
            setCustomGoals((prev) => [...prev, g].sort((a, b) => a.name.localeCompare(b.name)));
            form.setValue("goal", g.name);
            setGoalDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CreateGoalInlineDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (goal: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = await createCustomGoal(trimmed);
    setSaving(false);
    if (result.ok) {
      toast.success("Objetivo creado");
      onCreated(result.value);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">Nuevo objetivo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input
          ref={inputRef}
          placeholder="Ej: Flexibilidad, Rehabilitación..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
          }}
          maxLength={50}
          className="bg-[#27272A] border-[#3F3F46]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
