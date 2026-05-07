import { describe, it, expect } from 'vitest'
import {
  startSessionSchema,
  recordSetSchema,
  completeSessionSchema,
  abortSessionSchema,
} from '@/lib/validation/session.schema'

describe('session.schema — Validación de Sesión', () => {
  describe('startSessionSchema', () => {
    it('valida sesión programada con rutina asignada', () => {
      const input = {
        assignedRoutineId: 'routine123',
        dayIndex: 0,
        isFreeWorkout: false,
      }
      const result = startSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('valida sesión libre sin rutina', () => {
      const input = {
        isFreeWorkout: true,
        bodyweightKg: 80.5,
      }
      const result = startSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza sesión programada sin assignedRoutineId', () => {
      const input = {
        dayIndex: 0,
        isFreeWorkout: false,
      }
      const result = startSessionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rechaza sesión programada sin dayIndex', () => {
      const input = {
        assignedRoutineId: 'routine123',
        isFreeWorkout: false,
      }
      const result = startSessionSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('usa default isFreeWorkout = false', () => {
      const input = {
        assignedRoutineId: 'routine123',
        dayIndex: 0,
      }
      const result = startSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isFreeWorkout).toBe(false)
      }
    })

    it('rechaza dayIndex fuera de 0-5', () => {
      expect(
        startSessionSchema.safeParse({
          assignedRoutineId: 'id',
          dayIndex: -1,
          isFreeWorkout: false,
        }).success
      ).toBe(false)
      expect(
        startSessionSchema.safeParse({
          assignedRoutineId: 'id',
          dayIndex: 6,
          isFreeWorkout: false,
        }).success
      ).toBe(false)
    })
  })

  describe('recordSetSchema', () => {
    it('valida registro de set básico', () => {
      const input = {
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 1,
        weightKg: 100,
        reps: 10,
      }
      const result = recordSetSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza setNumber < 1', () => {
      const result = recordSetSchema.safeParse({
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 0,
        weightKg: 100,
        reps: 10,
      })
      expect(result.success).toBe(false)
    })

    it('rechaza setNumber > 20', () => {
      const result = recordSetSchema.safeParse({
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 21,
        weightKg: 100,
        reps: 10,
      })
      expect(result.success).toBe(false)
    })

    it('valida set con RPE', () => {
      const input = {
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 1,
        reps: 10,
        rpe: 7,
      }
      const result = recordSetSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('usa default isWarmup = false y failed = false', () => {
      const input = {
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 1,
        weightKg: 100,
        reps: 10,
      }
      const result = recordSetSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isWarmup).toBe(false)
        expect(result.data.failed).toBe(false)
      }
    })

    it('valida set fallido', () => {
      const input = {
        sessionId: 'session123',
        exerciseId: 'ex456',
        setNumber: 3,
        weightKg: 120,
        reps: 8,
        failed: true,
      }
      const result = recordSetSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('completeSessionSchema', () => {
    it('valida completación básica de sesión', () => {
      const input = {
        sessionId: 'session123',
        totalDurationSec: 3600,
        subjectiveFatigue: 7,
        notes: 'Sesión intensa',
      }
      const result = completeSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza totalDurationSec > 7200 (2 horas)', () => {
      const result = completeSessionSchema.safeParse({
        sessionId: 'session123',
        totalDurationSec: 7201,
      })
      expect(result.success).toBe(false)
    })

    it('rechaza subjectiveFatigue < 1', () => {
      const result = completeSessionSchema.safeParse({
        sessionId: 'session123',
        totalDurationSec: 3600,
        subjectiveFatigue: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rechaza subjectiveFatigue > 10', () => {
      const result = completeSessionSchema.safeParse({
        sessionId: 'session123',
        totalDurationSec: 3600,
        subjectiveFatigue: 11,
      })
      expect(result.success).toBe(false)
    })

    it('valida sin notas', () => {
      const input = {
        sessionId: 'session123',
        totalDurationSec: 1800,
      }
      const result = completeSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('permite 0 segundos (muy rápido)', () => {
      const result = completeSessionSchema.safeParse({
        sessionId: 'session123',
        totalDurationSec: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('abortSessionSchema', () => {
    it('valida aborción básica', () => {
      const input = {
        sessionId: 'session123',
        reason: 'Lesión en hombro',
      }
      const result = abortSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('valida sin razón', () => {
      const input = {
        sessionId: 'session123',
      }
      const result = abortSessionSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza razón > 500 caracteres', () => {
      const result = abortSessionSchema.safeParse({
        sessionId: 'session123',
        reason: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })
})
