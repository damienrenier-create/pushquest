"use client"

// src/app/gamebook/yellow/FishingOverlay.tsx
//
// PÊCHE — overlay affiché pendant une session de pêche (store.fishing != null). Un CHRONO circulaire monte jusqu'à
// 60 s ; plus le joueur attend, plus la jauge SHINY grimpe. Le joueur REMONTE sa ligne quand il veut (moulinet) —
// selon l'attente, ça mord (combat) ou pas. Moulinet AUTOMATIQUE à 60 s. Le sprite « canne » est géré par MapView.

import { useState, useEffect } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FISHING_MAX_WAIT_SEC, fishingShinyChance } from "@/lib/gamebook/yellow/data/fishing"

const TICK_MS = 200
const R = 34, C = 2 * Math.PI * R

export default function FishingOverlay() {
    const fishing = useGameStore((s) => s.fishing)
    const reelIn = useGameStore((s) => s.reelIn)
    const cancelFishing = useGameStore((s) => s.cancelFishing)
    const [ms, setMs] = useState(0)

    // Chrono : accumule le temps par petits pas (fluide), remis à zéro à chaque nouvelle session.
    useEffect(() => {
        if (!fishing) return
        setMs(0)
        const id = setInterval(() => setMs((m) => m + TICK_MS), TICK_MS)
        return () => clearInterval(id)
    }, [fishing])

    // Moulinet AUTOMATIQUE à 60 s.
    useEffect(() => {
        if (fishing && ms >= FISHING_MAX_WAIT_SEC * 1000) reelIn(FISHING_MAX_WAIT_SEC)
    }, [fishing, ms, reelIn])

    if (!fishing) return null
    const sec = Math.min(FISHING_MAX_WAIT_SEC, ms / 1000)
    const frac = sec / FISHING_MAX_WAIT_SEC
    const shinyPct = Math.round(fishingShinyChance(sec) * 100)

    return (
        <div style={overlay}>
            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, letterSpacing: 0.5 }}>🎣 Ta ligne est à l'eau…</div>

                {/* CHRONO circulaire animé */}
                <div style={{ position: "relative", width: 92, height: 92, margin: "4px 0" }}>
                    <svg width="92" height="92" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r={R} fill="none" stroke="#d9c9a0" strokeWidth="7" />
                        <circle cx="40" cy="40" r={R} fill="none" stroke="#3a7bd5" strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 40 40)"
                            style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: INK, fontVariantNumeric: "tabular-nums" }}>{Math.floor(sec)}</span>
                        <span style={{ fontSize: 9, opacity: 0.6, color: INK }}>/ {FISHING_MAX_WAIT_SEC}s</span>
                    </div>
                </div>

                {/* Jauge SHINY croissante */}
                <div style={{ width: "100%" }}>
                    <div style={{ fontSize: 10, color: INK, opacity: 0.8, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span>✨ Chance de chromatique</span><b style={{ color: shinyPct >= 25 ? "#c79400" : INK }}>{shinyPct}%</b>
                    </div>
                    <div style={{ height: 8, background: "#e7dcc0", borderRadius: 5, overflow: "hidden", border: `1px solid ${DARK}` }}>
                        <div style={{ height: "100%", width: `${Math.round(frac * 100)}%`, background: "linear-gradient(90deg,#f5d24a,#e0a017)", borderRadius: 5, transition: `width ${TICK_MS}ms linear` }} />
                    </div>
                    <div style={{ fontSize: 9.5, opacity: 0.62, color: INK, marginTop: 3, lineHeight: 1.3 }}>Plus tu patientes, plus le Daemon a de chances d'être <b>shiny</b> !</div>
                </div>

                <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 2 }}>
                    <button onClick={() => reelIn(sec)} style={reelBtn}>🎣 Remonter</button>
                    <button onClick={cancelFishing} style={cancelBtn}>Ranger</button>
                </div>
            </div>
        </div>
    )
}

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"
const overlay: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", zIndex: 55, pointerEvents: "none", padding: "0 12px" }
const box: React.CSSProperties = { pointerEvents: "auto", background: CREAM, border: `3px solid ${INK}`, borderRadius: 12, padding: "10px 14px", width: "100%", maxWidth: 240, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 6px 22px rgba(0,0,0,0.45)", fontFamily: "system-ui, sans-serif" }
const reelBtn: React.CSSProperties = { flex: 1, background: "#3a7bd5", color: "#fff", border: `2px solid ${INK}`, borderRadius: 8, fontWeight: 800, fontSize: 12.5, padding: "7px 0", cursor: "pointer" }
const cancelBtn: React.CSSProperties = { background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11.5, padding: "7px 12px", cursor: "pointer" }
