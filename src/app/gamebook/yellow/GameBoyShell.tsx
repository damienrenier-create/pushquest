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

import { useCallback, useRef, useEffect, useState } from "react"

// Largeur « bureau » de référence de la coque. Sur mobile, la coque est rendue
// à cette largeur fixe puis mise à l'échelle UNIFORMÉMENT (transform: scale),
// de sorte que toutes les proportions (écran 3:2, D-pad, A/B…) restent
// identiques au rendu desktop — la coque rétrécit en bloc au lieu de s'écraser.
const DESIGN_WIDTH = 480

export interface GameBoyShellProps {
    children: React.ReactNode
    /** Reps disponibles (affichés en jauge à côté de POWER). */
    reps?: number
    repsCap?: number
    /** Neutralise le D-pad (flèches grisées + inertes), ex. pendant l'écran de chargement de combat. */
    dpadDisabled?: boolean
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
    dpadDisabled,
    onUp,
    onDown,
    onLeft,
    onRight,
    onA,
    onB,
    onStart,
    onSelect,
}: GameBoyShellProps) {
    // Pointer Events : UN seul événement par appui (tactile ou souris), non-passif,
    // donc preventDefault() supprime les events souris de compat + le clic fantôme.
    // → fini le double-pas ET le tap-through qui refermait les menus (START).
    const handlePress = useCallback((cb?: () => void) => (e: React.PointerEvent) => {
        e.preventDefault()
        cb?.()
    }, [])

    // Maintien d'une flèche = avance en continu (1 appui = 1 case, appui long = répétition).
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stopHold = useCallback(() => {
        if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null }
    }, [])
    const holdHandlers = useCallback((cb?: () => void) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault()
            // Capture le pointeur : le bouton garde le doigt même s'il glisse hors
            // de la case (48px) → la marche en continu ne s'interrompt plus sur mobile.
            try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch { /* noop */ }
            cb?.()                                    // 1er pas immédiat
            stopHold()
            holdRef.current = setInterval(() => cb?.(), 150) // répétition tant que maintenu
        },
        onPointerUp: stopHold,
        onPointerCancel: stopHold,
        // PAS de onPointerLeave : grâce à la capture, on ne s'arrête qu'au relâché.
    }), [stopHold])
    useEffect(() => stopHold, [stopHold]) // nettoyage au démontage

    // Mise à l'échelle uniforme : on mesure la largeur dispo (wrapRef) et on
    // réduit la coque (largeur fixe DESIGN_WIDTH) avec transform: scale. Origine
    // top-left + marginLeft pour recentrer, et la hauteur du wrapper est calée
    // sur la hauteur VISUELLE (scalée) → pas de vide ni de scroll horizontal.
    const wrapRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const [layout, setLayout] = useState<{ scale: number; marginLeft: number; height: number }>({
        scale: 1,
        marginLeft: 0,
        height: 0,
    })
    useEffect(() => {
        const wrap = wrapRef.current
        const inner = innerRef.current
        if (!wrap || !inner) return
        const recompute = () => {
            const w = wrap.clientWidth
            const scale = Math.min(1, w / DESIGN_WIDTH)
            const marginLeft = Math.max(0, (w - DESIGN_WIDTH * scale) / 2)
            const height = inner.offsetHeight * scale // offsetHeight = hauteur de layout (non affectée par le transform)
            setLayout({ scale, marginLeft, height })
        }
        const ro = new ResizeObserver(recompute)
        ro.observe(wrap)
        ro.observe(inner)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={wrapRef} style={{ width: "100%", height: layout.height || undefined, overflow: "hidden" }}>
        <div
            ref={innerRef}
            style={{
                ...shellStyle,
                width: DESIGN_WIDTH,
                maxWidth: undefined,
                margin: 0,
                marginLeft: layout.marginLeft,
                transform: `scale(${layout.scale})`,
                transformOrigin: "top left",
            }}
        >
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
                        <span style={repsGaugeIconStyle}>⚡</span>
                        <div style={repsGaugeTrackStyle}>
                            <div style={{ ...repsGaugeFillStyle, width: `${Math.max(0, Math.min(100, (reps / Math.max(1, repsCap ?? 1000)) * 100))}%` }} />
                        </div>
                        <span style={repsGaugeNumStyle}>{reps}/{repsCap ?? 1000}</span>
                    </div>
                )}
            </div>

            {/* Zone contrôles */}
            <div style={controlsRowStyle}>
                {/* D-pad gauche */}
                <div style={dpadContainerStyle}>
                    <button
                        aria-label="Haut"
                        disabled={dpadDisabled}
                        style={{ ...dpadButtonStyle, ...dpadUpStyle, ...(dpadDisabled ? dpadDisabledStyle : null) }}
                        {...holdHandlers(onUp)}
                    >▲</button>
                    <button
                        aria-label="Gauche"
                        disabled={dpadDisabled}
                        style={{ ...dpadButtonStyle, ...dpadLeftStyle, ...(dpadDisabled ? dpadDisabledStyle : null) }}
                        {...holdHandlers(onLeft)}
                    >◀</button>
                    <div style={dpadCenterStyle} />
                    <button
                        aria-label="Droite"
                        disabled={dpadDisabled}
                        style={{ ...dpadButtonStyle, ...dpadRightStyle, ...(dpadDisabled ? dpadDisabledStyle : null) }}
                        {...holdHandlers(onRight)}
                    >▶</button>
                    <button
                        aria-label="Bas"
                        disabled={dpadDisabled}
                        style={{ ...dpadButtonStyle, ...dpadDownStyle, ...(dpadDisabled ? dpadDisabledStyle : null) }}
                        {...holdHandlers(onDown)}
                    >▼</button>
                </div>

                {/* A/B droite — A en bas-droite, B en haut-gauche (diagonale GBC) */}
                <div style={abContainerStyle}>
                    <button
                        aria-label="Bouton B"
                        style={{ ...abButtonStyle, ...bButtonPositionStyle }}
                        onPointerDown={handlePress(onB)}
                    >B</button>
                    <button
                        aria-label="Bouton A"
                        style={{ ...abButtonStyle, ...aButtonPositionStyle }}
                        onPointerDown={handlePress(onA)}
                    >A</button>
                </div>
            </div>

            {/* START + SELECT centre-bas */}
            <div style={startSelectRowStyle}>
                <button
                    aria-label="Select"
                    style={startSelectButtonStyle}
                    onPointerDown={handlePress(onSelect)}
                >SELECT</button>
                <button
                    aria-label="Start"
                    style={startSelectButtonStyle}
                    onPointerDown={handlePress(onStart)}
                >START</button>
            </div>

            {/* Speaker grille décoratif bas-droite */}
            <div style={speakerStyle}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={speakerDotStyle} />
                ))}
            </div>
        </div>
        </div>
    )
}

