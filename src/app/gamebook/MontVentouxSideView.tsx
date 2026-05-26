"use client"

// src/app/gamebook/MontVentouxSideView.tsx
//
// v3.34 — Refonte visuelle du Mont Pasta-Ventoux en vue de profil pseudo-3D.
// Override le rendu top-down de la grille pour les maps "mont_pasta_ventoux"
// uniquement. La logique de jeu (positions, mouvement, coûts) reste inchangée
// dans MapClient/mapEngine ; seul le rendu visuel est remplacé.
//
// Modèle visuel :
//   - Skybox haut (ciel bleu) → terre/roche bas (marron)
//   - Le joueur est centré verticalement dans le viewport (à ~60% de la hauteur)
//   - Le terrain "défile" : plus posY est petit, plus on est haut, plus de
//     montagnes lointaines visibles ; plus posY est grand, plus de roches.
//   - Sprite vélo 🚴 en profil avec animation oscillation au déplacement
//   - Éléments de décor (rochers, arbres, panneaux) positionnés selon leur Y
//     relatif au joueur. Effet parallax léger (les couches lointaines bougent
//     moins).
//   - Indicateur de progression % vers le sommet en bas à droite.

interface Props {
    posY: number          // 0..103 — 0 = sommet, 103 = pied
    mapHeight: number     // = 104 typiquement
    animStep: number      // index d'animation (oscillation pédalage)
    onBike: boolean       // affiche le vélo, sinon juste le marcheur
}

interface Decor {
    /** Y absolu sur la map (0 = sommet, 103 = pied). */
    mapY: number
    /** "left" = côté gauche, "right" = côté droit, "center" = sur le path. */
    side: "left" | "right" | "center"
    /** Distance d'éloignement perçue (1 = proche, 3 = lointain). Affecte la taille et l'opacité. */
    depth: 1 | 2 | 3
    emoji: string
    label?: string
}

// Décor distribué le long du Mont (mapY = 0 sommet ↓ 103 pied)
const DECOR: Decor[] = [
    // Sommet : nuages, neige
    { mapY: 2,  side: "left",  depth: 2, emoji: "☁️" },
    { mapY: 4,  side: "right", depth: 2, emoji: "☁️" },
    { mapY: 6,  side: "left",  depth: 3, emoji: "🏔️" },
    { mapY: 8,  side: "right", depth: 3, emoji: "⛰️" },
    { mapY: 10, side: "center", depth: 1, emoji: "🗻", label: "SOMMET PROCHE" },
    // Haut : sapins épars
    { mapY: 15, side: "left",  depth: 1, emoji: "🌲" },
    { mapY: 18, side: "right", depth: 2, emoji: "🌲" },
    { mapY: 22, side: "left",  depth: 1, emoji: "🪨" },
    { mapY: 26, side: "right", depth: 1, emoji: "🌲" },
    { mapY: 30, side: "left",  depth: 2, emoji: "🌲" },
    // Milieu : virages, panneaux
    { mapY: 35, side: "right", depth: 1, emoji: "⚠️", label: "VIRAGE" },
    { mapY: 40, side: "left",  depth: 1, emoji: "🌳" },
    { mapY: 44, side: "right", depth: 1, emoji: "🪨" },
    { mapY: 48, side: "left",  depth: 2, emoji: "🌳" },
    { mapY: 52, side: "center", depth: 1, emoji: "🚧", label: "MI-CHEMIN" },
    { mapY: 56, side: "right", depth: 1, emoji: "🌳" },
    { mapY: 60, side: "left",  depth: 1, emoji: "🪨" },
    // Bas : forêt dense
    { mapY: 65, side: "right", depth: 1, emoji: "🌳" },
    { mapY: 70, side: "left",  depth: 2, emoji: "🌳" },
    { mapY: 75, side: "right", depth: 1, emoji: "🌲" },
    { mapY: 80, side: "left",  depth: 1, emoji: "🌳" },
    { mapY: 85, side: "right", depth: 2, emoji: "🌲" },
    { mapY: 90, side: "left",  depth: 1, emoji: "🪨" },
    // Pied : départ
    { mapY: 96, side: "center", depth: 1, emoji: "🚲", label: "DÉPART" },
    { mapY: 100, side: "right", depth: 1, emoji: "🌳" },
]

