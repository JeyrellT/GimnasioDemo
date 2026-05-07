import { describe, it, expect } from 'vitest'
import { recommendMacros } from '@/lib/calc/macros'

describe('macros — Distribución de Macronutrientes', () => {
  describe('recommendMacros', () => {
    it('calcula macros básicos para mantenimiento', () => {
      const result = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MAINTENANCE',
      })
      expect(result.tdeeAdjusted).toBe(2400)
      expect(result.proteinG).toBeGreaterThan(0)
      expect(result.fatG).toBeGreaterThan(0)
      expect(result.carbsG).toBeGreaterThan(0)
    })

    it('ajusta calorías según déficit', () => {
      const resultNoDef = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MAINTENANCE',
      })
      const resultDef = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 20,
        goal: 'MAINTENANCE',
      })
      expect(resultNoDef.tdeeAdjusted).toBe(2400)
      expect(resultDef.tdeeAdjusted).toBe(1920)
    })

    it('maximiza proteína para MUSCLE_GAIN: 2.2 g/kg', () => {
      const result = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MUSCLE_GAIN',
      })
      // 80 * 2.2 = 176
      expect(result.proteinG).toBeCloseTo(176, -1)
    })

    it('aumenta grasa para MUSCLE_GAIN: 1.2 g/kg', () => {
      const result = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MUSCLE_GAIN',
      })
      // 80 * 1.2 = 96
      expect(result.fatG).toBeCloseTo(96, -1)
    })

    it('calcula carbohidratos como calorías restantes', () => {
      const result = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MAINTENANCE',
      })
      const proteinKcal = result.proteinG * 4
      const fatKcal = result.fatG * 9
      const carbsKcal = result.carbsG * 4
      const total = proteinKcal + fatKcal + carbsKcal
      // Verificar que suma aproximadamente al TDEE
      expect(total).toBeCloseTo(result.tdeeAdjusted, -1)
    })

    it('puede retornar advertencias', () => {
      const result = recommendMacros({
        weightKg: 80,
        tdee: 1000, // TDEE muy bajo
        deficitPct: 50,
        goal: 'FAT_LOSS',
      })
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('lanza RangeError si weightKg <= 0', () => {
      expect(() => recommendMacros({
        weightKg: 0,
        tdee: 2400,
        deficitPct: 0,
        goal: 'MAINTENANCE',
      })).toThrow(RangeError)
    })

    it('lanza RangeError si TDEE <= 0', () => {
      expect(() => recommendMacros({
        weightKg: 80,
        tdee: 0,
        deficitPct: 0,
        goal: 'MAINTENANCE',
      })).toThrow(RangeError)
    })

    it('lanza RangeError si deficitPct > 70', () => {
      expect(() => recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 80,
        goal: 'MAINTENANCE',
      })).toThrow(RangeError)
    })

    it('ajusta proteína solo con déficit > 5%', () => {
      const resultLow = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 3,
        goal: 'MAINTENANCE',
      })
      const resultHigh = recommendMacros({
        weightKg: 80,
        tdee: 2400,
        deficitPct: 20,
        goal: 'MAINTENANCE',
      })
      expect(resultHigh.proteinG).toBeGreaterThan(resultLow.proteinG)
    })
  })
})
