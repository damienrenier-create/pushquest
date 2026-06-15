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
    /** WIP : force la grille debug sur cette map (sans ?grid). À retirer à la livraison. */
    debugGrid?: boolean
    /** WIP : met en pause les rencontres sauvages sur cette map (le temps de caler la grille). */
    encountersPaused?: boolean
    /** BROUILLARD (manoir hanté) : on ne voit qu'un rayon de 1 case autour du joueur, le reste
     *  est noir et la zone éclairée SUIT le joueur (les cases se révèlent quand on arrive à côté). */
    darkness?: boolean
    /** LABYRINTHE INVISIBLE (manoir hanté) : murs sur les ARÊTES entre cases. Les cases restent
     *  praticables/visibles, mais une arête barrée empêche la transition case→voisine (on tourne
     *  sur place comme un mur). v[y][x] = mur entre (x,y) et (x+1,y) ; h[y][x] = mur entre (x,y) et
     *  (x,y+1). Lu par tryMove. Combiné à darkness = labyrinthe qu'on découvre au toucher. */
    edgeWalls?: { v: boolean[][]; h: boolean[][] }
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
        targetMapId: "yellow_sbire",    // antre du sbire du dieu Spaghetti
        targetSpawnX: 4, targetSpawnY: 5,
        displayName: "ANTRE",
        kind: "casino",
    },
    {
        // GYM : toit (33-38, 6) à (33-38, 8), porte (36, 10)
        id: "b_arena",
        x: 33, y: 6, w: 6, h: 4,        // footprint cols 33..38, rows 6..9
        doorX: 3, doorY: 4,             // porte abs (36, 10) — devant le bâtiment
        targetMapId: "yellow_arena",
        targetSpawnX: 7, targetSpawnY: 8,
        displayName: "GYM",
        kind: "arena",
    },
    {
        // MAISON NPC (placeholder casino) : toit (24-28, 16), porte (25, 18)
        id: "b_casino",
        x: 24, y: 16, w: 5, h: 2,       // footprint cols 24..28, rows 16..17
        doorX: 1, doorY: 2,             // porte abs (25, 18) — devant le bâtiment
        targetMapId: "yellow_casino",
        targetSpawnX: 10, targetSpawnY: 10,
        displayName: "MAISON",
        kind: "casino",
    },
    {
        // MART : toit (34-37, 16), descend à (34-37, 19), porte (36, 19)
        id: "b_shop",
        x: 34, y: 16, w: 4, h: 4,       // footprint cols 34..37, rows 16..19
        doorX: 2, doorY: 3,             // porte abs (36, 19) — dans le footprint (walkable)
        targetMapId: "yellow_shop",
        targetSpawnX: 4, targetSpawnY: 6,
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
        targetSpawnX: 7, targetSpawnY: 7,
        displayName: "PC",
        kind: "infirmary",
    },
]

// === Intérieurs : 4 maps 9×7 ============================================

// Boutique : grille 11×8 calée sur shop.png. Collisions relevées sur grille avec
// Sartay (coordonnées exactes : murs par défaut, on n'ouvre QUE les cases listées).
function buildShopInterior(): TileType[][] {
    const m = fillRoom(11, 8, "floorChecker")
    // Cases rendues walkable en plus (bordure basse + coin bas-gauche + 7,7) — relevé Sartay.
    const walkable: [number, number][] = [
        [0, 5], [0, 6], [0, 7], [1, 7], [2, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
    ]
    for (const [x, y] of walkable) m[y][x] = "floorChecker"
    // Comptoir en L (shopCounter : nécessaire pour parler par-dessus depuis 1,5 → vendeur en 1,3).
    const counter: [number, number][] = [[1, 2], [2, 2], [1, 3], [2, 3], [1, 4], [2, 4]]
    for (const [x, y] of counter) m[y][x] = "shopCounter"
    // Mur du fond (toute la rangée 1) + frigo (6-7, 4-6) → bloqués.
    const walls: [number, number][] = [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
        [6, 4], [6, 5], [6, 6], [7, 4], [7, 5], [7, 6],
    ]
    for (const [x, y] of walls) m[y][x] = "shopShelf"
    // Entrée / sortie (2 cases) en bas
    m[7][3] = "doorMat"
    m[7][4] = "doorMat"
    return m
}

function buildCasinoInterior(): TileType[][] {
    // 22×12 calé sur casino_interior.png (1056×576, tile 48px). On part TOUT bloqué
    // puis on ouvre l'intérieur walkable ; le décor (machines à sous à gauche,
    // comptoir au centre, arène à droite) est déjà dessiné sur l'image. Les 3 zones
    // sont reliées (hub social). Sortie : porte en bas-centre.
    const W = 22, H = 12
    const m: TileType[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "shopCounter" as TileType))
    for (let y = 1; y <= 10; y++) for (let x = 1; x <= 20; x++) m[y][x] = "floorTile"
    for (let x = 1; x <= 6; x++) m[1][x] = "shopCounter"   // rangée des machines à sous (haut-gauche)
    for (let x = 9; x <= 12; x++) m[1][x] = "shopCounter"  // comptoir (haut-centre)
    m[11][10] = "doorMat"                                   // sortie (porte bas-centre)
    return m
}

// Antre du sbire du dieu Spaghetti : petite salle 9×7. Le sbire (PNJ y_sbire)
// se tient derrière un autel en (4,2) — case bloquée pour qu'on ne lui marche pas
// dessus (le moteur de mouvement ne teste pas les PNJ). On l'affronte depuis (4,3).
function buildSbireInterior(): TileType[][] {
    const m = fillRoom(9, 7, "floorTile")
    m[2][4] = "table"   // autel du sbire (case du PNJ, bloquante)
    m[6][4] = "doorMat" // sortie
    return m
}

