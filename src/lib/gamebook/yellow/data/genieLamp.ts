// src/lib/gamebook/yellow/data/genieLamp.ts
//
// Arc « La Lampe & le Génie » (Nexus Jaune) — constantes + helpers PURS partagés (React-free).
// Flow : embuscade (une rencontre sauvage devient un dresseur facile) → « vieille lampe rouillée » →
// frottement tactile → le génie apparaît → 3 vœux (zone de texte) → le créateur fixe une contrepartie
// par vœu → retour du génie (accepter/refuser). GLOBAL & automatique, UNE seule fois par joueur.

/** Dresseur-embuscade : lancé par CODE (swap depuis la rencontre sauvage), placé hors-carte pour éviter un hitbox overworld. */
export const GENIE_TRAINER_ID = "y_genie_ambush"
/** Objet remis à la victoire de l'embuscade. */
export const LAMP_ITEM_ID = "lampe_rouillee"
/** Marker (defeatedTrainers) posé quand la lampe est frottée → débloque l'onglet 🧞 (pas de nouveau champ de save). */
export const LAMP_RUBBED_MARKER = "lamp_rubbed"

/** Compteur avant embuscade : N tiré UNE fois par joueur dans [MIN, MAX]. */
export const LAMP_CD_MIN = 3
export const LAMP_CD_MAX = 10
/** L'embuscade ne se déclenche que si l'équipe est au-dessus de ce ratio de PV (fraîche → combat facile & juste). */
export const LAMP_HP_MIN_RATIO = 0.9
/** Plancher absolu du niveau du colporteur. */
export const GENIE_TRAINER_LEVEL_MIN = 3
/** Écart de niveau (cap) du colporteur SOUS la moyenne d'équipe, ÉCHELONNÉ : l'écart se creuse quand le joueur monte
 *  → reste « pas trop faible » tôt, « gagnable » tard. −2 (<20) · −3 (<40) · −4 (<60) · −5 (<80) · −6 (80+). */
export function genieTrainerDelta(refLevel: number): number {
    const l = Math.round(refLevel)
    return l < 20 ? 2 : l < 40 ? 3 : l < 60 ? 4 : l < 80 ? 5 : 6
}

/** Déploiement progressif de l'arc : GENIE_ARC_ALL=false → réservé à la liste blanche (test) ; true → TOUS les joueurs.
 *  L'embuscade (seul point d'amorçage) est gatée là-dessus → tout l'arc suit (lampe/génie/onglet n'existent qu'après). */
export const GENIE_ARC_ALL = false
export const GENIE_ARC_NICKS: readonly string[] = ["mools"]
export function genieArcEnabledFor(nickname?: string | null): boolean {
    if (GENIE_ARC_ALL) return true
    return !!nickname && GENIE_ARC_NICKS.includes(nickname.trim().toLowerCase())
}

/** Tire le compteur d'embuscade N ∈ [MIN, MAX]. `rng` optionnel (défaut Math.random). */
export function rollLampCountdown(rng: () => number = Math.random): number {
    return LAMP_CD_MIN + Math.floor(rng() * (LAMP_CD_MAX - LAMP_CD_MIN + 1))
}

/** Ratio de PV de l'équipe (Σ PV courants / Σ PV max). 0 si équipe vide / max nul. */
export function teamHpRatio(mons: ReadonlyArray<{ hp: number; maxHp: number }>): number {
    let cur = 0, max = 0
    for (const m of mons) { cur += Math.max(0, m.hp); max += Math.max(0, m.maxHp) }
    return max > 0 ? cur / max : 0
}

/** L'équipe est-elle assez fraîche pour déclencher l'embuscade ? (ratio de PV > LAMP_HP_MIN_RATIO) */
export function teamFreshEnough(mons: ReadonlyArray<{ hp: number; maxHp: number }>): boolean {
    return teamHpRatio(mons) > LAMP_HP_MIN_RATIO
}

/** Niveau du colporteur = MOYENNE d'équipe du joueur − écart échelonné (genieTrainerDelta), avec plancher. */
export function genieTrainerLevel(playerRefLevel: number): number {
    return Math.max(GENIE_TRAINER_LEVEL_MIN, Math.round(playerRefLevel) - genieTrainerDelta(playerRefLevel))
}

/** Phase de test (allowlist, GENIE_ARC_ALL=false) → l'embuscade pop dès la 1re rencontre sauvage (pas d'attente
 *  ni de garde PV). Une fois ouvert à tous (GENIE_ARC_ALL=true), on repasse au compteur N∈[3,10] + équipe fraîche. */
export function genieArcImmediate(): boolean {
    return !GENIE_ARC_ALL
}
