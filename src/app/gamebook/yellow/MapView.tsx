"use client"

// Nexus II — rendu de la map courante en mode "caméra qui suit le joueur".
//
// Style visuel : Pokémon Or/Argent (GBC, Johto). Palette douce désaturée
// avec verts/bleus/beiges/bruns. Top-down strict, formes lisibles, contours
// nets, immédiatement déchiffrable. Pas de dégradés réalistes, pas de 3D,
// pas de blur. Le rendu doit ressembler à un background de route Johto.
//
// Comportement caméra Pokémon GBC :
//   - Viewport fixe de 10×9 tiles dans l'écran.
//   - Le joueur reste au centre du viewport, c'est la map qui scroll.
//   - Si on approche d'un bord (map plus grande que viewport), la caméra
//     se bloque pour ne pas révéler le néant.

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"
import type { YellowBuilding, YellowMapData } from "@/lib/gamebook/yellow/maps"
import type { TileType } from "@/lib/gamebook/mapEngine"
import DialogueBox from "./DialogueBox"

// === Palette Johto désaturée ===========================================

const COLOR_GRASS = "#9cbc6c"           // herbe : vert légèrement jauni
const COLOR_GRASS_DARK = "#6a8a44"      // ombre d'herbe (pour bordures)
const COLOR_PATH = "#d8c08c"            // chemin terre/sable beige
const COLOR_PATH_DARK = "#b89868"       // bord de chemin
const COLOR_TREE = "#3c6428"            // arbre vert foncé désaturé
const COLOR_TREE_HIGHLIGHT = "#5c8c44"  // touche claire de feuillage
const COLOR_WATER = "#6c90b8"           // eau bleu désat
const COLOR_FLOWER = "#e8c850"          // fleur jaune doux
const COLOR_FENCE = "#886848"           // barrière brun

// Intérieurs
const COLOR_FLOOR_WOOD = "#c89c64"
const COLOR_FLOOR_TILE = "#dcc8a4"
const COLOR_FLOOR_CHECKER = "#e0c898"
const COLOR_WALL = "#6c4828"             // mur intérieur brun foncé
const COLOR_DOORMAT = "#8c6440"          // tapis de sortie
const COLOR_ARENA_FLOOR = "#d8b878"

// Mobilier
const COLOR_COUNTER = "#a87c4c"
const COLOR_SHELF = "#6c4828"
const COLOR_TABLE = "#a87c4c"
const COLOR_SLOT = "#c84848"
const COLOR_ROULETTE = "#4858a8"
const COLOR_RUG = "#c87878"

// UI / texte
const COLOR_INK_DARK = "#2a1c10"         // contour foncé pour texte/sprite
const COLOR_INK_LIGHT = "#f4ecd4"        // halo clair derrière texte
const COLOR_VOID = "#1a1612"             // hors-map (void)

// Bâtiments — par type (Pokémon Gold style : toits colorés, murs cream)
const BUILDING_ROOF: Record<YellowBuilding["kind"], string> = {
    shop: "#c44848",       // rouge brique (= boutique style Pokémon)
    casino: "#bc8c2c",     // jaune orangé (jeux d'argent)
    infirmary: "#88a8c8",  // bleu pâle (centre Pokémon)
    arena: "#7c3c4c",      // bordeaux (dojo)
}
const BUILDING_ROOF_DARK: Record<YellowBuilding["kind"], string> = {
    shop: "#8c2c2c",
    casino: "#84601c",
    infirmary: "#5c7c98",
    arena: "#542030",
}
const BUILDING_WALL = "#e4d4ac"
const BUILDING_WALL_DARK = "#b8a078"
const BUILDING_DOOR = "#3c2818"
const BUILDING_WINDOW = "#88a8c8"

// === Constantes viewport ==============================================

const VIEWPORT_W = 10
const VIEWPORT_H = 9
const TILE_W_PCT = 100 / VIEWPORT_W
const TILE_H_PCT = 100 / VIEWPORT_H

function tileColor(tile: TileType): string {
    // Extérieur
    if (tile === "grass" || tile === "grassTall") return COLOR_GRASS
    if (tile === "path") return COLOR_PATH
    if (tile === "tree") return COLOR_TREE
    if (tile === "water" || tile === "waterShallow") return COLOR_WATER
    if (tile === "flowerY" || tile === "flowerR") return COLOR_FLOWER
    if (tile === "fence") return COLOR_FENCE
    if (tile === "sand") return COLOR_PATH
    // Intérieurs - murs
    if (tile === "wallH" || tile === "wallV" || tile === "wallCorner") return COLOR_WALL
    // Sols
    if (tile === "floorWood") return COLOR_FLOOR_WOOD
    if (tile === "floorTile") return COLOR_FLOOR_TILE
    if (tile === "floorChecker") return COLOR_FLOOR_CHECKER
    if (tile === "arenaFloor") return COLOR_ARENA_FLOOR
    // Porte de sortie
    if (tile === "doorMat") return COLOR_DOORMAT
    // Mobilier
    if (tile === "shopCounter") return COLOR_COUNTER
    if (tile === "shopShelf") return COLOR_SHELF
    if (tile === "table") return COLOR_TABLE
    if (tile === "slotMachine") return COLOR_SLOT
    if (tile === "rouletteWheel") return COLOR_ROULETTE
    if (tile === "rug") return COLOR_RUG
    return COLOR_GRASS
}

