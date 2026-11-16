import type { ApiError } from '../types/api'

export class ApiRequestError extends Error implements ApiError {
  code: string
  details?: unknown

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.details = error.details
  }
}

type ApiErrorBody = {
  code?: unknown
  message?: unknown
  details?: unknown
}

function getToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage.getItem('token')
}

function getErrorBody(body: unknown, status: number): ApiError {
  if (typeof body === 'object' && body !== null) {
    const error = body as ApiErrorBody
    return {
      code: typeof error.code === 'string' ? error.code : 'INCONNU',
      message:
        typeof error.message === 'string'
          ? error.message
          : `La requête a échoué (erreur HTTP ${status}).`,
      ...(error.details === undefined ? {} : { details: error.details }),
    }
  }

  return {
    code: 'INCONNU',
    message: `La requête a échoué (erreur HTTP ${status}).`,
  }
}

async function envoyer(
  method: string,
  path: string,
  body: unknown,
  accept: string,
): Promise<Response> {
  const headers = new Headers()
  headers.set('Accept', accept)
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const options: RequestInit = { method, headers }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    options.body = JSON.stringify(body)
  }

  let response: Response
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    response = await fetch(`/api${normalizedPath}`, options)
  } catch {
    throw new ApiRequestError({
      code: 'RESEAU',
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    })
  }

  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = null
    }
    throw new ApiRequestError(getErrorBody(errorBody, response.status))
  }

  return response
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await envoyer(method, path, body, 'application/json')

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiRequestError({
      code: 'INCONNU',
      message: 'Le serveur a renvoyé une réponse JSON invalide.',
    })
  }
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export interface Fichier {
  contenu: Blob
  nom: string
}

export async function telecharger(path: string, nomParDefaut: string): Promise<Fichier> {
  const response = await envoyer('GET', path, undefined, '*/*')
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const nom = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? nomParDefaut
  return { contenu: await response.blob(), nom }
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export function deleteRequest<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

export { deleteRequest as delete }

export const api = {
  get,
  post,
  put,
  delete: deleteRequest,
}
