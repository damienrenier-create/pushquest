"use client"

// Placeholder « CHIMÈRE » pour un fusionné SANS sprite dédié : au lieu du MissingNo (qui a l'air cassé), on montre
// les 2 sprites parents coupés en diagonale (A à gauche, B à droite) + une teinte aux couleurs des types fusionnés
// + une couture lumineuse + le nom + un liseré « génome instable ». 100 % client, déterministe, instantané, ZÉRO API.
// Fonctionne seul (aucune dépendance au pipeline de génération) → valeur même si tout le reste est désactivé.

import { useState } from "react"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"

// Deux demi-plans séparés par une diagonale (haut-droit → bas-gauche) : A = moitié gauche, B = moitié droite.
const CLIP_A = "polygon(0 0, 58% 0, 42% 100%, 0 100%)"
const CLIP_B = "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)"

function Half({ src, clip }: { src?: string; clip: string }) {
    const [err, setErr] = useState(false)
    if (!src || err) return null
    return (
        <img src={src} alt="" onError={() => setErr(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", clipPath: clip, WebkitClipPath: clip }} />
    )
}

/** Aperçu « génome instable » d'une fusion sans sprite définitif. `showName` masquable si le nom est déjà affiché à côté. */
export function ChimeraPlaceholder({ aSprite, bSprite, types, name, size = 66, showName = false }: {
    aSprite?: string
    bSprite?: string
    types: string[]
    name?: string
    size?: number
    showName?: boolean
}) {
    const cA = tc(types[0] ?? "NORMAL")
    const cB = tc(types[1] ?? types[0] ?? "NORMAL")
    return (
        <div style={{ position: "relative", width: size, height: size, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", border: `2px solid ${cA}`, boxShadow: `0 0 12px ${cA}55` }}>
            {/* Les 2 moitiés de parents */}
            <Half src={aSprite} clip={CLIP_A} />
            <Half src={bSprite} clip={CLIP_B} />
            {/* Teinte des types fusionnés (diagonale A→B) */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, ${cA}44 0%, ${cA}22 40%, ${cB}22 60%, ${cB}44 100%)`, mixBlendMode: "overlay" }} />
            {/* Couture lumineuse sur la diagonale */}
            <div style={{ position: "absolute", top: "-20%", left: "50%", width: 2, height: "140%", background: "linear-gradient(#fff0, #ffffffcc, #fff0)", transform: "translateX(-50%) rotate(18deg)", filter: "blur(0.6px)", opacity: 0.8 }} />
            {/* Liseré « génome instable » (pointillés qui pulsent) */}
            <div style={{ position: "absolute", inset: 2, borderRadius: 9, border: `1.5px dashed ${cB}cc`, animation: "chimeraPulse 1.8s ease-in-out infinite", pointerEvents: "none" }} />
            {/* Petit marqueur ADN */}
            <div style={{ position: "absolute", top: 2, right: 4, fontSize: Math.max(9, size * 0.16), opacity: 0.85, filter: "drop-shadow(0 1px 1px #000)" }}>🧬</div>
            {showName && name && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: Math.max(7, size * 0.12), fontWeight: 800, textAlign: "center", color: "#fff", background: "linear-gradient(#0000, #000000cc)", padding: "6px 2px 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            )}
            <style>{"@keyframes chimeraPulse{0%,100%{opacity:.45}50%{opacity:.95}}"}</style>
        </div>
    )
}
