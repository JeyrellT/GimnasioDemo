// =============================================================================
// BLACKLINE FITNESS — Demo mode env stub
// Replaces the real env.ts. All values are hardcoded for static build.
// GEMINI_API_KEY is read from localStorage at runtime, NOT from env.
// =============================================================================

export const env = {
  NODE_ENV: "production" as const,

  // Auth (unused in demo)
  NEXTAUTH_URL: "https://demo.blackline-fitness.local",
  NEXTAUTH_SECRET: "demo-secret-not-used",

  // DB (unused in demo)
  DATABASE_URL: "postgresql://demo",
  DIRECT_URL: "postgresql://demo",

  // Email (unused)
  RESEND_API_KEY: "demo",
  RESEND_FROM_EMAIL: "demo@blacklinefitness.app",
  GMAIL_USER: "demo@blacklinefitness.app",
  GMAIL_APP_PASSWORD: "demo",
  GMAIL_FROM_NAME: "Blackline Fitness",

  // AI — placeholder; real key comes from localStorage in browser
  GEMINI_API_KEY: "",
  GEMINI_MODEL_OCR: "gemini-2.0-flash-lite",
  GEMINI_MODEL_REASONING: "gemini-2.0-flash",

  // R2/MinIO (unused)
  R2_ACCOUNT_ID: "demo",
  R2_ACCESS_KEY_ID: "demo",
  R2_SECRET_ACCESS_KEY: "demo",
  R2_BUCKET_PHOTOS: "demo",
  R2_BUCKET_DOCUMENTS: "demo",
  R2_PUBLIC_URL: "https://demo",
  R2_ENDPOINT: "https://demo",

  // Tilopay (unused)
  TILOPAY_API_KEY: "demo",
  TILOPAY_WEBHOOK_SECRET: "demo",

  // Hacienda (unused)
  HACIENDA_USERNAME: "demo",
  HACIENDA_PASSWORD: "demo",
  HACIENDA_CERT_PATH: "./demo",
  HACIENDA_CERT_PIN: "0000",

  // Observability (unused)
  SENTRY_DSN: "https://demo@sentry.io/0",
  POSTHOG_KEY: "demo",
  POSTHOG_HOST: "https://demo.posthog.com",

  // Encryption (unused)
  ENCRYPTION_KEY_PRIMARY: "demo",
  ENCRYPTION_KEY_SECONDARY: "",

  // Feature flags
  PAYMENT_PROVIDER_LIVE: false,
  BILLING_LIVE: false,
  AI_ASSIST_LIVE: true, // only this is true so AI UI renders
  MEDIAPIPE_POSTURE_BETA: false,

  // App
  APP_URL: "https://demo.blackline-fitness.local",
  NEXT_TELEMETRY_DISABLED: "1",

  // Docker (unused)
  DOCKER_REGISTRY: "demo",
};

export type Env = typeof env;
