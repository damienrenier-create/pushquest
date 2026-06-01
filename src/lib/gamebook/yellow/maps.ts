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
    /** v2 — Sheet de tiles "ground" (ex: herbe FireRed) avec N variantes
     *  réparties aléatoirement sur toutes les tiles "grass" de la map. */
    groundSheet?: {
        url: string
        tileSize: number
        gap: number
        count: number
    }
    /** v2 — URL d'une tile 16×16 utilisée pour rendre toutes les cases "grassTall"
     *  de la map (visuel uniforme + collision walkable + future wild encounters). */
    tallGrassUrl?: string
    /** v2 — Régions de sprite : rectangles fixes avec une image source qui couvre
     *  exactement w×h tiles. Utilisé pour cloner des zones de Viridian (eau, bordures
     *  d'arbres, etc.) au pixel près. Affiché par-dessus le rendu CSS des tiles. */
    spriteRegions?: Array<{
        x: number     // col de départ
        y: number     // row de départ
        w: number     // largeur en tiles
        h: number     // hauteur en tiles
        url: string   // URL du sprite (taille native = w*16 × h*16 px)
    }>
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
    // 6 cols × 5 rows = 30 tiles d'eau (user a corrigé : va jusqu'à row 30 pas 31).
    for (let y = 26; y <= 30; y++) for (let x = 11; x <= 16; x++) m[y][x] = "water"

    // === OVERRIDES walkable (À LA FIN pour effacer les blocages au besoin) ===
    // Petite zone herbe (6,15), (7,15)
    m[15][6] = "grass"; m[15][7] = "grass"
    // Path vertical col 8 rows 5..16 (perce le forêt gauche)
    for (let y = 5; y <= 16; y++) m[y][8] = "grass"
    // Ligne herbe (0..8, 16)
    for (let x = 0; x <= 8; x++) m[16][x] = "grass"
    // Rows 17, 18, 19 walkable cols 0..22 (bande horizontale path/sand qui
    // traverse la forêt gauche — user : "la ligne 17, 18 et 19 c'est pareil")
    for (let y = 17; y <= 19; y++) for (let x = 0; x <= 22; x++) m[y][x] = "grass"
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

// === ROUTE NORD = future zone Pokémon (placeholder grass/trees) ==========
// 44×40 (même taille que Viridian per user 2026-05-31).
// Bordures d'arbres SAUF cols 19..23 row 39 (sortie sud vers Viridian, aligné
// avec l'exit nord de Viridian aux mêmes cols).
// Intérieur : herbe avec patches de grassTall pour faune sauvage future.
const NORTH_W = 44
const NORTH_H = 40

// === Helpers décor déterministe ========================================

/** Mulberry32 PRNG. Permet un layout stable entre les renders. */
function mulberry32(seed: number): () => number {
    let s = seed >>> 0
    return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface DecorPos { x: number; y: number }

/** Place `count` décors de taille (w, h) sans chevauchement, sur cases isUsable. */
function placeDecors(
    W: number,
    H: number,
    count: number,
    w: number,
    h: number,
    seed: number,
    isUsable: (x: number, y: number) => boolean,
): DecorPos[] {
    const rng = mulberry32(seed)
    const used = new Set<string>()
    const out: DecorPos[] = []
    let attempts = 0
    while (out.length < count && attempts < count * 200) {
        attempts++
        const x = Math.floor(rng() * (W - w + 1))
        const y = Math.floor(rng() * (H - h + 1))
        let valid = true
        for (let dy = 0; dy < h && valid; dy++) {
            for (let dx = 0; dx < w && valid; dx++) {
                const cx = x + dx, cy = y + dy
                if (!isUsable(cx, cy)) valid = false
                else if (used.has(`${cx},${cy}`)) valid = false
            }
        }
        if (valid) {
            for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) used.add(`${x + dx},${y + dy}`)
            out.push({ x, y })
        }
    }
    return out
}

