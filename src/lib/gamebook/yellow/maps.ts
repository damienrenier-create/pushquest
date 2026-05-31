// Nexus II "jaune éclair" — registre des maps + bâtiments + exits.
//
// Conventions :
//   - Maps : prefixe `yellow_*`
//   - Buildings : pose sur une map extérieure, bloque le mouvement sauf à la
//     case porte. La porte = warp automatique vers la map intérieure.
//   - Exits : warps custom (ex: sortie d'une map intérieure qui ramène dehors).
//
// Toutes les coordonnées sont en TILES. Le rendu (10x9 viewport) est géré
// côté MapView avec scroll caméra.

import type { MapData, TileType } from "@/lib/gamebook/mapEngine"
import { YELLOW_ENTRANCE_MAP_ID } from "./featureFlag"

// === Types yellow-specific ============================================

export interface YellowBuilding {
    id: string
    /** Coin haut-gauche du footprint */
    x: number
    y: number
    /** Taille en tiles */
    w: number
    h: number
    /** Position de la porte RELATIVE à (x, y) */
    doorX: number
    doorY: number
    /** Map intérieure vers laquelle la porte mène */
    targetMapId: string
    /** Où le joueur réapparaît en entrant dans la map intérieure */
    targetSpawnX: number
    targetSpawnY: number
    /** Nom affiché au-dessus du bâtiment */
    displayName: string
    /** Type pour différencier visuellement (couleur du toit) */
    kind: "shop" | "casino" | "infirmary" | "arena"
}

export interface YellowExit {
    /** Case qui déclenche le warp (coords absolues dans la map) */
    x: number
    y: number
    targetMapId: string
    targetSpawnX: number
    targetSpawnY: number
}

export interface YellowMapData extends MapData {
    /** Bâtiments présents sur cette map (rendu + collision + warps auto) */
    buildings?: YellowBuilding[]
    /** Warps custom (ex: doorMat de sortie d'intérieur) */
    exits?: YellowExit[]
    /** Couleur dominante de la map ("ground" — sol par défaut) */
    groundTile?: TileType
    /** v2 — Image PNG utilisée comme fond complet de la map (au lieu du rendu
     *  par tiles CSS). Pratique pour des scènes pré-assemblées Spriters Resource. */
    backgroundImage?: string
    /** Largeur native de l'image en pixels (ex: 1360 pour viridian_full) */
    backgroundImageWidth?: number
    /** Hauteur native de l'image en pixels */
    backgroundImageHeight?: number
    /** Combien de pixels de l'image natifs = 1 tile du jeu (ex: 16 pour natif, 32 pour 2x) */
    backgroundImageTileSize?: number
    /** Pixel x de l'image qui correspond à la case (0, 0) de la map (skip headers/bordures) */
    backgroundImageOriginX?: number
    /** Pixel y de l'image qui correspond à la case (0, 0) de la map (skip headers/bordures) */
    backgroundImageOriginY?: number
}

// === Helpers ============================================================

/** Pose les murs périphériques de l'extérieur (4 côtés) */
function fillRect(W: number, H: number, defaultTile: TileType): TileType[][] {
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) row.push(defaultTile)
        m.push(row)
    }
    return m
}

function fillRoom(W: number, H: number, floor: TileType): TileType[][] {
    const m = fillRect(W, H, floor)
    // Murs périphériques intérieur
    for (let x = 0; x < W; x++) {
        m[0][x] = "wallH"
        m[H - 1][x] = "wallH"
    }
    for (let y = 1; y < H - 1; y++) {
        m[y][0] = "wallV"
        m[y][W - 1] = "wallV"
    }
    return m
}

// === Collisions Viridian City (mapping ultra-détaillé user 2026-05-31, v3) ==
// Ordre d'application :
//   1. Default grass
//   2. Mountains (4 blocs)
//   3. Forêts (5 zones)
//   4. Bloc haut + gros encart + fences + obstacles row 30
//   5. Buissons + sapins isolés + petit bloc sapins
//   6. Signs (blocking)
//   7. Eau
//   8. Overrides WALKABLE en dernier (terre-plein, passages, rows 20-21, 31, 32, etc.)

