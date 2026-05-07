import { describe, it, expect } from 'vitest'
import { setVolume, sessionVolumeByMuscle, weeklyVolumeByMuscle } from '@/lib/calc/volume'

describe('volume — Cálculo de Volumen de Entrenamiento', () => {
  describe('setVolume', () => {
    it('calcula volumen: 100kg × 10 reps = 1000', () => {
      const result = setVolume({ weight: 100, reps: 10 })
      expect(result).toBe(1000)
    })

    it('calcula volumen: 50kg × 12 reps = 600', () => {
      const result = setVolume({ weight: 50, reps: 12 })
      expect(result).toBe(600)
    })

    it('calcula volumen con peso 0: 0kg × 10 = 0', () => {
      const result = setVolume({ weight: 0, reps: 10 })
      expect(result).toBe(0)
    })

    it('lanza RangeError si peso < 0', () => {
      expect(() => setVolume({ weight: -10, reps: 10 })).toThrow(RangeError)
    })

    it('lanza RangeError si reps < 0', () => {
      expect(() => setVolume({ weight: 100, reps: -5 })).toThrow(RangeError)
    })
  })

  describe('sessionVolumeByMuscle', () => {
    it('agrega volumen por grupo muscular en una sesión', () => {
      const sets = [
        { muscle: 'CHEST' as const, weight: 100, reps: 10 },
        { muscle: 'CHEST' as const, weight: 100, reps: 8 },
        { muscle: 'BACK' as const, weight: 80, reps: 12 },
      ]
      const result = sessionVolumeByMuscle(sets)
      expect(result.CHEST).toBe(1000 + 800) // 1800
      expect(result.BACK).toBe(960)
    })

    it('retorna objeto vacío para sesión sin sets', () => {
      const result = sessionVolumeByMuscle([])
      expect(Object.keys(result).length).toBe(0)
    })

    it('solo incluye músculos que tienen sets', () => {
      const sets = [{ muscle: 'SHOULDERS' as const, weight: 60, reps: 15 }]
      const result = sessionVolumeByMuscle(sets)
      expect(result.SHOULDERS).toBe(900)
      expect(result.CHEST).toBeUndefined()
    })

    it('maneja peso 0 correctamente', () => {
      const sets = [{ muscle: 'LEGS' as const, weight: 0, reps: 20 }]
      const result = sessionVolumeByMuscle(sets)
      expect(result.LEGS).toBe(0)
    })
  })

  describe('weeklyVolumeByMuscle', () => {
    it('agrega volumen semanal correctamente', () => {
      const weekStart = new Date('2024-01-01') // Lunes
      const sessions = [
        {
          date: new Date('2024-01-01'),
          sets: [{ muscle: 'CHEST' as const, weight: 100, reps: 10 }],
        },
        {
          date: new Date('2024-01-03'),
          sets: [{ muscle: 'CHEST' as const, weight: 100, reps: 8 }],
        },
      ]
      const result = weeklyVolumeByMuscle(sessions, weekStart)
      expect(result.CHEST).toBe(1800)
    })

    it('excluye sesiones fuera de la semana', () => {
      const weekStart = new Date('2024-01-01')
      const sessions = [
        {
          date: new Date('2024-01-01'),
          sets: [{ muscle: 'BACK' as const, weight: 100, reps: 10 }],
        },
        {
          date: new Date('2024-01-09'), // Fuera de la semana
          sets: [{ muscle: 'BACK' as const, weight: 100, reps: 10 }],
        },
      ]
      const result = weeklyVolumeByMuscle(sessions, weekStart)
      expect(result.BACK).toBe(1000) // Solo la primera sesión
    })

    it('incluye sesiones hasta el último día de la semana (6 días después)', () => {
      const weekStart = new Date('2024-01-01')
      const sessionLastDay = new Date('2024-01-07') // Día 7
      const sessions = [
        {
          date: sessionLastDay,
          sets: [{ muscle: 'QUADS' as const, weight: 150, reps: 8 }],
        },
      ]
      const result = weeklyVolumeByMuscle(sessions, weekStart)
      expect(result.QUADS).toBe(1200)
    })

    it('excluye sesiones del día 8 en adelante', () => {
      const weekStart = new Date('2024-01-01')
      const sessionDay8 = new Date('2024-01-08')
      const sessions = [
        {
          date: sessionDay8,
          sets: [{ muscle: 'HAMSTRINGS' as const, weight: 100, reps: 10 }],
        },
      ]
      const result = weeklyVolumeByMuscle(sessions, weekStart)
      expect(result.HAMSTRINGS).toBeUndefined()
    })

    it('retorna objeto vacío para semana sin sesiones', () => {
      const weekStart = new Date('2024-01-01')
      const result = weeklyVolumeByMuscle([], weekStart)
      expect(Object.keys(result).length).toBe(0)
    })
  })
})
