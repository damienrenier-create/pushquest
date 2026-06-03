// src/lib/gamebook/yellow/battle/typeChart.ts
//
// Nexus Jaune Éclair — table d'efficacité des types.
// Données pures (data-driven) : pour ajouter/retirer un type, on touche
// uniquement POKE_TYPES (types.ts) + cette table.
//
// Convention : CHART[attaquant][défenseur] = multiplicateur (0 / 0.5 / 1 / 2).
// Les paires non listées valent 1 (neutre).

import { POKE_TYPES, type PokeType } from "./types"

type ChartRow = Partial<Record<PokeType, number>>

const CHART: Record<PokeType, ChartRow> = {
    NORMAL: { ROCHE: 0.5, SPECTRE: 0 },
    FEU: { FEU: 0.5, EAU: 0.5, PLANTE: 2, GLACE: 2, ROCHE: 0.5 },
    EAU: { FEU: 2, EAU: 0.5, PLANTE: 0.5, ROCHE: 2 },
    PLANTE: { FEU: 0.5, EAU: 2, PLANTE: 0.5, VOL: 0.5, ROCHE: 2 },
    ELEC: { EAU: 2, PLANTE: 0.5, ELEC: 0.5, VOL: 2 },
    COMBAT: { NORMAL: 2, GLACE: 2, ROCHE: 2, TENEBRES: 2, PSY: 0.5, VOL: 0.5, SPECTRE: 0 },
    VOL: { PLANTE: 2, COMBAT: 2, ELEC: 0.5, ROCHE: 0.5 },
    PSY: { COMBAT: 2, PSY: 0.5, TENEBRES: 0 },
    ROCHE: { FEU: 2, GLACE: 2, VOL: 2, COMBAT: 0.5 },
    SPECTRE: { PSY: 2, SPECTRE: 2, NORMAL: 0, TENEBRES: 0.5 },
    GLACE: { PLANTE: 2, VOL: 2, EAU: 0.5, GLACE: 0.5, FEU: 0.5 },
    TENEBRES: { PSY: 2, SPECTRE: 2, COMBAT: 0.5, TENEBRES: 0.5 },
}

/** Multiplicateur d'un type d'attaque contre UN type de défense. */
export function typeMultiplier(attack: PokeType, defend: PokeType): number {
    return CHART[attack]?.[defend] ?? 1
}

/** Efficacité totale d'une attaque contre un (ou deux) types de défense. */
export function typeEffectiveness(attack: PokeType, defenderTypes: PokeType[]): number {
    return defenderTypes.reduce((mult, t) => mult * typeMultiplier(attack, t), 1)
}

/** Libellé FR du multiplicateur, pour la file de messages de combat. */
export function effectivenessMessage(mult: number): string | null {
    if (mult === 0) return "Ça n'affecte pas le Daemon adverse…"
    if (mult >= 2) return "C'est super efficace !"
    if (mult > 0 && mult < 1) return "Ce n'est pas très efficace…"
    return null
}

/** Sanity : garde la liste des types à jour si on en ajoute. */
export const KNOWN_TYPES = POKE_TYPES
