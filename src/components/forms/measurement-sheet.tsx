"use client";

// =============================================================================
// FORJA — MeasurementSheet
// Owner: frontend-react.
// Sheet (slideout) con 3 tabs: Foto báscula / Antropometría / Composición.
// Mobile: vaul Drawer. Tablet+: Radix Dialog.
// =============================================================================

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X, Loader2, CheckCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ScaleOcrUploader } from "./scale-ocr-uploader";
import type { ScaleData } from "@/types/profile";
// TODO(backend-api): recordBodyMetric ya existe en actions/metrics.ts
import { recordBodyMetric } from "@/app/actions/metrics";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MeasurementSheetProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "bascula" | "antropometria" | "composicion";

type AnthroSubTab = "tronco" | "brazos" | "piernas";

interface MeasurementFormData {
  // Báscula / Composición
  weightKg: string;
  bodyFatPct: string;
  muscleMassKg: string;
  visceralFat: string;
  basalMetabolicRate: string;
  // Tronco
  neckCm: string;
  shoulderLeftCm: string;
  shoulderRightCm: string;
  chestCm: string;
  abdomenCm: string;
  waistCm: string;
  hipCm: string;
  gluteLeftCm: string;
  gluteRightCm: string;
  // Brazos
  bicepLeftCm: string;
  bicepRightCm: string;
  forearmLeftCm: string;
  forearmRightCm: string;
  // Piernas
  thighLeftCm: string;
  thighRightCm: string;
  hamstringLeftCm: string;
  hamstringRightCm: string;
  calfLeftCm: string;
  calfRightCm: string;
}

type SaveState = "idle" | "saving" | "success" | "error";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function emptyForm(): MeasurementFormData {
  return {
    weightKg: "",
    bodyFatPct: "",
    muscleMassKg: "",
    visceralFat: "",
    basalMetabolicRate: "",
    neckCm: "",
    shoulderLeftCm: "",
    shoulderRightCm: "",
    chestCm: "",
    abdomenCm: "",
    waistCm: "",
    hipCm: "",
    gluteLeftCm: "",
    gluteRightCm: "",
    bicepLeftCm: "",
    bicepRightCm: "",
    forearmLeftCm: "",
    forearmRightCm: "",
    thighLeftCm: "",
    thighRightCm: "",
    hamstringLeftCm: "",
    hamstringRightCm: "",
    calfLeftCm: "",
    calfRightCm: "",
  };
}

function parseOptionalFloat(s: string): number | undefined {
  const n = parseFloat(s);
  return s.trim() === "" || isNaN(n) ? undefined : n;
}

// -----------------------------------------------------------------------------
// Inner content (tab navigation + form)
// -----------------------------------------------------------------------------

