import { beforeEach, afterEach, vi } from 'vitest'

// Mock de variables de entorno para tests de crypto
if (!process.env.ENCRYPTION_KEY_PRIMARY) {
  // Key de 32 bytes válida en base64
  process.env.ENCRYPTION_KEY_PRIMARY = 'jQ3uns7UBfcg5iMwCRyBya01lTFRpgUrPBRpPLD4EeM='
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'test-secret-key-32-bytes-minimum-required-for-next-auth'
}

// Cleanup automático entre tests
afterEach(() => {
  vi.clearAllMocks()
})
