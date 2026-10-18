import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '../services/api'
import { erreursDesChamps, messageErreur } from './erreurs'

describe('lecture des erreurs de l API', () => {
  it('renvoie le message d une erreur de l API', () => {
    const erreur = new ApiRequestError({
      code: 'IDENTIFIANTS_INVALIDES',
      message: 'E-mail ou mot de passe incorrect.',
    })

    expect(messageErreur(erreur)).toBe('E-mail ou mot de passe incorrect.')
  })

  it('renvoie un message général pour une autre erreur', () => {
    expect(messageErreur(new Error('panne'))).toBe('Une erreur inattendue est survenue.')
  })

  it('associe chaque champ à son message', () => {
    const erreur = new ApiRequestError({
      code: 'VALIDATION',
      message: 'Certains champs sont invalides.',
      details: {
        champs: {
          email: 'Adresse e-mail invalide.',
          motDePasse: 'Au moins 8 caractères.',
        },
      },
    })

    expect(erreursDesChamps(erreur)).toEqual({
      email: 'Adresse e-mail invalide.',
      motDePasse: 'Au moins 8 caractères.',
    })
  })

  it('ignore les messages qui ne sont pas du texte', () => {
    const erreur = new ApiRequestError({
      code: 'VALIDATION',
      message: 'Certains champs sont invalides.',
      details: { champs: { nom: 'Le nom est obligatoire.', email: 42 } },
    })

    expect(erreursDesChamps(erreur)).toEqual({ nom: 'Le nom est obligatoire.' })
  })

  it.each([
    ['sans détails', new ApiRequestError({ code: 'RESEAU', message: 'Hors ligne.' })],
    [
      'avec des détails sans champs',
      new ApiRequestError({ code: 'CONFLIT', message: 'Conflit.', details: { id: 'p-1' } }),
    ],
    [
      'avec des champs invalides',
      new ApiRequestError({ code: 'VALIDATION', message: 'Invalide.', details: { champs: null } }),
    ],
    ['qui ne vient pas de l API', new Error('panne')],
  ])('ne renvoie aucun champ pour une erreur %s', (_cas, erreur) => {
    expect(erreursDesChamps(erreur)).toEqual({})
  })
})
