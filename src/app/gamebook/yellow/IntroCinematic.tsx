"use client"

// Nexus Jaune Éclair — cinématique d'INTRO (1re entrée).
// Divinpâte (le dieu spaghetti) accueille le joueur, pose le monde, puis lui fait
// choisir son starter parmi les 3. À la fin : onComplete(starterId).
// Texte PLACEHOLDER — édite librement INTRO_LINES / OUTRO_LINES / les répliques.

import { useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

const NARRATOR_SPRITE = "/yellow/sprites/dex/divinpate.png"

// Starters proposés (Plante / Eau / Feu).
const STARTERS = ["feuillichot", "gouttiny", "braisille"]

const INTRO_LINES = [
    "✦ Une masse de nouilles dorées flotte vers toi, nimbée d'une lumière sainte… ✦",
    "Bienvenue, mortel. Te voici dans le NEXUS JAUNE ÉCLAIR.",
    "Je suis DIVINPÂTE, divinité spaghetti de ce monde. Mes appendices nouilleux sont, rassure-toi, bienveillants.",
    "Ici vivent des créatures qu'on nomme DAEMONS — elles jaillissent des hautes herbes.",
    "Et, Je le vois d'ici, ta sueur du monde réel les attire : plus tu forces, plus elles affluent.",
    "Mais nul ne part à l'aventure les mains vides. Choisis ton premier compagnon.",
]
const outroLines = (name: string) => [
    `${name} ! Sage décision… ou délicieux hasard. Je ne juge pas.`,
    "Que tes reps soient nombreuses et tes critiques cléments. Va, Dresseur — le Nexus Jaune Éclair t'attend. ✦",
]

function Portrait({ src, fallback }: { src: string; fallback: string }) {
    const [err, setErr] = useState(false)
    if (err) return <div style={S.portraitGlyph}>{fallback}</div>
    return <img src={src} alt="" onError={() => setErr(true)} style={S.portraitImg} />
}

export default function IntroCinematic({ onComplete }: { onComplete: (starterId: string) => void }) {
    const [phase, setPhase] = useState<"intro" | "choose" | "outro">("intro")
    const [line, setLine] = useState(0)
    const [chosen, setChosen] = useState<string | null>(null)

    const advanceIntro = () => {
        if (line + 1 < INTRO_LINES.length) setLine(line + 1)
        else setPhase("choose")
    }
    const pick = (id: string) => { setChosen(id); setLine(0); setPhase("outro") }
    const advanceOutro = () => {
        const lines = outroLines(getSpecies(chosen!)?.name ?? "Ton Daemon")
        if (line + 1 < lines.length) setLine(line + 1)
        else onComplete(chosen!)
    }

    return (
        <div style={S.overlay}>
            {phase === "choose" ? (
                <div style={S.chooseBox}>
                    <p style={S.chooseTitle}>Choisis ton premier Daemon</p>
                    <div style={S.cards}>
                        {STARTERS.map((id) => {
                            const sp = getSpecies(id)
                            return (
                                <button key={id} style={S.card} onClick={() => pick(id)}>
                                    <Portrait src={`/yellow/sprites/dex/${id}.png`} fallback={sp?.name[0] ?? "?"} />
                                    <span style={S.cardName}>{sp?.name ?? id}</span>
                                    <span style={S.cardType}>{sp?.types.join(" / ")}</span>
                                </button>
                            )
                        })}
                    </div>
                    <p style={S.hint}>Touche une carte pour choisir ▶</p>
                </div>
            ) : (
                <div style={S.scene} onClick={phase === "intro" ? advanceIntro : advanceOutro}>
                    <Portrait src={NARRATOR_SPRITE} fallback="🍝" />
                    <div style={S.box}>
                        <div style={S.speaker}>DIVINPÂTE</div>
                        <p style={S.text}>
                            {phase === "intro"
                                ? INTRO_LINES[line]
                                : outroLines(getSpecies(chosen!)?.name ?? "Ton Daemon")[line]}
                        </p>
                        <span style={S.next}>Toucher ▶</span>
                    </div>
                </div>
            )}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9300, background: "radial-gradient(circle at 50% 35%, #2a1a40 0%, #0a0a14 70%)", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    scene: { width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, cursor: "pointer" },
    portraitImg: { width: 150, height: 150, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 0 18px #f5d02088)" },
    portraitGlyph: { width: 110, height: 110, borderRadius: "50%", background: "#1c1408", border: "3px solid #f5d020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 },
    box: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: 16, width: "100%", minHeight: 110, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center" },
    speaker: { fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#a06030", marginBottom: 6 },
    text: { fontSize: 14, lineHeight: 1.55, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 11, opacity: 0.55 },
    chooseBox: { width: "100%", maxWidth: 460, textAlign: "center" },
    chooseTitle: { fontSize: 15, fontWeight: 900, letterSpacing: 1, marginBottom: 14 },
    cards: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    card: { background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "inherit" },
    cardName: { fontSize: 12, fontWeight: 900 },
    cardType: { fontSize: 9, fontWeight: 700, color: "#8868c0" },
    hint: { fontSize: 11, opacity: 0.6, marginTop: 14 },
}
