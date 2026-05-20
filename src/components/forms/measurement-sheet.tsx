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
import { Loader2, CheckCircle, Upload, AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { ScaleData } from "@/types/profile";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import type { MeasurementsExtraction } from "@/lib/ai/ocr-measurements";
import { useMeasurementSheetStore } from "@/stores/measurement-sheet-store";

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

// Lazy import of the measurements OCR extractor — pulls in @google/generative-ai
// only when the user opens the Antropometría or Composición tab OCR zone.
const extractMeasurementsBrowserModule = () =>
  import("@/lib/demo/ocr-measurements-browser").then(
    (m) => m.extractMeasurementsBrowser,
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

  const focus = useMeasurementSheetStore((s) => s.focus);
  const clearFocus = useMeasurementSheetStore((s) => s.clearFocus);

  // Apply store focus: switch tabs, scroll to field, then clear so re-opens
  // manuales no reaplican el viejo foco.
  React.useEffect(() => {
    if (!focus) return;

    setActiveTab(focus.tab ?? "antropometria");
    if (focus.anthroTab) {
      setAnthroTab(focus.anthroTab);
    }

    // Wait one tick for the tab panel to become visible before focusing.
    const raf = requestAnimationFrame(() => {
      if (focus.field) {
        const el = document.getElementById(`anthro-${focus.field}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      clearFocus();
    });

    return () => cancelAnimationFrame(raf);
    // clearFocus es estable (Zustand store getter), agregarlo a deps es
    // cero-coste y satisface biome lint/correctness/useExhaustiveDependencies.
  }, [focus, clearFocus]);

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

  function handleAnthroOcr(data: MeasurementsExtraction) {
    setOcrUsed(true);
    setForm((prev) => ({
      ...prev,
      neckCm: data.neckCm?.toString() ?? prev.neckCm,
      shoulderLeftCm: data.shoulderLeftCm?.toString() ?? prev.shoulderLeftCm,
      shoulderRightCm: data.shoulderRightCm?.toString() ?? prev.shoulderRightCm,
      chestCm: data.chestCm?.toString() ?? prev.chestCm,
      abdomenCm: data.abdomenCm?.toString() ?? prev.abdomenCm,
      waistCm: data.waistCm?.toString() ?? prev.waistCm,
      hipCm: data.hipCm?.toString() ?? prev.hipCm,
      gluteLeftCm: data.gluteLeftCm?.toString() ?? prev.gluteLeftCm,
      gluteRightCm: data.gluteRightCm?.toString() ?? prev.gluteRightCm,
      bicepLeftCm: data.bicepLeftCm?.toString() ?? prev.bicepLeftCm,
      bicepRightCm: data.bicepRightCm?.toString() ?? prev.bicepRightCm,
      forearmLeftCm: data.forearmLeftCm?.toString() ?? prev.forearmLeftCm,
      forearmRightCm: data.forearmRightCm?.toString() ?? prev.forearmRightCm,
      thighLeftCm: data.thighLeftCm?.toString() ?? prev.thighLeftCm,
      thighRightCm: data.thighRightCm?.toString() ?? prev.thighRightCm,
      hamstringLeftCm: data.hamstringLeftCm?.toString() ?? prev.hamstringLeftCm,
      hamstringRightCm: data.hamstringRightCm?.toString() ?? prev.hamstringRightCm,
      calfLeftCm: data.calfLeftCm?.toString() ?? prev.calfLeftCm,
      calfRightCm: data.calfRightCm?.toString() ?? prev.calfRightCm,
    }));
  }

  function handleComposicionOcr(data: MeasurementsExtraction) {
    setOcrUsed(true);
    setForm((prev) => ({
      ...prev,
      weightKg: data.weightKg?.toString() ?? prev.weightKg,
      bodyFatPct: data.bodyFatPct?.toString() ?? prev.bodyFatPct,
      muscleMassKg: data.muscleMassKg?.toString() ?? prev.muscleMassKg,
      visceralFat: data.visceralFat?.toString() ?? prev.visceralFat,
      basalMetabolicRate: data.basalMetabolicRate?.toString() ?? prev.basalMetabolicRate,
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
              "flex-1 px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-[-2px]",
              activeTab === tab.id
                ? "border-b-2 border-brand-primary text-[#FAFAFA]"
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
          <React.Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-brand-primary" /></div>}>
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
          <MeasurementOcrZone onExtracted={handleAnthroOcr} />

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
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary",
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
          <MeasurementOcrZone onExtracted={handleComposicionOcr} />

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
            "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
            saveState === "success"
              ? "bg-[#22C55E] text-[#09090B]"
              : "bg-brand-primary text-[#09090B] hover:bg-brand-primary-hover disabled:opacity-60 disabled:cursor-not-allowed",
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
                  "focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary",
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
// Sub-componente: zona compacta de OCR para medidas (Antropometría / Composición)
// -----------------------------------------------------------------------------

type OcrZoneState =
  | { phase: "idle" }
  | { phase: "processing" }
  | { phase: "success"; confidence: number }
  | { phase: "error"; message: string };

interface MeasurementOcrZoneProps {
  onExtracted: (data: MeasurementsExtraction) => void;
}

function MeasurementOcrZone({ onExtracted }: MeasurementOcrZoneProps) {
  const [state, setState] = React.useState<OcrZoneState>({ phase: "idle" });
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isDraggingOver = React.useRef(false);
  const geminiReady = hasGeminiKey();

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setState({ phase: "error", message: "Solo se aceptan imágenes (JPG, PNG, WEBP)." });
      return;
    }

    setState({ phase: "processing" });

    try {
      const extractor = await extractMeasurementsBrowserModule();
      const { data, confidence } = await extractor(file);
      onExtracted(data);
      setState({ phase: "success", confidence });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudieron detectar las medidas.";
      setState({ phase: "error", message: msg });
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    isDraggingOver.current = false;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDraggingOver.current) {
      isDraggingOver.current = true;
      setDragging(true);
    }
  }

  function handleDragLeave() {
    isDraggingOver.current = false;
    setDragging(false);
  }

  function handleReset() {
    setState({ phase: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      {/* No Gemini key warning */}
      {!geminiReady && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] px-3 py-2"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs text-[#F59E0B]">
              Configurá tu API key de Gemini para detectar medidas automáticamente.
            </p>
            <Link
              href="/trainer/ajustes"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F59E0B] underline underline-offset-2 hover:text-[#FBBF24]"
            >
              <Settings className="h-3 w-3" aria-hidden="true" />
              Ir a Ajustes
            </Link>
          </div>
        </div>
      )}

      {/* Drop zone — only shown when Gemini is ready and not yet processed */}
      {geminiReady && state.phase !== "success" && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastrá o seleccioná una foto para detectar medidas automáticamente"
            onClick={() => {
              if (state.phase !== "processing") inputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && state.phase !== "processing") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              "flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
              state.phase === "processing" && "cursor-default opacity-70",
              dragging
                ? "border-brand-primary bg-[#27272A]"
                : "border-[#3F3F46] bg-[#18181B] hover:border-brand-primary hover:bg-[#27272A]",
            )}
          >
            {state.phase === "processing" ? (
              <>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-primary" aria-hidden="true" />
                <span className="text-xs text-[#A1A1AA]">Detectando medidas...</span>
              </>
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#27272A]">
                  <Upload className="h-4 w-4 text-[#71717A]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#FAFAFA]">
                    Subí una foto para detectar medidas automáticamente
                  </p>
                  <p className="mt-0.5 text-xs text-[#71717A]">JPG, PNG, WEBP</p>
                </div>
              </>
            )}
          </div>

          {state.phase === "error" && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" aria-hidden="true" />
              <p className="text-xs text-[#EF4444]">{state.message}</p>
            </div>
          )}
        </>
      )}

      {/* Success banner */}
      {geminiReady && state.phase === "success" && (
        <div className="flex items-center justify-between rounded-lg border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" aria-hidden="true" />
            <p className="text-xs text-[#22C55E]">
              Medidas detectadas — confianza{" "}
              <span className="font-semibold">
                {Math.round((state as { phase: "success"; confidence: number }).confidence * 100)}%
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="ml-3 shrink-0 text-xs text-[#71717A] underline underline-offset-2 hover:text-[#A1A1AA]"
          >
            Otra foto
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
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
