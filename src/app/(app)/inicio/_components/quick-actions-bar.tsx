import Link from "next/link";
import { Dumbbell, UserPlus, Library } from "lucide-react";

interface QuickActionProps {
  href: string;
  icon: React.ElementType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
}

function QuickAction({ href, icon: Icon, label }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-[#3F3F46] bg-[#18181B] px-4 py-2 text-sm font-medium text-[#A1A1AA] transition-all duration-200 hover:border-brand-primary/40 hover:bg-brand-primary/8 hover:text-brand-primary min-h-[36px]"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function QuickActionsBar() {
  return (
    <div role="group" aria-label="Acciones rápidas">
      <div className="flex flex-wrap gap-2">
        <QuickAction
          href="/trainer/rutinas/nueva"
          icon={Dumbbell}
          label="Nueva rutina"
        />
        <QuickAction
          href="/trainer/clientes/invitar"
          icon={UserPlus}
          label="Invitar cliente"
        />
        <QuickAction
          href="/trainer/ejercicios"
          icon={Library}
          label="Biblioteca"
        />
      </div>
    </div>
  );
}