function buildViridianCollisions(): TileType[][] {
    const W = VIRIDIAN_W, H = VIRIDIAN_H
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) row.push("grass")
        m.push(row)
    }
    void W; void H

    // === MONTAGNES (4 blocs) ===
    for (let y = 0; y <= 14; y++) for (let x = 0; x <= 7; x++) m[y][x] = "tree"
    for (let x = 0; x <= 5; x++) m[15][x] = "tree"
    for (let y = 20; y <= 33; y++) for (let x = 0; x <= 6; x++) m[y][x] = "tree"
    for (let y = 34; y <= 39; y++) for (let x = 0; x <= 5; x++) m[y][x] = "tree"

    // === FORÊTS (5 zones + bordure est) ===
    for (let y = 13; y <= 39; y++) for (let x = 6; x <= 13; x++) m[y][x] = "tree"   // gauche
    for (let y = 35; y <= 39; y++) for (let x = 14; x <= 21; x++) m[y][x] = "tree"  // centre-bas
    for (let y = 35; y <= 39; y++) for (let x = 26; x <= 43; x++) m[y][x] = "tree"  // bas-droite
    for (let y = 0; y <= 3; y++) for (let x = 24; x <= 43; x++) m[y][x] = "tree"    // haut-droite
    for (let x = 24; x <= 27; x++) m[4][x] = "tree"                                 // petits sapins
    // Bordure est cols 42-43 toutes rows (sapins infranchissables)
    for (let y = 0; y < VIRIDIAN_H; y++) { m[y][42] = "tree"; m[y][43] = "tree" }

    // === BLOC HAUT (rectangle plein 8-18, 0-4) ===
    for (let y = 0; y <= 4; y++) for (let x = 8; x <= 18; x++) m[y][x] = "tree"

    // === GROS ENCART (9-18, 6-16) — TOUT bloqué (user a corrigé X=9) ===
    for (let y = 6; y <= 16; y++) for (let x = 9; x <= 18; x++) m[y][x] = "fence"

    // === LIGNES BARRIÈRES horizontales ===
    for (let x = 29; x <= 41; x++) { m[12][x] = "fence"; m[15][x] = "fence" }
    // Barrière "suite et fin" (23..41, 30)
    for (let x = 23; x <= 41; x++) m[30][x] = "fence"

    // === LIGNE Y=30 obstacles supplémentaires ===
    for (let x = 7; x <= 10; x++) m[30][x] = "tree"
    for (let x = 17; x <= 19; x++) m[30][x] = "tree"

    // === BUISSONS (séries 1, 2, 3 dédoublonnées) ===
    for (const y of [7, 9, 11, 13, 15]) m[y][19] = "tree"   // série 1 col 19
    m[9][23] = "tree"; m[11][23] = "tree"                    // série 2 + 3
    m[12][27] = "tree"; m[12][28] = "tree"                   // série 2
    m[16][23] = "tree"; m[18][23] = "tree"                   // série 3

    // === SAPINS LIGNES ISOLÉES (rows 22 et 24, cols 7..10) ===
    for (let x = 7; x <= 10; x++) { m[22][x] = "tree"; m[24][x] = "tree" }

    // === PETIT BLOC SAPINS (12-13, 23-25) ===
    for (let y = 23; y <= 25; y++) for (let x = 12; x <= 13; x++) m[y][x] = "tree"

    // === SIGNS (blocking) ===
    m[1][23] = "tree"   // panneau standard
    m[10][32] = "tree"  // panneau gym
    m[16][20] = "tree"  // petit panneau
    m[31][20] = "tree"  // panneau près passage

    // === EAU (rectangle plein cols 11..16, rows 26..30) ===
    // User a précisé : "ce sont les mêmes tuiles" → toute la zone est de l'eau.
    for (let y = 26; y <= 30; y++) for (let x = 11; x <= 16; x++) m[y][x] = "water"

    // === OVERRIDES walkable (À LA FIN pour effacer les blocages au besoin) ===
    // Petite zone herbe (6,15), (7,15)
    m[15][6] = "grass"; m[15][7] = "grass"
    // Path vertical col 8 rows 5..16 (perce le forêt gauche)
    for (let y = 5; y <= 16; y++) m[y][8] = "grass"
    // Ligne herbe (0..8, 16)
    for (let x = 0; x <= 8; x++) m[16][x] = "grass"
    // Row 17 walkable cols 0..23 (perce le forêt gauche)
    for (let x = 0; x <= 23; x++) m[17][x] = "grass"
    // Sand path west (0..8, 17..19) — déjà couvert par row 17 mais on garde 18-19
    for (let y = 18; y <= 19; y++) for (let x = 0; x <= 8; x++) m[y][x] = "grass"
    // Sortie Route 1 sand (22..25, 35..39)
    for (let y = 35; y <= 39; y++) for (let x = 22; x <= 25; x++) m[y][x] = "grass"
    // Passage row 30 cols 20..22
    for (let x = 20; x <= 22; x++) m[30][x] = "grass"
    // Colonne accessible (11, 22..25) + (12, 22) + (13, 22)
    for (let y = 22; y <= 25; y++) m[y][11] = "grass"
    m[22][12] = "grass"; m[22][13] = "grass"
    // Terre-plein (7..10, 25..29)
    for (let y = 25; y <= 29; y++) for (let x = 7; x <= 10; x++) m[y][x] = "grass"
    // Walkable nord (7..19, 20..21)
    for (let y = 20; y <= 21; y++) for (let x = 7; x <= 19; x++) m[y][x] = "grass"
    // Walkable rows 5 et 8 cols 20..30 (user spec)
    for (let x = 20; x <= 30; x++) { m[5][x] = "grass"; m[8][x] = "grass" }
    // Walkable row 31 cols 7..19
    for (let x = 7; x <= 19; x++) m[31][x] = "grass"
    // Walkable row 32 cols 7..41
    for (let x = 7; x <= 41; x++) m[32][x] = "grass"

    return m
}


