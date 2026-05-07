// =============================================================================
// FORJA — LPDP data export ready email template (React Email)
// Owner: backend-api.
//
// Sent after generateLpdpExport() completes and the ZIP is ready in R2.
// Signed URL expires in 7 days.
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
import { APP_NAME, EMAIL_DPO, EMAIL_SUPPORT } from "@/lib/consts";

export interface LpdpExportReadyEmailProps {
  userName: string;
  downloadUrl: string;
  /** ISO datetime string — shown as "expira el DD/MM/YYYY HH:mm" */
  expiresAt: string;
}

export default function LpdpExportReadyEmail({
  userName,
  downloadUrl,
  expiresAt,
}: LpdpExportReadyEmailProps) {
  const expiryFormatted = new Date(expiresAt).toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  });

  return (
    <Html lang="es-CR">
      <Head />
      <Preview>Tu data de {APP_NAME} está lista para descargar</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>{APP_NAME}</Heading>
            <Text style={styles.tagline}>Portabilidad de datos — Ley 8968</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h2" style={styles.title}>
              Tu data está lista, {userName}
            </Heading>

            <Text style={styles.body_text}>
              Preparamos un archivo con toda la información que {APP_NAME}{" "}
              tiene registrada sobre vos: perfil, mediciones, sesiones,
              rutinas asignadas y consentimientos.
            </Text>

            <Text style={styles.body_text}>
              El archivo está disponible hasta el{" "}
              <strong style={styles.highlight}>{expiryFormatted}</strong>.
              Después de esa fecha el link expira por seguridad.
            </Text>

            <Section style={styles.button_container}>
              <Button href={downloadUrl} style={styles.button}>
                Descargar mis datos
              </Button>
            </Section>

            <Hr style={styles.divider} />

            <Text style={styles.fallback}>
              Si el botón no funciona, copiá y pegá este link:
            </Text>
            <Link href={downloadUrl} style={styles.fallback_link}>
              {downloadUrl}
            </Link>

            <Hr style={styles.divider} />

            <Text style={styles.info_text}>
              Este correo se envió porque solicitaste exportar tus datos
              (derecho de acceso y portabilidad, Art. 8 Ley 8968). Si no
              fuiste vos, escribí a{" "}
              <Link href={`mailto:${EMAIL_DPO}`} style={styles.inline_link}>
                {EMAIL_DPO}
              </Link>{" "}
              de inmediato.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footer_text}>
              Responsable del tratamiento: Forja Technologies S.R.L. — DPO:{" "}
              <Link href={`mailto:${EMAIL_DPO}`} style={styles.footer_link}>
                {EMAIL_DPO}
              </Link>
            </Text>
            <Text style={styles.footer_text}>
              Soporte:{" "}
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
  info_text: {
    color: "#71717A",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
  },
  inline_link: {
    color: "#A1A1AA",
    textDecoration: "underline",
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
