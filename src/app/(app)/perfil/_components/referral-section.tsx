"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2, Send } from "lucide-react";
import {
  createReferral,
  getMyReferrals,
} from "@/server/actions/referral.actions";

type ReferralStatus = "PENDING" | "APPROVED" | "REGISTERED" | "REJECTED";

interface ReferralItem {
  id: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string | null;
  status: ReferralStatus;
  note: string | null;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

const STATUS_META: Record<ReferralStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-[#F59E0B]/15 text-[#F59E0B]" },
  APPROVED: { label: "Aprobada", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  REGISTERED: { label: "Registrado", className: "bg-[#3B82F6]/15 text-[#3B82F6]" },
  REJECTED: { label: "Rechazada", className: "bg-[#EF4444]/15 text-[#EF4444]" },
};

function StatusBadge({ status }: { status: ReferralStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(d);
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  note: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", phone: "", note: "" };

export default function ReferralSection() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyReferrals().then((res) => {
      if (res.ok) setReferrals(res.value);
      setLoaded(true);
    });
  }, []);

  function setField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) {
      toast.error("El nombre y el email son obligatorios.");
      return;
    }
    startTransition(async () => {
      const result = await createReferral({
        referredName: name,
        referredEmail: email,
        referredPhone: form.phone.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo enviar la referencia.");
        return;
      }
      toast.success("Referencia enviada correctamente.");
      setForm(EMPTY_FORM);
      const listResult = await getMyReferrals();
      if (listResult.ok) setReferrals(listResult.value);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF6A1A]/15">
          <UserPlus className="h-4 w-4 text-[#FF6A1A]" aria-hidden="true" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Referir un nuevo coach
        </h2>
      </div>

      <p className="text-xs text-[#71717A]">
        Referí a un colega entrenador. Tu referencia será revisada por el equipo de Blackline Fitness.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ref-name" className="block text-xs font-medium text-[#A1A1AA]">
            Nombre completo <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="ref-name"
            type="text"
            required
            autoComplete="off"
            value={form.name}
            onChange={setField("name")}
            placeholder="Nombre del entrenador referido"
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ref-email" className="block text-xs font-medium text-[#A1A1AA]">
            Email <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="ref-email"
            type="email"
            required
            autoComplete="off"
            value={form.email}
            onChange={setField("email")}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ref-phone" className="block text-xs font-medium text-[#A1A1AA]">
            Teléfono <span className="text-[#52525B] font-normal">(opcional)</span>
          </label>
          <input
            id="ref-phone"
            type="tel"
            autoComplete="off"
            value={form.phone}
            onChange={setField("phone")}
            placeholder="8888-0000"
            className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ref-note" className="block text-xs font-medium text-[#A1A1AA]">
            Nota <span className="text-[#52525B] font-normal">(opcional)</span>
          </label>
          <textarea
            id="ref-note"
            rows={3}
            value={form.note}
            onChange={setField("note")}
            placeholder="¿Por qué recomendás a esta persona?"
            className="w-full resize-none rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:border-[#FF6A1A] focus:outline-none focus:ring-1 focus:ring-[#FF6A1A]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A0E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "Enviando..." : "Enviar referencia"}
        </button>
      </form>

      {loaded && referrals.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#27272A]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
            Mis referencias
          </h3>
          <ul className="space-y-2">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-[#3F3F46]/50 bg-[#27272A]/50 px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-xs font-medium text-[#FAFAFA]">{r.referredName}</p>
                  <p className="truncate text-[11px] text-[#71717A]">{r.referredEmail}</p>
                  {r.adminNote && (
                    <p className="text-[11px] text-[#A1A1AA] mt-1 italic line-clamp-2">
                      Nota admin: {r.adminNote}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={r.status} />
                  <span className="text-[10px] text-[#52525B] whitespace-nowrap">
                    {formatShortDate(r.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loaded && referrals.length === 0 && (
        <p className="text-xs text-[#52525B] pt-2 border-t border-[#27272A]">
          Todavía no enviaste ninguna referencia.
        </p>
      )}
    </section>
  );
}
