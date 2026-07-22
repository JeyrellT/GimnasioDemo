import { Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { getAdminMirrorDirectory } from "@/server/actions/admin.actions";
import { MirrorDirectory } from "../_components/mirror-directory";

export default async function AdminMirrorPage() {
  const result = await getAdminMirrorDirectory();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        No se pudo cargar la vista espejo: {result.error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vista espejo"
        description="Revisá la plataforma exactamente desde la perspectiva de un coach o cliente."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-2 text-xs text-[#F59E0B]">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Sesión auditada · 30 min
          </div>
        }
      />

      <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-sm text-[#A1A1AA]">
        Al abrir un espejo, aparecerá una franja roja permanente con la identidad observada y el botón para volver a Super Admin. Cualquier cambio que hagás dentro del espejo se aplicará a esa cuenta.
      </div>

      <MirrorDirectory
        trainers={result.value.trainers}
        clients={result.value.clients}
      />
    </div>
  );
}
