"use client";

// =============================================================================
// FORJA — CurrencyInput (CRC ₡)
// Shared reusable component. Renders ₡ prefix inside border, right-aligns number.
// Parses on change, formats on blur. Never stores formatted string in RHF.
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** Strip non-numeric chars except decimal separator (comma or dot → dot). */
function parseRaw(raw: string): number {
  // Accept both , and . as decimals; strip thousand separators
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  // If multiple dots, keep only the last segment as decimal
  const parts = cleaned.split(".");
  const integral = (parts.slice(0, -1).join("").replace(/\./g, "") || parts[0]) ?? "";
  const decimal = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const normalized = decimal !== undefined ? `${integral}.${decimal}` : integral;
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

/** Format a number as CRC with 2 decimal places and thousands separator. */
function formatCRC(n: number): string {
  if (n === 0) return "";
  return new Intl.NumberFormat("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = "0",
  required,
  error,
  className,
  id,
  disabled,
}: CurrencyInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const numericValue = typeof value === "string" ? parseFloat(value) || 0 : value;

  // Local display state: raw while focused, formatted when blurred
  const [displayValue, setDisplayValue] = React.useState<string>(
    numericValue > 0 ? formatCRC(numericValue) : "",
  );
  const [focused, setFocused] = React.useState(false);

  // Sync external value changes (e.g. form reset)
  React.useEffect(() => {
    if (!focused) {
      setDisplayValue(numericValue > 0 ? formatCRC(numericValue) : "");
    }
  }, [numericValue, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseRaw(raw);
    onChange(parsed);
  }

  function handleFocus() {
    setFocused(true);
    // Show raw number without formatting for easier editing
    setDisplayValue(numericValue > 0 ? String(numericValue) : "");
  }

  function handleBlur() {
    setFocused(false);
    const parsed = parseRaw(displayValue);
    // Clamp to 2 decimals
    const clamped = Math.round(parsed * 100) / 100;
    onChange(clamped);
    setDisplayValue(clamped > 0 ? formatCRC(clamped) : "");
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium uppercase tracking-wide text-[#A1A1AA]"
        >
          {label}
          {required && <span className="ml-0.5 text-[#FF6A1A]">*</span>}
        </label>
      )}
      <div
        className={cn(
          "flex h-11 w-full items-center rounded-md border bg-[#27272A] transition-colors",
          error
            ? "border-[#EF4444] focus-within:ring-[#EF4444]"
            : "border-[#3F3F46] focus-within:border-[#FF6A1A]",
          "focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-offset-[#09090B]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="pl-3 text-sm font-semibold text-[#71717A] select-none">₡</span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="flex-1 bg-transparent py-2 px-2 text-right text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none disabled:cursor-not-allowed"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[#EF4444]">
          {error}
        </p>
      )}
    </div>
  );
}
