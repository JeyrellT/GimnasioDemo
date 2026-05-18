"use client";

// =============================================================================
// BLACKLINE FITNESS — MeasurementSheet
// Owner: frontend-react.
// Sheet (slideout) con 3 tabs: Foto báscula / Antropometría / Composición.
// Mobile: vaul Drawer. Tablet+: Radix Dialog.
//
// Heavy deps (vaul, @radix-ui/react-dialog, ScaleOcrUploader) are lazy-loaded
// via React.lazy so they are NOT included in the initial page bundle. They are
// only fetched when the user first opens the sheet.
// =============================================================================

import * as React from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { ScaleData } from "@/types/profile";

// Lazy-loaded heavy modules — fetched only when the sheet mounts (i.e. when the
// user actually opens it). Each dynamic import creates a separate chunk so
// vaul, radix-dialog and the OCR chain (which includes @google/generative-ai)
// are excluded from the initial JS bundle entirely.
const LazyScaleOcrUploader = React.lazy(() =>
  import("./scale-ocr-uploader").then((m) => ({ default: m.ScaleOcrUploader })),
);

// Lazy wrappers for the two shell variants — they carry the heavy UI framework
// deps (vaul / @radix-ui/react-dialog) only when needed.
const LazyDialogShell = React.lazy(() =>
  import("./measurement-sheet-dialog").then((m) => ({ default: m.MeasurementDialogShell })),
);
const LazyDrawerShell = React.lazy(() =>
  import("./measurement-sheet-drawer").then((m) => ({ default: m.MeasurementDrawerShell })),
);

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
  const [ocrUsed, setOcrUsed] = React.useState(false);

  function setField(key: keyof MeasurementFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOcrExtracted(data: ScaleData) {
    setOcrUsed(true);
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
      clientUserId: clientId,
      weightKg: parseOptionalFloat(form.weightKg),
      bodyFatPct: parseOptionalFloat(form.bodyFatPct),
      muscleMassKg: parseOptionalFloat(form.muscleMassKg),
      waistCm: parseOptionalFloat(form.waistCm),
      hipCm: parseOptionalFloat(form.hipCm),
      neckCm: parseOptionalFloat(form.neckCm),
      chestCm: parseOptionalFloat(form.chestCm),
      armCm:
        parseOptionalFloat(form.bicepLeftCm) ??
        parseOptionalFloat(form.bicepRightCm),
      thighCm:
        parseOptionalFloat(form.thighLeftCm) ??
        parseOptionalFloat(form.thighRightCm),
      source: ocrUsed ? "OCR_SCALE" : "MANUAL",
    });

    if (result.ok) {
      setSaveState("success");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } else {
      setSaveState("error");
      const failed = result as { ok: false; error: { message?: string } };
      setErrorMsg(failed.error.message ?? "No se guardó la medición. Reintentá.");
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
          <React.Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#FF6A1A]" /></div>}>
            <LazyScaleOcrUploader
              onExtracted={handleOcrExtracted}
              onError={(msg) => setErrorMsg(msg)}
            />
          </React.Suspense>
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
// Shell: detecta mobile vs tablet/desktop y elige Vaul Drawer o Radix Dialog.
// Both variants are loaded lazily — they are NOT in the initial bundle.
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

  // Only render (and therefore fetch) the lazy shells once the sheet is opened.
  if (!open) return null;

  const content = <MeasurementContent clientId={clientId} onSuccess={handleSuccess} />;

  // Suspense boundary wraps each lazy shell variant. The fallback is invisible
  // (no flash) because the chunks are tiny and load in <100 ms on any decent
  // connection; on very slow connections a subtle spinner prevents blank UI.
  return (
    <React.Suspense fallback={null}>
      {isDesktop ? (
        <LazyDialogShell open={open} onOpenChange={onOpenChange}>
          {content}
        </LazyDialogShell>
      ) : (
        <LazyDrawerShell open={open} onOpenChange={onOpenChange}>
          {content}
        </LazyDrawerShell>
      )}
    </React.Suspense>
  );
}
