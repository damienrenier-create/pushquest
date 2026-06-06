"use client"

// Nexus Jaune Éclair — contrôles COMPACTS du combat (hors coque Game Boy).
//
// Pendant un combat on n'affiche plus la coque entière (elle enfermait l'écran
// et coupait les menus). Cette barre légère reprend juste l'essentiel : un D-pad
// et les boutons A / B. Chaque appui est poussé dans le pont d'entrée du combat
// via dispatchBattleInput (le même que le clavier). Rendue DANS le flux, sous le
// BattleScreen → aucune superposition avec les menus.

import { useCallback, useRef, useEffect } from "react"
import { dispatchBattleInput, type BattleInput } from "@/lib/gamebook/yellow/store/battleStore"

export default function BattleControls() {
    // Pointer Events : un seul event par appui (tactile ou souris), non-passif →
    // preventDefault() tue le clic fantôme. Cohérent avec GameBoyShell.
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stopHold = useCallback(() => {
        if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null }
    }, [])
    useEffect(() => stopHold, [stopHold]) // nettoyage au démontage

    // A / B : un tap = une action.
    const tap = useCallback((a: BattleInput) => (e: React.PointerEvent) => {
        e.preventDefault()
        dispatchBattleInput(a)
    }, [])

    // Flèches : 1er pas immédiat + répétition tant que maintenu (navigation menu).
    const hold = useCallback((a: BattleInput) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault()
            dispatchBattleInput(a)
            stopHold()
            holdRef.current = setInterval(() => dispatchBattleInput(a), 170)
        },
        onPointerUp: stopHold,
        onPointerLeave: stopHold,
        onPointerCancel: stopHold,
    }), [stopHold])

    return (
        // Footer FIXE en bas du viewport : les boutons ne bougent JAMAIS, quel que
        // soit l'écran de combat (menu racine, attaques, message…). Évite d'appuyer
        // au mauvais endroit pendant une transition de menu.
        <div style={footerStyle}>
            <div style={rowStyle}>
                {/* D-pad gauche */}
                <div style={dpadStyle}>
                    <button aria-label="Haut" style={{ ...dBtn, ...dUp }} {...hold("up")}>▲</button>
                    <button aria-label="Gauche" style={{ ...dBtn, ...dLeft }} {...hold("left")}>◀</button>
                    <div style={dCenter} />
                    <button aria-label="Droite" style={{ ...dBtn, ...dRight }} {...hold("right")}>▶</button>
                    <button aria-label="Bas" style={{ ...dBtn, ...dDown }} {...hold("down")}>▼</button>
                </div>

                {/* A / B droite (diagonale comme la coque) */}
                <div style={abStyle}>
                    <button aria-label="Bouton B" style={{ ...abBtn, ...bPos }} onPointerDown={tap("b")}>B</button>
                    <button aria-label="Bouton A" style={{ ...abBtn, ...aPos }} onPointerDown={tap("a")}>A</button>
                </div>
            </div>
        </div>
    )
}

/** Hauteur réservée du footer de contrôles (px) — utilisée pour le padding du combat. */
export const BATTLE_CONTROLS_HEIGHT = 150

// === STYLES (compacts) ===

const BUTTON_RED = "#8B1E2E"
const BUTTON_RED_DARK = "#5A0F1C"
const DPAD_BLACK = "#2A2A2A"

// Footer ancré au bas du viewport (au-dessus de la nav OS via safe-area).
const footerStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    background: "#1a1a1a",
    borderTop: "1px solid #000",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
}

const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    padding: "8px 6px",
    boxSizing: "border-box",
}

// D-pad 120×120 (3×40)
const dpadStyle: React.CSSProperties = { position: "relative", width: 120, height: 120 }
const dBtn: React.CSSProperties = {
    position: "absolute", width: 40, height: 40, background: DPAD_BLACK, border: "none",
    color: "#fff", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "inset 0 2px 2px rgba(255,255,255,0.2), inset 0 -2px 2px rgba(0,0,0,0.4)",
    touchAction: "manipulation",
}
const dUp: React.CSSProperties = { top: 0, left: 40, borderRadius: "6px 6px 0 0" }
const dDown: React.CSSProperties = { bottom: 0, left: 40, borderRadius: "0 0 6px 6px" }
const dLeft: React.CSSProperties = { left: 0, top: 40, borderRadius: "6px 0 0 6px" }
const dRight: React.CSSProperties = { right: 0, top: 40, borderRadius: "0 6px 6px 0" }
const dCenter: React.CSSProperties = {
    position: "absolute", top: 40, left: 40, width: 40, height: 40,
    background: DPAD_BLACK, boxShadow: "inset 0 0 4px rgba(0,0,0,0.6)",
}

// A / B
const abStyle: React.CSSProperties = { position: "relative", width: 124, height: 92, transform: "rotate(-25deg)" }
const abBtn: React.CSSProperties = {
    position: "absolute", width: 56, height: 56, borderRadius: "50%",
    background: `radial-gradient(circle at 30% 30%, ${BUTTON_RED} 0%, ${BUTTON_RED_DARK} 100%)`,
    border: "none", color: "#fff", fontWeight: "bold", fontSize: 20, cursor: "pointer", letterSpacing: 1,
    boxShadow: "inset 0 2px 2px rgba(255,255,255,0.3), inset 0 -3px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
    touchAction: "manipulation",
}
const bPos: React.CSSProperties = { top: 4, left: 0 }
const aPos: React.CSSProperties = { top: 28, left: 60 }
