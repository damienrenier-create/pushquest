"use client"

// LES MAÎTRES DU DÔME — consultation des équipes CHAMPIONNES des autres joueurs (Panthéon du Dôme). Affiché DANS le
// panneau « LE MAÎTRE DU DÔME » (onglet Stats), pas dans le Hall of Fame des Ligues. Données serveur (dome-hall-of-fame).

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { DOME_TITLES } from "@/lib/gamebook/yellow/frontier/domeBudgets"
import { tierRank, type DomeTier } from "@/lib/gamebook/yellow/frontier/domeTypes"
import type { ChampionMon } from "@/lib/gamebook/yellow/storage/save"

interface DomeChamp { userId?: string; nickname: string; wonAt: string; team: ChampionMon[]; tier: string }

export default function DomeMasters() {
    const [champs, setChamps] = useState<DomeChamp[] | null>(null)
    useEffect(() => {
        let cancelled = false
        fetch("/api/gamebook/yellow/dome-hall-of-fame")
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (!cancelled) setChamps((j?.champions ?? []) as DomeChamp[]) })
            .catch(() => { if (!cancelled) setChamps([]) })
        return () => { cancelled = true }
    }, [])

    // Un seul sacre par joueur (son palier le PLUS HAUT), du plus prestigieux au plus modeste.
    const shown = (() => {
        if (!champs) return null
        const best = new Map<string, DomeChamp>()
        for (const c of champs) {
            const key = c.userId ?? c.nickname
            const prev = best.get(key)
            if (!prev || tierRank(c.tier as DomeTier) > tierRank(prev.tier as DomeTier)) best.set(key, c)
        }
        return [...best.values()].sort((a, b) => tierRank(b.tier as DomeTier) - tierRank(a.tier as DomeTier))
    })()

    if (shown === null) return <div style={{ fontSize: 10, opacity: 0.6 }}>Chargement des maîtres du Dôme…</div>
    if (shown.length === 0) return <div style={{ fontSize: 10, opacity: 0.6 }}>Aucun autre maître du Dôme pour l&apos;instant — sois le premier à graver ton équipe !</div>

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {shown.map((c, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: "#7ee0ff", fontSize: 12 }}>🏯 {c.nickname}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: "#11121a", background: "#7ee0ff", borderRadius: 999, padding: "1px 7px" }}>{DOME_TITLES[c.tier as DomeTier] ?? c.tier}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.team.map((m, mi) => {
                            const sp = getSpecies(m.speciesId)
                            return sp?.sprite
                                ? <img key={mi} src={sp.sprite} alt={sp.name} title={`${sp.name} · N.${m.level}`} style={{ width: 30, height: 30, objectFit: "contain", imageRendering: "pixelated" }} />
                                : <span key={mi} style={{ fontSize: 18 }} title={m.speciesId}>❓</span>
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
