import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Dernier middleware : toute erreur non gérée arrive ici et ne fait jamais
 * exploser le processus. Les erreurs métier connues retournent leur status,
 * le reste répond 500 sans jamais fuiter de détails internes.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur" });
}