// Centre Daemon : grille 14×9 calée sur l'image centre_interior.png (242×155).
// Collisions relevées sur grille avec Sartay (cases non-walkables ci-dessous).
function buildInfirmaryInterior(): TileType[][] {
    const m = fillRoom(14, 9, "floorTile")
    const blocked: [number, number][] = [
        // Mur/meubles du fond (rangée 1)
        [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
        // Comptoir de soins (la médecin est le PNJ en 7,2 ; on parle par-dessus depuis 7,4)
        [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
        [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
        // Mobilier gauche
        [2, 3], [1, 5], [2, 5], [1, 6], [2, 6],
        // Mobilier droite
        [11, 6], [12, 6], [11, 7], [12, 7],
        // Ordinateur PC (boîte) — PNJ "y_pc_box" placé dessus, activé depuis 10,2
        [10, 1],
    ]
    for (const [x, y] of blocked) m[y][x] = "shopCounter"
    // Porte de sortie au sud-centre (sous le spawn d'entrée 7,7)
    m[8][7] = "doorMat"
    // Escalier vers le LABO (étage) : case (2,6), à droite du meuble escalator.
    m[6][2] = "doorMat"
    return m
}

// LABO SCIENTIFIQUE (étage de l'infirmerie) : grille 14×10 calée sur lab_interior.png.
// Walkability relevée avec Sartay. (2,6)=arrivée depuis l'infi ; (1,6)=escalator
// descendant ; ordi en (3,3) [parlé depuis (3,4)] ; scientifique en (5,3) [depuis (5,4)].
function buildLabInterior(): TileType[][] {
    const W = 14, H = 10
    const m: TileType[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "shopCounter" as TileType))
    const open = (y: number, x0: number, x1: number) => { for (let x = x0; x <= x1; x++) m[y][x] = "floorTile" }
    open(4, 0, 10)
    open(5, 2, 10)
    open(6, 2, 6)
    open(7, 1, 4)
    open(8, 0, 4)
    open(9, 1, 4)
    m[6][1] = "doorMat" // escalator → descend à l'infirmerie
    return m
}

// Arène Plante "Bosquet Sacré" : 15×10 calée sur arena_plante.png (480×320, tile 32px).
// Plein écran (= viewport, pas de scroll). Bords bloquants, gros arbre central
// que l'on contourne par les côtés, entrée en bas-centre, estrade du Druide en
// haut-centre. PNJ : 2 gardes à gauche, 2 à droite, le Druide au centre-haut.
function buildArenaPlante(): TileType[][] {
    const W = 15, H = 10
    const m: TileType[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "grass" as TileType))
    const wall = (x: number, y: number) => { if (x >= 0 && x < W && y >= 0 && y < H) m[y][x] = "tree" }
    // Bordures
    for (let x = 0; x < W; x++) { wall(x, 0); wall(x, H - 1) }
    for (let y = 0; y < H; y++) { wall(0, y); wall(W - 1, y) }
    // Entrée / sortie bas-centre (ouverture dans la bordure)
    m[H - 1][7] = "grass"
    // Décor / estrade (collisions exactes — relevé Sartay sur la grille) :
    //   rangée 1 : piliers/décor en 1,4,6,8,10,13 ; colonnes de l'estrade 6 et 8 (rows 2-3) ;
    //   coins bas en (1,7)(1,8)(13,7)(13,8). Le centre 5-9 × 4-7 reste WALKABLE.
    const blocks: [number, number][] = [
        [1, 1], [4, 1], [6, 1], [8, 1], [10, 1], [13, 1],
        [6, 2], [6, 3], [8, 2], [8, 3],
        [1, 7], [1, 8], [13, 7], [13, 8],
    ]
    for (const [x, y] of blocks) wall(x, y)
    // (Les cases des PNJ — druide 7,1 ; gardes 2,1/3,1/11,1/12,1 — sont rendues
    //  non-walkables globalement par gameStore.move ; plus besoin de les bloquer ici.)
    return m
}

// Grotte Roche : 30×31, calée sur grotte.png (720×744, tile 24px). Collisions
// EXTRAITES du masque peint par Sartay (zones blanches = non-walkable). X = mur,
// . = sol praticable. Porte/sortie = (25,5) (trou noir haut-droite).
const GROTTE_MASK = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXX..XX..X...XXXXXXX",
    "XXXXXXXXXXXXX..XXX....XXXXXXXX",
    "XXXXXXXXXXXXX..XX.........XXXX",
    "XXXXXXXXXX.....XX..........XXX",
    "XXXXXXXXXX.....XX..........XXX",
    "XXXXXXXXXX.................XXX",
    "XXXXXXX....................XXX",
    "XXXXXXX........XXX..XX....XXXX",
    "XXXXXXX........XXX..XX....XXXX",
    "XXXXXXX........XXX..XX....XXXX",
    "XXXXXXX.............XX....XXXX",
    "XXXXXXX..............XXXXXXXXX",
    "XXXXXXX...............XXXXXXXX",
    "XXXXXX.................XXXXXXX",
    "XXXX...................XXXXXXX",
    "XXXXXXXXXXXXXXX........XXXXXXX",
    "XXXXXXXXXXXXXXXX..........XXXX",
    "XXXXXXXXXXXXXXXX...........XXX",
    "XXXXXXXXXXXXXXXX...........XXX",
    "XXXXXXXXXXXXX..............XXX",
    "XXXXXXXX...................XXX",
    "XXXXXXXX...................XXX",
    "XXXXX......................XXX",
    "XXXX.......................XXX",
    "XXXX.....XXXXXXXXX.........XXX",
    "XXXX.....XXXXXXXXX........XXXX",
    "XXXX....XXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
]
function buildGrotte(): TileType[][] {
    return GROTTE_MASK.map((row) => [...row].map((ch) => (ch === "X" ? "tree" : "grass") as TileType))
}