/** Convertit la position Y absolue d'un décor en position visuelle (%)
 *  par rapport au joueur centré à 60% du viewport.
 *  posY = playerY → décor à 60% ; décor au-dessus du joueur (mapY < posY) → en haut. */
function getDecorTopPct(decorMapY: number, playerY: number): number {
    const delta = decorMapY - playerY  // positif = en bas, négatif = en haut
    // 1 case = ~3% du viewport (~33 cases visibles sur 100%)
    return 60 + delta * 3
}

function depthScale(depth: 1 | 2 | 3): number {
    return depth === 1 ? 1 : depth === 2 ? 0.7 : 0.5
}

function depthOpacity(depth: 1 | 2 | 3): number {
    return depth === 1 ? 1 : depth === 2 ? 0.7 : 0.45
}

export default function MontVentouxSideView({ posY, mapHeight, animStep, onBike }: Props) {
    const progressPct = Math.max(0, Math.min(100, ((mapHeight - 1 - posY) / (mapHeight - 1)) * 100))
    const bobY = animStep % 2 === 0 ? 0 : -3  // oscillation pédalage

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #87ceeb 0%, #b0d8e8 25%, #d8c890 55%, #a08850 80%, #604030 100%)",
                overflow: "hidden",
                fontFamily: "'Courier New', monospace",
            }}
        >
            {/* Pente diagonale en arrière-plan (effet "route qui monte à 45°") */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, transparent 0%, transparent 40%, rgba(160, 136, 80, 0.4) 40%, rgba(160, 136, 80, 0.4) 100%)",
                    pointerEvents: "none",
                }}
            />

            {/* Route centrale (la "piste" qui monte) */}
            <div
                style={{
                    position: "absolute",
                    left: "40%",
                    top: 0,
                    bottom: 0,
                    width: "20%",
                    background: "repeating-linear-gradient(180deg, #6a5030 0px, #6a5030 8px, #5a4020 8px, #5a4020 16px)",
                    borderLeft: "2px dashed #fff",
                    borderRight: "2px dashed #fff",
                    opacity: 0.85,
                }}
            />

            {/* Décor positionné selon Y joueur */}
            {DECOR.map((d, i) => {
                const topPct = getDecorTopPct(d.mapY, posY)
                if (topPct < -5 || topPct > 105) return null  // hors viewport
                const scale = depthScale(d.depth)
                const opacity = depthOpacity(d.depth)
                let leftPct: number
                if (d.side === "left") leftPct = 8 + (d.depth === 1 ? 0 : 8)   // plus loin = plus vers centre
                else if (d.side === "right") leftPct = 92 - (d.depth === 1 ? 0 : 8)
                else leftPct = 50

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            opacity,
                            fontSize: "24px",
                            pointerEvents: "none",
                            transition: "top 0.15s",
                            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                        }}
                    >
                        {d.emoji}
                        {d.label && d.depth === 1 && (
                            <div style={{
                                fontSize: "8px", color: "#fff", textAlign: "center",
                                background: "rgba(0,0,0,0.6)", padding: "1px 3px",
                                marginTop: 2, letterSpacing: 1, fontWeight: "bold",
                            }}>
                                {d.label}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Joueur centré (60% vertical) */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "60%",
                    transform: `translate(-50%, calc(-50% + ${bobY}px))`,
                    fontSize: "40px",
                    pointerEvents: "none",
                    filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.5))",
                    transition: "transform 0.1s",
                }}
            >
                {onBike ? "🚴" : "🚶"}
            </div>

            {/* Jauge de progression (sommet → pied) */}
            <div
                style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "rgba(0,0,0,0.7)",
                    padding: "6px 8px",
                    border: "1px solid #fff",
                    fontSize: 10,
                    color: "#fff",
                    letterSpacing: 1,
                }}
            >
                <div style={{ fontSize: 8, opacity: 0.7, marginBottom: 2 }}>SOMMET</div>
                <div style={{ fontSize: 14, fontWeight: "bold" }}>{progressPct.toFixed(0)}%</div>
            </div>

            {/* Indicateur position bas-droite : Y / total */}
            <div
                style={{
                    position: "absolute",
                    right: 8,
                    bottom: 8,
                    background: "rgba(0,0,0,0.7)",
                    padding: "4px 6px",
                    border: "1px solid #555",
                    fontSize: 9,
                    color: "#fff",
                    opacity: 0.8,
                }}
            >
                {mapHeight - posY} / {mapHeight}
            </div>
        </div>
    )
}
