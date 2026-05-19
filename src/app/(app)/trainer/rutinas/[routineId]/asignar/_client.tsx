"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { assignRoutineToClient } from "@/app/actions/routines";
import { assignRoutineSchema, type AssignRoutineInput } from "@/lib/validation/routine.schema";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { useQuery } from "@tanstack/react-query";
import { listMyClients } from "@/app/actions/clients";
import { ArrowRight } from "lucide-react";

interface Props {
  routineId: string;
}

export default function AsignarClient({ routineId }: Props) {
  const router = useRouter();

  // Load trainer's clients for the selector
  const { data: clientsData } = useQuery({
    queryKey: ["trainer-clients"],
    queryFn: async () => {
      const result = await listMyClients();
      return result.ok ? result.value.clients : [];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssignRoutineInput>({
    resolver: zodResolver(assignRoutineSchema),
    defaultValues: {
      routineTemplateId: routineId,
      startsOn: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(data: AssignRoutineInput) {
    // Normalize: empty strings → undefined (Zod .optional() rejects "")
    const payload = {
      ...data,
      endsOn: data.endsOn?.trim() ? data.endsOn : undefined,
      trainerNotes: data.trainerNotes?.trim() || undefined,
    };

    const result = await assignRoutineToClient(payload);
    if (result.ok) {
      toast.success("Rutina asignada.");
      router.push("/trainer/rutinas");
    } else {
      toast.error(result.error.message ?? "No se pudo asignar la rutina.");
      console.error("[asignar]", result.error);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Asignar rutina" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <input type="hidden" {...register("routineTemplateId")} />

        {/* Client selector */}
        <div className="space-y-1.5">
          <label htmlFor="clientId" className="block text-sm font-medium text-[#FAFAFA]">
            Cliente
          </label>
          <select
            id="clientId"
            {...register("clientId")}
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
          >
            <option value="">Seleccioná un cliente...</option>
            {clientsData?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <p role="alert" className="text-xs text-[#EF4444]">
              {errors.clientId.message}
            </p>
          )}
        </div>

        {/* Start date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="startsOn" className="block text-sm font-medium text-[#FAFAFA]">
              Fecha de inicio
            </label>
            <input
              id="startsOn"
              type="date"
              {...register("startsOn")}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endsOn" className="block text-sm font-medium text-[#FAFAFA]">
              Fecha de fin{" "}
              <span className="text-[#71717A]">(opcional)</span>
            </label>
            <input
              id="endsOn"
              type="date"
              {...register("endsOn")}
              className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "Asignando..." : "Asignar rutina"}
          {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
