import type { NouvelUtilisateur, Utilisateur } from "../modeles/utilisateur.js";
import { EmailDejaUtiliseErreur, type UtilisateurRepository } from "./UtilisateurRepository.js";

export class MemoireUtilisateurRepository implements UtilisateurRepository {
  private readonly utilisateurs = new Map<string, Utilisateur>();
  private prochainId = 1;

  async creer(nouvel: NouvelUtilisateur): Promise<Utilisateur> {
    if (await this.trouverParEmail(nouvel.email)) {
      throw new EmailDejaUtiliseErreur(nouvel.email);
    }
    const utilisateur = { ...nouvel, id: String(this.prochainId++) };
    this.utilisateurs.set(utilisateur.id, utilisateur);
    return { ...utilisateur };
  }

  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    const trouve = [...this.utilisateurs.values()].find((u) => u.email === email);
    return trouve ? { ...trouve } : null;
  }

  async trouverParId(id: string): Promise<Utilisateur | null> {
    const trouve = this.utilisateurs.get(id);
    return trouve ? { ...trouve } : null;
  }
}
