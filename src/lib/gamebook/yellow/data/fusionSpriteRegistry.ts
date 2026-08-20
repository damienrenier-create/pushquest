// src/lib/gamebook/yellow/data/fusionSpriteRegistry.ts
//
// Registre MÉMOIRE (session) des URLs de sprites de fusion GÉNÉRÉS. Sert de pont SYNCHRONE entre :
//   • le hook client useFusionSprite (qui résout l'URL via l'API et l'ENREGISTRE ici),
//   • buildFusion() (fusionMon.ts) qui est SYNCHRONE et ne peut pas attendre le réseau : il LIT ce registre
//     comme repli avant MissingNo → le fusionné de COMBAT affiche le sprite généré dès que le registre est chaud.
//
// 100% pur & universel (aucun fetch, aucun window) : importable côté serveur comme client. Sur le serveur la Map
// reste simplement vide → repli MissingNo, sans effet de bord. Clé CANONIQUE (fusionPairKey trié) → A+B == B+A.

import { fusionPairKey } from "./fusionSpriteCache"

const registry = new Map<string, string>() // pairKey → blobUrl
const evoRegistry = new Map<string, string>() // speciesId (stade évolué) → blobUrl

/** Mémorise l'URL générée d'une paire (ordre indifférent). Ignore les valeurs vides. */
export function rememberFusionSprite(aId: string, bId: string, url: string | null | undefined): void {
    if (!aId || !bId || !url) return
    registry.set(fusionPairKey(aId, bId), url)
}

/** Mémorise l'URL générée d'un STADE ÉVOLUÉ de fusion (clé = speciesId). Pont synchrone lu par reregisterCustomDaemons
 *  (playerStore) pour INJECTER le sprite dans l'espèce → getSpecies().sprite le renvoie partout (combat/équipe/fiche). */
export function rememberEvoSprite(id: string, url: string | null | undefined): void {
    if (!id || !url) return
    evoRegistry.set(id, url)
}
/** URL générée en mémoire pour un stade évolué, ou undefined. Lecture SYNCHRONE (serveur = Map vide → undefined). */
export function getEvoSpriteFromMemory(id: string): string | undefined { return id ? evoRegistry.get(id) : undefined }
/** Ce stade évolué a-t-il déjà une URL en mémoire ? (évite un GET/POST redondant côté client.) */
export function hasEvoSpriteInMemory(id: string): boolean { return !!id && evoRegistry.has(id) }

/** URL générée en mémoire pour une paire, ou undefined (ordre indifférent). Lecture SYNCHRONE, sans réseau. */
export function getFusionSpriteFromMemory(aId: string, bId: string): string | undefined {
    if (!aId || !bId) return undefined
    return registry.get(fusionPairKey(aId, bId))
}

/** La paire a-t-elle déjà une URL en mémoire ? (évite un fetch redondant côté hook.) */
export function hasFusionSpriteInMemory(aId: string, bId: string): boolean {
    if (!aId || !bId) return false
    return registry.has(fusionPairKey(aId, bId))
}

/** Test-only : vide les registres. */
export function _clearFusionSpriteRegistry(): void {
    registry.clear()
    evoRegistry.clear()
}