function MeasurementContent({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<Tab>("bascula");
  const [anthroTab, setAnthroTab] = React.useState<AnthroSubTab>("tronco");
  const [form, setForm] = React.useState<MeasurementFormData>(emptyForm());
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  function setField(key: keyof MeasurementFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOcrExtracted(data: ScaleData) {
    setForm((prev) => ({
      ...prev,
      weightKg: data.weightKg?.toString() ?? prev.weightKg,
      bodyFatPct: data.bodyFatPct?.toString() ?? prev.bodyFatPct,
      muscleMassKg: data.muscleMassKg?.toString() ?? prev.muscleMassKg,
      visceralFat: data.visceralFat?.toString() ?? prev.visceralFat,
      basalMetabolicRate:
        data.basalMetabolicRate?.toString() ?? prev.basalMetabolicRate,
    }));
  }

  async function handleSave() {
    setSaveState("saving");
    setErrorMsg(null);

    const result = await recordBodyMetric({
      weightKg: parseOptionalFloat(form.weightKg),
      bodyFatPct: parseOptionalFloat(form.bodyFatPct),
      muscleMassKg: parseOptionalFloat(form.muscleMassKg),
      waistCm: parseOptionalFloat(form.waistCm),
      hipCm: parseOptionalFloat(form.hipCm),
      neckCm: parseOptionalFloat(form.neckCm),
      chestCm: parseOptionalFloat(form.chestCm),
      // DB usa armCm y thighCm sin lateralidad por ahora (MVP).
      // TODO(database-architect): migrar a leftArmCm/rightArmCm etc.
      armCm:
        parseOptionalFloat(form.bicepLeftCm) ??
        parseOptionalFloat(form.bicepRightCm),
      thighCm:
        parseOptionalFloat(form.thighLeftCm) ??
        parseOptionalFloat(form.thighRightCm),
      source: "MANUAL",
    });

    if (result.ok) {
      setSaveState("success");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } else {
      setSaveState("error");
      setErrorMsg(result.error.message ?? "No se guardó la medición. Reintentá.");
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "bascula", label: "Foto báscula" },
    { id: "antropometria", label: "Antropometría" },
    { id: "composicion", label: "Composición" },
  ];

  const ANTHRO_TABS: { id: AnthroSubTab; label: string }[] = [
    { id: "tronco", label: "Tronco" },
    { id: "brazos", label: "Brazos" },
    { id: "piernas", label: "Piernas" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab list principal */}
      <div
        role="tablist"
        aria-label="Sección de medición"
        className="flex shrink-0 border-b border-[#3F3F46]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-[-2px]",
              activeTab === tab.id
                ? "border-b-2 border-[#FF6A1A] text-[#FAFAFA]"
                : "text-[#71717A] hover:text-[#A1A1AA]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Báscula */}
        <div
          id="tabpanel-bascula"
          role="tabpanel"
          aria-labelledby="tab-bascula"
          hidden={activeTab !== "bascula"}
        >
          <ScaleOcrUploader
            onExtracted={handleOcrExtracted}
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>

        {/* Antropometría */}
        <div
          id="tabpanel-antropometria"
          role="tabpanel"
          aria-labelledby="tab-antropometria"
          hidden={activeTab !== "antropometria"}
        >
          {/* Sub-tabs */}
          <div
            role="tablist"
            aria-label="Zona corporal"
            className="mb-4 flex rounded-xl border border-[#3F3F46] p-1"
          >
            {ANTHRO_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`subtab-${t.id}`}
                aria-selected={anthroTab === t.id}
                aria-controls={`subtabpanel-${t.id}`}
                onClick={() => setAnthroTab(t.id)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#FF6A1A]",
                  anthroTab === t.id
                    ? "bg-[#3F3F46] text-[#FAFAFA]"
                    : "text-[#71717A] hover:text-[#A1A1AA]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tronco */}
          <div
            id="subtabpanel-tronco"
            role="tabpanel"
            aria-labelledby="subtab-tronco"
            hidden={anthroTab !== "tronco"}
          >
            <AnthroFieldGrid
              fields={[
                { key: "neckCm", label: "Cuello" },
                { key: "shoulderLeftCm", label: "Hombro izq." },
                { key: "shoulderRightCm", label: "Hombro der." },
                { key: "chestCm", label: "Pecho" },
                { key: "abdomenCm", label: "Abdomen" },
                { key: "waistCm", label: "Cintura" },
                { key: "hipCm", label: "Cadera" },
                { key: "gluteLeftCm", label: "Glúteo izq." },
                { key: "gluteRightCm", label: "Glúteo der." },
              ]}
              form={form}
              setField={setField}
            />
          </div>

          {/* Brazos */}
          <div
            id="subtabpanel-brazos"
            role="tabpanel"
            aria-labelledby="subtab-brazos"
            hidden={anthroTab !== "brazos"}
          >
            <AnthroFieldGrid
              fields={[
                { key: "bicepLeftCm", label: "Bíceps izq." },
                { key: "bicepRightCm", label: "Bíceps der." },
                { key: "forearmLeftCm", label: "Antebrazo izq." },
                { key: "forearmRightCm", label: "Antebrazo der." },
              ]}
              form={form}
              setField={setField}
            />
          </div>

          {/* Piernas */}
          <div
            id="subtabpanel-piernas"
            role="tabpanel"
            aria-labelledby="subtab-piernas"
            hidden={anthroTab !== "piernas"}
          >
            <AnthroFieldGrid
              fields={[
                { key: "thighLeftCm", label: "Cuádriceps izq." },
                { key: "thighRightCm", label: "Cuádriceps der." },
                { key: "hamstringLeftCm", label: "Isquios izq." },
                { key: "hamstringRightCm", label: "Isquios der." },
                { key: "calfLeftCm", label: "Gemelo izq." },
                { key: "calfRightCm", label: "Gemelo der." },
              ]}
              form={form}
              setField={setField}
            />
          </div>
        </div>

        {/* Composición */}
        <div
          id="tabpanel-composicion"
          role="tabpanel"
          aria-labelledby="tab-composicion"
          hidden={activeTab !== "composicion"}
        >
          <AnthroFieldGrid
            fields={[
              { key: "weightKg", label: "Peso (kg)", unit: "kg" },
              { key: "bodyFatPct", label: "% Grasa corporal", unit: "%" },
              { key: "muscleMassKg", label: "Masa muscular", unit: "kg" },
              { key: "visceralFat", label: "Grasa visceral", unit: "" },
              { key: "basalMetabolicRate", label: "Metabolismo basal", unit: "kcal" },
            ]}
            form={form}
            setField={setField}
          />
        </div>
      </div>

      {/* Footer sticky */}
      <div className="shrink-0 border-t border-[#3F3F46] p-4">
        {errorMsg && (
          <p role="alert" className="mb-3 text-xs text-[#EF4444]">
            {errorMsg}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving" || saveState === "success"}
          className={cn(
            "inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors",
            "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
            saveState === "success"
              ? "bg-[#22C55E] text-[#09090B]"
              : "bg-[#FF6A1A] text-[#09090B] hover:bg-[#E55A0E] disabled:opacity-60 disabled:cursor-not-allowed",
          )}
          aria-busy={saveState === "saving"}
        >
          {saveState === "saving" && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {saveState === "success" && (
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {saveState === "success"
            ? "Medición guardada"
            : saveState === "saving"
              ? "Guardando..."
              : "Guardar medición"}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componente: grid de campos de antropometría
// -----------------------------------------------------------------------------

interface AnthroField {
  key: keyof MeasurementFormData;
  label: string;
  unit?: string;
}

interface AnthroFieldGridProps {
  fields: AnthroField[];
  form: MeasurementFormData;
  setField: (key: keyof MeasurementFormData, value: string) => void;
}

function AnthroFieldGrid({ fields, form, setField }: AnthroFieldGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map(({ key, label, unit = "cm" }) => {
        const fieldId = `anthro-${key}`;
        return (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="text-xs font-medium text-[#A1A1AA]">
              {label}
            </label>
            <div className="relative">
              <input
                id={fieldId}
                type="number"
                step="0.1"
                min="0"
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                placeholder="—"
                className={cn(
                  "min-h-[44px] w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA]",
                  "placeholder:text-[#52525B]",
                  "focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]",
                  unit && "pr-10",
                )}
                aria-label={`${label}${unit ? `, en ${unit}` : ""}`}
              />
              {unit && (
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#52525B]"
                  aria-hidden="true"
                >
                  {unit}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shell: detecta mobile vs tablet/desktop y elige Vaul Drawer o Radix Dialog
// -----------------------------------------------------------------------------

export function MeasurementSheet({
  clientId,
  open,
  onOpenChange,
}: MeasurementSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  function handleSuccess() {
    onOpenChange(false);
  }

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col",
              "bg-[#18181B] shadow-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              "duration-300",
            )}
            aria-describedby="measurement-sheet-desc"
          >
            <DialogPrimitive.Title className="sr-only">
              Nueva medición
            </DialogPrimitive.Title>
            <p id="measurement-sheet-desc" className="sr-only">
              Formulario para registrar mediciones corporales del cliente.
            </p>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#3F3F46] px-5 py-4">
              <h2 className="text-base font-semibold text-[#FAFAFA]">
                Nueva medición
              </h2>
              <DialogPrimitive.Close
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <MeasurementContent clientId={clientId} onSuccess={handleSuccess} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  // Mobile: Vaul bottom drawer
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)]" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl",
            "bg-[#18181B] shadow-xl",
            "max-h-[92dvh]",
          )}
          aria-describedby="drawer-measurement-desc"
        >
          <Drawer.Title className="sr-only">Nueva medición</Drawer.Title>
          <p id="drawer-measurement-desc" className="sr-only">
            Formulario para registrar mediciones corporales del cliente.
          </p>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className="h-1.5 w-12 rounded-full bg-[#3F3F46]"
              aria-hidden="true"
            />
          </div>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#3F3F46] px-5 py-3">
            <h2 className="text-base font-semibold text-[#FAFAFA]">
              Nueva medición
            </h2>
            <Drawer.Close
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Drawer.Close>
          </div>

          <MeasurementContent clientId={clientId} onSuccess={handleSuccess} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
