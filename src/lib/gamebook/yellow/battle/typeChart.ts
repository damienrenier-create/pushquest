// src/lib/gamebook/yellow/battle/typeChart.ts
//
// Nexus Jaune Éclair — table d'efficacité des 17 types (Gen 1 + FÉE + MÉTAL) + catégorie
// physique/spéciale PAR TYPE (règle Gen 1 : le type du move décide s'il tape en
// Attaque ou en Spécial). Données pures, data-driven.
//
// CHART[attaquant][défenseur] = multiplicateur (0 / 0.5 / 1 / 2). Non listé = 1.

import { POKE_TYPES, type PokeType } from "./types"

type ChartRow = Partial<Record<PokeType, number>>

const CHART: Record<PokeType, ChartRow> = {
    NORMAL: { ROCHE: 0.5, SPECTRE: 0, METAL: 0.5 },
    FEU: { PLANTE: 2, GLACE: 2, INSECTE: 2, METAL: 2, FEU: 0.5, EAU: 0.5, ROCHE: 0.5, DRAGON: 0.5 },
    EAU: { FEU: 2, SOL: 2, ROCHE: 2, EAU: 0.5, PLANTE: 0.5, DRAGON: 0.5 },
    PLANTE: { EAU: 2, SOL: 2, ROCHE: 2, FEU: 0.5, PLANTE: 0.5, POISON: 0.5, VOL: 0.5, INSECTE: 0.5, DRAGON: 0.5, METAL: 0.5 },
    ELEC: { EAU: 2, VOL: 2, ELEC: 0.5, PLANTE: 0.5, DRAGON: 0.5, SOL: 0 },
    GLACE: { PLANTE: 2, SOL: 2, VOL: 2, DRAGON: 2, EAU: 0.5, GLACE: 0.5, METAL: 0.5 },
    COMBAT: { NORMAL: 2, GLACE: 2, ROCHE: 2, METAL: 2, POISON: 0.5, VOL: 0.5, PSY: 0.5, INSECTE: 0.5, SPECTRE: 0, FEE: 0.5, TENEBRES: 2 },
    POISON: { PLANTE: 2, INSECTE: 2, POISON: 0.5, SOL: 0.5, ROCHE: 0.5, SPECTRE: 0.5, FEE: 2, METAL: 0 },
    SOL: { FEU: 2, ELEC: 2, POISON: 2, ROCHE: 2, METAL: 2, PLANTE: 0.5, INSECTE: 0.5, VOL: 0 },
    VOL: { PLANTE: 2, COMBAT: 2, INSECTE: 2, ELEC: 0.5, ROCHE: 0.5, METAL: 0.5 },
    PSY: { COMBAT: 2, POISON: 2, PSY: 0.5, METAL: 0.5, TENEBRES: 0 }, // TÉNÈBRES immunisé au Psy (Psy ×0)
    INSECTE: { PLANTE: 2, PSY: 2, POISON: 2, FEU: 0.5, COMBAT: 0.5, VOL: 0.5, SPECTRE: 0.5, FEE: 0.5, METAL: 0.5, TENEBRES: 2 },
    ROCHE: { FEU: 2, GLACE: 2, VOL: 2, INSECTE: 2, COMBAT: 0.5, SOL: 0.5, METAL: 0.5 },
    SPECTRE: { PSY: 2, SPECTRE: 2, NORMAL: 0, TENEBRES: 0.5 }, // Ténèbres résiste au Spectre
    DRAGON: { DRAGON: 2, FEE: 0, METAL: 0.5 },
    // FÉE (spécial) — 1er type Fée du jeu, réservé au légendaire Ukognos (run 2). Némésis-type du Dragon.
    FEE: { COMBAT: 2, DRAGON: 2, FEU: 0.5, POISON: 0.5, METAL: 0.5, TENEBRES: 2 },
    // MÉTAL (physique) — introduit au run 3 (forteresse de Magnetor). Type TANK : peu de super-efficacité
    // offensive (Glace/Roche/Fée), mais une DÉFENSE écrasante — résiste 10 types, immunisé au Poison,
    // faible seulement au Feu/Combat/Sol.
    METAL: { GLACE: 2, ROCHE: 2, FEE: 2, FEU: 0.5, EAU: 0.5, ELEC: 0.5, METAL: 0.5 },
    // TÉNÈBRES (spécial) — introduit au run 3 (némésis de Shady : NORMAL/SPECTRE n'avait AUCUNE faiblesse, seul
    // Ténèbres perce sa moitié Spectre ×2). Vraie table Dark : ×2 Spectre/Psy en attaque ; faible Combat/Insecte/Fée,
    // résiste Spectre/Ténèbres, IMMUNISÉ au Psy en défense.
    TENEBRES: { SPECTRE: 2, PSY: 2, COMBAT: 0.5, FEE: 0.5, TENEBRES: 0.5 },
}

// Gen 1 : la catégorie d'un move offensif est déterminée par son TYPE. MÉTAL = physique (frappe à l'ATQ).
const PHYSICAL_TYPES = new Set<PokeType>(["NORMAL", "COMBAT", "VOL", "POISON", "SOL", "ROCHE", "INSECTE", "SPECTRE", "METAL"])

/** "PHYSICAL" → utilise Attaque/Défense ; "SPECIAL" → utilise Spécial/Spécial. */
export function moveCategory(type: PokeType): "PHYSICAL" | "SPECIAL" {
    return PHYSICAL_TYPES.has(type) ? "PHYSICAL" : "SPECIAL"
}

/**
 * STAB ADAPTATIF (CT « Apothéose »). Résout le TYPE et la CATÉGORIE EFFECTIFS d'une attaque adaptative
 * pour un Daemon donné : la catégorie suit sa meilleure stat offensive (atk ≥ spc → physique), et le type
 * devient un de SES types aligné sur cette catégorie (sinon, à défaut, son type principal).
 * SOURCE DE VÉRITÉ unique partagée par le moteur (dégâts réels) ET l'UI (affichage type/catégorie).
 */
export function resolveAdaptiveStab(types: PokeType[], atk: number, spc: number): { type: PokeType; isPhysical: boolean } {
    const isPhysical = atk >= spc
    const type = types.find((t) => (moveCategory(t) === "PHYSICAL") === isPhysical) ?? types[0]
    return { type, isPhysical }
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

export const KNOWN_TYPES = POKE_TYPES
