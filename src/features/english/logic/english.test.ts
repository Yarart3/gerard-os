import { describe, expect, it } from 'vitest'
import { todayISO } from '../../../lib/dates'
import { applyPoints, currentStreak, lastSevenDays } from './daily'
import { diffScore, diffWords, isPerfect, sameTerm } from './diff'
import { BOX_DAYS, boxCounts, isDue, reviewCard } from './leitner'
import { checkOrder, shuffleWords, tokenize } from './wordOrder'

describe('Leitner', () => {
  it('intervalos de las cajas: 1, 3, 7 y 16 días', () => {
    expect(BOX_DAYS).toEqual({ 1: 1, 2: 3, 3: 7, 4: 16 })
  })
  it('acierto sube de caja y programa según la nueva caja', () => {
    expect(reviewCard({ box: 1 }, true, '2026-11-12')).toEqual({ box: 2, due_on: '2026-11-15' })
    expect(reviewCard({ box: 2 }, true, '2026-11-12')).toEqual({ box: 3, due_on: '2026-11-19' })
    expect(reviewCard({ box: 3 }, true, '2026-11-12')).toEqual({ box: 4, due_on: '2026-11-28' })
  })
  it('la caja 4 no pasa de 4', () => {
    expect(reviewCard({ box: 4 }, true, '2026-11-12')).toEqual({ box: 4, due_on: '2026-11-28' })
  })
  it('un fallo devuelve a la caja 1 (repaso al día siguiente)', () => {
    expect(reviewCard({ box: 4 }, false, '2026-11-12')).toEqual({ box: 1, due_on: '2026-11-13' })
  })
  it('vencimiento y recuento por cajas', () => {
    expect(isDue({ box: 1, due_on: '2026-11-12' }, '2026-11-12')).toBe(true)
    expect(isDue({ box: 1, due_on: '2026-11-13' }, '2026-11-12')).toBe(false)
    expect(boxCounts([{ box: 1 }, { box: 1 }, { box: 4 }])).toEqual({ 1: 2, 2: 0, 3: 0, 4: 1 })
  })
})

describe('diff palabra a palabra', () => {
  it('detecta correcta, incorrecta, que falta y sobrante', () => {
    const d = diffWords('I am going to the gym', 'I going too the gym now')
    expect(d).toEqual([
      { type: 'ok', word: 'I' },
      { type: 'missing', expected: 'am' },
      { type: 'ok', word: 'going' },
      { type: 'wrong', expected: 'to', got: 'too' },
      { type: 'ok', word: 'the' },
      { type: 'ok', word: 'gym' },
      { type: 'extra', got: 'now' },
    ])
    expect(diffScore(d)).toBe(67)
  })
  it('ignora mayúsculas y puntuación', () => {
    expect(isPerfect(diffWords("Don't deploy, please!", "don't deploy please"))).toBe(true)
  })
  it('respuesta vacía: todo falta', () => {
    const d = diffWords('hello world', '')
    expect(d.every((x) => x.type === 'missing')).toBe(true)
    expect(diffScore(d)).toBe(0)
  })
  it('sameTerm ignora el "to" de los verbos', () => {
    expect(sameTerm('cope with', 'to cope with')).toBe(true)
    expect(sameTerm('Cope  With', 'to cope with')).toBe(true)
    expect(sameTerm('cope', 'to cope with')).toBe(false)
  })
})

describe('orden de palabras', () => {
  const accepted = ['I usually train in the morning.', 'Usually I train in the morning.']
  it('acepta cualquiera de los órdenes válidos', () => {
    expect(checkOrder(tokenize('Usually I train in the morning'), accepted)).toBe(true)
    expect(checkOrder(tokenize('I usually train in the morning.'), accepted)).toBe(true)
  })
  it('rechaza órdenes no aceptados o vacíos', () => {
    expect(checkOrder(tokenize('I train usually in the morning'), accepted)).toBe(false)
    expect(checkOrder([], accepted)).toBe(false)
  })
  it('el desorden es determinista y nunca deja la frase resuelta', () => {
    const t = tokenize('I usually train in the morning.')
    const a = shuffleWords(t, 42)
    expect(a).toEqual(shuffleWords(t, 42))
    expect(a.join(' ')).not.toBe(t.join(' '))
    expect([...a].sort()).toEqual([...t].sort())
  })
})

describe('puntos y racha (Europe/Madrid)', () => {
  it('"hoy" usa la fecha de Madrid, no la UTC', () => {
    expect(todayISO(new Date('2026-11-12T23:30:00Z'), 0)).toBe('2026-11-13')
  })
  it('la racha crece al practicar días seguidos y se reinicia tras un hueco', () => {
    const d1 = applyPoints([], '2026-11-10', 5)
    expect(d1).toEqual({ date: '2026-11-10', points: 5, streak: 1 })
    const d2 = applyPoints([d1], '2026-11-11', 3)
    expect(d2.streak).toBe(2)
    expect(applyPoints([d1, d2], '2026-11-11', 4)).toEqual({ date: '2026-11-11', points: 7, streak: 2 })
    expect(applyPoints([d1, d2], '2026-11-14', 1).streak).toBe(1)
  })
  it('racha vigente: hoy, ayer (aún viva) o rota', () => {
    const rows = [{ date: '2026-11-11', points: 10, streak: 4 }]
    expect(currentStreak(rows, '2026-11-12')).toBe(4)
    expect(currentStreak(rows, '2026-11-13')).toBe(0)
    expect(currentStreak([...rows, { date: '2026-11-12', points: 2, streak: 5 }], '2026-11-12')).toBe(5)
  })
  it('últimos siete días', () => {
    const w = lastSevenDays([{ date: '2026-11-12', points: 9, streak: 1 }], '2026-11-12')
    expect(w).toHaveLength(7)
    expect(w[6]).toEqual({ date: '2026-11-12', points: 9 })
    expect(w[0]!.date).toBe('2026-11-06')
  })
})
