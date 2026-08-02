"use client"

// LECTURE SEULE du sprite GÉNÉRÉ d'une fusion. Renvoie l'URL Blob si elle existe déjà (cache serveur / mémoire),
// sinon null → le composant affiche le placeholder Chimère. NE DÉCLENCHE PLUS la génération : celle-ci ne se fait
// qu'à l'ENGAGEMENT (entrée dans la Ligue de Fusion, cf. requestFusionSprites appelé par gameStore) — jamais à
// l'aperçu/au test, pour ne pas gaspiller le budget d'images. Un seul GET par paire (résultat mis en cache mémoire).

import { useEffect, useState } from "react"
import { fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { getFusionSpriteFromMemory } from "@/lib/gamebook/yellow/data/fusionSpriteRegistry"
import { fetchFusionStatus } from "@/lib/gamebook/yellow/data/fusionSpriteClient"

export function useFusionSprite(aId?: string, bId?: string): { url: string | null } {
    const key = aId && bId ? fusionPairKey(aId, bId) : null
    const [url, setUrl] = useState<string | null>(aId && bId ? getFusionSpriteFromMemory(aId, bId) ?? null : null)

    useEffect(() => {
        if (!key || !aId || !bId) return
        const cached = getFusionSpriteFromMemory(aId, bId)
        if (cached) { setUrl(cached); return }
        let cancelled = false
        fetchFusionStatus(aId, bId).then((u) => { if (u && !cancelled) setUrl(u) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return { url }
}
