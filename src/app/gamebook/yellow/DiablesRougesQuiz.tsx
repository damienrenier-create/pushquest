"use client"

// src/app/gamebook/yellow/DiablesRougesQuiz.tsx
//
// ÉVÉNEMENT « Dieu des Nouilles » (02/07 uniquement) : les Diables Rouges ont battu le Sénégal !
// Le joueur devine le SCORE EXACT ; s'il trouve (3-2), le dieu offre 100 d'énergie casino (roulette OU
// blackjack — même monnaie, divisible). Un seul cadeau par joueur (flag localStorage). Le déclenchement
// (date + flag) est géré par YellowDevClient ; ici on gère le quiz + le don.

import { useState } from "react"
import { grantReps } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"

const GOLD = "#f1c40f", INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"
const REWARD = 100
const CLAIM_KEY = "pq_diables_rouges_2_7" // 1 cadeau / appareil (événement d'un jour)
const SCORES = ["0 - 0", "0 - 2", "3 - 2"] as const
const GOOD = "3 - 2"

export default function DiablesRougesQuiz({ onClose }: { onClose: () => void }) {
    const [picked, setPicked] = useState<string | null>(null)
    const won = picked === GOOD

    const pick = (s: string) => {
        if (picked === GOOD) return          // déjà gagné → figé
        setPicked(s)
        if (s === GOOD) {
            try { window.localStorage.setItem(CLAIM_KEY, "1") } catch { /* quota */ }
            grantReps(REWARD)
            persistYellowSave()
        }
    }

    return (
        <div style={overlay} onClick={(e) => e.stopPropagation()}>
            <div style={box}>
                <div style={header}>🇧🇪 EXPLOIT DES DIABLES ROUGES <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>fête du Dieu des Nouilles</span></div>
                <div style={{ padding: 16, overflowY: "auto", flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 6 }}>🍝🎉</div>
                    <p style={{ fontSize: 13, color: INK, lineHeight: 1.5, fontWeight: 600 }}>
                        « Mortel ! La Belgique vient de terrasser le Sénégal — un EXPLOIT ! Pour fêter ça, réponds à ma
                        question et je t&apos;offrirai de quoi jouer au casino. »
                    </p>
                    <p style={{ fontSize: 13, color: INK, fontWeight: 800, margin: "12px 0 8px" }}>Quel était le SCORE EXACT ?</p>

                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {SCORES.map((s) => {
                            const isPick = picked === s
                            const state = !picked ? "idle" : s === GOOD ? "good" : isPick ? "bad" : "dim"
                            return (
                                <button key={s} onClick={() => pick(s)} disabled={won}
                                    style={{ ...scoreBtn, ...(state === "good" ? scoreGood : state === "bad" ? scoreBad : state === "dim" ? scoreDim : {}) }}>
                                    {s}
                                </button>
                            )
                        })}
                    </div>

                    {picked && (
                        <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: won ? "#eafaef" : "#fbeaea", border: `2px solid ${won ? "#4cd964" : "#e74c3c"}` }}>
                            {won
                                ? <>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: "#1e8449" }}>✅ 3-2, exact ! Quel exploit !</div>
                                    <p style={{ fontSize: 12, color: INK, marginTop: 8, lineHeight: 1.5 }}>
                                        🍝 Le Dieu des Nouilles t&apos;offre <b>{REWARD} d&apos;énergie casino</b> — mise-la à la <b>roulette</b> ou au <b>blackjack</b> (divisible) !
                                    </p>
                                </>
                                : <div style={{ fontSize: 13, fontWeight: 700, color: "#c0392b" }}>Raté… le Dieu des Nouilles n&apos;est pas dupe. Réessaie ! 🍝</div>}
                        </div>
                    )}
                </div>
                <button onClick={onClose} style={won ? primary : closeBtn}>{won ? "🎰 Encaisser & filer au casino !" : "Plus tard"}</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 85, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 400, maxHeight: "90%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 13 }
const scoreBtn: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, color: INK, padding: "12px 18px", fontSize: 18, fontWeight: 900, cursor: "pointer", borderRadius: 8, minWidth: 78 }
const scoreGood: React.CSSProperties = { background: "#c0392b", color: "#fff", border: `2px solid ${GOLD}`, boxShadow: `0 0 12px ${GOLD}` }
const scoreBad: React.CSSProperties = { background: "#f0d0d0", border: "2px solid #e74c3c", color: "#8a2418" }
const scoreDim: React.CSSProperties = { opacity: 0.45 }
const primary: React.CSSProperties = { margin: 10, marginTop: 0, padding: "11px 0", background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "9px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }

/** L'événement est-il jouable AUJOURD'HUI (02-07) et pas encore gagné ? `today` = date « YYYY-MM-DD ». */
export function diablesRougesAvailable(today: string | undefined): boolean {
    if (!today || today.slice(5, 10) !== "07-02") return false
    try { return window.localStorage.getItem(CLAIM_KEY) !== "1" } catch { return true }
}
