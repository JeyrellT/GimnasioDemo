import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de Blackline Fitness.",
};

// TODO(legal): Completar con abogado especialista en Ley 8968 y derecho digital CR.
// Las secciones y estructura están listas. Solo el texto final requiere revisión legal.

export default function TerminosPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <p className="mb-2 text-sm text-[#A1A1AA]">
          Última actualización: {new Date().toLocaleDateString("es-CR")}
        </p>
        <h1 className="text-3xl font-bold text-[#FAFAFA]">
          Términos y condiciones
        </h1>
        <p className="mt-3 text-[#A1A1AA]">
          Estos términos rigen el uso de la plataforma Blackline Fitness, operada por
          [Nombre comercial del operador], con domicilio en Costa Rica.
        </p>
      </header>

      <div className="prose-blackline-fitness space-y-10 text-[#A1A1AA] leading-relaxed">
        <Section title="1. Aceptación de los términos">
          <p>
            Al acceder y utilizar Blackline Fitness, aceptás estos Términos y condiciones en
            su totalidad. Si no estás de acuerdo con alguna parte, no podés usar
            la plataforma. El uso continuado después de cambios constituye
            aceptación de los términos actualizados.
          </p>
          <p>
            La versión vigente siempre está disponible en{" "}
            <span className="text-[#FF6A1A]">blacklinefitness.app/legal/terminos</span>.
            Los cambios materiales se notifican por email con 14 días de
            anticipación.
          </p>
        </Section>

        <Section title="2. Descripción del servicio">
          <p>
            Blackline Fitness es una plataforma SaaS de gestión de entrenamiento personal
            que permite a entrenadores certificados crear rutinas, gestionar
            clientes y registrar sesiones, y a sus clientes acceder a su rutina
            asignada y registrar su progreso.
          </p>
          <p>
            Blackline Fitness no es un servicio médico. El contenido y las rutinas son
            prescriptos exclusivamente por entrenadores certificados, no por la
            plataforma. Blackline Fitness no es responsable de lesiones derivadas de la
            ejecución incorrecta de ejercicios.
          </p>
        </Section>

        <Section title="3. Cuentas de usuario">
          <p>
            Para usar Blackline Fitness necesitás crear una cuenta. Sos responsable de
            mantener la seguridad de tu cuenta y de todas las actividades que
            ocurran bajo tu acceso. Debés notificar a{" "}
            <a href="mailto:soporte@blacklinefitness.app" className="text-[#FF6A1A]">
              soporte@blacklinefitness.app
            </a>{" "}
            ante cualquier uso no autorizado.
          </p>
          <p>
            La edad mínima para usar Blackline Fitness es 15 años. Entre 15 y 18 años se
            requiere consentimiento parental documentado. Menores de 15 años no
            pueden crear cuentas.
          </p>
        </Section>

        <Section title="4. Roles y responsabilidades">
          <p>
            <strong className="text-[#FAFAFA]">Entrenadores:</strong> Al
            registrarse como entrenador, declarás que sos un profesional
            certificado o en formación, y que tenés las competencias para
            prescribir ejercicio. Sos responsable de la adecuación de las
            rutinas que asignás a tus clientes.
          </p>
          <p>
            <strong className="text-[#FAFAFA]">Clientes:</strong> Sos
            responsable de seguir las instrucciones de tu entrenador y de
            informarle cualquier cambio en tu estado de salud. El PAR-Q+ que
            completás es tu autodeclaración médica.
          </p>
        </Section>

        <Section title="5. Uso aceptable">
          <p>No podés usar Blackline Fitness para:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Actividades ilegales según la legislación costarricense.</li>
            <li>
              Hacerse pasar por otra persona o proporcionar información falsa.
            </li>
            <li>Intentar acceder a datos de otros usuarios.</li>
            <li>Distribuir malware o interferir con el servicio.</li>
            <li>
              Hacer scraping automático de datos sin autorización escrita.
            </li>
          </ul>
        </Section>

        <Section title="6. Pagos y suscripciones">
          <p>
            Los precios mostrados incluyen IVA 13% según la legislación
            costarricense. Las suscripciones se cobran mensualmente. Podés
            cancelar en cualquier momento; el acceso continúa hasta el fin del
            período pagado.
          </p>
          <p>
            Los pagos son procesados por [Tilopay / OnvoPay según
            configuración]. Blackline Fitness no almacena números de tarjeta ni datos PCI.
          </p>
        </Section>

        <Section title="7. Propiedad intelectual">
          <p>
            La plataforma Blackline Fitness, su código, diseño y contenido son propiedad de
            [Operador] y están protegidos por las leyes de propiedad intelectual
            de Costa Rica. No podés reproducir, distribuir ni crear obras
            derivadas sin autorización escrita.
          </p>
          <p>
            El contenido que vos subís (fotos de progreso, notas, datos de
            entrenamiento) sigue siendo tuyo. Nos otorgás una licencia limitada
            para procesar ese contenido exclusivamente para prestarte el
            servicio.
          </p>
        </Section>

        <Section title="8. Limitación de responsabilidad">
          <p>
            En la medida permitida por la ley costarricense, Blackline Fitness no será
            responsable de daños indirectos, incidentales o consecuentes
            derivados del uso de la plataforma. La responsabilidad máxima de
            Blackline Fitness está limitada al monto pagado en los 3 meses anteriores al
            evento que da lugar al reclamo.
          </p>
        </Section>

        <Section title="9. Modificaciones y terminación">
          <p>
            Podemos modificar o discontinuar el servicio con 30 días de aviso.
            Podemos suspender o terminar cuentas que violen estos términos.
            Podés cancelar tu cuenta en cualquier momento desde tu perfil.
          </p>
        </Section>

        <Section title="10. Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de la República de Costa Rica.
            Cualquier disputa se resolverá ante los tribunales competentes de
            San José, Costa Rica.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Consultas legales:{" "}
            <a href="mailto:dpo@blacklinefitness.app" className="text-[#FF6A1A]">
              dpo@blacklinefitness.app
            </a>
            <br />
            Soporte:{" "}
            <a href="mailto:soporte@blacklinefitness.app" className="text-[#FF6A1A]">
              soporte@blacklinefitness.app
            </a>
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
