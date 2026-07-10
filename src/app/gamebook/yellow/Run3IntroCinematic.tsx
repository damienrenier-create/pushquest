"use client"

// Nexus Jaune Éclair — cinématique d'entrée du RUN 3 (le CONCOURS). Jumelle de IntroCinematic (run 1),
// mais dialogues ADAPTÉS : le Dieu Spaghetti présente le concours et offre le CHOIX de la lignée, en
// triangle Métal › Fée › Combat/Insecte › Métal. Même rendu lisible (cartes crème sur fond sombre).
// À la fin : onComplete(starterId) → launchRun3(starterId).

import { useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

const npc = (id: string) => `/yellow/sprites/npc/${id}.png`

interface Line { speaker: string; sprite: string; fallback: string; text: string }

// Les 3 lignées AU CHOIX (stade 1). Triangle : 🔩 Métal › 🧚 Fée › 🦗 Combat/Insecte › 🔩 Métal.
const STARTERS = [
    { id: "elefer", emoji: "🔩", type: "Métal", role: "Mur défensif — increvable, lent, cogne tard", edge: "avantagé contre la Fée" },
    { id: "cornaive", emoji: "🧚", type: "Fée", role: "Sweeper spécial — rapide, frappe en Spécial", edge: "avantagé contre le Combat" },
    { id: "coccipoing", emoji: "🦗", type: "Combat / Insecte", role: "Canon de verre — brutal & rapide, mais fragile", edge: "avantagé contre le Métal" },
]

const SCRIPT: Line[] = [
    { speaker: "???", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "✦ Te revoilà, Maître. Deux vies domptées… et pourtant, aucune soif de repos dans ton regard. ✦" },
    { speaker: "DIEU SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "Alors voici ta TROISIÈME vie : le CONCOURS SACRÉ. Un seul but — aller le plus loin possible, et graver ton nom dans la semoule éternelle. 🍝" },
    { speaker: "DIEU SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "Mais on repart de rien, avec UN seul compagnon. Trois lignées inédites s'offrent à toi, nouées en un triangle sacré…" },
    { speaker: "DIEU SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "🔩 Le Métal broie la 🧚 Fée. La 🧚 Fée terrasse le 🦗 Combat. Le 🦗 Combat fracasse le 🔩 Métal. À toi de choisir ta place dans la ronde." },
]

const outro = (name: string): Line[] => [
    { speaker: "DIEU SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: `${name} ! Un choix digne d'un Maître. Qu'il te porte loin… très loin.` },
    { speaker: "DIEU SPAGHETTI", sprite: npc("fsm_divine_form"), fallback: "🍝", text: "Maintenant approche : il est temps que je t'explique les règles du concours. 🍝🔥" },
]

function Portrait({ src, fallback, small }: { src: string; fallback: string; small?: boolean }) {
    const [err, setErr] = useState(false)
    if (err) return <div style={small ? S.cardGlyph : S.portraitGlyph}>{fallback}</div>
    return <img src={src} alt="" onError={() => setErr(true)} style={small ? S.cardImg : S.portraitImg} />
}

export default function Run3IntroCinematic({ onComplete }: { onComplete: (starterId: string) => void }) {
    const [phase, setPhase] = useState<"intro" | "choose" | "outro">("intro")
    const [i, setI] = useState(0)
    const [chosen, setChosen] = useState<string | null>(null)

    const advanceIntro = () => { if (i + 1 < SCRIPT.length) setI(i + 1); else setPhase("choose") }
    const pick = (id: string) => { setChosen(id); setI(0); setPhase("outro") }
    const advanceOutro = () => {
        const lines = outro(getSpecies(chosen!)?.name ?? "Ton Daemon")
        if (i + 1 < lines.length) setI(i + 1); else onComplete(chosen!)
    }

    const line: Line | null = phase === "intro" ? SCRIPT[i]
        : phase === "outro" ? outro(getSpecies(chosen!)?.name ?? "Ton Daemon")[i]
            : null

    return (
        <div style={S.overlay}>
            {phase === "choose" ? (
                <div style={S.chooseBox}>
                    <p style={S.chooseTitle}>Choisis ta lignée</p>
                    <div style={S.cardsCol}>
                        {STARTERS.map((s) => {
                            const sp = getSpecies(s.id)
                            return (
                                <button key={s.id} style={S.cardRow} onClick={() => pick(s.id)}>
                                    <div style={S.cardSprite}>
                                        <Portrait src={`/yellow/sprites/dex/${s.id}.png`} fallback={s.emoji} small />
                                    </div>
                                    <div style={S.cardInfo}>
                                        <div style={S.cardName}>{s.emoji} {sp?.name ?? s.id} <span style={S.cardType}>· {s.type}</span></div>
                                        <div style={S.cardRole}>{s.role}</div>
                                        <div style={S.cardEdge}>⚔️ {s.edge}</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    <p style={S.hint}>Touche une lignée pour la choisir ▶</p>
                </div>
            ) : line ? (
                <div style={S.scene} onClick={phase === "intro" ? advanceIntro : advanceOutro}>
                    <Portrait src={line.sprite} fallback={line.fallback} />
                    <div style={S.box}>
                        <div style={S.speaker}>{line.speaker}</div>
                        <p style={S.text}>{line.text}</p>
                        <span style={S.next}>Toucher ▶</span>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9300, background: "radial-gradient(circle at 50% 35%, #3a1420 0%, #0a0a14 70%)", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    scene: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, cursor: "pointer" },
    portraitImg: { width: 150, height: 150, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 0 16px #f5d02077)" },
    portraitGlyph: { width: 110, height: 110, borderRadius: "50%", background: "#1c1408", border: "3px solid #f5d020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 },
    box: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: 16, width: "100%", minHeight: 110, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center" },
    speaker: { fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#a06030", marginBottom: 6 },
    text: { fontSize: 14, lineHeight: 1.55, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 11, opacity: 0.55 },
    chooseBox: { width: "100%", maxWidth: 460, textAlign: "center" },
    chooseTitle: { fontSize: 16, fontWeight: 900, letterSpacing: 1, marginBottom: 14 },
    cardsCol: { display: "flex", flexDirection: "column", gap: 10 },
    cardRow: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
    cardSprite: { width: 60, height: 60, flex: "none", background: "#e6e2cc", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
    cardImg: { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" },
    cardGlyph: { fontSize: 32 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardName: { fontSize: 15, fontWeight: 900, color: "#1c1408" },
    cardType: { fontSize: 11, fontWeight: 800, color: "#8848b0" },
    cardRole: { fontSize: 11, fontWeight: 700, color: "#5a4a30", marginTop: 2 },
    cardEdge: { fontSize: 11, fontWeight: 800, color: "#1f7a3f", marginTop: 2 },
    hint: { fontSize: 11, opacity: 0.6, marginTop: 14 },
}
