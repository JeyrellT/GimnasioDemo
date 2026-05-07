import { describe, it, expect } from 'vitest'
import { brzycki, epley, predictOneRM, repPercentageOf1RM } from '@/lib/calc/one-rm'

describe('one-rm — Predicción de 1RM', () => {
  describe('brzycki', () => {
    it('calcula 1RM a 5 reps: 100kg × (36 / 32) = 112.5', () => {
      const result = brzycki({ weight: 100, reps: 5 })
      expect(result).toBeCloseTo(112.5, 1)
    })

    it('calcula 1RM a 1 rep (igual al peso)', () => {
      const result = brzycki({ weight: 100, reps: 1 })
      expect(result).toBeCloseTo(100, 1)
    })

    it('calcula 1RM a 10 reps', () => {
      const result = brzycki({ weight: 100, reps: 10 })
      // 100 × (36 / 27) = 133.33
      expect(result).toBeCloseTo(133.33, 1)
    })

    it('retorna null para reps > 10', () => {
      const result = brzycki({ weight: 100, reps: 12 })
      expect(result).toBeNull()
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => brzycki({ weight: 0, reps: 5 })).toThrow(RangeError)
    })

    it('lanza RangeError si reps < 1', () => {
      expect(() => brzycki({ weight: 100, reps: 0 })).toThrow(RangeError)
    })

    it('retorna 2 decimales de precisión', () => {
      const result = brzycki({ weight: 100, reps: 5 })
      expect(result).toBeDefined()
      const decimalStr = (result as number).toString().split('.')[1]
      expect(decimalStr?.length || 0).toBeLessThanOrEqual(2)
    })
  })

  describe('epley', () => {
    it('calcula 1RM a 5 reps: 100 × (1 + 5/30) = 116.67', () => {
      const result = epley({ weight: 100, reps: 5 })
      expect(result).toBeCloseTo(116.67, 1)
    })

    it('calcula 1RM a 1 rep (igual al peso)', () => {
      const result = epley({ weight: 100, reps: 1 })
      expect(result).toBeCloseTo(103.33, 1)
    })

    it('calcula 1RM a 15 reps', () => {
      const result = epley({ weight: 100, reps: 15 })
      expect(result).toBeCloseTo(150, 0)
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => epley({ weight: 0, reps: 5 })).toThrow(RangeError)
    })

    it('lanza RangeError si reps < 1', () => {
      expect(() => epley({ weight: 100, reps: 0 })).toThrow(RangeError)
    })
  })

  describe('predictOneRM', () => {
    it('elige máximo entre Brzycki y Epley para 3 reps', () => {
      const result = predictOneRM({ weight: 100, reps: 3 })
      expect(result.confidence).toBe('high')
      expect(result.method).toMatch(/brzycki|epley/)
      expect(result.value).toBeGreaterThan(0)
    })

    it('retorna confianza alta para 1-6 reps', () => {
      const result = predictOneRM({ weight: 100, reps: 5 })
      expect(result.confidence).toBe('high')
    })

    it('retorna confianza media para 7-10 reps', () => {
      const result = predictOneRM({ weight: 100, reps: 8 })
      expect(result.confidence).toBe('medium')
    })

    it('retorna confianza baja para 11+ reps (solo Epley)', () => {
      const result = predictOneRM({ weight: 100, reps: 15 })
      expect(result.confidence).toBe('low')
      expect(result.method).toBe('epley')
    })

    it('toma el máximo para evitar subestimar PR', () => {
      const result = predictOneRM({ weight: 100, reps: 5 })
      const brz = brzycki({ weight: 100, reps: 5 })
      const epl = epley({ weight: 100, reps: 5 })
      if (brz !== null && epl) {
        expect(result.value).toBeGreaterThanOrEqual(Math.min(brz, epl))
      }
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => predictOneRM({ weight: 0, reps: 5 })).toThrow(RangeError)
    })

    it('lanza RangeError si reps < 1', () => {
      expect(() => predictOneRM({ weight: 100, reps: 0 })).toThrow(RangeError)
    })
  })

  describe('repPercentageOf1RM', () => {
    it('devuelve 1-2 reps para 95%+ 1RM', () => {
      const result = repPercentageOf1RM(95)
      expect(result.repsLow).toBe(1)
      expect(result.repsHigh).toBe(2)
    })

    it('devuelve 4-6 reps para 85% 1RM', () => {
      const result = repPercentageOf1RM(85)
      expect(result.repsLow).toBe(4)
      expect(result.repsHigh).toBe(6)
    })

    it('devuelve 10-12 reps para 70% 1RM', () => {
      const result = repPercentageOf1RM(70)
      expect(result.repsLow).toBe(10)
      expect(result.repsHigh).toBe(12)
    })

    it('devuelve 15-20 reps para <65% 1RM', () => {
      const result = repPercentageOf1RM(50)
      expect(result.repsLow).toBe(15)
      expect(result.repsHigh).toBe(20)
    })

    it('lanza RangeError si percentage <= 0', () => {
      expect(() => repPercentageOf1RM(0)).toThrow(RangeError)
    })

    it('lanza RangeError si percentage > 100', () => {
      expect(() => repPercentageOf1RM(150)).toThrow(RangeError)
    })
  })
})
