// src/lib/gamebook/yellow/store/pokedexStore.ts
//
// Nexus Jaune Éclair — Pokédex : registre seen/caught + complétion.
// Store externe (useSyncExternalStore). Synchronisé par la couche store du combat
// (seen à la rencontre, caught à la capture/évolution). Sérialisable pour la save.

import { useSyncExternalStore } from "react"
import { visibleDexSpecies, isDexHidden, getSpecies, isCustomSpeciesId } from "../data/species"

export interface PokedexState {
    seen: string[]    // speciesId
    caught: string[]  // speciesId
    /** LOCALISATION « premium » (additif, save-safe) : zones (mapId) où le joueur a DÉJÀ croisé l'espèce à l'état
     *  SAUVAGE. Alimenté à la rencontre sauvage (gameStore). Absent sur les vieilles saves → fiche sans zone. */
    seenAt?: Record<string, string[]>
    /** Lieu + date de la PREMIÈRE capture par espèce (écrit une seule fois, idempotent). Rétro-rempli depuis les
     *  Daemons possédés au chargement. Absent sur les vieilles saves → pas de marqueur 1re capture. */
    firstCatch?: Record<string, { mapId: string; at: string }>
}

let dex: PokedexState = { seen: [], caught: [], seenAt: {}, firstCatch: {} }
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

/** LOCALISATION — enregistre une ZONE de rencontre SAUVAGE (idempotent, dédupliqué). N'affecte JAMAIS le moteur ;
 *  sert uniquement à la fiche « zones où j'ai déjà croisé cette créature ». Marque aussi l'espèce comme vue. */
export function recordSeenZone(speciesId: string, mapId: string) {
    if (!speciesId || !mapId) return
    const seenAt = { ...(dex.seenAt ?? {}) }
    const zones = seenAt[speciesId] ?? []
    const seen = dex.seen.includes(speciesId) ? dex.seen : [...dex.seen, speciesId]
    if (zones.includes(mapId) && seen === dex.seen) return
    if (!zones.includes(mapId)) seenAt[speciesId] = [...zones, mapId]
    dex = { ...dex, seen, seenAt }
    emit()
}

/** LOCALISATION — enregistre la PREMIÈRE capture d'une espèce (carte + date). IDEMPOTENT : ne réécrit jamais une
 *  entrée existante → la « première » capture est réellement préservée. Ajoute aussi la zone aux zones croisées. */
export function recordFirstCatch(speciesId: string, mapId: string, at: string) {
    if (!speciesId || !mapId) return
    const fc = dex.firstCatch ?? {}
    if (fc[speciesId]) { if (mapId) recordSeenZone(speciesId, mapId); return } // déjà connu → on garde la 1re
    dex = { ...dex, firstCatch: { ...fc, [speciesId]: { mapId, at } } }
    emit()
    recordSeenZone(speciesId, mapId)
}

/** Zones (mapId) où le joueur a DÉJÀ croisé l'espèce à l'état sauvage (vide si jamais / vieille save). */
export function seenZonesOf(speciesId: string): string[] {
    return dex.seenAt?.[speciesId] ? [...dex.seenAt[speciesId]] : []
}

/** Lieu + date de la 1re capture d'une espèce, ou null. */
export function firstCatchOf(speciesId: string): { mapId: string; at: string } | null {
    return dex.firstCatch?.[speciesId] ?? null
}

/** Restauration depuis la sauvegarde (défensif : champs optionnels tolérés absents). */
export function hydratePokedex(state: PokedexState) {
    dex = {
        seen: [...state.seen],
        caught: [...state.caught],
        seenAt: state.seenAt ? { ...state.seenAt } : {},
        firstCatch: state.firstCatch ? { ...state.firstCatch } : {},
    }
    emit()
}

export function pokedexCompletion(isChampion = false, isRun2 = false, isRun3 = false, dexFullUnlock = false): { caught: number; total: number; pct: number } {
    // Le TOTAL suit le tier de la run (run 1 → run 1 ; run 2 → run 1+2 ; run 3 → tous) → pas de spoiler ni de
    // compteur qui « gonfle » avant l'heure. Le set `caught` est GLOBAL/persistant (grandit d'un run à l'autre),
    // mais on ne compte QUE les captures visibles dans le tier courant (une capture run-3 ne compte qu'en run 3).
    // dexFullUnlock (post-run 3) : total = catalogue COMPLET, progression mesurée sur les 100%.
    const total = visibleDexSpecies(dex.caught, isChampion, isRun2, isRun3, dexFullUnlock, dex.seen).length
    // captures comptées = celles VISIBLES dans le tier courant (une capture run-3 ne gonfle pas le compteur en run 1).
    // `!isCustomSpeciesId` : les espèces custom (Ukognofy + 5 fusions de base) ne sont JAMAIS dans `total`
    //   (visibleDexSpecies n'itère que SPECIES) → les exclure aussi de `caught` évite un pct > 100 % / un « 142/141 ».
    const caught = dex.caught.filter((id) => { const sp = getSpecies(id); return !!sp && !isCustomSpeciesId(id) && !isDexHidden(sp, dex.caught, isChampion, isRun2, isRun3, dexFullUnlock, dex.seen) }).length
    return { caught, total, pct: total > 0 ? Math.round((caught / total) * 100) : 0 }
}

// --- Hooks ---
export function usePokedex(): PokedexState {
    return useSyncExternalStore(subscribePokedex, getPokedex, getPokedex)
}
