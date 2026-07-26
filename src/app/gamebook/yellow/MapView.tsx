"use client"

// Nexus II — rendu de la map courante en mode "caméra qui suit le joueur".
//
// Style visuel : Pokémon Or/Argent/Crystal (GBC, région Johto).
// Palette saturée + contours nets + pixel art. Trees ronds, buildings avec
// fenêtres jaunes lumineuses, chemins texturés, herbe avec micro-relief.
//
// Comportement caméra : viewport 10×9, joueur centré, scroll, lock aux bords.

import { useSyncExternalStore } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { getPlayer, subscribePlayer, isBerrySecretKnown, isBerryTreeHarvested } from "@/lib/gamebook/yellow/store/playerStore"
import { FUSION_UNLOCK_MARKER } from "@/lib/gamebook/yellow/data/fusionLeague"
import { berriesForDay, BERRY_MAP_IDS } from "@/lib/gamebook/yellow/data/berryTrees"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { SYLVEBARBE_BLOCK_MAP, SYLVEBARBE_BLOCK, SYLVEBARBE_SLEEP_SPRITE } from "@/lib/gamebook/yellow/data/sylvebarbeBlock"
import { YELLOW_NPCS } from "@/lib/gamebook/yellow/npcs"
import type { YellowBuilding, YellowMapData } from "@/lib/gamebook/yellow/maps"
import { type TileType, isBlockingTile } from "@/lib/gamebook/mapEngine"
import type { RemotePlayer } from "@/lib/gamebook/yellow/multiplayer/useCasinoPresence"
import type { ChatBubble } from "@/lib/gamebook/yellow/multiplayer/useCasinoChat"
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

