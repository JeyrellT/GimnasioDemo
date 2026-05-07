import { describe, it, expect } from 'vitest'
import {
  generateOpaqueToken,
  generateInvitationToken,
  generateSecureRandomString,
  hashToken,
  verifyTokenHash,
  signDownloadToken,
  verifyDownloadToken,
} from '@/lib/crypto/tokens'

describe('tokens — Cryptographic Token Utilities', () => {
  describe('generateOpaqueToken', () => {
    it('genera token de 32 bytes por default', () => {
      const token = generateOpaqueToken()
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('genera tokens únicos', () => {
      const token1 = generateOpaqueToken()
      const token2 = generateOpaqueToken()
      expect(token1).not.toBe(token2)
    })

    it('no contiene padding base64', () => {
      for (let i = 0; i < 10; i++) {
        expect(generateOpaqueToken()).not.toContain('=')
      }
    })
  })

  describe('generateInvitationToken', () => {
    it('genera invitation token de 32 bytes', () => {
      const token = generateInvitationToken()
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('tokens de invitación son únicos', () => {
      const tokens = new Set()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateInvitationToken())
      }
      expect(tokens.size).toBe(100)
    })
  })

  describe('generateSecureRandomString', () => {
    it('genera string del largo solicitado', () => {
      expect(generateSecureRandomString(10)).toHaveLength(10)
      expect(generateSecureRandomString(50)).toHaveLength(50)
    })

    it('solo usa alfabeto no ambiguo', () => {
      const unambiguous = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
      for (let i = 0; i < 5; i++) {
        const str = generateSecureRandomString(100)
        for (const char of str) {
          expect(unambiguous).toContain(char)
        }
      }
    })

    it('no contiene caracteres ambiguos', () => {
      const ambiguous = ['0', 'O', 'I', 'l', '1', 'o']
      for (let i = 0; i < 5; i++) {
        const str = generateSecureRandomString(100)
        for (const char of ambiguous) {
          expect(str).not.toContain(char)
        }
      }
    })

    it('lanza RangeError si length <= 0', () => {
      expect(() => generateSecureRandomString(0)).toThrow(RangeError)
    })
  })

  describe('hashToken', () => {
    it('produce SHA-256 hex hash de token', () => {
      const token = generateOpaqueToken()
      const hash = hashToken(token)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('el mismo token produce el mismo hash', () => {
      const token = 'test-token-12345'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      expect(hash1).toBe(hash2)
    })

    it('diferentes tokens producen diferentes hashes', () => {
      const token1 = generateOpaqueToken()
      const token2 = generateOpaqueToken()
      expect(hashToken(token1)).not.toBe(hashToken(token2))
    })
  })

  describe('verifyTokenHash', () => {
    it('verifica token hash correctamente', () => {
      const token = generateOpaqueToken()
      const hash = hashToken(token)
      expect(verifyTokenHash(token, hash)).toBe(true)
    })

    it('rechaza token incorrecto contra hash', () => {
      const token = generateOpaqueToken()
      const hash = hashToken(token)
      const wrongToken = generateOpaqueToken()
      expect(verifyTokenHash(wrongToken, hash)).toBe(false)
    })

    it('rechaza hash incorrecto', () => {
      const token = generateOpaqueToken()
      const wrongHash = 'a'.repeat(64)
      expect(verifyTokenHash(token, wrongHash)).toBe(false)
    })

    it('retorna false sin throw si hash es inválido', () => {
      const token = generateOpaqueToken()
      expect(() => verifyTokenHash(token, 'invalid')).not.toThrow()
      expect(verifyTokenHash(token, 'invalid')).toBe(false)
    })
  })

  describe('signDownloadToken / verifyDownloadToken', () => {
    it('firma y verifica download token', async () => {
      const payload = {
        userId: 'user123',
        requestId: 'req456',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }
      const token = await signDownloadToken(payload)
      const verified = await verifyDownloadToken(token)
      expect(verified).not.toBeNull()
      if (verified) {
        expect(verified.userId).toBe('user123')
        expect(verified.requestId).toBe('req456')
      }
    })

    it('rechaza token expirado', async () => {
      const payload = {
        userId: 'user123',
        requestId: 'req456',
        expiresAt: Math.floor(Date.now() / 1000) - 3600,
      }
      const token = await signDownloadToken(payload)
      const verified = await verifyDownloadToken(token)
      expect(verified).toBeNull()
    })

    it('retorna null sin throw en token inválido', async () => {
      const verified = await verifyDownloadToken('invalid-token')
      expect(verified).toBeNull()
    })

    it('tokens de descarga pueden diferir entre llamadas (iat diferente)', async () => {
      const payload = {
        userId: 'user123',
        requestId: 'req456',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }
      const token1 = await signDownloadToken(payload)
      // Los tokens pueden ser idénticos si iat es igual (misma época de segundos)
      // pero con suficiente separación temporal deberían diferir
      await new Promise(r => setTimeout(r, 1100))
      const token2 = await signDownloadToken(payload)
      // Solo verificamos que ambos son válidos, no que necesariamente sean diferentes
      const v1 = await verifyDownloadToken(token1)
      const v2 = await verifyDownloadToken(token2)
      expect(v1).not.toBeNull()
      expect(v2).not.toBeNull()
    })
  })
})