// === STYLES ===

const shellStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    // Coque COMPACTE : écran large en haut, boutons juste en dessous (pas de
    // scroll, pas de grand vide). Hauteur = contenu naturel.
    boxSizing: "border-box",
    background: `linear-gradient(180deg, ${SHELL_YELLOW} 0%, ${SHELL_YELLOW_DARK} 100%)`,
    // Coins légèrement arrondis pour un rendu plus doux ; le bas-droite garde
    // son grand arrondi GBC signature (36px).
    borderRadius: "14px 14px 36px 14px",
    // Bas plus généreux (28px) → la zone des boutons respire, ratio plus proche
    // d'une vraie GBC où le bloc commandes occupe une bonne moitié de la coque.
    padding: "6px 8px 20px",
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
    borderRadius: "8px 8px 20px 8px",
    // Padding réduit (surtout les côtés) → l'écran prend quasi toute la largeur.
    // Le bas garde ~26px pour loger la rangée POWER + jauge de reps.
    padding: "8px 8px 26px",
    boxShadow: "inset 0 4px 8px rgba(0,0,0,0.4)",
    marginBottom: 18,
    position: "relative",
}

const screenFrameStyle: React.CSSProperties = {
    background: SCREEN_FRAME,
    borderRadius: 4,
    padding: 4,
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
    right: 18,
    bottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
}
const repsGaugeIconStyle: React.CSSProperties = { fontSize: 19, lineHeight: 1 }
const repsGaugeTrackStyle: React.CSSProperties = {
    width: 120,
    height: 16,
    background: "#2a1c10",
    border: "2px solid #1c1408",
    borderRadius: 8,
    overflow: "hidden",
}
const repsGaugeFillStyle: React.CSSProperties = {
    height: "100%",
    background: "linear-gradient(90deg,#ffe24a,#ff9500)",
    transition: "width 0.3s ease",
}
const repsGaugeNumStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffe24a",
    textShadow: "0 1px 1px #000",
    minWidth: 54,
    textAlign: "right",
}

const controlsRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 8px",
    marginBottom: 20,    // espace entre D-pad/A-B et la rangée START/SELECT
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

const dpadDisabledStyle: React.CSSProperties = {
    opacity: 0.4,
    cursor: "default",
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
    marginBottom: 18,
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
