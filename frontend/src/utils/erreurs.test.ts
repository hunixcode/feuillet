import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '../services/api'
import {
  codeErreur,
  erreursDesChamps,
  messageErreur,
  messageErreurReception,
  messageErreurRetour,
  messageErreurStock,
} from './erreurs'

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

describe('erreurs des réceptions fournisseur', () => {
  function erreur(code: string, details?: unknown) {
    return new ApiRequestError({ code, message: 'Message du serveur.', details })
  }

  it('explique une quantité reçue supérieure au restant', () => {
    expect(messageErreurReception(erreur('QUANTITE_SUPERIEURE_AU_RESTANT', { restant: 3 }))).toBe(
      'Il ne reste que 3 exemplaires à recevoir sur cette commande : la quantité reçue en bon état ne peut pas dépasser ce nombre. Vérifiez le bon de livraison ; les exemplaires abîmés se saisissent à part.',
    )
    expect(messageErreurReception(erreur('QUANTITE_SUPERIEURE_AU_RESTANT', { restant: 1 }))).toMatch(
      /^Il ne reste que 1 exemplaire à recevoir/,
    )
    expect(messageErreurReception(erreur('QUANTITE_SUPERIEURE_AU_RESTANT'))).toMatch(
      /^Il reste moins d’exemplaires à recevoir/,
    )
  })

  it('explique les autres refus du serveur', () => {
    expect(messageErreurReception(erreur('COMMANDE_DEJA_RECUE'))).toMatch(/déjà entièrement reçue/)
    expect(messageErreurReception(erreur('RECEPTION_DEJA_VALIDEE'))).toMatch(/déjà été validée/)
    expect(messageErreurReception(erreur('STOCK_MODIFIE'))).toMatch(/rien n’a été enregistré/)
    expect(messageErreurReception(erreur('INCONNU'))).toBe('Message du serveur.')
    expect(messageErreurReception(new Error('x'))).toBe('Une erreur inattendue est survenue.')
  })

  it('donne le code d une erreur de l API', () => {
    expect(codeErreur(erreur('STOCK_MODIFIE'))).toBe('STOCK_MODIFIE')
    expect(codeErreur(new Error('x'))).toBe('')
  })
})

describe('erreurs des retours', () => {
  function erreur(code: string, details?: unknown) {
    return new ApiRequestError({ code, message: 'Message du serveur.', details })
  }

  it('explique une commande pas encore expédiée', () => {
    expect(messageErreurRetour(erreur('VENTE_NON_EXPEDIEE'))).toMatch(
      /^Cette commande n’a pas encore été expédiée.*Marquez-la d’abord comme expédiée\.$/,
    )
  })

  it('donne la date limite dépassée à l heure de Tahiti', () => {
    expect(
      messageErreurRetour(erreur('DELAI_RETOUR_DEPASSE', { dateLimiteRetour: '2026-11-16T09:59:59.999Z' })),
    ).toBe(
      'Le délai de retour est dépassé depuis le 15 novembre 2026 (14 jours après l’achat, 1 mois pour un cadeau). Ce retour ne peut plus être accepté.',
    )
    expect(messageErreurRetour(erreur('DELAI_RETOUR_DEPASSE'))).toMatch(/^Le délai de retour est dépassé \(/)
  })

  it('donne ce qui peut encore être rendu', () => {
    expect(messageErreurRetour(erreur('QUANTITE_NON_RETOURNABLE', { quantiteRetournable: 2 }))).toBe(
      'Le client ne peut plus rendre que 2 exemplaires de cet article : les autres ont déjà été retournés.',
    )
    expect(messageErreurRetour(erreur('QUANTITE_NON_RETOURNABLE', { quantiteRetournable: 0 }))).toBe(
      'Tous les exemplaires de cet article ont déjà été retournés.',
    )
    expect(messageErreurRetour(erreur('QUANTITE_NON_RETOURNABLE'))).toMatch(/dépasse/)
  })

  it('explique un article d échange indisponible, un stock modifié et une expédition en double', () => {
    expect(messageErreurRetour(erreur('LIGNE_INDISPONIBLE'))).toMatch(/plus disponible en stock/)
    expect(messageErreurRetour(erreur('STOCK_MODIFIE'))).toMatch(/rien n’a été enregistré/)
    expect(messageErreurRetour(erreur('COMMANDE_DEJA_EXPEDIEE'))).toMatch(/déjà été marquée comme expédiée/)
    expect(messageErreurRetour(erreur('AUTRE'))).toBe('Message du serveur.')
  })
})
