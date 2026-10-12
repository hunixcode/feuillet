// Contrat d'API proposé, à valider avec le backend.
export interface ApiError {
  code: string
  message: string
  details?: unknown
}
