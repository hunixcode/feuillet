import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '../services/api'
import { erreursDesChamps, messageErreur, messageErreurStock } from './erreurs'

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

describe('erreurs des actions sur le stock', () => {
  it.each([
    ['inventaire', 'La quantité comptée ne peut pas être inférieure aux exemplaires mis de côté.'],
    ['defectueux', 'Impossible de déclarer abîmés plus d’exemplaires que le stock vendable.'],
    ['sortie', 'Impossible de sortir plus d’exemplaires que le stock défectueux.'],
  ] as const)('explique un stock insuffisant pour l action %s', (action, attendu) => {
    const erreur = new ApiRequestError({ code: 'STOCK_INSUFFISANT', message: 'Stock insuffisant.' })

    expect(messageErreurStock(erreur, action)).toBe(attendu)
  })

  it('demande de recharger quand le stock a changé', () => {
    const erreur = new ApiRequestError({ code: 'STOCK_MODIFIE', message: 'Conflit.' })

    expect(messageErreurStock(erreur, 'inventaire')).toBe(
      'Le stock a changé, rechargez et recommencez.',
    )
  })

  it('garde le message du serveur pour une autre erreur', () => {
    const erreur = new ApiRequestError({ code: 'INTROUVABLE', message: 'Produit introuvable.' })

    expect(messageErreurStock(erreur, 'sortie')).toBe('Produit introuvable.')
  })

  it('renvoie un message général pour une erreur qui ne vient pas de l API', () => {
    expect(messageErreurStock(new Error('panne'), 'defectueux')).toBe(
      'Une erreur inattendue est survenue.',
    )
  })
})
