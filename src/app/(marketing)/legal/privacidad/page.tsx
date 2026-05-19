import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y protección de datos de Blackline Fitness.",
};

// TODO(legal): Completar con abogado. Secciones estructuradas según Ley 8968 CR.

export default function PrivacidadPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <p className="mb-2 text-sm text-[#A1A1AA]">
          Última actualización: {new Date().toLocaleDateString("es-CR")}
        </p>
        <h1 className="text-3xl font-bold text-[#FAFAFA]">
          Política de privacidad
        </h1>
        <p className="mt-3 text-[#A1A1AA]">
          Tu privacidad es fundamental para Blackline Fitness. Esta política explica qué
          datos recopilamos, cómo los usamos y cuáles son tus derechos bajo la
          Ley 8968 (Ley de Protección de la Persona frente al Tratamiento de sus
          Datos Personales), Costa Rica.
        </p>
      </header>

      <div className="space-y-10 text-[#A1A1AA] leading-relaxed">
        <Section title="1. Responsable del tratamiento">
          <p>
            [Nombre legal del operador], cédula jurídica [XXXXXXXXXX], domicilio
            en [dirección completa, Costa Rica].
          </p>
          <p>
            Delegado de Protección de Datos (DPO):{" "}
            <a href="mailto:dpo@blacklinefitness.app" className="text-brand-primary">
              dpo@blacklinefitness.app
            </a>
          </p>
          <p>
            Fichero registrado ante PRODHAB: [ID de registro — pendiente de
            trámite].
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p>Recopilamos las siguientes categorías de datos:</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong className="text-[#FAFAFA]">Identidad:</strong> nombre
              completo, fecha de nacimiento, cédula de identidad (almacenada
              cifrada con AES-256-GCM, solo si la proporcionás vía OCR
              opcional).
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Contacto:</strong> dirección
              de email.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Salud (sensibles):</strong>{" "}
              respuestas PAR-Q+, peso, talla, perímetros corporales, porcentaje
              de grasa, historial de sesiones de ejercicio.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Biométricos:</strong> fotos de
              progreso corporal (almacenadas encriptadas en Cloudflare R2 con
              EXIF eliminado).
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Uso:</strong> logs de acceso,
              dispositivo, IP, tiempo de sesión.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Pago:</strong> gestionado por
              proveedor certificado PCI. Blackline Fitness no almacena datos de tarjeta.
            </li>
          </ul>
        </Section>

        <Section title="3. Bases legales del tratamiento">
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong className="text-[#FAFAFA]">Consentimiento explícito</strong>{" "}
              (Art. 5 Ley 8968): para datos sensibles de salud y para
              procesamiento por IA. Podés revocar tu consentimiento en cualquier
              momento.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Ejecución de contrato:</strong>{" "}
              para prestarte el servicio de gestión de entrenamiento.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Obligación legal:</strong>{" "}
              registros de auditoría y facturación electrónica Hacienda 4.4.
            </li>
          </ul>
        </Section>

        <Section title="4. Uso de los datos">
          <p>Tus datos se usan exclusivamente para:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Prestarte el servicio de entrenamiento personalizado.</li>
            <li>
              Calcular métricas de salud (TMB, TDEE, IMC) — exclusivamente en
              tu dispositivo.
            </li>
            <li>Detectar marcas personales (PRs) en ejercicios.</li>
            <li>Generar facturas electrónicas cuando aplique.</li>
            <li>Cumplir obligaciones legales.</li>
          </ul>
          <p>
            <strong className="text-[#FAFAFA]">No vendemos datos a terceros.</strong>{" "}
            No usamos tus datos para publicidad.
          </p>
        </Section>

        <Section title="5. Procesamiento por IA">
          <p>
            Blackline Fitness usa Gemini Flash-Lite (Google) para OCR de cédula y báscula,
            únicamente si das consentimiento explícito. Antes de enviar
            cualquier imagen a Gemini: se elimina el EXIF, se aplica un
            watermark invisible con ID de request, y nunca se incluye tu nombre
            en el prompt.
          </p>
          <p>
            Las fotos de progreso corporal y tus datos del PAR-Q <strong className="text-[#FAFAFA]">nunca se envían a sistemas de IA</strong>.
          </p>
        </Section>

        <Section title="6. Conservación de datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Al solicitar
            la eliminación, aplicamos un período de gracia de 30 días (durante
            el cual podés cancelar la solicitud), luego eliminamos todos tus
            datos personales incluyendo fotos y datos sensibles de sistemas de
            almacenamiento y copias de seguridad dentro de 90 días.
          </p>
          <p>
            Los registros de auditoría y facturas se conservan por el período
            legal obligatorio (5 años para documentos fiscales).
          </p>
        </Section>

        <Section title="7. Tus derechos (Ley 8968)">
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong className="text-[#FAFAFA]">Acceso:</strong> descargá toda
              tu data en tu perfil → "Descargar mis datos".
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Rectificación:</strong> editá
              tu perfil directamente.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Supresión:</strong> solicitá
              la eliminación de tu cuenta en tu perfil → "Eliminar mi cuenta".
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Portabilidad:</strong> el ZIP
              de datos incluye formato JSON estructurado.
            </li>
            <li>
              <strong className="text-[#FAFAFA]">Oposición:</strong> revocá
              consentimientos individuales en tu perfil → "Mis consentimientos".
            </li>
          </ul>
          <p>
            Para ejercer estos derechos o presentar una queja:{" "}
            <a href="mailto:dpo@blacklinefitness.app" className="text-brand-primary">
              dpo@blacklinefitness.app
            </a>
            . Respondemos en máximo 20 días hábiles.
          </p>
        </Section>

        <Section title="8. Seguridad">
          <p>
            Implementamos medidas técnicas y organizativas: cifrado TLS 1.3 en
            tránsito, AES-256-GCM para datos sensibles en reposo, acceso
            role-based, audit logs completos, backups diarios con retención 30
            días.
          </p>
        </Section>

        <Section title="9. Cookies y tracking">
          <p>
            Usamos cookies de sesión estrictamente necesarias. Para analytics,
            usamos Plausible self-hosted (no Google Analytics), que no comparte
            datos con terceros. Podés optar por no ser trackeado en tu perfil.
          </p>
        </Section>

        <Section title="10. Cambios a esta política">
          <p>
            Notificamos cambios materiales por email con 14 días de
            anticipación. La versión vigente siempre está disponible en esta
            página.
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
