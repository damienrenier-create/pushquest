"use client"

// Nexus II — rendu de la map courante en mode "caméra qui suit le joueur".
//
// Style visuel : Pokémon Or/Argent/Crystal (GBC, région Johto).
// Palette saturée + contours nets + pixel art. Trees ronds, buildings avec
// fenêtres jaunes lumineuses, chemins texturés, herbe avec micro-relief.
//
// Comportement caméra : viewport 10×9, joueur centré, scroll, lock aux bords.

import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"
import type { YellowBuilding, YellowMapData } from "@/lib/gamebook/yellow/maps"
import { type TileType, isBlockingTile } from "@/lib/gamebook/mapEngine"
import type { RemotePlayer } from "@/lib/gamebook/yellow/multiplayer/useCasinoPresence"
import DialogueBox from "./DialogueBox"

// === Palette Johto (saturée) ===========================================

const COLOR_GRASS = "#88b070"          // herbe Johto vert moyen
const COLOR_GRASS_DARK = "#608848"     // ombre / accent
const COLOR_GRASS_HL = "#a4c884"       // brins clairs
const COLOR_PATH = "#dcc088"           // sable / chemin
const COLOR_PATH_DARK = "#b89860"      // accent terre
const COLOR_TREE_DARK = "#2c4818"      // contour arbre
const COLOR_TREE = "#3c6420"           // canopée
const COLOR_TREE_HL = "#5c8c34"        // reflet feuillage
const COLOR_TREE_TRUNK = "#5c3818"     // tronc brun
const COLOR_WATER = "#5070c8"
const COLOR_FLOWER = "#f8d04c"
const COLOR_FLOWER_CORE = "#c84818"

// Intérieurs
const COLOR_FLOOR_WOOD = "#c89c64"
const COLOR_FLOOR_TILE = "#dcc8a4"
const COLOR_FLOOR_CHECKER = "#e0c898"
const COLOR_WALL_INT = "#5c3818"
const COLOR_DOORMAT = "#a86434"
const COLOR_ARENA_FLOOR = "#d8b878"

// Mobilier intérieur
const COLOR_COUNTER = "#a87c4c"
const COLOR_COUNTER_TOP = "#cc9c64"
const COLOR_SHELF = "#5c3818"
const COLOR_SHELF_HL = "#8c6840"
const COLOR_TABLE = "#a87c4c"
const COLOR_SLOT = "#c83830"
const COLOR_ROULETTE = "#3848a8"
const COLOR_RUG = "#c84860"
const COLOR_RUG_HL = "#e87478"

// UI / texte
const COLOR_INK_DARK = "#1c1408"
const COLOR_INK_LIGHT = "#f4ecd4"
const COLOR_VOID = "#0a0a14"

// Bâtiments par type — palette Pokémon Or/Argent
const BUILDING_ROOF: Record<YellowBuilding["kind"], string> = {
    shop: "#c83828",        // rouge vif marché
    casino: "#d89028",      // jaune-orange casino
    infirmary: "#5070c0",   // bleu centre Pokémon
    arena: "#8c2848",       // bordeaux dojo
}
const BUILDING_ROOF_DARK: Record<YellowBuilding["kind"], string> = {
    shop: "#8c1c1c",
    casino: "#a86818",
    infirmary: "#304878",
    arena: "#581830",
}
const BUILDING_ROOF_HL: Record<YellowBuilding["kind"], string> = {
    shop: "#e85c44",
    casino: "#f0b048",
    infirmary: "#7898d8",
    arena: "#b04860",
}
const BUILDING_WALL = "#e8d4a8"
const BUILDING_WALL_DARK = "#a88858"
const BUILDING_DOOR = "#3c2410"
const BUILDING_DOOR_HL = "#a87c4c"
const BUILDING_WINDOW = "#f0d440"        // fenêtre lumineuse jaune
const BUILDING_WINDOW_OUTLINE = "#5c3818"

// === Viewport ==========================================================

