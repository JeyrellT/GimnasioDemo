import { cuid } from '@paralleldrive/cuid2'

export interface UserFixture {
  id: string
  email: string
  name: string
  role: 'TRAINER' | 'CLIENT' | 'ADMIN'
  locale: string
}

export function makeUser(overrides?: Partial<UserFixture>): UserFixture {
  const id = cuid()
  return {
    id,
    email: `user-${id}@forja.app`,
    name: 'Test User',
    role: 'CLIENT',
    locale: 'es-CR',
    ...overrides,
  }
}

export interface RoutineSnapshotFixture {
  templateId: string
  templateName: string
  goal: string
  splitDays: number
  durationWeeks: number
  days: {
    dayIndex: number
    name: string
    exercises: {
      exerciseId: string
      nameEs: string
      order: number
      targetSets: number
      targetRepsMin: number
      targetRepsMax: number
      targetRpe: number | null
      restSeconds: number
      tempo: string | null
      supersetGroup: number | null
      notes: string | null
    }[]
  }[]
  snapshotAt: string
}

export function makeRoutineSnapshot(overrides?: Partial<RoutineSnapshotFixture>): RoutineSnapshotFixture {
  return {
    templateId: cuid(),
    templateName: 'Full Body',
    goal: 'HYPERTROPHY',
    splitDays: 3,
    durationWeeks: 8,
    days: [
      {
        dayIndex: 0,
        name: 'Lunes - Pecho y Tríceps',
        exercises: [
          {
            exerciseId: cuid(),
            nameEs: 'Press de Banca',
            order: 0,
            targetSets: 4,
            targetRepsMin: 8,
            targetRepsMax: 10,
            targetRpe: null,
            restSeconds: 120,
            tempo: null,
            supersetGroup: null,
            notes: null,
          },
          {
            exerciseId: cuid(),
            nameEs: 'Extensiones de Tríceps',
            order: 1,
            targetSets: 3,
            targetRepsMin: 10,
            targetRepsMax: 12,
            targetRpe: null,
            restSeconds: 90,
            tempo: null,
            supersetGroup: null,
            notes: null,
          },
        ],
      },
      {
        dayIndex: 1,
        name: 'Miércoles - Espalda y Bíceps',
        exercises: [
          {
            exerciseId: cuid(),
            nameEs: 'Peso Muerto',
            order: 0,
            targetSets: 4,
            targetRepsMin: 5,
            targetRepsMax: 7,
            targetRpe: null,
            restSeconds: 150,
            tempo: null,
            supersetGroup: null,
            notes: null,
          },
        ],
      },
      {
        dayIndex: 2,
        name: 'Viernes - Piernas',
        exercises: [
          {
            exerciseId: cuid(),
            nameEs: 'Sentadilla',
            order: 0,
            targetSets: 4,
            targetRepsMin: 8,
            targetRepsMax: 10,
            targetRpe: null,
            restSeconds: 120,
            tempo: null,
            supersetGroup: null,
            notes: null,
          },
        ],
      },
    ],
    snapshotAt: new Date().toISOString(),
    ...overrides,
  }
}

export interface PerformedSetFixture {
  weight: number
  reps: number
  setNumber: number
  isWarmup: boolean
  failed: boolean
}

export function makePerformedSets(count: number): PerformedSetFixture[] {
  return Array.from({ length: count }, (_, i) => ({
    weight: 100 + i * 5,
    reps: 10 - i,
    setNumber: i + 1,
    isWarmup: i === 0,
    failed: false,
  }))
}
