// src/lib/gamebook/yellow/data/fusionSpriteClient.ts
//
// Client (navigateur) des sprites de fusion générés : lit le statut, PRÉ-CHARGE (GET, gratuit) ou DÉCLENCHE la
// génération (POST). Écrit les URLs résolues dans le registre mémoire (buildFusion les lit en repli SYNCHRONE).
//
// ⚠️ RÈGLE BUDGET : requestFusionSprites() (POST = génération facturée) ne doit être appelé qu'au MOMENT
//    D'ENGAGEMENT — quand le joueur valide son équipe et ENTRE dans la Ligue de Fusion. JAMAIS à l'aperçu,
//    au test de stats ou dans la Fusiodex (ceux-ci font seulement de la LECTURE via fetchFusionStatus).

import { fusionPairKey } from "./fusionSpriteCache"
import { hasFusionSpriteInMemory, rememberFusionSprite } from "./fusionSpriteRegistry"

const BASE = "/api/gamebook/yellow/fusion-sprite"

/** GET le statut d'une paire ; mémorise l'URL si READY. Renvoie l'URL ou null. Aucune génération. */
export async function fetchFusionStatus(aId: string, bId: string): Promise<string | null> {
    try {
        const r = await fetch(`${BASE}?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
        const j = await r.json()
        if (j?.status === "READY" && j.url) { rememberFusionSprite(aId, bId, j.url); return j.url }
    } catch { /* hors-ligne : placeholder */ }
    return null
}

/** GET-only : chauffe le registre pour une liste de paires (aucune génération, aucun coût). */
export async function prefetchFusionSprites(pairs: Array<[string, string]>): Promise<void> {
    const seen = new Set<string>()
    for (const [a, b] of pairs) {
        if (!a || !b) continue
        const k = fusionPairKey(a, b)
        if (seen.has(k) || hasFusionSpriteInMemory(a, b)) continue
        seen.add(k)
        await fetchFusionStatus(a, b)
    }
}

/** POST : DÉCLENCHE la génération (engagement = entrée Ligue de Fusion). Ignore les paires déjà connues/en mémoire.
 *  Fire-and-forget, en parallèle : ne bloque pas l'UI ; les sprites apparaissent dès qu'ils sont prêts (cache).
 *  Neutre si la génération est désactivée côté serveur (la route répond "disabled", coût 0). */
export async function requestFusionSprites(items: Array<{ aId: string; bId: string; name?: string; types?: string[] }>): Promise<void> {
    const seen = new Set<string>()
    const uniq = items.filter((it) => {
        if (!it?.aId || !it?.bId) return false
        const k = fusionPairKey(it.aId, it.bId)
        if (seen.has(k) || hasFusionSpriteInMemory(it.aId, it.bId)) return false
        seen.add(k); return true
    })
    await Promise.all(uniq.map(async (it) => {
        try {
            const r = await fetch(BASE, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aId: it.aId, bId: it.bId, fusionName: it.name, types: it.types ?? [] }),
            })
            const j = await r.json()
            if (j?.status === "READY" && j.url) rememberFusionSprite(it.aId, it.bId, j.url)
        } catch { /* échec silencieux → placeholder */ }
    }))
}
