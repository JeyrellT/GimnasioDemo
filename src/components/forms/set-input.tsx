"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetInputProps {
  setNumber: number;
  targetReps: string; // e.g. "8-12"
  targetRpe?: number | null;
  onComplete: (data: { weightKg: number | null; reps: number; rpe: number | null }) => void;
  isCompleted?: boolean;
  prevWeight?: number | null;
  prevReps?: number | null;
}

export function SetInput({
  setNumber,
  targetReps,
  targetRpe,
  onComplete,
  isCompleted = false,
  prevWeight,
  prevReps,
}: SetInputProps) {
  const [weight, setWeight] = useState<number>(prevWeight ?? 0);
  const [reps, setReps] = useState<number>(prevReps ?? 0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [marked, setMarked] = useState(isCompleted);

  const handleComplete = () => {
    setMarked(true);
    onComplete({ weightKg: weight > 0 ? weight : null, reps, rpe });
  };

  const adjustWeight = (delta: number) => {
    setWeight((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.max(0, prev + delta));
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        marked
          ? "border-[#22C55E]/50 bg-[#052E16]"
          : "border-[#3F3F46] bg-[#18181B]",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">
          Set {setNumber}
        </span>
        <span className="text-xs text-[#A1A1AA]">
          Objetivo: {targetReps} reps{targetRpe ? ` @ RPE ${targetRpe}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        <div className="space-y-1">
          <p className="text-xs text-[#71717A]">Peso (kg)</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              aria-label="Bajar 2.5 kg"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight || ""}
              onChange={(e) => setWeight(Number(e.target.value) || 0)}
              className="flex-1 rounded-lg border border-[#3F3F46] bg-[#27272A] px-2 py-2 text-center text-lg font-bold tabular text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A] min-h-[44px]"
              placeholder="0"
              aria-label="Peso en kg"
            />
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              aria-label="Subir 2.5 kg"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Reps */}
        <div className="space-y-1">
          <p className="text-xs text-[#71717A]">Reps</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              aria-label="Bajar 1 rep"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={reps || ""}
              onChange={(e) => setReps(Number(e.target.value) || 0)}
              className="flex-1 rounded-lg border border-[#3F3F46] bg-[#27272A] px-2 py-2 text-center text-lg font-bold tabular text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A] min-h-[44px]"
              placeholder="0"
              aria-label="Número de repeticiones"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              aria-label="Subir 1 rep"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick weight increments */}
      <div className="flex gap-2 mt-3">
        {[5, 10, 20].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => adjustWeight(v)}
            className="flex-1 rounded-lg border border-[#3F3F46] bg-[#27272A] py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors min-h-[36px]"
          >
            +{v} kg
          </button>
        ))}
      </div>

      {/* Complete button */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={marked || reps === 0}
        className={cn(
          "mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all min-h-[44px]",
          marked
            ? "bg-[#22C55E] text-white"
            : "bg-[#FF6A1A] text-white hover:bg-[#E55A0E] disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        aria-label={marked ? "Set completado" : "Marcar set como completado"}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {marked ? "Completado" : "Completar set"}
      </button>
    </div>
  );
}
