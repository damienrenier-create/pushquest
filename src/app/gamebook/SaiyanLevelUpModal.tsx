"use client"

// src/app/gamebook/SaiyanLevelUpModal.tsx
//
// v4.0 Phase 3 — Modal "level up Saiyan".
//
// S'ouvre automatiquement quand un Daemon a `pendingStatPoints > 0`.
// Le joueur répartit ces points entre F/V/D/I/E (chacun entre 0 et le
// total, sum ≤ pending, plafond par stat = DAEMON_BONUS_MAX = 80).
//
// POST /api/gamebook/daemon/allocate-points pour persister.

import { useEffect, useState } from "react"

interface DaemonPending {
    id: string
    name: string
    speciesLevel: number
    combatLevel: number
    pendingStatPoints: number
    bonusStats: {
        force: number
        vitesse: number
        defense: number
        intelligence: number
        endurance: number
    }
}

interface Props {
    onClose: () => void
    /** Optionnel : callback après allocation réussie. */
    onAllocated?: () => void
}

const STAT_LABELS = {
    force: "💪 FORCE",
    vitesse: "⚡ VITESSE",
    defense: "🛡️ DÉFENSE",
    intelligence: "🧠 INTEL",
    endurance: "❤️ ENDURANCE",
} as const

type StatKey = keyof typeof STAT_LABELS
const STAT_KEYS: StatKey[] = ["force", "vitesse", "defense", "intelligence", "endurance"]
const BONUS_MAX = 80