interface NorthBuild {
    tiles: TileType[][]
    trees: DecorPos[]
    flowers: DecorPos[]
    bushes: DecorPos[]
    signs: DecorPos[]
}

function buildNorthRoute(): NorthBuild {
    const W = NORTH_W, H = NORTH_H
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) row.push("grass")
        m.push(row)
    }
    // Bordure ouest épaissie : cols 0 ET 1 = trees (clone du double sapin Viridian côté est)
    // (s'étend jusqu'en haut, sert aussi de barrière nord côté ouest)
    for (let y = 0; y < H; y++) { m[y][0] = "tree"; m[y][1] = "tree" }
    // Bordure nord (rows 0-3) :
    //   - cols 2-3   = grass walkable (user spec)
    //   - col 4      = mountain segment (clone Viridian)
    //   - cols 5-40  = mountain strip (interior)
    //   - col 41     = mountain segment (clone Viridian)
    for (let y = 0; y <= 3; y++) {
        for (let x = 4; x <= 41; x++) m[y][x] = "tree"
    }
    // Bordure est épaissie : cols 42 ET 43 = trees (clone du double sapin Viridian)
    for (let y = 0; y < H; y++) { m[y][W - 1] = "tree"; m[y][W - 2] = "tree" }
    // Patches grassTall scatterés (placeholder wild grass)
    for (let y = 4; y <= 8; y++) for (let x = 5; x <= 12; x++) m[y][x] = "grassTall"
    for (let y = 10; y <= 14; y++) for (let x = 25; x <= 35; x++) m[y][x] = "grassTall"
    for (let y = 18; y <= 22; y++) for (let x = 12; x <= 20; x++) m[y][x] = "grassTall"
    for (let y = 25; y <= 30; y++) for (let x = 28; x <= 38; x++) m[y][x] = "grassTall"
    // 4 plans d'eau cloned de Viridian (chacun 6 cols × 5 rows = sprite water_viridian)
    // Plan d'eau 1 : haut-droite (35-40, 3-7)
    for (let y = 3; y <= 7; y++) for (let x = 35; x <= 40; x++) m[y][x] = "water"
    // Plan d'eau 2 : bas-gauche (5-10, 25-29)
    for (let y = 25; y <= 29; y++) for (let x = 5; x <= 10; x++) m[y][x] = "water"
    // Plan d'eau 3 : mid-haut centre-droite (28-33, 12-16)
    for (let y = 12; y <= 16; y++) for (let x = 28; x <= 33; x++) m[y][x] = "water"
    // Plan d'eau 4 : mid-bas centre-gauche (13-18, 20-24)
    for (let y = 20; y <= 24; y++) for (let x = 13; x <= 18; x++) m[y][x] = "water"
    // === Bloc montagne (clone Viridian cols 0-4 rows 2-11) ===
    // Position : cols 4-8 rows 4-13 = extension naturelle de la mini-montagne
    // col 4 (rows 0-3). Évite les 4 mares.
    for (let y = 4; y <= 13; y++) for (let x = 4; x <= 8; x++) m[y][x] = "tree"
    // === COLLISIONS du bas (rows 35-39) = clone des walkables Viridian ===
    // Viridian source pour la zone clonée :
    //   - cols 14-21 = forêt centre-bas = tree
    //   - cols 22-25 = sortie Route 1 sand = grass walkable
    //   - cols 26-43 = forêt bas-droite = tree
    // Cols 0-13 = répétition de cols 14-15 (forêt centre-bas) = tree
    for (let y = 35; y <= 39; y++) {
        for (let x = 0; x <= 21; x++) m[y][x] = "tree"
        for (let x = 22; x <= 25; x++) m[y][x] = "grass"
        for (let x = 26; x < W; x++) m[y][x] = "tree"
    }
    // === DÉCORS aléatoires déterministes (sapins / fleurs / buissons) ====
    // Zone d'éligibilité : intérieur jouable rows 4-34 cols 2-41, herbe simple uniquement.
    const isUsable = (x: number, y: number): boolean => {
        if (x < 2 || x > 41) return false
        if (y < 4 || y > 34) return false
        return m[y][x] === "grass"
    }
    // 1) Sapins (clone Viridian 12-13 × 23-25, footprint 2×3, BLOQUANTS)
    const trees = placeDecors(W, H, 10, 2, 3, 0x1234abcd, isUsable)
    for (const p of trees) {
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) m[p.y + dy][p.x + dx] = "tree"
    }
    // 2) Buissons (clone Viridian 19.13, 1×1, BLOQUANT comme dans la source)
    const bushes = placeDecors(W, H, 40, 1, 1, 0xfeedbeef, isUsable)
    for (const p of bushes) m[p.y][p.x] = "tree"
    // 3) Panneaux (clone Viridian 20.31, 1×1, BLOQUANT comme dans la source)
    const signs = placeDecors(W, H, 8, 1, 1, 0xa1c0de42, isUsable)
    for (const p of signs) m[p.y][p.x] = "tree"
    // 4) Fleurs (clone Viridian 37.26, 1×1, WALKABLE comme dans la source)
    const flowers = placeDecors(W, H, 40, 1, 1, 0x5a5a5a5a, isUsable)
    // 4) Haute herbe (tile herbes 1 bottom-left) sur 3/4 des cases grass restantes
    //    Filtre : zone jouable, type "grass" (donc pas tree/water/grassTall), et
    //    pas sous une fleur (pour garder les fleurs visibles).
    const flowerKeys = new Set(flowers.map((f) => `${f.x},${f.y}`))
    const candidates: DecorPos[] = []
    for (let y = 4; y <= 34; y++) {
        for (let x = 2; x <= 41; x++) {
            if (m[y][x] === "grass" && !flowerKeys.has(`${x},${y}`)) {
                candidates.push({ x, y })
            }
        }
    }
    // Shuffle déterministe puis prendre 3/4
    const rngTall = mulberry32(0xc0ffee42)
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rngTall() * (i + 1))
        const tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp
    }
    const tallCount = Math.floor(candidates.length * 0.75)
    for (let i = 0; i < tallCount; i++) {
        const p = candidates[i]
        m[p.y][p.x] = "grassTall"
    }
    return { tiles: m, trees, flowers, bushes, signs }
}

