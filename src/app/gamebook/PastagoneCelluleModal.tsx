"use client"

// src/app/gamebook/PastagoneCelluleModal.tsx
//
// v4.0 Phase 4.C — Modal d'interrogatoire en cellule Pastagone.
//
// Le joueur est arrêté → réveillé en cellule → ouvre cette modal en
// pressant A sur la porte (celluleDoor).
//
// Le flic CARBONE lui présente 3 défis : 50 pompes / 300s gainage / 50 squats
// (delta réel depuis pastagoneInterrogStart côté serveur).
//
// Chaque clic POST /api/gamebook/pastagone/interrog-defi pour vérifier le delta.
// Quand les 3 sont validés, pastagoneEscaped=true et la porte se déverrouille.
// Le joueur peut alors sortir par le doorMat → Pastagone outdoor.

import { useState } from "react"

interface Defis {
    pompes?: boolean
    gainage?: boolean
    squats?: boolean
}

interface Props {
    initialDefis: Defis
    interrogStartAt: string | null
    onClose: () => void
    onEscaped: () => void
}

const CHALLENGES = [
    { key: "pompes", exercise: "PUSHUP" as const, label: "50 POMPES", threshold: 50, unit: "reps" },
    { key: "gainage", exercise: "PLANK" as const, label: "300s DE GAINAGE", threshold: 300, unit: "sec" },
    { key: "squats", exercise: "SQUAT" as const, label: "50 SQUATS", threshold: 50, unit: "reps" },
]

export default function PastagoneCelluleModal({ initialDefis, interrogStartAt, onClose, onEscaped }: Props) {
    const [defis, setDefis] = useState<Defis>(initialDefis ?? {})
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [progresses, setProgresses] = useState<Record<string, number>>({})

    const allValidated = defis.pompes === true && defis.gainage === true && defis.squats === true

    const tryDefi = async (exercise: "PUSHUP" | "PLANK" | "SQUAT") => {
        if (busy) return
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/interrog-defi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exercise }),
            })
            const j = await r.json()
            if (typeof j.delta === "number") {
                setProgresses((p) => ({ ...p, [exercise]: j.delta }))
            }
            if (j.ok && j.validated) {
                setDefis(j.defis ?? defis)
                setMessage(j.message ?? "Validé.")
                if (j.escaped === true) {
                    setTimeout(() => onEscaped(), 1200)
                }
            } else {
                setMessage(j.message ?? j.reason ?? "Pas encore.")
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
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9300, padding: 16, fontFamily: "'Courier New', monospace",
            }}
        >
            <div
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #c84848", borderRadius: 6,
                    padding: 16, maxWidth: 440, width: "100%",
                    maxHeight: "94vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    🐕 FLIC CARBONE
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                    {allValidated
                        ? "« Ouais, ouais. T'as fait tes preuves. Dégage avant que j'change d'avis. »"
                        : "« Petit poucet. Si tu veux sortir, tu vas suer. 3 défis, 3 preuves. Bouge tes muscles dans le vrai monde, et reviens me les montrer. »"}
                </div>

                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 10 }}>
                    {interrogStartAt
                        ? `Réveil enregistré : ${new Date(interrogStartAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}`
                        : "Pas de timer."}
                    <br />
                    Seuls les reps/secondes encodés <strong>APRÈS</strong> ce timestamp comptent.
                </div>

                {CHALLENGES.map((c) => {
                    const validated = defis[c.key as keyof Defis] === true
                    const progress = progresses[c.exercise] ?? 0
                    const pct = Math.min(100, (progress / c.threshold) * 100)
                    return (
                        <div key={c.key} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold" }}>
                                    {validated ? "✅ " : "⬜ "}{c.label}
                                </div>
                                <div style={{ fontSize: 9, opacity: 0.7 }}>
                                    {progress}/{c.threshold} {c.unit}
                                </div>
                            </div>
                            {!validated && (
                                <>
                                    <div style={{ background: "#111", height: 5, border: "1px solid #333", overflow: "hidden", marginBottom: 4 }}>
                                        <div style={{ width: `${pct}%`, height: "100%", background: "#c84848" }} />
                                    </div>
                                    <button
                                        onClick={() => tryDefi(c.exercise)}
                                        disabled={busy}
                                        style={{
                                            width: "100%",
                                            background: busy ? "#444" : "#3a5a8a",
                                            color: "#fff", border: "1px solid #fff",
                                            padding: 6, fontSize: 10, fontFamily: "monospace",
                                            cursor: busy ? "wait" : "pointer", fontWeight: "bold",
                                        }}
                                    >
                                        VÉRIFIER MES {c.exercise === "PLANK" ? "SECONDES" : "REPS"}
                                    </button>
                                </>
                            )}
                        </div>
                    )
                })}

                {message && (
                    <div style={{
                        marginTop: 10, padding: 8, background: "#222",
                        border: "1px solid #555", fontSize: 10, lineHeight: 1.5,
                    }}>
                        {message}
                    </div>
                )}

                {allValidated && (
                    <button
                        onClick={onEscaped}
                        style={{
                            marginTop: 12, width: "100%",
                            background: "#48c848", color: "#000", border: "none",
                            padding: 10, fontSize: 12, fontWeight: "bold",
                            letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                        }}
                    >
                        🚪 SORTIR DE LA CELLULE
                    </button>
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
                    {allValidated ? "Plus tard" : "Tâte les barreaux (FERMER)"}
                </button>
            </div>
        </div>
    )
}
