"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, CreditCard, Dumbbell, Heart, Ruler, Camera, Banknote, CheckSquare, Pencil } from "lucide-react";
import { toast } from "sonner";

import { createClientFromOnboarding } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";

import { Button } from "@/components/ui/button";

interface Step9ReviewProps {
  draftId: string;
  trainerId: string;
}

const GOAL_LABELS: Record<string, string> = {
  FAT_LOSS: "Bajar de peso",
  MUSCLE_GAIN: "Ganar musculo",
  MAINTENANCE: "Mantenimiento",
  PERFORMANCE: "Rendimiento",
  GENERAL_HEALTH: "Salud general",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
  PREFER_NOT_SAY: "Sin especificar",
};

const PARQ_LABELS: Record<string, string> = {
  GREEN: "Sin restricciones",
  REVIEW: "Revision medica recomendada",
  RED: "Requiere autorizacion medica",
  NOT_COMPLETED: "No completado",
};

const PARQ_COLORS: Record<string, string> = {
  GREEN: "text-[#22C55E]",
  REVIEW: "text-[#F59E0B]",
  RED: "text-[#EF4444]",
  NOT_COMPLETED: "text-[#71717A]",
};

function ReviewCard({
  title,
  icon: Icon,
  step,
  children,
  onEdit,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  step: number;
  children: React.ReactNode;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#FAFAFA]">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#3B82F6] transition-colors"
          aria-label={`Editar ${title}`}
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
      </div>
      <div className="text-sm text-[#A1A1AA] space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[#71717A]">{label}</span>
      <span className="text-right text-[#FAFAFA] font-medium">{value}</span>
    </div>
  );
}

