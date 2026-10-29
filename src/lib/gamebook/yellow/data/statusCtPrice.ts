// src/lib/gamebook/yellow/data/statusCtPrice.ts
//
// BOUTIQUE DE JETONS — PRIX DES CT STATUT INÉDITES (Sartay, 29/10/2026 : « des CT statut inédites vraiment très très fortes.
// Quand un joueur en achète une, si un joueur souhaite acheter la même, elle passe à 5× le prix, à chaque fois », puis le même
// jour : « le prix ×5 ne s'applique que par joueur. Tous les joueurs peuvent bien sûr acheter leur première CT pour pas cher »).
// Prix d'une CT = prix de base × 5^(achats de CETTE CT par CE joueur). Le compteur vit sur le serveur (GlobalConfig, une clé par
// joueur et par CT) et suit le compte comme les JC : runs, rejeux et profils confondus. L'action frontier « statusCtSpend »
// vérifie le prix, débite les JC et compte l'achat dans UNE transaction.
// Le cliquet +10 % par achat de la catégorie (par joueur, par run, cf. CombatShopModal.catPrice) s'ajoute côté client.

/** Les 6 CT statut (1 par type qui n'en avait pas : Feu/Glace/Insecte/Ténèbres/Métal/Fée), cf. data/cts.ts. */
export const STATUS_CT_LOT: readonly string[] = ["ct71", "ct72", "ct73", "ct74", "ct75", "ct76"]
export const STATUS_CT_BASE_PRICE = 120
/** Chaque rachat de la même CT par le même joueur multiplie son prix par ce facteur. */
export const STATUS_CT_SURGE = 5
/** Plafond : le solde de JC est un entier 32 bits. Au-delà, la CT est simplement hors de prix. */
export const STATUS_CT_PRICE_MAX = 1_000_000_000
/** Achats d'AVANT la règle (aucun journal serveur des achats), relevés dans les saves le 29/10/2026 : CT encore au sac, ou
 *  Daemon qui connaît l'attaque sans pouvoir l'apprendre par niveau. Par userId ; personne d'autre n'en avait acheté. */
export const STATUS_CT_PAST_BUYS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
    cmml1r6um0000pto29d129npd: { ct71: 1, ct75: 1, ct76: 1 }, // Mools : Fournaise (Thundah), Aimantation (Colosfer), Charme Féerique (Ukognos)
    cmsat15v80001wvyo5agqw4m4: { ct74: 1, ct75: 1 },          // Jacanon : Machination (au sac), Aimantation (Sidéralithe)
}

export function isStatusCt(id: string): boolean { return STATUS_CT_LOT.includes(id) }
/** Clé GlobalConfig du compteur d'achats d'une CT par un joueur depuis la règle (valeur = entier écrit en texte). */
export function statusCtBuysKey(userId: string, ctId: string): string { return `statusCtBuys:${userId}:${ctId}` }
/** Valeur GlobalConfig → nombre d'achats (absente ou illisible = 0). */
export function parseBuyCount(v: string | null | undefined): number {
    const n = Number.parseInt(v ?? "", 10)
    return Number.isFinite(n) && n > 0 ? n : 0
}
/** Achats TOTAUX d'une CT par un joueur : ceux d'avant la règle + le compteur serveur. */
export function statusCtBuys(userId: string, ctId: string, counted: number): number {
    return (STATUS_CT_PAST_BUYS[userId]?.[ctId] ?? 0) + Math.max(0, Math.floor(counted))
}
/** Prix d'une CT après `buys` achats du joueur, à partir d'un prix de base (cliqueté côté client, brut côté serveur). */
export function statusCtPrice(base: number, buys: number): number {
    return Math.min(STATUS_CT_PRICE_MAX, Math.round(base * Math.pow(STATUS_CT_SURGE, Math.max(0, Math.floor(buys)))))
}
