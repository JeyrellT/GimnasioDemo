// =============================================================================
// BLACKLINE FITNESS — Magic link email template (React Email)
// Owner: backend-api.
//
// Tono: voseo CR, dark theme, brand blue #3B82F6.
// Incluye disclaimer Ley 8968 en footer.
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

export interface MagicLinkEmailProps {
  url: string;
  /** The email address the link was requested for (shown in body for clarity) */
  email: string;
  expiresInMinutes?: number;
}

export default function MagicLinkEmail({
  url,
  email,
  expiresInMinutes = 15,
}: MagicLinkEmailProps) {
  return (
    <Html lang="es-CR">
      <Head />
      <Preview>Ingresá a {APP_NAME} — tu link de acceso está aquí</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>{APP_NAME}</Heading>
            <Text style={styles.tagline}>Tu visión, tu evolución.</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h2" style={styles.title}>
              Tu link de acceso
            </Heading>
            <Text style={styles.body_text}>
              Solicitaste acceso a {APP_NAME} con{" "}
              <strong style={styles.email_highlight}>{email}</strong>.
            </Text>
            <Text style={styles.body_text}>
              Hacé clic en el botón para ingresar. El link es válido por{" "}
              <strong>{expiresInMinutes} minutos</strong> y se puede usar una
              sola vez.
            </Text>

            <Section style={styles.button_container}>
              <Button href={url} style={styles.button}>
                Ingresar a {APP_NAME}
              </Button>
            </Section>

            <Text style={styles.fallback}>
              Si el botón no funciona, copiá y pegá este link en tu navegador:
            </Text>
            <Link href={url} style={styles.fallback_link}>
              {url}
            </Link>

            <Hr style={styles.divider} />

            <Text style={styles.warning}>
              Si no solicitaste este acceso, podés ignorar este correo. Tu
              cuenta no fue modificada.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footer_text}>
              {APP_NAME} respeta tu privacidad conforme a la{" "}
              <Link href="https://blacklinefitness.app/legal/privacidad" style={styles.footer_link}>
                Ley 8968 (LPDP) de Costa Rica
              </Link>
              . No vendemos ni compartimos tu información personal.
            </Text>
            <Text style={styles.footer_text}>
              Preguntas: <Link href={`mailto:${EMAIL_SUPPORT}`} style={styles.footer_link}>{EMAIL_SUPPORT}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// =============================================================================
// Styles — inline for maximum email client compatibility
// =============================================================================

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
    color: "#3B82F6",
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
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 16px",
  },
  body_text: {
    color: "#A1A1AA",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 12px",
  },
  email_highlight: {
    color: "#FAFAFA",
  },
  button_container: {
    margin: "28px 0",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: "8px",
    color: "#FFFFFF",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    padding: "14px 32px",
    textDecoration: "none",
  },
  fallback: {
    color: "#52525B",
    fontSize: "13px",
    margin: "0 0 8px",
  },
  fallback_link: {
    color: "#3B82F6",
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },
  divider: {
    borderColor: "#3F3F46",
    margin: "24px 0",
  },
  warning: {
    color: "#52525B",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
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
