import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiRequestError, delete as deleteRequest, get, post, put, telecharger } from './api'

describe('client API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('lit une réponse JSON réussie et préfixe le chemin par /api', async () => {
    const payload = { id: 'p-1' }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    await expect(get<typeof payload>('/produits')).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/produits',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('accepte un chemin sans slash initial', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })))

    await get('produits')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/produits',
      expect.any(Object),
    )
  })

  it('envoie Accept JSON, sans token quand aucun token n’est enregistré', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })))

    await get('/profil')

    const [, options] = fetchMock.mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.has('Authorization')).toBe(false)
  })

  it('sérialise le corps JSON des requêtes POST', async () => {
    const body = { nom: 'Livre', prix: 1500 }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'p-1' })))

    await post('/produits', body)

    const [, options] = fetchMock.mock.calls[0]
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify(body))
    expect(new Headers(options?.headers).get('Content-Type')).toBe(
      'application/json',
    )
  })

  it('utilise PUT et sérialise son corps JSON', async () => {
    const body = { nom: 'Livre modifié' }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(body)))

    await put('/produits/p-1', body)

    const [, options] = fetchMock.mock.calls[0]
    expect(options?.method).toBe('PUT')
    expect(options?.body).toBe(JSON.stringify(body))
    expect(new Headers(options?.headers).get('Content-Type')).toBe(
      'application/json',
    )
  })

  it('utilise DELETE sans envoyer de corps JSON', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ deleted: true })))

    await deleteRequest('/produits/p-1')

    const [, options] = fetchMock.mock.calls[0]
    expect(options?.method).toBe('DELETE')
    expect(options?.body).toBeUndefined()
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false)
  })

  it('expose les quatre méthodes depuis l’objet api', () => {
    expect(api.get).toBe(get)
    expect(api.post).toBe(post)
    expect(api.put).toBe(put)
    expect(api.delete).toBe(deleteRequest)
  })

  it('accepte une réponse 204 sans corps', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    await expect(deleteRequest<void>('/produits/p-1')).resolves.toBeUndefined()
  })

  it('accepte une réponse 205 sans corps', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 205 }),
    )

    await expect(deleteRequest<void>('/produits/p-1')).resolves.toBeUndefined()
  })

  it.each([
    ['null', null],
    ['un tableau', [{ id: 'p-1' }]],
    ['une chaîne JSON', 'ok'],
    ['un nombre JSON', 42],
  ])('renvoie correctement une réponse JSON contenant %s', async (_case, body) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body)),
    )

    await expect(get('/resultat')).resolves.toEqual(body)
  })

  it('normalise une erreur HTTP JSON et conserve ses détails', async () => {
    const errorBody = {
      code: 'LIGNE_INDISPONIBLE',
      message: 'Une ligne est indisponible.',
      details: { lignes: [{ produitId: 'p-1', quantite: 2 }] },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(errorBody), { status: 409 }),
    )

    await expect(post('/commandes', { lignes: [] })).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'LIGNE_INDISPONIBLE',
      message: errorBody.message,
      details: errorBody.details,
    })
  })

  it('fournit des valeurs de repli si les champs de l’erreur HTTP sont invalides', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 42, message: null, details: ['x'] }), {
        status: 422,
      }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'La requête a échoué (erreur HTTP 422).',
      details: ['x'],
    })
  })

  it('fournit des valeurs de repli si le corps JSON d’erreur est un tableau', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ erreur: 'inconnue' }]), { status: 400 }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'La requête a échoué (erreur HTTP 400).',
    })
  })

  it.each([
    ['null', null],
    ['une chaîne', 'Erreur'],
    ['un nombre', 42],
    ['un booléen', false],
  ])('normalise un corps d’erreur JSON contenant %s', async (_case, body) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 400 }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'La requête a échoué (erreur HTTP 400).',
    })
  })

  it('conserve le code et les détails quand le message est absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'CONFLIT', details: { id: 'p-1' } }), {
        status: 409,
      }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'CONFLIT',
      message: 'La requête a échoué (erreur HTTP 409).',
      details: { id: 'p-1' },
    })
  })

  it('conserve un message explicite même sans code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Accès refusé.' }), { status: 403 }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'Accès refusé.',
    })
  })

  it('normalise un échec de lecture JSON du corps d’erreur', async () => {
    const response = new Response(null, { status: 502 })
    vi.spyOn(response, 'json').mockRejectedValue(new SyntaxError('invalid JSON'))
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'La requête a échoué (erreur HTTP 502).',
    })
  })

  it('fournit une erreur compréhensible pour un corps non JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Erreur serveur', { status: 500 }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'La requête a échoué (erreur HTTP 500).',
    })
  })

  it('normalise une coupure réseau', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'RESEAU',
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    })
  })

  it('normalise également une erreur réseau qui n’est pas un TypeError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue('connexion interrompue')

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'RESEAU',
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    })
  })

  it('normalise une réponse réussie dont le JSON est invalide', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{json invalide', { status: 200 }),
    )

    await expect(get('/produits')).rejects.toMatchObject({
      code: 'INCONNU',
      message: 'Le serveur a renvoyé une réponse JSON invalide.',
    })
  })

  it('envoie le token localStorage dans Authorization', async () => {
    const token = ['jeton', 'test'].join('-')
    localStorage.setItem('token', token)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })))

    await get('/profil')

    const [, options] = fetchMock.mock.calls[0]
    expect(new Headers(options?.headers).get('Authorization')).toBe(`Bearer ${token}`)
  })

  it('n’envoie pas Authorization si la valeur du token est vide', async () => {
    localStorage.setItem('token', '')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })))

    await get('/profil')

    const [, options] = fetchMock.mock.calls[0]
    expect(new Headers(options?.headers).has('Authorization')).toBe(false)
  })

  it('ne transforme pas une erreur de sérialisation du corps en erreur réseau', async () => {
    const body: { self?: unknown } = {}
    body.self = body
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(post('/produits', body)).rejects.toBeInstanceOf(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('conserve l’instance ApiRequestError et son nom', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALIDE', message: 'Requête invalide.' }), {
        status: 400,
      }),
    )

    const error = await get('/produits').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ name: 'ApiRequestError', code: 'INVALIDE' })
    expect(error).toBeInstanceOf(Error)
  })
})

describe('telecharger', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('récupère un fichier avec le token et le nom donné par le serveur', async () => {
    localStorage.setItem('token', 'jeton')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('a;b', {
        headers: { 'Content-Disposition': 'attachment; filename="rapport-2026-11-02-2026-11-08.csv"' },
      }),
    )

    const fichier = await telecharger('/rapports/export.csv', 'rapport.csv')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/rapports/export.csv')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer jeton')
    expect(fichier.nom).toBe('rapport-2026-11-02-2026-11-08.csv')
    expect(await fichier.contenu.text()).toBe('a;b')
  })

  it('garde le nom par défaut sans en-tête de fichier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('a;b'))

    const fichier = await telecharger('/rapports/export.csv', 'rapport.csv')

    expect(fichier.nom).toBe('rapport.csv')
  })

  it('transmet l erreur du serveur', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'VALIDATION', message: 'Période invalide.' }), { status: 400 }),
    )

    await expect(telecharger('/rapports/export.csv', 'rapport.csv')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Période invalide.',
    })
  })
})