export default function MapView({ remotePlayers = [], chatBubbles, myUserId, arenaOpponents = [], onArenaClick }: {
    remotePlayers?: RemotePlayer[]
    chatBubbles?: Record<string, ChatBubble>
    myUserId?: string
    arenaOpponents?: { userId: string; nickname: string; x: number; y: number }[]
    onArenaClick?: (userId: string) => void
}) {
    const player = useGameStore((s) => s.player)
    const map = useGameStore((s) => s.map)
    const torchSteps = useGameStore((s) => s.torchSteps)
    const torchRadius = useGameStore((s) => s.torchRadius)
    // BROUILLARD : rayon de vision de base de la map (true = 2 legacy · nombre = rayon), élargi par une lampe torche active.
    const darkBase = map.darkness === true ? 2 : (typeof map.darkness === "number" ? map.darkness : 0)
    const visionRadius = torchSteps > 0 ? Math.max(darkBase, torchRadius) : darkBase

    const cam = computeCamera(player.posX, player.posY, map)
    const npcsOnMap = YELLOW_NPCS.filter((n) => n.mapId === player.mapId)
    const buildings = map.buildings ?? []

    // Re-render sur changement d'état des baies (récolte sur place OU secret révélé) SANS déplacement : le
    // gameStore ne bouge pas `player` quand on cueille, donc on s'abonne au playerStore. On surveille À LA FOIS
    // le nb d'arbres cueillis ET le flag du secret, pour que l'icône apparaisse dès la révélation.
    useSyncExternalStore(
        subscribePlayer,
        () => `${getPlayer().berrySecretKnown ? 1 : 0}:${getPlayer().berryHarvestPicked.length}`,
        () => "0:0",
    )

    // 🍒 ARBRES FERTILES (post-Ligue) : baies du jour encore sur pied. Overlay INDÉPENDANT du mode de rendu
    //    (marche sur les cartes à backgroundImage comme Ville Jaune). Lectures non-réactives : le re-render est
    //    piloté par le gameStore (déplacement / dialogue), qui accompagne tout changement d'état des baies.
    const berryTrees: { x: number; y: number; emoji: string }[] =
        BERRY_MAP_IDS.includes(player.mapId) && isBerrySecretKnown()
            ? (() => {
                const day = new Date().toISOString().slice(0, 10)
                return berriesForDay(player.mapId, day)
                    // Seules ~30% des baies du jour sont VISIBLES ; les autres se trouvent à la touche A.
                    .filter((t) => t.visible && !isBerryTreeHarvested(player.mapId, t.x, t.y, day))
                    .map((t) => ({ x: t.x, y: t.y, emoji: getHeldItem(t.berryId)?.emoji ?? "🍒" }))
            })()
            : []
    // DEBUG : grille de coordonnées (vert = walkable, rouge = bloqué). Activer via ?grid=1.
    const showGrid = !!map.debugGrid
        || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("grid"))

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
            {/* ARÈNE JOUEUR : indice pour défier les autres joueurs (sinon on ne sait pas comment les provoquer). */}
            {arenaOpponents.length > 0 && (
                <div style={arenaHintStyle}>⚔️ Approche un dresseur + A (ou touche-le) pour le défier !</div>
            )}
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
                    // AUTEL DE LA CHIMÈRE : la porte à dragons de la Ligue est FERMÉE tant que la Ligue n'est pas
                    //   débloquée, puis OUVERTE (décor alternatif) une fois une épreuve de fusion remportée.
                    const bgUrl = (map.id === "yellow_combat_autel" && getPlayer().defeatedTrainers.includes(FUSION_UNLOCK_MARKER))
                        ? "/yellow/sprites/fusion_altar_open.png"
                        : map.backgroundImage
                    return (
                        <div style={{
                            position: "absolute",
                            ...screenPos(0, 0, map.width, map.height),
                            backgroundImage: `url(${bgUrl}?v=2)`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
                            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                            imageRendering: "pixelated",
                            zIndex: 0,
                            pointerEvents: "none",
                        }} />
                    )
                })()}

                {/* TABLE ROULETTE MULTIJOUEUR (casino) : sprite 3×2 en (3,4)→(5,5), sous le croupier.
                    On s'approche + A face à la table → on joue (cf. tryCasinoObjectA côté client). */}
                {map.id === "yellow_casino" && (
                    <div style={{
                        position: "absolute", ...screenPos(3, 4, 3, 2), zIndex: 1, pointerEvents: "none",
                        backgroundImage: "url(/yellow/sprites/casino_roulette.png?v=1)",
                        backgroundRepeat: "no-repeat", backgroundSize: "contain", backgroundPosition: "center",
                        imageRendering: "pixelated",
                    }} />
                )}

                {/* TABLE DE POKER MULTIJOUEUR (casino) : sprite 3×2 en (3,7)→(5,8), AU SUD de la roulette.
                    On s'approche + A face à la table → on joue (cf. tryCasinoObjectA côté client). */}
                {map.id === "yellow_casino" && (
                    <div style={{
                        position: "absolute", ...screenPos(3, 7, 3, 2), zIndex: 1, pointerEvents: "none",
                        backgroundImage: "url(/yellow/sprites/casino_poker.png?v=1)",
                        backgroundRepeat: "no-repeat", backgroundSize: "contain", backgroundPosition: "center",
                        imageRendering: "pixelated",
                    }} />
                )}

                {/* BROUILLARD (map.darkness) : NOIR sur toute case hors du rayon de vision (Chebyshev ≤ visionRadius).
                    visionRadius = rayon de base de la map, élargi par une lampe torche active. La case du joueur
                    n'a jamais d'overlay → il reste visible ; le reste est noir et SUIT le joueur. */}
                {!!map.darkness && map.tiles.flatMap((row, y) =>
                    row.map((_t, x) => {
                        const d = Math.max(Math.abs(x - player.posX), Math.abs(y - player.posY))
                        if (d <= visionRadius) return null
                        if (x < cam.x - 1 || x > cam.x + VIEWPORT_W || y < cam.y - 1 || y > cam.y + VIEWPORT_H) return null // hors viewport (15×10) + 1 marge → couvre TOUT l'écran (perf : on ne darken pas la map entière ex. Grotte 49×42)
                        return (
                            <div
                                key={`dark-${x}-${y}`}
                                style={{ position: "absolute", ...screenPos(x, y), background: "#000", zIndex: 7, pointerEvents: "none" }}
                            />
                        )
                    }),
                )}

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

                {/* 🍒 BAIES À RÉCOLTER (post-Ligue) : glinte sur l'arbre porteur du jour (A face à l'arbre pour
                    cueillir). Overlay au-dessus des tuiles/backgroundImage, sous les PNJ et le joueur. */}
                {berryTrees.map((t) => (
                    <div
                        key={`berry-${t.x}-${t.y}`}
                        style={{ position: "absolute", ...screenPos(t.x, t.y), zIndex: 2, pointerEvents: "none", display: "flex", alignItems: "flex-start", justifyContent: "center" }}
                        title="Baie à récolter (A)"
                    >
                        <span style={{ marginTop: "-8%", fontSize: "clamp(7px, 1.7dvw, 11px)", opacity: 0.82, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}>{t.emoji}</span>
                    </div>
                ))}

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

                {/* SYLVEBARBE ENDORMI : bouche la sortie sud de Ville Jaune tant qu'il dort. */}
                {map.id === SYLVEBARBE_BLOCK_MAP && !getPlayer().sylvebarbeAwake && (
                    <div
                        style={{
                            position: "absolute",
                            ...screenPos(SYLVEBARBE_BLOCK.x0, SYLVEBARBE_BLOCK.y0, SYLVEBARBE_BLOCK.x1 - SYLVEBARBE_BLOCK.x0 + 1, SYLVEBARBE_BLOCK.y1 - SYLVEBARBE_BLOCK.y0 + 1),
                            backgroundImage: `url(${SYLVEBARBE_SLEEP_SPRITE}?v=1)`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "100% 100%",
                            imageRendering: "pixelated",
                            zIndex: 2,
                            pointerEvents: "none",
                        }}
                    />
                )}

                {!hasBgImage && buildings.map((b) => (
                    <BuildingSprite key={b.id} building={b} screenPos={screenPos} />
                ))}

                {npcsOnMap.map((npc) => (
                    <NpcSprite key={npc.id} npc={npc} screenPos={screenPos}
                        overrideSprite={npc.id === "y_gekroc" && getPlayer().gekrocResolved ? { url: "/yellow/sprites/pierre_gekroc.png", frames: 1, h: 1.2 } : undefined} />
                ))}

                {/* Avatars des autres joueurs (casino multijoueur) */}
                {remotePlayers.map((rp) => (
                    <RemotePlayerSprite key={rp.userId} rp={rp} screenPos={screenPos} bubble={chatBubbles?.[rp.userId]?.text} />
                ))}

                {/* ARÈNES JOUEURS : adversaires IA cliquables (hub Eau / miroir Élec) */}
                {arenaOpponents.map((o) => (
                    <ArenaOpponentSprite key={o.userId} o={o} screenPos={screenPos} onClick={() => onArenaClick?.(o.userId)} />
                ))}

                <PlayerSprite player={player} screenPos={screenPos} />
                {/* #9 — ma propre bulle de chat, au-dessus de mon perso */}
                {myUserId && chatBubbles?.[myUserId] && (
                    <ChatBubbleSprite
                        key={chatBubbles[myUserId].ts}
                        text={chatBubbles[myUserId].text}
                        posX={player.posX}
                        posY={player.posY}
                        screenPos={screenPos}
                    />
                )}
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
    // PNJ 10 — Sentinelle de la Grotte du Nexus (bloqueur de couloir), portrait entier fourni.
    y_pnj10_grotte: { url: "/yellow/sprites/pnj10.png", frames: 1, h: 1.9 },
    // PNJ 1 — Spéléologue égaré de la Grotte du Nexus B2F (teaser du légendaire nocturne).
    y_pnj1_grotte_b2f: { url: "/yellow/sprites/pnj1_grotte_b2f.png", frames: 1, h: 1.9 },
    // PNJ 3 — Aventurier bloqueur de la Grotte B2F (de profil, barre le couloir jusqu'à sa défaite).
    y_pnj3_grotte_b2f: { url: "/yellow/sprites/pnj3_grotte_b2f.png", frames: 1, h: 1.9 },
    y_vendeur: { url: "/yellow/sprites/npc_clerk_color.png?v=3", frames: 6 },
    y_croupier: { url: "/yellow/sprites/kris_color.png?v=3", frames: 6 },
    // Marchand de Jetons de Combat (hub de la Zone de Combat).
    y_combat_merchant: { url: "/yellow/sprites/combat_merchant.png", frames: 1, h: 2.0 },
    y_dome_maitre: { url: "/yellow/sprites/npc_dome_mage.png", frames: 1, h: 2.0 },
    y_medecin: { url: "/yellow/sprites/npc_nurse_color.png?v=3", frames: 3 },
    // Sbire = portrait de la Nymphe Nouille (image unique).
    y_sbire: { url: "/yellow/sprites/npc/noodle_nymph.png", frames: 1, h: 1.9 },
    // ACE (rival) sur la ville — perso entier, plus grand que le joueur.
    y_ace: { url: "/yellow/sprites/npc_ace.png", frames: 1, h: 2.0 },
    // Conseiller (à côté du Centre Daemon) — portrait entier (image unique fournie).
    y_conseiller: { url: "/yellow/sprites/guide.png", frames: 1, h: 1.9 },
    // PNJ devant la MAISON HANTÉE : le collectionneur (chasseur de spectres) + le brocanteur (mystique).
    y_hh_collector: { url: "/yellow/sprites/hh_collector.png", frames: 1, h: 2.0 },
    y_hh_trader: { url: "/yellow/sprites/hh_trader.png", frames: 1, h: 2.0 },
    // Technicien devant la Centrale (indice Gékroc / Pierre).
    y_centrale_hint: { url: "/yellow/sprites/npc_centrale.png", frames: 1, h: 2.0 },
    // Dénicheur à côté de l'entrée de la grotte (échange Faukon → Blaziper).
    y_cave_trader: { url: "/yellow/sprites/npc_echange.png", frames: 1, h: 2.0 },
    // Gamin au centre de la plaine d'entraînement (indice Goshendofy de nuit).
    y_hh_kid: { url: "/yellow/sprites/hh_kid.png", frames: 1, h: 2.0 },
    // Dresseur d'Orcaline (plaine d'entraînement) : escalade quotidienne + cadeau.
    y_orcaline_trainer: { url: "/yellow/sprites/dresseur_orcaline.png", frames: 1, h: 2.0 },
    // Arène Plante (carte SANS PNJ dessinés) : sprites ENTIERS sur les cases.
    y_arena_druide: { url: "/yellow/sprites/npc_druide.png", frames: 1, h: 2.4 },
    y_arena_g1: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g2: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g3: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    y_arena_g4: { url: "/yellow/sprites/npc_garde_plante.png", frames: 1, h: 2.0 },
    // Arène Roche "Caverne Minière" : mineurs + Maître Granit (sprites entiers).
    y_rocharena_g1: { url: "/yellow/sprites/npc_roche1.png", frames: 1, h: 2.0 },
    y_rocharena_g2: { url: "/yellow/sprites/npc_roche2.png", frames: 1, h: 2.0 },
    y_rocharena_g3: { url: "/yellow/sprites/npc_roche3.png", frames: 1, h: 2.0 },
    y_rocharena_g4: { url: "/yellow/sprites/npc_roche4.png", frames: 1, h: 2.0 },
    y_rocharena_boss: { url: "/yellow/sprites/npc_granit.png", frames: 1, h: 2.4 },
    // Arène Feu "La Caldeira" : 4 dresseuses + la Doyenne PYRA (sprites entiers).
    y_feuarena_g1: { url: "/yellow/sprites/npc_feu1.png", frames: 1, h: 2.0 },
    y_feuarena_g2: { url: "/yellow/sprites/npc_feu2.png", frames: 1, h: 2.0 },
    y_feuarena_g3: { url: "/yellow/sprites/npc_feu3.png", frames: 1, h: 2.0 },
    y_feuarena_g4: { url: "/yellow/sprites/npc_feu4.png", frames: 1, h: 2.0 },
    y_feuarena_boss: { url: "/yellow/sprites/npc_pyra.png", frames: 1, h: 2.4 },
    // Arène Électrique "Tour Hertz" : la Reine (boss) + 4 gardes (sprites entiers).
    y_elecarena_g1: { url: "/yellow/sprites/npc_elec_gauche.png", frames: 1, h: 2.0 },
    y_elecarena_g2: { url: "/yellow/sprites/npc_elec_droit1.png", frames: 1, h: 2.0 },
    y_elecarena_g3: { url: "/yellow/sprites/npc_elec_droit2.png", frames: 1, h: 2.0 },
    y_elecarena_g4: { url: "/yellow/sprites/npc_elec_droit3.png", frames: 1, h: 2.0 },
    y_elecarena_boss: { url: "/yellow/sprites/npc_elec_reine.png", frames: 1, h: 2.4 },
    // Route Nord : Gamin Léo + Exploratrice Mia (sprites entiers).
    y_trainer_leo: { url: "/yellow/sprites/npc_leo.png", frames: 1, h: 1.9 },
    y_trainer_mia: { url: "/yellow/sprites/npc_mia.png", frames: 1, h: 1.9 },
    // GÉKROC (mini-boss Centrale) sur sa pierre — devient la Pierre seule une fois résolu (override ci-dessous).
    y_gekroc: { url: "/yellow/sprites/gekroc_overworld.png", frames: 1, h: 1.8 },
    // PNJ 5 — GARDIEN de la Grotte du Nexus (intercepte en 17,33, meute des 5 Gek). Sprite 92×147 → h 1.6.
    y_pnj5_grotte: { url: "/yellow/sprites/pnj5_grotte.png", frames: 1, h: 1.6 },
    // LIGUE — Conseil des 4 (sprites maison) + LE MAÎTRE (réutilise le sprite ACE existant).
    y_ligue_1_olga: { url: "/yellow/sprites/ligue_olga.png", frames: 1, h: 1.6 },
    y_ligue_2_aldo: { url: "/yellow/sprites/ligue_aldo.png", frames: 1, h: 1.6 },
    y_ligue_3_agatha: { url: "/yellow/sprites/ligue_agatha.png", frames: 1, h: 1.6 },
    y_ligue_4_peter: { url: "/yellow/sprites/ligue_peter.png", frames: 1, h: 1.6 },
    y_ligue_maitre: { url: "/yellow/sprites/npc_ace.png", frames: 1, h: 2.0 },
    // LIGUE DE FUSION — réutilise les sprites des Conseillers / du Maître de la vraie Ligue (mapping type 1:1).
    y_fusion_1: { url: "/yellow/sprites/ligue_olga.png", frames: 1, h: 1.6 },     // salle Glace
    y_fusion_2: { url: "/yellow/sprites/ligue_aldo.png", frames: 1, h: 1.6 },     // salle Combat
    y_fusion_3: { url: "/yellow/sprites/ligue_agatha.png", frames: 1, h: 1.6 },   // salle Spectre
    y_fusion_4: { url: "/yellow/sprites/ligue_peter.png", frames: 1, h: 1.6 },    // salle Dragon
    y_fusion_maitre: { url: "/yellow/sprites/npc_ace.png", frames: 1, h: 2.0 },   // Champion
    // ARÈNE EAU — Conseil des marées (gauche 1/2, droite 1/2) + ONDINE.
    y_eauarena_g1: { url: "/yellow/sprites/eau_g1.png", frames: 1, h: 1.9 },
    y_eauarena_g2: { url: "/yellow/sprites/eau_g2.png", frames: 1, h: 1.9 },
    y_eauarena_g3: { url: "/yellow/sprites/eau_g3.png", frames: 1, h: 1.9 },
    y_eauarena_g4: { url: "/yellow/sprites/eau_g4.png", frames: 1, h: 1.9 },
    y_eauarena_boss: { url: "/yellow/sprites/eau_ondine.png", frames: 1, h: 1.9 },
}

