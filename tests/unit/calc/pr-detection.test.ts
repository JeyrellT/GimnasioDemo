import { describe, it, expect } from 'vitest'
import { isPersonalRecord } from '@/lib/calc/pr-detection'

describe('pr-detection — Detección de Marca Personal', () => {
  describe('isPersonalRecord', () => {
    it('retorna isPr: false sin historial previo', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 100,
        reps: 5,
        history: [],
      })
      expect(result.isPr).toBe(false)
    })

    it('detecta PR de peso (nuevo peso > máximo anterior)', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 120,
        reps: 5,
        history: [
          { weight: 100, reps: 5, date: new Date('2024-01-01') },
          { weight: 110, reps: 3, date: new Date('2024-01-05') },
        ],
      })
      expect(result.isPr).toBe(true)
      expect(result.type).toBe('weight')
    })

    it('detecta PR de volumen cuando el volumen supera el máximo histórico', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 90,
        reps: 15, // volumen 1350
        history: [
          { weight: 100, reps: 10, date: new Date('2024-01-01') }, // volumen 1000
        ],
      })
      expect(result.isPr).toBe(true)
      expect(result.type).toBe('volume')
    })

    it('detecta PR de reps cuando es mismo peso exacto con más reps', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 100,
        reps: 15,
        history: [
          { weight: 90, reps: 20, date: new Date('2024-01-01') }, // No mismo peso
          { weight: 100, reps: 10, date: new Date('2024-01-05') }, // Mismo peso, menos reps
        ],
      })
      expect(result.isPr).toBe(true)
      expect(result.type).toBe('reps_at_weight')
    })

    it('prioriza weight sobre otros criterios', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 130,
        reps: 5,
        history: [
          { weight: 100, reps: 20, date: new Date('2024-01-01') },
        ],
      })
      expect(result.type).toBe('weight')
    })

    it('retorna false cuando no hay ningún tipo de PR', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 95,
        reps: 5,
        history: [
          { weight: 100, reps: 10, date: new Date('2024-01-01') },
        ],
      })
      expect(result.isPr).toBe(false)
    })

    it('maneja tolerancia float para comparación de pesos', () => {
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 100.0005,
        reps: 11,
        history: [
          { weight: 100.0, reps: 10, date: new Date('2024-01-01') },
        ],
      })
      expect(result.isPr).toBe(true)
    })

    it('lanza RangeError si peso < 0', () => {
      expect(() => isPersonalRecord({
        exerciseId: 'ex1',
        weight: -10,
        reps: 5,
        history: [],
      })).toThrow(RangeError)
    })

    it('lanza RangeError si reps < 1', () => {
      expect(() => isPersonalRecord({
        exerciseId: 'ex1',
        weight: 100,
        reps: 0,
        history: [],
      })).toThrow(RangeError)
    })

    it('retorna información del set previo cuando es PR', () => {
      const prevDate = new Date('2024-01-01')
      const result = isPersonalRecord({
        exerciseId: 'ex1',
        weight: 120,
        reps: 5,
        history: [
          { weight: 100, reps: 5, date: prevDate },
        ],
      })
      expect(result.previous?.weight).toBe(100)
      expect(result.previous?.reps).toBe(5)
      expect(result.previous?.date.getTime()).toBe(prevDate.getTime())
    })
  })
})
