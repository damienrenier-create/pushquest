"use client"

// src/app/gamebook/yellow/DailyTicketModal.tsx
//
// TICKET ROULETTE QUOTIDIEN — cinématique à la 1re connexion du jour (chapitre 2).
// Flux : 🍝 intro Dieu Spaghetti → flash "début de combat" → roulette (10 énergie offertes,
// 1 case) → résultat (🤫 1er pari gagné d'office) → 🍝 invite à l'étage du Centre.
// Indépendant du casino du labo (ne compte PAS pour Tonytony — cf. casinoTicketSpin).

import { useState, useRef, useEffect } from "react"
import { casinoTicketSpin, type CasinoTicketResult } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { CASINO_NUM_CASES } from "@/lib/gamebook/yellow/data/labDefis"
import { buildSpinDelays } from "./CasinoYellowModal"

const GOLD = "#f1c40f", INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"

type Phase = "intro" | "anim" | "play" | "spin" | "result"

export default function DailyTicketModal({ today, onClose }: { today: string; onClose: () => void }) {
    const [phase, setPhase] = useState<Phase>("intro")
    const [highlight, setHighlight] = useState(-1)
    const [flash, setFlash] = useState(false)
    const [result, setResult] = useState<CasinoTicketResult | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

    // Animation "début de combat" (~3 s) : une roue de chiffres qui tourne (rappel roulette),
    // puis un burst doré final avant l'arrivée sur la roulette.
    const startAnim = () => {
        setPhase("anim")
        timerRef.current = setTimeout(() => {
            setFlash(true) // burst final
            timerRef.current = setTimeout(() => { setFlash(false); setPhase("play") }, 380)
        }, 2620)
    }

    const pick = (betCase: number) => {
        if (phase !== "play") return
        const r = casinoTicketSpin(betCase, today) // applique (rig 1er pari / aléatoire + crédite le gain)
        persistYellowSave()
        setPhase("spin")
        const delays = buildSpinDelays(r.winningCase, CASINO_NUM_CASES)
        let k = 0
        const tick = () => {
            setHighlight(k % CASINO_NUM_CASES)
            if (k >= delays.length) { setResult(r); setPhase("result"); return }
            timerRef.current = setTimeout(tick, delays[k++])
        }
        tick()
    }

    return (
        <div style={overlay}>
            {phase === "anim" && (
                <div style={animOverlay}>
                    <style>{`
                        @keyframes tkSpin { from { transform: rotate(0deg) } to { transform: rotate(1440deg) } }
                        @keyframes tkCenter { 0%,100% { transform: scale(.9) } 50% { transform: scale(1.14) } }
                        @keyframes tkGlow { 0%,100% { box-shadow: 0 0 28px 6px rgba(241,196,15,.45) } 50% { box-shadow: 0 0 64px 20px rgba(241,196,15,.95) } }
                    `}</style>
                    <div style={{ position: "relative", width: 230, height: 230, borderRadius: "50%", border: `4px solid ${GOLD}`, animation: "tkSpin 3s cubic-bezier(.10,.70,.22,1) forwards, tkGlow 0.7s ease-in-out infinite" }}>
                        {Array.from({ length: CASINO_NUM_CASES }, (_, i) => {
                            const ang = (i / CASINO_NUM_CASES) * 2 * Math.PI - Math.PI / 2
                            const R = 96
                            return (
                                <div key={i} style={{ position: "absolute", left: 115 + R * Math.cos(ang), top: 115 + R * Math.sin(ang), transform: "translate(-50%,-50%)", color: i % 2 ? GOLD : "#fff", fontWeight: 900, fontSize: 19, textShadow: "0 1px 3px #000" }}>{i}</div>
                            )
                        })}
                    </div>
                    <div style={{ position: "absolute", fontSize: 46, animation: "tkCenter 0.5s ease-in-out infinite" }}>🎰</div>
                    {flash && <div style={{ position: "absolute", inset: 0, background: "#fff" }} />}
                </div>
            )}
            <div style={box}>
                <div style={header}>🎟️ TICKET DU JOUR <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>offert par le Dieu Spaghetti</span></div>
                <div style={{ padding: 14, overflowY: "auto", flex: 1, position: "relative", zIndex: 2 }}>

                    {phase === "intro" && (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🍝</div>
                            <p style={{ fontSize: 13, color: INK, lineHeight: 1.5, fontWeight: 600 }}>
                                « Ah, te voilà, mortel ! Pour bien démarrer ta journée, le Dieu Spaghetti t'offre <b>10 énergies</b> à jouer à la roulette. Tente ta chance… elle sourit aux audacieux ! »
                            </p>
                        </div>
                    )}

                    {(phase === "play" || phase === "spin" || phase === "result") && (
                        <>
                            <div style={{ fontSize: 12, color: INK, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
                                {phase === "play" ? "Choisis UNE case — 10 énergie offertes !" : phase === "spin" ? "La boule tourne…" : ""}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 10 }}>
                                {Array.from({ length: CASINO_NUM_CASES }, (_, i) => {
                                    const lit = (phase === "spin" && highlight === i) || (phase === "result" && result?.winningCase === i)
                                    return (
                                        <button key={i} onClick={() => pick(i)} disabled={phase !== "play"}
                                            style={{ ...caseBtn, ...(lit ? caseLit : {}), ...(phase === "play" ? {} : { cursor: "default" }) }}>{i}</button>
                                    )
                                })}
                            </div>
                            {phase === "result" && result && (
                                <div style={{ padding: 10, borderRadius: 6, background: result.won ? "#eafaef" : "#fbeaea", border: `2px solid ${result.won ? "#4cd964" : "#e74c3c"}`, textAlign: "center" }}>
                                    {result.won
                                        ? <div style={{ fontSize: 13, fontWeight: 800, color: "#1e8449" }}>✅ Case {result.winningCase} ! Tu gagnes <b>+{result.winAmount} énergie</b> !</div>
                                        : <div style={{ fontSize: 13, fontWeight: 700, color: "#c0392b" }}>Case {result.winningCase}… pas cette fois ! (mais c'était offert 😉)</div>}
                                    <p style={{ fontSize: 11, color: INK, marginTop: 8, lineHeight: 1.5 }}>
                                        🍝 « Continue de tenter ta chance à l'<b>étage du Centre Pokémon</b> — les récompenses y sont encore plus belles ! »
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
                {(phase === "intro" || phase === "play" || phase === "result") && (
                    <button onClick={phase === "intro" ? startAnim : onClose} style={phase === "intro" ? primary : closeBtn}>
                        {phase === "intro" ? "🎰 Tenter ma chance !" : phase === "play" ? "Passer (ticket perdu)" : "FERMER"}
                    </button>
                )}
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 12 }
const animOverlay: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "radial-gradient(circle, #4a3500 0%, #1a1208 65%, #000 100%)" }
const box: React.CSSProperties = { position: "relative", zIndex: 2, background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 420, maxHeight: "88%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const caseBtn: React.CSSProperties = { background: "#fff8e8", border: `1px solid ${DARK}`, color: INK, padding: "8px 4px", fontSize: 14, fontWeight: 800, cursor: "pointer", borderRadius: 3, transition: "transform 60ms, box-shadow 60ms" }
const caseLit: React.CSSProperties = { background: "#c0392b", color: "#fff", border: `2px solid ${GOLD}`, transform: "scale(1.12)", boxShadow: `0 0 10px ${GOLD}` }
const primary: React.CSSProperties = { margin: 10, marginTop: 0, padding: "10px 0", background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
