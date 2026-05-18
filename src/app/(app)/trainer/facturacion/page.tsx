import { requireTrainer } from "@/server/guards";
import { getMyTrainerInvoices } from "@/app/actions/billing";
import { formatCRC, formatDateCR } from "@/lib/utils";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facturación" };

export default async function FacturacionPage() {
  await requireTrainer();
  const invoices = await getMyTrainerInvoices();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Facturación</h1>

      <div className="rounded-xl border border-[#F59E0B]/30 bg-[#451A03] px-4 py-3">
        <p className="text-sm text-[#FDE68A]">
          Procesamiento de pagos en sandbox. Los cobros se registran pero no se procesan hasta que activés{" "}
          <code className="font-mono text-xs">PAYMENT_PROVIDER_LIVE=true</code>.
        </p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin cobros registrados"
          description="Los cobros a tus clientes aparecerán aquí."
        />
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.invoiceId}
              className="rounded-xl border border-[#3F3F46] bg-[#18181B] px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[#FAFAFA]">
                  {inv.clientName ?? "Cliente"}
                </p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {formatDateCR(inv.periodStart, "d MMM")} – {formatDateCR(inv.periodEnd, "d MMM yyyy")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular text-[#FAFAFA]">
                  {formatCRC(inv.amountCRC)}
                </p>
                <span
                  className={
                    inv.chargeStatus === "PAID"
                      ? "text-xs text-[#22C55E]"
                      : inv.chargeStatus === "OVERDUE"
                        ? "text-xs text-[#EF4444]"
                        : "text-xs text-[#F59E0B]"
                  }
                >
                  {inv.chargeStatus === "PAID" ? "Pagado" : inv.chargeStatus === "OVERDUE" ? "Vencido" : "Pendiente"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
