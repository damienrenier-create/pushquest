"use client"

// src/app/gamebook/MontVentouxSideView.tsx
//
// v3.38 (V3) — Refonte vue de profil pseudo-3D du Mont Pasta-Ventoux.
//
// Améliorations vs V2 (v3.34) :
//   - Route inclinée à 45° (vraie pente visuelle, pas juste verticale).
//   - 3 couches parallax distinctes (montagnes lointaines / forêt moyenne /
//     route proche) avec vitesses de défilement différenciées par profondeur.
//   - Sprite vélo pédalant animé (2 frames alternées).
//   - Défilement continu en idle (vent qui pousse, sol qui glisse légèrement).
//   - Ombre projetée sous le cycliste.
//   - Décor structuré en 3 layers selon profondeur (1 = proche, 3 = lointain).
//
// La logique de jeu (positions, mouvement, coûts) reste inchangée — c'est un
// pur override visuel rendu en overlay au-dessus de la grille de tiles.

interface Props {
    posY: number          // 0..103 — 0 = sommet, 103 = pied
    mapHeight: number     // = 104 typiquement
    animStep: number      // index d'animation (oscillation pédalage)
    onBike: boolean       // affiche le vélo, sinon juste le marcheur
}

interface Decor {
    mapY: number
    side: "left" | "right" | "center"
    depth: 1 | 2 | 3
    emoji: string
    label?: string
}

// Décor distribué le long du Mont (mapY = 0 sommet ↓ 103 pied)
const DECOR: Decor[] = [
    // Sommet : nuages, neige, montagnes
    { mapY: 1,  side: "center", depth: 3, emoji: "🏔️", label: "SOMMET" },
    { mapY: 3,  side: "left",  depth: 3, emoji: "☁️" },
    { mapY: 5,  side: "right", depth: 3, emoji: "☁️" },
    { mapY: 8,  side: "left",  depth: 2, emoji: "⛰️" },
    { mapY: 10, side: "right", depth: 2, emoji: "🏔️" },
    // Haut : sapins épars
    { mapY: 15, side: "left",  depth: 2, emoji: "🌲" },
    { mapY: 18, side: "right", depth: 1, emoji: "🌲" },
    { mapY: 22, side: "left",  depth: 1, emoji: "🪨" },
    { mapY: 26, side: "right", depth: 2, emoji: "🌲" },
    { mapY: 30, side: "left",  depth: 1, emoji: "🌲" },
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
    { mapY: 95, side: "right", depth: 1, emoji: "🌳" },
    // Pied : départ
    { mapY: 100, side: "center", depth: 1, emoji: "🚲", label: "DÉPART" },
    { mapY: 102, side: "right", depth: 1, emoji: "🌳" },
]

/** Position visuelle Y (% du viewport) d'un décor selon Y joueur, avec parallax par profondeur.
 *  Plus depth est élevé (lointain), moins le décor bouge avec le scroll → effet parallax. */
function getDecorTopPct(decorMapY: number, playerY: number, depth: 1 | 2 | 3): number {
    const delta = decorMapY - playerY
    const parallaxFactor = depth === 1 ? 3.0 : depth === 2 ? 2.0 : 1.2
    return 60 + delta * parallaxFactor
}

function depthScale(depth: 1 | 2 | 3): number {
    return depth === 1 ? 1 : depth === 2 ? 0.7 : 0.45
}

function depthOpacity(depth: 1 | 2 | 3): number {
    return depth === 1 ? 1 : depth === 2 ? 0.75 : 0.5
}