function NpcSprite({
    npc,
    screenPos,
    overrideSprite,
}: {
    npc: { id: string; initialX: number; initialY: number; name: string; sprite: { emoji?: string } }
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
    overrideSprite?: { url: string; frames: number; h?: number }
}) {
    // TON DOUBLE (salle dorée run 2) : rendu SPÉCIAL = le sprite du JOUEUR (de face) nimbé d'un HALO MAUVE.
    //   (Le boss de Ligue n'est plus un reflet : c'est le Dieu Spaghetti, rendu via son sprite/emoji normal.)
    if (npc.id === "y_ligue_double") {
        const cell = FIRERED_PLAYER.down[1]
        return (
            <div style={{ position: "absolute", ...screenPos(npc.initialX, npc.initialY - (SPRITE_ASPECT_RATIO - 1), 1, SPRITE_ASPECT_RATIO), zIndex: 4, overflow: "visible", pointerEvents: "none" }} title={npc.name}>
                <div style={{ position: "absolute", inset: "-40% -20%", borderRadius: "50%", background: "radial-gradient(circle, rgba(160,48,224,0.6) 0%, rgba(120,20,190,0.28) 45%, rgba(120,20,190,0) 72%)", filter: "blur(1px)" }} />
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(/yellow/sprites/firered_player_t.png?v=3)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
                    backgroundPosition: sheetBgPosition(cell),
                    imageRendering: "pixelated",
                    filter: "drop-shadow(0 0 3px #b040ff) drop-shadow(0 0 7px #9020e0)",
                }} />
            </div>
        )
    }
    const sprite = overrideSprite ?? NPC_SPRITES[npc.id]
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
// Même sprite Red que le joueur local (orienté selon leur direction), distingué
// par un HALO coloré dérivé de l'userId, + pseudo au-dessus de la tête. Glissement
// fluide entre tuiles. (NB : FIRERED_PLAYER & co sont définis plus bas — résolus au
// rendu, donc OK.)

