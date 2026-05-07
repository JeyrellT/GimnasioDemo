import { requireClient } from "@/lib/auth/guards";
import { AntropometriaFormWrapper } from "./antropometria-form-wrapper";

export default async function AntropometriaPage() {
  const client = await requireClient() as { dateOfBirth?: Date | string | null } | null;

  const ageYears = client?.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(client.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : 25;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Tus medidas</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Estas medidas nos permiten calcular tu metabolismo basal y diseñar
          mejor tu rutina. Podés actualizarlas cuando quieras.
        </p>
      </div>
      <AntropometriaFormWrapper ageYears={ageYears} />
    </div>
  );
}