// Petits accents visuels pour densifier le pixel art sans surcharge
function tileAccent(tile: TileType): React.ReactNode {
    if (tile === "tree") {
        // 4 petits points clairs pour évoquer le feuillage
        return (
            <>
                <span style={accentDot(20, 20, COLOR_TREE_HIGHLIGHT)} />
                <span style={accentDot(70, 30, COLOR_TREE_HIGHLIGHT)} />
                <span style={accentDot(30, 70, COLOR_TREE_HIGHLIGHT)} />
                <span style={accentDot(65, 65, COLOR_TREE_HIGHLIGHT)} />
            </>
        )
    }
    if (tile === "flowerY") {
        return <span style={accentDot(50, 50, COLOR_INK_DARK, 26)} />
    }
    if (tile === "path") {
        return <span style={accentDot(50, 50, COLOR_PATH_DARK, 14)} />
    }
    return null
}

function accentDot(xPct: number, yPct: number, color: string, sizePct = 18): React.CSSProperties {
    return {
        position: "absolute",
        left: `${xPct - sizePct / 2}%`,
        top: `${yPct - sizePct / 2}%`,
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        background: color,
        borderRadius: "50%",
        pointerEvents: "none",
    }
}

// === Caméra ===========================================================

interface CameraOffset { x: number; y: number }

function computeCamera(playerX: number, playerY: number, map: YellowMapData): CameraOffset {
    let camX = playerX - (VIEWPORT_W - 1) / 2
    let camY = playerY - (VIEWPORT_H - 1) / 2

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

// === Composant principal ==============================================

export default function MapView() {
    const player = useGameStore((s) => s.player)
    const map = useGameStore((s) => s.map)

    const cam = computeCamera(player.posX, player.posY, map)
    const npcsOnMap = YELLOW_NPCS.filter((n) => n.mapId === player.mapId)
    const buildings = map.buildings ?? []

    const screenPos = (worldX: number, worldY: number, w = 1, h = 1) => ({
        left: `${(worldX - cam.x) * TILE_W_PCT}%`,
        top: `${(worldY - cam.y) * TILE_H_PCT}%`,
        width: `${w * TILE_W_PCT}%`,
        height: `${h * TILE_H_PCT}%`,
    })

    return (
        <div style={containerStyle}>
            <div style={viewportStyle}>
                {/* Tiles + accents pixel art */}
                {map.tiles.flatMap((row, y) =>
                    row.map((tile, x) => (
                        <div
                            key={`t-${x}-${y}`}
                            style={{
                                position: "absolute",
                                ...screenPos(x, y),
                                background: tileColor(tile),
                                overflow: "hidden",
                            }}
                        >
                            {tileAccent(tile)}
                        </div>
                    )),
                )}

                {/* Bâtiments (overlay) */}
                {buildings.map((b) => (
                    <BuildingSprite key={b.id} building={b} screenPos={screenPos} />
                ))}

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
                            color: COLOR_INK_DARK,
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
                        color: COLOR_INK_DARK,
                        fontWeight: "bold",
                        zIndex: 3,
                    }}
                >
                    {directionArrow(player.direction)}
                </div>
            </div>

            {/* HUD debug */}
            <div style={hudStyle}>
                {map.name} ({player.posX},{player.posY}) {player.direction.toUpperCase()}
            </div>

            {/* Overlay dialogue */}
            <DialogueBox />
        </div>
    )
}

// === Bâtiment : façade colorée Pokémon Gold style =====================

function BuildingSprite({
    building,
    screenPos,
}: {
    building: YellowBuilding
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    const roof = BUILDING_ROOF[building.kind]
    const roofDark = BUILDING_ROOF_DARK[building.kind]

    const cells: React.ReactNode[] = []
    for (let dy = 0; dy < building.h; dy++) {
        for (let dx = 0; dx < building.w; dx++) {
            const isRoofRow = dy === 0
            const isUnderRoof = dy === 1
            const isDoor = dx === building.doorX && dy === building.doorY
            const isWindow =
                !isDoor && !isRoofRow && !isUnderRoof &&
                (dx === 0 || dx === building.w - 1) && dy === 2

            let color: string
            if (isDoor) color = BUILDING_DOOR
            else if (isRoofRow) color = roof
            else if (isUnderRoof) color = roofDark      // ombre sous le toit
            else if (isWindow) color = BUILDING_WINDOW
            else color = BUILDING_WALL

            cells.push(
                <div
                    key={`${building.id}-${dx}-${dy}`}
                    style={{
                        position: "absolute",
                        ...screenPos(building.x + dx, building.y + dy),
                        background: color,
                        boxShadow: !isRoofRow && !isUnderRoof
                            ? `inset 0 0 0 1px ${BUILDING_WALL_DARK}`
                            : undefined,
                    }}
                />,
            )
        }
    }

    // Label au-dessus du bâtiment
    const labelStyle: React.CSSProperties = {
        position: "absolute",
        ...screenPos(building.x, building.y - 1, building.w, 1),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLOR_INK_DARK,
        fontFamily: "'Courier New', monospace",
        fontSize: "clamp(7px, 1.8dvw, 11px)",
        fontWeight: "bold",
        letterSpacing: 1,
        textShadow: `1px 0 ${COLOR_INK_LIGHT}, -1px 0 ${COLOR_INK_LIGHT}, 0 1px ${COLOR_INK_LIGHT}, 0 -1px ${COLOR_INK_LIGHT}`,
        zIndex: 4,
        pointerEvents: "none",
    }

    return (
        <>
            {cells}
            <div style={labelStyle}>{building.displayName}</div>
        </>
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
    position: "relative",
}

const viewportStyle: React.CSSProperties = {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: COLOR_VOID,
    imageRendering: "pixelated",
}

const hudStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1,
    color: COLOR_INK_DARK,
    background: COLOR_INK_LIGHT,
    opacity: 0.9,
    textAlign: "center",
    padding: "2px 4px",
    flexShrink: 0,
}

// COLOR_GRASS_DARK référencé pour usage futur (bordures de chemin etc)
void COLOR_GRASS_DARK
