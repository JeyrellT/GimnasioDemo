import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Derechos LPDP",
  description:
    "Ejercé tus derechos bajo la Ley 8968 de Protección de Datos Personales de Costa Rica.",
};

export default function LpdpPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[#FAFAFA]">
          Tus derechos bajo la Ley 8968
        </h1>
        <p className="mt-3 text-[#A1A1AA]">
          La Ley de Protección de la Persona frente al Tratamiento de sus Datos
          Personales (Ley 8968) de Costa Rica te otorga derechos concretos sobre
          tus datos. Acá te explicamos cómo ejercerlos en Blackline Fitness.
        </p>
      </header>

      <div className="space-y-10 text-[#A1A1AA] leading-relaxed">
        <Section title="Derecho de acceso y portabilidad">
          <p>
            Podés solicitar una copia completa de todos tus datos personales que
            Blackline Fitness trata. El archivo incluye:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Datos de perfil (nombre, email, fecha de nacimiento).</li>
            <li>Historial de sesiones y sets registrados.</li>
            <li>Mediciones corporales y métricas de progreso.</li>
            <li>Respuestas al PAR-Q+.</li>
            <li>Registro de consentimientos otorgados y revocados.</li>
          </ul>
          <p>
            El archivo se genera en formato JSON estructurado (portabilidad) y
            se envía a tu email registrado. El link de descarga expira en 7
            días.
          </p>
          <p>
            <strong className="text-[#FAFAFA]">Cómo ejercerlo:</strong> Ingresá
            a tu perfil → sección "Privacidad y datos" → botón "Descargar mis
            datos".
          </p>
        </Section>

        <Section title="Derecho de rectificación">
          <p>
            Podés corregir tus datos personales en cualquier momento desde tu
            perfil. Para datos clínicos (mediciones, PAR-Q) que requieren
            validación del entrenador, enviá la solicitud a{" "}
            <a href="mailto:dpo@blacklinefitness.app" className="text-brand-primary">
              dpo@blacklinefitness.app
            </a>
            .
          </p>
        </Section>

        <Section title="Derecho de supresión (eliminación)">
          <p>
            Podés solicitar la eliminación permanente de tu cuenta y todos tus
            datos. El proceso:
          </p>
          <ol className="ml-4 list-decimal space-y-2">
            <li>
              Solicitás la eliminación desde tu perfil → "Eliminar mi cuenta".
            </li>
            <li>
              Recibís un email de confirmación con un link para cancelar la
              solicitud durante 30 días.
            </li>
            <li>
              Si no cancelás en 30 días, procedemos con la eliminación
              permanente de todos tus datos, incluyendo fotos de progreso.
            </li>
            <li>
              Los registros fiscales y de auditoría se conservan por el período
              legal obligatorio (5 años).
            </li>
          </ol>
        </Section>

        <Section title="Derecho de oposición y revocación de consentimiento">
          <p>
            Podés revocar consentimientos individuales en cualquier momento:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Revocar consentimiento de IA: desactiva el OCR de cédula y
              báscula. Tus datos ya procesados no se eliminan retroactivamente.
            </li>
            <li>
              Revocar marketing: te removemos de comunicaciones promocionales de
              inmediato.
            </li>
          </ul>
          <p>
            <strong className="text-[#FAFAFA]">Cómo ejercerlo:</strong> Perfil
            → "Mis consentimientos".
          </p>
        </Section>

        <Section title="Plazos de respuesta">
          <p>
            Respondemos todas las solicitudes LPDP en máximo{" "}
            <strong className="text-[#FAFAFA]">20 días hábiles</strong> según
            el artículo 22 de la Ley 8968. En solicitudes complejas podemos
            extender hasta 40 días hábiles, informándote previamente.
          </p>
        </Section>

        <Section title="Cómo contactarnos">
          <p>Para ejercer tus derechos o presentar una queja:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Email DPO:{" "}
              <a href="mailto:dpo@blacklinefitness.app" className="text-brand-primary">
                dpo@blacklinefitness.app
              </a>
            </li>
            <li>
              Soporte general:{" "}
              <a href="mailto:soporte@blacklinefitness.app" className="text-brand-primary">
                soporte@blacklinefitness.app
              </a>
            </li>
          </ul>
          <p>
            También podés presentar una queja ante la Agencia de Protección de
            Datos (PRODHAB):{" "}
            <a
              href="https://www.prodhab.go.cr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary"
            >
              prodhab.go.cr
            </a>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[#FAFAFA]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
