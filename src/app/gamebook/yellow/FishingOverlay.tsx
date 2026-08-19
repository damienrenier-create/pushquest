"use client"

// src/app/gamebook/yellow/FishingOverlay.tsx
//
// PÊCHE — overlay pendant une session (store.fishing != null). Deux phases :
//  1) ATTENTE : un chrono circulaire monte jusqu'à `fishing.biteAt`. Plus l'attente est longue, plus la prise peut être
//     chromatique (et meilleurs IV « prévus »). Le joueur peut « Ranger » (annuler).
//  2) FERRAGE (seulement si ça MORD vraiment) : le chrono devient un BOUTON à MARTELER pendant 10 s. Plus on presse,
//     plus le cercle s'emballe et plus les IV montent (+1 par tranche de 10 taps, cap 15 ; shiny = parfait). 0 appui →
//     la prise s'échappe. Si RIEN ne mord (catch null) : pas de fausse alerte « ça mord », juste « ligne vide ».
// ⚠️ elapsed calculé depuis un timestamp (Date.now()-start) → PAS de valeur héritée entre sessions. tapsRef → pas de
//    fermeture périmée pour le compte à rebours du ferrage.

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { FISHING_MAX_WAIT_SEC, FISHING_REEL_SEC } from "@/lib/gamebook/yellow/data/fishing"

const TICK_MS = 150
const REEL_SEC = FISHING_REEL_SEC // durée du mini-jeu de ferrage
const R = 34, C = 2 * Math.PI * R

export default function FishingOverlay() {
    const fishing = useGameStore((s) => s.fishing)
    const hookFish = useGameStore((s) => s.hookFish)
    const reelFish = useGameStore((s) => s.reelFish)
    const cancelFishing = useGameStore((s) => s.cancelFishing)

    const [sec, setSec] = useState(0)
    const [phase, setPhase] = useState<"wait" | "reel">("wait")
    const [taps, setTaps] = useState(0)
    const [reelLeft, setReelLeft] = useState(REEL_SEC)
    const tapsRef = useRef(0)
    const biteAt = fishing?.biteAt ?? 0

    // PHASE ATTENTE : chrono depuis le lancer. À biteAt → soit FERRAGE (ça mord), soit « rien » (SANS fausse alerte).
    useEffect(() => {
        if (!fishing) { setSec(0); setPhase("wait"); setTaps(0); tapsRef.current = 0; setReelLeft(REEL_SEC); return }
        setSec(0); setPhase("wait"); setTaps(0); tapsRef.current = 0; setReelLeft(REEL_SEC)
        const start = Date.now()
        let done = false
        let missTimer: ReturnType<typeof setTimeout> | null = null
        const id = setInterval(() => {
            const e = (Date.now() - start) / 1000
            setSec(Math.min(FISHING_MAX_WAIT_SEC, e))
            if (e >= biteAt && !done) {
                done = true
                clearInterval(id)
                if (fishing.catch) setPhase("reel")                    // ça mord → mini-jeu de ferrage
                else missTimer = setTimeout(() => hookFish(), 600)     // RIEN → dialogue « ligne vide » (pas de « ça mord »)
            }
        }, TICK_MS)
        return () => { clearInterval(id); if (missTimer) clearTimeout(missTimer) }
    }, [fishing, biteAt, hookFish])

    // PHASE FERRAGE : compte à rebours de 10 s → reelFish(taps). tapsRef évite la fermeture périmée.
    useEffect(() => {
        if (phase !== "reel") return
        const start = Date.now()
        const id = setInterval(() => {
            const left = REEL_SEC - (Date.now() - start) / 1000
            setReelLeft(Math.max(0, left))
            if (left <= 0) { clearInterval(id); reelFish(tapsRef.current) }
        }, 100)
        return () => clearInterval(id)
    }, [phase, reelFish])

    if (!fishing) return null

    // ===== PHASE FERRAGE (mini-jeu de mashing) =====
    if (phase === "reel") {
        const tap = () => { tapsRef.current += 1; setTaps(tapsRef.current) }
        const power = Math.min(1, taps / 50) // intensité visuelle 0..1
        const ivBonus = Math.floor(taps / 10)
        const ring = power >= 0.7 ? "#e0a017" : power >= 0.35 ? "#e0559f" : "#3a7bd5"
        const scale = 1 + power * 0.35
        return (
            <div style={overlay}>
                <div style={{ ...box, maxWidth: 250, borderColor: ring, boxShadow: `0 0 0 ${2 + power * 6}px ${ring}44, 0 6px 22px rgba(0,0,0,0.5)` }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#b02a2a", letterSpacing: 0.5 }}>❗ ÇA MORD ! MARTÈLE !</div>
                    <button onClick={tap} aria-label="Ferrer" style={{
                        position: "relative", width: 108, height: 108, borderRadius: "50%", cursor: "pointer",
                        border: `4px solid ${ring}`, background: `radial-gradient(circle at 50% 38%, ${ring}33, #fff8e8)`,
                        transform: `scale(${scale})`, transition: "transform 60ms ease-out, border-color .2s, box-shadow .2s",
                        boxShadow: `0 0 ${8 + power * 26}px ${ring}, inset 0 0 12px ${ring}55`,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", userSelect: "none",
                    }}>
                        <span style={{ fontSize: 30, lineHeight: 1 }}>🎣</span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: INK, fontVariantNumeric: "tabular-nums" }}>{taps}</span>
                    </button>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: ivBonus > 0 ? "#1a7a3a" : INK, minHeight: 16 }}>
                        {ivBonus > 0 ? `IV +${ivBonus} 💪` : "Presse pour remonter la ligne !"}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7, color: INK, fontVariantNumeric: "tabular-nums" }}>⏱ {reelLeft.toFixed(1)}s</div>
                    <button onClick={() => reelFish(tapsRef.current)} style={cancelBtn}>Remonter maintenant</button>
                </div>
            </div>
        )
    }

    // ===== PHASE ATTENTE (chrono) =====
    const frac = Math.min(1, sec / FISHING_MAX_WAIT_SEC)
    const hint = frac >= 0.85 ? "✨✨ Chromatique quasi garanti — tiens bon !"
        : frac >= 0.5 ? "✨ Les chances de chromatique montent…"
        : "Ta ligne frémit… patiente pour une belle prise."
    return (
        <div style={overlay}>
            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, letterSpacing: 0.5 }}>🎣 Ta ligne est à l'eau…</div>
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
                <button onClick={cancelFishing} style={cancelBtn}>Ranger la canne</button>
            </div>
        </div>
    )
}

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"
const overlay: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", zIndex: 55, pointerEvents: "none", padding: "0 12px" }
const box: React.CSSProperties = { pointerEvents: "auto", background: CREAM, border: `3px solid ${INK}`, borderRadius: 12, padding: "10px 14px", width: "100%", maxWidth: 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: "0 6px 22px rgba(0,0,0,0.45)", fontFamily: "system-ui, sans-serif" }
const cancelBtn: React.CSSProperties = { width: "100%", background: "#fff8e8", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, fontWeight: 700, fontSize: 11.5, padding: "6px 0", cursor: "pointer" }
