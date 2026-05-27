"use client"

// src/app/gamebook/PastagoneTourModal.tsx
//
// v4.0 Phase 6 — Tour de Garde Pastagone : rotation 25 PNJ + combats infinis.
//
// 1. À l'ouverture : GET via POST /tour-rotate pour récupérer le PNJ courant.
// 2. Bouton "COMBATTRE" → POST /tour-battle (idempotent + cooldown 30s côté serveur).
// 3. Si combat lancé, la modal se ferme et le BattleModal prend le relais.

import { useEffect, useState } from "react"
import type { BattleState } from "@/lib/gamebook/battleState"

interface TourNpcView {
    id: string
    name: string
    grade: string
    emoji: string
    combatLevel: number
    type: string
    introLine: string
}

interface Props {
    onClose: () => void
    onBattleStarted: (state: BattleState) => void
}

const GRADE_LABEL: Record<string, string> = {
    saintbernard: "🛡️ Saint-Bernard (DÉF)",
    pitbull: "💪 Pitbull (ATK)",
    mastiff: "🐂 Mastiff (END)",
    chihuahua: "🐀 Chihuahua (faiblard)",
    doberman_light: "💀 Doberman-light (mini-boss)",
}

export default function PastagoneTourModal({ onClose, onBattleStarted }: Props) {
    const [npc, setNpc] = useState<TourNpcView | null>(null)
    const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    const rotate = async (force = false) => {
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/tour-rotate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force }),
            })
            const j = await r.json()
            if (j.ok && j.npc) {
                setNpc(j.npc)
                setCooldownUntil(j.cooldownUntil ?? null)
            } else {
                setMessage(j.reason ?? "Rotation impossible.")
            }
        } catch {
            setMessage("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    useEffect(() => { rotate(false) }, [])

    const cooldownLeftMs = cooldownUntil ? new Date(cooldownUntil).getTime() - now : 0
    const cooldownActive = cooldownLeftMs > 0

    const startBattle = async () => {
        if (busy || cooldownActive) return
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/tour-battle", { method: "POST" })
            const j = await r.json()
            if (j.ok && j.state) {
                onBattleStarted(j.state as BattleState)
            } else {
                setMessage(j.reason ?? "Combat refusé.")
            }
        } catch {
            setMessage("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9100, padding: 16, fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #c84848", borderRadius: 6,
                    padding: 16, maxWidth: 420, width: "100%",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    🎯 TOUR DE GARDE
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 12, textAlign: "center" }}>
                    Un seul chien-flic à la fois. Bats-en assez et le boss te défiera.
                </div>

                {npc && (
                    <div style={{
                        background: "#2a1a1a", border: "1px solid #c84848",
                        padding: 12, marginBottom: 10,
                    }}>
                        <div style={{ fontSize: 14, fontWeight: "bold" }}>
                            {npc.emoji} {npc.name}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                            {GRADE_LABEL[npc.grade] ?? npc.grade} · Lv {npc.combatLevel} · [{npc.type}]
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>
                            {npc.introLine}
                        </div>
                    </div>
                )}

                <button
                    onClick={startBattle}
                    disabled={busy || !npc || cooldownActive}
                    style={{
                        width: "100%",
                        background: busy || cooldownActive ? "#444" : "#c84848",
                        color: "#fff", border: "1px solid #fff",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 1, fontFamily: "monospace",
                        cursor: busy || cooldownActive ? "not-allowed" : "pointer",
                    }}
                >
                    {cooldownActive
                        ? `⏳ Repos ${Math.ceil(cooldownLeftMs / 1000)}s`
                        : busy
                            ? "..."
                            : "⚔️ COMBATTRE"}
                </button>

                <button
                    onClick={() => rotate(true)}
                    disabled={busy}
                    style={{
                        marginTop: 8, width: "100%",
                        background: "transparent", color: "#80a0d0",
                        border: "1px solid #80a0d0",
                        padding: 8, fontSize: 11, fontFamily: "monospace",
                        cursor: busy ? "wait" : "pointer",
                    }}
                >
                    🔁 CHANGER DE PNJ
                </button>

                {message && (
                    <div style={{ marginTop: 10, padding: 8, background: "#222", border: "1px solid #555", fontSize: 10 }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 10, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    FERMER
                </button>
            </div>
        </div>
    )
}
