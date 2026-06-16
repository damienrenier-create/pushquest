"use client"

// Nexus Jaune Éclair — cinématique d'évolution post-combat (sprites animés).
// 3 phases par évolution : (0) intro « X évolue ! » → (1) MORPH animé → (2) « X a évolué en Y ! ».
// Tap / A = avancer · B (ou bouton ✋) = ANNULER l'évolution en cours (le Daemon garde sa forme).
// onCancel(uid) restaure la forme d'avant (cf. battleStore.cancelEvolution) ; onDone à la fin de la file.

import { useState, useEffect, useCallback } from "react"
import type { TeamEvolution } from "@/lib/gamebook/yellow/progression/evolveTeam"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

export default function EvolutionScreen({ evolutions, onCancel, onDone }: {
    evolutions: TeamEvolution[]
    onCancel: (uid: string) => void
    onDone: () => void
}) {
    const [i, setI] = useState(0)
    const [phase, setPhase] = useState<0 | 1 | 2>(0) // 0 intro · 1 morph · 2 résultat
    const [cancelled, setCancelled] = useState<Set<string>>(() => new Set())

    const evo = evolutions[i]
    const isCancelled = !!evo && cancelled.has(evo.uid)

    const advance = useCallback(() => {
        const cur = evolutions[i]
        if (!cur) { onDone(); return }
        if (!cancelled.has(cur.uid) && phase < 2) { setPhase((p) => (p + 1) as 0 | 1 | 2); return }
        if (i + 1 < evolutions.length) { setI(i + 1); setPhase(0); return }
        onDone()
    }, [i, phase, cancelled, evolutions, onDone])

    const doCancel = useCallback(() => {
        const cur = evolutions[i]
        if (!cur || cancelled.has(cur.uid) || phase >= 2) return
        onCancel(cur.uid)                                   // restaure la forme d'avant (store)
        setCancelled((prev) => new Set(prev).add(cur.uid))
        setPhase(2)                                          // affiche le message « n'a pas évolué »
    }, [i, phase, cancelled, evolutions, onCancel])

    // Clavier : A/Entrée/Espace = avancer · B/Échap = annuler. (L'input carte est neutralisé en amont.)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase()
            if (k === "b" || k === "escape" || k === "f") { e.preventDefault(); doCancel() }
            else if (k === "a" || k === "enter" || k === " " || k === "z") { e.preventDefault(); advance() }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [advance, doCancel])

    if (!evo) { onDone(); return null }

    const fromSp = getSpecies(evo.fromId)
    const toSp = getSpecies(evo.toId)
    const last = i + 1 >= evolutions.length
    const canCancel = !isCancelled && phase < 2

    return (
        <div onClick={advance} style={S.overlay}>
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
                    {phase === 2 && (
                        isCancelled
                            ? fromSp?.sprite && <img src={fromSp.sprite} alt={evo.fromName} style={S.sprite} />
                            : toSp?.sprite && <img src={toSp.sprite} alt={evo.toName} style={{ ...S.sprite, filter: "drop-shadow(0 0 18px #f5d020)" }} />
                    )}
                </div>
                <p style={S.text}>
                    {phase === 0 && <>Hein&nbsp;? <b>{evo.fromName}</b> évolue&nbsp;!</>}
                    {phase === 1 && <span style={{ opacity: 0.85 }}>…</span>}
                    {phase === 2 && (isCancelled
                        ? <>Hein&nbsp;? <b>{evo.fromName}</b> a <b style={{ color: "#7ee0ff" }}>stoppé</b> son évolution&nbsp;!</>
                        : <>Félicitations&nbsp;! <b>{evo.fromName}</b> a évolué en <b style={{ color: "#f5d020" }}>{evo.toName}</b>&nbsp;!</>)}
                </p>
                {canCancel && (
                    <button style={S.cancelBtn} onClick={(e) => { e.stopPropagation(); doCancel() }}>✋ Annuler l&apos;évolution (B)</button>
                )}
                <div style={S.hint}>
                    {phase < 2 && !isCancelled ? "Toucher / A pour continuer ▶" : (last ? "Toucher pour terminer ▶" : "Toucher ▶")}
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
    cancelBtn: { marginTop: 8, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, cursor: "pointer" },
    hint: { position: "absolute", bottom: 24, left: 0, right: 0, fontSize: 11, opacity: 0.55, textAlign: "center" },
}
