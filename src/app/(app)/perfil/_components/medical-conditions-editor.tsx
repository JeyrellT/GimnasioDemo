"use client";

// =============================================================================
// BLACKLINE FITNESS — MedicalConditionsEditor
// Owner: frontend-react.
//
// Full CRUD editor for the client's own medical conditions, mounted in
// /perfil. Displays current list + "+ Agregar condición" flow. Persists via
// saveMyMedicalConditions (full replace). Tracks dirty state to gate the
// save button.
// =============================================================================

import * as React from "react";
import { useState, useEffect, useTransition, useCallback, useId } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Heart,
  AlertTriangle,
  Bandage,
  Activity,
  Pill,
  Scissors,
  Info,
  ChevronDown,
} from "lucide-react";

import {
  listMyMedicalConditions,
  saveMyMedicalConditions,
} from "@/app/actions/medical-conditions";

import {
  MEDICAL_CONDITION_KINDS,
  CONDITION_SEVERITIES,
  type MedicalConditionKindValue,
  type ConditionSeverityValue,
} from "@/lib/validation/medical-conditions.schema";

// ---------------------------------------------------------------------------
// Local form type (no id = new row)
// ---------------------------------------------------------------------------

interface ConditionDraft {
  /** Undefined for new rows not yet persisted */
  id?: string;
  kind: MedicalConditionKindValue;
  label: string;
  detail: string;
  severity: ConditionSeverityValue | "";
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<MedicalConditionKindValue, string> = {
  ALLERGY: "Alergia",
  INJURY: "Lesión",
  CHRONIC: "Condición crónica",
  MEDICATION: "Medicamento",
  SURGERY: "Cirugía",
  OTHER: "Otro",
};

const KIND_ICONS: Record<MedicalConditionKindValue, React.ElementType> = {
  ALLERGY: AlertTriangle,
  INJURY: Bandage,
  CHRONIC: Activity,
  MEDICATION: Pill,
  SURGERY: Scissors,
  OTHER: Info,
};

const KIND_COLORS: Record<MedicalConditionKindValue, string> = {
  ALLERGY: "text-[#F59E0B]",
  INJURY: "text-[#EF4444]",
  CHRONIC: "text-[#A78BFA]",
  MEDICATION: "text-[#22C55E]",
  SURGERY: "text-[#F472B6]",
  OTHER: "text-[#71717A]",
};

const SEVERITY_LABELS: Record<ConditionSeverityValue, string> = {
  MILD: "Leve",
  MODERATE: "Moderada",
  SEVERE: "Severa",
};

const EMPTY_DRAFT: Omit<ConditionDraft, "id"> = {
  kind: "OTHER",
  label: "",
  detail: "",
  severity: "",
  isActive: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function draftFromServer(item: {
  id: string;
  kind: string;
  label: string;
  detail: string | null;
  severity: string | null;
  isActive: boolean;
}): ConditionDraft {
  return {
    id: item.id,
    kind: item.kind as MedicalConditionKindValue,
    label: item.label,
    detail: item.detail ?? "",
    severity: (item.severity as ConditionSeverityValue | null) ?? "",
    isActive: item.isActive,
  };
}

function buildSaveItems(drafts: ConditionDraft[]) {
  return drafts.map((d) => ({
    ...(d.id ? { id: d.id } : {}),
    kind: d.kind,
    label: d.label.trim(),
    detail: d.detail.trim() || undefined,
    severity: (d.severity as ConditionSeverityValue) || undefined,
    isActive: d.isActive,
  }));
}

function serialise(drafts: ConditionDraft[]): string {
  return JSON.stringify(drafts.map((d) => ({ ...d })));
}

// ---------------------------------------------------------------------------
// Sub-component: ConditionRow — inline edit for a single condition
// ---------------------------------------------------------------------------

interface ConditionRowProps {
  draft: ConditionDraft;
  index: number;
  baseId: string;
  onChange: (index: number, patch: Partial<ConditionDraft>) => void;
  onRemove: (index: number) => void;
  isDisabled: boolean;
}

function ConditionRow({
  draft,
  index,
  baseId,
  onChange,
  onRemove,
  isDisabled,
}: ConditionRowProps) {
  const KindIcon = KIND_ICONS[draft.kind];
  const rowId = `${baseId}-row-${index}`;

  const [showDetail, setShowDetail] = useState(Boolean(draft.detail));

  return (
    <div
      className={[
        "rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 space-y-3 transition-opacity",
        !draft.isActive && "opacity-60",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Condición ${index + 1}: ${draft.label || "Nueva"}`}
    >
      {/* Row header: kind icon + label input + delete */}
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#27272A]",
          ].join(" ")}
          aria-hidden="true"
        >
          <KindIcon className={["h-3.5 w-3.5", KIND_COLORS[draft.kind]].join(" ")} />
        </div>

        <div className="flex-1 space-y-2">
          {/* Label */}
          <div>
            <label
              htmlFor={`${rowId}-label`}
              className="mb-1 block text-xs font-medium text-[#A1A1AA]"
            >
              Nombre / descripción <span className="text-[#EF4444]">*</span>
            </label>
            <input
              id={`${rowId}-label`}
              type="text"
              value={draft.label}
              onChange={(e) => onChange(index, { label: e.target.value.slice(0, 80) })}
              maxLength={80}
              placeholder="Ej: Alergia a mariscos"
              disabled={isDisabled}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50 transition-colors min-h-[44px]"
            />
          </div>

          {/* Kind + Severity row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Kind */}
            <div>
              <label
                htmlFor={`${rowId}-kind`}
                className="mb-1 block text-xs font-medium text-[#A1A1AA]"
              >
                Tipo
              </label>
              <div className="relative">
                <select
                  id={`${rowId}-kind`}
                  value={draft.kind}
                  onChange={(e) =>
                    onChange(index, { kind: e.target.value as MedicalConditionKindValue })
                  }
                  disabled={isDisabled}
                  className="w-full appearance-none rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 pr-8 text-sm text-[#FAFAFA] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {MEDICAL_CONDITION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor={`${rowId}-severity`}
                className="mb-1 block text-xs font-medium text-[#A1A1AA]"
              >
                Severidad
              </label>
              <div className="relative">
                <select
                  id={`${rowId}-severity`}
                  value={draft.severity}
                  onChange={(e) =>
                    onChange(index, {
                      severity: e.target.value as ConditionSeverityValue | "",
                    })
                  }
                  disabled={isDisabled}
                  className="w-full appearance-none rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 pr-8 text-sm text-[#FAFAFA] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  <option value="">Sin especificar</option>
                  {CONDITION_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Toggle detail */}
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs text-[#3B82F6] hover:underline focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
          >
            {showDetail ? "Ocultar detalle" : "Agregar detalle (opcional)"}
          </button>

          {/* Detail textarea */}
          {showDetail && (
            <div>
              <label
                htmlFor={`${rowId}-detail`}
                className="mb-1 block text-xs font-medium text-[#A1A1AA]"
              >
                Detalle adicional
              </label>
              <textarea
                id={`${rowId}-detail`}
                value={draft.detail}
                onChange={(e) =>
                  onChange(index, { detail: e.target.value.slice(0, 500) })
                }
                maxLength={500}
                rows={2}
                placeholder="Describí con más detalle..."
                disabled={isDisabled}
                className="w-full resize-none rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50 transition-colors"
              />
              <p className="mt-0.5 text-right text-[10px] text-[#52525B]">
                {draft.detail.length}/500
              </p>
            </div>
          )}

          {/* isActive toggle */}
          <label className="inline-flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => onChange(index, { isActive: e.target.checked })}
              disabled={isDisabled}
              className="h-4 w-4 rounded border-[#3F3F46] bg-[#09090B] accent-[#3B82F6] focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              aria-label="Condición activa"
            />
            <span className="text-xs text-[#A1A1AA]">Condición activa</span>
          </label>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={isDisabled}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#71717A] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#EF4444] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-[#EF4444] min-h-[44px] min-w-[44px]"
          aria-label={`Eliminar condición ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MedicalConditionsEditor() {
  const baseId = useId();

  const [drafts, setDrafts] = useState<ConditionDraft[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // ── Load current conditions ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    listMyMedicalConditions().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        // Prisma MedicalCondition has kind/severity as string at TS level; cast is safe
        const raw = result.value as Array<{
          id: string;
          kind: string;
          label: string;
          detail: string | null;
          severity: string | null;
          isActive: boolean;
        }>;
        const loaded = raw.map(draftFromServer);
        setDrafts(loaded);
        setSavedSnapshot(serialise(loaded));
      } else {
        toast.error(result.error.message ?? "No se pudieron cargar tus condiciones médicas.");
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  // ── Dirty check ──────────────────────────────────────────────────────────

  const isDirty = serialise(drafts) !== savedSnapshot;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (index: number, patch: Partial<ConditionDraft>) => {
      setDrafts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index]!, ...patch };
        return next;
      });
    },
    [],
  );

  const handleRemove = useCallback((index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAdd = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      { ...EMPTY_DRAFT },
    ]);
  }, []);

