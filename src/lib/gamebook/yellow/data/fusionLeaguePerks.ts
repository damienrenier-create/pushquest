// 🏅 RÉCOMPENSES D'ASSIDUITÉ — ce que débloque le palier OR de la Ligue de Fusion.
//
// Règle de Sartay (15/10/2026) : dorénavant, un joueur qui a bouclé l'OR (marqueur `fusleague_or`) obtient deux
// privilèges PERMANENTS, pour récompenser ceux qui s'accrochent :
//   1. les FUSIO-BALLS s'achètent en boutique (jusque-là : une par complétion de Ligue, point) — PRIX PROGRESSIF depuis le
//      19/10/2026 (décision Sartay) : 1000 ⚡ la 1re achetée, 2000 la 2e, 3000 la 3e… ;
//   2. dans la GROTTE DU NEXUS (la « grotte fusion », 1F/B1F/B2F), les RARES popent deux fois plus et les COMMUNS
//      deux fois moins — on ne fait plus la queue derrière les Mottoche.
//
// Module PUR : aucune lecture de save ici. L'appelant passe « a-t-il bouclé l'or ? » (isTrainerDefeated).

/** Palier de prix de la Fusio-Ball en boutique pour un champion OR : la n-ième achetée coûte n × 1000 ⚡ (la Bourse ne s'y
 *  applique pas). L'offre du Dieu Spaghetti au sacre (hors boutique) reste à 1000 et ne compte pas dans la progression. */
export const FUSIO_BALL_SHOP_PRICE = 1000
/** Chaque Fusio-Ball achetée en boutique laisse un marqueur `fusio_shop_<n>` (n = rang de l'achat) dans la save : persisté et
 *  fusionné comme tous les marqueurs, sans toucher aux sérialiseurs. Les hauts faits ne comptent que les VRAIS dresseurs. */
export const FUSIO_SHOP_MARKER_PREFIX = "fusio_shop_"
/** Nombre de Fusio-Balls déjà achetées en boutique (marqueurs distincts). */
export function fusioShopBoughtCount(markers: readonly string[]): number {
    return new Set(markers.filter((m) => m.startsWith(FUSIO_SHOP_MARKER_PREFIX))).size
}
/** Prix de la PROCHAINE Fusio-Ball quand `bought` ont déjà été achetées : 1000, 2000, 3000… */
export function fusioBallShopPrice(bought: number): number {
    return FUSIO_BALL_SHOP_PRICE * (Math.max(0, Math.floor(bought)) + 1)
}
/** Total pour en acheter `qty` d'un coup (chacune à son rang) : ex. 0 déjà achetée, 3 d'un coup = 1000 + 2000 + 3000. */
export function fusioBallShopTotal(bought: number, qty: number): number {
    let total = 0
    for (let k = 0; k < Math.max(0, Math.floor(qty)); k++) total += fusioBallShopPrice(bought + k)
    return total
}
/** Marqueurs à poser après un achat de `qty` Fusio-Balls (rangs bought+1 … bought+qty). */
export function fusioShopMarkersFor(bought: number, qty: number): string[] {
    return Array.from({ length: Math.max(0, Math.floor(qty)) }, (_, k) => `${FUSIO_SHOP_MARKER_PREFIX}${Math.max(0, Math.floor(bought)) + k + 1}`)
}

/** Multiplicateurs de poids dans la Grotte pour un champion OR. */
export const GROTTE_GOLD_RARE_MULT = 2
export const GROTTE_GOLD_COMMON_MULT = 0.5

/** Seuils sur le poids de BASE des entrées (cf. encounters.ts : COMMON = 100, UNCOMMON = 45, RARE = 14,
 *  VERY_RARE = 5, GIGA_RARE = 2). Un test structurel vérifie que ces constantes n'ont pas dérivé. */
export const GROTTE_COMMON_BASE_MIN = 100
export const GROTTE_RARE_BASE_MAX = 14

/** La « grotte fusion » = les trois étages de la Grotte du Nexus. */
export function isGrotteMap(mapId: string): boolean {
    return mapId.startsWith("yellow_grotte_nexus")
}

/** Facteur à appliquer au poids d'une entrée sauvage. 1 partout, sauf dans la Grotte pour un champion OR :
 *  ×2 sur les rares (base ≤ 14), ×½ sur les communs (base ≥ 100). Les UNCOMMON (45) ne bougent pas. */
export function grotteGoldWeightMult(base: number, mapId: string, goldCleared: boolean): number {
    if (!goldCleared || !isGrotteMap(mapId)) return 1
    if (base >= GROTTE_COMMON_BASE_MIN) return GROTTE_GOLD_COMMON_MULT
    if (base <= GROTTE_RARE_BASE_MAX) return GROTTE_GOLD_RARE_MULT
    return 1
}

/** La Fusio-Ball est-elle en rayon pour ce joueur ? */
export function fusioBallInShop(goldCleared: boolean): boolean {
    return goldCleared
}
