import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt, encryptBuffer, decryptBuffer, isEncrypted } from '@/lib/crypto/aes-gcm'
import { randomBytes } from 'node:crypto'

describe('aes-gcm — AES-256-GCM Encryption', () => {
  describe('encrypt/decrypt round-trip', () => {
    it('encripta y desencripta texto UTF-8 simple', () => {
      const plaintext = 'Hola, Forja'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('encripta y desencripta texto largo', () => {
      const plaintext = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('encripta y desencripta con caracteres especiales CR', () => {
      const plaintext = '¡Forjá tu rutina! ¿Cómo va?'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('encripta y desencripta JSON', () => {
      const data = { userId: 'user123', cedula: '123456789' }
      const plaintext = JSON.stringify(data)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      const result = JSON.parse(decrypted)
      expect(result).toEqual(data)
    })

    it('encripta y desencripta con AAD (Additional Authenticated Data)', () => {
      const plaintext = 'Cédula cifrada'
      const aad = 'cedula:userId=user123'
      const encrypted = encrypt(plaintext, aad)
      const decrypted = decrypt(encrypted, aad)
      expect(decrypted).toBe(plaintext)
    })

    it('rechaza descifrado si AAD no coincide', () => {
      const plaintext = 'Información sensible'
      const aad = 'cedula:userId=user123'
      const encrypted = encrypt(plaintext, aad)
      expect(() => decrypt(encrypted, 'cedula:userId=user999')).toThrow()
    })

    it('rechaza descifrado si se omite AAD cuando fue usado', () => {
      const plaintext = 'Datos protegidos'
      const aad = 'cedula:userId=user123'
      const encrypted = encrypt(plaintext, aad)
      expect(() => decrypt(encrypted, '')).toThrow()
    })

    it('encripta y desencripta con AAD vacío (default)', () => {
      const plaintext = 'Texto sin contexto'
      const encrypted = encrypt(plaintext) // AAD = '' por default
      const decrypted = decrypt(encrypted) // AAD = '' por default
      expect(decrypted).toBe(plaintext)
    })
  })

  describe('encryptBuffer/decryptBuffer', () => {
    it('encripta y desencripta buffer binario', () => {
      const buffer = randomBytes(64)
      const encrypted = encryptBuffer(buffer)
      const decrypted = decryptBuffer(encrypted)
      expect(decrypted).toEqual(buffer)
    })

    it('encripta y desencripta buffer vacío', () => {
      const buffer = Buffer.alloc(0)
      const encrypted = encryptBuffer(buffer)
      const decrypted = decryptBuffer(encrypted)
      expect(decrypted).toEqual(buffer)
    })

    it('encripta y desencripta buffer large', () => {
      const buffer = randomBytes(1024 * 100) // 100 KB
      const encrypted = encryptBuffer(buffer)
      const decrypted = decryptBuffer(encrypted)
      expect(decrypted).toEqual(buffer)
    })
  })

  describe('isEncrypted', () => {
    it('retorna true para ciphertext válido', () => {
      const plaintext = 'Texto para verificar'
      const encrypted = encrypt(plaintext)
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('retorna false para texto plano', () => {
      expect(isEncrypted('Texto sin cifrar')).toBe(false)
    })

    it('retorna false para base64 inválido', () => {
      expect(isEncrypted('!!!invalid base64!!!')).toBe(false)
    })

    it('retorna false para buffer demasiado corto', () => {
      // Version(1) + IV(12) + TAG(16) = 29 bytes mínimo
      const buffer = Buffer.alloc(10).toString('base64')
      expect(isEncrypted(buffer)).toBe(false)
    })

    it('retorna false para buffer con versión incorrecta', () => {
      // Construir un buffer con versión 0x02 (inválida)
      const buf = Buffer.alloc(30)
      buf[0] = 0x02 // Versión inválida
      expect(isEncrypted(buf.toString('base64'))).toBe(false)
    })
  })

  describe('version byte handling', () => {
    it('el ciphertext contiene versión 0x01 como primer byte', () => {
      const plaintext = 'Test versioning'
      const encrypted = encrypt(plaintext)
      const buf = Buffer.from(encrypted, 'base64')
      expect(buf[0]).toBe(0x01)
    })

    it('rechaza descifrado si versión no es 0x01', () => {
      const plaintext = 'Texto original'
      const encrypted = encrypt(plaintext)
      const buf = Buffer.from(encrypted, 'base64')
      buf[0] = 0x02 // Cambiar versión
      const malformed = buf.toString('base64')
      expect(() => decrypt(malformed)).toThrow()
    })
  })

  describe('tamper detection', () => {
    it('rechaza ciphertext si fue modificado', () => {
      const plaintext = 'Datos intactos'
      const encrypted = encrypt(plaintext)
      const buf = Buffer.from(encrypted, 'base64')
      // Modificar un byte en el medio del ciphertext (no versión, no tag)
      buf[15] ^= 0xFF
      const modified = buf.toString('base64')
      expect(() => decrypt(modified)).toThrow()
    })

    it('rechaza si el auth tag fue modificado', () => {
      const plaintext = 'Protección contra tempering'
      const encrypted = encrypt(plaintext)
      const buf = Buffer.from(encrypted, 'base64')
      // Modificar el último byte (parte del tag)
      buf[buf.length - 1] ^= 0xFF
      const modified = buf.toString('base64')
      expect(() => decrypt(modified)).toThrow()
    })
  })

  describe('different plaintexts produce different ciphertexts', () => {
    it('el mismo plaintext con el mismo AAD genera diferentes ciphertexts (IV aleatorio)', () => {
      const plaintext = 'Mismo texto'
      const aad = 'cedula:userId=user1'
      const encrypted1 = encrypt(plaintext, aad)
      const encrypted2 = encrypt(plaintext, aad)
      // Deben ser diferentes debido a IV aleatorio
      expect(encrypted1).not.toBe(encrypted2)
      // Pero ambos deben descifrar al mismo plaintext
      expect(decrypt(encrypted1, aad)).toBe(plaintext)
      expect(decrypt(encrypted2, aad)).toBe(plaintext)
    })
  })

  describe('edge cases', () => {
    it('encripta y desencripta texto vacío', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('')
    })

    it('encripta y desencripta AAD muy largo', () => {
      const plaintext = 'Datos'
      const aad = 'a'.repeat(1000)
      const encrypted = encrypt(plaintext, aad)
      const decrypted = decrypt(encrypted, aad)
      expect(decrypted).toBe(plaintext)
    })

    it('rechaza descifrado si ciphertext está incompleto (truncado)', () => {
      const plaintext = 'Datos completos'
      const encrypted = encrypt(plaintext)
      const buf = Buffer.from(encrypted, 'base64')
      const truncated = buf.slice(0, buf.length - 5).toString('base64')
      expect(() => decrypt(truncated)).toThrow()
    })
  })
})
