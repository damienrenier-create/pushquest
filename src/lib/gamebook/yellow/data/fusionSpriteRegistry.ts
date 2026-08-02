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

/** Mémorise l'URL générée d'une paire (ordre indifférent). Ignore les valeurs vides. */
export function rememberFusionSprite(aId: string, bId: string, url: string | null | undefined): void {
    if (!aId || !bId || !url) return
    registry.set(fusionPairKey(aId, bId), url)
}

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

/** Test-only : vide le registre. */
export function _clearFusionSpriteRegistry(): void {
    registry.clear()
}