// === Bâtiments de Viridian City (positions mappées par l'user 2026-05-31) ==
// Le visuel est dans viridian_full.png — ces définitions servent à :
//   1. Bloquer le mouvement sur les murs du bâtiment
//   2. Auto-générer les exits (warp porte → map intérieure)
const TOWN_BUILDINGS: YellowBuilding[] = [
    {
        // Bâtiment 1 (NPC house haut, mappé par user) : zone (24,8)-(28,11)
        // Row 8 = roof overhang (walkable), rows 9-11 = wall + door (25, 11)
        id: "b_npc1",
        x: 24, y: 9, w: 5, h: 3,        // footprint rows 9..11
        doorX: 1, doorY: 2,             // porte abs (25, 11) — dans le footprint (walkable)
        targetMapId: "yellow_casino",   // placeholder (pas de map Academy encore)
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "MAISON",
        kind: "casino",
    },
    {
        // GYM : toit (33-38, 6) à (33-38, 8), porte (36, 10)
        id: "b_arena",
        x: 33, y: 6, w: 6, h: 4,        // footprint cols 33..38, rows 6..9
        doorX: 3, doorY: 4,             // porte abs (36, 10) — devant le bâtiment
        targetMapId: "yellow_arena",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "GYM",
        kind: "arena",
    },
    {
        // MAISON NPC (placeholder casino) : toit (24-28, 16), porte (25, 18)
        id: "b_casino",
        x: 24, y: 16, w: 5, h: 2,       // footprint cols 24..28, rows 16..17
        doorX: 1, doorY: 2,             // porte abs (25, 18) — devant le bâtiment
        targetMapId: "yellow_casino",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "MAISON",
        kind: "casino",
    },
    {
        // MART : toit (34-37, 16), descend à (34-37, 19), porte (36, 19)
        id: "b_shop",
        x: 34, y: 16, w: 4, h: 4,       // footprint cols 34..37, rows 16..19
        doorX: 2, doorY: 3,             // porte abs (36, 19) — dans le footprint (walkable)
        targetMapId: "yellow_shop",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "MART",
        kind: "shop",
    },
    {
        // PC Pokemon Center : (24-28, 23-26), porte (26, 26)
        // (rows 19-22 = espace walkable entre Maison NPC et PC, per user 2026-05-31)
        id: "b_infirmary",
        x: 24, y: 23, w: 5, h: 4,       // footprint cols 24..28, rows 23..26
        doorX: 2, doorY: 3,             // porte abs (26, 26) — dans le footprint (walkable)
        targetMapId: "yellow_infirmary",
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "PC",
        kind: "infirmary",
    },
]

// === Intérieurs : 4 maps 9×7 ============================================

function buildShopInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorChecker")
    // Comptoir horizontal
    for (let x = 1; x < 8; x++) m[2][x] = "shopCounter"
    // Étagères au-dessus
    for (let x = 1; x < 8; x++) m[1][x] = "shopShelf"
    // Porte de sortie au sud
    m[6][4] = "doorMat"
    return m
}

function buildCasinoInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorTile")
    // Tables de casino
    m[2][2] = "table"
    m[2][6] = "table"
    m[4][2] = "slotMachine"
    m[4][6] = "rouletteWheel"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

function buildInfirmaryInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorTile")
    // 2 lits
    m[2][2] = "rug"
    m[2][6] = "rug"
    // Comptoir d'accueil au nord
    for (let x = 3; x <= 5; x++) m[1][x] = "shopCounter"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

