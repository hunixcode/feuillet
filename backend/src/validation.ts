import { ErreurApi } from "./erreurs.js";

export type ErreursChamps = Record<string, string>;

export function lireObjet(corps: unknown): Record<string, unknown> {
  return typeof corps === "object" && corps !== null && !Array.isArray(corps)
    ? (corps as Record<string, unknown>)
    : {};
}

export function erreurValidation(champs: ErreursChamps): ErreurApi {
  return new ErreurApi(400, "VALIDATION", "Certains champs sont invalides.", { champs });
}
