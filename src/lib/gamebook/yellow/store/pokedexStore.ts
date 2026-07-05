// src/lib/gamebook/yellow/store/pokedexStore.ts
//
// Nexus Jaune Éclair — Pokédex : registre seen/caught + complétion.
// Store externe (useSyncExternalStore). Synchronisé par la couche store du combat
// (seen à la rencontre, caught à la capture/évolution). Sérialisable pour la save.

import { useSyncExternalStore } from "react"
import { visibleDexSpecies } from "../data/species"

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

export function pokedexCompletion(): { caught: number; total: number; pct: number } {
    // Le total EXCLUT les espèces run-2 non encore capturées (Gékraise/Ukognos/Merorem) → pas de spoiler
    // « X/137 » avant le run 2. Une fois obtenues, elles rentrent dans le total ET dans les captures.
    const total = visibleDexSpecies(dex.caught).length
    const caught = dex.caught.length
    return { caught, total, pct: total > 0 ? Math.round((caught / total) * 100) : 0 }
}

// --- Hooks ---
export function usePokedex(): PokedexState {
    return useSyncExternalStore(subscribePokedex, getPokedex, getPokedex)
}
