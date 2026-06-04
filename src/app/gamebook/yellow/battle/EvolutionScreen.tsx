"use client"

// Nexus Jaune Éclair — cinématique d'évolution post-combat.
// Joue chaque évolution (« Hein ? X évolue ! » → « X a évolué en Y ! »).
// Tap pour avancer ; onDone à la fin de la file.

import { useState } from "react"
import type { EvolutionResult } from "@/lib/gamebook/yellow/battle/evolution"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

export default function EvolutionScreen({ evolutions, onDone }: { evolutions: EvolutionResult[]; onDone: () => void }) {
    const [i, setI] = useState(0)
    const [phase, setPhase] = useState<0 | 1>(0)

    const evo = evolutions[i]
    if (!evo) { onDone(); return null }

    const from = getSpecies(evo.fromId)
    const to = getSpecies(evo.toId)

    const next = () => {
        if (phase === 0) { setPhase(1); return }
        if (i + 1 < evolutions.length) { setI(i + 1); setPhase(0); return }
        onDone()
    }

    return (
        <div onClick={next} style={S.overlay}>
            <div style={S.box}>
                {phase === 0 ? (
                    <>
                        <div className="evo-pulse" style={S.glyph}>{from?.name[0] ?? "?"}</div>
                        <p style={S.text}>Hein ? <b>{evo.fromName}</b> évolue !</p>
                    </>
                ) : (
                    <>
                        <div style={{ ...S.glyph, filter: "drop-shadow(0 0 16px #f5d020)" }}>{to?.name[0] ?? "?"}</div>
                        <p style={S.text}>Félicitations ! <b>{evo.fromName}</b> a évolué en <b style={{ color: "#f5d020" }}>{evo.toName}</b> !</p>
                    </>
                )}
                <div style={S.hint}>
                    {phase === 0 ? "Toucher pour continuer ▶" : (i + 1 < evolutions.length ? "Toucher ▶" : "Toucher pour terminer ▶")}
                </div>
            </div>
            <style jsx>{`
                .evo-pulse { animation: evoPulse 0.9s ease-in-out infinite; }
                @keyframes evoPulse {
                    0%, 100% { transform: scale(1); filter: none; }
                    50% { transform: scale(0.85); filter: brightness(3); }
                }
            `}</style>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9200, background: "#0a0a14", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "pointer" },
    box: { textAlign: "center", maxWidth: 360 },
    glyph: { width: 100, height: 100, borderRadius: "50%", background: "#fff", color: "#1c1408", border: "4px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 900, margin: "0 auto 18px" },
    text: { fontSize: 15, lineHeight: 1.6, fontWeight: 700 },
    hint: { position: "absolute", bottom: 24, left: 0, right: 0, fontSize: 11, opacity: 0.55, textAlign: "center" },
}
