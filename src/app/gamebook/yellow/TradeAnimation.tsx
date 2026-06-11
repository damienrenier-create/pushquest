"use client"

// Nexus Jaune Éclair — petite cinématique d'ÉCHANGE (façon Game Boy).
// Ton Daemon (give) part vers le haut, celui que tu reçois (receive) arrive du bas
// avec un halo, puis onDone() applique le swap réel. ~3 s.

import { useState, useEffect } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

export default function TradeAnimation({
    give,
    receive,
    onDone,
}: {
    give: MonInstance
    receive: MonInstance
    onDone: () => void
}) {
    const [phase, setPhase] = useState(0) // 0 = ton Daemon · 1 = il part · 2 = l'autre arrive
    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 1000)
        const t2 = setTimeout(() => setPhase(2), 1800)
        const t3 = setTimeout(() => onDone(), 3100)
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }, [onDone])

    const recName = getSpecies(receive.speciesId)?.name ?? "un Daemon"
    const src = (id: string) => `/yellow/sprites/dex/${id}.png`

    return (
        <div style={S.overlay}>
            <div style={S.title}>🔄 ÉCHANGE</div>
            <div style={S.stage}>
                {/* Ton Daemon : centré, puis part vers le haut en fondu (phase ≥ 1). */}
                <div style={{ ...S.slot, ...(phase >= 1 ? S.leaving : S.center) }}>
                    <img src={src(give.speciesId)} alt="" style={S.sprite} />
                    <div style={S.label}>{displayName(give)}</div>
                </div>
                {/* Daemon reçu : arrive du bas avec halo (phase ≥ 2). */}
                <div style={{ ...S.slot, ...(phase >= 2 ? S.center : S.below) }}>
                    <img src={src(receive.speciesId)} alt="" style={{ ...S.sprite, ...(phase >= 2 ? S.glow : null) }} />
                    <div style={S.label}>{recName}</div>
                </div>
            </div>
            <div style={S.caption}>{phase < 2 ? "Échange en cours…" : `✨ Tu reçois ${recName} !`}</div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: {
        position: "absolute", inset: 0, zIndex: 80,
        background: "radial-gradient(circle at 50% 40%, #2a1a40 0%, #07060c 75%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "#f8f8e8", fontFamily: "'Courier New', monospace", overflow: "hidden",
    },
    title: { fontSize: 13, fontWeight: 900, letterSpacing: 3, opacity: 0.8, marginBottom: 8 },
    stage: { position: "relative", width: 180, height: 200 },
    slot: {
        position: "absolute", left: 0, right: 0, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 8, transition: "transform 0.7s ease, opacity 0.7s ease",
    },
    center: { transform: "translateY(40px)", opacity: 1 },
    leaving: { transform: "translateY(-160px)", opacity: 0 },
    below: { transform: "translateY(240px)", opacity: 0 },
    sprite: { width: 132, height: 132, objectFit: "contain", imageRendering: "pixelated" },
    glow: { filter: "drop-shadow(0 0 14px #f5d020) drop-shadow(0 0 24px #ffd54a88)" },
    label: { fontSize: 13, fontWeight: 800, textShadow: "0 1px 2px #000" },
    caption: { marginTop: 14, fontSize: 13, fontWeight: 700, minHeight: 18, textShadow: "0 1px 2px #000" },
}
