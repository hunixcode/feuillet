import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("RetourService", () => {
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let livre: string;
  let cahier: string;

  beforeEach(async () => {
    // 2026-11-08 10:00 à Tahiti.
    horloge = { date: new Date("2026-11-08T20:00:00Z"), maintenant: () => horloge.date };
    services = servicesMemoire(horloge);
    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
    ({ id: livre } = await services.produitService.creer({
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
    }));
    ({ id: cahier } = await services.produitService.creer({
      reference: "PAP-001",
      designation: "Cahier",
      type: "papeterie",
      categorie: "roman",
      prix: 350,
      tauxTva: 16,
    }));
    await services.stockService.corrigerInventaire(livre, { quantiteComptee: 5, motif: "Comptage" });
    await services.stockService.corrigerInventaire(cahier, { quantiteComptee: 10, motif: "Comptage" });
  });

  const marie = { id: "1", nom: "Marie", email: "marie@example.pf", role: "client" as const };
  // Commande de Marie aussitôt expédiée : seule une commande expédiée peut être retournée.
  async function vendre(options: object = {}, lignes = [{ produitId: livre, quantite: 2 }]) {
    const commande = await services.venteService.commanderEnLigne(marie, { lignes, adresseLivraison: "Papeete", ...options });
    return services.venteService.marquerExpediee(commande.id);
  }
  const stock = (produitId = livre) => services.repositories.stocks.trouver(produitId);

  describe("délai et quantité (RG07, RG09)", () => {
    it("donne la date limite, les quantités retournables et les retours passés d'une vente", async () => {
      const vente = await vendre();
      await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement" });

      const detail = await services.retourService.retoursDeVente(vente.id);

      expect(detail).toMatchObject({
        venteId: vente.id,
        dateLimiteRetour: new Date("2026-11-22T23:59:59.999-10:00"),
        retourPossible: true,
        lignes: [{ produitId: livre, quantite: 2, prixUnitaire: 1800, quantiteRetournee: 1, quantiteRetournable: 1 }],
      });
      expect(detail.retours).toHaveLength(1);
    });

    it("donne 30 jours pour un cadeau avec une occasion", async () => {
      const vente = await vendre({ occasionCadeau: "noel" });

      await expect(services.retourService.retoursDeVente(vente.id)).resolves.toMatchObject({
        dateLimiteRetour: new Date("2026-12-08T23:59:59.999-10:00"),
      });
    });

    it("refuse un retour après la date limite, et l'accepte jusqu'à son dernier instant", async () => {
      const vente = await vendre();
      horloge.date = new Date("2026-11-23T09:59:59.999Z");
      await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement" });

      horloge.date = new Date("2026-11-23T10:00:00Z");
      const erreur = await erreurDe(services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement" }));

      expect(erreur).toMatchObject({ statut: 409, code: "DELAI_RETOUR_DEPASSE" });
      await expect(services.retourService.retoursDeVente(vente.id)).resolves.toMatchObject({ retourPossible: false });
    });

    it("refuse de rendre plus que la quantité vendue non encore retournée", async () => {
      const vente = await vendre();
      await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 2, issue: "remboursement" });

      const erreur = await erreurDe(services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement" }));

      expect(erreur).toMatchObject({ statut: 409, code: "QUANTITE_NON_RETOURNABLE", details: { quantiteRetournable: 0 } });
    });

    it("refuse le retour d'une commande pas encore expédiée", async () => {
      const commande = await services.venteService.commanderEnLigne(marie, {
        lignes: [{ produitId: livre, quantite: 1 }],
        adresseLivraison: "Papeete",
      });

      expect(await erreurDe(services.retourService.enregistrer(commande.id, { produitId: livre, quantite: 1, issue: "remboursement" }))).toMatchObject({
        code: "VENTE_NON_EXPEDIEE",
      });
      await services.venteService.marquerExpediee(commande.id);
      await expect(
        services.retourService.enregistrer(commande.id, { produitId: livre, quantite: 1, issue: "remboursement" }),
      ).resolves.toBeDefined();
    });

    it("valide la saisie et répond 404 sur une vente inconnue", async () => {
      const vente = await vendre();

      expect((await erreurDe(services.retourService.enregistrer(vente.id, { produitId: cahier, quantite: 0, issue: "perte" }))).details).toEqual({
        champs: { produitId: expect.any(String), quantite: expect.any(String), issue: expect.any(String) },
      });
      expect(await erreurDe(services.retourService.retoursDeVente("inconnue"))).toMatchObject({ statut: 404 });
    });
  });

  describe("issues (RG12)", () => {
    it("rembourse le prix figé × quantité, sans les frais, et remet l'article revendable en stock", async () => {
      await services.produitService.ajouterPromotion(livre, { remise: 50, debut: "2026-11-01", fin: "2026-11-30" });
      const vente = await vendre({ emballageCadeau: true });
      horloge.date = new Date("2026-11-09T20:00:00Z");
      await services.produitService.supprimerPromotion(livre, (await services.produitService.promotions(livre))[0]!.id);

      const retour = await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 2, issue: "remboursement" });

      expect(retour).toMatchObject({ issue: "remboursement", revendable: true, valeur: 1800, montantRembourse: 1800, complementPaye: 0 });
      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 5, quantiteDefectueuse: 0 });
      const [mouvement] = await services.repositories.stocks.listerMouvements({ type: "retour" });
      expect(mouvement).toMatchObject({ quantite: 2, retourId: retour.id, operateur: "responsable" });
    });

    it("passe en stock défectueux un article remboursé qui n'est pas revendable", async () => {
      const vente = await vendre();

      await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement", revendable: false });

      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 3, quantiteDefectueuse: 1 });
      const [mouvement] = await services.repositories.stocks.listerMouvements({ type: "retour" });
      expect(mouvement).toMatchObject({ quantite: 0, motif: "Retour remboursé, article défectueux" });
    });

    it("remplace un défectueux par un neuf : défectueux +1, physique −1, sans remboursement", async () => {
      const vente = await vendre();

      const retour = await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remplacement" });

      expect(retour).toMatchObject({ issue: "remplacement", revendable: false, montantRembourse: 0 });
      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 2, quantiteDefectueuse: 1 });
      const [mouvement] = await services.repositories.stocks.listerMouvements({ type: "remplacement" });
      expect(mouvement).toMatchObject({ quantite: -1 });
    });

    it("rembourse à la place d'un remplacement sans exemplaire neuf disponible", async () => {
      const vente = await vendre({}, [{ produitId: livre, quantite: 5 }]);

      const retour = await services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remplacement" });

      expect(retour).toMatchObject({ issue: "remboursement", remplacementImpossible: true, montantRembourse: 1800, revendable: false });
      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 0, quantiteDefectueuse: 1 });
    });

    it("échange : l'article revient en stock, un autre est expédié au même client, la différence est réglée", async () => {
      const vente = await vendre();

      const retour = await services.retourService.enregistrer(vente.id, {
        produitId: livre,
        quantite: 1,
        issue: "echange",
        echange: { lignes: [{ produitId: cahier, quantite: 2 }] },
      });

      expect(retour).toMatchObject({ issue: "echange", revendable: true, valeur: 1800, montantRembourse: 1100, complementPaye: 0 });
      const venteEchange = await services.venteService.obtenir(retour.venteEchangeId!);
      expect(venteEchange).toMatchObject({
        statut: "a_preparer",
        fraisLivraison: 0,
        total: 700,
        client: { email: "marie@example.pf" },
        adresseLivraison: "Papeete",
      });
      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 4 });
      await expect(stock(cahier)).resolves.toMatchObject({ quantitePhysique: 8 });
    });

    it("échange plus cher : le client règle le complément", async () => {
      const vente = await vendre({}, [{ produitId: cahier, quantite: 1 }]);

      const retour = await services.retourService.enregistrer(vente.id, {
        produitId: cahier,
        quantite: 1,
        issue: "echange",
        echange: { lignes: [{ produitId: livre, quantite: 1 }] },
      });

      expect(retour).toMatchObject({ montantRembourse: 0, complementPaye: 1450 });
    });

    it("refuse un échange sans plastique intact ou sans article, et n'enregistre rien si le nouvel article manque", async () => {
      const vente = await vendre();

      expect(
        (await erreurDe(services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "echange", revendable: false }))).details,
      ).toEqual({ champs: { revendable: expect.any(String), echange: expect.any(String) } });
      expect(
        await erreurDe(
          services.retourService.enregistrer(vente.id, {
            produitId: livre,
            quantite: 1,
            issue: "echange",
            echange: { lignes: [{ produitId: cahier, quantite: 50 }] },
          }),
        ),
      ).toMatchObject({ code: "LIGNE_INDISPONIBLE" });
      await expect(services.retourService.retoursDeVente(vente.id)).resolves.toMatchObject({ retours: [] });
      await expect(stock()).resolves.toMatchObject({ quantitePhysique: 3 });
    });

    it("n'écrit rien si le stock a changé entre la lecture et l'écriture", async () => {
      const vente = await vendre();
      const { stocks } = services.repositories;
      const appliquer = stocks.appliquer.bind(stocks);
      stocks.appliquer = (changements) => {
        stocks.appliquer = appliquer;
        appliquer([{ produitId: livre, avant: changements[0]!.avant, apres: { ...changements[0]!.avant, quantitePhysique: 9 } }]);
        appliquer(changements);
      };

      expect(
        await erreurDe(services.retourService.enregistrer(vente.id, { produitId: livre, quantite: 1, issue: "remboursement" })),
      ).toMatchObject({ code: "STOCK_MODIFIE" });
      await expect(services.retourService.retoursDeVente(vente.id)).resolves.toMatchObject({ retours: [] });
    });
  });
});
