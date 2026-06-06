// src/lib/gamebook/yellow/data/sbire.ts
//
// Nexus Jaune Éclair — SBIRE du dieu Spaghetti : rival-sensei récurrent (2×/jour).
// 1er combat du jour = MIROIR (même Daemon que ton lead). 2e = ta FAIBLESSE
// (un Daemon d'un type super-efficace contre toi). Toujours à niveau équivalent.
// Chaque victoire délivre une explication sur l'app.

import { SPECIES, getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import { POKE_TYPES, type PokeType, type MonInstance } from "../battle/types"
import { createMonInstance } from "../battle/factory"

export const SBIRE_MAX_FIGHTS_PER_DAY = 2

/** Id partagé du combat de sbire (gameStore le lance, battleStore le reconnaît à la fin). */
export const SBIRE_TRAINER_ID = "y_sbire"

/** Un type super-efficace contre les types du lead (repli NORMAL si rien). */
function counterTypeFor(types: PokeType[]): PokeType {
    for (const t of POKE_TYPES) {
        if (typeEffectiveness(t, types) > 1) return t
    }
    return "NORMAL"
}

/** Une espèce (déterministe) du type donné. */
function speciesOfType(t: PokeType): string {
    const match = Object.values(SPECIES).find((s) => s.types.includes(t))
    return match?.id ?? Object.keys(SPECIES)[0]
}

/**
 * Équipe du sbire pour le combat n° fightIndex du jour :
 *   0 → MIROIR (même espèce/niveau que le lead),
 *   1 → FAIBLESSE (espèce d'un type super-efficace contre le lead, même niveau).
 */
export function buildSbireTeam(lead: MonInstance, fightIndex: number): MonInstance[] {
    const level = lead.level
    if (fightIndex <= 0) return [createMonInstance(lead.speciesId, level)]
    const sp = getSpecies(lead.speciesId)
    const counter = speciesOfType(counterTypeFor(sp?.types ?? ["NORMAL"]))
    return [createMonInstance(counter, level)]
}

/** Pool d'explications sur l'app, distillées une par victoire (cycle sur la durée). */
export const SBIRE_EXPLANATIONS: string[] = [
    "Tes reps RÉELS sont ton énergie : chaque jour, ce que tu fais s'ajoute à minuit à ton portefeuille.",
    "Tes attaques coûtent des reps (pas de PP). Frappe fort… ou économise. À toi de juger.",
    "Plus tu t'entraînes pour de vrai, meilleurs sont les IV des Daemons que tu captures.",
    "Chaque niveau gagné donne des points Saiyan à répartir. Mais une amende les réduit à zéro : reste discipliné.",
    "Combats souvent : l'expérience de combat (EV) muscle peu à peu tes Daemons, façon vétéran.",
    "Les 3 chefs d'arène donnent des badges : plus d'énergie par combat et des CT débloquées.",
    "Surmonter ta faiblesse, c'est savoir changer de Daemon au bon moment. N'aie pas peur de switcher.",
]

/** Explication à afficher pour la n-ième victoire (1-indexée), cycle sur le pool. */
export function sbireExplanation(winNumber: number): string {
    const i = (Math.max(1, winNumber) - 1) % SBIRE_EXPLANATIONS.length
    return SBIRE_EXPLANATIONS[i]
}