  const handleSave = useCallback(() => {
    // Validate non-empty labels
    const invalid = drafts.some((d) => !d.label.trim());
    if (invalid) {
      toast.error("Completá el nombre de todas las condiciones antes de guardar.");
      return;
    }

    startTransition(async () => {
      const items = buildSaveItems(drafts);
      const result = await saveMyMedicalConditions({ items, reviewed: true });

      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudieron guardar los cambios.");
        return;
      }

      toast.success("Condiciones médicas actualizadas.");
      setSavedSnapshot(serialise(drafts));
    });
  }, [drafts]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#52525B]" aria-label="Cargando..." />
      </div>
    );
  }

  return (
    <section aria-label="Mis condiciones médicas">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
          <Heart className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
          Mis condiciones médicas
        </h2>
      </div>

      <p className="mb-4 text-sm text-[#71717A]">
        Esta información es confidencial. Solo tu entrenador la puede ver. Mantenerla actualizada
        ayuda a personalizar tu entrenamiento.
      </p>

      {/* Condition rows */}
      <div className="space-y-3">
        {drafts.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#3F3F46] px-5 py-8 text-center space-y-1">
            <p className="text-sm text-[#71717A]">No tenés condiciones registradas.</p>
            <p className="text-xs text-[#52525B]">
              Usá el botón de abajo para agregar una.
            </p>
          </div>
        )}

        {drafts.map((draft, index) => (
          <ConditionRow
            key={draft.id ?? `new-${index}`}
            draft={draft}
            index={index}
            baseId={baseId}
            onChange={handleChange}
            onRemove={handleRemove}
            isDisabled={isPending}
          />
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending || drafts.length >= 30}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#3F3F46] bg-transparent px-4 py-3 text-sm font-semibold text-[#A1A1AA] hover:border-[#52525B] hover:text-[#FAFAFA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
        aria-label="Agregar nueva condición médica"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar condición
      </button>

      {/* Save */}
      <div className="mt-5 flex items-center justify-end gap-3">
        {isDirty && (
          <p className="text-xs text-[#71717A]" role="status" aria-live="polite">
            Tenés cambios sin guardar.
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
          aria-label="Guardar cambios en mis condiciones médicas"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}
