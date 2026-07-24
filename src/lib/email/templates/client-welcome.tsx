// =============================================================================
// BLACKLINE FITNESS — Client welcome email (quick-add flow)
// Owner: backend-api.
//
// Enviado cuando un entrenador crea la cuenta del cliente con contraseña
// provisional vía quickAddClient(). El botón lleva al cliente a
// /client/bienvenida donde se le pide que cambie su contraseña.
//
// Tono: voseo CR, dark theme, brand blue #2563EB.
// =============================================================================

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";
import { APP_NAME, EMAIL_SUPPORT } from "@/lib/consts";

export interface ClientWelcomeEmailProps {
  trainerName: string;
  /** Full URL: ${APP_URL}/client/bienvenida?token=${invitationToken} */
  welcomeUrl: string;
  /** Base URL of the app, e.g. https://blacklinefitness.app — used to build the logo src */
  appUrl: string;
}

export default function ClientWelcomeEmail({
  trainerName,
  welcomeUrl,
  appUrl,
}: ClientWelcomeEmailProps) {
  return (
    <Html lang="es-CR">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>
        {trainerName} creó tu cuenta en {APP_NAME} — ingresá ahora
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Img
              src={`${appUrl}/images/logo-email.png`}
              alt="Blackline Fitness"
              width="180"
              height="96"
              style={styles.logo_img}
            />
            <Text style={styles.tagline}>Tu línea, tu fuerza.</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h2" style={styles.title}>
              ¡Bienvenido!
            </Heading>

            <Text style={styles.body_text}>
              Hola, soy{" "}
              <strong style={styles.highlight}>{trainerName}</strong>, tu
              coach. Creé tu cuenta en{" "}
              <strong style={styles.highlight}>{APP_NAME}</strong> — la
              plataforma donde vas a ver tus rutinas, registrar tus sesiones
              y seguir tu progreso.
            </Text>

            <Text style={styles.body_text}>
              Accedé con el botón de abajo. Vas a poder personalizar tu
              contraseña al ingresar.
            </Text>

            <Section style={styles.button_container}>
              <Button href={welcomeUrl} style={styles.button}>
                Acceder a mi cuenta
              </Button>
            </Section>

            <Text style={styles.notice}>
              Este link de acceso es de un solo uso y expira en{" "}
              <strong>7 días</strong>.
            </Text>

            <Hr style={styles.divider} />

            <Text style={styles.fallback}>
              Si el botón no funciona, copiá y pegá este link:
            </Text>
            <Link href={welcomeUrl} style={styles.fallback_link}>
              {welcomeUrl}
            </Link>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footer_text}>
              {APP_NAME} protege tus datos conforme a la{" "}
              <Link
                href="https://blacklinefitness.app/legal/privacidad"
                style={styles.footer_link}
              >
                Ley 8968 (LPDP) de Costa Rica
              </Link>
              . Podés revocar tus consentimientos en cualquier momento desde
              tu perfil.
            </Text>
            <Text style={styles.footer_text}>
              ¿Preguntas?{" "}
              <Link href={`mailto:${EMAIL_SUPPORT}`} style={styles.footer_link}>
                {EMAIL_SUPPORT}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#F4F7FB",
    color: "#111827",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: "0",
    padding: "0",
  },
  container: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "14px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    margin: "28px auto",
    maxWidth: "520px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#EAF1FF",
    padding: "24px 32px 18px",
    textAlign: "center" as const,
  },
  logo_img: {
    display: "block",
    margin: "0 auto 8px",
    maxWidth: "180px",
    height: "auto",
  },
  tagline: {
    color: "#475569",
    fontSize: "13px",
    margin: "0",
    textAlign: "center" as const,
  },
  content: {
    backgroundColor: "#FFFFFF",
    padding: "30px 34px",
  },
  title: {
    color: "#111827",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 20px",
  },
  body_text: {
    color: "#4B5563",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  highlight: {
    color: "#111827",
  },
  button_container: {
    margin: "28px 0 16px",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
    color: "#FFFFFF",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    padding: "14px 32px",
    textDecoration: "none",
  },
  notice: {
    color: "#64748B",
    fontSize: "13px",
    margin: "0",
    textAlign: "center" as const,
  },
  divider: {
    borderColor: "#E5E7EB",
    margin: "24px 0",
  },
  fallback: {
    color: "#6B7280",
    fontSize: "13px",
    margin: "0 0 8px",
  },
  fallback_link: {
    color: "#1D4ED8",
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },
  footer: {
    backgroundColor: "#F8FAFC",
    borderTop: "1px solid #E5E7EB",
    padding: "20px 34px",
  },
  footer_text: {
    color: "#64748B",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "0 0 8px",
  },
  footer_link: {
    color: "#334155",
    textDecoration: "underline",
  },
} as const;
