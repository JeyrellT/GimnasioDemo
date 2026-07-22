import { beforeEach, afterEach, vi } from 'vitest'

// =============================================================================
// Mock de variables de entorno para tests.
// `serverEnv` (src/server/env.ts) valida con Zod al cargar el modulo. Si los
// tests importan codigo que toca serverEnv (e.g. crypto/tokens, auth helpers),
// las vars tienen que existir aca para evitar boot failures.
// =============================================================================

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:3000',
  NEXTAUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  DIRECT_URL: 'postgresql://test:test@localhost:5432/test',
  NEXTAUTH_SECRET: 'test-secret-key-32-bytes-minimum-required-for-next-auth',
  ENCRYPTION_KEY_PRIMARY: 'jQ3uns7UBfcg5iMwCRyBya01lTFRpgUrPBRpPLD4EeM=',
  IMPERSONATION_SECRET: 'test-impersonation-secret-32-bytes-minimum-required',
}

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (!process.env[key]) process.env[key] = value
}

// Cleanup automático entre tests
afterEach(() => {
  vi.clearAllMocks()
})
