"use client"

// Nexus II — boîte de dialogue style GBC.
//
// Overlay positionné au bas de l'écran (in-shell). S'affiche uniquement quand
// dialogue !== null dans le store. Affiche le nom du PNJ + la ligne courante
// + un petit triangle clignotant pour indiquer "presse A pour suivre".

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { getTrainer } from "@/lib/gamebook/yellow/data/trainers"

// Palette Johto (cohérente avec MapView)
const BOX_BG = "#f4ecd4"        // cream lisible
const BOX_BG_DARK = "#d8c898"   // ombre du box
const INK = "#2a1c10"           // texte / contour

// Portraits de dialogue par PNJ (cinématique d'intro). Optionnel : un PNJ sans
// entrée affiche le dialogue sans portrait (comportement historique).
const DIALOGUE_PORTRAITS: Record<string, string> = {
    y_sbire: "/yellow/sprites/npc/noodle_nymph.png", // la Nymphe Nouille
    y_genie_ambush: "/yellow/sprites/npc/colporteur.png", // COLPORTEUR ZALIM (arc Lampe & Génie) — intro + victoire
    y_ace: "/yellow/sprites/npc_ace.png", // ACE (rival), intro/outro de combat
    // Arène Plante : portraits d'intro/outro de combat.
    y_arena_druide: "/yellow/sprites/npc_druide.png",
    y_arena_g1: "/yellow/sprites/npc_garde_plante.png",
    y_arena_g2: "/yellow/sprites/npc_garde_plante.png",
    y_arena_g3: "/yellow/sprites/npc_garde_plante.png",
    y_arena_g4: "/yellow/sprites/npc_garde_plante.png",
    // Arène Roche : mineurs + Maître Granit.
    y_rocharena_g1: "/yellow/sprites/npc_roche1.png",
    y_rocharena_g2: "/yellow/sprites/npc_roche2.png",
    y_rocharena_g3: "/yellow/sprites/npc_roche3.png",
    y_rocharena_g4: "/yellow/sprites/npc_roche4.png",
    y_rocharena_boss: "/yellow/sprites/npc_granit.png",
    // Arène Électrique "Tour Hertz" : la Reine (boss) + 4 gardes.
    y_elecarena_boss: "/yellow/sprites/npc_elec_reine.png",
    y_elecarena_g1: "/yellow/sprites/npc_elec_gauche.png",
    y_elecarena_g2: "/yellow/sprites/npc_elec_droit1.png",
    y_elecarena_g3: "/yellow/sprites/npc_elec_droit2.png",
    y_elecarena_g4: "/yellow/sprites/npc_elec_droit3.png",
}

export default function DialogueBox() {
    const dialogue = useGameStore((s) => s.dialogue)
    if (!dialogue) return null

    const line = dialogue.lines[dialogue.lineIndex]
    const isLast = dialogue.lineIndex >= dialogue.lines.length - 1
    const portrait = DIALOGUE_PORTRAITS[dialogue.npcId]
    // Garde / dresseur SANS portrait image → on affiche son emoji de sprite en filigrane
    // DERRIÈRE le texte (look "on voit qui parle"). Non-dresseurs : pas de filigrane.
    const trainerEmoji = !portrait ? (getTrainer(dialogue.npcId)?.sprite.emoji ?? "").trim() : ""

    return (
        <>
            <style>{`@keyframes yellowBlink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }`}</style>
            {portrait && (
                <img src={portrait} alt={dialogue.npcName} style={portraitStyle} />
            )}
            <div style={boxStyle}>
                {trainerEmoji && <span style={spriteWatermarkStyle} aria-hidden>{trainerEmoji}</span>}
                <div style={nameStyle}>{dialogue.npcName}</div>
                <div style={lineStyle}>{line}</div>
                <div style={blinkArrowStyle}>{isLast ? "▣" : "▼"}</div>
            </div>
        </>
    )
}

// Portrait posé juste au-dessus de la boîte de dialogue (coin droit), look "VN".
const portraitStyle: React.CSSProperties = {
    position: "absolute",
    right: "5%",
    bottom: "calc(4% + 30% - 6px)", // au-dessus du box (bottom 4% + minHeight 30%)
    width: "clamp(56px, 18dvw, 96px)",
    height: "auto",
    imageRendering: "pixelated",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
    zIndex: 11,
    pointerEvents: "none",
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
    overflow: "hidden", // clippe le filigrane du sprite à la boîte
}

// Emoji du dresseur en FILIGRANE derrière le texte (grand, très transparent, à droite).
const spriteWatermarkStyle: React.CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "clamp(46px, 15dvw, 84px)",
    opacity: 0.16,
    lineHeight: 1,
    zIndex: 0,
    pointerEvents: "none",
}

const nameStyle: React.CSSProperties = {
    position: "relative", // au-dessus du filigrane
    zIndex: 1,
    fontSize: "clamp(8px, 1.8dvw, 11px)",
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottom: `1px solid ${INK}`,
}

const lineStyle: React.CSSProperties = {
    position: "relative", // au-dessus du filigrane
    zIndex: 1,
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
