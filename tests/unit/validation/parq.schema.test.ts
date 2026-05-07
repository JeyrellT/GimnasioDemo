import { describe, it, expect } from 'vitest'
import {
  parqAnswersSchema,
  PARQ_QUESTIONS,
  evaluateParq,
  type ParqAnswer,
} from '@/lib/validation/parq.schema'

describe('parq.schema — PAR-Q+ 2024 Validation', () => {
  describe('parqAnswersSchema', () => {
    it('valida un formulario PAR-Q completo correctamente respondido', () => {
      const input = {
        answers: PARQ_QUESTIONS.map(q => ({
          questionCode: q.code,
          answer: false,
          followUpNotes: undefined,
        })),
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza si faltan preguntas', () => {
      const input = {
        answers: [
          { questionCode: 'P1' as const, answer: false },
          { questionCode: 'P2' as const, answer: false },
          // Faltan P3-P10
        ],
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rechaza si hay preguntas duplicadas', () => {
      const answers = PARQ_QUESTIONS.slice(0, 9).map(q => ({
        questionCode: q.code,
        answer: false,
      }))
      answers.push({ questionCode: 'P1' as const, answer: false }) // Duplicado
      const input = { answers }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('valida con follow-up notes cuando answer es true', () => {
      const input = {
        answers: PARQ_QUESTIONS.map(q => ({
          questionCode: q.code,
          answer: q.code === 'P1', // P1 true, resto false
          followUpNotes: q.code === 'P1' ? 'Tengo arritmia diagnosticada' : undefined,
        })),
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rechaza código de pregunta inválido', () => {
      const input = {
        answers: [
          { questionCode: 'P1' as const, answer: false },
          { questionCode: 'P2' as const, answer: false },
          // Llenar resto con válidos...
          ...PARQ_QUESTIONS.slice(2).map(q => ({
            questionCode: q.code,
            answer: false,
          })),
          { questionCode: 'INVALID', answer: false }, // Código inválido
        ],
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rechaza si answer no es booleano', () => {
      const input = {
        answers: PARQ_QUESTIONS.map(q => ({
          questionCode: q.code,
          answer: q.code === 'P1' ? 'sí' : false, // String en lugar de boolean
        })),
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rechaza followUpNotes > 1000 caracteres', () => {
      const input = {
        answers: PARQ_QUESTIONS.map(q => ({
          questionCode: q.code,
          answer: false,
          followUpNotes: 'a'.repeat(1001),
        })),
      }
      const result = parqAnswersSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('evaluateParq', () => {
    it('retorna GREEN cuando todas las respuestas son negativas', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: false,
      }))
      const result = evaluateParq(answers)
      expect(result.status).toBe('GREEN')
      expect(result.message).toBeNull()
    })

    it('retorna RED cuando P1 (crítica) es positiva', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.code === 'P1',
      }))
      const result = evaluateParq(answers)
      expect(result.status).toBe('RED')
      expect(result.message).toContain('médico')
      expect(result.redFlags).toContain('P1')
    })

    it('retorna RED cuando P2 (crítica) es positiva', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.code === 'P2',
      }))
      const result = evaluateParq(answers)
      expect(result.status).toBe('RED')
      expect(result.redFlags).toContain('P2')
    })

    it('retorna REVIEW cuando preguntas no-críticas son positivas', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.code === 'P3' || q.code === 'P5', // No críticas
      }))
      const result = evaluateParq(answers)
      expect(result.status).toBe('REVIEW')
      expect(result.message).toContain('entrenador revisará')
      expect(result.redFlags).toContain('P3')
      expect(result.redFlags).toContain('P5')
    })

    it('retorna RED si hay mezcla de crítica + no-crítica', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.code === 'P1' || q.code === 'P3', // P1 es crítica
      }))
      const result = evaluateParq(answers)
      expect(result.status).toBe('RED') // Prioridad a crítica
    })

    it('incluye todos los códigos de preguntas con respuesta afirmativa en redFlags', () => {
      const answers: ParqAnswer[] = PARQ_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.code === 'P4' || q.code === 'P6' || q.code === 'P8',
      }))
      const result = evaluateParq(answers)
      expect(result.redFlags).toHaveLength(3)
      expect(result.redFlags).toContain('P4')
      expect(result.redFlags).toContain('P6')
      expect(result.redFlags).toContain('P8')
    })
  })

  describe('PARQ_QUESTIONS', () => {
    it('contiene exactamente 10 preguntas', () => {
      expect(PARQ_QUESTIONS).toHaveLength(10)
    })

    it('códigos van de P1 a P10', () => {
      const codes = PARQ_QUESTIONS.map(q => q.code)
      expect(codes).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'])
    })

    it('P1 y P2 están marcadas como críticas', () => {
      const p1 = PARQ_QUESTIONS.find(q => q.code === 'P1')
      const p2 = PARQ_QUESTIONS.find(q => q.code === 'P2')
      expect(p1?.critical).toBe(true)
      expect(p2?.critical).toBe(true)
    })

    it('P3-P10 no son críticas', () => {
      const nonCritical = PARQ_QUESTIONS.slice(2)
      nonCritical.forEach(q => {
        expect(q.critical).toBe(false)
      })
    })

    it('todas las preguntas tienen texto', () => {
      PARQ_QUESTIONS.forEach(q => {
        expect(q.text).toBeTruthy()
        expect(q.text.length).toBeGreaterThan(10)
      })
    })

    it('muchas preguntas tienen follow-up (no todas, es opcional)', () => {
      const withFollowUp = PARQ_QUESTIONS.filter(q => q.followUpPrompt)
      expect(withFollowUp.length).toBeGreaterThan(0)
    })
  })
})
