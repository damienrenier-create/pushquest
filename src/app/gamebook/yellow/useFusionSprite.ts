"use client"

// Résout le sprite GÉNÉRÉ d'une fusion (cache serveur). Renvoie l'URL Blob si READY, sinon null → le composant
// affiche le placeholder Chimère. `trigger:true` (points de DÉCOUVERTE : Autel / Atelier / comparaison) lance la
// génération si absente ; sinon lecture seule. JAMAIS bloquant : GET rapide + POST en tâche de fond + polling léger.
// Cache mémoire de session (pairKey→url) pour ne pas re-fetch. Si désactivé/plafonné/échoué → aucun polling.

import { useEffect, useRef, useState } from "react"
import { fusionPairKey } from "@/lib/gamebook/yellow/data/fusionSpriteCache"

const mem = new Map<string, string>() // pairKey → url (session)

export function useFusionSprite(aId?: string, bId?: string, opts?: { name?: string; types?: string[]; trigger?: boolean }): { url: string | null } {
    const key = aId && bId ? fusionPairKey(aId, bId) : null
    const [url, setUrl] = useState<string | null>(key ? mem.get(key) ?? null : null)
    const triggered = useRef(false)

    useEffect(() => {
        if (!key || !aId || !bId) return
        if (mem.has(key)) { setUrl(mem.get(key)!); return }
        let cancelled = false
        let timer: ReturnType<typeof setInterval> | null = null
        const done = (u: string) => { if (!cancelled) { mem.set(key, u); setUrl(u) } }
        const check = async (): Promise<boolean> => {
            try {
                const r = await fetch(`/api/gamebook/yellow/fusion-sprite?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
                const j = await r.json()
                if (j?.status === "READY" && j.url) { done(j.url); return true }
            } catch { /* hors-ligne : placeholder */ }
            return false
        }
        ;(async () => {
            if (await check()) return
            if (!opts?.trigger || triggered.current) return
            triggered.current = true
            try {
                const r = await fetch("/api/gamebook/yellow/fusion-sprite", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aId, bId, fusionName: opts.name, types: opts.types ?? [] }),
                })
                const j = await r.json()
                if (j?.status === "READY" && j.url) { done(j.url); return }
                if (j?.status !== "PENDING") return // disabled / capped / failed → placeholder à vie (pas de polling)
            } catch { return }
            let polls = 0
            timer = setInterval(async () => { polls++; if (cancelled || polls > 20 || await check()) { if (timer) clearInterval(timer) } }, 3000)
        })()
        return () => { cancelled = true; if (timer) clearInterval(timer) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return { url }
}
