"use client"

// Nexus II — viewer interactif des tilesets FireRed.
//
// Affiche les 6 tilesets téléchargés/colorisés à 6× la taille native, avec
// une grille rouge tous les 16 px (= 1 tile) + numéros de colonne en haut
// et numéros de ligne sur la gauche.
//
// Permet d'identifier précisément les coords (col, row) de chaque tile.

interface SheetMeta {
    name: string
    url: string
    w: number
    h: number
}

const TILE = 16          // taille native d'une tile
const SCALE = 6          // facteur de zoom pour visualisation
const TILE_DISPLAY = TILE * SCALE   // 96 px par tile à l'écran

const SHEETS: SheetMeta[] = [
    { name: "fr_outdoor", url: "/yellow/sprites/fr_outdoor_c.png", w: 128, h: 320 },
    { name: "fr_pokecenter (infirmerie)", url: "/yellow/sprites/fr_pokecenter_c.png", w: 128, h: 192 },
    { name: "fr_mart (shop)", url: "/yellow/sprites/fr_mart_c.png", w: 128, h: 24 },
    { name: "fr_casino", url: "/yellow/sprites/fr_casino_c.png", w: 128, h: 88 },
    { name: "fr_gym (arène)", url: "/yellow/sprites/fr_gym_c.png", w: 128, h: 48 },
    { name: "fr_building (façades diverses)", url: "/yellow/sprites/fr_building_c.png", w: 128, h: 320 },
]

export default function TilesViewerClient() {
    return (
        <main style={pageStyle}>
            <h1 style={{ color: "#fff", fontFamily: "monospace", margin: "0 0 16px" }}>
                TILESETS FIRERED — VIEWER
            </h1>
            <p style={{ color: "#ccc", fontFamily: "monospace", fontSize: 13, maxWidth: 700, lineHeight: 1.5 }}>
                Chaque tileset est affiché à <strong>6× la taille native</strong>.
                Grille rouge tous les 16 px = limites d&apos;une tile.
                Numéros en haut = <strong>colonne</strong> (0 = première à gauche).
                Numéros à gauche = <strong>ligne</strong> (0 = première en haut).
            </p>
            {SHEETS.map((s) => (
                <SheetView key={s.name} sheet={s} />
            ))}
        </main>
    )
}

function SheetView({ sheet }: { sheet: SheetMeta }) {
    const cols = sheet.w / TILE
    const rows = sheet.h / TILE
    return (
        <section style={{ marginBottom: 48 }}>
            <h2 style={{ color: "#fff", fontFamily: "monospace", fontSize: 16, marginBottom: 8 }}>
                {sheet.name} <span style={{ color: "#888", fontSize: 13 }}>({sheet.w}×{sheet.h}px = {cols}×{rows} tiles)</span>
            </h2>
            <div style={{
                position: "relative",
                width: sheet.w * SCALE + 24,
                paddingLeft: 24,
                paddingTop: 20,
            }}>
                {/* numéros de colonne en haut */}
                {Array.from({ length: cols }).map((_, c) => (
                    <span key={`col-${c}`} style={{
                        position: "absolute",
                        left: 24 + c * TILE_DISPLAY + TILE_DISPLAY / 2,
                        top: 0,
                        transform: "translateX(-50%)",
                        color: "#ff6",
                        fontFamily: "monospace",
                        fontSize: 14,
                        fontWeight: "bold",
                    }}>{c}</span>
                ))}
                {/* numéros de ligne à gauche */}
                {Array.from({ length: rows }).map((_, r) => (
                    <span key={`row-${r}`} style={{
                        position: "absolute",
                        left: 0,
                        top: 20 + r * TILE_DISPLAY + TILE_DISPLAY / 2,
                        transform: "translateY(-50%)",
                        color: "#ff6",
                        fontFamily: "monospace",
                        fontSize: 14,
                        fontWeight: "bold",
                        width: 20,
                        textAlign: "right",
                    }}>{r}</span>
                ))}
                {/* image + grille */}
                <div style={{
                    position: "relative",
                    width: sheet.w * SCALE,
                    height: sheet.h * SCALE,
                    backgroundImage: `url(${sheet.url}?v=1)`,
                    backgroundSize: `${sheet.w * SCALE}px ${sheet.h * SCALE}px`,
                    backgroundRepeat: "no-repeat",
                    imageRendering: "pixelated",
                    backgroundColor: "#222",
                }}>
                    {/* grille verticale */}
                    {Array.from({ length: cols + 1 }).map((_, c) => (
                        <span key={`vg-${c}`} style={{
                            position: "absolute",
                            left: c * TILE_DISPLAY,
                            top: 0,
                            width: 1,
                            height: sheet.h * SCALE,
                            background: "rgba(255,40,40,0.7)",
                            pointerEvents: "none",
                        }} />
                    ))}
                    {/* grille horizontale */}
                    {Array.from({ length: rows + 1 }).map((_, r) => (
                        <span key={`hg-${r}`} style={{
                            position: "absolute",
                            left: 0,
                            top: r * TILE_DISPLAY,
                            width: sheet.w * SCALE,
                            height: 1,
                            background: "rgba(255,40,40,0.7)",
                            pointerEvents: "none",
                        }} />
                    ))}
                </div>
            </div>
        </section>
    )
}

const pageStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#111",
    color: "#fff",
    padding: "24px",
    fontFamily: "monospace",
}
