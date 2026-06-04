"use client"

// Nexus II "jaune éclair" — Game Boy Color shell.
//
// Reproduit visuellement une GBC Dandelion (jaune vif) avec :
//   - Écran indenté au ratio 10:9 (160:144 unités logiques GBC originales)
//   - D-pad noir en bas-gauche
//   - Boutons A/B rouge foncé en diagonale bas-droite
//   - START + SELECT oblongs noirs centre-bas
//
// Touch-friendly mobile-first. Aucun SVG, pur HTML/CSS.
// Le contenu du jeu (children) est rendu à l'intérieur de l'écran avec
// image-rendering: pixelated pour le look LCD pixel.

import { useCallback } from "react"

export interface GameBoyShellProps {
    children: React.ReactNode
    /** Reps disponibles (affichés en jauge à côté de POWER). */
    reps?: number
    repsCap?: number
    onUp?: () => void
    onDown?: () => void
    onLeft?: () => void
    onRight?: () => void
    onA?: () => void
    onB?: () => void
    onStart?: () => void
    onSelect?: () => void
}

// Couleurs GBC Dandelion
const SHELL_YELLOW = "#F5C518"
const SHELL_YELLOW_DARK = "#C99B0E"
const SCREEN_BEZEL = "#3D3328"
const SCREEN_FRAME = "#1A1612"
const BUTTON_RED = "#8B1E2E"
const BUTTON_RED_DARK = "#5A0F1C"
const BUTTON_BLACK = "#1F1F1F"
const DPAD_BLACK = "#2A2A2A"
const TEXT_DARK = "#3D3328"

export default function GameBoyShell({
    children,
    reps,
    repsCap,
    onUp,
    onDown,
    onLeft,
    onRight,
    onA,
    onB,
    onStart,
    onSelect,
}: GameBoyShellProps) {
    const handlePress = useCallback((cb?: () => void) => (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        cb?.()
    }, [])

    return (
        <div style={shellStyle}>
            {/* Écran indenté avec biseau */}
            <div style={screenBezelStyle}>
                <div style={screenFrameStyle}>
                    <div style={screenStyle}>
                        {children}
                    </div>
                </div>
                {/* Mini-LED power indicator */}
                <div style={powerLedStyle} />
                <div style={powerLabelStyle}>POWER</div>
                {/* Jauge de reps disponibles (énergie de combat) */}
                {reps !== undefined && (
                    <div style={repsGaugeWrapStyle}>
                        <span style={repsGaugeIconStyle}>💪</span>
                        <div style={repsGaugeTrackStyle}>
                            <div style={{ ...repsGaugeFillStyle, width: `${Math.max(0, Math.min(100, (reps / Math.max(1, repsCap ?? 1000)) * 100))}%` }} />
                        </div>
                        <span style={repsGaugeNumStyle}>{reps}</span>
                    </div>
                )}
            </div>

            {/* Zone contrôles */}
            <div style={controlsRowStyle}>
                {/* D-pad gauche */}
                <div style={dpadContainerStyle}>
                    <button
                        aria-label="Haut"
                        style={{ ...dpadButtonStyle, ...dpadUpStyle }}
                        onMouseDown={handlePress(onUp)}
                        onTouchStart={handlePress(onUp)}
                    >▲</button>
                    <button
                        aria-label="Gauche"
                        style={{ ...dpadButtonStyle, ...dpadLeftStyle }}
                        onMouseDown={handlePress(onLeft)}
                        onTouchStart={handlePress(onLeft)}
                    >◀</button>
                    <div style={dpadCenterStyle} />
                    <button
                        aria-label="Droite"
                        style={{ ...dpadButtonStyle, ...dpadRightStyle }}
                        onMouseDown={handlePress(onRight)}
                        onTouchStart={handlePress(onRight)}
                    >▶</button>
                    <button
                        aria-label="Bas"
                        style={{ ...dpadButtonStyle, ...dpadDownStyle }}
                        onMouseDown={handlePress(onDown)}
                        onTouchStart={handlePress(onDown)}
                    >▼</button>
                </div>

                {/* A/B droite — A en bas-droite, B en haut-gauche (diagonale GBC) */}
                <div style={abContainerStyle}>
                    <button
                        aria-label="Bouton B"
                        style={{ ...abButtonStyle, ...bButtonPositionStyle }}
                        onMouseDown={handlePress(onB)}
                        onTouchStart={handlePress(onB)}
                    >B</button>
                    <button
                        aria-label="Bouton A"
                        style={{ ...abButtonStyle, ...aButtonPositionStyle }}
                        onMouseDown={handlePress(onA)}
                        onTouchStart={handlePress(onA)}
                    >A</button>
                </div>
            </div>

            {/* START + SELECT centre-bas */}
            <div style={startSelectRowStyle}>
                <button
                    aria-label="Select"
                    style={startSelectButtonStyle}
                    onMouseDown={handlePress(onSelect)}
                    onTouchStart={handlePress(onSelect)}
                >SELECT</button>
                <button
                    aria-label="Start"
                    style={startSelectButtonStyle}
                    onMouseDown={handlePress(onStart)}
                    onTouchStart={handlePress(onStart)}
                >START</button>
            </div>

            {/* Speaker grille décoratif bas-droite */}
            <div style={speakerStyle}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={speakerDotStyle} />
                ))}
            </div>
        </div>
    )
}

