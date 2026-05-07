"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";

import {
  getGeminiKey,
  setGeminiKey,
  clearGeminiKey,
} from "@/lib/demo/settings-store";
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
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF6A1A]/15">
          <Icon className="h-4 w-4 text-[#FF6A1A]" />
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
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  // --- Demo data state ---
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted key on mount
  useEffect(() => {
    const stored = getGeminiKey();
    if (stored) setApiKeyState(stored);
  }, []);

  // Auto-save with 500 ms debounce
  useEffect(() => {
    if (!apiKey) {
      clearGeminiKey();
      return;
    }
    const timer = setTimeout(() => {
      setGeminiKey(apiKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [apiKey]);

  // -------------------------------------------------------------------------
  // Gemini handlers
  // -------------------------------------------------------------------------

  const handleTestKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Ingresá una API key primero.");
      return;
    }

    setGeminiKey(trimmed);
    setTesting(true);

    try {
      // Dynamic import so the page doesn't crash if Agent 4's file isn't
      // present yet. The import itself may throw if the module is absent.
      const mod = await import("@/lib/demo/gemini-browser");
      const result = await mod.pingGeminiKey();

      if (result.ok) {
        toast.success("API key valida. La IA esta lista para usar.");
      } else {
        const msg =
          result.error instanceof Error
            ? result.error.message
            : String(result.error ?? "Error al validar la clave.");
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "modulo de IA no disponible aun.";
      toast.error("Error al probar la clave: " + msg);
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = () => {
    if (!confirm("Estas seguro de eliminar tu API key?")) return;
    clearGeminiKey();
    setApiKeyState("");
    toast.success("API key eliminada.");
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
      anchor.download = `forja-demo-${new Date().toISOString().slice(0, 10)}.json`;
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
      <div className="rounded-xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#FF6A1A] shrink-0 mt-0.5" />
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

      {/* ── AI Integration ─────────────────────────────────────────────────── */}
      <Section icon={Sparkles} label="Integracion con IA">
        <p className="text-xs text-[#71717A]">
          Las extracciones de cedula y analisis de fotos de entrenamientos usan
          tu clave de Gemini directamente desde el navegador. La clave nunca
          sale de tu equipo.
        </p>

        <div className="space-y-2">
          <Label htmlFor="api-key" className="text-xs text-[#A1A1AA]">
            API Key de Gemini
          </Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="AIzaSy..."
              className="pr-10 bg-[#09090B] border-[#3F3F46] focus:border-[#FF6A1A] font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleTestKey}
            disabled={testing || !apiKey.trim()}
            size="sm"
            className="bg-[#FF6A1A] hover:bg-[#E55A0E] text-white disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Probar clave
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearKey}
            disabled={!apiKey}
            className="border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-50"
          >
            Limpiar
          </Button>
        </div>

        <div className="rounded-md bg-[#FF6A1A]/5 border border-[#FF6A1A]/20 p-3 text-xs text-[#A1A1AA] space-y-1">
          <p>
            Cada extraccion de cedula consume aproximadamente 500 tokens en tu
            cuota de Gemini.
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#FF6A1A] hover:underline"
          >
            Obtene tu clave gratuita en Google AI Studio
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
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
              demo@forja.app
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
          className="inline-flex items-center gap-1 text-xs text-[#FF6A1A] hover:underline"
        >
          Ver codigo en GitHub
          <ExternalLink className="h-3 w-3" />
        </a>
      </Section>
    </div>
  );
}
