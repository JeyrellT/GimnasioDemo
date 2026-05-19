"use client";

// =============================================================================
// BLACKLINE FITNESS — TrainerNotesEditor
// Owner: frontend-react.
// Textarea privada con autosave debounced 1.5s. Solo el entrenador la ve.
// =============================================================================

import * as React from "react";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { updateTrainerClientNotes } from "@/app/actions/clients";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TrainerNotesEditorProps {
  clientId: string;
  initialNotes: string;
  className?: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TrainerNotesEditor({
  clientId,
  initialNotes,
  className,
}: TrainerNotesEditorProps) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const lastSavedRef = React.useRef(initialNotes);
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedNotes = useDebounce(notes, 1500);

  React.useEffect(() => {
    // No guardar si no hay cambios respecto a lo que está guardado
    if (debouncedNotes === lastSavedRef.current) return;

    async function save() {
      setSaveState("saving");
      setErrorMessage(null);

      const result = await updateTrainerClientNotes({ clientId, notes: debouncedNotes });

      if (result.ok) {
        lastSavedRef.current = debouncedNotes;
        setSaveState("saved");
        // Volver a idle después de 2s
        saveTimeoutRef.current = setTimeout(() => {
          setSaveState("idle");
        }, 2000);
      } else {
        setSaveState("error");
        setErrorMessage("No se guardó la nota. Reintentá.");
      }
    }

    save();

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNotes]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">Notas privadas</h3>
          <p className="text-xs text-[#71717A]">Solo vos las ves. El cliente no tiene acceso.</p>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1.5" aria-live="polite" aria-atomic="true">
          {saveState === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#71717A]" aria-hidden="true" />
              <span className="text-xs text-[#71717A]">Guardando...</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
              <span className="text-xs text-[#22C55E]">Guardado</span>
            </>
          )}
          {saveState === "error" && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
              <span className="text-xs text-[#EF4444]">Error al guardar</span>
            </>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <label htmlFor="trainer-notes" className="sr-only">
          Notas privadas sobre el cliente
        </label>
        <textarea
          id="trainer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotaciones privadas sobre este cliente..."
          style={{ minHeight: "200px" }}
          className={cn(
            "w-full resize-y rounded-xl border border-[#3F3F46] bg-[#09090B] px-4 py-3",
            "text-sm text-[#FAFAFA] placeholder:text-[#52525B]",
            "focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]",
            "transition-colors",
            saveState === "error" && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]",
          )}
          aria-describedby={errorMessage ? "notes-error" : undefined}
          aria-invalid={saveState === "error"}
        />
      </div>

      {/* Error inline */}
      {saveState === "error" && errorMessage && (
        <p id="notes-error" role="alert" className="text-xs text-[#EF4444]">
          {errorMessage}
        </p>
      )}

      <p className="text-[11px] text-[#52525B]">
        Guardado automáticamente 1.5s después de escribir.
      </p>
    </div>
  );
}
