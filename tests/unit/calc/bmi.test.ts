import { describe, it, expect } from 'vitest'
import { calculateBmi, classifyBmi } from '@/lib/calc/bmi'

describe('bmi — Índice de Masa Corporal', () => {
  describe('calculateBmi', () => {
    it('calcula IMC para 70kg, 175cm = 22.9', () => {
      const result = calculateBmi({ weightKg: 70, heightCm: 175 })
      expect(result).toBeCloseTo(22.9, 1)
    })

    it('calcula IMC para 60kg, 160cm = 23.4', () => {
      const result = calculateBmi({ weightKg: 60, heightCm: 160 })
      expect(result).toBeCloseTo(23.4, 1)
    })

    it('calcula IMC para 100kg, 180cm = 30.9', () => {
      const result = calculateBmi({ weightKg: 100, heightCm: 180 })
      expect(result).toBeCloseTo(30.9, 1)
    })

    it('retorna resultado con 1 decimal de precisión', () => {
      const result = calculateBmi({ weightKg: 75, heightCm: 170 })
      const decimalPlaces = (result.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(1)
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => calculateBmi({ weightKg: 0, heightCm: 175 })).toThrow(RangeError)
    })

    it('lanza RangeError si altura <= 0', () => {
      expect(() => calculateBmi({ weightKg: 70, heightCm: 0 })).toThrow(RangeError)
    })
  })

  describe('classifyBmi', () => {
    it('clasifica IMC < 16 como UNDERWEIGHT_SEVERE', () => {
      const result = classifyBmi(15.5)
      expect(result.category).toBe('UNDERWEIGHT_SEVERE')
      expect(result.label).toContain('severa')
    })

    it('clasifica IMC 18.5-24.99 como NORMAL', () => {
      const result = classifyBmi(22.0)
      expect(result.category).toBe('NORMAL')
      expect(result.label).toContain('normal')
    })

    it('clasifica IMC 25-29.99 como OVERWEIGHT', () => {
      const result = classifyBmi(27.5)
      expect(result.category).toBe('OVERWEIGHT')
      expect(result.label).toContain('Sobrepeso')
    })

    it('clasifica IMC 30-34.99 como OBESE_I', () => {
      const result = classifyBmi(32.0)
      expect(result.category).toBe('OBESE_I')
      expect(result.label).toContain('grado I')
    })

    it('clasifica IMC 35-39.99 como OBESE_II', () => {
      const result = classifyBmi(37.5)
      expect(result.category).toBe('OBESE_II')
      expect(result.label).toContain('grado II')
    })

    it('clasifica IMC >= 40 como OBESE_III', () => {
      const result = classifyBmi(42.0)
      expect(result.category).toBe('OBESE_III')
      expect(result.label).toContain('grado III')
    })

    it('clasifica UNDERWEIGHT en rango 16-18.49', () => {
      const result = classifyBmi(17.5)
      expect(result.category).toBe('UNDERWEIGHT')
      expect(result.label).toContain('Bajo peso')
    })

    it('lanza RangeError si IMC <= 0', () => {
      expect(() => classifyBmi(0)).toThrow(RangeError)
    })

    it('lanza RangeError si IMC es negativo', () => {
      expect(() => classifyBmi(-5)).toThrow(RangeError)
    })
  })
})
