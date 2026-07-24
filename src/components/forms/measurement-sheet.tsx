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
import { Loader2, CheckCircle, AlertTriangle, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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

import { getLatestMetric, recordBodyMetric } from "@/app/actions/metrics";

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
  const n = Number.parseFloat(s);
  return s.trim() === "" || Number.isNaN(n) ? undefined : n;
}

function parseOptionalInt(s: string): number | undefined {
  const n = Number.parseInt(s, 10);
  return s.trim() === "" || Number.isNaN(n) ? undefined : n;
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
  const [previous, setPrevious] = React.useState<
    Partial<Record<keyof MeasurementFormData, number | null>>
  >({});

  // Última medición del cliente: la usamos solo como referencia visual para
  // ver el cambio mientras se escribe. Si falla, el formulario sigue usable.
  React.useEffect(() => {
    let cancelled = false;
    getLatestMetric(clientId).then((result) => {
      if (cancelled || !result.ok || !result.value) return;
      const m = result.value;
      const num = (v: unknown): number | null =>
        v == null ? null : Number(v);
      setPrevious({
        weightKg: num(m.weightKg),
        bodyFatPct: num(m.bodyFatPct),
        muscleMassKg: num(m.muscleMassKg),
        visceralFat: m.visceralFat ?? null,
        basalMetabolicRate: m.basalMetabolicRate ?? null,
        neckCm: num(m.neckCm),
        shoulderLeftCm: num(m.shoulderLeftCm),
        shoulderRightCm: num(m.shoulderRightCm),
        chestCm: num(m.chestCm),
        abdomenCm: num(m.abdomenCm),
        waistCm: num(m.waistCm),
        hipCm: num(m.hipCm),
        gluteLeftCm: num(m.gluteLeftCm),
        gluteRightCm: num(m.gluteRightCm),
        bicepLeftCm: num(m.bicepLeftCm ?? m.armCm),
        bicepRightCm: num(m.bicepRightCm ?? m.armCm),
        forearmLeftCm: num(m.forearmLeftCm),
        forearmRightCm: num(m.forearmRightCm),
        thighLeftCm: num(m.thighLeftCm ?? m.thighCm),
        thighRightCm: num(m.thighRightCm ?? m.thighCm),
        hamstringLeftCm: num(m.hamstringLeftCm),
        hamstringRightCm: num(m.hamstringRightCm),
        calfLeftCm: num(m.calfLeftCm),
        calfRightCm: num(m.calfRightCm),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const focus = useMeasurementSheetStore((s) => s.focus);
  const clearFocus = useMeasurementSheetStore((s) => s.clearFocus);
  const notifySaved = useMeasurementSheetStore((s) => s.notifySaved);

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

  /** Campos con un número válido cargado — alimenta el guard y el resumen. */
  const filledCount = React.useMemo(
    () =>
      Object.values(form).filter(
        (v) => v.trim() !== "" && !Number.isNaN(Number.parseFloat(v)),
      ).length,
    [form],
  );

  const hasWeight = form.weightKg.trim() !== "";

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

  /**
   * Aplica los campos de antropometría detectados al formulario.
   * Devuelve cuántos campos quedaron pre-llenados (para feedback al coach).
   */
  function handleAnthroOcr(data: MeasurementsExtraction): number {
    setOcrUsed(true);
    let detected = 0;
    setForm((prev) => {
      const next = { ...prev };
      const apply = (key: keyof MeasurementFormData, val: number | null) => {
        if (val != null) {
          next[key] = val.toString();
          detected++;
        }
      };
      apply("neckCm", data.neckCm);
      apply("shoulderLeftCm", data.shoulderLeftCm);
      apply("shoulderRightCm", data.shoulderRightCm);
      apply("chestCm", data.chestCm);
      apply("abdomenCm", data.abdomenCm);
      apply("waistCm", data.waistCm);
      apply("hipCm", data.hipCm);
      apply("gluteLeftCm", data.gluteLeftCm);
      apply("gluteRightCm", data.gluteRightCm);
      apply("bicepLeftCm", data.bicepLeftCm);
      apply("bicepRightCm", data.bicepRightCm);
      apply("forearmLeftCm", data.forearmLeftCm);
      apply("forearmRightCm", data.forearmRightCm);
      apply("thighLeftCm", data.thighLeftCm);
      apply("thighRightCm", data.thighRightCm);
      apply("hamstringLeftCm", data.hamstringLeftCm);
      apply("hamstringRightCm", data.hamstringRightCm);
      apply("calfLeftCm", data.calfLeftCm);
      apply("calfRightCm", data.calfRightCm);
      return next;
    });
    return detected;
  }

  /**
   * Aplica los campos de composición detectados al formulario.
   * Devuelve cuántos campos quedaron pre-llenados.
   */
  function handleComposicionOcr(data: MeasurementsExtraction): number {
    setOcrUsed(true);
    let detected = 0;
    setForm((prev) => {
      const next = { ...prev };
      const apply = (key: keyof MeasurementFormData, val: number | null) => {
        if (val != null) {
          next[key] = val.toString();
          detected++;
        }
      };
      apply("weightKg", data.weightKg);
      apply("bodyFatPct", data.bodyFatPct);
      apply("muscleMassKg", data.muscleMassKg);
      apply("visceralFat", data.visceralFat);
      apply("basalMetabolicRate", data.basalMetabolicRate);
      return next;
    });
    return detected;
  }

  async function handleSave() {
    // El cupo es 1 medición por semana: guardar un formulario vacío quemaría
    // el turno del cliente creando una fila sin ningún dato.
    if (filledCount === 0) {
      setSaveState("error");
      setErrorMsg(
        "Ingresá al menos una medición antes de guardar. Este registro consume tu medición de la semana.",
      );
      return;
    }

    setSaveState("saving");
    setErrorMsg(null);

    // Parse all 18 circumferences + 5 composition + 2 integers from the form.
    const bicepLeftCm = parseOptionalFloat(form.bicepLeftCm);
    const bicepRightCm = parseOptionalFloat(form.bicepRightCm);
    const thighLeftCm = parseOptionalFloat(form.thighLeftCm);
    const thighRightCm = parseOptionalFloat(form.thighRightCm);

    const result = await recordBodyMetric({
      clientUserId: clientId,
      // Composición
      weightKg: parseOptionalFloat(form.weightKg),
      bodyFatPct: parseOptionalFloat(form.bodyFatPct),
      muscleMassKg: parseOptionalFloat(form.muscleMassKg),
      visceralFat: parseOptionalInt(form.visceralFat),
      basalMetabolicRate: parseOptionalInt(form.basalMetabolicRate),
      // Tronco
      neckCm: parseOptionalFloat(form.neckCm),
      shoulderLeftCm: parseOptionalFloat(form.shoulderLeftCm),
      shoulderRightCm: parseOptionalFloat(form.shoulderRightCm),
      chestCm: parseOptionalFloat(form.chestCm),
      abdomenCm: parseOptionalFloat(form.abdomenCm),
      waistCm: parseOptionalFloat(form.waistCm),
      hipCm: parseOptionalFloat(form.hipCm),
      gluteLeftCm: parseOptionalFloat(form.gluteLeftCm),
      gluteRightCm: parseOptionalFloat(form.gluteRightCm),
      // Brazos
      bicepLeftCm,
      bicepRightCm,
      forearmLeftCm: parseOptionalFloat(form.forearmLeftCm),
      forearmRightCm: parseOptionalFloat(form.forearmRightCm),
      // Piernas
      thighLeftCm,
      thighRightCm,
      hamstringLeftCm: parseOptionalFloat(form.hamstringLeftCm),
      hamstringRightCm: parseOptionalFloat(form.hamstringRightCm),
      calfLeftCm: parseOptionalFloat(form.calfLeftCm),
      calfRightCm: parseOptionalFloat(form.calfRightCm),
      // Legacy single-side fallback (compat con código viejo y dashboards previos)
      armCm: bicepLeftCm ?? bicepRightCm,
      thighCm: thighLeftCm ?? thighRightCm,
      source: ocrUsed ? "OCR_SCALE" : "MANUAL",
    });

    if (result.ok) {
      notifySaved();
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
          <MeasurementOcrZone scope="antropometria" onExtracted={handleAnthroOcr} />

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
              previous={previous}
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
              previous={previous}
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
              previous={previous}
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
          <MeasurementOcrZone scope="composicion" onExtracted={handleComposicionOcr} />

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
            previous={previous}
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

        {/* Resumen: la medición se reparte en 3 tabs, así que sin esto es fácil
            guardar creyendo que se cargó algo que quedó en otra pestaña. */}
        {saveState !== "success" && (
          <div className="mb-3 flex items-center justify-between gap-2 text-xs">
            <span className={filledCount === 0 ? "text-[#F59E0B]" : "text-[#A1A1AA]"}>
              {filledCount === 0
                ? "Todavía no cargaste ninguna medida"
                : `${filledCount} ${filledCount === 1 ? "medida cargada" : "medidas cargadas"}`}
            </span>
            {filledCount > 0 && !hasWeight && (
              <span className="text-[#71717A]">Sin peso</span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saveState === "saving" || saveState === "success" || filledCount === 0
          }
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
  /** Valores de la medición anterior, para mostrar la referencia y el cambio. */
  previous?: Partial<Record<keyof MeasurementFormData, number | null>>;
}

/**
 * Diferencia contra la medición anterior, calculada mientras se escribe.
 * Sin esto el coach tiene que abrir el historial en otra pantalla para saber
 * si el número que acaba de tomar subió o bajó.
 */
function LiveDelta({
  current,
  previous,
  unit,
}: {
  current: string;
  previous: number | null | undefined;
  unit: string;
}) {
  if (previous == null) return null;

  const parsed = Number.parseFloat(current);
  if (current.trim() === "" || Number.isNaN(parsed)) {
    return (
      <span className="text-[10px] text-[#52525B]">
        Anterior: {previous}
        {unit ? ` ${unit}` : ""}
      </span>
    );
  }

  const delta = Math.round((parsed - previous) * 10) / 10;
  const flat = Math.abs(delta) < 0.05;

  return (
    <span className="text-[10px] text-[#52525B]">
      Anterior: {previous}
      {unit ? ` ${unit}` : ""}{" "}
      <span
        className={cn(
          "font-semibold tabular-nums",
          flat ? "text-[#71717A]" : delta > 0 ? "text-[#22C55E]" : "text-[#F59E0B]",
        )}
      >
        ({delta > 0 ? "+" : ""}
        {delta.toFixed(1)})
      </span>
    </span>
  );
}

function AnthroFieldGrid({ fields, form, setField, previous }: AnthroFieldGridProps) {
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
            <LiveDelta
              current={form[key]}
              previous={previous?.[key]}
              unit={unit}
            />
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componente: zona de OCR para medidas (Antropometría / Composición)
//
// Diseñado para que sea tan prominente como el dropzone de "Foto báscula" — el
// coach reportó que no era obvio que las otras tabs también aceptaran fotos.
// Mostramos preview de la imagen subida + resumen del resultado, y emitimos
// toasts cuando el OCR completa con confianza baja o warnings del modelo.
// -----------------------------------------------------------------------------

type OcrZoneState =
  | { phase: "idle" }
  | { phase: "processing"; objectUrl: string }
  | {
      phase: "success";
      objectUrl: string;
      confidence: number;
      detectedCount: number;
      warnings: string[];
    }
  | { phase: "error"; message: string; objectUrl?: string };

type OcrScope = "antropometria" | "composicion";

interface MeasurementOcrZoneProps {
  scope: OcrScope;
  /** Devuelve cuántos campos quedaron pre-llenados tras aplicar la extracción. */
  onExtracted: (data: MeasurementsExtraction) => number;
}

const SCOPE_COPY: Record<
  OcrScope,
  { title: string; subtitle: string; toastNoun: string }
> = {
  antropometria: {
    title: "Subí una foto de la cinta métrica u hoja de evaluación",
    subtitle: "Detectamos circunferencias automáticamente con IA",
    toastNoun: "circunferencias",
  },
  composicion: {
    title: "Subí una foto del display de la balanza",
    subtitle: "Detectamos peso, grasa, masa muscular y BMR con IA",
    toastNoun: "métricas",
  },
};

function MeasurementOcrZone({ scope, onExtracted }: MeasurementOcrZoneProps) {
  const [state, setState] = React.useState<OcrZoneState>({ phase: "idle" });
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isDraggingOver = React.useRef(false);
  const geminiReady = hasGeminiKey();
  const copy = SCOPE_COPY[scope];

  // Limpieza de object URLs cuando cambia la fase o el componente desmonta.
  React.useEffect(() => {
    const url =
      state.phase === "processing" || state.phase === "success"
        ? state.objectUrl
        : state.phase === "error"
          ? state.objectUrl
          : undefined;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state]);

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setState({
        phase: "error",
        message: "Solo se aceptan imágenes (JPG, PNG, WEBP).",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setState({ phase: "processing", objectUrl });

    try {
      const extractor = await extractMeasurementsBrowserModule();
      const { data, confidence } = await extractor(file);
      const detectedCount = onExtracted(data);

      setState({
        phase: "success",
        objectUrl,
        confidence,
        detectedCount,
        warnings: data.warnings,
      });

      if (detectedCount === 0) {
        toast.warning(`No detectamos ${copy.toastNoun} en esta foto`, {
          description:
            "Probá con una imagen más nítida o ingresá los valores manualmente.",
        });
      } else {
        toast.success(
          `${detectedCount} ${detectedCount === 1 ? "campo detectado" : "campos detectados"}`,
          {
            description: `Confianza ${Math.round(confidence * 100)}%. Revisá los valores antes de guardar.`,
          },
        );
      }

      if (data.warnings.length > 0) {
        toast.warning("Revisá estas observaciones", {
          description: data.warnings.slice(0, 3).join(" · "),
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudieron detectar las medidas.";
      setState({ phase: "error", message: msg, objectUrl });
      toast.error("Falló el OCR", { description: msg });
    }
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    isDraggingOver.current = false;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>) {
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

  const previewUrl =
    state.phase === "processing" || state.phase === "success"
      ? state.objectUrl
      : state.phase === "error"
        ? state.objectUrl
        : undefined;

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

      {/* Drop zone (idle) */}
      {geminiReady && state.phase === "idle" && (
        <button
          type="button"
          aria-label="Arrastrá o seleccioná una foto para detectar medidas automáticamente"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 transition-all duration-150",
            "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
            dragging
              ? "border-brand-primary bg-[#27272A]"
              : "border-[#3F3F46] bg-[#18181B] hover:border-brand-primary hover:bg-[#27272A]",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#27272A]">
            <Sparkles className="h-5 w-5 text-brand-primary" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#FAFAFA]">{copy.title}</p>
            <p className="mt-1 text-xs text-[#71717A]">{copy.subtitle}</p>
          </div>
        </button>
      )}

      {/* Preview con spinner durante processing */}
      {geminiReady && state.phase === "processing" && previewUrl && (
        <div className="relative overflow-hidden rounded-xl border border-[#3F3F46]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa de la foto subida"
            className="max-h-[180px] w-full bg-[#09090B] object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[rgba(9,9,11,0.7)]">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
            <span className="text-xs font-medium text-[#FAFAFA]">
              Detectando medidas...
            </span>
          </div>
        </div>
      )}

      {/* Success banner — campos detectados + opción de subir otra */}
      {geminiReady && state.phase === "success" && (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-[#22C55E]">
                  {state.detectedCount === 0
                    ? "Foto procesada — no se detectaron campos"
                    : state.detectedCount === 1
                      ? "1 campo detectado y pre-llenado"
                      : `${state.detectedCount} campos detectados y pre-llenados`}
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  Confianza {Math.round(state.confidence * 100)}%
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 text-xs text-[#A1A1AA] underline underline-offset-2 hover:text-[#FAFAFA]"
            >
              Otra foto
            </button>
          </div>
          {state.warnings.length > 0 && (
            <ul className="ml-6 list-disc space-y-0.5 text-xs text-[#F59E0B]">
              {state.warnings.slice(0, 3).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Error inline + opción reintentar */}
      {geminiReady && state.phase === "error" && (
        <div className="flex flex-col gap-2">
          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-[#3F3F46]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vista previa de la foto subida"
                className="max-h-[180px] w-full bg-[#09090B] object-contain opacity-60"
              />
            </div>
          )}
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-3 py-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" aria-hidden="true" />
              <p className="text-xs text-[#EF4444]">{state.message}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 text-xs font-medium text-[#FAFAFA] underline underline-offset-2 hover:text-[#FCA5A5]"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input — sr-only hides it visually; no aria-hidden so AT
          can still interact with it if needed (biome a11y rule). */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
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
