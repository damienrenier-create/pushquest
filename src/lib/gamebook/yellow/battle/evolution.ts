// src/lib/gamebook/yellow/battle/evolution.ts
//
// Nexus Jaune Éclair — déclenchement et application des évolutions. React-free, pur.
// L'évolution par NIVEAU se vérifie après une montée de niveau (post-combat, comme
// dans les jeux). Les méthodes OBJET / BONHEUR sont déclenchées par leurs events propres.

import type { MonInstance } from "./types"
import { getSpecies } from "../data/species"

/** Espèce cible si le monstre peut évoluer MAINTENANT (méthode niveau), sinon null. */
export function levelEvolutionTarget(mon: MonInstance): string | null {
    const sp = getSpecies(mon.speciesId)
    if (!sp?.evolution) return null
    const evo = sp.evolution
    if (evo.method.kind === "LEVEL" && mon.level >= evo.method.level) return evo.toId
    return null
}

/** Espèce cible si un objet d'évolution s'applique, sinon null. */
export function itemEvolutionTarget(mon: MonInstance, itemId: string): string | null {
    const sp = getSpecies(mon.speciesId)
    if (!sp?.evolution) return null
    const evo = sp.evolution
    if (evo.method.kind === "ITEM" && evo.method.itemId === itemId) return evo.toId
    return null
}

export interface EvolutionResult {
    fromId: string
    fromName: string
    toId: string
    toName: string
}

/**
 * Applique l'évolution (MUTE l'instance) : change l'espèce.
 * Les PV courants sont conservés (le nouveau max est recalculé à la lecture via
 * fullStats) ; le moteur/UI peut re-clamp et soigner le delta si besoin.
 * Le learnset suit automatiquement la nouvelle espèce.
 */
export function applyEvolution(mon: MonInstance, toId: string): EvolutionResult | null {
    const fromSp = getSpecies(mon.speciesId)
    const toSp = getSpecies(toId)
    if (!fromSp || !toSp) return null
    mon.speciesId = toId
    return { fromId: fromSp.id, fromName: fromSp.name, toId: toSp.id, toName: toSp.name }
}
