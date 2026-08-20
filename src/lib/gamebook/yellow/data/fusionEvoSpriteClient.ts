// src/lib/gamebook/yellow/data/fusionEvoSpriteClient.ts
//
// Client (navigateur) des sprites de STADES ÉVOLUÉS de fusion. Lit le statut (GET, gratuit) et DÉCLENCHE la
// génération (POST, facturée) UNIQUEMENT pour les stades POSSÉDÉS (= engagement : le joueur les a obtenus par
// évolution). Écrit les URLs résolues dans le registre mémoire → reregisterCustomDaemons les INJECTE dans l'espèce.
//
// ⚠️ RÈGLE BUDGET : ne POSTer que pour du POSSÉDÉ. La Fusiodex (aperçu) ne fait que du GET (fetchEvoSpriteStatus).

import { rememberEvoSprite, hasEvoSpriteInMemory } from "./fusionSpriteRegistry"
import { fusionStageNeedsGenSprite } from "./fusionEvoSprites"

const BASE = "/api/gamebook/yellow/fusion-evo-sprite"

/** GET le statut d'un stade évolué ; mémorise l'URL si READY. Renvoie l'URL ou null. Aucune génération. */
export async function fetchEvoSpriteStatus(id: string): Promise<string | null> {
    if (!id) return null
    try {
        const r = await fetch(`${BASE}?id=${encodeURIComponent(id)}`)
        const j = await r.json()
        if (j?.status === "READY" && j.url) { rememberEvoSprite(id, j.url); return j.url }
    } catch { /* hors-ligne → placeholder */ }
    return null
}

/** Synchronise les sprites des stades évolués POSSÉDÉS : GET d'abord (gratuit) ; si absent → POST (génération, réservé
 *  au possédé). Ignore les stades déjà en mémoire ou pourvus d'un sprite maison. Renvoie true si au moins une URL a
 *  été nouvellement résolue (→ le caller ré-enregistre les espèces + rafraîchit l'affichage). Neutre si gén. désactivée. */
export async function syncOwnedEvoSprites(ownedIds: string[]): Promise<boolean> {
    const todo = [...new Set(ownedIds)].filter((id) => fusionStageNeedsGenSprite(id) && !hasEvoSpriteInMemory(id))
    if (!todo.length) return false
    const results = await Promise.all(todo.map(async (id) => {
        const got = await fetchEvoSpriteStatus(id) // READY déjà en cache serveur ?
        if (got) return true
        try {
            const r = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speciesId: id }) })
            const j = await r.json()
            if (j?.status === "READY" && j.url) { rememberEvoSprite(id, j.url); return true }
        } catch { /* échec silencieux → placeholder reste */ }
        return false
    }))
    return results.some(Boolean)
}
