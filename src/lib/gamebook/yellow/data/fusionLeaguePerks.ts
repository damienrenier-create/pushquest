// 🏅 RÉCOMPENSES D'ASSIDUITÉ — ce que débloque le palier OR de la Ligue de Fusion.
//
// Règle de Sartay (15/10/2026) : dorénavant, un joueur qui a bouclé l'OR (marqueur `fusleague_or`) obtient deux
// privilèges PERMANENTS, pour récompenser ceux qui s'accrochent :
//   1. les FUSIO-BALLS s'achètent en boutique, 1000 ⚡ pièce (jusque-là : une par complétion de Ligue, point) ;
//   2. dans la GROTTE DU NEXUS (la « grotte fusion », 1F/B1F/B2F), les RARES popent deux fois plus et les COMMUNS
//      deux fois moins — on ne fait plus la queue derrière les Mottoche.
//
// Module PUR : aucune lecture de save ici. L'appelant passe « a-t-il bouclé l'or ? » (isTrainerDefeated).

/** Prix fixe de la Fusio-Ball en boutique pour un champion OR. FLAT : la Bourse ne s'y applique pas. */
export const FUSIO_BALL_SHOP_PRICE = 1000

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
