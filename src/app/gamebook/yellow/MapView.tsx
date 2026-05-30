"use client"

// Nexus II — rendu de la map courante en mode "caméra qui suit le joueur".
//
// Comportement Pokémon GBC :
//   - Viewport fixe de 10×9 tiles dans l'écran (ratio GBC d'origine).
//   - Le joueur reste au centre du viewport, c'est la map qui scroll.
//   - Si on approche d'un bord (map plus grande que viewport), la caméra se
//     bloque pour ne pas révéler le néant. Le perso quitte alors le centre.
//   - Si la map est PLUS PETITE que le viewport (cas yellow_entrance 9×7
//     dans 10×9), on la centre une fois pour toutes — pas de scroll possible.
//
// Tiles, NPCs et joueur sont positionnés en absolute en pourcentage du
// viewport. Tout ce qui dépasse est clippé par overflow:hidden.

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"
import type { TileType, MapData } from "@/lib/gamebook/mapEngine"
import DialogueBox from "./DialogueBox"

// Palette GBC monochrome verte (4 shades)
const GBC_LIGHTEST = "#c4cfa1"
const GBC_DARK = "#306230"
const GBC_DARKEST = "#0f380f"

// Viewport GBC standard : 10×9 metatiles
const VIEWPORT_W = 10
const VIEWPORT_H = 9
const TILE_W_PCT = 100 / VIEWPORT_W            // 10%
const TILE_H_PCT = 100 / VIEWPORT_H            // ~11.11%

function tileColor(tile: TileType): string {
    if (tile === "wallH" || tile === "wallV" || tile === "wallCorner") return GBC_DARKEST
    if (tile === "floorTile" || tile === "floorWood" || tile === "floorChecker") return GBC_LIGHTEST
    if (tile === "doorMat") return GBC_DARK
    return GBC_LIGHTEST
}

interface CameraOffset { x: number; y: number }

function computeCamera(playerX: number, playerY: number, map: MapData): CameraOffset {
    // Idéal : le joueur au centre du viewport
    let camX = playerX - (VIEWPORT_W - 1) / 2
    let camY = playerY - (VIEWPORT_H - 1) / 2

    // Map plus petite que le viewport : on la centre, caméra figée
    if (map.width <= VIEWPORT_W) {
        camX = -(VIEWPORT_W - map.width) / 2
    } else {
        camX = Math.max(0, Math.min(map.width - VIEWPORT_W, camX))
    }
    if (map.height <= VIEWPORT_H) {
        camY = -(VIEWPORT_H - map.height) / 2
    } else {
        camY = Math.max(0, Math.min(map.height - VIEWPORT_H, camY))
    }

    return { x: camX, y: camY }
}

export default function MapView() {
    const player = useGameStore((s) => s.player)
    const map = useGameStore((s) => s.map)

    const cam = computeCamera(player.posX, player.posY, map)
    const npcsOnMap = YELLOW_NPCS.filter((n) => n.mapId === player.mapId)

    const screenPos = (worldX: number, worldY: number) => ({
        left: `${(worldX - cam.x) * TILE_W_PCT}%`,
        top: `${(worldY - cam.y) * TILE_H_PCT}%`,
        width: `${TILE_W_PCT}%`,
        height: `${TILE_H_PCT}%`,
    })

    return (
        <div style={containerStyle}>
            <div style={viewportStyle}>
                {/* Tiles */}
                {map.tiles.flatMap((row, y) =>
                    row.map((tile, x) => (
                        <div
                            key={`${x}-${y}`}
                            style={{
                                position: "absolute",
                                ...screenPos(x, y),
                                background: tileColor(tile),
                            }}
                        />
                    )),
                )}

                {/* NPCs */}
                {npcsOnMap.map((npc) => (
                    <div
                        key={npc.id}
                        style={{
                            position: "absolute",
                            ...screenPos(npc.initialX, npc.initialY),
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
                        position: "absolute",
                        ...screenPos(player.posX, player.posY),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(12px, 3dvw, 20px)",
                        color: GBC_DARKEST,
                        zIndex: 3,
                    }}
                >
                    {directionArrow(player.direction)}
                </div>
            </div>

            {/* HUD debug : retiré quand on aura un vrai HUD */}
            <div style={hudStyle}>
                {map.name} ({player.posX},{player.posY}) {player.direction.toUpperCase()}
                {" "}cam({cam.x.toFixed(1)},{cam.y.toFixed(1)})
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
    alignItems: "stretch",
    justifyContent: "stretch",
    position: "relative", // ancrage du DialogueBox
}

const viewportStyle: React.CSSProperties = {
    flex: 1,
    position: "relative",
    overflow: "hidden",            // ce qui sort du viewport disparaît (vrai effet caméra)
    background: GBC_DARKEST,        // void quand la map ne couvre pas tout le viewport
    imageRendering: "pixelated",
}

const hudStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1,
    color: GBC_DARKEST,
    background: GBC_LIGHTEST,
    opacity: 0.85,
    textAlign: "center",
    padding: "2px 4px",
    flexShrink: 0,
}
