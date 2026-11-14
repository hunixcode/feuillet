import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";
import { dateLimiteMiseDeCote } from "./DemandeService.js";

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("DemandeService", () => {
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let utilisateurs: MemoireUtilisateurRepository;
  let marie: UtilisateurPublic;
  let teva: UtilisateurPublic;
  let livre: string;

  async function client(nom: string, email: string): Promise<UtilisateurPublic> {
    const { motDePasseHash: _, ...compte } = await utilisateurs.creer({ nom, email, motDePasseHash: "x", role: "client" });
    return compte;
  }

  // Entrée en stock suivie des mises de côté, comme le fera la réception d'une commande fournisseur.
  async function recevoir(produitId: string, quantite: number) {
    const { stocks, demandes } = services.repositories;
    const avant = await stocks.trouver(produitId);
    const apresEntree = { ...avant, quantitePhysique: avant.quantitePhysique + quantite };
    const plan = await services.demandeService.planifierMisesDeCote(produitId, apresEntree);
    await demandes.mettreDeCote({ produitId, avant, apres: plan.stockApres }, plan);
    return plan;
  }

  beforeEach(async () => {
    horloge = { date: new Date("2026-11-08T20:00:00Z"), maintenant: () => horloge.date };
    utilisateurs = new MemoireUtilisateurRepository();
    services = servicesMemoire(horloge);
    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
    marie = await client("Marie", "marie@example.pf");
    teva = await client("Teva", "teva@example.pf");
    ({ id: livre } = await services.produitService.creer({
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
      auteur: "R. L. Stevenson",
      isbn: "978-2-07-061234-5",
    }));
  });

  describe("création", () => {
    it("enregistre une demande sur un produit épuisé, avec sa désignation, en attente", async () => {
      const demande = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 2 });

      expect(demande).toEqual({
        id: expect.any(String),
        client: { id: marie.id, nom: "Marie", email: "marie@example.pf" },
        produitId: livre,
        titre: "L'Île au trésor",
        auteur: "R. L. Stevenson",
        isbn: "978-2-07-061234-5",
        quantiteSouhaitee: 2,
        date: horloge.date,
        statut: "en_attente",
      });
    });

    it("enregistre une demande sur un livre absent du catalogue (titre obligatoire)", async () => {
      const demande = await services.demandeService.creer(marie, {
        titre: "  Le Grand Meaulnes ",
        auteur: "Alain-Fournier",
        quantiteSouhaitee: 1,
      });

      expect(demande).toMatchObject({ titre: "Le Grand Meaulnes", auteur: "Alain-Fournier", statut: "en_attente" });
      expect(demande.produitId).toBeUndefined();
    });

    it("refuse une saisie invalide avec le détail des champs", async () => {
      const erreur = await erreurDe(services.demandeService.creer(marie, { isbn: "abc", quantiteSouhaitee: 0 }));

      expect(erreur).toMatchObject({ statut: 400, code: "VALIDATION" });
      expect(erreur.details).toEqual({
        champs: { titre: expect.any(String), isbn: expect.any(String), quantiteSouhaitee: expect.any(String) },
      });
    });

    it("refuse un produit disponible, inconnu ou archivé", async () => {
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 1, motif: "Comptage" });

      expect(await erreurDe(services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 }))).toMatchObject({
        statut: 409,
        code: "PRODUIT_DISPONIBLE",
      });
      expect(
        await erreurDe(services.demandeService.creer(marie, { produitId: "inconnu", quantiteSouhaitee: 1 })),
      ).toMatchObject({ statut: 404, code: "INTROUVABLE" });
    });

    it("refuse une deuxième demande en cours du même client sur le même produit", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });

      const erreur = await erreurDe(services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 }));

      expect(erreur).toMatchObject({ statut: 409, code: "DEMANDE_EN_COURS" });
      await expect(services.demandeService.creer(teva, { produitId: livre, quantiteSouhaitee: 1 })).resolves.toBeDefined();
    });
  });

  describe("suivi et annulation", () => {
    it("ne montre au client que ses demandes, et au responsable toutes, filtrées par statut", async () => {
      const deMarie = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      horloge.date = new Date("2026-11-09T20:00:00Z");
      const deTeva = await services.demandeService.creer(teva, { titre: "Hors catalogue", quantiteSouhaitee: 1 });
      await services.demandeService.annuler(teva, deTeva.id);

      expect((await services.demandeService.mesDemandes(marie)).map((d) => d.id)).toEqual([deMarie.id]);
      expect((await services.demandeService.lister({})).map((d) => d.id)).toEqual([deTeva.id, deMarie.id]);
      expect((await services.demandeService.lister({ statut: "annulee" })).map((d) => d.id)).toEqual([deTeva.id]);
      expect(await erreurDe(services.demandeService.lister({ statut: "perdue" }))).toMatchObject({ code: "VALIDATION" });
    });

    it("annule une demande en attente du client, pas celle d'un autre ni une demande mise de côté", async () => {
      const demande = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });

      expect(await erreurDe(services.demandeService.annuler(teva, demande.id))).toMatchObject({ statut: 404 });
      await recevoir(livre, 1);
      expect(await erreurDe(services.demandeService.annuler(marie, demande.id))).toMatchObject({
        statut: 409,
        code: "DEMANDE_NON_ANNULABLE",
      });
    });

    it("passe la demande annulée à annulee avec la date", async () => {
      const demande = await services.demandeService.creer(marie, { titre: "Hors catalogue", quantiteSouhaitee: 1 });
      horloge.date = new Date("2026-11-10T20:00:00Z");

      await expect(services.demandeService.annuler(marie, demande.id)).resolves.toMatchObject({
        statut: "annulee",
        dateFin: horloge.date,
      });
    });
  });

  describe("rattachement d'une demande hors catalogue (RG06)", () => {
    it("rattache la demande au produit créé, une seule fois", async () => {
      const demande = await services.demandeService.creer(marie, { titre: "L'Île au trésor", quantiteSouhaitee: 1 });

      await expect(services.demandeService.rattacher(demande.id, { produitId: livre })).resolves.toMatchObject({
        produitId: livre,
        titre: "L'Île au trésor",
      });
      expect(await erreurDe(services.demandeService.rattacher(demande.id, { produitId: livre }))).toMatchObject({
        statut: 409,
        code: "DEMANDE_NON_RATTACHABLE",
      });
    });

    it("refuse un produit absent, une demande inconnue ou une demande déjà sur un produit", async () => {
      const surProduit = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });

      expect(await erreurDe(services.demandeService.rattacher(surProduit.id, {}))).toMatchObject({ code: "VALIDATION" });
      expect(await erreurDe(services.demandeService.rattacher("inconnue", { produitId: livre }))).toMatchObject({
        statut: 404,
      });
      expect(await erreurDe(services.demandeService.rattacher(surProduit.id, { produitId: livre }))).toMatchObject({
        code: "DEMANDE_NON_RATTACHABLE",
      });
    });

    it("rend le produit non supprimable une fois qu'il a une demande (RG05)", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });

      expect(await erreurDe(services.produitService.supprimer(livre))).toMatchObject({
        statut: 409,
        code: "PRODUIT_AVEC_HISTORIQUE",
      });
    });
  });

  describe("mises de côté à l'entrée en stock", () => {
    it("met de côté par ordre d'arrivée tant qu'il reste du stock vendable et prévient les clients", async () => {
      const premiere = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 2 });
      horloge.date = new Date("2026-11-08T21:00:00Z");
      const seconde = await services.demandeService.creer(teva, { produitId: livre, quantiteSouhaitee: 2 });

      const plan = await recevoir(livre, 3);

      const dateLimite = new Date("2026-11-15T23:59:59.999-10:00");
      expect(plan.misesDeCote).toEqual([
        { demandeId: premiere.id, miseDeCote: { quantite: 2, dateLimite } },
        { demandeId: seconde.id, miseDeCote: { quantite: 1, dateLimite } },
      ]);
      await expect(services.repositories.stocks.trouver(livre)).resolves.toEqual({
        quantitePhysique: 3,
        quantiteMiseDeCote: 3,
        quantiteDefectueuse: 0,
      });
      const [deMarie] = await services.demandeService.mesDemandes(marie);
      expect(deMarie).toMatchObject({ statut: "mise_de_cote", miseDeCote: { quantite: 2, dateLimite } });
      const [notification] = await services.demandeService.mesNotifications(teva);
      expect(notification).toEqual({
        id: expect.any(String),
        clientId: teva.id,
        produitId: livre,
        type: "reapprovisionnement",
        date: horloge.date,
        message: "« L'Île au trésor » est arrivé : 1 exemplaire mis de côté pour vous jusqu'au 15/11/2026.",
        lue: false,
      });
    });

    it("ne met rien de côté sans demande en attente ni sans stock vendable", async () => {
      await expect(recevoir(livre, 2)).resolves.toMatchObject({ misesDeCote: [], notifications: [] });

      await services.demandeService.creer(marie, { titre: "Autre", quantiteSouhaitee: 1 });
      const plan = await services.demandeService.planifierMisesDeCote(livre, {
        quantitePhysique: 2,
        quantiteMiseDeCote: 2,
        quantiteDefectueuse: 0,
      });
      expect(plan.misesDeCote).toEqual([]);
    });

    it("ne prévient qu'une fois un client pour le même produit", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      await recevoir(livre, 1);
      horloge.date = new Date("2026-11-20T20:00:00Z");
      await services.demandeService.expirerEcheances();
      await services.stockService.corrigerInventaire(livre, { quantiteComptee: 0, motif: "Comptage" });
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      await recevoir(livre, 1);

      expect(await services.demandeService.mesDemandes(marie)).toMatchObject([
        { statut: "mise_de_cote" },
        { statut: "expiree" },
      ]);
      expect(await services.demandeService.mesNotifications(marie)).toHaveLength(1);
    });

    it("n'écrit rien si une demande n'est plus en attente entre le calcul et l'écriture", async () => {
      const demande = await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      const { stocks, demandes } = services.repositories;
      const avant = await stocks.trouver(livre);
      const plan = await services.demandeService.planifierMisesDeCote(livre, { ...avant, quantitePhysique: 1 });
      await services.demandeService.annuler(marie, demande.id);

      await expect(demandes.mettreDeCote({ produitId: livre, avant, apres: plan.stockApres }, plan)).rejects.toThrow();
      await expect(stocks.trouver(livre)).resolves.toEqual(avant);
    });
  });

  describe("expiration (RG06, décision 18)", () => {
    it("libère la quantité à l'échéance et passe la demande à expiree, sans remise en attente", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 2 });
      await recevoir(livre, 2);

      horloge.date = new Date("2026-11-16T09:59:59.999Z");
      await expect(services.demandeService.expirerEcheances()).resolves.toBe(0);
      horloge.date = new Date("2026-11-16T10:00:00Z");
      await expect(services.demandeService.expirerEcheances()).resolves.toBe(1);

      const [demande] = await services.demandeService.mesDemandes(marie);
      expect(demande).toMatchObject({ statut: "expiree", dateFin: horloge.date });
      await expect(services.repositories.stocks.trouver(livre)).resolves.toMatchObject({
        quantitePhysique: 2,
        quantiteMiseDeCote: 0,
      });
      await expect(services.demandeService.expirerEcheances()).resolves.toBe(0);
    });

    it("expire les mises de côté échues avant de lister les demandes", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      await recevoir(livre, 1);
      horloge.date = new Date("2026-12-01T20:00:00Z");

      const [demande] = await services.demandeService.lister({});

      expect(demande!.statut).toBe("expiree");
    });

    it("suit la durée des paramètres", async () => {
      await services.parametresService.modifier({
        dureeMiseDeCoteJours: 2,
        delaiRetourJours: 14,
        delaiRetourCadeauJours: 30,
        fraisEmballage: 300,
        fraisLivraison: 800,
        seuilAlerteDefaut: 20,
      });
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });

      const plan = await recevoir(livre, 1);

      expect(plan.misesDeCote[0]!.miseDeCote.dateLimite).toEqual(new Date("2026-11-10T23:59:59.999-10:00"));
    });
  });

  describe("notifications", () => {
    it("marque comme lue une notification du client seulement", async () => {
      await services.demandeService.creer(marie, { produitId: livre, quantiteSouhaitee: 1 });
      await recevoir(livre, 1);
      const [notification] = await services.demandeService.mesNotifications(marie);

      expect(await erreurDe(services.demandeService.marquerLue(teva, notification!.id))).toMatchObject({ statut: 404 });
      await expect(services.demandeService.marquerLue(marie, notification!.id)).resolves.toMatchObject({ lue: true });
    });
  });
});

describe("dateLimiteMiseDeCote", () => {
  it("donne la fin du jour à Tahiti, même tard le soir en heure UTC", () => {
    // 2026-11-09T08:00Z = 2026-11-08 22:00 à Tahiti.
    const horloge = { maintenant: () => new Date("2026-11-09T08:00:00Z") };

    expect(dateLimiteMiseDeCote(horloge, 7)).toEqual(new Date("2026-11-16T09:59:59.999Z"));
  });
});