function hashHue(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h % 360
}

function RemotePlayerSprite({
    rp,
    screenPos,
    bubble,
}: {
    rp: RemotePlayer
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
    bubble?: string
}) {
    const hue = hashHue(rp.userId)
    const cells = FIRERED_PLAYER[rp.direction] ?? FIRERED_PLAYER.down
    // Le stepFrame distant n'est pas diffusé : on alterne les 2 frames de marche
    // selon la parité de la tuile → l'animation de pas se fait "gratuitement" à
    // chaque déplacement (couplée au glissement CSS).
    const cell = cells[(rp.posX + rp.posY) % 2]
    const topOffset = SPRITE_ASPECT_RATIO - 1

    return (
        <div
            style={{
                position: "absolute",
                ...screenPos(rp.posX, rp.posY - topOffset, 1, SPRITE_ASPECT_RATIO),
                zIndex: 3,
                transition: "left 0.12s linear, top 0.12s linear",
                pointerEvents: "none",
            }}
        >
            {/* Sprite Red teinté par un halo coloré (distinction d'un coup d'œil). */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "url(/yellow/sprites/firered_player_t.png?v=3)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
                    backgroundPosition: sheetBgPosition(cell),
                    imageRendering: "pixelated",
                    filter: `drop-shadow(0 0 1.5px hsl(${hue} 95% 45%)) drop-shadow(0 0 1.5px hsl(${hue} 95% 45%))`,
                }}
            />
            {/* Au-dessus de la tête : bulle de chat (si message récent) PUIS le pseudo. */}
            <div
                style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%) translateY(-1px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    pointerEvents: "none",
                }}
            >
                {bubble && <BubbleBox text={bubble} />}
                <span
                    style={{
                        whiteSpace: "nowrap",
                        maxWidth: "22dvw",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "clamp(7px, 1.6dvw, 10px)",
                        fontWeight: 700,
                        color: "#fff",
                        background: "rgba(28,20,8,0.82)",
                        border: `1px solid hsl(${hue} 80% 45%)`,
                        borderRadius: 3,
                        padding: "0 3px",
                        fontFamily: "'Courier New', monospace",
                    }}
                >
                    {rp.nickname}
                </span>
            </div>
        </div>
    )
}

