"use client"

// Nexus Jaune Éclair — cinématique d'évolution post-combat (sprites animés).
// 3 phases par évolution : (0) intro « X évolue ! » → (1) MORPH animé (ancien sprite
// flashe blanc + rétrécit, le nouveau grandit avec halo) → (2) « X a évolué en Y ! ».
// Tap pour avancer ; onDone à la fin de la file. Inspiré de la cinématique du Chapitre 1.

import { useState } from "react"
import type { EvolutionResult } from "@/lib/gamebook/yellow/battle/evolution"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

export default function EvolutionScreen({ evolutions, onDone }: { evolutions: EvolutionResult[]; onDone: () => void }) {
    const [i, setI] = useState(0)
    const [phase, setPhase] = useState<0 | 1 | 2>(0) // 0 intro · 1 morph · 2 résultat

    const evo = evolutions[i]
    if (!evo) { onDone(); return null }

    const fromSp = getSpecies(evo.fromId)
    const toSp = getSpecies(evo.toId)
    const last = i + 1 >= evolutions.length

    const next = () => {
        if (phase < 2) { setPhase((p) => (p + 1) as 0 | 1 | 2); return }
        if (!last) { setI(i + 1); setPhase(0); return }
        onDone()
    }

    return (
        <div onClick={next} style={S.overlay}>
            <div style={S.box}>
                <div style={S.stage}>
                    {phase === 0 && fromSp?.sprite && (
                        <img src={fromSp.sprite} alt={evo.fromName} style={S.sprite} />
                    )}
                    {phase === 1 && (
                        <>
                            {fromSp?.sprite && <img src={fromSp.sprite} alt="" className="evo-from" style={S.sprite} />}
                            {toSp?.sprite && <img src={toSp.sprite} alt="" className="evo-to" style={S.sprite} />}
                        </>
                    )}
                    {phase === 2 && toSp?.sprite && (
                        <img src={toSp.sprite} alt={evo.toName} style={{ ...S.sprite, filter: "drop-shadow(0 0 18px #f5d020)" }} />
                    )}
                </div>
                <p style={S.text}>
                    {phase === 0 && <>Hein&nbsp;? <b>{evo.fromName}</b> évolue&nbsp;!</>}
                    {phase === 1 && <span style={{ opacity: 0.85 }}>…</span>}
                    {phase === 2 && <>Félicitations&nbsp;! <b>{evo.fromName}</b> a évolué en <b style={{ color: "#f5d020" }}>{evo.toName}</b>&nbsp;!</>}
                </p>
                <div style={S.hint}>
                    {phase < 2 ? "Toucher pour continuer ▶" : (last ? "Toucher pour terminer ▶" : "Toucher ▶")}
                </div>
            </div>
            <style jsx>{`
                .evo-from { animation: evoFromAnim 1.4s ease-in-out infinite; }
                .evo-to { animation: evoToAnim 1.4s ease-in-out infinite; }
                @keyframes evoFromAnim {
                    0%, 40% { opacity: 1; transform: scale(1); filter: none; }
                    50%, 90% { opacity: 0; transform: scale(0.55); filter: brightness(6) saturate(0); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes evoToAnim {
                    0%, 40% { opacity: 0; transform: scale(0.55); filter: brightness(6) saturate(0); }
                    50%, 90% { opacity: 1; transform: scale(1.12); filter: drop-shadow(0 0 16px #f5d020); }
                    100% { opacity: 0; transform: scale(0.55); }
                }
            `}</style>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9200, background: "#0a0a14", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "pointer" },
    box: { textAlign: "center", maxWidth: 360 },
    stage: { position: "relative", width: 180, height: 180, margin: "0 auto 16px" },
    sprite: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" },
    text: { fontSize: 15, lineHeight: 1.6, fontWeight: 700, minHeight: 48 },
    hint: { position: "absolute", bottom: 24, left: 0, right: 0, fontSize: 11, opacity: 0.55, textAlign: "center" },
}
