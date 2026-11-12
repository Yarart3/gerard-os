import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { checkMyOrder, correctRephrase, fixMySentence, generateOrderSentences, generateRephrase, profileContext, songLesson, vocabBatch } from './prompts'
import { AiError, runAi, type AiCall } from './run'
import { songLessonSchema } from './schemas'
import { DEFAULT_LEVEL, EMPTY_ANSWERS, type EnglishProfile } from '../profile'

const schema = z.object({ ok: z.boolean() })
const task = { system: 's', prompt: 'p', schema }
const reply = (text: string): ReturnType<AiCall> => Promise.resolve({ ok: true, text })

describe('runAi: JSON + Zod + un reintento', () => {
  it('devuelve el valor validado a la primera', async () => {
    const call = vi.fn<AiCall>(() => reply('{"ok":true}'))
    await expect(runAi(task, { call })).resolves.toEqual({ ok: true })
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('si no valida, reintenta UNA vez enviando el error', async () => {
    const call = vi.fn<AiCall>().mockReturnValueOnce(reply('{"ok":"si"}')).mockReturnValueOnce(reply('{"ok":false}'))
    await expect(runAi(task, { call })).resolves.toEqual({ ok: false })
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls[1]![0]!.prompt ?? '').toContain('Schema validation failed')
    expect(call.mock.calls[1]![0]!.prompt?.startsWith('p')).toBe(true)
  })
  it('JSON roto también se reintenta; a la segunda falla con AiError invalid', async () => {
    const call = vi.fn<AiCall>(() => reply('no es json'))
    await expect(runAi(task, { call })).rejects.toMatchObject({ code: 'invalid' })
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('sin IA (límite, sin red) lanza AiError unavailable sin reintentar', async () => {
    const call = vi.fn<AiCall>(() => Promise.resolve({ ok: false, error: 'Límite diario de IA alcanzado' }))
    const err = await runAi(task, { call }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiError)
    expect((err as AiError).message).toMatch(/Límite/)
    expect(call).toHaveBeenCalledTimes(1)
  })
})

describe('esquema de la lección de canción', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `line number ${i + 1} words here`)
  const lesson = (gapLines: number[]) => ({
    summary: 's',
    vocabulary: [],
    colloquial: [],
    grammar: [],
    rephrase: [],
    questions: [],
    gaps: gapLines.map((line) => ({ line, word: 'words', level: 1 })),
  })
  it('acepta huecos repartidos por toda la letra', () => {
    expect(songLessonSchema(lines).safeParse(lesson([1, 2, 5, 6, 10, 11])).success).toBe(true)
  })
  it('rechaza huecos concentrados al principio', () => {
    expect(songLessonSchema(lines).safeParse(lesson([1, 1, 2, 2, 3, 3])).success).toBe(false)
  })
  it('rechaza un hueco cuya palabra no está en el verso', () => {
    const l = lesson([1, 2, 5, 6, 10, 11])
    l.gaps[0]!.word = 'zebra'
    expect(songLessonSchema(lines).safeParse(l).success).toBe(false)
  })
})

describe('prompts', () => {
  const profile: EnglishProfile = {
    level: DEFAULT_LEVEL,
    answers: { ...EMPTY_ANSWERS, explain: 'mix', topics: ['tech', 'gym'], fun: 'dato de prueba' },
  }
  it('usan nivel, idioma de explicación, temas y detalles del perfil', () => {
    const t = generateRephrase(profile, 'Passive', 5)
    expect(t.system).toContain('B2')
    expect(t.system).toContain('Castilian Spanish')
    expect(t.system).toContain('technology and programming')
    expect(profileContext(profile)).toContain('dato de prueba')
  })
  it('cada tarea pide JSON y trae su esquema', () => {
    const tasks = [
      generateRephrase(profile, 'x', 3),
      correctRephrase(profile, 'a', 'b', 'c'),
      fixMySentence(profile, 'a'),
      vocabBatch(profile, 10),
      songLesson(profile, 'A', 'T', ['l1', 'l2']),
      generateOrderSentences(profile, 'r', 3),
      checkMyOrder(profile, 'es', ['a b'], 'b a'),
    ]
    for (const t of tasks) {
      expect(t.system).toContain('strict JSON')
      expect(t.prompt).toContain('Schema:')
    }
  })
})
