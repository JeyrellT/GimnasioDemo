import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes Blackline Fitness para entrenadores en Costa Rica. Solo ₡8,900, Pro ₡22,900 y Studio ₡44,900 mensuales con IVA incluido.",
};

const plans = [
  {
    tier: "Solo",
    price: "₡8,900",
    description: "Para entrenadores que están empezando.",
    clients: "Hasta 5 clientes",
    highlight: false,
    features: [
      "Biblioteca completa de ejercicios",
      "Constructor de rutinas",
      "Ejecución de sesiones offline",
      "Métricas de progreso",
      "Facturación básica",
    ],
    notIncluded: ["Analytics avanzado", "Exports PDF", "Soporte prioritario"],
  },
  {
    tier: "Pro",
    price: "₡22,900",
    description: "El plan para entrenadores que crecen.",
    clients: "Hasta 25 clientes",
    highlight: true,
    features: [
      "Todo de Solo",
      "Analytics avanzado por cliente",
      "Exports PDF (rutinas impresas)",
      "Soporte prioritario",
      "Historial completo de sesiones",
    ],
    notIncluded: ["Co-administración", "IA asistente (próximamente)"],
  },
  {
    tier: "Studio",
    price: "₡44,900",
    description: "Para estudio o entrenadores senior.",
    clients: "Hasta 60 clientes",
    highlight: false,
    features: [
      "Todo de Pro",
      "Co-administración (asistente)",
      "Branding personalizado",
      "IA asistente para entrenador (próximamente)",
      "Cuenta dedicada",
    ],
    notIncluded: [],
  },
] as const;

const faqs = [
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí. Podés subir o bajar de plan en cualquier momento. El cambio aplica al siguiente período de facturación.",
  },
  {
    q: "¿Los precios incluyen IVA?",
    a: "Sí. Todos los precios mostrados incluyen IVA 13% según la ley costarricense.",
  },
  {
    q: "¿Qué pasa si supero el límite de clientes?",
    a: "Podés seguir viendo los clientes existentes pero no invitar nuevos hasta que subas de plan o liberes un espacio.",
  },
  {
    q: "¿Qué pasa cuando termina el trial?",
    a: "Tu cuenta pasa a modo lectura por 14 días. Podés ver todo pero no crear ni editar. Después, soft-suspensión hasta que activés un plan.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí, sin penalización. Tu acceso continúa hasta el final del período pagado.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-[#FAFAFA] sm:text-4xl">
          Precios
        </h1>
        <p className="mt-3 text-[#A1A1AA]">
          30 días gratis en cualquier plan. Sin tarjeta requerida.
          <br />
          Precios con IVA incluido.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-3 mb-20">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlight
                ? "border-[#3B82F6] bg-[#3B82F6]/5"
                : "border-[#3F3F46] bg-[#18181B]"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3B82F6] px-3 py-0.5 text-xs font-semibold text-white">
                Más popular
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-[#FAFAFA]">{plan.tier}</h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold tabular text-[#FAFAFA]">
                  {plan.price}
                </span>
                <span className="text-sm text-[#71717A]">/mes</span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#A1A1AA]">
                {plan.clients}
              </p>
            </div>

            <Link
              href="/registrarse"
              className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-colors min-h-[44px] flex items-center justify-center ${
                plan.highlight
                  ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                  : "border border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A]"
              }`}
            >
              Empezar gratis
            </Link>

            <ul className="mt-6 flex flex-col gap-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[#FAFAFA]">{feature}</span>
                </li>
              ))}
              {plan.notIncluded.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 opacity-40"
                  aria-label={`No incluido: ${feature}`}
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#71717A]"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[#71717A] line-through">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <section aria-labelledby="faq-heading">
        <h2
          id="faq-heading"
          className="mb-8 text-center text-2xl font-bold text-[#FAFAFA]"
        >
          Preguntas frecuentes
        </h2>
        <div className="mx-auto max-w-2xl divide-y divide-[#3F3F46]">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-5">
              <div className="flex items-start gap-3">
                <HelpCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-[#FAFAFA]">{q}</p>
                  <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">
                    {a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
