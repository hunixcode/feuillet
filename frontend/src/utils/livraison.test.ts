import { describe, expect, it } from 'vitest'
import {
  adresseSurUneLigne,
  composerAdresse,
  LIVRAISON_VIDE,
  LONGUEURS_LIVRAISON,
  lignesAdresse,
  verifierLivraison,
} from './livraison'

const complet = {
  nom: ' Teva Expédition ',
  telephone: '87 12 34 56',
  adresse: 'BP 42',
  codePostal: '98713',
  ville: 'Papeete',
  indications: '',
}

describe('détails de livraison', () => {
  it('accepte des détails complets, avec ou sans indicatif', () => {
    expect(verifierLivraison(complet)).toEqual({})
    expect(verifierLivraison({ ...complet, telephone: '+689 40 12 34 56' })).toEqual({})
  })

  it('signale chaque champ obligatoire manquant', () => {
    expect(Object.keys(verifierLivraison(LIVRAISON_VIDE))).toEqual(['nom', 'telephone', 'adresse', 'codePostal', 'ville'])
  })

  it('refuse un téléphone trop court ou avec des lettres et un code postal mal formé', () => {
    expect(verifierLivraison({ ...complet, telephone: '12 34' }).telephone).toMatch(/numéro de téléphone valide/)
    expect(verifierLivraison({ ...complet, telephone: '87 AB 34 56' }).telephone).toMatch(/numéro de téléphone valide/)
    expect(verifierLivraison({ ...complet, codePostal: '9871' }).codePostal).toMatch(/5 chiffres/)
  })

  it('écrit une information par ligne et ajoute les indications seulement si elles existent', () => {
    expect(composerAdresse(complet)).toBe('Teva Expédition\nTél. 87 12 34 56\nBP 42\n98713 Papeete')
    expect(composerAdresse({ ...complet, indications: ' Portail bleu ' })).toBe(
      'Teva Expédition\nTél. 87 12 34 56\nBP 42\n98713 Papeete\nIndications : Portail bleu',
    )
  })

  it('reste sous les 300 caractères acceptés par la librairie, champs remplis au maximum', () => {
    const plein = Object.fromEntries(
      Object.entries(LONGUEURS_LIVRAISON).map(([champ, longueur]) => [champ, 'x'.repeat(longueur)]),
    ) as typeof complet
    expect(composerAdresse(plein).length).toBeLessThanOrEqual(300)
  })

  it('relit une adresse sur plusieurs lignes ou sur une seule', () => {
    expect(lignesAdresse('Teva\n Tél. 87 12 34 56 \n\nBP 42')).toEqual(['Teva', 'Tél. 87 12 34 56', 'BP 42'])
    expect(lignesAdresse('BP 120, 98713 Papeete')).toEqual(['BP 120, 98713 Papeete'])
    expect(lignesAdresse(undefined)).toEqual([])
    expect(adresseSurUneLigne('Teva\nBP 42\n98713 Papeete')).toBe('Teva, BP 42, 98713 Papeete')
  })
})
