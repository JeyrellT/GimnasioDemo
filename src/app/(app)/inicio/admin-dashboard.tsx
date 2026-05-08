import Link from "next/link";
import { Users, Activity, Database, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de administración"
        description="Vizion — métricas y gestión de la plataforma."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Usuarios", href: "/admin/usuarios", icon: Users, description: "Gestionar cuentas" },
          { label: "Biblioteca", href: "/admin/biblioteca", icon: Database, description: "Ejercicios públicos" },
          { label: "LPDP", href: "/admin/lpdp", icon: FileText, description: "Solicitudes de datos" },
          { label: "Métricas", href: "/admin", icon: Activity, description: "MAU, DAU, sesiones" },
        ].map(({ label, href, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 hover:bg-[#27272A] transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#27272A]">
              <Icon className="h-5 w-5 text-[#A1A1AA]" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-[#FAFAFA]">{label}</p>
              <p className="text-sm text-[#71717A]">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
