"use client";

// =============================================================================
// BLACKLINE FITNESS — MedicalConditionsPrompt
// Owner: frontend-react.
//
// Modal popup shown on first visit to /client/rutinas. Collects basic medical
// conditions (ALLERGY, INJURY, MEDICATION, CHRONIC, OTHER). Light quick-entry
// with multi-tag inputs. Detailed editing is available in /perfil.
// =============================================================================

import * as React from "react";
import { useState, useTransition, useCallback, useId } from "react";
import { toast } from "sonner";
import { X, Plus, Loader2, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  saveMyMedicalConditions,
  markMedicalPromptShown,
} from "@/app/actions/medical-conditions";

import type { MedicalConditionItem } from "@/lib/validation/medical-conditions.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TagKind = "ALLERGY" | "INJURY" | "MEDICATION" | "CHRONIC";

interface TagSectionProps {
  id: string;
  label: string;
  description: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-component: TagSection
// ---------------------------------------------------------------------------

function TagSection({ id, label, description, tags, onAdd, onRemove, disabled = false }: TagSectionProps) {
  const inputId = `${id}-input`;
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    if (disabled) return;
    const trimmed = inputValue.trim().slice(0, 80);
    if (!trimmed) return;
    onAdd(trimmed);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className={`space-y-2 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-[#FAFAFA]">
        {label}
      </label>
      <p className="text-xs text-[#71717A]">{description}</p>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="list"
          aria-label={`Elementos de ${label}`}
        >
          {tags.map((tag, i) => (
            <span
              key={i}
              role="listitem"
              className="inline-flex items-center gap-1 rounded-full bg-[#27272A] border border-[#3F3F46] px-3 py-1 text-xs text-[#E4E4E7]"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#71717A] hover:text-[#EF4444] transition-colors focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
                aria-label={`Eliminar ${tag}`}
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + Add button */}
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, 80))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Escribí y presioná Agregar..."
          maxLength={80}
          className="flex-1 rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-colors min-h-[44px] disabled:cursor-not-allowed"
          aria-describedby={`${id}-desc`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-xs font-semibold text-[#A1A1AA] hover:border-[#52525B] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-40 transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
          aria-label={`Agregar ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Agregar
        </button>
      </div>
      <span id={`${id}-desc`} className="sr-only">
        Escribí el nombre y presioná Agregar o Enter para añadir a la lista.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MedicalConditionsPromptProps {
  open: boolean;
  onClose: () => void;
}

export function MedicalConditionsPrompt({ open, onClose }: MedicalConditionsPromptProps) {
  const baseId = useId();

  // ── Per-kind tag arrays ─────────────────────────────────────────────────
  const [allergies, setAllergies] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [chronics, setChronics] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  // ── "Nothing to report" affirmative checkbox ────────────────────────────
  // When true, all inputs are disabled and an empty list is submitted.
  const [noConditions, setNoConditions] = useState(false);

  const [isPending, startTransition] = useTransition();

  const hasAnyContent =
    allergies.length > 0 ||
    injuries.length > 0 ||
    medications.length > 0 ||
    chronics.length > 0 ||
    otherText.trim().length > 0;

  // ── Tag helpers ─────────────────────────────────────────────────────────

  function makeAdder(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (value: string) => setter((prev) => [...prev, value]);
  }

  function makeRemover(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (index: number) =>
      setter((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Build items payload ─────────────────────────────────────────────────

  function buildItems(): MedicalConditionItem[] {
    // Affirmative "nothing to report" → empty list, regardless of any
    // residual input the user may have left typed.
    if (noConditions) return [];

    const items: MedicalConditionItem[] = [];

    const addKind = (tags: string[], kind: TagKind) => {
      for (const label of tags) {
        items.push({ kind, label, isActive: true });
      }
    };

    addKind(allergies, "ALLERGY");
    addKind(injuries, "INJURY");
    addKind(medications, "MEDICATION");
    addKind(chronics, "CHRONIC");

    const trimmedOther = otherText.trim().slice(0, 500);
    if (trimmedOther) {
      items.push({
        kind: "OTHER",
        label: "Otra información",
        detail: trimmedOther,
        isActive: true,
      });
    }

    return items;
  }

  // ── Dismiss (Después) ────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    startTransition(async () => {
      await markMedicalPromptShown();
      onClose();
    });
  }, [onClose]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    // Block save if the user filled nothing AND did not affirmatively confirm
    // "no conditions". This forces an explicit answer and avoids accidentally
    // recording an empty list when the user simply hasn't filled the form yet.
    if (!noConditions && !hasAnyContent) {
      toast.error(
        "Marcá la palomita si no tenés padecimientos, o completá al menos una sección.",
      );
      return;
    }

    const items = buildItems();
    const isAffirmativeNone = noConditions;

    startTransition(async () => {
      const [saveResult, markResult] = await Promise.all([
        saveMyMedicalConditions({ items, reviewed: true }),
        markMedicalPromptShown(),
      ]);

      if (!saveResult.ok) {
        toast.error(saveResult.error.message ?? "No pudimos guardar tu información. Intentá de nuevo.");
        return;
      }

      if (!markResult.ok) {
        // Non-fatal — prompt might reappear but data is saved.
      }

      toast.success(
        isAffirmativeNone
          ? "Listo. Podés continuar con tu rutina."
          : "Tu información de salud fue guardada.",
      );
      onClose();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allergies, injuries, medications, chronics, otherText, noConditions, hasAnyContent, onClose]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) handleDismiss(); }}>
      <DialogContent
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border-[#3F3F46] bg-[#18181B] p-0"
        onInteractOutside={(e) => e.preventDefault()}
        aria-modal="true"
      >
        {/* Decorative top accent line */}
        <div
          className="h-[2px] w-full rounded-t-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.7) 30%, rgba(59,130,246,1) 50%, rgba(59,130,246,0.7) 70%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#FAFAFA]">
              Antes de entrenar, contanos sobre tu salud
            </DialogTitle>
            <DialogDescription className="text-sm text-[#A1A1AA] leading-relaxed mt-1.5">
              Esta información es confidencial. Solo tu entrenador la verá. Podés editarla cuando
              vos querás desde tu perfil.
            </DialogDescription>
          </DialogHeader>

          {/* "Nothing to report" affirmative checkbox — quick-exit path */}
          <label
            htmlFor={`${baseId}-none`}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              noConditions
                ? "border-[#22C55E]/50 bg-[rgba(34,197,94,0.08)]"
                : "border-[#3F3F46] bg-[#09090B] hover:border-[#52525B] hover:bg-[#27272A]/30"
            }`}
          >
            <input
              id={`${baseId}-none`}
              type="checkbox"
              checked={noConditions}
              onChange={(e) => setNoConditions(e.target.checked)}
              className="peer sr-only"
              aria-describedby={`${baseId}-none-desc`}
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                noConditions
                  ? "border-[#22C55E] bg-[#22C55E]"
                  : "border-[#52525B] bg-transparent"
              }`}
            >
              {noConditions && (
                <Check className="h-3.5 w-3.5 text-[#09090B]" strokeWidth={3} aria-hidden="true" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#FAFAFA]">
                No tengo padecimientos ni condiciones que reportar
              </p>
              <p id={`${baseId}-none-desc`} className="mt-0.5 text-xs text-[#71717A]">
                Marcá esta opción si estás saludable y podés entrenar sin restricciones.
              </p>
            </div>
          </label>

          {/* Visual divider with "o" — separates affirmative path from detail entry */}
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#27272A]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52525B]">
              o detallá abajo
            </span>
            <div className="h-px flex-1 bg-[#27272A]" />
          </div>

          {/* Questions */}
          <div className="space-y-5">
            <TagSection
              id={`${baseId}-allergy`}
              label="¿Tenés alguna alergia?"
              description="Alimentos, medicamentos, polen, látex, etc."
              tags={allergies}
              onAdd={makeAdder(setAllergies)}
              onRemove={makeRemover(setAllergies)}
              disabled={noConditions}
            />

            <div
              aria-hidden="true"
              className="h-px bg-[#27272A]"
            />

            <TagSection
              id={`${baseId}-injury`}
              label="¿Tenés alguna lesión activa o reciente?"
              description="Lesiones musculares, esguinces, fracturas, dolor crónico, etc."
              tags={injuries}
              onAdd={makeAdder(setInjuries)}
              onRemove={makeRemover(setInjuries)}
              disabled={noConditions}
            />

            <div aria-hidden="true" className="h-px bg-[#27272A]" />

            <TagSection
              id={`${baseId}-medication`}
              label="¿Tomás algún medicamento de forma regular?"
              description="Incluí nombre del medicamento o tipo si lo sabés."
              tags={medications}
              onAdd={makeAdder(setMedications)}
              onRemove={makeRemover(setMedications)}
              disabled={noConditions}
            />

            <div aria-hidden="true" className="h-px bg-[#27272A]" />

            <TagSection
              id={`${baseId}-chronic`}
              label="¿Tenés alguna condición crónica?"
              description="Asma, diabetes, hipertensión, hipotiroidismo, etc."
              tags={chronics}
              onAdd={makeAdder(setChronics)}
              onRemove={makeRemover(setChronics)}
              disabled={noConditions}
            />

            <div aria-hidden="true" className="h-px bg-[#27272A]" />

            {/* Other — free textarea */}
            <div
              className={`space-y-2 transition-opacity ${
                noConditions ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <label
                htmlFor={`${baseId}-other`}
                className="block text-sm font-semibold text-[#FAFAFA]"
              >
                ¿Algo más que tu entrenador debería saber?
              </label>
              <p className="text-xs text-[#71717A]">
                Cirugías previas, condiciones no listadas, cualquier cosa relevante.
              </p>
              <textarea
                id={`${baseId}-other`}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value.slice(0, 500))}
                disabled={noConditions}
                rows={3}
                maxLength={500}
                placeholder="Describí brevemente... (opcional)"
                className="w-full rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-colors resize-none disabled:cursor-not-allowed"
                aria-label="Información adicional de salud"
              />
              <p className="text-right text-[10px] text-[#52525B]">
                {otherText.length}/500
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isPending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#3F3F46] bg-transparent px-5 py-3 text-sm font-semibold text-[#A1A1AA] hover:border-[#52525B] hover:text-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              aria-label="Posponer — recordar después"
            >
              Después
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
              aria-label={noConditions ? "Confirmar que no tengo condiciones y continuar" : "Guardar mi información de salud"}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending
                ? "Guardando..."
                : noConditions
                  ? "Confirmar y continuar"
                  : "Guardar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
