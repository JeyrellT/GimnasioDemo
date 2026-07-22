// =============================================================================
// BLACKLINE FITNESS — Trainer invitation email template (React Email)
// Owner: backend-api.
//
// Sent when a trainer invites a client via createInvitation().
// Tono: de boca del entrenador, voseo CR.
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

export interface InvitationEmailProps {
  trainerName: string;
  invitationUrl: string;
  /** ISO date string — shown as readable "expira el DD/MM/YYYY" */
  expiresAt: string;
  /** Base URL of the app, e.g. https://blacklinefitness.app — used to build the logo src */
  appUrl: string;
}

export default function InvitationEmail({
  trainerName,
  invitationUrl,
  expiresAt,
  appUrl,
}: InvitationEmailProps) {
  const expiryDate = new Date(expiresAt).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  });

  return (
    <Html lang="es-CR">
      <Head />
      <Preview>
        {trainerName} te invitó a entrenar en {APP_NAME}
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
              ¡Tu coach te invitó!
            </Heading>

            <Text style={styles.body_text}>
              Hola, soy{" "}
              <strong style={styles.highlight}>{trainerName}</strong>, tu
              coach. Te invité a unirte a{" "}
              <strong style={styles.highlight}>{APP_NAME}</strong> — la
              plataforma donde vas a ver tus rutinas, registrar tus sesiones
              y seguir tu progreso.
            </Text>

            <Text style={styles.body_text}>
              El proceso de registro toma 4 minutos. Incluye un cuestionario de
              salud básico (PAR-Q+) y tus datos de partida para que{" "}
              {trainerName} te conozca desde el primer día.
            </Text>

            <Section style={styles.button_container}>
              <Button href={invitationUrl} style={styles.button}>
                Aceptar invitación
              </Button>
            </Section>

            <Text style={styles.expiry_notice}>
              Esta invitación expira el <strong>{expiryDate}</strong>.
            </Text>

            <Hr style={styles.divider} />

            <Text style={styles.fallback}>
              Si el botón no funciona, copiá y pegá este link:
            </Text>
            <Link href={invitationUrl} style={styles.fallback_link}>
              {invitationUrl}
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
    backgroundColor: "#09090B",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: "0",
    padding: "0",
  },
  container: {
    backgroundColor: "#18181B",
    borderRadius: "12px",
    margin: "40px auto",
    maxWidth: "520px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0F1A2E",
    padding: "24px 40px 16px",
    textAlign: "center" as const,
  },
  logo_img: {
    display: "block",
    margin: "0 auto 8px",
    maxWidth: "180px",
    height: "auto",
  },
  tagline: {
    color: "#A1A1AA",
    fontSize: "13px",
    margin: "0",
    textAlign: "center" as const,
  },
  content: {
    padding: "32px 40px",
  },
  title: {
    color: "#FAFAFA",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 20px",
  },
  body_text: {
    color: "#A1A1AA",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  highlight: {
    color: "#FAFAFA",
  },
  button_container: {
    margin: "28px 0 16px",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: "8px",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
    color: "#FFFFFF",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    padding: "14px 32px",
    textDecoration: "none",
  },
  expiry_notice: {
    color: "#71717A",
    fontSize: "13px",
    margin: "0 0 0",
    textAlign: "center" as const,
  },
  divider: {
    borderColor: "#3F3F46",
    margin: "24px 0",
  },
  fallback: {
    color: "#52525B",
    fontSize: "13px",
    margin: "0 0 8px",
  },
  fallback_link: {
    color: "#2563EB",
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },
  footer: {
    backgroundColor: "#0F0F10",
    padding: "20px 40px",
  },
  footer_text: {
    color: "#52525B",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "0 0 8px",
  },
  footer_link: {
    color: "#71717A",
    textDecoration: "underline",
  },
} as const;
