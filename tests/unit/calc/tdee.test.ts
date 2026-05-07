import { describe, it, expect } from 'vitest'
import { calculateTdee, tdeeWithDeficit, ACTIVITY_FACTORS } from '@/lib/calc/tdee'

describe('tdee — Gasto Energético Total Diario', () => {
  describe('calculateTdee', () => {
    it('calcula TDEE para sedentario: 1800 TMB × 1.2 = 2160', () => {
      expect(calculateTdee({ tmb: 1800, level: 'SEDENTARY' })).toBe(2160)
    })

    it('calcula TDEE para activo ligero: 1500 × 1.375 = 2062.5 → 2063', () => {
      expect(calculateTdee({ tmb: 1500, level: 'LIGHT' })).toBeCloseTo(2063, 0)
    })

    it('calcula TDEE para actividad moderada: 1800 × 1.55 = 2790', () => {
      expect(calculateTdee({ tmb: 1800, level: 'MODERATE' })).toBe(2790)
    })

    it('calcula TDEE para atleta: 2000 × 1.9 = 3800', () => {
      expect(calculateTdee({ tmb: 2000, level: 'ATHLETE' })).toBe(3800)
    })

    it('lanza RangeError si TMB <= 0', () => {
      expect(() => calculateTdee({ tmb: 0, level: 'MODERATE' })).toThrow(RangeError)
    })

    it('retorna entero redondeado', () => {
      const result = calculateTdee({ tmb: 1600, level: 'LIGHT' })
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('tdeeWithDeficit', () => {
    it('aplica déficit de 10%: 2000 × 0.9 = 1800', () => {
      const result = tdeeWithDeficit({ tdee: 2000, deficitPct: 10 })
      expect(result.value).toBe(1800)
      expect(result.warning).toBeUndefined()
    })

    it('aplica déficit de 20%: 2000 × 0.8 = 1600', () => {
      const result = tdeeWithDeficit({ tdee: 2000, deficitPct: 20 })
      expect(result.value).toBe(1600)
      expect(result.warning).toBeUndefined()
    })

    it('devuelve advertencia para déficit > 25%', () => {
      const result = tdeeWithDeficit({ tdee: 2000, deficitPct: 30 })
      expect(result.value).toBe(1400)
      expect(result.warning).toContain('agresivo')
    })

    it('devuelve advertencia crítica para déficit > 35%', () => {
      const result = tdeeWithDeficit({ tdee: 2000, deficitPct: 40 })
      expect(result.value).toBe(1200)
      expect(result.warning).toContain('crítico')
    })

    it('sin déficit (0%): retorna TDEE sin cambios', () => {
      const result = tdeeWithDeficit({ tdee: 2000, deficitPct: 0 })
      expect(result.value).toBe(2000)
      expect(result.warning).toBeUndefined()
    })

    it('lanza RangeError si TDEE <= 0', () => {
      expect(() => tdeeWithDeficit({ tdee: 0, deficitPct: 10 })).toThrow(RangeError)
    })

    it('lanza RangeError si deficitPct < 0', () => {
      expect(() => tdeeWithDeficit({ tdee: 2000, deficitPct: -5 })).toThrow(RangeError)
    })

    it('lanza RangeError si deficitPct > 70', () => {
      expect(() => tdeeWithDeficit({ tdee: 2000, deficitPct: 80 })).toThrow(RangeError)
    })
  })

  describe('ACTIVITY_FACTORS', () => {
    it('contiene todos los niveles esperados', () => {
      expect(ACTIVITY_FACTORS).toHaveProperty('SEDENTARY')
      expect(ACTIVITY_FACTORS).toHaveProperty('LIGHT')
      expect(ACTIVITY_FACTORS).toHaveProperty('MODERATE')
      expect(ACTIVITY_FACTORS).toHaveProperty('ACTIVE')
      expect(ACTIVITY_FACTORS).toHaveProperty('ATHLETE')
    })

    it('tiene factores en orden creciente', () => {
      const factors = [
        ACTIVITY_FACTORS.SEDENTARY,
        ACTIVITY_FACTORS.LIGHT,
        ACTIVITY_FACTORS.MODERATE,
        ACTIVITY_FACTORS.ACTIVE,
        ACTIVITY_FACTORS.ATHLETE,
      ]
      for (let i = 0; i < factors.length - 1; i++) {
        expect(factors[i]).toBeLessThan(factors[i + 1])
      }
    })
  })
})