// v2 — Viewport 15×10 (FireRed natif) au lieu de 10×9 GBC. Avec ce ratio
// chaque tile est plus petite à l'écran → le perso paraît moins gros et on
// voit plus de monde d'un coup, comme dans le vrai FireRed.
const VIEWPORT_W = 15
const VIEWPORT_H = 10
const TILE_W_PCT = 100 / VIEWPORT_W
const TILE_H_PCT = 100 / VIEWPORT_H

// === Tile background ===================================================

function tileColor(tile: TileType): string {
    if (tile === "grass" || tile === "grassTall") return COLOR_GRASS
    if (tile === "path" || tile === "sand") return COLOR_PATH
    if (tile === "tree") return COLOR_GRASS
    if (tile === "water" || tile === "waterShallow") return COLOR_WATER
    if (tile === "flowerY" || tile === "flowerR") return COLOR_GRASS
    if (tile === "wallH" || tile === "wallV" || tile === "wallCorner") return COLOR_WALL_INT
    if (tile === "floorWood") return COLOR_FLOOR_WOOD
    if (tile === "floorTile") return COLOR_FLOOR_TILE
    if (tile === "floorChecker") return COLOR_FLOOR_CHECKER
    if (tile === "arenaFloor") return COLOR_ARENA_FLOOR
    if (tile === "doorMat") return COLOR_DOORMAT
    if (tile === "shopCounter") return COLOR_COUNTER
    if (tile === "shopShelf") return COLOR_SHELF
    if (tile === "table") return COLOR_TABLE
    if (tile === "slotMachine") return COLOR_SLOT
    if (tile === "rouletteWheel") return COLOR_ROULETTE
    if (tile === "rug") return COLOR_RUG
    return COLOR_GRASS
}

// === Tile decoration (overlay pixel art) ===============================

function TileDeco({ tile }: { tile: TileType }) {
    if (tile === "tree") return <TreeSprite />
    if (tile === "flowerY") return <FlowerSprite />
    if (tile === "grass") return <GrassDots />
    if (tile === "path") return <PathSpeckles />
    if (tile === "shopCounter") return <CounterTop />
    if (tile === "shopShelf") return <ShelfBooks />
    if (tile === "slotMachine") return <SlotDisplay />
    if (tile === "rouletteWheel") return <RouletteDots />
    if (tile === "rug") return <RugStripes />
    if (tile === "table") return <TableEdge />
    if (tile === "doorMat") return <DoorMatEdge />
    return null
}

function TreeSprite() {
    // Tronc + canopée ronde + reflet de feuillage
    return (
        <>
            <span style={{
                position: "absolute",
                left: "42%", top: "70%", width: "16%", height: "28%",
                background: COLOR_TREE_TRUNK,
                pointerEvents: "none",
            }} />
            <span style={{
                position: "absolute",
                inset: "8% 8% 22% 8%",
                background: COLOR_TREE,
                borderRadius: "50%",
                boxShadow: `inset 0 -4px 0 ${COLOR_TREE_DARK}, inset 2px 2px 0 ${COLOR_TREE_HL}`,
                pointerEvents: "none",
            }} />
            <span style={{
                position: "absolute",
                left: "26%", top: "22%", width: "12%", height: "12%",
                background: COLOR_TREE_HL,
                borderRadius: "50%",
                pointerEvents: "none",
            }} />
        </>
    )
}

function FlowerSprite() {
    return (
        <>
            <span style={{
                position: "absolute",
                inset: "25%",
                background: COLOR_FLOWER,
                borderRadius: "50%",
                boxShadow: `inset 0 -2px 0 ${COLOR_PATH_DARK}`,
                pointerEvents: "none",
            }} />
            <span style={{
                position: "absolute",
                left: "42%", top: "42%", width: "16%", height: "16%",
                background: COLOR_FLOWER_CORE,
                borderRadius: "50%",
                pointerEvents: "none",
            }} />
        </>
    )
}

