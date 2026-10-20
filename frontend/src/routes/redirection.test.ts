import { describe, expect, it } from 'vitest'
import { accueilDuRole, cheminApresConnexion } from './redirection'

describe('redirection après connexion', () => {
  it('donne la page d accueil de chaque rôle', () => {
    expect(accueilDuRole('client')).toBe('/catalogue')
    expect(accueilDuRole('responsable')).toBe('/admin')
  })

  it('envoie vers l accueil du rôle sans page demandée', () => {
    expect(cheminApresConnexion('client')).toBe('/catalogue')
    expect(cheminApresConnexion('responsable')).toBe('/admin')
  })

  it('revient sur la page demandée quand elle correspond au rôle', () => {
    expect(cheminApresConnexion('client', '/demandes')).toBe('/demandes')
    expect(cheminApresConnexion('responsable', '/admin/stock')).toBe('/admin/stock')
  })

  it('ignore une page demandée qui appartient à l autre espace', () => {
    expect(cheminApresConnexion('client', '/admin/stock')).toBe('/catalogue')
    expect(cheminApresConnexion('responsable', '/demandes')).toBe('/admin')
  })
})