function buildArenaInterior(): TileType[][] {
    const m = fillRoom(9, 7, "arenaFloor")
    // Petite estrade au nord
    m[1][4] = "shopCounter"
    // Porte sortie
    m[6][4] = "doorMat"
    return m
}

// === Helpers warp =======================================================

/** Position absolue de la porte d'un bâtiment. */
export function buildingDoorPos(b: YellowBuilding): { x: number; y: number } {
    return { x: b.x + b.doorX, y: b.y + b.doorY }
}

/** Exits auto-dérivés des buildings (porte = warp vers intérieur). */
function exitsFromBuildings(buildings: YellowBuilding[]): YellowExit[] {
    return buildings.map((b) => {
        const door = buildingDoorPos(b)
        return {
            x: door.x,
            y: door.y,
            targetMapId: b.targetMapId,
            targetSpawnX: b.targetSpawnX,
            targetSpawnY: b.targetSpawnY,
        }
    })
}

// === Registre ===========================================================

// Coordonnées de retour pour les exits d'intérieur : juste sous la porte
// du bâtiment correspondant (player.posY = door.y + 1).
const TOWN_BUILDING_BY_TARGET: Record<string, YellowBuilding> = Object.fromEntries(
    TOWN_BUILDINGS.map((b) => [b.targetMapId, b]),
)

function returnExit(targetInteriorMapId: string, doorMatX: number, doorMatY: number): YellowExit {
    const b = TOWN_BUILDING_BY_TARGET[targetInteriorMapId]
    const door = buildingDoorPos(b)
    return {
        x: doorMatX,
        y: doorMatY,
        targetMapId: YELLOW_ENTRANCE_MAP_ID,
        targetSpawnX: door.x,
        targetSpawnY: door.y + 1, // 1 case sous la porte = sur le path
    }
}

// === VILLE JAUNE = Viridian City (FireRed) ==============================
// viridian_full.png : 1360x672 px à l'échelle NATIVE FireRed (16 px = 1 tile).
// La sheet Spriters Resource a une bordure décorative :
//   - Gauche : x=0..7 (frame + marge blanche), contenu réel commence x=8
//   - Haut  : y=0..23 (titre + marge blanche), contenu réel commence y=24
// Viridian City occupe ensuite ~712 px wide × 648 px tall depuis (8, 24).
const VIRIDIAN_W = 44                // (720 - 8) / 16 = 44.5, on prend 44
const VIRIDIAN_H = 40                // (672 - 24) / 16 = 40.5, on prend 40
const VIRIDIAN_IMAGE_TILE_SIZE = 16
const VIRIDIAN_ORIGIN_X = 8          // px image qui correspond à map (0, _)
const VIRIDIAN_ORIGIN_Y = 24         // px image qui correspond à map (_, 0)

export const YELLOW_MAPS: Record<string, YellowMapData> = {
    [YELLOW_ENTRANCE_MAP_ID]: {
        id: YELLOW_ENTRANCE_MAP_ID,
        name: "VILLE JAUNE",
        tiles: buildViridianCollisions(),
        width: VIRIDIAN_W,
        height: VIRIDIAN_H,
        // Bâtiments visuellement déjà dans l'image. Le buildings array sert
        // uniquement à : 1) bloquer le mouvement dans les façades, 2) générer
        // les exits/warps via les positions de porte.
        buildings: TOWN_BUILDINGS,
        exits: exitsFromBuildings(TOWN_BUILDINGS),
        backgroundImage: "/yellow/sprites/viridian_full.png",
        backgroundImageWidth: 1360,
        backgroundImageHeight: 672,
        backgroundImageTileSize: VIRIDIAN_IMAGE_TILE_SIZE,
        backgroundImageOriginX: VIRIDIAN_ORIGIN_X,
        backgroundImageOriginY: VIRIDIAN_ORIGIN_Y,
    },
    yellow_shop: {
        id: "yellow_shop",
        name: "SHOP",
        tiles: buildShopInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_shop", 4, 6)],
    },
    yellow_casino: {
        id: "yellow_casino",
        name: "CASINO",
        tiles: buildCasinoInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_casino", 4, 6)],
    },
    yellow_infirmary: {
        id: "yellow_infirmary",
        name: "INFIRMERIE",
        tiles: buildInfirmaryInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_infirmary", 4, 6)],
    },
    yellow_arena: {
        id: "yellow_arena",
        name: "ARÈNE",
        tiles: buildArenaInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_arena", 4, 6)],
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
