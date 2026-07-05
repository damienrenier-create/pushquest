// Nexus Jaune Éclair — Dex de référence (toutes les espèces, non gated).
// Helpers PARTAGÉS par la liste et la fiche : couleurs de type, chaîne d'évolution,
// défenses (table des types), couleur de barre de stat. Données pures, React-free.

import { SPECIES } from "@/lib/gamebook/yellow/data/species"
import { POKE_TYPES, type PokeType, type StatKey, type SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import { typeEffectiveness } from "@/lib/gamebook/yellow/battle/typeChart"

// Couleur par type (chips + accents). Palette type-Gen1 classique.
export const TYPE_COLORS: Record<PokeType, string> = {
    NORMAL: "#a8a878", FEU: "#f08030", EAU: "#6890f0", PLANTE: "#78c850",
    ELEC: "#f8d030", GLACE: "#98d8d8", COMBAT: "#c03028", POISON: "#a040a0",
    SOL: "#e0c068", VOL: "#a890f0", PSY: "#f85888", INSECTE: "#a8b820",
    ROCHE: "#b8a038", SPECTRE: "#705898", DRAGON: "#7038f8", FEE: "#e879c8",
}

// Abréviation 3 lettres par type (axes de la table des types).
export const TYPE_ABBR: Record<PokeType, string> = {
    NORMAL: "NOR", FEU: "FEU", EAU: "EAU", PLANTE: "PLA", ELEC: "ELE",
    GLACE: "GLA", COMBAT: "COM", POISON: "POI", SOL: "SOL", VOL: "VOL",
    PSY: "PSY", INSECTE: "INS", ROCHE: "ROC", SPECTRE: "SPE", DRAGON: "DRA", FEE: "FEE",
}

// Ordre + libellés FR des 5 stats Gen 1.
export const STAT_ORDER: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
export const STAT_LABEL: Record<StatKey, string> = {
    hp: "PV", atk: "ATQ", def: "DÉF", spe: "VIT", spc: "SPÉ",
}

/** Total des stats de base (BST). */
export function baseStatTotal(stats: Record<StatKey, number>): number {
    return STAT_ORDER.reduce((sum, k) => sum + stats[k], 0)
}

/** Couleur d'une barre de stat selon sa valeur (rouge bas → vert haut). */
export function statColor(value: number): string {
    if (value < 50) return "#e0533a"
    if (value < 70) return "#e08c30"
    if (value < 90) return "#e0c020"
    if (value < 110) return "#9ac030"
    return "#3aa860"
}

// Une étape de la lignée évolutive.
export interface EvoStage {
    id: string
    name: string
    sprite: string
    /** Condition qui mène À cette étape (null pour la forme de base). */
    methodLabel: string | null
}

/** Reconstruit la lignée évolutive COMPLÈTE (base → finale) contenant `id`. */
export function buildEvolutionChain(id: string): EvoStage[] {
    // Map reverse : cible → { from, condition d'évolution }.
    const pre: Record<string, { from: string; label: string }> = {}
    for (const sp of Object.values(SPECIES)) {
        if (!sp.evolution) continue
        const m = sp.evolution.method
        const label =
            m.kind === "LEVEL" ? `Niv. ${m.level}`
                : m.kind === "ITEM" ? "Objet"
                    : "Échange"
        pre[sp.evolution.toId] = { from: sp.id, label }
    }

    // Remonte jusqu'à la racine.
    let root = id
    while (pre[root]) root = pre[root].from

    // Redescend la chaîne depuis la racine.
    const chain: EvoStage[] = []
    let cur: string | undefined = root
    let incomingLabel: string | null = null
    while (cur) {
        const sp: SpeciesData | undefined = SPECIES[cur]
        if (!sp) break
        chain.push({ id: sp.id, name: sp.name, sprite: sp.sprite, methodLabel: incomingLabel })
        if (sp.evolution) {
            incomingLabel = pre[sp.evolution.toId]?.label ?? null
            cur = sp.evolution.toId
        } else {
            cur = undefined
        }
    }
    return chain
}

export interface TypeMatch { type: PokeType; mult: number }

export interface TypeDefenses {
    weak: TypeMatch[]     // ×2 ou ×4
    resist: TypeMatch[]   // ×0.5 ou ×0.25
    immune: TypeMatch[]   // ×0
}

/** Pour chaque type attaquant, l'efficacité contre `defenderTypes`, classée. */
export function computeTypeDefenses(defenderTypes: PokeType[]): TypeDefenses {
    const weak: TypeMatch[] = []
    const resist: TypeMatch[] = []
    const immune: TypeMatch[] = []
    for (const t of POKE_TYPES) {
        const mult = typeEffectiveness(t, defenderTypes)
        if (mult === 0) immune.push({ type: t, mult })
        else if (mult > 1) weak.push({ type: t, mult })
        else if (mult < 1) resist.push({ type: t, mult })
    }
    // Les plus dangereux / les plus encaissés d'abord.
    weak.sort((a, b) => b.mult - a.mult)
    resist.sort((a, b) => a.mult - b.mult)
    return { weak, resist, immune }
}