const NORTH_BUILD = buildNorthRoute()
const NORTH_DECOR_REGIONS: Array<{ x: number; y: number; w: number; h: number; url: string }> = [
    ...NORTH_BUILD.trees.map((p) => ({ x: p.x, y: p.y, w: 2, h: 3, url: "/yellow/sprites/viridian_tree_12_13_23_25.png" })),
    ...NORTH_BUILD.bushes.map((p) => ({ x: p.x, y: p.y, w: 1, h: 1, url: "/yellow/sprites/viridian_bush_19_13.png" })),
    ...NORTH_BUILD.signs.map((p) => ({ x: p.x, y: p.y, w: 1, h: 1, url: "/yellow/sprites/viridian_sign_20_31.png" })),
    ...NORTH_BUILD.flowers.map((p) => ({ x: p.x, y: p.y, w: 1, h: 1, url: "/yellow/sprites/viridian_flower_37_26.png" })),
]

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
        exits: [
            ...exitsFromBuildings(TOWN_BUILDINGS),
            // Sortie nord (19-23, 0) → Route Nord (futur monde Pokémon)
            // Le bas de Route Nord est cloné de Viridian : sortie sable Route 1
            // visible aux cols 22-25 rows 35-39 → on spawn dans cette bande.
            ...[19, 20, 21, 22, 23].map((col) => ({
                x: col,
                y: 0,
                targetMapId: "yellow_route_nord",
                targetSpawnX: 23,  // centre de la nouvelle bande sable (cols 22-25)
                targetSpawnY: 38,  // 1 row au-dessus de la bordure sud (row 39)
            })),
        ],
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
    yellow_route_nord: {
        id: "yellow_route_nord",
        name: "ROUTE NORD",
        tiles: NORTH_BUILD.tiles,
        width: NORTH_W,
        height: NORTH_H,
        // Sortie sud (cols 22..25, row 39) → retour Viridian sur col 21 row 1.
        // Alignée sur la bande sable cloné de Viridian (cols 22-25).
        exits: [22, 23, 24, 25].map((col) => ({
            x: col,
            y: NORTH_H - 1,
            targetMapId: YELLOW_ENTRANCE_MAP_ID,
            targetSpawnX: 21,
            targetSpawnY: 1,
        })),
        // Tapis d'herbe FireRed : 4 variantes 16×16 séparées par 1px gap
        groundSheet: {
            url: "/yellow/sprites/herbes_2_t.png",
            tileSize: 16,
            gap: 1,
            count: 4,
        },
        // Haute herbe (herbes 1 bottom-left) appliquée à toutes les tiles grassTall
        tallGrassUrl: "/yellow/sprites/herbe_haute_h1.png",
        // Régions sprite clonées depuis Viridian au pixel près :
        // - 2 plans d'eau (6×5 chacun) = sprite eau Viridian 96×80
        // - Bordure est trees (cols 42-43, all rows) = sprite Viridian est 32×640
        // - Bordure ouest trees (cols 0-1, all rows)  = même sprite (double sapin)
        // - Bordure sud (rows 35-39) :
        //     * cols 14-43 = clone exact du bas Viridian (forêt + sortie sable)
        //     * cols 0-13 = répétition 7x de la slice 2-col cols 14-15 de Viridian
        spriteRegions: [
            { x: 35, y: 3, w: 6, h: 5, url: "/yellow/sprites/water_viridian.png" },
            { x: 5, y: 25, w: 6, h: 5, url: "/yellow/sprites/water_viridian.png" },
            { x: 28, y: 12, w: 6, h: 5, url: "/yellow/sprites/water_viridian.png" },
            { x: 13, y: 20, w: 6, h: 5, url: "/yellow/sprites/water_viridian.png" },
            { x: 42, y: 0, w: 2, h: NORTH_H, url: "/yellow/sprites/trees_east_border.png" },
            { x: 0, y: 0, w: 2, h: NORTH_H, url: "/yellow/sprites/trees_east_border.png" },
            // Bordure nord (rows 0-3) découpée :
            //   col 4    = clone Viridian col 0 rows 8-11 (ordre naturel)
            //   cols 5-40 = strip large mountain interior (Viridian col 0 rows 12-15 répété 36x)
            //   col 41   = clone Viridian col 7 rows 11-14 (ordre naturel)
            { x: 4, y: 0, w: 1, h: 4, url: "/yellow/sprites/viridian_mountain_col4.png" },
            { x: 5, y: 0, w: 36, h: 4, url: "/yellow/sprites/viridian_top_strip_36.png" },
            { x: 41, y: 0, w: 1, h: 4, url: "/yellow/sprites/viridian_mountain_col41.png" },
            // Bloc montagne 5×10 (clone Viridian cols 0-4 rows 2-11)
            { x: 4, y: 4, w: 5, h: 10, url: "/yellow/sprites/viridian_mountain_block_0_4_2_11.png" },
            { x: 14, y: 35, w: 30, h: 5, url: "/yellow/sprites/viridian_bottom_14_43.png" },
            { x: 0, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 2, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 4, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 6, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 8, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 10, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            { x: 12, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_bottom_14_15.png" },
            // Sud-ouest : clone du sud-est (cols 42-43 rows 35-39) pour avoir
            // le même bandeau sapin que la bordure est, plutôt que la forêt centre-bas.
            { x: 0, y: 35, w: 2, h: 5, url: "/yellow/sprites/viridian_se_corner_42_43_35_39.png" },
            // Décors générés déterministiquement : 10 sapins 2×3 + 40 buissons + 40 fleurs
            ...NORTH_DECOR_REGIONS,
        ],
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
