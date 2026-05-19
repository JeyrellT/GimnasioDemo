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

// ── Exercise Row ──────────────────────────────────────────────────────────────

function SortableExerciseRow({
  exercise,
  dayId,
  index,
}: {
  exercise: DraftExercise;
  dayId: string;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id });
  const { removeExerciseFromDay, updateExercise } = useRoutineBuilderStore();
  const [removing, setRemoving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
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
        "flex items-start gap-2 rounded-lg border border-[#3F3F46] p-3 transition-shadow",
        index % 2 === 0 ? "bg-[#18181B]" : "bg-[#1C1C1F]",
        isDragging ? "shadow-xl shadow-black/50 ring-1 ring-brand-primary/40" : "",
      ].join(" ")}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 text-[#3F3F46] hover:text-brand-primary cursor-grab active:cursor-grabbing min-h-[24px] min-w-[24px] flex items-center transition-colors duration-150"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex-1 space-y-2.5">
        {/* Exercise name + thumbnail */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[#27272A]">
            <ExerciseThumbnail
              thumbnailUrl={exercise.thumbnailUrl}
              slug={exercise.slug}
              nameEn={exercise.nameEn}
              alt={exercise.nameEs}
              iconSize="sm"
            />
          </div>
          <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">{exercise.nameEs}</p>
        </div>

        {/* Prescription summary pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#27272A] px-2.5 py-1 text-[11px] font-mono text-[#A1A1AA]">
          <Target className="h-3 w-3 text-brand-primary" aria-hidden="true" />
          {prescriptionSummary}
        </div>

        {/* Numeric inputs */}
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["targetSets",    "Sets"],
              ["targetRepsMin", "Reps mín"],
              ["targetRepsMax", "Reps máx"],
              ["restSeconds",   "Desc (s)"],
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
  const { removeDay, updateDayName, reorderExercisesInDay } = useRoutineBuilderStore();
  const accentColor = getDayColor(day.dayIndex);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = day.exercises.findIndex((e) => e.id === active.id);
    const newIndex = day.exercises.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...day.exercises];
    const [moved] = reordered.splice(oldIndex, 1);
    if (!moved) return;
    reordered.splice(newIndex, 0, moved);

    // Optimistic update in store
    reorderExercisesInDay(day.id, reordered.map((e) => e.id));

    // Persist to DB if all exercises have server IDs
    const serverIds = reordered
      .map((e) => e.routineExerciseId)
      .filter((id): id is string => Boolean(id));
    if (day.routineDayId && serverIds.length === reordered.length) {
      const result = await reorderExercisesAction({
        routineDayId: day.routineDayId,
        orderedIds: serverIds,
      });
      if (!result.ok) {
        toast.error("No se pudo guardar el orden.");
      }
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
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={day.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence initial={false}>
                    {day.exercises.map((ex, idx) => (
                      <SortableExerciseRow
                        key={ex.id}
                        exercise={ex}
                        dayId={day.id}
                        index={idx}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

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

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelect(ex)}
              disabled={isAdding || adding !== null}
              className="w-full text-left rounded-lg border border-[#3F3F46] bg-[#09090B] p-2.5 hover:border-brand-primary hover:bg-brand-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 group"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[#27272A]">
                <ExerciseThumbnail
                  thumbnailUrl={ex.thumbnailUrl}
                  slug={ex.slug}
                  nameEn={ex.nameEn}
                  alt={ex.nameEs}
                  iconSize="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#FAFAFA] truncate group-hover:text-brand-primary transition-colors">
                  {ex.nameEs}
                </p>
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
  const store = useRoutineBuilderStore();
  const [saving, setSaving] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [, startTransition] = useTransition();
  const [addExerciseDayId, setAddExerciseDayId] = useState<string | null>(null);
  const [customGoals, setCustomGoals] = useState<Array<{ id: string; name: string }>>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  const form = useForm<MetaValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      name: store.name,
      goal: store.goal,
      splitDays: store.splitDays,
      durationWeeks: store.durationWeeks,
    },
  });

  useEffect(() => {
    listCustomGoals().then((r) => { if (r.ok) setCustomGoals(r.value); });
  }, []);

  // Sync form defaults when store changes (e.g. on initFromExisting)
  useEffect(() => {
    form.reset({
      name: store.name,
      goal: store.goal,
      splitDays: store.splitDays,
      durationWeeks: store.durationWeeks,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.routineId]);

  const handleSave = async (values: MetaValues) => {
    setSaving(true);
    try {
      store.setMeta(values);

      if (!store.routineId) {
        // New routine: create template only (exercises must be added after navigation)
        const result = await createRoutineTemplate(values);
        if (!result.ok) {
          toast.error("No se pudo crear la rutina. Reintentá.");
          return;
        }
        store.markSaved();
        onSaved?.(result.value.routineId);
        toast.success("Rutina creada. Ya podés agregar ejercicios.");
        router.push(`/trainer/rutinas/${result.value.routineId}`);
        return;
      }

      // Existing routine: persist meta updates
      const updateResult = await updateRoutineTemplate({
        routineId: store.routineId,
        ...values,
      });
      if (!updateResult.ok) {
        toast.error(updateResult.error.message ?? "No se pudieron guardar los cambios.");
        return;
      }

      // Persist prescription edits for each existing exercise
      const updates: Promise<unknown>[] = [];
      for (const day of store.days) {
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
            }),
          );
        }
      }
      await Promise.all(updates);

      store.markSaved();
      toast.success("Cambios guardados.");
      // Refresh server data so the page reflects the latest state
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  };

  const handleExerciseAdded = (dayId: string, exercise: DraftExercise) => {
    store.addExerciseToDay(dayId, exercise);
    store.markSaved(); // already persisted to DB
    setAddExerciseDayId(null);
    startTransition(() => router.refresh());
  };

  // Find the routineDayId (server-side ID) for the day being added to
  const targetRoutineDayId =
    addExerciseDayId
      ? store.days.find((d) => d.id === addExerciseDayId)?.routineDayId ?? null
      : null;

  const totalExercises = store.days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div className="space-y-5">
      {/* Meta form */}
      <MetaForm form={form} customGoals={customGoals} onCreateGoal={() => setGoalDialogOpen(true)} />

      {/* Stats chips */}
      {(store.days.length > 0 || totalExercises > 0) && (
        <div className="flex flex-wrap gap-2 px-1">
          {[
            { icon: Calendar, label: `${store.days.length} ${store.days.length === 1 ? "día" : "días"}` },
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
          {store.days.map((day) => (
            <DayCard key={day.id} day={day} onAddExercise={setAddExerciseDayId} />
          ))}
        </AnimatePresence>

        <Button
          type="button"
          variant="outline"
          disabled={addingDay || !store.routineId}
          onClick={async () => {
            if (!store.routineId) {
              toast.error("Guardá la rutina primero antes de agregar días.");
              return;
            }
            setAddingDay(true);
            const dayName = "Día " + (store.days.length + 1);
            const result = await addRoutineDay({
              routineId: store.routineId,
              dayIndex: store.days.length,
              name: dayName,
            });
            setAddingDay(false);
            if (!result.ok) {
              toast.error(result.error.message ?? "No se pudo crear el día.");
              return;
            }
            store.addDay(dayName, result.value.dayId);
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
