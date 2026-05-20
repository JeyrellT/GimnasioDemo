"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  Sparkles,
  Database,
  User,
  Info,
  ExternalLink,
  RotateCcw,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { BrandingSection } from "./_components/branding-section";

import {
  getGeminiKey,
  setGeminiKey,
  clearGeminiKey,
} from "@/lib/demo/settings-store";
import { getModel } from "@/lib/demo/gemini-browser";
import { resetDemoData } from "@/lib/demo/seed-runner";
import { db } from "@/lib/offline/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportPayload {
  version: string;
  exportedAt: string;
  clients: unknown[];
  trainerClients: unknown[];
  metrics: unknown[];
  routines: unknown[];
  assignedRoutines: unknown[];
  sessions: unknown[];
  locations: unknown[];
  locationVisits: unknown[];
  expenses: unknown[];
  sales: unknown[];
  exercises: unknown[];
  onboardingDrafts: unknown[];
}

function isExportPayload(value: unknown): value is ExportPayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["version"] === "string" && Array.isArray(obj["clients"])
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
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
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/15">
          <Icon className="h-4 w-4 text-brand-primary" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AjustesPage() {
  const router = useRouter();

  // --- Gemini key state ---
  const [keySaved, setKeySaved] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [testing, setTesting] = useState(false);

  // --- Demo data state ---
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);

  // --- Image test state ---
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgTesting, setImgTesting] = useState(false);
  const [imgResult, setImgResult] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup image preview object URL
  useEffect(() => {
    return () => {
      if (imgPreview) URL.revokeObjectURL(imgPreview);
    };
  }, [imgPreview]);

  // Check if key exists on mount (never read the actual value into state)
  useEffect(() => {
    const stored = getGeminiKey();
    setKeySaved(!!stored);
    if (!stored) setEditingKey(true); // auto-show input if no key
  }, []);

  // -------------------------------------------------------------------------
  // Gemini handlers
  // -------------------------------------------------------------------------

  const handleSaveKey = () => {
    const trimmed = newKey.trim();
    if (!trimmed) {
      toast.error("Ingresá una API key primero.");
      return;
    }
    setGeminiKey(trimmed);
    setKeySaved(true);
    setEditingKey(false);
    setNewKey("");
    toast.success("API key guardada.");
  };

  const handleDeleteKey = () => {
    if (!confirm("¿Eliminar tu API key de Gemini? Las funciones de IA dejarán de funcionar.")) return;
    clearGeminiKey();
    setKeySaved(false);
    setEditingKey(true);
    setNewKey("");
    setImgFile(null);
    setImgPreview(null);
    setImgResult(null);
    toast.success("API key eliminada.");
  };

  const handleStartEditing = () => {
    setEditingKey(true);
    setNewKey("");
  };

  const handleCancelEditing = () => {
    setEditingKey(false);
    setNewKey("");
  };

  const handleTestKey = async () => {
    if (!keySaved) {
      toast.error("Guardá una API key primero.");
      return;
    }
    setTesting(true);
    try {
      const { pingGeminiKey } = await import("@/lib/demo/gemini-browser");
      const result = await pingGeminiKey();
      if (result.ok) {
        toast.success("API key válida. La IA está lista para usar.");
      } else {
        const msg =
          result.error instanceof Error
            ? result.error.message
            : String(result.error ?? "Error al validar la clave.");
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Módulo de IA no disponible aún.";
      toast.error("Error al probar la clave: " + msg);
    } finally {
      setTesting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Image test handlers
  // -------------------------------------------------------------------------

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("FileReader error"));
          return;
        }
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to extract base64"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
      reader.readAsDataURL(file);
    });
  }

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    setImgFile(file);
    setImgResult(null);
    const url = URL.createObjectURL(file);
    setImgPreview(url);
  };

  const handleImageTest = async () => {
    if (!imgFile || !keySaved) return;
    setImgTesting(true);
    setImgResult(null);
    try {
      const base64 = await fileToBase64(imgFile);
      const model = getModel({ model: "ocr" });
      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64, mimeType: imgFile.type } },
              {
                text: "Describí brevemente qué ves en esta imagen en 1-2 oraciones. Respondé en español.",
              },
            ],
          },
        ],
      });
      const text = response.response.text();
      setImgResult(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido.";
      toast.error("Error al analizar la imagen: " + msg);
    } finally {
      setImgTesting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Demo data handlers
  // -------------------------------------------------------------------------

  const handleResetDemo = async () => {
    if (
      !confirm(
        "Reiniciar todos los datos demo? Se perderan los cambios que hayas hecho.",
      )
    )
      return;

    setResetting(true);
    try {
      await resetDemoData();
      toast.success("Datos demo reiniciados.");
      setTimeout(() => router.refresh(), 500);
    } catch (err) {
      toast.error(
        "Error al reiniciar: " +
          (err instanceof Error ? err.message : "desconocido"),
      );
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async () => {
    try {
      const payload: ExportPayload = {
        version: "demo-v1",
        exportedAt: new Date().toISOString(),
        clients: await db.demoClients.toArray(),
        trainerClients: await db.demoTrainerClients.toArray(),
        metrics: await db.demoMetrics.toArray(),
        routines: await db.demoRoutines.toArray(),
        assignedRoutines: await db.demoAssignedRoutines.toArray(),
        sessions: await db.demoSessions.toArray(),
        locations: await db.demoLocations.toArray(),
        locationVisits: await db.demoLocationVisits.toArray(),
        expenses: await db.demoExpenses.toArray(),
        sales: await db.demoSales.toArray(),
        exercises: await db.demoExercises.toArray(),
        onboardingDrafts: await db.demoOnboardingDrafts.toArray(),
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blackline-fitness-demo-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success("Datos exportados.");
    } catch (err) {
      toast.error(
        "Error al exportar: " +
          (err instanceof Error ? err.message : "desconocido"),
      );
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);

      if (!isExportPayload(raw)) {
        throw new Error("Formato de archivo invalido.");
      }

      await db.transaction(
        "rw",
        [
          db.demoClients,
          db.demoTrainerClients,
          db.demoMetrics,
          db.demoRoutines,
          db.demoAssignedRoutines,
          db.demoSessions,
          db.demoLocations,
          db.demoLocationVisits,
          db.demoExpenses,
          db.demoSales,
          db.demoExercises,
          db.demoOnboardingDrafts,
        ],
        async () => {
          await db.demoClients.clear();
          await db.demoTrainerClients.clear();
          await db.demoMetrics.clear();
          await db.demoRoutines.clear();
          await db.demoAssignedRoutines.clear();
          await db.demoSessions.clear();
          await db.demoLocations.clear();
          await db.demoLocationVisits.clear();
          await db.demoExpenses.clear();
          await db.demoSales.clear();
          await db.demoExercises.clear();
          await db.demoOnboardingDrafts.clear();

          if (raw.clients.length)
            await db.demoClients.bulkPut(raw.clients as Parameters<typeof db.demoClients.bulkPut>[0]);
          if (raw.trainerClients.length)
            await db.demoTrainerClients.bulkPut(raw.trainerClients as Parameters<typeof db.demoTrainerClients.bulkPut>[0]);
          if (raw.metrics.length)
            await db.demoMetrics.bulkPut(raw.metrics as Parameters<typeof db.demoMetrics.bulkPut>[0]);
          if (raw.routines.length)
            await db.demoRoutines.bulkPut(raw.routines as Parameters<typeof db.demoRoutines.bulkPut>[0]);
          if (raw.assignedRoutines.length)
            await db.demoAssignedRoutines.bulkPut(raw.assignedRoutines as Parameters<typeof db.demoAssignedRoutines.bulkPut>[0]);
          if (raw.sessions.length)
            await db.demoSessions.bulkPut(raw.sessions as Parameters<typeof db.demoSessions.bulkPut>[0]);
          if (raw.locations.length)
            await db.demoLocations.bulkPut(raw.locations as Parameters<typeof db.demoLocations.bulkPut>[0]);
          if (raw.locationVisits.length)
            await db.demoLocationVisits.bulkPut(raw.locationVisits as Parameters<typeof db.demoLocationVisits.bulkPut>[0]);
          if (raw.expenses.length)
            await db.demoExpenses.bulkPut(raw.expenses as Parameters<typeof db.demoExpenses.bulkPut>[0]);
          if (raw.sales.length)
            await db.demoSales.bulkPut(raw.sales as Parameters<typeof db.demoSales.bulkPut>[0]);
          if (raw.exercises.length)
            await db.demoExercises.bulkPut(raw.exercises as Parameters<typeof db.demoExercises.bulkPut>[0]);
          if (raw.onboardingDrafts.length)
            await db.demoOnboardingDrafts.bulkPut(raw.onboardingDrafts as Parameters<typeof db.demoOnboardingDrafts.bulkPut>[0]);
        },
      );

      toast.success("Datos importados correctamente.");
      setTimeout(() => router.refresh(), 500);
    } catch (err) {
      toast.error(
        "Error al importar: " +
          (err instanceof Error ? err.message : "archivo invalido"),
      );
    } finally {
      setImporting(false);
      // Reset so the same file can be re-selected
      event.target.value = "";
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Ajustes"
        description="Configura tu cuenta y la integracion con Gemini."
      />

      {/* Demo mode banner */}
      <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">
            Modo demo activo
          </p>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Tus datos se guardan unicamente en este navegador (IndexedDB). Si
            limpias el cache del navegador, perderas los cambios.
          </p>
        </div>
      </div>

      {/* ── Branding ────────────────────────────────────────────────────────── */}
      <BrandingSection />

      {/* ── AI Integration ─────────────────────────────────────────────────── */}
      <Section icon={Sparkles} label="Integracion con IA">
        <p className="text-xs text-[#71717A]">
          Tu clave de Gemini permite extraer datos de fotos (báscula, medidas,
          cédula). Se guarda localmente en tu navegador y nunca sale de tu equipo.
        </p>

        {/* ── Key saved state: badge + actions ──────────────────────────── */}
        {keySaved && !editingKey && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/5 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FAFAFA]">
                  API key configurada
                </p>
                <p className="text-xs text-[#71717A]">
                  La clave está guardada de forma segura en este navegador.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTestKey}
                disabled={testing}
                size="sm"
                className="bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Probar conexión
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditing}
                className="border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Cambiar clave
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteKey}
                className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}

        {/* ── Editing / first-time state: input to enter key ────────────── */}
        {editingKey && (
          <div className="space-y-3">
            {keySaved && (
              <div className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <p className="text-xs text-[#F59E0B]">
                  Ingresá la nueva clave. Al guardar se reemplazará la anterior.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-xs text-[#A1A1AA]">
                {keySaved ? "Nueva API Key de Gemini" : "API Key de Gemini"}
              </Label>
              <Input
                id="api-key"
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
                className="bg-[#09090B] border-[#3F3F46] focus:border-brand-primary font-mono text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveKey}
                disabled={!newKey.trim()}
                size="sm"
                className="bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Guardar clave
              </Button>
              {keySaved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditing}
                  className="border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  Cancelar
                </Button>
              )}
            </div>

            <div className="rounded-md bg-brand-primary/5 border border-brand-primary/20 p-3 text-xs text-[#A1A1AA] space-y-1">
              <p>
                La clave es gratuita. Cada extracción de foto consume ~500 tokens
                en tu cuota de Gemini.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-primary hover:underline"
              >
                Obtené tu clave en Google AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* ── Image vision test (only when key is saved) ────────────────── */}
        {keySaved && !editingKey && (
          <div className="rounded-md border border-[#3F3F46] bg-[#09090B] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[#A1A1AA] shrink-0" />
              <span className="text-xs font-semibold text-[#FAFAFA]">
                Probar con imagen
              </span>
            </div>
            <p className="text-xs text-[#71717A]">
              Subí una foto y Gemini la analizará. Sirve para confirmar que la
              clave funciona con visión.
            </p>

            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelected}
              disabled={imgTesting}
              className="hidden"
              aria-label="Seleccionar imagen para probar"
            />
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={imgTesting}
              className="w-full min-h-[44px] rounded-md border border-dashed border-[#3F3F46] bg-[#18181B] hover:border-brand-primary hover:bg-brand-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1.5 px-4 py-3"
            >
              {imgPreview ? (
                <span className="text-xs text-[#A1A1AA]">
                  {imgFile?.name ?? "imagen seleccionada"} — click para cambiar
                </span>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-[#52525B]" />
                  <span className="text-xs text-[#71717A]">
                    Seleccioná una imagen (máx. 5 MB)
                  </span>
                </>
              )}
            </button>

            {imgPreview && (
              <div className="space-y-3">
                <div className="rounded-md overflow-hidden border border-[#27272A] bg-[#18181B] flex items-center justify-center max-h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgPreview}
                    alt="Vista previa"
                    className="max-h-48 w-auto object-contain"
                  />
                </div>
                <Button
                  onClick={handleImageTest}
                  disabled={imgTesting}
                  size="sm"
                  className="bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50 min-h-[44px]"
                >
                  {imgTesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {imgTesting ? "Analizando..." : "Analizar con Gemini"}
                </Button>
              </div>
            )}

            {imgResult && (
              <div className="rounded-md border border-[#3F3F46] bg-[#18181B] p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  Respuesta de Gemini
                </p>
                <p className="text-sm text-[#FAFAFA] leading-relaxed">{imgResult}</p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Demo Data ──────────────────────────────────────────────────────── */}
      <Section icon={Database} label="Datos demo">
        <p className="text-xs text-[#71717A]">
          Maneja los datos de ejemplo guardados localmente. Podes exportarlos
          como JSON para compartirlos, o reiniciarlos al estado original.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleResetDemo}
            disabled={resetting}
            variant="outline"
            size="sm"
            className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Reiniciar datos demo
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A]"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar datos (JSON)
          </Button>

          {/* Hidden file input driven by a styled label-button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
            aria-label="Importar archivo JSON"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Importar datos (JSON)
          </Button>
        </div>
      </Section>

      {/* ── Trainer Profile ────────────────────────────────────────────────── */}
      <Section icon={User} label="Perfil del entrenador">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-[#27272A] pb-2">
            <span className="text-[#71717A]">Nombre</span>
            <span className="text-[#FAFAFA]">Coach Demo</span>
          </div>
          <div className="flex justify-between border-b border-[#27272A] pb-2">
            <span className="text-[#71717A]">Email</span>
            <span className="text-[#FAFAFA] font-mono text-xs">
              demo@blacklinefitness.app
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Rol</span>
            <span className="text-[#FAFAFA]">Entrenador</span>
          </div>
        </div>
        <p className="text-xs text-[#52525B] italic pt-2 border-t border-[#27272A]">
          En la version de produccion, podrias editar tu perfil profesional
          desde aca.
        </p>
      </Section>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <Section icon={Info} label="Acerca de">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Version</span>
            <span className="text-[#FAFAFA]">Demo v1.0</span>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
        >
          Ver codigo en GitHub
          <ExternalLink className="h-3 w-3" />
        </a>
      </Section>
    </div>
  );
}
