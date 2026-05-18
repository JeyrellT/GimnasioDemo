"use client";

// =============================================================================
// BLACKLINE FITNESS — FinanceFAB
// Mobile-only floating action button (sm:hidden) for quick-add of expense,
// sale, or visit. Opens a Dialog with the corresponding form inside.
// Data is passed in from the layout to avoid re-fetching on each open.
// =============================================================================

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, TrendingDown, TrendingUp, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import { SaleForm } from "./sale-form";
import { VisitForm, type VisitLocation } from "./visit-form";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveForm = "expense" | "sale" | "visit";

export interface FinanceFABProps {
  locations: Array<{ id: string; name: string }>;
  visitLocations: VisitLocation[];
  clients: Array<{ id: string; name: string }>;
}

// ── Sub-button ────────────────────────────────────────────────────────────────

interface FABButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}

function FABButton({ label, icon, onClick, delay = 0 }: FABButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.85 }}
      transition={{ duration: 0.18, delay }}
      className="flex items-center gap-2 justify-end"
    >
      <span className="rounded-lg bg-[#18181B] border border-[#3F3F46] px-2.5 py-1 text-xs font-medium text-[#FAFAFA] shadow-md whitespace-nowrap">
        {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#18181B] border border-[#3F3F46] text-[#FAFAFA] shadow-lg hover:border-[#FF6A1A] hover:text-[#FF6A1A] transition-colors"
        aria-label={label}
      >
        {icon}
      </button>
    </motion.div>
  );
}

// ── Form title map ─────────────────────────────────────────────────────────────

const FORM_TITLES: Record<ActiveForm, string> = {
  expense: "Registrar gasto",
  sale:    "Registrar venta",
  visit:   "Registrar visita",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceFAB({ locations, visitLocations, clients }: FinanceFABProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);

  function openForm(form: ActiveForm) {
    setMenuOpen(false);
    setActiveForm(form);
  }

  function closeForm() {
    setActiveForm(null);
  }

  return (
    <>
      {/* Quick action menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed bottom-36 right-4 z-50 flex flex-col gap-2.5 sm:hidden"
            aria-label="Acciones rápidas de finanzas"
          >
            <FABButton
              label="Visita"
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              onClick={() => openForm("visit")}
              delay={0.05}
            />
            <FABButton
              label="Venta"
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              onClick={() => openForm("sale")}
              delay={0.025}
            />
            <FABButton
              label="Gasto"
              icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
              onClick={() => openForm("expense")}
              delay={0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        animate={{ rotate: menuOpen ? 45 : 0 }}
        transition={{ duration: 0.18 }}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6A1A] text-white shadow-lg shadow-[#FF6A1A]/40 hover:bg-[#E55A0E] active:scale-95 transition-colors sm:hidden"
        aria-label={menuOpen ? "Cerrar menú de acciones" : "Abrir menú de acciones"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Plus className="h-6 w-6" aria-hidden="true" />
        )}
      </motion.button>

      {/* Form dialogs */}
      <Dialog
        open={activeForm !== null}
        onOpenChange={(open) => { if (!open) closeForm(); }}
      >
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeForm ? FORM_TITLES[activeForm] : ""}
            </DialogTitle>
          </DialogHeader>

          {activeForm === "expense" && (
            <ExpenseForm
              locations={locations}
              onSuccess={closeForm}
              onCancel={closeForm}
            />
          )}

          {activeForm === "sale" && (
            <SaleForm
              clients={clients}
              onSuccess={closeForm}
              onCancel={closeForm}
            />
          )}

          {activeForm === "visit" && (
            <VisitForm
              locations={visitLocations}
              onSuccess={closeForm}
              onCancel={closeForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
