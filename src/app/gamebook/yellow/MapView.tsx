"use client"

// Nexus II — rendu de la map courante + sprite du joueur + NPCs.
//
// Lit le state du store Zustand. Pure projection : aucune logique métier ici,
// uniquement du rendu. Le re-render se déclenche UNIQUEMENT quand player ou
// map changent (selector ciblé).
//
// Palette GBC originale 4 nuances de vert pour le look authentique.

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"
import type { TileType } from "@/lib/gamebook/mapEngine"
import DialogueBox from "./DialogueBox"

// Palette GBC monochrome verte (4 shades)
const GBC_LIGHTEST = "#c4cfa1"
const GBC_LIGHT = "#8bac0f"
const GBC_DARK = "#306230"
const GBC_DARKEST = "#0f380f"

function tileColor(tile: TileType): string {
    if (tile === "wallH" || tile === "wallV" || tile === "wallCorner") return GBC_DARKEST
    if (tile === "floorTile" || tile === "floorWood" || tile === "floorChecker") return GBC_LIGHTEST
    if (tile === "doorMat") return GBC_DARK
    // Défaut : floor
    return GBC_LIGHTEST
}

export default function MapView() {
    const player = useGameStore((s) => s.player)
    const map = useGameStore((s) => s.map)

    const npcsOnMap = YELLOW_NPCS.filter((n) => n.mapId === player.mapId)

    return (
        <div style={containerStyle}>
            <div
                style={{
                    ...gridStyle,
                    gridTemplateColumns: `repeat(${map.width}, 1fr)`,
                    gridTemplateRows: `repeat(${map.height}, 1fr)`,
                    aspectRatio: `${map.width} / ${map.height}`,
                }}
            >
                {/* Tiles */}
                {map.tiles.flatMap((row, y) =>
                    row.map((tile, x) => (
                        <div
                            key={`${x}-${y}`}
                            style={{
                                background: tileColor(tile),
                                gridColumn: x + 1,
                                gridRow: y + 1,
                            }}
                        />
                    )),
                )}

                {/* NPCs */}
                {npcsOnMap.map((npc) => (
                    <div
                        key={npc.id}
                        style={{
                            gridColumn: npc.initialX + 1,
                            gridRow: npc.initialY + 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "clamp(10px, 2.5dvw, 18px)",
                            color: GBC_DARKEST,
                            zIndex: 2,
                        }}
                        title={npc.name}
                    >
                        {npc.sprite.emoji ?? "❓"}
                    </div>
                ))}

                {/* Player sprite */}
                <div
                    style={{
                        gridColumn: player.posX + 1,
                        gridRow: player.posY + 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(12px, 3dvw, 20px)",
                        color: GBC_DARKEST,
                        zIndex: 3,
                        position: "relative",
                    }}
                >
                    {directionArrow(player.direction)}
                </div>
            </div>

            {/* HUD de debug (sera retiré quand on aura un vrai HUD) */}
            <div style={hudStyle}>
                {map.name} ({player.posX},{player.posY}) {player.direction.toUpperCase()}
            </div>

            {/* Overlay dialogue (s'affiche seulement si store.dialogue !== null) */}
            <DialogueBox />
        </div>
    )
}

function directionArrow(dir: string): string {
    switch (dir) {
        case "up": return "▲"
        case "down": return "▼"
        case "left": return "◀"
        case "right": return "▶"
        default: return "●"
    }
}

const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    gap: 4,
    position: "relative", // ancrage pour le DialogueBox en position absolute
}

const gridStyle: React.CSSProperties = {
    display: "grid",
    width: "100%",
    maxHeight: "calc(100% - 16px)",
    gap: 0,
    imageRendering: "pixelated",
}

const hudStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1,
    color: GBC_DARKEST,
    opacity: 0.7,
    textAlign: "center",
    padding: "2px 4px",
}