function GrassDots() {
    return (
        <>
            <span style={dotStyle(25, 35, COLOR_GRASS_HL, 10)} />
            <span style={dotStyle(75, 65, COLOR_GRASS_DARK, 10)} />
            <span style={dotStyle(60, 25, COLOR_GRASS_HL, 8)} />
            <span style={dotStyle(35, 75, COLOR_GRASS_DARK, 8)} />
        </>
    )
}

function PathSpeckles() {
    return (
        <>
            <span style={dotStyle(30, 30, COLOR_PATH_DARK, 14)} />
            <span style={dotStyle(70, 65, COLOR_PATH_DARK, 12)} />
            <span style={dotStyle(50, 50, COLOR_PATH_DARK, 8)} />
        </>
    )
}

function CounterTop() {
    return <span style={{
        position: "absolute",
        left: 0, right: 0, top: 0, height: "30%",
        background: COLOR_COUNTER_TOP,
        pointerEvents: "none",
    }} />
}

function ShelfBooks() {
    return (
        <>
            {[10, 28, 46, 64, 82].map((left, i) => (
                <span key={i} style={{
                    position: "absolute",
                    left: `${left}%`, top: "15%", width: "12%", height: "65%",
                    background: i % 2 === 0 ? "#c84048" : "#3868c8",
                    boxShadow: `inset 0 0 0 1px ${COLOR_SHELF_HL}`,
                    pointerEvents: "none",
                }} />
            ))}
        </>
    )
}

function SlotDisplay() {
    return (
        <>
            <span style={{
                position: "absolute",
                left: "15%", right: "15%", top: "20%", height: "30%",
                background: COLOR_INK_LIGHT,
                boxShadow: `inset 0 0 0 2px ${COLOR_INK_DARK}`,
                pointerEvents: "none",
            }} />
            <span style={{
                position: "absolute",
                left: "30%", right: "30%", bottom: "15%", height: "20%",
                background: "#f0d440",
                pointerEvents: "none",
            }} />
        </>
    )
}

function RouletteDots() {
    return (
        <>
            <span style={dotStyle(50, 50, COLOR_INK_LIGHT, 50)} />
            <span style={dotStyle(50, 50, COLOR_ROULETTE, 30)} />
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                const rad = (angle * Math.PI) / 180
                const x = 50 + 22 * Math.cos(rad)
                const y = 50 + 22 * Math.sin(rad)
                return (
                    <span key={i} style={dotStyle(x, y, i % 2 ? "#c83830" : "#1c1408", 10)} />
                )
            })}
        </>
    )
}

function RugStripes() {
    return (
        <>
            <span style={{
                position: "absolute",
                inset: "10%",
                background: `repeating-linear-gradient(45deg, ${COLOR_RUG} 0 8px, ${COLOR_RUG_HL} 8px 14px)`,
                pointerEvents: "none",
            }} />
        </>
    )
}

function TableEdge() {
    return <span style={{
        position: "absolute",
        inset: "20%",
        background: COLOR_COUNTER_TOP,
        boxShadow: `inset 0 0 0 2px ${COLOR_INK_DARK}`,
        pointerEvents: "none",
    }} />
}

function DoorMatEdge() {
    return <span style={{
        position: "absolute",
        inset: "15% 8%",
        background: `repeating-linear-gradient(90deg, ${COLOR_DOORMAT} 0 4px, ${COLOR_PATH_DARK} 4px 8px)`,
        pointerEvents: "none",
    }} />
}

// Pick déterministe d'une variante (0..count-1) pour les tiles "grass" d'une map
// avec groundSheet. Hash simple multiplicatif → la même (col, row) donne toujours
// la même variante donc le pattern est stable entre rafraîchissements.
function pickGroundVariant(col: number, row: number, count: number): number {
    if (count <= 1) return 0
    const h = ((col * 73856093) ^ (row * 19349663)) >>> 0
    return h % count
}

