import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import type { ChangementStock } from "../modeles/stock.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import type { NouvelleVente, Vente } from "../modeles/vente.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { MemoireVenteRepository } from "../repositories/MemoireVenteRepository.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";
import { VenteService, montantTva } from "./VenteService.js";

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("VenteService", () => {
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let utilisateurs: MemoireUtilisateurRepository;
  let client: UtilisateurPublic;
  let livre: string;
  let cahier: string;

  beforeEach(async () => {
    horloge = { date: new Date("2026-11-08T20:00:00Z"), maintenant: () => horloge.date };
    utilisateurs = new MemoireUtilisateurRepository();
    services = servicesMemoire(horloge);
    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
    await services.repositories.categories.creer({ id: "fournitures", libelle: "Fournitures" });
    const { motDePasseHash: _, ...compte } = await utilisateurs.creer({
      nom: "Marie",
      email: "marie@example.pf",
      motDePasseHash: "x",
      role: "client",
    });
    client = compte;

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
      designation: "Cahier 96 pages",
      type: "papeterie",
      categorie: "fournitures",
      prix: 350,
      tauxTva: 16,
    }));
    await services.produitService.ajouterPromotion(livre, { remise: 15, debut: "2026-11-01", fin: "2026-11-30" });
    await services.stockService.corrigerInventaire(livre, { quantiteComptee: 5, motif: "Comptage" });
    await services.stockService.corrigerInventaire(cahier, { quantiteComptee: 10, motif: "Comptage" });
  });

  const panier = (lignes: [string, number][], options: object = {}) => ({
    lignes: lignes.map(([produitId, quantite]) => ({ produitId, quantite })),
    ...options,
  });
  const livraison = { adresseLivraison: "Papeete" };

  it("calcule la TVA incluse arrondie à l'unité (RG11)", () => {
    expect(montantTva(3060, 5)).toBe(146);
    expect(montantTva(1050, 16)).toBe(145);
    expect(montantTva(1000, 0)).toBe(0);
  });

  it("chiffre un panier en ligne au prix du jour, livraison comprise, sans rien enregistrer", async () => {
    const devis = await services.venteService.devisEnLigne(panier([[livre, 2], [cahier, 3]], { emballageCadeau: true }));

    expect(devis).toEqual({
      lignes: [
        {
          produitId: livre,
          quantite: 2,
          reference: "LIV-001",
          designation: "L'Île au trésor",
          prixUnitaire: 1530,
          remise: 15,
          tauxTva: 5,
          montant: 3060,
          montantTva: 146,
        },
        {
          produitId: cahier,
          quantite: 3,
          reference: "PAP-001",
          designation: "Cahier 96 pages",
          prixUnitaire: 350,
          remise: 0,
          tauxTva: 16,
          montant: 1050,
          montantTva: 145,
        },
      ],
      lignesIndisponibles: [],
      sousTotal: 4110,
      fraisEmballage: 300,
      fraisLivraison: 800,
      frais: 1100,
      montantTva: 291,
      total: 5210,
    });
    expect((await services.stockService.obtenir(livre)).quantitePhysique).toBe(5);
    await expect(services.repositories.ventes.lister({})).resolves.toEqual([]);
  });

  it("compte toujours la livraison, avec les frais des paramètres", async () => {
    await services.parametresService.modifier({
      dureeMiseDeCoteJours: 7,
      delaiRetourJours: 14,
      delaiRetourCadeauJours: 30,
      fraisEmballage: 150,
      fraisLivraison: 1000,
      seuilAlerteDefaut: 20,
    });

    const emballe = await services.venteService.devisEnLigne(panier([[cahier, 1]], { emballageCadeau: true }));
    const simple = await services.venteService.devisEnLigne(panier([[cahier, 1]], { adresseLivraison: "Papeete" }));

    expect(emballe).toMatchObject({ fraisEmballage: 150, fraisLivraison: 1000, total: 1500 });
    expect(simple).toMatchObject({ fraisEmballage: 0, fraisLivraison: 1000, total: 1350 });
  });

  it("regroupe les lignes d'un même produit", async () => {
    const devis = await services.venteService.devisEnLigne(panier([[cahier, 2], [cahier, 3]]));

    expect(devis.lignes).toEqual([expect.objectContaining({ produitId: cahier, quantite: 5, montant: 1750 })]);
  });

  it("signale sans les chiffrer les produits inconnus ou archivés, et chiffre ceux qui manquent de stock", async () => {
    await services.produitService.modifier(cahier, {
      reference: "PAP-001",
      designation: "Cahier 96 pages",
      type: "papeterie",
      categorie: "fournitures",
      prix: 350,
      tauxTva: 16,
      archive: true,
    });

    const devis = await services.venteService.devisEnLigne(panier([[livre, 6], [cahier, 1], ["inconnu", 1]]));

    expect(devis.lignes.map((l) => l.produitId)).toEqual([livre]);
    expect(devis.lignesIndisponibles).toEqual([
      { produitId: livre, quantite: 6 },
      { produitId: cahier, quantite: 1 },
      { produitId: "inconnu", quantite: 1 },
    ]);
    expect(devis.sousTotal).toBe(1530 * 6);
  });

  it("enregistre une commande en ligne à préparer, à prix figés, et sort le stock (EX03)", async () => {
    const vente = await services.venteService.commanderEnLigne(
      client,
      panier([[livre, 2]], { occasionCadeau: "noel", emballageCadeau: true, adresseLivraison: "  BP 12, Papeete  " }),
    );

    expect(vente).toMatchObject({
      id: expect.any(String),
      date: horloge.date,
      statut: "a_preparer",
      client: { id: client.id, nom: "Marie", email: "marie@example.pf" },
      occasionCadeau: "noel",
      emballageCadeau: true,
      adresseLivraison: "BP 12, Papeete",
      sousTotal: 3060,
      frais: 1100,
      total: 4160,
    });
    expect((await services.stockService.obtenir(livre)).quantitePhysique).toBe(3);
    const [mouvement] = await services.stockService.mouvements({ type: "vente" });
    expect(mouvement).toEqual({
      id: expect.any(String),
      produitId: livre,
      date: horloge.date,
      type: "vente",
      quantite: -2,
      motif: "Vente en ligne",
      operateur: "client",
      venteId: vente.id,
    });
  });

  it("garde le prix payé quand le catalogue change ensuite (RG02)", async () => {
    const vente = await services.venteService.commanderEnLigne(client, panier([[livre, 1]], { adresseLivraison: "Papeete" }));
    await services.produitService.modifier(livre, {
      reference: "LIV-001",
      designation: "L'Île au trésor (poche)",
      type: "livre",
      categorie: "roman",
      prix: 900,
      tauxTva: 10,
    });

    expect((await services.venteService.obtenir(vente.id)).lignes[0]).toMatchObject({
      designation: "L'Île au trésor",
      prixUnitaire: 1530,
      remise: 15,
      tauxTva: 5,
    });
  });

  it("exige l'adresse de livraison en ligne et valide les options", async () => {
    const sansAdresse = await erreurDe(services.venteService.commanderEnLigne(client, panier([[livre, 1]])));
    const options = await erreurDe(
      services.venteService.devisEnLigne(panier([[livre, 1]], { occasionCadeau: "paques", emballageCadeau: "oui" })),
    );
    const vide = await erreurDe(services.venteService.devisEnLigne({ lignes: [] }));
    const quantite = await erreurDe(services.venteService.devisEnLigne(panier([[livre, 0]])));

    expect(sansAdresse.details).toEqual({ champs: { adresseLivraison: expect.any(String) } });
    expect(Object.keys((options.details as { champs: object }).champs)).toEqual(["occasionCadeau", "emballageCadeau"]);
    expect(vide.details).toEqual({ champs: { lignes: "Le panier est vide." } });
    expect(quantite.statut).toBe(400);
  });

  it("n'enregistre rien si une ligne n'est plus disponible et renvoie les lignes en cause (RG03)", async () => {
    const erreur = await erreurDe(
      services.venteService.commanderEnLigne(client, panier([[cahier, 2], [livre, 6]], { adresseLivraison: "Papeete" })),
    );

    expect(erreur).toMatchObject({ statut: 409, code: "LIGNE_INDISPONIBLE", details: { lignes: [{ produitId: livre, quantite: 6 }] } });
    expect((await services.stockService.obtenir(cahier)).quantitePhysique).toBe(10);
    await expect(services.stockService.mouvements({ type: "vente" })).resolves.toEqual([]);
    await expect(services.repositories.ventes.lister({})).resolves.toEqual([]);
  });

  it("ne vend pas les exemplaires mis de côté (RG04)", async () => {
    await services.repositories.stocks.enregistrer(
      livre,
      { quantitePhysique: 5, quantiteMiseDeCote: 0, quantiteDefectueuse: 0 },
      { quantitePhysique: 5, quantiteMiseDeCote: 4, quantiteDefectueuse: 0 },
    );

    const erreur = await erreurDe(services.venteService.commanderEnLigne(client, panier([[livre, 2]], livraison)));

    expect(erreur.code).toBe("LIGNE_INDISPONIBLE");
    await expect(services.venteService.commanderEnLigne(client, panier([[livre, 1]], livraison))).resolves.toBeDefined();
  });

  it("refuse la vente si le stock a changé entre la vérification et l'écriture, sans rien écrire", async () => {
    const { stocks, produits, parametres } = services.repositories;
    class VentesConcurrentes extends MemoireVenteRepository {
      override async creer(vente: NouvelleVente, changements: ChangementStock[]): Promise<Vente> {
        const avant = await stocks.trouver(livre);
        await stocks.enregistrer(livre, avant, { ...avant, quantitePhysique: avant.quantitePhysique - 1 });
        return super.creer(vente, changements);
      }
    }
    const ventes = new VentesConcurrentes(stocks);
    const service = new VenteService(ventes, produits, stocks, parametres, horloge);

    const erreur = await erreurDe(service.commanderEnLigne(client, panier([[cahier, 1], [livre, 1]], livraison)));

    expect(erreur).toMatchObject({ statut: 409, code: "STOCK_MODIFIE" });
    expect((await stocks.trouver(cahier)).quantitePhysique).toBe(10);
    await expect(ventes.lister({})).resolves.toEqual([]);
  });

  it("passe une commande à expédiée une seule fois", async () => {
    const commande = await services.venteService.commanderEnLigne(client, panier([[cahier, 1]], livraison));
    horloge.date = new Date("2026-11-09T01:00:00Z");

    const expediee = await services.venteService.marquerExpediee(commande.id);

    expect(expediee).toMatchObject({ statut: "expediee", dateExpedition: horloge.date });
    expect((await erreurDe(services.venteService.marquerExpediee(commande.id))).code).toBe("COMMANDE_DEJA_EXPEDIEE");
    expect((await erreurDe(services.venteService.marquerExpediee("inconnue"))).statut).toBe(404);
  });

  it("ne montre au client que ses propres commandes", async () => {
    const { motDePasseHash: _, ...autre } = await utilisateurs.creer({
      nom: "Teva",
      email: "teva@example.pf",
      motDePasseHash: "x",
      role: "client",
    });
    const sienne = await services.venteService.commanderEnLigne(client, panier([[cahier, 1]], { adresseLivraison: "Papeete" }));
    const autreCommande = await services.venteService.commanderEnLigne(autre, panier([[cahier, 1]], { adresseLivraison: "Faa'a" }));

    expect((await services.venteService.mesCommandes(client)).map((v) => v.id)).toEqual([sienne.id]);
    await expect(services.venteService.maCommande(client, sienne.id)).resolves.toMatchObject({ id: sienne.id });
    expect((await erreurDe(services.venteService.maCommande(client, autreCommande.id))).statut).toBe(404);
  });
});
