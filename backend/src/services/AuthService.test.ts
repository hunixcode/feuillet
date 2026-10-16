import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import type { Horloge } from "../horloge.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "./AuthService.js";

const SECRET = "secret-de-test";

const inscriptionValide = {
  nom: "Marie Tetuanui",
  email: "marie@example.pf",
  motDePasse: "motdepasse123",
  typeClient: "etudiant",
};

function horlogeA(date: string) {
  const horloge = { date: new Date(date), maintenant: () => horloge.date };
  return horloge satisfies Horloge;
}

async function attraper(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => {
      throw new Error("Une ErreurApi était attendue");
    },
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("AuthService", () => {
  let repository: MemoireUtilisateurRepository;
  let horloge: ReturnType<typeof horlogeA>;
  let auth: AuthService;

  beforeEach(() => {
    repository = new MemoireUtilisateurRepository();
    horloge = horlogeA("2026-10-15T08:00:00Z");
    auth = new AuthService(repository, {
      secretJwt: SECRET,
      coutHash: 4,
      dureeTokenSecondes: 3600,
      horloge,
    });
  });

  it("refuse d'être construit sans secret JWT", () => {
    expect(() => new AuthService(repository, { secretJwt: "" })).toThrow();
  });

  describe("inscrire", () => {
    it("crée un compte client et renvoie l'utilisateur public et un token", async () => {
      const resultat = await auth.inscrire(inscriptionValide);

      expect(resultat.utilisateur).toEqual({
        id: expect.any(String),
        nom: "Marie Tetuanui",
        email: "marie@example.pf",
        role: "client",
        typeClient: "etudiant",
      });
      expect(resultat.utilisateur).not.toHaveProperty("motDePasseHash");
      expect(typeof resultat.token).toBe("string");
    });

    it("stocke un hash bcrypt et jamais le mot de passe en clair", async () => {
      await auth.inscrire(inscriptionValide);
      const stocke = await repository.trouverParEmail("marie@example.pf");

      expect(stocke?.motDePasseHash).not.toBe(inscriptionValide.motDePasse);
      expect(await bcrypt.compare(inscriptionValide.motDePasse, stocke!.motDePasseHash)).toBe(true);
    });

    it("normalise l'e-mail et le nom", async () => {
      const { utilisateur } = await auth.inscrire({
        ...inscriptionValide,
        nom: "  Marie  ",
        email: "  Marie@Example.PF ",
      });

      expect(utilisateur.email).toBe("marie@example.pf");
      expect(utilisateur.nom).toBe("Marie");
    });

    it("donne toujours le rôle client, même si un autre rôle est envoyé", async () => {
      const { utilisateur } = await auth.inscrire({ ...inscriptionValide, role: "responsable" });

      expect(utilisateur.role).toBe("client");
    });

    it.each(["jeunesse", "etudiant", "adulte", "professionnel"])(
      "accepte le type de client %s",
      async (typeClient) => {
        const { utilisateur } = await auth.inscrire({ ...inscriptionValide, typeClient });
        expect(utilisateur.typeClient).toBe(typeClient);
      },
    );

    it("refuse une adresse e-mail déjà utilisée, sans tenir compte de la casse", async () => {
      await auth.inscrire(inscriptionValide);

      const erreur = await attraper(
        auth.inscrire({ ...inscriptionValide, email: "MARIE@example.pf" }),
      );

      expect(erreur.statut).toBe(409);
      expect(erreur.code).toBe("EMAIL_DEJA_UTILISE");
      expect(erreur.details).toEqual({ champs: { email: expect.any(String) } });
    });

    it("signale tous les champs manquants d'un coup", async () => {
      const erreur = await attraper(auth.inscrire({}));

      expect(erreur.statut).toBe(400);
      expect(erreur.code).toBe("VALIDATION");
      expect(Object.keys((erreur.details as { champs: object }).champs).sort()).toEqual([
        "email",
        "motDePasse",
        "nom",
        "typeClient",
      ]);
    });

    it.each([
      ["un corps absent", undefined],
      ["un tableau", []],
      ["une chaîne", "texte"],
    ])("refuse %s", async (_libelle, corps) => {
      const erreur = await attraper(auth.inscrire(corps));
      expect(erreur.code).toBe("VALIDATION");
    });

    it.each([
      ["nom vide", { nom: "   " }, "nom"],
      ["nom trop long", { nom: "a".repeat(101) }, "nom"],
      ["nom non textuel", { nom: 42 }, "nom"],
      ["e-mail sans arobase", { email: "marie.example.pf" }, "email"],
      ["e-mail sans domaine", { email: "marie@" }, "email"],
      ["e-mail avec espace", { email: "ma rie@example.pf" }, "email"],
      ["mot de passe trop court", { motDePasse: "1234567" }, "motDePasse"],
      ["mot de passe trop long", { motDePasse: "é".repeat(37) }, "motDePasse"],
      ["mot de passe non textuel", { motDePasse: 12345678 }, "motDePasse"],
      ["type de client inconnu", { typeClient: "retraite" }, "typeClient"],
      ["type de client absent", { typeClient: undefined }, "typeClient"],
    ])("refuse un %s", async (_libelle, modification, champ) => {
      const erreur = await attraper(auth.inscrire({ ...inscriptionValide, ...modification }));

      expect(erreur.code).toBe("VALIDATION");
      expect((erreur.details as { champs: Record<string, string> }).champs).toEqual({
        [champ]: expect.any(String),
      });
    });

    it("accepte un mot de passe de exactement 8 caractères", async () => {
      await expect(
        auth.inscrire({ ...inscriptionValide, motDePasse: "12345678" }),
      ).resolves.toBeDefined();
    });

    it("ne crée aucun compte quand la validation échoue", async () => {
      await attraper(auth.inscrire({ ...inscriptionValide, motDePasse: "court" }));

      expect(await repository.trouverParEmail(inscriptionValide.email)).toBeNull();
    });
  });

  describe("connecter", () => {
    beforeEach(async () => {
      await auth.inscrire(inscriptionValide);
    });

    it("connecte un client avec les bons identifiants", async () => {
      const { utilisateur, token } = await auth.connecter({
        email: inscriptionValide.email,
        motDePasse: inscriptionValide.motDePasse,
      });

      expect(utilisateur.email).toBe(inscriptionValide.email);
      expect(utilisateur).not.toHaveProperty("motDePasseHash");
      expect(token).toEqual(expect.any(String));
    });

    it("accepte l'e-mail avec une autre casse et des espaces", async () => {
      const { utilisateur } = await auth.connecter({
        email: "  MARIE@example.pf ",
        motDePasse: inscriptionValide.motDePasse,
      });

      expect(utilisateur.email).toBe("marie@example.pf");
    });

    it("connecte un responsable créé hors inscription", async () => {
      await repository.creer({
        nom: "Responsable",
        email: "responsable@librairie.pf",
        motDePasseHash: await hasherMotDePasse("responsable123", 4),
        role: "responsable",
      });

      const { utilisateur } = await auth.connecter({
        email: "responsable@librairie.pf",
        motDePasse: "responsable123",
      });

      expect(utilisateur.role).toBe("responsable");
      expect(utilisateur).not.toHaveProperty("typeClient");
    });

    it("refuse un mauvais mot de passe", async () => {
      const erreur = await attraper(
        auth.connecter({ email: inscriptionValide.email, motDePasse: "mauvais-mdp" }),
      );

      expect(erreur.statut).toBe(401);
      expect(erreur.code).toBe("IDENTIFIANTS_INVALIDES");
    });

    it("renvoie la même erreur pour un e-mail inconnu, sans révéler qu'il n'existe pas", async () => {
      const inconnu = await attraper(
        auth.connecter({ email: "inconnu@example.pf", motDePasse: "motdepasse123" }),
      );
      const mauvais = await attraper(
        auth.connecter({ email: inscriptionValide.email, motDePasse: "mauvais-mdp" }),
      );

      expect(inconnu.statut).toBe(mauvais.statut);
      expect(inconnu.code).toBe(mauvais.code);
      expect(inconnu.message).toBe(mauvais.message);
    });

    it("signale les champs manquants", async () => {
      const erreur = await attraper(auth.connecter({ email: " " }));

      expect(erreur.code).toBe("VALIDATION");
      expect(erreur.details).toEqual({
        champs: { email: expect.any(String), motDePasse: expect.any(String) },
      });
    });
  });

  describe("verifierToken", () => {
    it("retrouve l'utilisateur à partir du token d'inscription", async () => {
      const { utilisateur, token } = await auth.inscrire(inscriptionValide);

      await expect(auth.verifierToken(token)).resolves.toEqual(utilisateur);
    });

    it("signe un token HS256 contenant l'identifiant, le rôle et l'expiration", async () => {
      const { utilisateur, token } = await auth.inscrire(inscriptionValide);
      const contenu = jwt.decode(token, { complete: true });

      expect(contenu?.header.alg).toBe("HS256");
      expect(contenu?.payload).toMatchObject({
        sub: utilisateur.id,
        role: "client",
        iat: Date.parse("2026-10-15T08:00:00Z") / 1000,
        exp: Date.parse("2026-10-15T09:00:00Z") / 1000,
      });
    });

    it("accepte le token juste avant son expiration", async () => {
      const { token } = await auth.inscrire(inscriptionValide);
      horloge.date = new Date("2026-10-15T08:59:59Z");

      await expect(auth.verifierToken(token)).resolves.toBeDefined();
    });

    it("refuse un token expiré", async () => {
      const { token } = await auth.inscrire(inscriptionValide);
      horloge.date = new Date("2026-10-15T09:00:01Z");

      const erreur = await attraper(auth.verifierToken(token));
      expect(erreur.statut).toBe(401);
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });

    it("refuse un token signé avec un autre secret", async () => {
      const autre = new AuthService(repository, { secretJwt: "autre-secret", coutHash: 4, horloge });
      const { token } = await autre.inscrire(inscriptionValide);

      const erreur = await attraper(auth.verifierToken(token));
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });

    it("refuse un token non signé (alg none)", async () => {
      const { utilisateur } = await auth.inscrire(inscriptionValide);
      const forge = jwt.sign({ sub: utilisateur.id, role: "responsable" }, "", {
        algorithm: "none",
      });

      const erreur = await attraper(auth.verifierToken(forge));
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });

    it("refuse un token illisible", async () => {
      const erreur = await attraper(auth.verifierToken("pas-un-token"));
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });

    it("refuse un token valide dont l'utilisateur n'existe plus", async () => {
      const iat = Date.parse("2026-10-15T08:00:00Z") / 1000;
      const token = jwt.sign({ sub: "999", role: "client", iat, exp: iat + 60 }, SECRET);

      const erreur = await attraper(auth.verifierToken(token));
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });

    it("refuse un token sans identifiant", async () => {
      const iat = Date.parse("2026-10-15T08:00:00Z") / 1000;
      const token = jwt.sign({ role: "client", iat, exp: iat + 60 }, SECRET);

      const erreur = await attraper(auth.verifierToken(token));
      expect(erreur.code).toBe("NON_AUTHENTIFIE");
    });
  });
});
