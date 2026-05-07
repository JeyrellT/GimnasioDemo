import { describe, it, expect } from 'vitest'
import {
  mifflinStJeor,
  katchMcArdle,
  recommendedTmb,
  type MifflinParams,
  type KatchParams,
} from '@/lib/calc/tmb'

describe('tmb — Tasa Metabólica Basal', () => {
  describe('mifflinStJeor', () => {
    it('calcula TMB para hombre de 80kg, 180cm, 30 años', () => {
      const params: MifflinParams = {
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      }
      const result = mifflinStJeor(params)
      expect(result).toBe(1780)
    })

    it('calcula TMB para mujer de 65kg, 165cm, 25 años', () => {
      const params: MifflinParams = {
        sex: 'FEMALE',
        weightKg: 65,
        heightCm: 165,
        ageYears: 25,
      }
      const result = mifflinStJeor(params)
      expect(result).toBe(1395)
    })

    it('promedia fórmulas para sexo OTHER', () => {
      const params: MifflinParams = {
        sex: 'OTHER',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      }
      const result = mifflinStJeor(params)
      // Male: 1780, Female: 1614, Promedio: 1697
      expect(result).toBe(1697)
    })

    it('promedia fórmulas para sexo PREFER_NOT_SAY', () => {
      const params: MifflinParams = {
        sex: 'PREFER_NOT_SAY',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      }
      const result = mifflinStJeor(params)
      expect(result).toBe(1697)
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => mifflinStJeor({
        sex: 'MALE',
        weightKg: 0,
        heightCm: 180,
        ageYears: 30,
      })).toThrow(RangeError)
    })

    it('lanza RangeError si altura <= 0', () => {
      expect(() => mifflinStJeor({
        sex: 'MALE',
        weightKg: 80,
        heightCm: 0,
        ageYears: 30,
      })).toThrow(RangeError)
    })

    it('lanza RangeError si edad < 10', () => {
      expect(() => mifflinStJeor({
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 5,
      })).toThrow(RangeError)
    })

    it('lanza RangeError si edad > 100', () => {
      expect(() => mifflinStJeor({
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 150,
      })).toThrow(RangeError)
    })
  })

  describe('katchMcArdle', () => {
    it('calcula TMB con composición corporal: 80kg, 20% grasa', () => {
      const result = katchMcArdle({
        weightKg: 80,
        bodyFatPct: 20,
      })
      expect(result).toBe(1752)
    })

    it('calcula TMB con bajo porcentaje de grasa: 70kg, 10%', () => {
      const result = katchMcArdle({
        weightKg: 70,
        bodyFatPct: 10,
      })
      expect(result).toBe(1731)
    })

    it('calcula TMB con alto porcentaje de grasa: 90kg, 35%', () => {
      const result = katchMcArdle({
        weightKg: 90,
        bodyFatPct: 35,
      })
      expect(result).toBe(1634)
    })

    it('lanza RangeError si peso <= 0', () => {
      expect(() => katchMcArdle({
        weightKg: 0,
        bodyFatPct: 20,
      })).toThrow(RangeError)
    })

    it('lanza RangeError si bodyFatPct < 0', () => {
      expect(() => katchMcArdle({
        weightKg: 80,
        bodyFatPct: -5,
      })).toThrow(RangeError)
    })

    it('lanza RangeError si bodyFatPct >= 100', () => {
      expect(() => katchMcArdle({
        weightKg: 80,
        bodyFatPct: 100,
      })).toThrow(RangeError)
    })
  })

  describe('recommendedTmb', () => {
    it('elige Katch cuando bodyFatPct está disponible', () => {
      const result = recommendedTmb({
        method: 'auto',
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        bodyFatPct: 20,
      })
      expect(result.method).toBe('katch')
      expect(result.value).toBe(1752)
    })

    it('elige Mifflin cuando bodyFatPct es undefined', () => {
      const result = recommendedTmb({
        method: 'auto',
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      })
      expect(result.method).toBe('mifflin')
      expect(result.value).toBe(1780)
    })

    it('elige Mifflin cuando bodyFatPct es null', () => {
      const result = recommendedTmb({
        method: 'auto',
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        bodyFatPct: null,
      })
      expect(result.method).toBe('mifflin')
      expect(result.value).toBe(1780)
    })
  })
})
