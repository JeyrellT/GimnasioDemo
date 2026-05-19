"use client";

// =============================================================================
// BLACKLINE FITNESS — Branding customization section for Settings page
// Palette picker + logo uploads (full + mark)
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Palette, ImagePlus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/lib/branding/branding-context";
import { PALETTE_PRESETS } from "@/lib/branding/presets";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

// -----------------------------------------------------------------------------
// Max logo file size (500 KB — stored as base64 in localStorage)
// -----------------------------------------------------------------------------
const MAX_LOGO_SIZE = 500 * 1024;

// -----------------------------------------------------------------------------
// Section wrapper (reuse the same pattern from the page)
// -----------------------------------------------------------------------------

function SectionCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary,#3B82F6)]/15">
          <Icon className="h-4 w-4 text-[var(--brand-primary,#3B82F6)]" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Logo upload slot
// -----------------------------------------------------------------------------

function LogoUploadSlot({
  label,
  hint,
  currentSrc,
  onUpload,
  onClear,
  fallback,
}: {
  label: string;
  hint: string;
  currentSrc: string | null;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  fallback: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_LOGO_SIZE) {
        toast.error("El archivo es muy grande. Maximo 500 KB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onUpload(reader.result);
          toast.success("Logo actualizado.");
        }
      };
      reader.onerror = () => toast.error("Error al leer el archivo.");
      reader.readAsDataURL(file);

      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [onUpload],
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs text-[#A1A1AA]">{label}</Label>
      <p className="text-[11px] text-[#52525B]">{hint}</p>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#09090B] overflow-hidden">
          {currentSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSrc}
              alt={label}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            fallback
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFile}
            className="hidden"
            aria-label={`Subir ${label}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A]"
          >
            <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
            {currentSrc ? "Cambiar" : "Subir"}
          </Button>
          {currentSrc && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main branding section
// -----------------------------------------------------------------------------

export function BrandingSection() {
  const { branding, update, reset } = useBranding();
  const [localName, setLocalName] = useState(branding.businessName);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync localName when branding changes externally (e.g. reset)
  useEffect(() => {
    setLocalName(branding.businessName);
  }, [branding.businessName]);

  // Debounced real-time update: pushes to context (and topbar) ~300ms after typing stops
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalName(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      update({ businessName: value.trim() });
    }, 300);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Color palette ─────────────────────────────────────────────────── */}
      <SectionCard icon={Palette} label="Paleta de colores">
        <p className="text-xs text-[#71717A]">
          Elegí el color principal de tu app. Tus clientes asignados verán
          el mismo estilo cuando ingresen.
        </p>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {PALETTE_PRESETS.map((preset) => {
            const isActive = branding.paletteId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => update({ paletteId: preset.id })}
                className="group flex flex-col items-center gap-1.5"
                aria-label={`Paleta ${preset.label}`}
                aria-pressed={isActive}
              >
                <div
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    isActive
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent hover:border-[#71717A] hover:scale-105"
                  }`}
                  style={{ backgroundColor: preset.primary }}
                />
                <span
                  className={`text-[10px] font-medium leading-none transition-colors ${
                    isActive ? "text-[#FAFAFA]" : "text-[#71717A]"
                  }`}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live preview bar */}
        <div className="rounded-lg border border-[#3F3F46] bg-[#09090B] p-3">
          <p className="text-[11px] text-[#52525B] mb-2">Vista previa</p>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: "var(--brand-primary, #3B82F6)" }}
            />
            <div
              className="h-8 flex-1 rounded-lg"
              style={{
                background: `linear-gradient(90deg, var(--brand-primary, #3B82F6), var(--brand-accent, #60A5FA))`,
              }}
            />
            <Button
              size="sm"
              className="text-white text-xs pointer-events-none"
              style={{ backgroundColor: "var(--brand-primary, #3B82F6)" }}
            >
              Boton ejemplo
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* ── Logo personalizado ────────────────────────────────────────────── */}
      <SectionCard icon={ImagePlus} label="Logo personalizado">
        <p className="text-xs text-[#71717A]">
          Subí tu logo para reemplazar el monograma BL. El logo aparecerá en
          el header de la app, tanto para vos como para tus clientes.
        </p>

        {/* Business name */}
        <div className="space-y-2">
          <Label htmlFor="biz-name" className="text-xs text-[#A1A1AA]">
            Nombre del negocio
          </Label>
          <Input
            id="biz-name"
            type="text"
            value={localName}
            onChange={handleNameChange}
            placeholder="Ej: FitZone CR"
            maxLength={40}
            className="bg-[#09090B] border-[#3F3F46] text-sm max-w-xs"
          />
          <p className="text-[11px] text-[#52525B]">
            Se muestra junto al logo en el header (móvil y escritorio).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full logo (desktop) */}
          <LogoUploadSlot
            label="Logo completo"
            hint="Se muestra en escritorio. Recomendado: 200x50 px, PNG o SVG."
            currentSrc={branding.logoFull}
            onUpload={(dataUrl) => update({ logoFull: dataUrl })}
            onClear={() => update({ logoFull: null })}
            fallback={<BlacklineFitnessLogo variant="full" size={28} />}
          />

          {/* Mark logo (mobile) */}
          <LogoUploadSlot
            label="Logo abreviado"
            hint="Se muestra en móvil. Recomendado: 64x64 px, cuadrado."
            currentSrc={branding.logoMark}
            onUpload={(dataUrl) => update({ logoMark: dataUrl })}
            onClear={() => update({ logoMark: null })}
            fallback={<BlacklineFitnessLogo variant="mark" size={28} />}
          />
        </div>

        {/* Reset all branding */}
        <div className="pt-2 border-t border-[#27272A]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!confirm("Restaurar todo el branding a los valores por defecto?")) return;
              reset();
              setLocalName("");
              toast.success("Branding restaurado a valores por defecto.");
            }}
            className="border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Restaurar valores por defecto
          </Button>
        </div>
      </SectionCard>
    </>
  );
}