// Arène Roche "Caverne Minière" : 15×10, calée sur arena_roche.png. Zone walkable
// (relevé Sartay) : y4-7 → x5-9 ; y8-9 → x6-8 (y9 = entrée/sortie). Le reste bloqué.
// PNJ en bordure : Boss (7,3), gardes (4,5)(4,7)(10,5)(10,7) — on leur parle de côté.
function buildArenaRoche(): TileType[][] {
    const W = 15, H = 10
    const m: TileType[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "tree" as TileType))
    const walk = (y: number, xs: number[]) => { for (const x of xs) m[y][x] = "grass" }
    walk(4, [5, 6, 7, 8, 9]); walk(5, [5, 6, 7, 8, 9]); walk(6, [5, 6, 7, 8, 9]); walk(7, [5, 6, 7, 8, 9])
    walk(8, [6, 7, 8]); walk(9, [6, 7, 8])
    return m
}

// Arène de Feu "La Caldeira" : 16×16 calée sur fire_arena_interior.png (1024², tile 64,
// art décalé +32px pour centrer le couloir sur la colonne 8). X = mur/lave, . = sol.
// Les cellules des dresseuses (boss 8,2 + 4 gardes) sont des MURS (PNJ posés dessus,
// le moteur de mouvement ne teste pas les PNJ → on bloque la case). Collision per Sartay.
const ARENA_FEU_MASK = [
    "XXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXX",
    "XX..X...X..XX.XX",
    "XX.XX......XXXXX",
    "XX..X......XX.XX",
    "XX..XXXX.XXXX.XX",
    "XX..XXX...XXX.XX",
    "XX...X.....X..XX",
    "XX............XX",
    "XX............XX",
    "XX............XX",
    "XX............XX",
    "XX............XX",
    "XX............XX",
    "XXXXXXXX.XXXXXXX",
    "XXXXXXXX.XXXXXXX",
]
function buildArenaFeu(): TileType[][] {
    return ARENA_FEU_MASK.map((row) => [...row].map((ch) => (ch === "X" ? "tree" : "grass") as TileType))
}

// Arène ÉLECTRIQUE "LA TOUR HERTZ" (4e arène) — 15×10, fond = elec_arena_interior.png.
// Collisions calées sur le décor (Sartay) : bordure haut (l.0) / bas (l.9 sauf porte 7,9) /
// gauche (col 0) / droite (col 14) + plateau du boss (cols 6 & 8, lignes 0-2). Le reste = sol.
function buildArenaElec(): TileType[][] {
    const W = 15, H = 10
    const wall = (x: number, y: number) =>
        y === 0 || x === 0 || x === 14 || (y === 9 && x !== 7) || ((x === 6 || x === 8) && y <= 2)
    return Array.from({ length: H }, (_, y) =>
        Array.from({ length: W }, (_, x) => (wall(x, y) ? "tree" : "grass") as TileType))
}

/**
 * Quelle arène se trouve derrière la porte du GYM, selon la progression (badges) ?
 * Le bâtiment se "réorganise" : Plante tant que non obtenu, puis Roche, Feu, puis Électrique.
 */