// === Adversaire d'ARÈNE JOUEUR (hub / miroir) =========================
// Même sprite Red teinté que les distants, mais STATIQUE et CLIQUABLE (→ défi). Picto ⚔️ + pseudo.
function ArenaOpponentSprite({
    o,
    screenPos,
    onClick,
}: {
    o: { userId: string; nickname: string; x: number; y: number }
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
    onClick: () => void
}) {
    const hue = hashHue(o.userId)
    const cell = FIRERED_PLAYER.down[0]
    const topOffset = SPRITE_ASPECT_RATIO - 1
    return (
        <div
            style={{ position: "absolute", ...screenPos(o.x, o.y - topOffset, 1, SPRITE_ASPECT_RATIO), zIndex: 4, cursor: "pointer" }}
            onClick={onClick}
            title={`Défier ${o.nickname}`}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "url(/yellow/sprites/firered_player_t.png?v=3)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%`,
                    backgroundPosition: sheetBgPosition(cell),
                    imageRendering: "pixelated",
                    filter: `drop-shadow(0 0 2px hsl(${hue} 95% 50%)) drop-shadow(0 0 2px hsl(${hue} 95% 50%))`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%) translateY(-1px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    pointerEvents: "none",
                }}
            >
                <span style={{ fontSize: "clamp(9px, 2.2dvw, 13px)" }}>⚔️</span>
                <span
                    style={{
                        whiteSpace: "nowrap",
                        maxWidth: "22dvw",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "clamp(7px, 1.6dvw, 10px)",
                        fontWeight: 700,
                        color: "#fff",
                        background: "rgba(28,20,8,0.82)",
                        border: `1px solid hsl(${hue} 80% 45%)`,
                        borderRadius: 3,
                        padding: "0 3px",
                        fontFamily: "'Courier New', monospace",
                    }}
                >
                    {o.nickname}
                </span>
            </div>
        </div>
    )
}

