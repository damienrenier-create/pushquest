// ✨ SHINY CRAFTÉS — les créations de joueurs canonisées qui rôdent partout, pour ceux qui ont atteint le Dôme Fusion.
//
// Règle de Sartay (15/10/2026) : Dracominus (Rob), Stashex (Tom), Ewokid (TomGotrails) et Chadine (Kingme) sont
// « des sortes de shiny ». Elles peuvent apparaître dans N'IMPORTE QUELLE haute herbe ou grotte — tous runs, toutes
// zones — une fois que le joueur est ARRIVÉ au Dôme Fusion. Taux « hyper rare, mais moins qu'un shiny ».
//
// Mécanisme : comme le shiny, c'est une SURCOUCHE sur une rencontre déjà décidée, pas une entrée de pool. Une fois la
// rencontre tirée, un jet unique peut la REMPLACER par l'une des quatre (au même niveau, stade selon le niveau). Le
// pool de la zone, ses gates et ses poids ne bougent pas d'un iota.
//
// Taux retenu : 1/256 pour le GROUPE (une des quatre, équiprobables) — le double d'un shiny (1/512). Chaque lignée
// individuellement sort donc à ~1/1024. À ajuster ici, en un seul endroit.
//
// Module PUR : la porte (« arrivé au Dôme ») est évaluée par l'appelant via craftedShinyUnlocked.

/** Les 4 lignées, par l'id de leur STADE 1 (le stade affiché suit le niveau de la rencontre). */
export const CRAFTED_SHINY_IDS = ["dracominus", "stashex", "ewokid", "chadine"] as const
export type CraftedShinyId = typeof CRAFTED_SHINY_IDS[number]

/** Probabilité, par rencontre, qu'elle soit remplacée par un shiny crafté (une des quatre). */
export const CRAFTED_SHINY_CHANCE = 1 / 256

/** « Arrivé au Dôme Fusion » = le prologue de l'Autel vu (dalles d'entrée), ou l'épreuve de fusion remportée. */
export const CRAFTED_SHINY_UNLOCK_MARKERS = ["fusion_prologue_seen", "fusion_unlocked"] as const

export function craftedShinyUnlocked(isCleared: (marker: string) => boolean): boolean {
    return CRAFTED_SHINY_UNLOCK_MARKERS.some((m) => isCleared(m))
}

/** Tire la surcouche. null = pas de shiny crafté cette fois. Consomme UN jet si raté, DEUX si réussi (le second
 *  choisit la lignée) — et jamais aucun jet quand l'appelant n'est pas éligible (il ne doit pas appeler). */
export function rollCraftedShiny(rng: () => number = Math.random): CraftedShinyId | null {
    if (rng() >= CRAFTED_SHINY_CHANCE) return null
    const i = Math.min(CRAFTED_SHINY_IDS.length - 1, Math.max(0, Math.floor(rng() * CRAFTED_SHINY_IDS.length)))
    return CRAFTED_SHINY_IDS[i]
}