export function currentArenaMapId(badges: readonly string[]): string {
    if (!badges.includes("plante")) return "yellow_arena"
    if (!badges.includes("roche")) return "yellow_arena_roche"
    if (!badges.includes("feu")) return "yellow_arena_feu"
    if (!badges.includes("elec")) return "yellow_arena_elec"
    return "yellow_arena_elec" // placeholder jusqu'à la prochaine arène
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
    minDist = 0, // distance (Chebyshev) minimale entre 2 décors → dispersion
): DecorPos[] {
    const rng = mulberry32(seed)
    const used = new Set<string>()
    const out: DecorPos[] = []
    let attempts = 0
    while (out.length < count && attempts < count * 400) {
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
        if (valid && minDist > 0) {
            for (const p of out) { if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) < minDist) { valid = false; break } }
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
    // Sapin FIXE en (2,0) : footprint 2×3 → cols 2-3, rows 0-1-2 (bloquant).
    // Posé dans le "trou" grass entre la bordure ouest (cols 0-1) et la montagne nord (col 4).
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) m[dy][2 + dx] = "tree"
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
    // === Rectangle clone Viridian (14-18, 21-24) avec 2 buissons interieurs ===
    // Place à cols 25-29 rows 4-7 (top-mid, hors des 4 mares et du bloc montagne).
    // 5×4 = 20 cellules grass walkable (clone d une zone grass de Viridian).
    for (let y = 4; y <= 7; y++) for (let x = 25; x <= 29; x++) m[y][x] = "grass"
    // 2 buissons specifiques (clone Viridian 23.18, BLOQUANTS) places en diagonale
    // au sein du rectangle (positions relatives : +1/+1 et +3/+2 du coin haut-gauche)
    m[5][26] = "tree"
    m[6][28] = "tree"
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
    // Cellules réservées (clones spécifiques qui doivent rester telles quelles).
    const reservedCells = new Set<string>()
    // Bande row 34 cols 22-25 : clone de Viridian row 32 (transition path/sand vers sortie sud)
    for (let x = 22; x <= 25; x++) reservedCells.add(`${x},34`)
    // Rectangle clone Viridian (14-18, 21-24) -> dest (25-29, 4-7) + 2 buissons : tout réservé
    for (let y = 4; y <= 7; y++) for (let x = 25; x <= 29; x++) reservedCells.add(`${x},${y}`)
    // Zone d'éligibilité : intérieur jouable rows 4-34 cols 2-41, herbe simple uniquement.
    const isUsable = (x: number, y: number): boolean => {
        if (x < 2 || x > 41) return false
        if (y < 4 || y > 34) return false
        if (reservedCells.has(`${x},${y}`)) return false
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
    // 3) PANNEAUX-conseils (1×1, BLOQUANTS) : ~12, BIEN ESPACÉS (distance min 7) sur
    //    tout le parc → ce sont les hotspots-texte (PARK_SIGN_NPCS). Les buissons
    //    ci-dessus redeviennent du simple décor (verdure).
    const signs = placeDecors(W, H, 12, 1, 1, 0xa1c0de42, isUsable, 7)
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
            if (m[y][x] === "grass" && !flowerKeys.has(`${x},${y}`) && !reservedCells.has(`${x},${y}`)) {
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
    // Ouverture de la GROTTE creusée dans le flanc de la montagne nord (12,3) :
    // case walkable pour pouvoir y entrer (le sprite "bouche" est posé par-dessus).
    m[3][12] = "grass"
    return { tiles: m, trees, flowers, bushes, signs }
}

const NORTH_BUILD = buildNorthRoute()
/** Buissons (décor verdure) de la Route Nord. */
export const NORTH_BUSH_POSITIONS: ReadonlyArray<{ x: number; y: number }> = NORTH_BUILD.bushes
/** PANNEAUX-conseils espacés de la Route Nord (hotspots-texte). */
export const NORTH_SIGN_POSITIONS: ReadonlyArray<{ x: number; y: number }> = NORTH_BUILD.signs
const NORTH_DECOR_REGIONS: Array<{ x: number; y: number; w: number; h: number; url: string }> = [
    // Sapin fixe en (2,0) — footprint 2×3, même sprite que les sapins aléatoires.
    { x: 2, y: 0, w: 2, h: 3, url: "/yellow/sprites/viridian_tree_12_13_23_25.png" },
    ...NORTH_BUILD.trees.map((p) => ({ x: p.x, y: p.y, w: 2, h: 3, url: "/yellow/sprites/viridian_tree_12_13_23_25.png" })),
    // Buissons = décor verdure (sprite buisson) ; les PANNEAUX-conseils = sprite panneau.
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

// === CENDREVILLE — ville SCORCHED (art dédié `cendreville.png`, PAS un miroir de Viridian) ===
// Grille 44×37, tuiles image 16px → fond 704×592, origine (0,0) (l'art est croppé pile).
// Collisions PROCÉDURALES calées sur l'art (bordure de forêt calcinée + falaise est,
// bâtiments bloqués, étang, parterres/pelouse = rencontres). Affinable visuellement (?grid=1).
const CENDREVILLE_W = 44, CENDREVILLE_H = 37, CENDREVILLE_TILE = 16
// Arrivée depuis la VILLE (via ACE, passage ouest) → on entre par l'EST de Cendreville,
// juste devant la porte de sortie (43 × 15-17) : la porte est↔ouest est une seule et même
// liaison entre les deux cartes (« prolongement »). On regarde vers l'ouest (gauche).
export const CENDREVILLE_SPAWN = { x: 42, y: 16 }
// CENDREVILLE — collisions EXACTES relevées sur l'overlay REPEINT EN ROUGE par Sartay
// (2026-06-14, via scripts/analyze-cendreville-red.ts). '#' = mur (non walkable), '.' = walkable.
// 44 colonnes × 37 lignes. SOURCE DE VÉRITÉ = ce que Sartay a peint en rouge. Pour mettre à jour :
// repeindre debug-maps/cendreville_overlay.png, relancer le script d'analyse, coller la grille ici.
// L'art réel reste cendreville.png ; ici on ne gère QUE la collision (mur = "tree", walkable = "path").
const CENDREVILLE_COLLISION_MAP: string[] = [
    "######################.....#################", // 0
    "#######################....#################", // 1
    "######################.....#################", // 2
    "#####.............####.....#################", // 3
    "#####.............####...............#######", // 4
    ".####........................##......#######", // 5
    "#####...######............##########.#######", // 6
    "#####...######...#####....##########.#######", // 7
    "#####...######...#####....##########.#######", // 8
    "#####...##.####..######...##########.#######", // 9
    "#####............#..###...##########.#######", // 10
    "#################.........##########.#######", // 11
    "#####.....................##########.#######", // 12
    "######.....................#########.#######", // 13
    "######################....##########...#####", // 14
    "#####....#..#....#####...#.#########.......#", // 15
    "#####....####....######....................#", // 16
    "#####....#.##....##.###....................#", // 17
    "#####.................................######", // 18
    "#####.................................######", // 19
    "#####.............................##########", // 20
    "#####.............####............##########", // 21
    "#####............#####.........##.##########", // 22
    "#####.............####.........##.....######", // 23
    "#####.............#..#......######....######", // 24
    "#####.......................#....#....######", // 25
    "#####.......................#....#....######", // 26
    "#####.......................#....#....######", // 27
    "#######################...##################", // 28
    "#####.................................######", // 29
    "#####.................................######", // 30
    "#####..........................#############", // 31
    "#####..........................#############", // 32
    "####################....####################", // 33
    "####################....####################", // 34
    "####################....####################", // 35
    "####################....####################", // 36
]
function buildCendrevilleCollisions(): TileType[][] {
    const m = CENDREVILLE_COLLISION_MAP.map((row) =>
        Array.from(row, (c) => (c === "#" ? "tree" : "path") as TileType),
    )
    // PORTE DE SORTIE EST (43 × 15-17) : le bord est est peint en mur dans la carte rouge, mais
    // ces 3 cases SONT la sortie (→ ville). On les force walkable pour pouvoir y entrer.
    for (const y of [15, 16, 17]) m[y][CENDREVILLE_W - 1] = "path"
    return m
}

// === CENTRALE ÉLECTRIQUE (intérieur — bâtiment de Cendreville) ===
// Labyrinthe 40×36. Art = centrale.png (colorisée, 1080×972 = 40×36 @ 27px). Collisions relevées
// de l'art (sol beige/jaune = walkable) via scripts/gen-centrale-map.ts + 3 corrections de Sartay.
// On ENTRE par le SUD (porte centrale de Cendreville) et on SORT au NORD-OUEST (→ Cendreville,
// devant la porte). '#' = mur, '.' = sol walkable.
const CENTRALE_W = 40, CENTRALE_H = 36, CENTRALE_TILE = 27
const CENTRALE_COLLISION_MAP: string[] = [
    "########################################", // 0
    "#.######################################", // 1
    "#.####..#.##.#########...###############", // 2
    "#...##.......#####.......###.#####..####", // 3
    "#.......###.######.####..##..######...##", // 4
    "#.......##....##....###..##..#######..##", // 5
    "####..#####..#####..###..###.........###", // 6
    "#.......###..###....###..###.........###", // 7
    "#.......####.###.....##..##.......######", // 8
    "#...#...####.###.....##..##...##..######", // 9
    "#.......###....#......#..#....#....#####", // 10
    "........###...........#..#....#....#####", // 11
    "##################.####..#.............#", // 12
    "######..#...####....###..#####..########", // 13
    "####....#....###......#................#", // 14
    "##...........########################..#", // 15
    "##............####........#....#....#..#", // 16
    "##......#.....##########..########..#..#", // 17
    "#####...#####.###########.######....#..#", // 18
    "####....#####.##..##.#############..#..#", // 19
    "##......#.##...#...............#....#..#", // 20
    "##......#.........################..#..#", // 21
    "#..######..#####....................#..#", // 22
    "#..#####....#########################..#", // 23
    "#.....#####...#######.########.#####..##", // 24
    "#.......###...##..###.######...###....##", // 25
    "####..#######..#.......###......##...###", // 26
    "##......####...#.......#.............###", // 27
    "###...####........##.......###.#########", // 28
    "###...####........##.......###.#########", // 29
    "##...######.##################.#########", // 30
    "##...#####....#############.##..########", // 31
    "#......###....####....######.......##..#", // 32
    "#......###......##....###.##..####.###.#", // 33
    "#.......#...............#..............#", // 34
    "####..##################################", // 35
]
function buildCentraleCollisions(): TileType[][] {
    // Sol walkable = "grass" (et NON "path") : c'est un DONJON à rencontres → chaque case de sol
    // déclenche un roll sauvage (cf. gameStore : grass + backgroundImage + zone). Mur = "tree".
    const m = CENTRALE_COLLISION_MAP.map((row) =>
        Array.from(row, (c) => (c === "#" ? "tree" : "grass") as TileType),
    )
    // Corrections walkable de Sartay (col,row).
    for (const [x, y] of [[31, 20], [26, 16], [31, 16]] as const) m[y][x] = "grass"
    return m
}

// === MAISON HANTÉE (intérieur — bâtiment de Cendreville) ===
// Petite salle en CROIX, 22×16. Art = maison_hantee.png (968×704 = 22×16 @ 44px). Collisions
// relevées de l'overlay PEINT par Sartay (blanc/noir = non walkable, vert = porte) via
// scripts/analyze-maison-hantee.ts + flood-fill depuis la porte (élimine les fragments d'art isolés).
// On ENTRE par le SUD (porte 18-19,10 de Cendreville) et on SORT par la même porte bas-centre.
// BROUILLARD activé (darkness) : on ne voit qu'à 1 case. '#' = mur, '.' = sol, 'D' = porte (sortie).
const MAISON_HANTEE_W = 22, MAISON_HANTEE_H = 16, MAISON_HANTEE_TILE = 44
const MAISON_HANTEE_COLLISION_MAP: string[] = [
    "######################", // 0
    "######################", // 1
    "######################", // 2
    "######################", // 3
    "######################", // 4
    "########.....#########", // 5
    "########......########", // 6
    "#######........#######", // 7
    "#####............#####", // 8
    "#####...........######", // 9
    "######..........######", // 10
    "#####............#####", // 11
    "#####...........######", // 12
    "#########...##########", // 13
    "##########DD##########", // 14
    "##########DD##########", // 15
]
function buildMaisonHanteeCollisions(): TileType[][] {
    // Sol = "grass" → chaque case de sol déclenche une rencontre SPECTRE (cf. ZONES.yellow_maison_hantee :
    // règle gameStore "grass + backgroundImage + hasEncounters", façon Grotte/Centrale). Mur = "tree".
    // 'D' (porte de sortie) = "path" walkable MAIS sans rencontre (pas de combat-piège en sortant).
    return MAISON_HANTEE_COLLISION_MAP.map((row) =>
        Array.from(row, (c) => (c === "#" ? "tree" : c === "D" ? "path" : "grass") as TileType),
    )
}

// LABYRINTHE INVISIBLE : murs sur les ARÊTES, relevés du tracé NOIR de Sartay sur l'overlay
// (debug-maps/maison_hantee_check maze.png) via scripts/analyze-maison-hantee-maze.ts.
// '|' dans VWALLS = mur à DROITE de (x,y) ; '_' dans HWALLS = mur SOUS (x,y).
const MAISON_HANTEE_VWALLS: string[] = [
    "......................", // 0
    "......................", // 1
    "......................", // 2
    "......................", // 3
    "......................", // 4
    "......................", // 5
    "............|.........", // 6
    "..........|.|.........", // 7
    ".........|..|.........", // 8
    ".......|..|.|.|.......", // 9
    "............|.|.......", // 10
    "..............|.......", // 11
    "..............|.......", // 12
    "..........|...........", // 13
    "..........|...........", // 14
    "......................", // 15
]
const MAISON_HANTEE_HWALLS: string[] = [
    "......................", // 0
    "......................", // 1
    "......................", // 2
    "......................", // 3
    "......................", // 4
    "......................", // 5
    "........_.............", // 6
    "........._.__.........", // 7
    ".......___...._.......", // 8
    ".......__.____........", // 9
    "......_.__.__._.......", // 10
    "......._._._..........", // 11
    ".........._...........", // 12
    "......................", // 13
    "......................", // 14
    "......................", // 15
]
function buildMaisonHanteeEdges(): { v: boolean[][]; h: boolean[][] } {
    // On NE GARDE une arête que si elle sépare 2 cases PRATICABLES (sinon inerte : le joueur ne peut
    // pas s'y trouver/y entrer). Ça nettoie les artefacts du fond rouge hors de la salle en croix.
    const walk = (x: number, y: number) => {
        const row = MAISON_HANTEE_COLLISION_MAP[y]
        return !!row && x >= 0 && x < row.length && row[x] !== "#"
    }
    const v = MAISON_HANTEE_VWALLS.map((row, y) => Array.from(row, (c, x) => c === "|" && walk(x, y) && walk(x + 1, y)))
    const h = MAISON_HANTEE_HWALLS.map((row, y) => Array.from(row, (c, x) => c === "_" && walk(x, y) && walk(x, y + 1)))
    return { v, h }
}

// === HAUTES HERBES DU NORD (plaine d'entraînement de Cendreville) ===
// 4 carrés d'herbes HAUTES 4×5 (= 4 types) où le NIVEAU est choisi par la LIGNE (N3-6 en bas → N15-18
// en haut). Allées en herbe BASSE (grass → groundSheet, walkable sans rencontre), bordure de sapins
// (tree → TreeSprite). Encounters = grassTall (cf. ZONES.yellow_hautes_herbes, grille d'entraînement).
const HH_W = 24, HH_H = 10
const HH_SQUARES: ReadonlyArray<readonly [number, number]> = [[2, 5], [7, 10], [12, 15], [17, 20]]
function buildHautesHerbes(): TileType[][] {
    const m: TileType[][] = Array.from({ length: HH_H }, () => Array.from({ length: HH_W }, () => "tree" as TileType))
    // Rows 2-6 = les carrés (grassTall) séparés par des allées (grass). Row bottom (6) = band 0 (N3-6).
    for (let y = 2; y <= 6; y++) {
        for (let x = 2; x <= 21; x++) {
            m[y][x] = HH_SQUARES.some(([a, b]) => x >= a && x <= b) ? "grassTall" : "grass"
        }
    }
    for (let x = 2; x <= 21; x++) { m[7][x] = "grass"; m[8][x] = "grass" } // couloir bas (herbe basse, walkable)
    m[9][11] = "grass"; m[9][12] = "grass" // trouée sud (sortie vers Cendreville)
    return m
}

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
    yellow_cendreville: {
        id: "yellow_cendreville",
        name: "CENDREVILLE",
        tiles: buildCendrevilleCollisions(),
        width: CENDREVILLE_W,
        height: CENDREVILLE_H,
        // SORTIE EST (43 × 15-17) = prolongement de la sortie OUEST de la ville. On ressort
        // dans le passage ouest de la ville (1,17), juste à côté d'ACE.
        // (Les ouvertures NORD haut et SUD cols 20-23 sont des CULS-DE-SAC : routes pas encore codées.)
        exits: [
            ...[15, 16, 17].map((y) => ({ x: 43, y, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 1, targetSpawnY: 17 })),
            // Porte de la CENTRALE ÉLECTRIQUE (19,17) → intérieur, on entre par le SUD.
            { x: 19, y: 17, targetMapId: "yellow_centrale", targetSpawnX: 5, targetSpawnY: 34 },
            // SHOP (10,17) et CENTRE POKÉMON (19,24 / 20,24) : intérieurs PARTAGÉS avec la ville.
            // Le retour est redirigé vers Cendreville par le store (interiorReturn).
            { x: 10, y: 17, targetMapId: "yellow_shop", targetSpawnX: 4, targetSpawnY: 6 },
            { x: 19, y: 24, targetMapId: "yellow_infirmary", targetSpawnX: 7, targetSpawnY: 7 },
            { x: 20, y: 24, targetMapId: "yellow_infirmary", targetSpawnX: 7, targetSpawnY: 7 },
            // MAISON HANTÉE (porte 18-19,10) → intérieur, spawn juste au-dessus de la porte (10,13).
            { x: 18, y: 10, targetMapId: "yellow_maison_hantee", targetSpawnX: 10, targetSpawnY: 13 },
            { x: 19, y: 10, targetMapId: "yellow_maison_hantee", targetSpawnX: 10, targetSpawnY: 13 },
            // OUVERTURE NORD (row 0, cols 22-26) → PLAINE D'ENTRAÎNEMENT (hautes herbes), spawn couloir bas.
            ...[22, 23, 24, 25, 26].map((x) => ({ x, y: 0, targetMapId: "yellow_hautes_herbes", targetSpawnX: 11, targetSpawnY: 8 })),
        ],
        backgroundImage: "/yellow/sprites/cendreville.png",
        backgroundImageWidth: CENDREVILLE_W * CENDREVILLE_TILE,   // 704
        backgroundImageHeight: CENDREVILLE_H * CENDREVILLE_TILE,  // 592
        backgroundImageTileSize: CENDREVILLE_TILE,
        backgroundImageOriginX: 0,
        backgroundImageOriginY: 0,
        debugGrid: false,       // grille de calage coupée (on garde ?grid=1 en dev si besoin)
        encountersPaused: true, // WIP : pas de rencontres le temps de finaliser la map
    },
    yellow_centrale: {
        id: "yellow_centrale",
        name: "CENTRALE",
        tiles: buildCentraleCollisions(),
        width: CENTRALE_W,
        height: CENTRALE_H,
        // ENTRÉE = sud (porte de Cendreville, spawn 5,34) — SANS RETOUR : on ne peut PAS ressortir par
        // le sud. SORTIE UNIQUE = nord-ouest (0,11) → Cendreville devant la porte (19,18). Le joueur
        // DOIT traverser le donjon. Pas de soft-lock : la sortie NW est toujours atteignable depuis le
        // spawn (labyrinthe entièrement connecté, vérifié).
        exits: [
            { x: 0, y: 11, targetMapId: "yellow_cendreville", targetSpawnX: 19, targetSpawnY: 18 }, // SORTIE UNIQUE (nord-ouest)
        ],
        backgroundImage: "/yellow/sprites/centrale.png",
        backgroundImageWidth: CENTRALE_W * CENTRALE_TILE,   // 1080
        backgroundImageHeight: CENTRALE_H * CENTRALE_TILE,  // 972
        backgroundImageTileSize: CENTRALE_TILE,
        backgroundImageOriginX: 0,
        backgroundImageOriginY: 0,
        debugGrid: false,       // grille de calage coupée (on garde ?grid=1 en dev si besoin)
        encountersPaused: false, // rencontres Élec ACTIVES (cf. ZONES.yellow_centrale)
    },
    yellow_maison_hantee: {
        id: "yellow_maison_hantee",
        name: "MAISON HANTÉE",
        tiles: buildMaisonHanteeCollisions(),
        width: MAISON_HANTEE_W,
        height: MAISON_HANTEE_H,
        // ENTRÉE/SORTIE = la porte bas-centre (cols 10-11, rows 14-15). On entre depuis Cendreville
        // (porte 18-19,10) et on spawn juste au-dessus de la porte (10,13). Toute case de porte
        // ramène à Cendreville devant la maison (18,11).
        exits: [
            { x: 10, y: 14, targetMapId: "yellow_cendreville", targetSpawnX: 18, targetSpawnY: 11 },
            { x: 11, y: 14, targetMapId: "yellow_cendreville", targetSpawnX: 18, targetSpawnY: 11 },
            { x: 10, y: 15, targetMapId: "yellow_cendreville", targetSpawnX: 18, targetSpawnY: 11 },
            { x: 11, y: 15, targetMapId: "yellow_cendreville", targetSpawnX: 18, targetSpawnY: 11 },
        ],
        backgroundImage: "/yellow/sprites/maison_hantee.png",
        backgroundImageWidth: MAISON_HANTEE_W * MAISON_HANTEE_TILE,   // 968
        backgroundImageHeight: MAISON_HANTEE_H * MAISON_HANTEE_TILE,  // 704
        backgroundImageTileSize: MAISON_HANTEE_TILE,
        backgroundImageOriginX: 0,
        backgroundImageOriginY: 0,
        darkness: true,         // brouillard : on ne voit qu'à 1 case (atmosphère manoir hanté)
        edgeWalls: buildMaisonHanteeEdges(), // labyrinthe INVISIBLE : murs sur les arêtes (tracé de Sartay)
        encountersPaused: false, // rencontres SPECTRES ACTIVES (cf. ZONES.yellow_maison_hantee)
    },
    yellow_hautes_herbes: {
        id: "yellow_hautes_herbes",
        name: "HAUTES HERBES",
        tiles: buildHautesHerbes(),
        width: HH_W,
        height: HH_H,
        // ENTRÉE depuis Cendreville (ouverture nord) → spawn couloir bas (11,8). SORTIE = trouée sud (11-12,9).
        exits: [
            { x: 11, y: 9, targetMapId: "yellow_cendreville", targetSpawnX: 24, targetSpawnY: 1 },
            { x: 12, y: 9, targetMapId: "yellow_cendreville", targetSpawnX: 24, targetSpawnY: 1 },
        ],
        // Herbe basse (allées) = sheet 4 variantes 16px gap1 ; herbe HAUTE (carrés) = tuile unique.
        groundSheet: { url: "/yellow/sprites/herbes_2.png", tileSize: 16, gap: 1, count: 4 },
        tallGrassUrl: "/yellow/sprites/herbe_haute_h1.png",
        encountersPaused: false, // rencontres d'entraînement ACTIVES (cf. ZONES.yellow_hautes_herbes)
    },
    yellow_shop: {
        id: "yellow_shop",
        name: "SHOP",
        tiles: buildShopInterior(),
        width: 11,
        height: 8,
        exits: [returnExit("yellow_shop", 3, 7), returnExit("yellow_shop", 4, 7)],
        backgroundImage: "/yellow/sprites/shop.png",
        backgroundImageWidth: 189,
        backgroundImageHeight: 137,
        backgroundImageTileSize: 189 / 11,
    },
    yellow_casino: {
        id: "yellow_casino",
        name: "CASINO",
        tiles: buildCasinoInterior(),
        width: 22,
        height: 12,
        exits: [returnExit("yellow_casino", 10, 11)],
        backgroundImage: "/yellow/sprites/casino_interior.png",
        backgroundImageWidth: 1056,
        backgroundImageHeight: 576,
        backgroundImageTileSize: 48,
    },
    yellow_sbire: {
        id: "yellow_sbire",
        name: "ANTRE DU SBIRE",
        tiles: buildSbireInterior(),
        width: 9,
        height: 7,
        exits: [returnExit("yellow_sbire", 4, 6)],
    },
    yellow_infirmary: {
        id: "yellow_infirmary",
        name: "CENTRE DAEMON",
        tiles: buildInfirmaryInterior(),
        width: 14,
        height: 9,
        exits: [
            returnExit("yellow_infirmary", 7, 8),
            // Escalier (2,6) → monte au LABO (étage), arrivée labo (2,6).
            { x: 2, y: 6, targetMapId: "yellow_infirmary_2e", targetSpawnX: 2, targetSpawnY: 6 },
        ],
        backgroundImage: "/yellow/sprites/centre_interior.png",
        backgroundImageWidth: 242,
        backgroundImageHeight: 155,
        backgroundImageTileSize: 242 / 14,
    },
    yellow_infirmary_2e: {
        id: "yellow_infirmary_2e",
        name: "LABO SCIENTIFIQUE",
        tiles: buildLabInterior(),
        width: 14,
        height: 10,
        // Escalator (1,6) → redescend à l'infirmerie (arrivée 3,6, à côté de l'escalier).
        exits: [{ x: 1, y: 6, targetMapId: "yellow_infirmary", targetSpawnX: 3, targetSpawnY: 6 }],
        backgroundImage: "/yellow/sprites/lab_interior.png",
        backgroundImageWidth: 672,
        backgroundImageHeight: 480,
        backgroundImageTileSize: 48,
    },
    yellow_arena: {
        id: "yellow_arena",
        name: "BOSQUET SACRÉ",
        tiles: buildArenaPlante(),
        width: 15,
        height: 10,
        exits: [returnExit("yellow_arena", 7, 9)],
        backgroundImage: "/yellow/sprites/arena_plante.png",
        backgroundImageWidth: 480,
        backgroundImageHeight: 320,
        backgroundImageTileSize: 32,
    },
    yellow_arena_roche: {
        id: "yellow_arena_roche",
        name: "CAVERNE MINIÈRE",
        tiles: buildArenaRoche(),
        width: 15,
        height: 10,
        // Sortie en (7,9) → retour ville devant la porte du gym (door b_arena +1).
        exits: [{ x: 7, y: 9, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 36, targetSpawnY: 11 }],
        backgroundImage: "/yellow/sprites/arena_roche.png",
        backgroundImageWidth: 480,
        backgroundImageHeight: 320,
        backgroundImageTileSize: 32,
    },
    yellow_arena_feu: {
        id: "yellow_arena_feu",
        name: "LA CALDEIRA",
        tiles: buildArenaFeu(),
        width: 16,
        height: 16,
        // Entrée/sortie en bas du couloir central (8,15) → retour ville devant le gym.
        exits: [{ x: 8, y: 15, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 36, targetSpawnY: 11 }],
        backgroundImage: "/yellow/sprites/fire_arena_interior.png",
        backgroundImageWidth: 1024,
        backgroundImageHeight: 1024,
        backgroundImageTileSize: 64,
    },
    yellow_arena_elec: {
        id: "yellow_arena_elec",
        name: "LA TOUR HERTZ",
        tiles: buildArenaElec(),
        width: 15,
        height: 10,
        // Sortie/entrée par la PORTE en bas (7,9) → retour ville devant la porte du gym.
        exits: [{ x: 7, y: 9, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 36, targetSpawnY: 11 }],
        backgroundImage: "/yellow/sprites/elec_arena_interior.png",
        backgroundImageWidth: 1200,
        backgroundImageHeight: 800,
        backgroundImageTileSize: 80, // 1200/15 = 800/10 = 80 → grille 15×10 alignée pile
    },
    yellow_grotte: {
        id: "yellow_grotte",
        name: "GROTTE ROCHEUSE",
        tiles: buildGrotte(),
        width: 30,
        height: 31,
        // Sortie = le « trou noir » haut-droite (~25,5, à recaler) → retour Route Nord (12,5).
        exits: [{ x: 25, y: 5, targetMapId: "yellow_route_nord", targetSpawnX: 12, targetSpawnY: 4 }],
        backgroundImage: "/yellow/sprites/grotte.png",
        backgroundImageWidth: 720,
        backgroundImageHeight: 744,
        backgroundImageTileSize: 24,
    },
    yellow_route_nord: {
        id: "yellow_route_nord",
        name: "ROUTE NORD",
        tiles: NORTH_BUILD.tiles,
        width: NORTH_W,
        height: NORTH_H,
        // Sortie sud (cols 22..25, row 39) → retour Viridian sur col 21 row 1.
        // Alignée sur la bande sable cloné de Viridian (cols 22-25).
        exits: [
            ...[22, 23, 24, 25].map((col) => ({
                x: col,
                y: NORTH_H - 1,
                targetMapId: YELLOW_ENTRANCE_MAP_ID,
                targetSpawnX: 21,
                targetSpawnY: 1,
            })),
            // Entrée de la GROTTE (coin entre les 2 reliefs montagneux), en (12,4).
            // Arrivée près du trou noir haut-droite (à recaler avec la grille).
            { x: 12, y: 3, targetMapId: "yellow_grotte", targetSpawnX: 25, targetSpawnY: 6 },
        ],
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
            // Bouche de la GROTTE (entrée en 12,3, creusée dans la montagne)
            { x: 12, y: 3, w: 1, h: 1, url: "/yellow/sprites/cave_entrance.png" },
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
            // Bande 4 tuiles row 34 cols 22-25 = clones Viridian (14,32)/(37,32)/(38,32)/(39,32)
            { x: 22, y: 34, w: 4, h: 1, url: "/yellow/sprites/viridian_strip_row32_22_25.png" },
            // Rectangle 5×4 clone Viridian (14-18, 21-24) -> place à (25-29, 4-7)
            { x: 25, y: 4, w: 5, h: 4, url: "/yellow/sprites/viridian_zone_14_18_21_24.png" },
            // 2 buissons (clone Viridian 23.18) à l'intérieur du rectangle (diagonale)
            { x: 26, y: 5, w: 1, h: 1, url: "/yellow/sprites/viridian_bush_23_18.png" },
            { x: 28, y: 6, w: 1, h: 1, url: "/yellow/sprites/viridian_bush_23_18.png" },
        ],
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
