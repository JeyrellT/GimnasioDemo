"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { updateTrainerNotes } from "@/app/actions/clients";
import { toast } from "sonner";

interface NotasClientProps {
  clientId: string;
  initialNotes: string;
}

export function NotasClient({ clientId, initialNotes }: NotasClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateTrainerNotes(clientId, notes);
    setSaving(false);
    if (result.ok) {
      toast.success("Listo.");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 text-[#71717A]" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Notas privadas</h1>
          <p className="text-xs text-[#71717A]">Solo vos podés ver esto. Tu cliente no tiene acceso.</p>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={12}
        placeholder="Observaciones de entrenamiento, preferencias, detalles de salud que no encajan en el PAR-Q..."
        aria-label="Notas privadas del cliente"
        className="w-full resize-y rounded-xl border border-[#3F3F46] bg-[#18181B] px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] transition-colors"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white min-h-[44px] hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
      >
        {saving ? "Guardando..." : "Guardar notas"}
      </button>
    </div>
  );
}