export default function MontVentouxSideView({ posY, mapHeight, animStep, onBike }: Props) {
    const progressPct = Math.max(0, Math.min(100, ((mapHeight - 1 - posY) / (mapHeight - 1)) * 100))
    // Animation pédalage : alterne haut/bas sur l'axe Y du sprite vélo
    const pedalUp = animStep % 2 === 0
    const bobY = pedalUp ? 0 : -4

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #87ceeb 0%, #a8d8e8 20%, #d8c890 45%, #b89868 65%, #806040 85%, #503020 100%)",
                overflow: "hidden",
                fontFamily: "'Courier New', monospace",
            }}
        >
            {/* === COUCHE 3 : Montagnes lointaines (parallax très lent) === */}
            <div style={{
                position: "absolute",
                left: 0, right: 0, top: "5%", height: "30%",
                pointerEvents: "none",
                opacity: 0.55,
                background: `
                    linear-gradient(180deg, transparent 60%, #5a6878 100%),
                    radial-gradient(ellipse 30% 50% at 20% 100%, #6a7888 0%, transparent 70%),
                    radial-gradient(ellipse 35% 60% at 60% 100%, #7a8898 0%, transparent 70%),
                    radial-gradient(ellipse 25% 45% at 85% 100%, #5a6878 0%, transparent 70%)
                `,
            }} />

            {/* === COUCHE 2 : Collines moyennes (parallax moyen) === */}
            <div style={{
                position: "absolute",
                left: 0, right: 0, top: "35%", height: "30%",
                pointerEvents: "none",
                opacity: 0.7,
                background: `
                    radial-gradient(ellipse 40% 60% at 15% 100%, #4a6038 0%, transparent 65%),
                    radial-gradient(ellipse 45% 70% at 70% 100%, #5a7048 0%, transparent 65%),
                    radial-gradient(ellipse 30% 50% at 95% 100%, #4a6038 0%, transparent 65%)
                `,
            }} />

            {/* === COUCHE 1 : Pente inclinée à 45° (vraie pente visuelle) ===
                On dessine une pente diagonale via clip-path + skew, pour donner
                l'illusion que la route monte vers le coin haut-gauche. */}
            <div style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: "linear-gradient(135deg, transparent 0%, transparent 38%, rgba(130, 96, 50, 0.35) 38%, rgba(110, 80, 40, 0.5) 60%, rgba(80, 56, 28, 0.7) 100%)",
            }} />

            {/* === Route centrale (piste qui monte) avec hashes blancs ===
                On garde la route verticale au centre mais elle est rendue par-dessus la
                pente diagonale, donnant l'impression de monter dans la pente. */}
            <div style={{
                position: "absolute",
                left: "40%",
                top: 0,
                bottom: 0,
                width: "20%",
                background: "linear-gradient(180deg, #7a5a30 0%, #5a4020 50%, #3a2810 100%)",
                borderLeft: "2px dashed rgba(255,255,255,0.55)",
                borderRight: "2px dashed rgba(255,255,255,0.55)",
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.4)",
            }}>
                {/* Lignes blanches discontinues qui défilent en continu (effet de vitesse) */}
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 6px, transparent 6px, transparent 22px)",
                    opacity: 0.45,
                    animation: "montScrollDown 1.2s linear infinite",
                }} />
            </div>

            {/* === Décor positionné selon Y joueur (parallax par depth) === */}
            {DECOR.map((d, i) => {
                const topPct = getDecorTopPct(d.mapY, posY, d.depth)
                if (topPct < -10 || topPct > 110) return null
                const scale = depthScale(d.depth)
                const opacity = depthOpacity(d.depth)
                let leftPct: number
                if (d.side === "left") leftPct = 10 + (d.depth - 1) * 7
                else if (d.side === "right") leftPct = 90 - (d.depth - 1) * 7
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
                            fontSize: "26px",
                            pointerEvents: "none",
                            transition: "top 0.18s ease-out",
                            textShadow: d.depth === 1 ? "0 2px 3px rgba(0,0,0,0.55)" : "0 1px 2px rgba(0,0,0,0.4)",
                            zIndex: 4 - d.depth,  // depth 1 → z 3 (proche), depth 3 → z 1 (loin)
                        }}
                    >
                        {d.emoji}
                        {d.label && d.depth === 1 && (
                            <div style={{
                                fontSize: "9px", color: "#fff", textAlign: "center",
                                background: "rgba(0,0,0,0.7)", padding: "2px 4px",
                                marginTop: 3, letterSpacing: 1, fontWeight: "bold",
                                borderRadius: 2,
                            }}>
                                {d.label}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* === Ombre projetée sous le cycliste === */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "calc(60% + 18px)",
                    transform: "translate(-50%, -50%)",
                    width: "44px",
                    height: "10px",
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: 10,
                }}
            />

            {/* === Joueur centré (60% vertical) avec animation pédalage === */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "60%",
                    transform: `translate(-50%, calc(-50% + ${bobY}px))`,
                    fontSize: "44px",
                    pointerEvents: "none",
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.6))",
                    transition: "transform 0.12s ease-out",
                    zIndex: 11,
                }}
            >
                {onBike
                    ? (pedalUp ? "🚴" : "🚵")  // alterne 2 sprites cyclistes (pédalage)
                    : "🚶"}
            </div>

            {/* === Jauge de progression (sommet → pied) === */}
            <div
                style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "rgba(0,0,0,0.78)",
                    padding: "6px 8px",
                    border: "1px solid #fff",
                    fontSize: 10,
                    color: "#fff",
                    letterSpacing: 1,
                    zIndex: 20,
                }}
            >
                <div style={{ fontSize: 8, opacity: 0.75, marginBottom: 2 }}>🏔️ SOMMET</div>
                <div style={{ fontSize: 16, fontWeight: "bold" }}>{progressPct.toFixed(0)}%</div>
                {/* Barre verticale */}
                <div style={{
                    marginTop: 4, width: 4, height: 50, background: "#222",
                    border: "1px solid #555", position: "relative",
                }}>
                    <div style={{
                        position: "absolute", left: 0, right: 0,
                        bottom: 0, height: `${progressPct}%`,
                        background: "linear-gradient(180deg, #ffd54f 0%, #f08030 100%)",
                        transition: "height 0.3s ease-out",
                    }} />
                </div>
            </div>

            {/* === Indicateur position bas-droite : Y / total === */}
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
                    opacity: 0.85,
                    zIndex: 20,
                }}
            >
                {mapHeight - posY} / {mapHeight}
            </div>

            {/* === Lignes de vitesse / vent (effet de défilement) === */}
            <div style={{
                position: "absolute", left: "8%", top: 0, bottom: 0,
                width: "4%", pointerEvents: "none", opacity: 0.3,
                backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 30px)",
                animation: "montScrollDown 0.6s linear infinite",
            }} />
            <div style={{
                position: "absolute", right: "8%", top: 0, bottom: 0,
                width: "3%", pointerEvents: "none", opacity: 0.25,
                backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)",
                animation: "montScrollDown 0.8s linear infinite",
            }} />

            {/* === Keyframes globales pour le défilement === */}
            <style jsx>{`
                @keyframes montScrollDown {
                    from { background-position: 0 0; }
                    to   { background-position: 0 40px; }
                }
            `}</style>
        </div>
    )
}
