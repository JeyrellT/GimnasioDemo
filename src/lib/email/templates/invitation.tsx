// =============================================================================
// FORJA — Trainer invitation email template (React Email)
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
}

export default function InvitationEmail({
  trainerName,
  invitationUrl,
  expiresAt,
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
            <Heading style={styles.logo}>{APP_NAME}</Heading>
            <Text style={styles.tagline}>Cada repetición te forja.</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h2" style={styles.title}>
              {trainerName} te invitó a Forja
            </Heading>

            <Text style={styles.body_text}>
              Tu entrenador{" "}
              <strong style={styles.highlight}>{trainerName}</strong> te
              invitó a registrarte en{" "}
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
                href="https://forja.app/legal/privacidad"
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
    backgroundColor: "#1E2A38",
    padding: "32px 40px 24px",
  },
  logo: {
    color: "#FF6A1A",
    fontSize: "28px",
    fontWeight: "700",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  tagline: {
    color: "#A1A1AA",
    fontSize: "13px",
    margin: "0",
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
    backgroundColor: "#FF6A1A",
    borderRadius: "8px",
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
    color: "#FF6A1A",
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
