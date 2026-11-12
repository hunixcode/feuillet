import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("ReapproService", () => {
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let utilisateurs: MemoireUtilisateurRepository;
  let marie: UtilisateurPublic;
  let livre: string;
  let fournisseurId: string;

  beforeEach(async () => {
    horloge = { date: new Date("2026-11-08T20:00:00Z"), maintenant: () => horloge.date };
    utilisateurs = new MemoireUtilisateurRepository();
    services = servicesMemoire(horloge);
    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
    const { motDePasseHash: _, ...compte } = await utilisateurs.creer({
      nom: "Marie",
      email: "marie@example.pf",
      motDePasseHash: "x",
      role: "client",
    });
    marie = compte;
    ({ id: livre } = await services.produitService.creer({
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
    }));
    ({ id: fournisseurId } = await services.reapproService.creerFournisseur({ nom: "Hachette Pacifique", contact: "commandes@hachette.pf" }));
  });

  const commander = (quantiteCommandee = 10, dateArriveePrevue = "2026-11-20") =>
    services.reapproService.creerCommande({ fournisseurId, produitId: livre, quantiteCommandee, dateArriveePrevue });

  async function recevoir(commandeId: string, quantiteRecue: number, quantiteAbimee = 0) {
    const reception = await services.reapproService.enregistrerReception(commandeId, { quantiteRecue, quantiteAbimee });
    return services.reapproService.validerReception(reception.id);
  }

  describe("fournisseurs", () => {
    it("crée, modifie et liste les fournisseurs par nom", async () => {
      const autre = await services.reapproService.creerFournisseur({ nom: "  Archipel Diffusion " });

      await expect(
        services.reapproService.modifierFournisseur(fournisseurId, { nom: "Hachette", contact: "40 50 60 70" }),
      ).resolves.toEqual({ id: fournisseurId, nom: "Hachette", contact: "40 50 60 70" });
      expect((await services.reapproService.listerFournisseurs()).map((f) => f.nom)).toEqual(["Archipel Diffusion", "Hachette"]);
      expect(autre.contact).toBeUndefined();
    });

    it("valide le nom et répond 404 sur un fournisseur inconnu", async () => {
      expect(await erreurDe(services.reapproService.creerFournisseur({ nom: " " }))).toMatchObject({ code: "VALIDATION" });
      expect(await erreurDe(services.reapproService.modifierFournisseur("inconnu", { nom: "X" }))).toMatchObject({ statut: 404 });
    });
  });

  describe("commandes fournisseur", () => {
    it("crée une commande en cours pour un fournisseur et un produit (décision 19)", async () => {
      await expect(commander()).resolves.toEqual({
        id: expect.any(String),
        fournisseur: { id: fournisseurId, nom: "Hachette Pacifique" },
        produitId: livre,
        reference: "LIV-001",
        designation: "L'Île au trésor",
        quantiteCommandee: 10,
        quantiteRecue: 0,
        date: horloge.date,
        dateArriveePrevue: "2026-11-20",
        statut: "en_cours",
      });
    });

    it("valide fournisseur, produit, quantité et date d'arrivée prévue", async () => {
      const erreur = await erreurDe(
        services.reapproService.creerCommande({
          fournisseurId: "inconnu",
          produitId: "inconnu",
          quantiteCommandee: 0,
          dateArriveePrevue: "2026-11-01",
        }),
      );

      expect(erreur.details).toEqual({
        champs: {
          fournisseurId: expect.any(String),
          produitId: expect.any(String),
          quantiteCommandee: expect.any(String),
          dateArriveePrevue: "La date d'arrivée prévue ne peut pas être passée.",
        },
      });
      expect(
        (await erreurDe(commander(1, "2026-02-30"))).details,
      ).toEqual({ champs: { dateArriveePrevue: expect.stringContaining("date valide") } });
    });

    it("liste les commandes avec filtres et rend le produit non supprimable (RG05)", async () => {
      const commande = await commander();

      expect((await services.reapproService.listerCommandes({ statut: "en_cours" })).map((c) => c.id)).toEqual([commande.id]);
      await expect(services.reapproService.listerCommandes({ produitId: "autre" })).resolves.toEqual([]);
      expect(await erreurDe(services.reapproService.listerCommandes({ statut: "perdue" }))).toMatchObject({ code: "VALIDATION" });
      expect(await erreurDe(services.produitService.supprimer(livre))).toMatchObject({ code: "PRODUIT_AVEC_HISTORIQUE" });
    });

    it("montre la date d'arrivée prévue la plus proche sur un produit épuisé (EX04)", async () => {
      await commander(5, "2026-11-25");
      await commander(5, "2026-11-18");

      await expect(services.produitService.obtenir(livre)).resolves.toMatchObject({
        disponibilite: "epuise",
        arriveePrevue: "2026-11-18",
      });
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 1, motif: "Comptage" });
      expect((await services.produitService.obtenir(livre)).arriveePrevue).toBeUndefined();
    });
  });

  describe("réceptions (RG07, décision 20)", () => {
    it("saisit puis valide une réception partielle : entrée en stock et commande partiellement reçue", async () => {
      const commande = await commander(10);
      const reception = await services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 4, quantiteAbimee: 1 });

      expect(reception).toMatchObject({ quantiteRecue: 4, quantiteAbimee: 1, validee: false });
      await expect(services.repositories.stocks.trouver(livre)).resolves.toMatchObject({ quantitePhysique: 0 });

      horloge.date = new Date("2026-11-09T20:00:00Z");
      const { reception: validee, commande: apres } = await services.reapproService.validerReception(reception.id);

      expect(validee).toMatchObject({ validee: true, dateValidation: horloge.date });
      expect(apres).toMatchObject({ quantiteRecue: 4, statut: "partiellement_recue" });
      expect(apres.dateReceptionComplete).toBeUndefined();
      await expect(services.repositories.stocks.trouver(livre)).resolves.toMatchObject({ quantitePhysique: 4 });
      const [mouvement] = await services.repositories.stocks.listerMouvements({ produitId: livre });
      expect(mouvement).toMatchObject({
        type: "entree",
        quantite: 4,
        operateur: "responsable",
        receptionId: reception.id,
        motif: "Réception de la commande fournisseur (Hachette Pacifique)",
      });
    });

    it("passe la commande à recue quand tout est arrivé", async () => {
      const commande = await commander(10);
      await recevoir(commande.id, 4);

      const { commande: apres } = await recevoir(commande.id, 6);

      expect(apres).toMatchObject({ quantiteRecue: 10, statut: "recue", dateReceptionComplete: horloge.date });
      expect(await erreurDe(services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 1 }))).toMatchObject({
        code: "COMMANDE_DEJA_RECUE",
      });
    });

    it("refuse une quantité supérieure au restant, à la saisie comme à la validation", async () => {
      const commande = await commander(5);
      const erreur = await erreurDe(services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 6 }));
      expect(erreur).toMatchObject({ statut: 409, code: "QUANTITE_SUPERIEURE_AU_RESTANT", details: { restant: 5 } });

      const premiere = await services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 3 });
      const seconde = await services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 3 });
      await services.reapproService.validerReception(premiere.id);

      expect(await erreurDe(services.reapproService.validerReception(seconde.id))).toMatchObject({
        code: "QUANTITE_SUPERIEURE_AU_RESTANT",
        details: { restant: 2 },
      });
      await expect(services.repositories.stocks.trouver(livre)).resolves.toMatchObject({ quantitePhysique: 3 });
    });

    it("ne compte pas les articles abîmés : ils restent à recevoir et n'entrent pas en stock", async () => {
      const commande = await commander(5);

      const { commande: apres } = await recevoir(commande.id, 0, 2);

      expect(apres).toMatchObject({ quantiteRecue: 0, statut: "en_cours" });
      await expect(services.repositories.stocks.listerMouvements({ produitId: livre })).resolves.toEqual([]);
    });

    it("ne crée pas de second mouvement si la réception est validée deux fois", async () => {
      const commande = await commander(5);
      const reception = await services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 2 });
      await services.reapproService.validerReception(reception.id);

      expect(await erreurDe(services.reapproService.validerReception(reception.id))).toMatchObject({
        statut: 409,
        code: "RECEPTION_DEJA_VALIDEE",
      });
      expect(await services.repositories.stocks.listerMouvements({ produitId: livre })).toHaveLength(1);
    });

    it("ne crée pas de second mouvement si deux validations arrivent en même temps", async () => {
      const { commandesFournisseur, stocks } = services.repositories;
      const commande = await commander(5);
      const reception = await services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 2 });
      // Une autre validation passe entre la lecture de la réception et l'écriture de celle-ci.
      const valider = commandesFournisseur.validerReception.bind(commandesFournisseur);
      commandesFournisseur.validerReception = async (...args) => {
        await valider(...args);
        return valider(...args);
      };

      expect(await erreurDe(services.reapproService.validerReception(reception.id))).toMatchObject({
        code: "RECEPTION_DEJA_VALIDEE",
      });
      expect(await stocks.listerMouvements({ produitId: livre })).toHaveLength(1);
    });

    it("valide la saisie d'une réception", async () => {
      const commande = await commander(5);

      expect(
        (await erreurDe(services.reapproService.enregistrerReception(commande.id, { quantiteRecue: -1, quantiteAbimee: 1.5 }))).details,
      ).toEqual({ champs: { quantiteRecue: expect.any(String), quantiteAbimee: expect.any(String) } });
      expect(
        (await erreurDe(services.reapproService.enregistrerReception(commande.id, { quantiteRecue: 0 }))).details,
      ).toEqual({ champs: { quantiteRecue: "La réception doit compter au moins un article." } });
      expect(await erreurDe(services.reapproService.enregistrerReception("inconnue", { quantiteRecue: 1 }))).toMatchObject({
        statut: 404,
      });
      expect(await erreurDe(services.reapproService.validerReception("inconnue"))).toMatchObject({ statut: 404 });
    });

    it("met de côté pour les demandes en attente et prévient le client, dans la même validation", async () => {
      const demande = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 2 });
      const commande = await commander(5);

      await recevoir(commande.id, 3);

      await expect(services.repositories.stocks.trouver(livre)).resolves.toEqual({
        quantitePhysique: 3,
        quantiteMiseDeCote: 2,
        quantiteDefectueuse: 0,
      });
      await expect(services.repositories.demandes.trouverParId(demande.id)).resolves.toMatchObject({
        statut: "mise_de_cote",
        miseDeCote: { quantite: 2 },
      });
      expect(await services.demandeService.mesNotifications(marie)).toHaveLength(1);
    });
  });

  describe("produits à recommander (RG10)", () => {
    it("part du stock initial sans commande reçue, avec le seuil par défaut des paramètres (20 %)", async () => {
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 10, motif: "Stock initial" });
      await expect(services.reapproService.aRecommander()).resolves.toEqual([]);

      await services.venteService.commanderEnLigne(marie, { lignes: [{ produitId: livre, quantite: 8 }], adresseLivraison: "Papeete" });

      await expect(services.reapproService.aRecommander()).resolves.toEqual([
        {
          produitId: livre,
          reference: "LIV-001",
          designation: "L'Île au trésor",
          quantiteVendable: 2,
          quantiteAcheteeOrigine: 10,
          seuilAlerte: 20,
          pourcentageVendu: 80,
          quantiteEnCommande: 0,
        },
      ]);
    });

    it("prend le total reçu de la dernière commande reçue et le restant des commandes en cours", async () => {
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 10, motif: "Stock initial" });
      const ancienne = await commander(4);
      await recevoir(ancienne.id, 4);
      await services.venteService.commanderEnLigne(marie, { lignes: [{ produitId: livre, quantite: 13 }], adresseLivraison: "Papeete" });
      const enCours = await commander(6);
      await recevoir(enCours.id, 2);
      await services.venteService.commanderEnLigne(marie, { lignes: [{ produitId: livre, quantite: 3 }], adresseLivraison: "Papeete" });

      const [produit] = await services.reapproService.aRecommander();

      expect(produit).toMatchObject({ quantiteAcheteeOrigine: 4, quantiteVendable: 0, pourcentageVendu: 100, quantiteEnCommande: 4 });
    });

    it("suit le seuil propre au produit, et revient au seuil par défaut avec null", async () => {
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 10, motif: "Stock initial" });
      await services.venteService.commanderEnLigne(marie, { lignes: [{ produitId: livre, quantite: 6 }], adresseLivraison: "Papeete" });
      await expect(services.reapproService.aRecommander()).resolves.toEqual([]);

      await expect(services.reapproService.definirSeuil(livre, { seuilAlerte: 50 })).resolves.toEqual({
        seuilAlerte: 50,
        parDefaut: false,
      });
      expect(await services.reapproService.aRecommander()).toHaveLength(1);
      await expect(services.reapproService.definirSeuil(livre, { seuilAlerte: null })).resolves.toEqual({
        seuilAlerte: 20,
        parDefaut: true,
      });
      await expect(services.reapproService.aRecommander()).resolves.toEqual([]);
      expect(await erreurDe(services.reapproService.definirSeuil(livre, { seuilAlerte: 101 }))).toMatchObject({ code: "VALIDATION" });
      expect(await erreurDe(services.reapproService.definirSeuil("inconnu", { seuilAlerte: 10 }))).toMatchObject({ statut: 404 });
    });

    it("n'évalue pas un produit sans quantité achetée connue", async () => {
      await expect(services.reapproService.aRecommander()).resolves.toEqual([]);
    });
  });
});
