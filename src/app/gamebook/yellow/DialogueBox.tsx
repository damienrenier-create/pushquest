"use client"

// Nexus II — boîte de dialogue style GBC.
//
// Overlay positionné au bas de l'écran (in-shell). S'affiche uniquement quand
// dialogue !== null dans le store. Affiche le nom du PNJ + la ligne courante
// + un petit triangle clignotant pour indiquer "presse A pour suivre".

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

// Palette Johto (cohérente avec MapView)
const BOX_BG = "#f4ecd4"        // cream lisible
const BOX_BG_DARK = "#d8c898"   // ombre du box
const INK = "#2a1c10"           // texte / contour

export default function DialogueBox() {
    const dialogue = useGameStore((s) => s.dialogue)
    if (!dialogue) return null

    const line = dialogue.lines[dialogue.lineIndex]
    const isLast = dialogue.lineIndex >= dialogue.lines.length - 1

    return (
        <>
            <style>{`@keyframes yellowBlink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`}</style>
            <div style={boxStyle}>
                <div style={nameStyle}>{dialogue.npcName}</div>
                <div style={lineStyle}>{line}</div>
                <div style={blinkArrowStyle}>{isLast ? "▣" : "▼"}</div>
            </div>
        </>
    )
}

const boxStyle: React.CSSProperties = {
    position: "absolute",
    left: "4%",
    right: "4%",
    bottom: "4%",
    background: BOX_BG,
    border: `2px solid ${INK}`,
    borderRadius: 4,
    padding: "6px 10px 14px",
    color: INK,
    fontFamily: "'Courier New', monospace",
    boxShadow: `inset 0 0 0 1px ${BOX_BG}, 0 2px 0 ${BOX_BG_DARK}`,
    zIndex: 10,
    minHeight: "30%",
}

const nameStyle: React.CSSProperties = {
    fontSize: "clamp(8px, 1.8dvw, 11px)",
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottom: `1px solid ${INK}`,
}

const lineStyle: React.CSSProperties = {
    fontSize: "clamp(9px, 2.2dvw, 13px)",
    lineHeight: 1.4,
    letterSpacing: 0.5,
    whiteSpace: "pre-wrap",
}

const blinkArrowStyle: React.CSSProperties = {
    position: "absolute",
    right: 8,
    bottom: 4,
    fontSize: "clamp(8px, 2dvw, 12px)",
    animation: "yellowBlink 0.8s steps(2) infinite",
}
