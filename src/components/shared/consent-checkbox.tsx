"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  version: string;
  label: string;
  policyHref?: string;
  policyLabel?: string;
  className?: string;
}

export function ConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  required = false,
  version,
  label,
  policyHref,
  policyLabel,
  className,
}: ConsentCheckboxProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-required={required}
        className="mt-0.5"
      />
      <div className="grid gap-1">
        <Label
          htmlFor={id}
          className={cn(
            "text-sm leading-snug cursor-pointer",
            required && !checked && "text-[#A1A1AA]",
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-[#EF4444]" aria-label="requerido">
              *
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2 text-xs text-[#71717A]">
          <span>v{version}</span>
          {policyHref && (
            <>
              <span aria-hidden="true">·</span>
              <Link
                href={policyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B82F6] underline underline-offset-2 hover:text-[#2563EB]"
              >
                {policyLabel ?? "Ver política"}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
