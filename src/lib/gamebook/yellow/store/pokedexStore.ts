// src/lib/gamebook/yellow/store/pokedexStore.ts
//
// Nexus Jaune Éclair — Pokédex : registre seen/caught + complétion.
// Store externe (useSyncExternalStore). Synchronisé par la couche store du combat
// (seen à la rencontre, caught à la capture/évolution). Sérialisable pour la save.

import { useSyncExternalStore } from "react"
import { visibleDexSpecies, isDexHidden, getSpecies } from "../data/species"

export interface PokedexState {
    seen: string[]    // speciesId
    caught: string[]  // speciesId
}

let dex: PokedexState = { seen: [], caught: [] }
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

export function subscribePokedex(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export function getPokedex(): PokedexState {
    return dex
}

// --- Mutations (immutables → nouvelle référence à chaque changement) ---

export function markSeen(speciesId: string) {
    if (dex.seen.includes(speciesId)) return
    dex = { ...dex, seen: [...dex.seen, speciesId] }
    emit()
}

export function markCaught(speciesId: string) {
    const seen = dex.seen.includes(speciesId) ? dex.seen : [...dex.seen, speciesId]
    if (dex.caught.includes(speciesId)) {
        if (seen !== dex.seen) { dex = { ...dex, seen }; emit() }
        return
    }
    dex = { seen, caught: [...dex.caught, speciesId] }
    emit()
}

/** Restauration depuis la sauvegarde. */
export function hydratePokedex(state: PokedexState) {
    dex = { seen: [...state.seen], caught: [...state.caught] }
    emit()
}

export function pokedexCompletion(isChampion = false, isRun2 = false, isRun3 = false, dexFullUnlock = false): { caught: number; total: number; pct: number } {
    // Le TOTAL suit le tier de la run (run 1 → run 1 ; run 2 → run 1+2 ; run 3 → tous) → pas de spoiler ni de
    // compteur qui « gonfle » avant l'heure. Le set `caught` est GLOBAL/persistant (grandit d'un run à l'autre),
    // mais on ne compte QUE les captures visibles dans le tier courant (une capture run-3 ne compte qu'en run 3).
    // dexFullUnlock (post-run 3) : total = catalogue COMPLET, progression mesurée sur les 100%.
    const total = visibleDexSpecies(dex.caught, isChampion, isRun2, isRun3, dexFullUnlock, dex.seen).length
    // captures comptées = celles VISIBLES dans le tier courant (une capture run-3 ne gonfle pas le compteur en run 1)
    const caught = dex.caught.filter((id) => { const sp = getSpecies(id); return !!sp && !isDexHidden(sp, dex.caught, isChampion, isRun2, isRun3, dexFullUnlock, dex.seen) }).length
    return { caught, total, pct: total > 0 ? Math.round((caught / total) * 100) : 0 }
}

// --- Hooks ---
export function usePokedex(): PokedexState {
    return useSyncExternalStore(subscribePokedex, getPokedex, getPokedex)
}
