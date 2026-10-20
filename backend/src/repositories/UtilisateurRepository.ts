import type { NouvelUtilisateur, Utilisateur } from "../modeles/utilisateur.js";

export class EmailDejaUtiliseErreur extends Error {
  constructor(email: string) {
    super(`L'adresse ${email} est déjà utilisée`);
    this.name = "EmailDejaUtiliseErreur";
  }
}

export interface UtilisateurRepository {
  creer(utilisateur: NouvelUtilisateur): Promise<Utilisateur>;
  trouverParEmail(email: string): Promise<Utilisateur | null>;
  trouverParId(id: string): Promise<Utilisateur | null>;
}
