// src/lib/gamebook/yellow/data/nemesisChallenge.ts
//
// DÉFI NÉMÉSIS — vœu du génie de JACANON. Combat UNIQUE contre une équipe composée du CONTRE de
// chacun de ses Daemons (lus AU MOMENT du combat, au MÊME niveau). Victoire → Caninombre parfait à
// croissance lente ; défaite → plus aucun Caninombre ne popera JAMAIS pour lui. 1 seul essai.
//
// Réutilise la machinerie ACE (bestCounter / baseSpeciesOf / speciesAtLevel) — aucun nouveau champ de
// save : tout passe par des marqueurs `defeatedTrainers` (persistés partout, idempotents).

import type { MonInstance } from "../battle/types"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { bestCounter, baseSpeciesOf, speciesAtLevel } from "./ace"

/** trainerId du PNJ némésis → déclenche le combat ET son issue (finishBattle branche dessus). */
export const NEMESIS_CHALLENGE_TRAINER_ID = "y_nemesis_challenge"

/** Marqueurs d'état (dans defeatedTrainers — persistés partout, one-shot). */
export const NEMESIS_ARMED_MARKER = "nemesis_challenge_armed"   // vœu accepté → le défi est disponible
export const NEMESIS_DONE_MARKER = "nemesis_challenge_done"     // l'unique essai est consommé (win OU lose)
export const CANINOMBRE_BLOCKED_MARKER = "caninombre_blocked"   // défaite → Caninombre ne pope plus jamais

/** Vœu PERSONNEL : seul ce pseudo voit le PNJ (comparaison insensible à la casse/forme Unicode). */
export const NEMESIS_CHALLENGE_NICKNAME = "Jacanon"

/** Récompense : Caninombre PARFAIT (IV 15) niv 5, croissance LENTE (comme un légendaire, growthMult 1.25). */
export const NEMESIS_REWARD_SPECIES = "caninombre"
export const NEMESIS_REWARD_LEVEL = 5
export const NEMESIS_REWARD_GROWTH_MULT = 1.25

/** Emplacement du PNJ : Centre Pokémon de la Ville Jaune, case (1,7), regard vers la DROITE. */
export const NEMESIS_CHALLENGE_MAP_ID = "yellow_infirmary"
export const NEMESIS_CHALLENGE_POS = { x: 1, y: 7 } as const

/** Le pseudo courant a-t-il accès au défi ? (insensible à la casse + forme Unicode). */
export function isNemesisChallengePlayer(nickname: string): boolean {
    return (nickname ?? "").normalize("NFC").trim().toLowerCase() === NEMESIS_CHALLENGE_NICKNAME.toLowerCase()
}

/** Nom affiché du PNJ. */
export const NEMESIS_CHALLENGE_NPC_NAME = "LE NÉMÉSIS"

/** Avertissement AVANT le combat (dernier écran → le combat se lance à la fermeture). 1 SEUL essai. */
export const NEMESIS_INTRO_LINES = [
    "Une silhouette encapuchonnée se dresse devant toi. Sous la capuche, aucun visage — juste ton propre reflet, en négatif.",
    "« Tu veux un Caninombre au sang parfait, mortel ? Alors prouve-le. Face à toi : le CONTRE de chacun de tes Daemons, à leur exacte mesure. »",
    "« Une seule tentative. Tu gagnes → le sang parfait est à toi. Tu perds → plus jamais un Caninombre ne croisera ta route. À jamais. »",
    "« Approche. Le miroir ne pardonne pas. »",
]
/** Pas d'équipe valide → on refuse de lancer (pas de consommation de l'essai). */
export const NEMESIS_NO_TEAM_LINES = [
    "« Tu te présentes le carquois vide ? Reviens avec des Daemons debout, mortel. Je ne gaspille pas un miroir sur un cadavre. »",
]
/** Après la tentative gagnée (Caninombre offert) → le PNJ reste muet. */
export const NEMESIS_WON_LINES = [
    "« …Le sang parfait coule désormais dans tes rangs. Le miroir s'incline. Va. »",
]
/** Après la tentative perdue (Caninombre à jamais scellé). */
export const NEMESIS_LOST_LINES = [
    "« Le miroir t'a jugé. Aucun Caninombre ne répondra plus jamais à ton appel. C'était ton unique chance. »",
]

/**
 * Construit l'équipe némésis À LA VOLÉE : pour CHAQUE Daemon de l'équipe joueur, son meilleur CONTRE
 * existant (bestCounter sur ses types), rétro-évolué au bon STADE pour son niveau, et fielded AU MÊME
 * niveau. Déterministe (bestCounter est déterministe). Ignore les espèces inconnues (custom non résolues).
 */
export function buildNemesisChallengeTeam(playerTeam: readonly MonInstance[]): MonInstance[] {
    const out: MonInstance[] = []
    for (const m of playerTeam) {
        const sp = getSpecies(m.speciesId)
        if (!sp) continue // Daemon custom non enregistré (rare) → pas de contre calculable, on saute
        const counterBase = baseSpeciesOf(bestCounter([...sp.types]))
        const counterId = speciesAtLevel(counterBase, m.level)
        out.push(createMonInstance(counterId, m.level, { owned: false }))
    }
    return out
}

/** Le Caninombre-récompense (instance prête à ajouter à l'équipe/PC). */
export function buildNemesisReward(): MonInstance {
    return createMonInstance(NEMESIS_REWARD_SPECIES, NEMESIS_REWARD_LEVEL, {
        ivs: 15, owned: true, growthMult: NEMESIS_REWARD_GROWTH_MULT,
    })
}
