import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ErreurApi } from "../erreurs.js";
import { horlogeSysteme, type Horloge } from "../horloge.js";
import {
  versUtilisateurPublic,
  type AuthResultat,
  type UtilisateurPublic,
} from "../modeles/utilisateur.js";
import {
  EmailDejaUtiliseErreur,
  type UtilisateurRepository,
} from "../repositories/UtilisateurRepository.js";

const LONGUEUR_MIN_MOT_DE_PASSE = 8;
const OCTETS_MAX_MOT_DE_PASSE = 72;
const LONGUEUR_MAX_NOM = 100;
const LONGUEUR_MAX_EMAIL = 254;
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUT_HASH_PAR_DEFAUT = 10;

export function hasherMotDePasse(motDePasse: string, cout = COUT_HASH_PAR_DEFAUT): Promise<string> {
  return bcrypt.hash(motDePasse, cout);
}

export interface OptionsAuth {
  secretJwt: string;
  dureeTokenSecondes?: number;
  coutHash?: number;
  horloge?: Horloge;
}

interface DonneesInscription {
  nom: string;
  email: string;
  motDePasse: string;
}

interface DonneesConnexion {
  email: string;
  motDePasse: string;
}

type ErreursChamps = Record<string, string>;

function lireObjet(corps: unknown): Record<string, unknown> {
  return typeof corps === "object" && corps !== null && !Array.isArray(corps)
    ? (corps as Record<string, unknown>)
    : {};
}

function normaliserEmail(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim().toLowerCase() : "";
}

function erreurValidation(champs: ErreursChamps): ErreurApi {
  return new ErreurApi(400, "VALIDATION", "Certains champs sont invalides.", { champs });
}

function validerInscription(corps: unknown): DonneesInscription {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};

  const nom = typeof donnees.nom === "string" ? donnees.nom.trim() : "";
  if (!nom) {
    champs.nom = "Le nom est obligatoire.";
  } else if (nom.length > LONGUEUR_MAX_NOM) {
    champs.nom = `Le nom ne doit pas dépasser ${LONGUEUR_MAX_NOM} caractères.`;
  }

  const email = normaliserEmail(donnees.email);
  if (!email) {
    champs.email = "L'adresse e-mail est obligatoire.";
  } else if (email.length > LONGUEUR_MAX_EMAIL || !FORMAT_EMAIL.test(email)) {
    champs.email = "L'adresse e-mail n'est pas valide.";
  }

  const motDePasse = typeof donnees.motDePasse === "string" ? donnees.motDePasse : "";
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    champs.motDePasse = `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
  } else if (Buffer.byteLength(motDePasse, "utf8") > OCTETS_MAX_MOT_DE_PASSE) {
    champs.motDePasse = "Le mot de passe est trop long.";
  }

  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }

  return { nom, email, motDePasse };
}

function validerConnexion(corps: unknown): DonneesConnexion {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};

  const email = normaliserEmail(donnees.email);
  if (!email) {
    champs.email = "L'adresse e-mail est obligatoire.";
  }

  const motDePasse = typeof donnees.motDePasse === "string" ? donnees.motDePasse : "";
  if (!motDePasse) {
    champs.motDePasse = "Le mot de passe est obligatoire.";
  }

  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }

  return { email, motDePasse };
}

function erreurIdentifiants(): ErreurApi {
  return new ErreurApi(401, "IDENTIFIANTS_INVALIDES", "E-mail ou mot de passe incorrect.");
}

function erreurSession(): ErreurApi {
  return new ErreurApi(401, "NON_AUTHENTIFIE", "Session absente ou expirée, reconnectez-vous.");
}

export class AuthService {
  private readonly secretJwt: string;
  private readonly dureeTokenSecondes: number;
  private readonly coutHash: number;
  private readonly horloge: Horloge;
  private hashFactice: Promise<string> | undefined;

  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    options: OptionsAuth,
  ) {
    if (!options.secretJwt) {
      throw new Error("Le secret JWT est obligatoire");
    }
    this.secretJwt = options.secretJwt;
    this.dureeTokenSecondes = options.dureeTokenSecondes ?? 8 * 60 * 60;
    this.coutHash = options.coutHash ?? COUT_HASH_PAR_DEFAUT;
    this.horloge = options.horloge ?? horlogeSysteme;
  }

  async inscrire(corps: unknown): Promise<AuthResultat> {
    const { nom, email, motDePasse } = validerInscription(corps);
    const motDePasseHash = await hasherMotDePasse(motDePasse, this.coutHash);

    try {
      const utilisateur = await this.utilisateurs.creer({
        nom,
        email,
        motDePasseHash,
        role: "client",
      });
      const publique = versUtilisateurPublic(utilisateur);
      return { utilisateur: publique, token: this.signerToken(publique) };
    } catch (erreur) {
      if (erreur instanceof EmailDejaUtiliseErreur) {
        throw new ErreurApi(409, "EMAIL_DEJA_UTILISE", "Un compte existe déjà avec cette adresse e-mail.", {
          champs: { email: "Cette adresse e-mail est déjà utilisée." },
        });
      }
      throw erreur;
    }
  }

  async connecter(corps: unknown): Promise<AuthResultat> {
    const { email, motDePasse } = validerConnexion(corps);
    const utilisateur = await this.utilisateurs.trouverParEmail(email);

    if (!utilisateur) {
      await bcrypt.compare(motDePasse, await this.obtenirHashFactice());
      throw erreurIdentifiants();
    }

    if (!(await bcrypt.compare(motDePasse, utilisateur.motDePasseHash))) {
      throw erreurIdentifiants();
    }

    const publique = versUtilisateurPublic(utilisateur);
    return { utilisateur: publique, token: this.signerToken(publique) };
  }

  async verifierToken(token: string): Promise<UtilisateurPublic> {
    let identifiant: string | undefined;
    try {
      const contenu = jwt.verify(token, this.secretJwt, {
        algorithms: ["HS256"],
        clockTimestamp: this.secondesActuelles(),
      });
      identifiant = typeof contenu === "object" ? contenu.sub : undefined;
    } catch {
      throw erreurSession();
    }

    const utilisateur = identifiant ? await this.utilisateurs.trouverParId(identifiant) : null;
    if (!utilisateur) {
      throw erreurSession();
    }
    return versUtilisateurPublic(utilisateur);
  }

  private signerToken(utilisateur: UtilisateurPublic): string {
    const iat = this.secondesActuelles();
    return jwt.sign(
      { sub: utilisateur.id, role: utilisateur.role, iat, exp: iat + this.dureeTokenSecondes },
      this.secretJwt,
      { algorithm: "HS256" },
    );
  }

  private secondesActuelles(): number {
    return Math.floor(this.horloge.maintenant().getTime() / 1000);
  }

  private obtenirHashFactice(): Promise<string> {
    this.hashFactice ??= hasherMotDePasse("mot-de-passe-factice", this.coutHash);
    return this.hashFactice;
  }
}
