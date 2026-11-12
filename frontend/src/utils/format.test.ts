import { describe, expect, it } from 'vitest'
import { formatDate, formatDateHeure, formatXPF } from './format'

describe('formatXPF', () => {
  it.each([
    [0, '0 XPF'],
    [1, '1 XPF'],
    [999, '999 XPF'],
    [1500, '1 500 XPF'],
    [1234567, '1 234 567 XPF'],
    [Number.MAX_SAFE_INTEGER, '9 007 199 254 740 991 XPF'],
    [-1, '-1 XPF'],
    [-1500, '-1 500 XPF'],
    [-1234567, '-1 234 567 XPF'],
    [Number.MIN_SAFE_INTEGER, '-9 007 199 254 740 991 XPF'],
  ])('formate %i XPF', (montant, resultat) => {
    expect(formatXPF(montant)).toBe(resultat)
  })

  it.each([
    ['un nombre décimal positif', 1.5],
    ['un nombre décimal négatif', -1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['un entier hors de la plage sûre', Number.MAX_SAFE_INTEGER + 1],
  ])('rejette %s', (_cas, montant) => {
    expect(() => formatXPF(montant)).toThrow(RangeError)
  })

  it.each([
    ['une chaîne numérique', '1500'],
    ['une chaîne vide', ''],
    ['un booléen vrai', true],
    ['un booléen faux', false],
    ['null', null],
    ['undefined', undefined],
    ['un objet', {}],
  ])('rejette %s', (_cas, montant) => {
    expect(() => formatXPF(montant as number)).toThrow(TypeError)
  })
})

describe('formatDate', () => {
  it('formate une date en français', () => {
    expect(formatDate('2026-10-11T12:00:00.000Z')).toBe('11 octobre 2026')
  })

  it('formate les dates au début et à la fin de l’année', () => {
    expect(formatDate('2026-01-01T12:00:00.000Z')).toBe('1 janvier 2026')
    expect(formatDate('2026-12-31T12:00:00.000Z')).toBe('31 décembre 2026')
  })

  it('formate correctement le jour bissextile', () => {
    expect(formatDate('2024-02-29T12:00:00.000Z')).toBe('29 février 2024')
  })

  it('garde le jour d’une date sans heure, quel que soit le fuseau', () => {
    expect(formatDate('2026-10-10')).toBe('10 octobre 2026')
    expect(formatDate('2026-01-01')).toBe('1 janvier 2026')
  })

  it('rejette une date vide ou invalide', () => {
    expect(() => formatDate('')).toThrow(RangeError)
    expect(() => formatDate('pas-une-date')).toThrow(RangeError)
  })
})

describe('formatDateHeure', () => {
  it('formate la date et l heure de Tahiti', () => {
    expect(formatDateHeure('2026-10-22T20:00:00.000Z')).toBe('22/10/2026 10:00')
  })

  it('garde le jour de Tahiti quand il est déjà le lendemain en UTC', () => {
    expect(formatDateHeure('2026-10-23T05:30:00.000Z')).toBe('22/10/2026 19:30')
  })
})