// === STYLES ===

const shellStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    background: `linear-gradient(180deg, ${SHELL_YELLOW} 0%, ${SHELL_YELLOW_DARK} 100%)`,
    borderRadius: "28px 28px 80px 28px",
    padding: "24px 20px 32px",
    boxShadow:
        "inset 0 2px 4px rgba(255,255,255,0.4), " +
        "inset 0 -4px 12px rgba(0,0,0,0.15), " +
        "0 8px 24px rgba(0,0,0,0.3)",
    fontFamily: "'Courier New', monospace",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation", // élimine le délai 300ms iOS + bloque le double-tap zoom
    position: "relative",
}

const screenBezelStyle: React.CSSProperties = {
    background: SCREEN_BEZEL,
    borderRadius: "8px 8px 24px 8px",
    padding: "20px 16px 32px",
    boxShadow: "inset 0 4px 8px rgba(0,0,0,0.4)",
    marginBottom: 24,
    position: "relative",
}

const screenFrameStyle: React.CSSProperties = {
    background: SCREEN_FRAME,
    borderRadius: 4,
    padding: 8,
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
}

const screenStyle: React.CSSProperties = {
    // v2 — Aspect 3:2 (= 15:10 = GBA FireRed natif) au lieu de 10:9 GBC,
    // pour que les tiles soient carrées avec le viewport 15×10 du MapView.
    aspectRatio: "3 / 2",
    background: "#1a1612", // void noir-brun
    imageRendering: "pixelated",
    overflow: "hidden",
    position: "relative",
    color: "#2a1c10",
    fontFamily: "'Courier New', monospace",
}

const powerLedStyle: React.CSSProperties = {
    position: "absolute",
    left: 24,
    bottom: 12,
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ff3030",
    boxShadow: "0 0 6px #ff3030, inset 0 0 2px rgba(255,255,255,0.6)",
}

const powerLabelStyle: React.CSSProperties = {
    position: "absolute",
    left: 38,
    bottom: 8,
    fontSize: 9,
    color: "#ff3030",
    letterSpacing: 1.5,
    fontWeight: "bold",
}

