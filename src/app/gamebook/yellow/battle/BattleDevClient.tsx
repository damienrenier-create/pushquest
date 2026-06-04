"use client"

// Nexus Jaune Éclair — harnais de DEV pour tester le loop complet :
// équipe PERSISTANTE (save DB) → combat sauvage → XP/level-up → capture →
// Pokédex → évolution post-combat → sauvegarde. Soin auto avant chaque combat.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useBattle, startWildBattle, endBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { usePlayer, getPlayer, setTeam } from "@/lib/gamebook/yellow/store/playerStore"
import { loadYellowSave, initAutosave } from "@/lib/gamebook/yellow/store/saveManager"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"
import BattleScreen from "./BattleScreen"

const WILD_POOL = ["plumiot", "cailloutchi", "couperin", "faukon", "rongeur"]

export default function BattleDevClient() {
    const battle = useBattle()
    const player = usePlayer()
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        ; (async () => {
            await loadYellowSave()
            if (!cancelled && getPlayer().team.length === 0) {
                // Équipe de test : les 3 starters du roster pour voir leurs sprites.
                setTeam([
                    createMonInstance("feuillichot", 8, { owned: true }),
                    createMonInstance("gouttiny", 8, { owned: true }),
                    createMonInstance("braisille", 8, { owned: true }),
                ])
            }
            initAutosave()
            if (!cancelled) setReady(true)
        })()
        return () => { cancelled = true }
    }, [])

    if (!ready) {
        return <div style={S.page}><span style={{ color: "#888", fontFamily: "monospace" }}>Chargement de la sauvegarde…</span></div>
    }

    const launch = () => {
        // Soin complet avant le combat (simule le Centre).
        const healed = getPlayer().team.map((m): MonInstance => ({
            ...m, currentHp: maxHpOf(m), status: "NONE", statusCounter: 0,
            moves: m.moves.map((mv) => ({ ...mv, pp: mv.ppMax })),
        }))
        setTeam(healed)
        const wildId = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)]
        const wildLevel = 3 + Math.floor(Math.random() * 6)
        const wild = [createMonInstance(wildId, wildLevel)]
        const seed = (Math.floor(Math.random() * 1e9)) >>> 0
        startWildBattle(getPlayer().team, wild, seed)
    }

    return (
        <div style={S.page}>
            {battle ? (
                <>
                    <BattleScreen />
                    <button onClick={() => endBattle()} style={S.quit}>abandonner (dev)</button>
                </>
            ) : (
                <div style={{ textAlign: "center", color: "#f8f8e8", fontFamily: "'Courier New', monospace", maxWidth: 460 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, marginBottom: 10 }}>⚡ NEXUS — COMBAT</h1>
                    <div style={S.team}>
                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>TON ÉQUIPE (sauvegardée)</div>
                        {player.team.map((m) => (
                            <div key={m.uid} style={S.teamRow}>
                                <span>{displayName(m)}</span>
                                <span style={{ opacity: 0.7 }}>N.{m.level}</span>
                            </div>
                        ))}
                        {player.pc.length > 0 && <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>+ {player.pc.length} au PC</div>}
                    </div>
                    <button onClick={launch} style={S.cta}>RENCONTRE SAUVAGE →</button>
                    <div style={{ marginTop: 14 }}>
                        <Link href="/gamebook/yellow/pokedex" style={S.link}>📷 Voir le Pokédex</Link>
                    </div>
                </div>
            )}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100dvh", background: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 16 },
    team: { background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 8, padding: "10px 14px", marginBottom: 18, textAlign: "left" },
    teamRow: { display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13, fontWeight: 700, padding: "2px 0" },
    cta: { background: "#f5d020", border: "3px solid #f8f8e8", borderRadius: 8, padding: "14px 26px", fontFamily: "inherit", fontSize: 15, fontWeight: 900, letterSpacing: 1, cursor: "pointer", color: "#1c1408" },
    link: { color: "#9bd0ff", fontSize: 12, textDecoration: "underline" },
    quit: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "6px 14px", color: "#888", fontFamily: "'Courier New', monospace", fontSize: 11, cursor: "pointer" },
}