export default function SaiyanLevelUpModal({ onClose, onAllocated }: Props) {
    const [daemons, setDaemons] = useState<DaemonPending[]>([])
    const [focusedId, setFocusedId] = useState<string | null>(null)
    const [alloc, setAlloc] = useState<Record<StatKey, number>>({
        force: 0, vitesse: 0, defense: 0, intelligence: 0, endurance: 0,
    })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const refresh = async () => {
        try {
            const r = await fetch("/api/gamebook/daemon/list", { cache: "no-store" })
            if (!r.ok) return
            const j = await r.json()
            const pending: DaemonPending[] = (j.daemons ?? [])
                .filter((d: { pendingStatPoints: number }) => d.pendingStatPoints > 0)
                .map((d: { id: string; name: string; speciesLevel: number; combatLevel: number; pendingStatPoints: number; bonusStats: DaemonPending["bonusStats"] }) => ({
                    id: d.id, name: d.name, speciesLevel: d.speciesLevel,
                    combatLevel: d.combatLevel, pendingStatPoints: d.pendingStatPoints,
                    bonusStats: d.bonusStats,
                }))
            setDaemons(pending)
            if (pending.length > 0 && !focusedId) setFocusedId(pending[0].id)
        } catch { /* silent */ }
    }

    useEffect(() => { refresh() }, [])

    const focused = daemons.find((d) => d.id === focusedId) ?? null

    const total = STAT_KEYS.reduce((s, k) => s + alloc[k], 0)
    const remaining = (focused?.pendingStatPoints ?? 0) - total

    const setStat = (k: StatKey, delta: number) => {
        if (!focused) return
        const current = alloc[k]
        const next = Math.max(0, current + delta)
        // Plafond pending
        if (delta > 0 && remaining <= 0) return
        // Plafond bonus 80
        if (focused.bonusStats[k] + next > BONUS_MAX) return
        setAlloc((a) => ({ ...a, [k]: next }))
    }

    const reset = () => setAlloc({ force: 0, vitesse: 0, defense: 0, intelligence: 0, endurance: 0 })

    const submit = async () => {
        if (!focused || total <= 0 || busy) return
        setBusy(true); setError(null); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/daemon/allocate-points", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ daemonId: focused.id, allocation: alloc }),
            })
            const j = await r.json()
            if (!r.ok || !j.ok) {
                setError(j.reason ?? "Allocation refusée.")
            } else {
                setMessage(j.message ?? "Points alloués.")
                reset()
                await refresh()
                if (onAllocated) onAllocated()
            }
        } catch {
            setError("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    if (daemons.length === 0) {
        return null
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9700, padding: 16, fontFamily: "'Courier New', monospace",
            }}
        >
            <div
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #ffd54f", borderRadius: 6,
                    padding: 16, maxWidth: 460, width: "100%",
                    maxHeight: "94vh", overflowY: "auto",
                    boxShadow: "0 0 32px rgba(255,213,79,0.4)",
                }}
            >
                <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, color: "#ffd54f", textAlign: "center" }}>
                    ⚡ NIVEAU SUPÉRIEUR ⚡
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 12, textAlign: "center" }}>
                    Le combat t'a rendu plus fort. Répartis tes points Saiyan.
                </div>

                {/* Sélection du Daemon (si plusieurs en attente) */}
                {daemons.length > 1 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {daemons.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => { setFocusedId(d.id); reset() }}
                                style={{
                                    background: d.id === focusedId ? "#ffd54f" : "#333",
                                    color: d.id === focusedId ? "#000" : "#fff",
                                    border: "1px solid #ffd54f",
                                    padding: "4px 8px", fontSize: 10,
                                    fontFamily: "monospace", cursor: "pointer",
                                }}
                            >
                                {d.name} (+{d.pendingStatPoints})
                            </button>
                        ))}
                    </div>
                )}

                {focused && (
                    <>
                        <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 8, marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: "bold" }}>
                                {focused.name} · Combat Lv {focused.combatLevel}
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                Points à répartir : <span style={{ color: "#ffd54f", fontWeight: "bold" }}>{remaining}</span> / {focused.pendingStatPoints}
                            </div>
                        </div>

                        {STAT_KEYS.map((k) => {
                            const v = alloc[k]
                            const currentBonus = focused.bonusStats[k]
                            const newBonus = currentBonus + v
                            const atCap = newBonus >= BONUS_MAX
                            return (
                                <div key={k} style={{ display: "flex", alignItems: "center", marginBottom: 6, fontSize: 11 }}>
                                    <div style={{ flex: 1, fontWeight: "bold" }}>{STAT_LABELS[k]}</div>
                                    <div style={{ fontSize: 9, opacity: 0.7, marginRight: 8 }}>
                                        bonus {currentBonus} → <span style={{ color: v > 0 ? "#ffd54f" : "#a0a0a0" }}>{newBonus}</span> / {BONUS_MAX}
                                    </div>
                                    <button
                                        onClick={() => setStat(k, -1)}
                                        disabled={v <= 0 || busy}
                                        style={btnStyle(v <= 0 || busy)}
                                    >−</button>
                                    <div style={{ width: 28, textAlign: "center", fontWeight: "bold", color: v > 0 ? "#ffd54f" : "#fff" }}>{v}</div>
                                    <button
                                        onClick={() => setStat(k, 1)}
                                        disabled={remaining <= 0 || atCap || busy}
                                        style={btnStyle(remaining <= 0 || atCap || busy)}
                                    >+</button>
                                </div>
                            )
                        })}

                        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                            <button
                                onClick={reset}
                                disabled={busy || total <= 0}
                                style={{
                                    flex: 1,
                                    background: "transparent", color: "#80a0d0",
                                    border: "1px solid #80a0d0",
                                    padding: 8, fontSize: 11, fontFamily: "monospace",
                                    cursor: busy || total <= 0 ? "not-allowed" : "pointer",
                                }}
                            >
                                RESET
                            </button>
                            <button
                                onClick={submit}
                                disabled={busy || total <= 0}
                                style={{
                                    flex: 2,
                                    background: busy || total <= 0 ? "#444" : "#ffd54f",
                                    color: busy || total <= 0 ? "#888" : "#000",
                                    border: "none", padding: 8, fontSize: 12,
                                    fontWeight: "bold", letterSpacing: 2,
                                    fontFamily: "monospace",
                                    cursor: busy || total <= 0 ? "not-allowed" : "pointer",
                                }}
                            >
                                {busy ? "..." : `VALIDER (${total})`}
                            </button>
                        </div>
                    </>
                )}

                {error && (
                    <div style={{ marginTop: 10, padding: 8, background: "#502020", border: "1px solid #c84848", fontSize: 10 }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{ marginTop: 10, padding: 8, background: "#205020", border: "1px solid #48c848", fontSize: 10 }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    PLUS TARD
                </button>
            </div>
        </div>
    )
}

function btnStyle(disabled: boolean): React.CSSProperties {
    return {
        background: disabled ? "#333" : "#3a5a8a",
        color: disabled ? "#666" : "#fff",
        border: "1px solid #80a0d0",
        width: 26, height: 26, fontSize: 14, fontWeight: "bold",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "monospace",
    }
}
