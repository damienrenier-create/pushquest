"use client"

// Résout le sprite GÉNÉRÉ d'une fusion (cache serveur). Renvoie l'URL Blob si READY, sinon null → le composant
// affiche le placeholder Chimère. `trigger:true` (points de DÉCOUVERTE : Autel / Atelier / comparaison) lance la
// génération si absente ; sinon lecture seule. JAMAIS bloquant : GET rapide + POST en tâche de fond + polling léger.
// Les URLs résolues sont écrites dans le REGISTRE MÉMOIRE partagé (fusionSpriteRegistry) → buildFusion() les lit de
// façon SYNCHRONE pour le combat. Si désactivé/plafonné/échoué → aucun polling.

import { useEffect, useRef, useState } from "react"
import { fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"
import { getFusionSpriteFromMemory, hasFusionSpriteInMemory, rememberFusionSprite } from "@/lib/gamebook/yellow/data/fusionSpriteRegistry"

async function fetchStatus(aId: string, bId: string): Promise<string | null> {
    try {
        const r = await fetch(`/api/gamebook/yellow/fusion-sprite?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
        const j = await r.json()
        if (j?.status === "READY" && j.url) { rememberFusionSprite(aId, bId, j.url); return j.url }
    } catch { /* hors-ligne : placeholder */ }
    return null
}

/** Prefetch GET-only (aucune génération, aucun coût) : chauffe le registre mémoire pour une liste de paires —
 *  typiquement le roster de fusion du joueur, pour que le COMBAT affiche les sprites générés déjà en cache. */
export async function prefetchFusionSprites(pairs: Array<[string, string]>): Promise<void> {
    const seen = new Set<string>()
    for (const [aId, bId] of pairs) {
        if (!aId || !bId) continue
        const key = fusionPairKey(aId, bId)
        if (seen.has(key) || hasFusionSpriteInMemory(aId, bId)) continue
        seen.add(key)
        await fetchStatus(aId, bId) // séquentiel & borné : la liste est petite (roster), lecture seule
    }
}

export function useFusionSprite(aId?: string, bId?: string, opts?: { name?: string; types?: string[]; trigger?: boolean }): { url: string | null } {
    const key = aId && bId ? fusionPairKey(aId, bId) : null
    const [url, setUrl] = useState<string | null>(aId && bId ? getFusionSpriteFromMemory(aId, bId) ?? null : null)
    const triggered = useRef(false)

    useEffect(() => {
        if (!key || !aId || !bId) return
        const cached = getFusionSpriteFromMemory(aId, bId)
        if (cached) { setUrl(cached); return }
        let cancelled = false
        let timer: ReturnType<typeof setInterval> | null = null
        const settle = (u: string | null) => { if (!cancelled && u) setUrl(u) }
        ;(async () => {
            const got = await fetchStatus(aId, bId)
            if (got) { settle(got); return }
            if (!opts?.trigger || triggered.current) return
            triggered.current = true
            try {
                const r = await fetch("/api/gamebook/yellow/fusion-sprite", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aId, bId, fusionName: opts.name, types: opts.types ?? [] }),
                })
                const j = await r.json()
                if (j?.status === "READY" && j.url) { rememberFusionSprite(aId, bId, j.url); settle(j.url); return }
                if (j?.status !== "PENDING") return // disabled / capped / failed → placeholder à vie (pas de polling)
            } catch { return }
            let polls = 0
            timer = setInterval(async () => {
                polls++
                const u = await fetchStatus(aId, bId)
                if (cancelled || u || polls > 20) { if (timer) clearInterval(timer); settle(u) }
            }, 3000)
        })()
        return () => { cancelled = true; if (timer) clearInterval(timer) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return { url }
}