export function Step9Review({ draftId, trainerId }: Step9ReviewProps) {
  const router = useRouter();
  const { goBack, goToStep, payload, reset } = useOnboardingStore();
  const [creating, setCreating] = useState(false);

  const s1 = payload.step1;
  const s2 = payload.step2;
  const s3 = payload.step3;
  const s4 = payload.step4;
  const s5 = payload.step5;
  const s6 = payload.step6;
  const s7 = payload.step7;
  const s8 = payload.step8;

  // Minimum required steps before creation
  const canCreate = s1 && s4 && s5 && s7 && s8;

  async function handleCreate() {
    if (!canCreate) {
      toast.error("Faltan datos obligatorios. Completa los pasos 1, 4, 5, 7 y 8.");
      return;
    }
    setCreating(true);
    try {
      const result = await createClientFromOnboarding(draftId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      reset();
      toast.success("Cliente creado exitosamente.");
      router.push(`/trainer/clientes/${result.value.clientUserId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#71717A]">
        Revisa la informacion antes de crear el cliente. Podes editar cualquier
        seccion tocando "Editar".
      </div>

      {/* Step 1 */}
      {s1 ? (
        <ReviewCard title="Datos basicos" icon={User} step={1} onEdit={goToStep}>
          <Row label="Nombre" value={s1.name} />
          <Row label="Email" value={s1.email} />
          <Row label="Telefono" value={s1.phone} />
          <Row label="Fecha nac." value={s1.dateOfBirth} />
          <Row label="Genero" value={s1.gender ? GENDER_LABELS[s1.gender] : undefined} />
          <Row label="Canton" value={s1.locationCity} />
        </ReviewCard>
      ) : (
        <MissingCard title="Datos basicos" step={1} onEdit={goToStep} />
      )}

      {/* Step 2 */}
      {s2 && !s2.skipped && s2.extracted?.approved && (
        <ReviewCard title="Cedula" icon={CreditCard} step={2} onEdit={goToStep}>
          <Row label="Nombre extraido" value={s2.extracted.fullName} />
          <Row label="Numero" value={s2.extracted.idNumber} />
          <Row label="Fecha nac." value={s2.extracted.dateOfBirth} />
        </ReviewCard>
      )}

      {/* Step 3 */}
      {s3 && !s3.skipped && s3.workoutPhotoKeys.length > 0 && (
        <ReviewCard title="Experiencia" icon={Dumbbell} step={3} onEdit={goToStep}>
          <Row
            label="Fotos subidas"
            value={`${s3.workoutPhotoKeys.length} foto(s)`}
          />
        </ReviewCard>
      )}

      {/* Step 4 */}
      {s4 ? (
        <ReviewCard title="Cuestionario" icon={Heart} step={4} onEdit={goToStep}>
          <Row label="Objetivo" value={s4.goal ? GOAL_LABELS[s4.goal] : undefined} />
          <Row label="Dias/semana" value={s4.trainingDaysPerWeek?.toString()} />
          <Row
            label="PAR-Q"
            value={s4.parqStatus ? PARQ_LABELS[s4.parqStatus] : undefined}
          />
          {s4.parqStatus && (
            <span className={`text-xs font-medium ${PARQ_COLORS[s4.parqStatus] ?? ""}`}>
              {PARQ_LABELS[s4.parqStatus]}
            </span>
          )}
        </ReviewCard>
      ) : (
        <MissingCard title="Cuestionario" step={4} onEdit={goToStep} />
      )}

      {/* Step 5 */}
      {s5 ? (
        <ReviewCard title="Antropometria" icon={Ruler} step={5} onEdit={goToStep}>
          <Row label="Altura" value={s5.heightCm ? `${s5.heightCm} cm` : undefined} />
          <Row label="Peso" value={s5.weightKg ? `${s5.weightKg} kg` : undefined} />
          {s5.bodyFatPct && <Row label="% Grasa" value={`${s5.bodyFatPct}%`} />}
          {s5.muscleMassKg && <Row label="Masa muscular" value={`${s5.muscleMassKg} kg`} />}
          {s5.waistCm && <Row label="Cintura" value={`${s5.waistCm} cm`} />}
          {s5.hipCm && <Row label="Cadera" value={`${s5.hipCm} cm`} />}
        </ReviewCard>
      ) : (
        <MissingCard title="Antropometria" step={5} onEdit={goToStep} />
      )}

      {/* Step 6 */}
      {s6 && !s6.skipped && (s6.frontPhotoKey || s6.sidePhotoKey || s6.backPhotoKey) && (
        <ReviewCard title="Fotos iniciales" icon={Camera} step={6} onEdit={goToStep}>
          <Row label="Frente" value={s6.frontPhotoKey ? "Subida" : undefined} />
          <Row label="Perfil" value={s6.sidePhotoKey ? "Subida" : undefined} />
          <Row label="Espalda" value={s6.backPhotoKey ? "Subida" : undefined} />
        </ReviewCard>
      )}

      {/* Step 7 */}
      {s7 ? (
        <ReviewCard title="Plan y precio" icon={Banknote} step={7} onEdit={goToStep}>
          <Row
            label="Mensualidad"
            value={s7.monthlyPriceCRC
              ? `₡${s7.monthlyPriceCRC.toLocaleString("es-CR")}`
              : undefined}
          />
          {s7.notes && <Row label="Notas" value={s7.notes} />}
        </ReviewCard>
      ) : (
        <MissingCard title="Plan y precio" step={7} onEdit={goToStep} />
      )}

      {/* Step 8 */}
      {s8 ? (
        <ReviewCard title="Consentimientos" icon={CheckSquare} step={8} onEdit={goToStep}>
          <Row label="Terminos" value={s8.consentTerms ? "Aceptado" : "Pendiente"} />
          <Row label="Datos de salud" value={s8.consentHealthData ? "Aceptado" : "Pendiente"} />
          <Row label="Procesamiento IA" value={s8.consentAiProcessing ? "Aceptado" : "No aplica"} />
          {s8.consentMarketing && <Row label="Marketing" value="Aceptado" />}
        </ReviewCard>
      ) : (
        <MissingCard title="Consentimientos" step={8} onEdit={goToStep} />
      )}

      {/* CTA */}
      <div className="pt-2 space-y-3">
        {!canCreate && (
          <p className="text-sm text-center text-[#F59E0B]">
            Completá los pasos marcados antes de crear el cliente.
          </p>
        )}

        <Button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate || creating}
          className="w-full h-14 text-base font-bold"
        >
          {creating && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {creating ? "Creando cliente..." : "Crear cliente"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="w-full"
          disabled={creating}
        >
          Atras
        </Button>
      </div>
    </div>
  );
}

function MissingCard({
  title,
  step,
  onEdit,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(step)}
      className="w-full rounded-xl border border-dashed border-[#EF4444]/40 bg-[#450A0A]/20 p-4 text-left transition-colors hover:border-[#EF4444]/60"
    >
      <p className="text-sm font-semibold text-[#EF4444]">{title}</p>
      <p className="text-xs text-[#71717A] mt-0.5">
        Pendiente — toca para completar
      </p>
    </button>
  );
}
