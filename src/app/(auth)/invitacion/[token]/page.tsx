import Link from "next/link";
import { UserPlus, AlertTriangle } from "lucide-react";
import { validateInvitationToken } from "@/app/actions/clients";
import type { Metadata } from "next";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface InvitacionPageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Invitación a Blackline Fitness",
};

export default async function InvitacionPage({ params }: InvitacionPageProps) {
  const { token } = await params;

  const result = await validateInvitationToken({ token });

  if (!result.ok) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#450A0A]">
          <AlertTriangle className="h-7 w-7 text-[#EF4444]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#FAFAFA]">
          Invitación inválida
        </h1>
        <p className="text-sm text-[#A1A1AA] text-balance">
          Este link ya fue usado, expiró o no es válido. Pedile a tu entrenador
          que te genere uno nuevo.
        </p>
        <Link
          href="/"
          className="text-sm text-[#3B82F6] hover:text-[#2563EB] transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    );
  }

  const { trainerName } = result.value;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/10">
        <UserPlus className="h-7 w-7 text-[#3B82F6]" aria-hidden="true" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#FAFAFA]">
          Te invitó {trainerName}
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Aceptá la invitación para unirte a Blackline Fitness y empezar a trabajar con tu
          entrenador.
        </p>
      </div>

      <Link
        href={`/registrarse?token=${token}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-[#2563EB] transition-colors"
      >
        Aceptar invitación
      </Link>

      <p className="text-xs text-[#71717A]">
        Ya tenés cuenta?{" "}
        <Link
          href={`/ingresar?token=${token}`}
          className="text-[#3B82F6] hover:text-[#2563EB]"
        >
          Ingresá y aceptá.
        </Link>
      </p>
    </div>
  );
}
