// src/lib/gamebook/yellow/data/nemesisChallenge.ts
//
// DÉFI NÉMÉSIS — vœu du génie. Combat UNIQUE contre une équipe composée du CONTRE de chacun des Daemons
// du joueur (lus AU MOMENT du combat, au MÊME niveau). Victoire → le Daemon convoité, PARFAIT & à croissance
// lente ; défaite → ce Daemon ne popera JAMAIS plus pour lui. 1 seul essai.
//
// GÉNÉRIQUE : un REGISTRE (pseudo → espèce-récompense) permet de servir plusieurs joueurs (Jacanon→Caninombre,
// Mools→Pyropanthe, …). Réutilise la machinerie ACE (bestCounter / baseSpeciesOf / speciesAtLevel). Aucun
// nouveau champ de save : tout passe par des marqueurs `defeatedTrainers` (persistés partout, idempotents).

import type { MonInstance } from "../battle/types"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { bestCounter, baseSpeciesOf, speciesAtLevel } from "./ace"

/** Un défi némésis = un pseudo + le Daemon qu'il gagne s'il l'emporte. */
export interface NemesisChallenge {
    nickname: string       // pseudo autorisé (insensible casse/forme Unicode)
    rewardSpecies: string  // espèce offerte en cas de victoire (et scellée en cas de défaite)
}

/** REGISTRE des défis actifs. Ajouter une ligne = ouvrir le défi à un nouveau joueur. */
export const NEMESIS_CHALLENGES: readonly NemesisChallenge[] = [
    { nickname: "Jacanon", rewardSpecies: "caninombre" },
    { nickname: "Mools", rewardSpecies: "pyropanthe" },
    { nickname: "Rob", rewardSpecies: "voltapanthe" }, // vœu « un électrique qui TABASSE » → panthère élec (évo Panthéon)
    { nickname: "Fraaans", rewardSpecies: "tenebrir" }, // vœu « un ténébrir » → Ténèbrir (Ténèbres/Spectre) parfait niv 5
]

/** Récompense COMMUNE : niveau 5, IV parfaits (15), croissance LENTE (comme un légendaire). */
export const NEMESIS_REWARD_LEVEL = 5
export const NEMESIS_REWARD_GROWTH_MULT = 1.25

/** id du PNJ (injection + interaction). Le trainerId de COMBAT porte en plus l'espèce-récompense (cf. nemesisBattleTrainerId). */
export const NEMESIS_CHALLENGE_TRAINER_ID = "y_nemesis_challenge"

/** Marqueurs d'état (dans defeatedTrainers — persistés partout, one-shot). Le blocage est PAR ESPÈCE. */
export const NEMESIS_ARMED_MARKER = "nemesis_challenge_armed"   // vœu accepté → le défi est disponible
export const NEMESIS_DONE_MARKER = "nemesis_challenge_done"     // l'unique essai est consommé (win OU lose)
export function nemesisRewardBlockedMarker(species: string): string { return `${species}_blocked` } // défaite → l'espèce ne pope plus jamais + la Pierre Gékroc refuse d'y évoluer un Panthéon (sceau total)

/** Emplacement du PNJ : Centre Pokémon de la Ville Jaune, case (1,7), regard vers la DROITE. */
export const NEMESIS_CHALLENGE_MAP_ID = "yellow_infirmary"
export const NEMESIS_CHALLENGE_POS = { x: 1, y: 7 } as const
export const NEMESIS_CHALLENGE_NPC_NAME = "LE NÉMÉSIS"

function normNick(n: string): string { return (n ?? "").normalize("NFC").trim().toLowerCase() }

/** Le défi de ce pseudo (ou null s'il n'en a pas). */
export function nemesisChallengeFor(nickname: string): NemesisChallenge | null {
    const k = normNick(nickname)
    return NEMESIS_CHALLENGES.find((c) => normNick(c.nickname) === k) ?? null
}
/** Ce pseudo a-t-il un défi ouvert ? */
export function isNemesisChallengePlayer(nickname: string): boolean {
    return nemesisChallengeFor(nickname) != null
}

/** trainerId de COMBAT = id du PNJ + « :espèce » → finishBattle sait quoi offrir/sceller sans connaître le pseudo. */
export function nemesisBattleTrainerId(species: string): string { return `${NEMESIS_CHALLENGE_TRAINER_ID}:${species}` }
/** Extrait l'espèce-récompense d'un trainerId de combat némésis (null si absente). */
export function nemesisRewardSpeciesFromTrainerId(trainerId: string): string | null {
    const p = NEMESIS_CHALLENGE_TRAINER_ID + ":"
    return trainerId.startsWith(p) ? trainerId.slice(p.length) : null
}

/**
 * Construit l'équipe némésis À LA VOLÉE : pour CHAQUE Daemon de l'équipe joueur, son meilleur CONTRE
 * existant (bestCounter sur ses types), rétro-évolué au bon STADE pour son niveau, et fielded AU MÊME
 * niveau. Déterministe. Ignore les espèces inconnues (custom non résolues).
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

/** L'instance-récompense (PARFAITE, niv 5, croissance lente) prête à ajouter à l'équipe/PC. */
export function buildNemesisReward(species: string): MonInstance {
    return createMonInstance(species, NEMESIS_REWARD_LEVEL, {
        ivs: 15, owned: true, growthMult: NEMESIS_REWARD_GROWTH_MULT,
    })
}

/** Nom d'affichage d'une espèce (pour les dialogues), avec repli sur l'id. */
export function nemesisRewardName(species: string): string {
    return getSpecies(species)?.name ?? species
}

/** Avertissement AVANT le combat (le combat se lance à la fermeture). 1 SEUL essai. */
export function nemesisIntroLines(rewardName: string): string[] {
    return [
        "Une silhouette encapuchonnée se dresse devant toi. Sous la capuche, aucun visage — juste ton propre reflet, en négatif.",
        `« Tu veux un ${rewardName} au potentiel PARFAIT, mortel ? Alors prouve-le. Face à toi : le CONTRE de chacun de tes Daemons, à leur exacte mesure. »`,
        `« Une seule tentative. Tu gagnes → il est à toi, parfait. Tu perds → plus JAMAIS un ${rewardName} ne croisera ta route. À jamais. »`,
        "« Approche. Le miroir ne pardonne pas. »",
    ]
}
/** Après la tentative GAGNÉE (Daemon offert). */
export function nemesisWonLines(): string[] {
    return ["« …Le sang parfait coule désormais dans tes rangs. Le miroir s'incline. Va. »"]
}
/** Après la tentative PERDUE (Daemon scellé à jamais). */
export function nemesisLostLines(rewardName: string): string[] {
    return [`« Le miroir t'a jugé. Aucun ${rewardName} ne répondra plus jamais à ton appel. C'était ton unique chance. »`]
}
/** Pas d'équipe valide → on refuse de lancer (l'essai n'est pas consommé). */
export const NEMESIS_NO_TEAM_LINES = [
    "« Tu te présentes le carquois vide ? Reviens avec des Daemons debout, mortel. Je ne gaspille pas un miroir sur un cadavre. »",
]