function dotStyle(xPct: number, yPct: number, color: string, sizePct = 12): React.CSSProperties {
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

export default function MapView({ remotePlayers = [] }: { remotePlayers?: RemotePlayer[] }) {
    const player = useGameStore((s) => s.player)
    const map = useGameStore((s) => s.map)

    const cam = computeCamera(player.posX, player.posY, map)
    const npcsOnMap = YELLOW_NPCS.filter((n) => n.mapId === player.mapId)
    const buildings = map.buildings ?? []
    // DEBUG : grille de coordonnées (vert = walkable, rouge = bloqué). Activer via ?grid=1.
    const showGrid = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("grid")

    const screenPos = (worldX: number, worldY: number, w = 1, h = 1) => ({
        left: `${(worldX - cam.x) * TILE_W_PCT}%`,
        top: `${(worldY - cam.y) * TILE_H_PCT}%`,
        width: `${w * TILE_W_PCT}%`,
        height: `${h * TILE_H_PCT}%`,
    })

    // Si la map a un backgroundImage défini, on rend l'image entière à la place
    // des tiles CSS individuelles (cas Viridian City pré-assemblée).
    const hasBgImage = !!map.backgroundImage && !!map.backgroundImageWidth && !!map.backgroundImageHeight

    return (
        <div style={containerStyle}>
            <div style={viewportStyle}>
                {hasBgImage && (() => {
                    const tileSize = map.backgroundImageTileSize ?? 16
                    const imageTilesW = (map.backgroundImageWidth ?? 0) / tileSize
                    const imageTilesH = (map.backgroundImageHeight ?? 0) / tileSize
                    const bgSizeX = (imageTilesW / map.width) * 100
                    const bgSizeY = (imageTilesH / map.height) * 100
                    // Origin = pixel image qui correspond à la case (0,0) de la map → permet
                    // de cropper headers/bordures Spriters Resource.
                    const originXTiles = (map.backgroundImageOriginX ?? 0) / tileSize
                    const originYTiles = (map.backgroundImageOriginY ?? 0) / tileSize
                    const overflowXTiles = imageTilesW - map.width
                    const overflowYTiles = imageTilesH - map.height
                    const bgPosX = overflowXTiles > 0 ? (originXTiles / overflowXTiles) * 100 : 0
                    const bgPosY = overflowYTiles > 0 ? (originYTiles / overflowYTiles) * 100 : 0
                    return (
                        <div style={{
                            position: "absolute",
                            ...screenPos(0, 0, map.width, map.height),
                            backgroundImage: `url(${map.backgroundImage}?v=2)`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
                            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                            imageRendering: "pixelated",
                            zIndex: 0,
                            pointerEvents: "none",
                        }} />
                    )
                })()}

                {/* DEBUG : grille de coordonnées + walkable/bloqué (URL ?grid=1). */}
                {showGrid && map.tiles.flatMap((row, y) =>
                    row.map((tile, x) => (
                        <div
                            key={`grid-${x}-${y}`}
                            style={{
                                position: "absolute",
                                ...screenPos(x, y),
                                boxSizing: "border-box",
                                border: "1px solid rgba(255,255,255,0.35)",
                                background: isBlockingTile(tile) ? "rgba(220,40,40,0.40)" : "rgba(40,200,80,0.22)",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                lineHeight: 1,
                                padding: 1,
                                zIndex: 50,
                                pointerEvents: "none",
                                textShadow: "0 0 2px #000, 0 0 3px #000",
                                fontFamily: "monospace",
                            }}
                        >
                            {x},{y}
                        </div>
                    )),
                )}

                {!hasBgImage && map.tiles.flatMap((row, y) =>
                    row.map((tile, x) => {
                        // Tile grassTall + tallGrassUrl → tuile unique haute herbe
                        if (tile === "grassTall" && map.tallGrassUrl) {
                            return (
                                <div
                                    key={`t-${x}-${y}`}
                                    style={{
                                        position: "absolute",
                                        ...screenPos(x, y),
                                        width: `calc(${TILE_W_PCT}% + 1px)`,
                                        height: `calc(${TILE_H_PCT}% + 1px)`,
                                        backgroundColor: tileColor(tile),
                                        backgroundImage: `url(${map.tallGrassUrl}?v=1)`,
                                        backgroundRepeat: "no-repeat",
                                        backgroundSize: "100% 100%",
                                        imageRendering: "pixelated",
                                        overflow: "hidden",
                                    }}
                                />
                            )
                        }
                        // Tile grass + groundSheet → sprite random
                        const tileSheet = (tile === "grass" && map.groundSheet)
                            ? map.groundSheet
                            : null
                        if (tileSheet) {
                            const idx = pickGroundVariant(x, y, tileSheet.count)
                            const sheetW = tileSheet.count * tileSheet.tileSize + (tileSheet.count - 1) * tileSheet.gap
                            const bgSizeXPct = (sheetW / tileSheet.tileSize) * 100
                            const bgPosXPct = tileSheet.count > 1 ? (idx / (tileSheet.count - 1)) * 100 : 0
                            return (
                                <div
                                    key={`t-${x}-${y}`}
                                    style={{
                                        position: "absolute",
                                        ...screenPos(x, y),
                                        width: `calc(${TILE_W_PCT}% + 1px)`,
                                        height: `calc(${TILE_H_PCT}% + 1px)`,
                                        backgroundColor: tileColor(tile),
                                        backgroundImage: `url(${tileSheet.url}?v=1)`,
                                        backgroundRepeat: "no-repeat",
                                        backgroundSize: `${bgSizeXPct}% 100%`,
                                        backgroundPosition: `${bgPosXPct}% 0%`,
                                        imageRendering: "pixelated",
                                        overflow: "hidden",
                                    }}
                                />
                            )
                        }
                        return (
                            <div
                                key={`t-${x}-${y}`}
                                style={{
                                    position: "absolute",
                                    ...screenPos(x, y),
                                    width: `calc(${TILE_W_PCT}% + 1px)`,
                                    height: `calc(${TILE_H_PCT}% + 1px)`,
                                    background: tileColor(tile),
                                    overflow: "hidden",
                                }}
                            >
                                <TileDeco tile={tile} />
                            </div>
                        )
                    }),
                )}

                {/* Régions sprite (zones clonées au pixel près depuis Viridian, etc.) */}
                {map.spriteRegions?.map((r, i) => (
                    <div
                        key={`sr-${i}`}
                        style={{
                            position: "absolute",
                            ...screenPos(r.x, r.y, r.w, r.h),
                            // v4.y — +1px (comme les tuiles de base) pour recouvrir le débord de 1px
                            // des tuiles sous-jacentes → supprime la fine ligne bleue (eau) au scroll.
                            width: `calc(${r.w * TILE_W_PCT}% + 1px)`,
                            height: `calc(${r.h * TILE_H_PCT}% + 1px)`,
                            backgroundImage: `url(${r.url}?v=1)`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "100% 100%",
                            imageRendering: "pixelated",
                            zIndex: 1,
                            pointerEvents: "none",
                        }}
                    />
                ))}

                {!hasBgImage && buildings.map((b) => (
                    <BuildingSprite key={b.id} building={b} screenPos={screenPos} />
                ))}

                {npcsOnMap.map((npc) => (
                    <NpcSprite key={npc.id} npc={npc} screenPos={screenPos} />
                ))}

                {/* Avatars des autres joueurs (casino multijoueur) */}
                {remotePlayers.map((rp) => (
                    <RemotePlayerSprite key={rp.userId} rp={rp} screenPos={screenPos} />
                ))}

                <PlayerSprite player={player} screenPos={screenPos} />
            </div>

            <div style={hudStyle}>
                {map.name} ({player.posX},{player.posY}) {player.direction.toUpperCase()}
            </div>

            <DialogueBox />
        </div>
    )
}

// === NPCs : vrais sprites Crystal (frame 0 statique pour l'instant) =====

// frames > 1 : spritesheet vertical (frame 0). frames === 1 : portrait UNIQUE rendu
// entier, ancré au sol, débordant vers le haut (h = hauteur en nb de tuiles).
const NPC_SPRITES: Record<string, { url: string; frames: number; h?: number } | null> = {
    y_vendeur: { url: "/yellow/sprites/npc_clerk_color.png?v=3", frames: 6 },
    y_croupier: { url: "/yellow/sprites/kris_color.png?v=3", frames: 6 },
    y_medecin: { url: "/yellow/sprites/npc_nurse_color.png?v=3", frames: 3 },
    // Sbire = portrait de la Nymphe Nouille (image unique).
    y_sbire: { url: "/yellow/sprites/npc/noodle_nymph.png", frames: 1, h: 1.9 },
    // Arène Plante (carte SANS PNJ dessinés) : sprites ENTIERS sur les cases.
    y_arena_druide: { url: "/yellow/sprites/npc_druide.png", frames: 1, h: 2.4 },
    y_arena_g1: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g2: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g3: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g4: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
}

function NpcSprite({
    npc,
    screenPos,
}: {
    npc: { id: string; initialX: number; initialY: number; name: string; sprite: { emoji?: string } }
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    const sprite = NPC_SPRITES[npc.id]
    if (!sprite) {
        // PNJ "hotspot" invisible (emoji vide) : interaction sans sprite. Utilisé
        // pour les panneaux dont le visuel est déjà dans le décor de la map.
        if (!npc.sprite.emoji) return null
        // Fallback : emoji
        return (
            <div
                style={{
                    position: "absolute",
                    ...screenPos(npc.initialX, npc.initialY),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(12px, 3dvw, 20px)",
                    color: COLOR_INK_DARK,
                    zIndex: 2,
                    filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.4))",
                }}
                title={npc.name}
            >
                {npc.sprite.emoji ?? "❓"}
            </div>
        )
    }
    // Portrait UNIQUE (frames:1) : sprite ENTIER, taille ≥ joueur, pieds sur la
    // case, débordant vers le haut (jamais rogné par la tuile).
    if (sprite.frames === 1) {
        const h = sprite.h ?? 1.8
        return (
            <div
                style={{ position: "absolute", ...screenPos(npc.initialX, npc.initialY), zIndex: 4, overflow: "visible", pointerEvents: "none" }}
                title={npc.name}
            >
                <img
                    src={sprite.url}
                    alt={npc.name}
                    style={{
                        position: "absolute",
                        bottom: 0,            // pieds posés sur la case
                        left: "50%",
                        transform: "translateX(-50%)",
                        height: `${h * 100}%`, // hauteur en multiples de tuile (> joueur)
                        width: "auto",
                        maxWidth: "none",
                        imageRendering: "pixelated",
                        filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45))",
                    }}
                />
            </div>
        )
    }
    // Spritesheet vertical (PNJ marcheurs) : frame 0.
    return (
        <div
            style={{
                position: "absolute",
                ...screenPos(npc.initialX, npc.initialY),
                backgroundImage: `url(${sprite.url})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% auto",
                backgroundPosition: "0 0", // frame 0 (face down)
                imageRendering: "pixelated",
                zIndex: 2,
                pointerEvents: "none",
            }}
            title={npc.name}
        />
    )
}

// === Autres joueurs (casino multijoueur) ================================
// Avatar simple + pseudo au-dessus, glissement fluide entre tuiles. Couleur
// dérivée de l'userId pour distinguer les joueurs d'un coup d'œil.

function hashHue(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h % 360
}

function RemotePlayerSprite({
    rp,
    screenPos,
}: {
    rp: RemotePlayer
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    return (
        <div
            style={{
                position: "absolute",
                ...screenPos(rp.posX, rp.posY),
                zIndex: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "left 0.12s linear, top 0.12s linear",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    bottom: "100%",
                    whiteSpace: "nowrap",
                    fontSize: "clamp(7px, 1.6dvw, 10px)",
                    fontWeight: 700,
                    color: "#fff",
                    background: "rgba(28,20,8,0.8)",
                    border: "1px solid #000",
                    borderRadius: 3,
                    padding: "0 3px",
                    transform: "translateY(-2px)",
                    fontFamily: "'Courier New', monospace",
                }}
            >
                {rp.nickname}
            </div>
            <div
                style={{
                    width: "82%",
                    height: "82%",
                    borderRadius: "50%",
                    background: `hsl(${hashHue(rp.userId)} 60% 55%)`,
                    border: "2px solid #1c1408",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(10px, 2.6dvw, 16px)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
            >
                🧑
            </div>
        </div>
    )
}

// === Joueur : sprite Red (Pokémon FireRed/LeafGreen GBA) ================
//
// firered_player_t.png : 673×638 px, fond orange transparent.
// Cellules sprite RÉELLES : 16w × 19h (pas 32 ! j'avais surestimé).
// Layout par direction :
//   - DOWN  : y=55,  cellules à x=[8, 25, 42]
//   - UP    : y=88
//   - LEFT  : y=121
//   - RIGHT : y=154
//   Stride vertical : 33 px (19 sprite + 14 gap incluant séparateur blanc à y=74).
//
// Cellules par direction : 3 frames horizontales.
//   - Cellule 1 (x=8)  : jambe gauche en avant (step A)
//   - Cellule 2 (x=25) : pose idle (les 2 pieds au sol)
//   - Cellule 3 (x=42) : jambe droite en avant (step B)
//
// Animation marche : on alterne cellules 1 et 3 (les 2 vrais step frames) via
// stepFrame du store. Cellule 2 (idle) à câbler quand on aura un timer
// "currently moving vs stopped".
//
// Convention Pokémon : sprite déborde vers le HAUT du tile. Container = 1
// tile wide × (19/16 = 1.1875) tile tall, bottom collé sur le tile du joueur.

const SHEET_W = 673
const SHEET_H = 638
const SPRITE_W = 16
const SPRITE_H = 19
const SHEET_COLS = SHEET_W / SPRITE_W       // 42.0625
const SHEET_ROWS = SHEET_H / SPRITE_H       // 33.58
const SPRITE_ASPECT_RATIO = SPRITE_H / SPRITE_W   // 1.1875 (hauteur en tiles)

interface SpriteCell { x: number; y: number }

const FIRERED_PLAYER: Record<string, [SpriteCell, SpriteCell]> = {
    down:  [{ x: 8,  y: 55  }, { x: 42, y: 55  }],
    up:    [{ x: 8,  y: 88  }, { x: 42, y: 88  }],
    left:  [{ x: 8,  y: 121 }, { x: 42, y: 121 }],
    right: [{ x: 8,  y: 154 }, { x: 42, y: 154 }],
}

function sheetBgPosition(cell: SpriteCell): string {
    const posX = (cell.x / SPRITE_W) / (SHEET_COLS - 1) * 100
    const posY = (cell.y / SPRITE_H) / (SHEET_ROWS - 1) * 100
    return `${posX}% ${posY}%`
}

function PlayerSprite({
    player,
    screenPos,
}: {
    player: { posX: number; posY: number; direction: string }
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    const stepFrame = useGameStore((s) => s.stepFrame)
    const cells = FIRERED_PLAYER[player.direction] ?? FIRERED_PLAYER.down
    const cell = cells[stepFrame]

    // Container 1 tile wide × 1.1875 tile tall, top à (posY - 0.1875)
    // pour que le bas s'aligne avec le bas du tile du joueur (les pieds).
    const topOffset = SPRITE_ASPECT_RATIO - 1   // 0.1875

    return (
        <div style={{
            position: "absolute",
            ...screenPos(player.posX, player.posY - topOffset, 1, SPRITE_ASPECT_RATIO),
            backgroundImage: "url(/yellow/sprites/firered_player_t.png?v=3)",
            backgroundRepeat: "no-repeat",
            backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
            backgroundPosition: sheetBgPosition(cell),
            imageRendering: "pixelated",
            zIndex: 3,
            pointerEvents: "none",
        }} />
    )
}

// === Bâtiment : façade Pokémon Or/Argent avec fenêtres ================

function BuildingSprite({
    building,
    screenPos,
}: {
    building: YellowBuilding
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    const roof = BUILDING_ROOF[building.kind]
    const roofDark = BUILDING_ROOF_DARK[building.kind]
    const roofHl = BUILDING_ROOF_HL[building.kind]

    const cells: React.ReactNode[] = []
    for (let dy = 0; dy < building.h; dy++) {
        for (let dx = 0; dx < building.w; dx++) {
            const isRoofRow = dy === 0
            const isUnderRoof = dy === 1 // bande d'ombre sous le toit
            const isDoor = dx === building.doorX && dy === building.doorY
            const isWindow =
                !isDoor && !isRoofRow && !isUnderRoof &&
                (dx === 0 || dx === building.w - 1) && dy === building.h - 2

            cells.push(
                <div
                    key={`${building.id}-${dx}-${dy}`}
                    style={{
                        position: "absolute",
                        ...screenPos(building.x + dx, building.y + dy),
                        // +1px overlap pour masquer les gaps subpixel CSS
                        width: `calc(${TILE_W_PCT}% + 1px)`,
                        height: `calc(${TILE_H_PCT}% + 1px)`,
                        background: isRoofRow
                            ? roof
                            : isUnderRoof
                                ? roofDark
                                : BUILDING_WALL,
                        overflow: "hidden",
                    }}
                >
                    {isRoofRow && <RoofTile color={roofHl} />}
                    {!isRoofRow && !isUnderRoof && !isDoor && !isWindow && (
                        <span style={{
                            position: "absolute",
                            inset: 0,
                            boxShadow: `inset 0 0 0 1px ${BUILDING_WALL_DARK}`,
                        }} />
                    )}
                    {isDoor && <DoorTile />}
                    {isWindow && <WindowTile />}
                </div>,
            )
        }
    }

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

function RoofTile({ color }: { color: string }) {
    // Petites tuiles : 3 lignes claires sur le toit
    return (
        <>
            <span style={{
                position: "absolute",
                left: 0, right: 0, top: "20%", height: "2px",
                background: color,
            }} />
            <span style={{
                position: "absolute",
                left: 0, right: 0, top: "50%", height: "2px",
                background: color,
            }} />
            <span style={{
                position: "absolute",
                left: 0, right: 0, top: "80%", height: "2px",
                background: color,
            }} />
        </>
    )
}

function DoorTile() {
    return (
        <>
            <span style={{
                position: "absolute",
                inset: "5% 15% 0 15%",
                background: BUILDING_DOOR,
                boxShadow: `inset 0 0 0 1px ${COLOR_INK_DARK}`,
            }} />
            {/* Poignée */}
            <span style={{
                position: "absolute",
                right: "25%", top: "55%",
                width: "8%", height: "8%",
                background: BUILDING_DOOR_HL,
                borderRadius: "50%",
            }} />
        </>
    )
}

function WindowTile() {
    return (
        <>
            <span style={{
                position: "absolute",
                inset: "20%",
                background: BUILDING_WINDOW,
                boxShadow: `inset 0 0 0 2px ${BUILDING_WINDOW_OUTLINE}`,
            }} />
            {/* Croisillon */}
            <span style={{
                position: "absolute",
                left: "20%", right: "20%", top: "50%", height: "2px",
                background: BUILDING_WINDOW_OUTLINE,
            }} />
            <span style={{
                position: "absolute",
                top: "20%", bottom: "20%", left: "50%", width: "2px",
                background: BUILDING_WINDOW_OUTLINE,
            }} />
        </>
    )
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
