"use client";

// =============================================================================
// BLACKLINE FITNESS — Branding customization section for Settings page
// Palette picker + logo uploads (full + mark)
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Palette, ImagePlus, Trash2, RotateCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/lib/branding/branding-context";
import { PALETTE_PRESETS, HEX_COLOR_REGEX, isCustomPalette, customHexFromId, customIdFromHex } from "@/lib/branding/presets";
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
  action,
  children,
}: {
  icon: React.ElementType;
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/15">
          <Icon className="h-4 w-4 text-brand-primary" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </h2>
        {action && <div className="ml-auto">{action}</div>}
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

      e.target.value = "";
    },
    [onUpload],
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs text-[#A1A1AA]">{label}</Label>
      <p className="text-[11px] text-[#52525B]">{hint}</p>

      <div className="flex items-center gap-3">
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
  const [savingPalette, setSavingPalette] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [hexInput, setHexInput] = useState(() => customHexFromId(branding.paletteId) ?? "");
  const hexValid = hexInput.length > 0 && HEX_COLOR_REGEX.test(hexInput);
  const activeCustomHex = customHexFromId(branding.paletteId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalName(branding.businessName);
  }, [branding.businessName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalName(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      update({ businessName: value.trim() });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Color palette ─────────────────────────────────────────────────── */}
      <SectionCard
        icon={Palette}
        label="Paleta de colores"
        action={
          <Button
            size="sm"
            onClick={() => {
              setSavingPalette(true);
              setTimeout(() => {
                setSavingPalette(false);
                toast.success("Paleta guardada.");
              }, 400);
            }}
            disabled={savingPalette}
            className="bg-[var(--brand-primary,#3B82F6)] hover:bg-[var(--brand-primary-hover,#2563EB)] text-white text-xs"
          >
            {savingPalette ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            )}
            Guardar
          </Button>
        }
      >
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
                onClick={() => {
                  update({ paletteId: preset.id });
                  setHexInput("");
                }}
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

        {/* Custom hex color input */}
        <div className="flex items-end gap-2">
          <div className="space-y-1.5 flex-1 max-w-[200px]">
            <Label htmlFor="custom-hex" className="text-xs text-[#A1A1AA]">
              Color personalizado
            </Label>
            <div className="relative">
              <div
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded border border-[#3F3F46]"
                style={{
                  backgroundColor: hexValid ? hexInput : "#27272A",
                }}
              />
              <Input
                id="custom-hex"
                type="text"
                value={hexInput}
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (v && !v.startsWith("#")) v = "#" + v;
                  setHexInput(v.slice(0, 7));
                }}
                placeholder="#FF5500"
                maxLength={7}
                spellCheck={false}
                className="bg-[#09090B] border-[#3F3F46] text-sm font-mono pl-10 uppercase"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!hexValid) {
                toast.error("Ingresá un código hex válido (ej: #FF5500).");
                return;
              }
              update({ paletteId: customIdFromHex(hexInput) });
              toast.success("Color personalizado aplicado.");
            }}
            disabled={!hexValid}
            className="border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-40"
          >
            Aplicar
          </Button>
        </div>

        {activeCustomHex && (
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <div
              className="h-4 w-4 rounded-full border border-white/30"
              style={{ backgroundColor: activeCustomHex }}
            />
            <span>Color activo: <span className="font-mono text-[#FAFAFA]">{activeCustomHex}</span></span>
          </div>
        )}
      </SectionCard>

      {/* ── Logo personalizado ────────────────────────────────────────────── */}
      <SectionCard
        icon={ImagePlus}
        label="Logo personalizado"
        action={
          <Button
            size="sm"
            onClick={() => {
              setSavingLogo(true);
              setTimeout(() => {
                setSavingLogo(false);
                toast.success("Logo guardado.");
              }, 400);
            }}
            disabled={savingLogo}
            className="bg-[var(--brand-primary,#3B82F6)] hover:bg-[var(--brand-primary-hover,#2563EB)] text-white text-xs"
          >
            {savingLogo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            )}
            Guardar
          </Button>
        }
      >
        <p className="text-xs text-[#71717A]">
          Subí tu logo para reemplazar el monograma BL. El logo aparecerá en
          el header de la app, tanto para vos como para tus clientes.
        </p>

        {/* Business name */}
        <div className="space-y-2">
          <Label htmlFor="biz-name" className="text-xs text-[#A1A1AA]">
            Nombre del negocio <span className="text-[#52525B] font-normal">(opcional)</span>
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
            Si lo dejás vacío, solo se verá el logo en el header.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LogoUploadSlot
            label="Logo completo"
            hint="Se muestra en escritorio. Recomendado: 200x50 px, PNG o SVG."
            currentSrc={branding.logoFull}
            onUpload={(dataUrl) => update({ logoFull: dataUrl })}
            onClear={() => update({ logoFull: null })}
            fallback={<BlacklineFitnessLogo variant="full" size={28} />}
          />

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
