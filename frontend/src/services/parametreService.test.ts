import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enregistrerParametres, lireParametres } from './parametreService'

const parametres = {
  dureeMiseDeCoteJours: 7,
  delaiRetourJours: 14,
  delaiRetourCadeauJours: 30,
  fraisEmballage: 300,
  fraisLivraison: 800,
  seuilAlerteDefaut: 20,
}

describe('service des paramètres', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lit les paramètres de la librairie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(parametres)))

    expect(await lireParametres()).toEqual(parametres)
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/parametres')
  })

  it('enregistre tous les paramètres d un coup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(parametres)))

    await enregistrerParametres(parametres)

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/parametres')
    expect(options?.method).toBe('PUT')
    expect(JSON.parse(String(options?.body))).toEqual(parametres)
  })
})