// #9 — bulle de message style BD (blanche, bord noir) au-dessus d'un joueur.
function BubbleBox({ text }: { text: string }) {
    return (
        <div
            style={{
                maxWidth: "30dvw",
                background: "#fff",
                color: "#1c1408",
                border: "2px solid #1c1408",
                borderRadius: 8,
                padding: "2px 7px",
                fontSize: "clamp(8px, 1.9dvw, 12px)",
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.25,
                wordBreak: "break-word",
                boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                textAlign: "center",
            }}
        >
            {text}
        </div>
    )
}

// Bulle au-dessus du JOUEUR LOCAL (les distants l'ont dans RemotePlayerSprite).
function ChatBubbleSprite({
    text, posX, posY, screenPos,
}: {
    text: string
    posX: number
    posY: number
    screenPos: (x: number, y: number, w?: number, h?: number) => React.CSSProperties
}) {
    return (
        <div style={{ position: "absolute", ...screenPos(posX, posY, 1, 1), zIndex: 6, pointerEvents: "none" }}>
            <div style={{ position: "absolute", bottom: "115%", left: "50%", transform: "translateX(-50%)" }}>
                <BubbleBox text={text} />
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
const arenaHintStyle: React.CSSProperties = {
    position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", zIndex: 20,
    background: "rgba(20,16,40,0.92)", color: "#ffd54a", border: "1px solid #ffd54a", borderRadius: 8,
    padding: "4px 10px", fontSize: "clamp(8px, 2dvw, 11px)", fontWeight: 700, fontFamily: "'Courier New', monospace",
    whiteSpace: "nowrap", pointerEvents: "none", maxWidth: "96%", overflow: "hidden", textOverflow: "ellipsis",
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
