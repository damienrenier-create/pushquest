// src/lib/gamebook/yellow/data/statusCtPrice.ts
//
// BOUTIQUE DE JETONS — PRIX DES CT STATUT INÉDITES (Sartay, 29/10/2026 : « des CT statut inédites vraiment très très fortes.
// Quand un joueur en achète une, si un joueur souhaite acheter la même, elle passe à 5× le prix, à chaque fois »).
// Prix d'une CT = prix de base × 5^(ventes de CETTE CT, tous joueurs confondus). Le compteur vit sur le serveur (GlobalConfig,
// une clé par CT) : l'action frontier « statusCtSpend » vérifie le prix, débite les JC et compte la vente dans UNE transaction.
// Le cliquet +10 % par achat de la catégorie (par joueur, par run, cf. CombatShopModal.catPrice) s'ajoute côté client.

/** Les 6 CT statut (1 par type qui n'en avait pas : Feu/Glace/Insecte/Ténèbres/Métal/Fée), cf. data/cts.ts. */
export const STATUS_CT_LOT: readonly string[] = ["ct71", "ct72", "ct73", "ct74", "ct75", "ct76"]
export const STATUS_CT_BASE_PRICE = 120
/** Chaque vente multiplie le prix de la CT par ce facteur. */
export const STATUS_CT_SURGE = 5
/** Plafond : le solde de JC est un entier 32 bits. Au-delà, la CT est simplement hors de prix. */
export const STATUS_CT_PRICE_MAX = 1_000_000_000
/** Ventes d'AVANT la règle (aucun journal serveur des achats), relevées dans les saves le 29/10/2026 : CT encore au sac, ou
 *  Daemon qui connaît l'attaque sans pouvoir l'apprendre par niveau. Fournaise : Thundah de Mools (le Thanadrak de Jacanon et
 *  le Flamarokto de DaKumba l'apprennent seuls) · Machination : au sac de Jacanon · Aimantation : Sidéralithe de Jacanon et
 *  Colosfer de Mools · Charme Féerique : Ukognos de Mools. Étreinte Glaciale et Fil Entravant : jamais vendues. */
export const STATUS_CT_PAST_SALES: Readonly<Record<string, number>> = { ct71: 1, ct74: 1, ct75: 2, ct76: 1 }

export function isStatusCt(id: string): boolean { return STATUS_CT_LOT.includes(id) }
/** Clé GlobalConfig du compteur de ventes d'une CT depuis la règle (valeur = entier écrit en texte). */
export function statusCtSalesKey(ctId: string): string { return `statusCtSales:${ctId}` }
/** Valeur GlobalConfig → nombre de ventes (absente ou illisible = 0). */
export function parseSalesCount(v: string | null | undefined): number {
    const n = Number.parseInt(v ?? "", 10)
    return Number.isFinite(n) && n > 0 ? n : 0
}
/** Ventes TOTALES d'une CT : celles d'avant la règle + le compteur serveur. */
export function statusCtSales(ctId: string, counted: number): number {
    return (STATUS_CT_PAST_SALES[ctId] ?? 0) + Math.max(0, Math.floor(counted))
}
/** Prix d'une CT après `sales` ventes, à partir d'un prix de base (cliqueté côté client, brut côté serveur). */
export function statusCtPrice(base: number, sales: number): number {
    return Math.min(STATUS_CT_PRICE_MAX, Math.round(base * Math.pow(STATUS_CT_SURGE, Math.max(0, Math.floor(sales)))))
}
