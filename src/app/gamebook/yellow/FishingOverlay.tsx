"use client"

// src/app/gamebook/yellow/FishingOverlay.tsx
//
// PÊCHE — overlay pendant une session (store.fishing != null). Un CHRONO circulaire monte ; le poisson MORD tout
// seul à `fishing.biteAt` (tôt en général, 60 s rarement). Plus l'attente est longue, plus la prise peut être
// chromatique (garantie à 60 s mais rare). Le joueur peut « Ranger » (annuler). Sprite « canne » géré par MapView.
// ⚠️ elapsed calculé depuis un timestamp (Date.now()-start) → PAS de valeur `ms` héritée entre sessions (bug figé).

import { useState, useEffect } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FISHING_MAX_WAIT_SEC } from "@/lib/gamebook/yellow/data/fishing"

const TICK_MS = 150
const R = 34, C = 2 * Math.PI * R

export default function FishingOverlay() {
    const fishing = useGameStore((s) => s.fishing)
    const hookFish = useGameStore((s) => s.hookFish)
    const cancelFishing = useGameStore((s) => s.cancelFishing)
    const [sec, setSec] = useState(0)
    const [biting, setBiting] = useState(false)
    const biteAt = fishing?.biteAt ?? 0

    // Chrono basé sur un timestamp → elapsed toujours frais (jamais hérité de la session précédente). La MORSURE se
    //   déclenche à biteAt : beat « ÇA MORD ! » (700 ms) puis hookFish() → combat. Tous les timers nettoyés au démontage.
    useEffect(() => {
        if (!fishing) { setSec(0); setBiting(false); return }
        setSec(0); setBiting(false)
        const start = Date.now()
        let hookTimer: ReturnType<typeof setTimeout> | null = null
        const id = setInterval(() => {
            const e = (Date.now() - start) / 1000
            setSec(Math.min(FISHING_MAX_WAIT_SEC, e))
            if (e >= biteAt && !hookTimer) {
                setBiting(true)
                clearInterval(id)
                hookTimer = setTimeout(() => hookFish(), 700)
            }
        }, TICK_MS)
        return () => { clearInterval(id); if (hookTimer) clearTimeout(hookTimer) }
    }, [fishing, biteAt, hookFish])

    if (!fishing) return null
    const frac = Math.min(1, sec / FISHING_MAX_WAIT_SEC)
    const hint = biting ? "❗ ÇA MORD ! Ferre-le !"
        : frac >= 0.85 ? "✨✨ Chromatique quasi garanti — tiens bon !"
        : frac >= 0.5 ? "✨ Les chances de chromatique montent…"
        : "Ta ligne frémit… patiente pour une belle prise."

    return (
        <div style={overlay}>
            <div style={{ ...box, ...(biting ? { borderColor: "#3a7bd5", boxShadow: "0 0 0 3px #3a7bd555, 0 6px 22px rgba(0,0,0,0.45)" } : {}) }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, letterSpacing: 0.5 }}>🎣 Ta ligne est à l'eau…</div>

                {/* CHRONO circulaire */}
                <div style={{ position: "relative", width: 92, height: 92, margin: "2px 0" }}>
                    <svg width="92" height="92" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r={R} fill="none" stroke="#d9c9a0" strokeWidth="7" />
                        <circle cx="40" cy="40" r={R} fill="none" stroke={frac >= 0.85 ? "#e0a017" : "#3a7bd5"} strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 40 40)"
                            style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear, stroke .3s` }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: INK, fontVariantNumeric: "tabular-nums" }}>{Math.floor(sec)}</span>
                        <span style={{ fontSize: 9, opacity: 0.6, color: INK }}>/ {FISHING_MAX_WAIT_SEC}s</span>
                    </div>
                </div>

                <div style={{ fontSize: 10.5, color: INK, opacity: 0.85, textAlign: "center", lineHeight: 1.3, minHeight: 26 }}>{hint}</div>

                {!biting && <button onClick={cancelFishing} style={cancelBtn}>Ranger la canne</button>}
            </div>
        </div>
    )
}

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"
const overlay: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", zIndex: 55, pointerEvents: "none", padding: "0 12px" }
const box: React.CSSProperties = { pointerEvents: "auto", background: CREAM, border: `3px solid ${INK}`, borderRadius: 12, padding: "10px 14px", width: "100%", maxWidth: 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: "0 6px 22px rgba(0,0,0,0.45)", fontFamily: "system-ui, sans-serif" }
const cancelBtn: React.CSSProperties = { width: "100%", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11.5, padding: "6px 0", cursor: "pointer" }