const repsGaugeWrapStyle: React.CSSProperties = {
    position: "absolute",
    right: 20,
    bottom: 7,
    display: "flex",
    alignItems: "center",
    gap: 5,
}
const repsGaugeIconStyle: React.CSSProperties = { fontSize: 11, lineHeight: 1 }
const repsGaugeTrackStyle: React.CSSProperties = {
    width: 54,
    height: 7,
    background: "#2a1c10",
    border: "1px solid #2a1c10",
    borderRadius: 4,
    overflow: "hidden",
}
const repsGaugeFillStyle: React.CSSProperties = {
    height: "100%",
    background: "linear-gradient(90deg,#ffcc33,#ff9500)",
    transition: "width 0.3s ease",
}
const repsGaugeNumStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: "bold",
    color: "#2a1c10",
    minWidth: 22,
}

const controlsRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 8px",
    marginBottom: 28,
}

// D-pad : taille 144×144 (3×48) au lieu de 120×120 (3×40)
// Chaque bouton 48×48 = au-dessus du seuil mobile (Material 48dp, Apple 44pt)
const dpadContainerStyle: React.CSSProperties = {
    position: "relative",
    width: 144,
    height: 144,
}

const dpadButtonStyle: React.CSSProperties = {
    position: "absolute",
    width: 48,
    height: 48,
    background: DPAD_BLACK,
    border: "none",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
        "inset 0 2px 2px rgba(255,255,255,0.2), " +
        "inset 0 -2px 2px rgba(0,0,0,0.4)",
    touchAction: "manipulation",
}

const dpadUpStyle: React.CSSProperties = {
    top: 0,
    left: 48,
    borderRadius: "6px 6px 0 0",
}

const dpadDownStyle: React.CSSProperties = {
    bottom: 0,
    left: 48,
    borderRadius: "0 0 6px 6px",
}

const dpadLeftStyle: React.CSSProperties = {
    left: 0,
    top: 48,
    borderRadius: "6px 0 0 6px",
}

const dpadRightStyle: React.CSSProperties = {
    right: 0,
    top: 48,
    borderRadius: "0 6px 6px 0",
}

const dpadCenterStyle: React.CSSProperties = {
    position: "absolute",
    top: 48,
    left: 48,
    width: 48,
    height: 48,
    background: DPAD_BLACK,
    boxShadow: "inset 0 0 4px rgba(0,0,0,0.6)",
}

const abContainerStyle: React.CSSProperties = {
    position: "relative",
    width: 140,
    height: 100,
    transform: "rotate(-25deg)",
}

const abButtonStyle: React.CSSProperties = {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: `radial-gradient(circle at 30% 30%, ${BUTTON_RED} 0%, ${BUTTON_RED_DARK} 100%)`,
    border: "none",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 22,
    cursor: "pointer",
    letterSpacing: 1,
    boxShadow:
        "inset 0 2px 2px rgba(255,255,255,0.3), " +
        "inset 0 -3px 4px rgba(0,0,0,0.5), " +
        "0 2px 4px rgba(0,0,0,0.3)",
    touchAction: "manipulation",
}

const bButtonPositionStyle: React.CSSProperties = {
    top: 6,
    left: 0,
}

const aButtonPositionStyle: React.CSSProperties = {
    top: 30,
    left: 68,
}

const startSelectRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    transform: "rotate(-12deg)",
    marginBottom: 12,
}

const startSelectButtonStyle: React.CSSProperties = {
    background: BUTTON_BLACK,
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "12px 20px",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.5,
    cursor: "pointer",
    minWidth: 84,
    minHeight: 36, // au-dessus du seuil tactile (avant : ~24px, trop petit)
    boxShadow:
        "inset 0 1px 1px rgba(255,255,255,0.15), " +
        "inset 0 -2px 2px rgba(0,0,0,0.4), " +
        "0 2px 2px rgba(0,0,0,0.2)",
    touchAction: "manipulation",
}

const speakerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 16,
    right: 24,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 4,
    transform: "rotate(-30deg)",
    opacity: 0.6,
}

const speakerDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: TEXT_DARK,
    boxShadow: "inset 0 1px 1px rgba(0,0,0,0.4)",
}

// Ignore inutile pour TEXT_DARK qui est référencé dans speakerDotStyle
void TEXT_DARK
