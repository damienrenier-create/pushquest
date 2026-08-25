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
import { GROTTE_NEXUS_ART } from "./data/grotteNexusArt"

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
    /** Largeur de la porte en cases (défaut 1). ≥2 = porte large (Usine : 2 cases contiguës). */
    doorW?: number
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
    /** BROUILLARD : on ne voit qu'un petit rayon autour du joueur, le reste est noir et la zone éclairée SUIT le
     *  joueur. `true` = rayon 2 (manoir hanté, legacy) ; un NOMBRE = rayon de base (ex. 1 = Grotte, plus sombre).
     *  Une LAMPE TORCHE active (gameStore.torchSteps/torchRadius) élargit ce rayon temporairement. Lu par MapView. */
    darkness?: boolean | number
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
    // BAR (BARMAN) : comptoir x9-12 en y2 + côtés (9,3)(12,3) bloqués. On parle au barman depuis
    // (10,3)/(11,3) en regardant vers le haut. Le barman se tient derrière, en (10,2).
    for (let x = 9; x <= 12; x++) m[2][x] = "shopCounter"
    m[3][9] = "shopCounter"; m[3][12] = "shopCounter"
    // TABLE ROULETTE MULTIJOUEUR : 6 tuiles (x 3-5 × y 4-5), juste sous le croupier (4,3). Bloquée
    // (on ne marche pas dessus) ; on s'en approche + A pour jouer (cf. interaction casino côté UI).
    for (let y = 4; y <= 5; y++) for (let x = 3; x <= 5; x++) m[y][x] = "table"
    // TABLE DE POKER MULTIJOUEUR (Texas Hold'em) : 6 tuiles (x 3-5 × y 7-8), AU SUD de la roulette
    // (sprite ajouté par Sartay). Bloquée ; on s'en approche + A pour rejoindre la table (interaction UI).
    for (let y = 7; y <= 8; y++) for (let x = 3; x <= 5; x++) m[y][x] = "table"
    m[11][10] = "doorMat"                                   // sortie (porte bas-centre)
    return m
}

// LIGUE — gabarit COMMUN aux 5 salles (22×12 @ 64px, calé sur ligue_*.png). Tout en mur ("tree",
// invisible sous le backgroundImage) ; sol central walkable cols 2-19 × rows 3-9. Conventions (Sartay) :
// ENTRÉE = porte gauche (2,6), arrivée joueur en (3,6) ; SORTIE = porte droite (19,5/6/7) → salle suivante
// (gated par la victoire) ; l'adversaire (NPC) se tient en HAUT-CENTRE (10,2), affronté depuis (10,3).
// Pas de rencontres sauvages (floorTile). Pas de sortie par la gauche → point de non-retour.
function buildLigueRoom(): TileType[][] {
    const W = 22, H = 12
    const m: TileType[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "tree" as TileType))
    for (let y = 3; y <= 9; y++) for (let x = 2; x <= 19; x++) m[y][x] = "floorTile" // sol central
    return m
}

// ARÈNE EAU "SANCTUAIRE DES MARÉES" (16×16 @ 64px, calé sur arene_eau.png). Tout mur ("tree") puis on
// ouvre : plateforme/autel haut-centre (ONDINE en 7,3), chemin de pierre central, et la moitié BASSE
// (zones coralliennes) où se tiennent les 4 gardes (5,8)(5,11)(11,8)(11,11). Entrée bas-centre (7-8,15).
// Bassins d'eau du haut (gauche/droite) = murs. Pas de rencontres (floorTile). Positions à affiner en jeu.
function buildAreneEau(): TileType[][] {
    const N = 16
    const m: TileType[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => "tree" as TileType))
    for (let y = 1; y <= 3; y++) for (let x = 4; x <= 11; x++) m[y][x] = "floorTile"   // plateforme (ONDINE)
    for (let y = 4; y <= 14; y++) for (let x = 6; x <= 9; x++) m[y][x] = "floorTile"   // chemin central
    for (let y = 7; y <= 14; y++) for (let x = 1; x <= 14; x++) m[y][x] = "floorTile"  // moitié basse (gardes)
    m[15][7] = "floorTile"; m[15][8] = "floorTile"                                      // entrée/sortie bas-centre
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
    const m = GROTTE_MASK.map((row) => [...row].map((ch) => (ch === "X" ? "tree" : "grass") as TileType))
    // PORTE SUD percée dans le mur (9,22)+(10,22) → mène à la GROTTE GELÉE (nouvelle chaîne).
    m[22][9] = "grass"; m[22][10] = "grass"
    // EAU PÊCHABLE (coords validées Sartay) : le « L » 3-5×4-5 puis 3-9×6-8.
    for (let x = 3; x <= 5; x++) { m[4][x] = "water"; m[5][x] = "water" }
    for (let y = 6; y <= 8; y++) for (let x = 3; x <= 9; x++) m[y][x] = "water"
    return m
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
    // LE SURFEUR (38,8) : case NETTE (au bord du plan d'eau haut-droite) + approche sud garantie (pas de décor random
    //   qui bloquerait l'accès au PNJ). Il pop ici post-Sylvebarbe (cf. activeNpcs) pour offrir la CT Surf.
    m[8][38] = "grass"; m[9][38] = "grass"; m[10][38] = "grass"
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

/** Exits auto-dérivés des buildings (porte = warp vers intérieur). Porte large (doorW ≥ 2) → une exit par case. */
function exitsFromBuildings(buildings: YellowBuilding[]): YellowExit[] {
    const out: YellowExit[] = []
    for (const b of buildings) {
        const door = buildingDoorPos(b)
        for (let i = 0; i < (b.doorW ?? 1); i++) {
            out.push({ x: door.x + i, y: door.y, targetMapId: b.targetMapId, targetSpawnX: b.targetSpawnX, targetSpawnY: b.targetSpawnY })
        }
    }
    return out
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
    // EAU PÊCHABLE (coords validées Sartay) : carré cols 29-33 × rows 24-28.
    for (let y = 24; y <= 28; y++) for (let x = 29; x <= 33; x++) m[y][x] = "water"
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
    "...........||.........", // 6  (+ mur 11|12 : isole la poche 12,6 du Collectionneur)
    "........|.|.|.........", // 7  (+ mur 8|9)
    ".........|..|.........", // 8
    ".......|..|.|.|.......", // 9
    ".........|..|.|.......", // 10  (+ mur 9|10)
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
    "............_.........", // 5  (+ mur sous 12,5 : isole la poche 12,6)
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
// GRILLE 3×3 = 9 carrés d'herbes HAUTES 4×5 (1 type/jour CHACUN, cf. ZONES.yellow_hautes_herbes).
// NIVEAU = la HAUTEUR : rangée du BAS = faible (N3-18), MILIEU (N18-38), HAUT = fort (N38-50).
// Allées d'herbe BASSE entre les carrés + couloir d'entrée en bas (grass → walkable sans rencontre).
// Bordure de SAPINS : tiles "fence" (bloquantes, sans déco) + sprite sapin.png par-dessus (spriteRegions).
const HH_W = 16, HH_H = 20
// 9 carrés (4 large × 5 haut) : 3 colonnes A=1-4 · B=6-9 · C=11-14, × 3 rangées BAS=13-17 · MIL=7-11 · HAUT=1-5.
// Ordre = index 0-8 = slot de type du jour : BAS (g→d), puis MILIEU, puis HAUT.
const HH_SQUARES: ReadonlyArray<{ cols: readonly [number, number]; rows: readonly [number, number] }> = [
    { cols: [1, 4], rows: [13, 17] }, { cols: [6, 9], rows: [13, 17] }, { cols: [11, 14], rows: [13, 17] }, // BAS (faible)
    { cols: [1, 4], rows: [7, 11] }, { cols: [6, 9], rows: [7, 11] }, { cols: [11, 14], rows: [7, 11] },     // MILIEU
    { cols: [1, 4], rows: [1, 5] }, { cols: [6, 9], rows: [1, 5] }, { cols: [11, 14], rows: [1, 5] },         // HAUT (fort)
]
const HH_EXIT_COLS = [7, 8] // trouée sud (sortie vers Cendreville) dans la bordure basse
function buildHautesHerbes(): TileType[][] {
    const m: TileType[][] = Array.from({ length: HH_H }, () => Array.from({ length: HH_W }, () => "fence" as TileType))
    // Intérieur (cols 1-14, rows 1-18) = herbe BASSE walkable : allées entre carrés + couloir d'entrée (row 18).
    for (let y = 1; y <= 18; y++) for (let x = 1; x <= 14; x++) m[y][x] = "grass"
    // Les 9 carrés = herbe HAUTE (rencontres d'entraînement).
    for (const sq of HH_SQUARES) for (let y = sq.rows[0]; y <= sq.rows[1]; y++) for (let x = sq.cols[0]; x <= sq.cols[1]; x++) m[y][x] = "grassTall"
    // Trouée sud (sortie) dans la bordure basse.
    for (const x of HH_EXIT_COLS) m[HH_H - 1][x] = "grass"
    return m
}
const HH_TILES = buildHautesHerbes()
// Bordure de SAPINS : un sprite sapin.png (32×45, plus haut que large) sur chaque tile "fence" du pourtour,
// débordant vers le haut (base calée sur la case) → rendu d'une vraie lisière de sapins.
function buildHautesHerbesSapins(): Array<{ x: number; y: number; w: number; h: number; url: string }> {
    const out: Array<{ x: number; y: number; w: number; h: number; url: string }> = []
    for (let y = 0; y < HH_H; y++) for (let x = 0; x < HH_W; x++) {
        if (HH_TILES[y][x] === "fence") out.push({ x, y: y - 0.4, w: 1, h: 1.4, url: "/yellow/sprites/sapin.png" })
    }
    return out
}

// === ZONE DE COMBAT (Battle Frontier) — hub + 3 salles, PLACEHOLDERS tile-based (art à swapper) ===
const ZONE_W = 20, ZONE_H = 14
function buildZoneCombatCollisions(): TileType[][] {
    const m = fillRect(ZONE_W, ZONE_H, "grass")
    // Bord d'arbres + 2e rangée d'arbres sur les CÔTÉS (cols 1 & 18 demandées non-walkables).
    for (let x = 0; x < ZONE_W; x++) { m[0][x] = "tree"; m[ZONE_H - 1][x] = "tree" }
    for (let y = 0; y < ZONE_H; y++) { m[y][0] = "tree"; m[y][1] = "tree"; m[y][ZONE_W - 2] = "tree"; m[y][ZONE_W - 1] = "tree" }
    // BARRIÈRE ligne 12 : mur partout SAUF le passage central (cols 9-10) par lequel on monte du bas vers la place.
    for (let x = 1; x < ZONE_W - 1; x++) m[12][x] = "tree"
    m[12][9] = "grass"; m[12][10] = "grass"
    // OUVERTURE SUD (entrée/sortie vers Ville Jaune) : le joueur ARRIVE et repart par le BAS (cols 9-10).
    m[ZONE_H - 1][9] = "path"; m[ZONE_H - 1][10] = "path"
    // DRAPEAUX & décor bloquants (calqués sur l'image de fond).
    const decor: [number, number][] = [[7, 11], [12, 11], [17, 11], [17, 9], [17, 7], [13, 7], [12, 8], [11, 8], [12, 6], [7, 6], [8, 8], [6, 7], [5, 7], [3, 7], [2, 7], [2, 9], [2, 11]]
    for (const [x, y] of decor) m[y][x] = "tree"
    return m
}
const ZONE_COMBAT_BUILDINGS: YellowBuilding[] = [
    { id: "b_combat_tour", x: 2, y: 3, w: 4, h: 4, doorX: 2, doorY: 4, targetMapId: "yellow_combat_tour", targetSpawnX: 8, targetSpawnY: 9, displayName: "TOUR DE COMBAT", kind: "arena" },                  // porte abs (4,7)
    { id: "b_combat_usine", x: 8, y: 3, w: 4, h: 4, doorX: 1, doorY: 3, doorW: 2, targetMapId: "yellow_combat_usine", targetSpawnX: 8, targetSpawnY: 9, displayName: "USINE DE COMBAT", kind: "shop" },     // porte abs (9-10,6)
    { id: "b_combat_dome", x: 14, y: 3, w: 4, h: 4, doorX: 1, doorY: 3, targetMapId: "yellow_combat_dome", targetSpawnX: 8, targetSpawnY: 9, displayName: "DÔME DE COMBAT", kind: "casino" },                // porte abs (15,6)
]
// Salle intérieure : pièce W×H (murs périphériques) + porte de sortie en bas-centre. Agrandie ~taille écran.
function buildZoneRoom(W: number, H: number): TileType[][] {
    const m = fillRoom(W, H, "path")
    m[H - 1][Math.floor(W / 2)] = "path" // porte (case de sortie)
    return m
}
// AUTEL DE LA CHIMÈRE (18×10) : pièce ouverte + collision sur la PLATEFORME centrale (Poké-ball) → on la contourne
//   et on interagit avec le PNJ posé DEVANT (9,6). Bassins/PC laissés walkables (à affiner en jeu via la debug map).
// AUTEL DE LA CHIMÈRE (18×10) — collisions calées sur le décor `fusion_altar.png` (grille fournie par Sartay).
//   L'AUTEL de combat (cases 7-10 × 4-6) reste MARCHABLE : c'est le seul couloir vertical vers la porte haute
//   (les murs latéraux scellent tout contournement). Le combat de fusion se lance via le PNJ 🧬 `y_autel_chimere`
//   en (9,6). Portes basses (sortie hub) : (8,9)+(9,9). Entrée LIGUE : (8,1)+(9,1). PC gauche (2-3,6) / droite (14-15,6).
function buildAutelChimereRoom(): TileType[][] {
    const m = buildZoneRoom(18, 10) // bords = murs ; intérieur = sol ; porte basse (9,9) déjà ouverte
    const walls: [number, number][] = [
        [1, 5], [1, 6], [1, 7], [2, 5], [3, 5], [4, 5], [4, 6], [4, 7], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [6, 3], [7, 0], [7, 1], [7, 2],
        [10, 0], [10, 1], [10, 2], [11, 3], [12, 4], [12, 5], [12, 6], [12, 7], [13, 5], [13, 6], [13, 7], [14, 5], [15, 5], [16, 5], [16, 6], [16, 7], [16, 8],
    ]
    for (const [x, y] of walls) m[y][x] = "tree"
    m[9][8] = "path" // 2e porte basse (sortie hub) à côté de (9,9)
    return m
}

// CHAMBRE DU LÉGENDAIRE ULTIME (14×14) — décor salle_ukognofy.png. Ukognofy est DESSINÉ au centre (bloc solide) ;
//   le joueur arrive par l'entrée basse et l'affronte à l'arrivée (cf. gameStore). Piliers latéraux décoratifs.
//   Collisions à affiner en jeu via debugGrid si besoin (le combat se lance à l'entrée → peu critique).
function buildUkognofyChamber(): TileType[][] {
    const m = buildZoneRoom(14, 14) // bords = murs ; sol intérieur ; porte basse (7,13) ouverte
    for (let y = 4; y <= 7; y++) for (let x = 5; x <= 8; x++) m[y][x] = "tree" // Ukognofy central (décor) — solide
    for (const [x, y] of [[2, 5], [2, 6], [11, 5], [11, 6]] as const) m[y][x] = "tree" // 2 piliers latéraux
    return m
}

// === DÔME DE COMBAT — LES 3 SALLES PHYSIQUES (parcours du champion). Toutes 16×12, sprites 1200×896 (tileSize 75).
//   1) TOURNOI (yellow_combat_dome) : porte SUD→hub + porte EST (15,6)→salle Dan (gatée MAÎTRE).
//   2) DAN (yellow_dome_dan) : porte OUEST (0,6)→retour Tournoi + porte NORD (8,0)→Finale (gatée 4 Dan).
//   3) FINALE (yellow_dome_final) : porte SUD (8,11)→retour Dan + PNJ coupe (reward). Gates dans gameStore.
function buildDomeTournamentRoom(): TileType[][] {
    const m = buildZoneRoom(16, 12) // porte SUD (8,11) → hub déjà ouverte
    m[11][7] = "path" // 2e case de sortie SUD (7,11), à côté de (8,11)
    // La porte vers la salle Dan est en (12,4)+(13,4) : cases INTÉRIEURES déjà marchables → gérée par les exits.
    return m
}
function buildDomeDanRoom(): TileType[][] {
    const m = fillRoom(16, 12, "path") // murs périphériques (dont la colonne la plus à droite)
    for (let x = 0; x < 16; x++) { m[1][x] = "tree"; m[2][x] = "tree"; m[3][x] = "tree" } // 4 PREMIÈRES rangées NON marchables (row 0 = mur périphérique)
    m[6][0] = "path" // porte OUEST → retour Tournoi
    m[11][7] = "path" // SORTIE SUD (7,11) → retour Tournoi (case (7,10) juste au-dessus, déjà marchable)
    // Porte du SACRE en (7,4)+(8,4) : cases INTÉRIEURES de la rangée 4 (marchables) → gérée par les exits.
    return m
}
function buildDomeFinalRoom(): TileType[][] {
    const m = fillRoom(16, 12, "path") // murs périphériques
    m[11][8] = "path" // porte SUD → retour salle Dan
    return m
}
// USINE DE COMBAT : les 3 PREMIÈRES rangées (0-2) = le bloc machinerie du décor → NON marchables. Les 3 PNJ se
//   tiennent en rangée 4 (juste sous la machinerie), interpellés depuis la rangée 5.
function buildUsineRoom(): TileType[][] {
    const m = buildZoneRoom(16, 12) // périphérie murs + porte sud (8,11)
    for (let x = 0; x < 16; x++) { m[1][x] = "tree"; m[2][x] = "tree" } // rangées 1 et 2 = murs (rangée 0 déjà mur périphérique)
    m[11][7] = "path" // 2e case de sortie SUD (7,11), à côté de (8,11)
    return m
}

// GROTTE DU NEXUS — 1er étage (casse-tête Mt. Moon endgame). Collision v1 AUTO-échantillonnée depuis
// grotte_casse_tete.png (void + gros rochers bloquants) → à CALER finement en jeu via debugGrid. 49×42.
// Grille de COLLISION des 3 étages, AUTO-GÉNÉRÉE depuis grotte_casse_tete.png (cf. GROTTE_NEXUS_ART / scripts/_gen-grotte-art.mjs).
// # = mur (roche/vide) · ~ = eau · . = sol marchable (invisible sous le backgroundImage). À affiner en jeu via debugGrid.
function buildGrotteNexusFloor(floor: "1F" | "B1F" | "B2F"): TileType[][] {
    return GROTTE_NEXUS_ART[floor].map((row) => [...row].map((c) => (c === "#" ? "caveWall" : c === "~" ? "water" : "caveFloor") as TileType))
}

// ===================================================================================================
// NOUVELLE CHAÎNE : GROTTE GELÉE → PLAGE → AQUA ARENA (bateau). Masques relevés depuis les grilles
// annotées par Sartay (debug-maps/*-annotee.png). Fonds alignés pile sur la grille (img = grille×tileSize).
// ===================================================================================================
// GROTTE GELÉE 30×31 — '.' = sol (grass, walkable) · '#' = mur (tree)
const GELEE_MASK = [
    "....##########################", "##############################", "##############################",
    "##############################", "############....##############", "############....##############",
    "####...######......###########", "####...###.#.......###########", "####....##........############",
    "####.......#......############", "############......############", "#############..........#####..",
    "################.#############", "#########..#####.#############", "################.###...#######",
    "################.###...#######", "#######.######....##....######", "########.#####...........#####",
    "########.......###############", "#####.........################", "####........##################",
    "###........###################", "###........#..#####..#########", "####...##........##..#########",
    "####...###............########", "####..................########", "#####........########..#######",
    "######.....##########....#####", "######....############...#####", "#######################..#####",
    "##############################",
]
function buildGelee(): TileType[][] {
    const m = GELEE_MASK.map((row) => [...row].map((ch) => (ch === "#" ? "tree" : "grass") as TileType))
    // EAU PÊCHABLE (coords validées Sartay) : l'escalier 20/6 → 21/9.
    for (const [x, y] of [[20, 6], [20, 7], [20, 8], [19, 8], [19, 9], [20, 9], [21, 9]] as const) m[y][x] = "water"
    return m
}

// PLAGE 24×40 — 'H' = hautes herbes (grassTall, POP) · '.' = sable/chemin (path, walkable SANS pop) · '#' = mur (tree)
const PLAGE_MASK = [
    ".######..##############.", "########################", "########################", "########################",
    "########################", "########################", "########################", "########################",
    "########################", "########################", "########################", "########HHHHH.##########",
    "######HHHH.##.##########", "######HHHH.##..#########", "######HHHH..#..#########", "######HHHH......########",
    "#######HHH......########", "########HH.....#########", "########.......#########", "###..###........########",
    "###..###........########", "###...........##########", "###.........#..#########", "###........HHH..########",
    "###.......HHHHHH########", "###.......HHHHHH########", "######....HHHHHH########", "#######...HHHHHH########",
    "########..HHHHH.########", "########..HHHH.....#####", "######....HHH...#.######", "######HHHHHHHH##########",
    "######HH.###############", "######H.################", "######H.################", "########################",
    "########################", "########################", "########################", "########################",
]
function buildPlage(): TileType[][] {
    const m = PLAGE_MASK.map((row) => [...row].map((ch) => (ch === "#" ? "tree" : ch === "H" ? "grassTall" : "path") as TileType))
    // EAU PÊCHABLE (coords validées Sartay) : (19-21 × 28-29) + TOUTE la colonne 22 (la « mer »).
    for (const [x, y] of [[19, 29], [20, 29], [20, 28], [21, 28]] as const) m[y][x] = "water"
    for (let y = 0; y < m.length; y++) m[y][22] = "water"
    // COL 23 = passage SURF vers l'ÎLE ÉMERAUDE (rows 0-31 = hauteur de l'île). Le joueur surfe la col 22 (mer libre)
    //   puis franchit vers l'est (col 23) → il arrive sur la COL 0 de l'île à la MÊME LIGNE. Retour symétrique par la col 22.
    for (let y = 0; y <= 31; y++) m[y][23] = "water"
    return m
}

// AQUA ARENA (pont du bateau) 24×40 — '.' = deck (path, walkable) · '#' = mur/bassin (tree). Pas de rencontres.
const AQUA_MASK = [
    ".######################.", "########################", "########################", "########################",
    "########################", "########################", "########################", "########################",
    "####................####", "###..................###", "###...................##", "##......#.......#.....##",
    "##....####....####....##", "##....####....####....##", "##....############.....#", "####..##........##..####",
    "####..##........##..####", "####..##........##..####", "####..##........##...###", "......##........##....##",
    "......##........##......", "......##........##..####", "......##........##..####", "####..##........##..####",
    "####..##........##..####", "##....##.....##.##....##", "##....############....##", "##....####....####....##",
    "##....####....####....##", "##....####....####....##", "##....................##", "##....................##",
    "##..###...........######", "#######..##...##########", "###########...##########", "###########...##########",
    "######..##........######", "..####............######", "..######################", "..######################",
]
function buildAquaArena(): TileType[][] {
    const m = AQUA_MASK.map((row) => [...row].map((ch) => (ch === "#" ? "tree" : "path") as TileType))
    // EAU PÊCHABLE (coords validées Sartay) : 2 bandes verticales (parois des bassins) col 7 + col 16, rows 14-27.
    for (let y = 14; y <= 27; y++) { m[y][7] = "water"; m[y][16] = "water" }
    return m
}

// ÎLE ÉMERAUDE (« EMERALD EASTERN PATH ») 19×32 — île de sable cernée par la MER, à l'EST de la plage. Accessible
//   UNIQUEMENT EN SURF (depuis la mer de la plage, col 22). Fond = image (ile_emeraude.png) ; la collision (invisible
//   sous l'image) = mer autour + blob de sable central marchable + carré d'HERBES HAUTES au centre (SEUL endroit du
//   jeu où GALIJAH peut apparaître) + palmier/bois flotté bloquants. Retour plage par la case eau ouest (surf).
const ILE_EMERAUDE_MAP_ID = "yellow_ile_emeraude"
const ILE_W = 19, ILE_H = 32
function buildIleEmeraude(): TileType[][] {
    const m: TileType[][] = Array.from({ length: ILE_H }, () => Array.from({ length: ILE_W }, () => "water" as TileType))
    // Blob de sable ELLIPTIQUE (centre (9.5,16), rayons 6×8) → épouse l'île de l'art.
    const cx = 9.5, cy = 16, rx = 6, ry = 8
    for (let y = 0; y < ILE_H; y++) for (let x = 0; x < ILE_W; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) m[y][x] = "path" // sable marchable (convention plage : '.' = path)
    }
    // HERBES HAUTES centrales (seul spawn de GALIJAH) — cluster calé sur les patchs verts de l'art.
    for (let y = 14; y <= 17; y++) for (let x = 8; x <= 11; x++) if (m[y]?.[x] === "path") m[y][x] = "grassTall"
    // Palmier + bois flotté = décor BLOQUANT (l'art les dessine ; la collision empêche d'y marcher).
    for (const [tx, ty] of [[12, 14], [4, 21]] as const) if (m[ty]?.[tx] === "path") m[ty][tx] = "tree"
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
            // SUD (cols 22-25, row 39) → ZONE DE COMBAT. Gated par le bloc Sylvebarbe (inSylvebarbeBlock,
            // cols 22-25 rows 38-39) : inatteignable tant que !sylvebarbeAwake → pas de garde à dupliquer.
            ...[22, 23, 24, 25].map((col) => ({
                x: col, y: 39, targetMapId: "yellow_zone_combat", targetSpawnX: 10, targetSpawnY: 12, // arrivée EN BAS (passage sud)
            })),
        ],
        backgroundImage: "/yellow/sprites/viridian_full.png",
        backgroundImageWidth: 1360,
        backgroundImageHeight: 672,
        backgroundImageTileSize: VIRIDIAN_IMAGE_TILE_SIZE,
        backgroundImageOriginX: VIRIDIAN_ORIGIN_X,
        backgroundImageOriginY: VIRIDIAN_ORIGIN_Y,
    },
    yellow_zone_combat: {
        id: "yellow_zone_combat",
        name: "ZONE DE COMBAT",
        tiles: buildZoneCombatCollisions(),
        width: ZONE_W,
        height: ZONE_H,
        backgroundImage: "/yellow/sprites/zone_combat.png",
        backgroundImageWidth: 2464,
        backgroundImageHeight: 1728,
        backgroundImageTileSize: 123, // 2464/20 ≈ 123 → l'image remplit la grille 20×14
        buildings: ZONE_COMBAT_BUILDINGS,
        exits: [
            ...exitsFromBuildings(ZONE_COMBAT_BUILDINGS),
            // (L'ENTRÉE du DÔME DE FUSION N'EST PLUS ICI. On y accède désormais par l'ÉCHELLE DE FIN de la Grotte du
            //   Nexus — B1F (45,5) — puis, une fois le Dôme atteint 1×, par TÉLÉPORTATION depuis un Centre Daemon.
            //   L'ancien warp brut (13,9) + le panneau spoiler y_autel_panneau (12,9) sont retirés — anti-spoil « fusion ».)
            // sortie SUD → retour Ville Jaune (cols 9-10, en bas : on repart par où on est arrivé)
            ...[9, 10].map((x) => ({ x, y: ZONE_H - 1, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 23, targetSpawnY: 37 })),
        ],
        groundTile: "grass",
        encountersPaused: true, // hub : aucune rencontre sauvage
    },
    yellow_combat_tour: {
        id: "yellow_combat_tour", name: "TOUR DE COMBAT", tiles: buildZoneRoom(16, 12), width: 16, height: 12,
        backgroundImage: "/yellow/sprites/combat_tour.png", backgroundImageWidth: 1200, backgroundImageHeight: 896, backgroundImageTileSize: 75, // 1200/16 = 75 → l'image remplit la pièce 16×12
        exits: [{ x: 8, y: 11, targetMapId: "yellow_zone_combat", targetSpawnX: 4, targetSpawnY: 8 }],
    },
    yellow_combat_usine: {
        id: "yellow_combat_usine", name: "USINE DE COMBAT", tiles: buildUsineRoom(), width: 16, height: 12,
        backgroundImage: "/yellow/sprites/combat_usine_new.jpg", backgroundImageWidth: 2400, backgroundImageHeight: 1792, backgroundImageTileSize: 150, // 2400/16 = 150
        exits: [
            { x: 8, y: 11, targetMapId: "yellow_zone_combat", targetSpawnX: 10, targetSpawnY: 7 },
            { x: 7, y: 11, targetMapId: "yellow_zone_combat", targetSpawnX: 10, targetSpawnY: 7 }, // 2e case de sortie SUD
        ],
    },
    // SALLE 1/3 — TOURNOI (salle d'accueil du Dôme). Porte SUD → hub Zone de Combat, porte EST → salle Dan (gatée MAÎTRE).
    yellow_combat_dome: {
        id: "yellow_combat_dome", name: "DÔME DE COMBAT", tiles: buildDomeTournamentRoom(), width: 16, height: 12,
        backgroundImage: "/yellow/sprites/dome_tournoi.png", backgroundImageWidth: 1200, backgroundImageHeight: 896, backgroundImageTileSize: 75, // 1200/16 = 75
        exits: [
            { x: 8, y: 11, targetMapId: "yellow_zone_combat", targetSpawnX: 15, targetSpawnY: 7 }, // sortie SUD → hub
            { x: 7, y: 11, targetMapId: "yellow_zone_combat", targetSpawnX: 15, targetSpawnY: 7 }, // 2e case de sortie SUD
            { x: 12, y: 4, targetMapId: "yellow_dome_dan", targetSpawnX: 1, targetSpawnY: 6 }, // porte → Dan (gate domeChampionships>=7 dans gameStore)
            { x: 13, y: 4, targetMapId: "yellow_dome_dan", targetSpawnX: 1, targetSpawnY: 6 }, // 2e case de la porte → Dan
        ],
    },
    // SALLE 2/3 — DAN (bracket des 4 Dan). Porte OUEST → Tournoi, porte NORD → Finale (gatée 4 Dan). Maître Dan pour le lore.
    yellow_dome_dan: {
        id: "yellow_dome_dan", name: "SALLE DES DAN", tiles: buildDomeDanRoom(), width: 16, height: 12,
        backgroundImage: "/yellow/sprites/dome_dan.jpg", backgroundImageWidth: 1200, backgroundImageHeight: 896, backgroundImageTileSize: 75,
        exits: [
            { x: 0, y: 6, targetMapId: "yellow_combat_dome", targetSpawnX: 12, targetSpawnY: 6 }, // OUEST → Tournoi (près de la porte 12/13,4)
            { x: 7, y: 11, targetMapId: "yellow_combat_dome", targetSpawnX: 12, targetSpawnY: 6 }, // SORTIE SUD (7,11) → Tournoi
            { x: 7, y: 4, targetMapId: "yellow_dome_final", targetSpawnX: 8, targetSpawnY: 10 }, // porte du SACRE → Finale (gate domeChampionships>=11 dans gameStore)
            { x: 8, y: 4, targetMapId: "yellow_dome_final", targetSpawnX: 8, targetSpawnY: 10 }, // 2e case de la porte du sacre
        ],
    },
    // SALLE 3/3 — FINALE (le Maître à la coupe est peint dans le décor). PNJ invisible `y_dome_coupe` → reward. Porte SUD → Dan.
    yellow_dome_final: {
        id: "yellow_dome_final", name: "SACRE DU DÔME", tiles: buildDomeFinalRoom(), width: 16, height: 12,
        backgroundImage: "/yellow/sprites/dome_final.png", backgroundImageWidth: 1200, backgroundImageHeight: 896, backgroundImageTileSize: 75,
        exits: [
            { x: 8, y: 11, targetMapId: "yellow_dome_dan", targetSpawnX: 8, targetSpawnY: 5 }, // SUD → retour Dan (sous la porte du sacre 7/8,4)
        ],
    },
    // SALLE DE FUSION « Autel de la Chimère » : fusionner 2 Daemons pour un combat-épreuve (cf. data/fusionMon).
    //   Pièce 18×10 (murs périphériques), sprite plein cadre. PNJ autel DEVANT la plateforme en (9,6), sortie bas-centre (9,9).
    yellow_combat_autel: {
        id: "yellow_combat_autel", name: "AUTEL DE LA CHIMÈRE", tiles: buildAutelChimereRoom(), width: 18, height: 10,
        backgroundImage: "/yellow/sprites/fusion_altar.png", backgroundImageWidth: 2752, backgroundImageHeight: 1536, backgroundImageTileSize: 153, // 2752/18 ≈ 153
        exits: [
            // (Plus de porte-piéton basse vers le hub : le Dôme est le SANCTUAIRE de fin de grotte. On en sort par le
            //   menu « Téléportation » (→ Centre Ville Jaune / Cendreville) ou par la porte HAUTE (la Ligue Ultime).
            //   On y ENTRE par l'échelle de fin de la Grotte (B1F 45,5) ou par téléport depuis un Centre.)
            // ENTRÉE LIGUE DE FUSION — seuil de la porte à dragons, cases (8,1)+(9,1). Le gameStore gère le gate
            // d'ouverture (sprite fermé→ouvert) + resetFusionLeagueProgress + lance au palier actif.
            { x: 8, y: 1, targetMapId: "yellow_fusion_glace", targetSpawnX: 3, targetSpawnY: 6 },
            { x: 9, y: 1, targetMapId: "yellow_fusion_glace", targetSpawnX: 3, targetSpawnY: 6 },
        ],
    },
    // CHAMBRE DU LÉGENDAIRE ULTIME (Ukognofy) — atteinte via une échelle interne de la Grotte, la nuit, avec un
    //   Daemon niv 100, après une fusion sauvage vue sans croiser de sauvage depuis (Repousse). Combat à l'arrivée.
    yellow_ukognofy_chamber: {
        id: "yellow_ukognofy_chamber", name: "SANCTUAIRE", tiles: buildUkognofyChamber(), width: 14, height: 14,
        // Fond étiré à 14×14 tuiles. La hauteur RÉELLE de l'image (2016) ne fait que 13,35 tuiles → une bande noire
        // restait en bas sur la rangée de la porte (y=13). On DÉCLARE 2114 (=14×151) pour remplir toute la hauteur
        // (étirement vertical ~5 %, imperceptible, aucun rognage) → sanctuaire couvert de haut en bas, plus de vide.
        backgroundImage: "/yellow/sprites/salle_ukognofy.png", backgroundImageWidth: 2120, backgroundImageHeight: 2114, backgroundImageTileSize: 151,
        debugGrid: false, // grille de calage COUPÉE pour les joueurs (?grid=1 en dev si besoin). Le SANCTUAIRE n'est PAS sombre (pas de darkness) → visible sans lampe torche.
        exits: [
            { x: 7, y: 13, targetMapId: "yellow_grotte_nexus", targetSpawnX: 18, targetSpawnY: 39 }, // sortie basse → entrée Grotte 1F
        ],
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
            // OUVERTURE NORD (row 0, cols 22-26) → PLAINE D'ENTRAÎNEMENT (hautes herbes), spawn couloir bas (7,18).
            ...[22, 23, 24, 25, 26].map((x) => ({ x, y: 0, targetMapId: "yellow_hautes_herbes", targetSpawnX: 7, targetSpawnY: 18 })),
            // OUVERTURE SUD (cols 20-23, row 36) → LIGUE (1re salle, glace) : gate Dieu Spaghetti tant que
            // TOUS les badges ne sont pas réunis (cf. gameStore). Arrivée porte gauche de la salle de glace.
            ...[20, 21, 22, 23].map((x) => ({ x, y: 36, targetMapId: "yellow_ligue_glace", targetSpawnX: 3, targetSpawnY: 6 })),
            // PORTE DE L'ARÈNE EAU « Sanctuaire des Marées » en (10,9) → arène (spawn 7,14, juste au-dessus de l'entrée).
            { x: 10, y: 9, targetMapId: "yellow_arena_eau", targetSpawnX: 7, targetSpawnY: 14 },
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
        tiles: HH_TILES,
        width: HH_W,
        height: HH_H,
        // ENTRÉE depuis Cendreville → spawn couloir bas (7,18). SORTIE = trouée sud (7-8,19).
        exits: [
            { x: 7, y: 19, targetMapId: "yellow_cendreville", targetSpawnX: 24, targetSpawnY: 1 },
            { x: 8, y: 19, targetMapId: "yellow_cendreville", targetSpawnX: 24, targetSpawnY: 1 },
        ],
        // Herbe basse (allées) = sheet 4 variantes 16px gap1 ; herbe HAUTE (carrés) = tuile unique.
        groundSheet: { url: "/yellow/sprites/herbes_2.png", tileSize: 16, gap: 1, count: 4 },
        tallGrassUrl: "/yellow/sprites/herbe_haute_h1.png",
        spriteRegions: buildHautesHerbesSapins(), // bordure de sapins (1 sprite par tile "fence" du pourtour)
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
    // ===== LA LIGUE — 5 salles en enfilade (entrée GAUCHE → adversaire HAUT-CENTRE → sortie DROITE) =====
    // Gauntlet : la porte droite ne s'ouvre qu'une fois l'adversaire de la salle vaincu (gating gameStore) ;
    // pas de retour (porte gauche scellée) ; aucune infirmerie (potions seulement). Art = ligue_*.png.
    yellow_ligue_glace: {
        id: "yellow_ligue_glace", name: "LIGUE — SALLE DE GLACE", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_ligue_combat", targetSpawnX: 3, targetSpawnY: 6 })),
        backgroundImage: "/yellow/sprites/ligue_glace.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    yellow_ligue_combat: {
        id: "yellow_ligue_combat", name: "LIGUE — SALLE DE COMBAT", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_ligue_spectre", targetSpawnX: 3, targetSpawnY: 6 })),
        backgroundImage: "/yellow/sprites/ligue_combat.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    yellow_ligue_spectre: {
        id: "yellow_ligue_spectre", name: "LIGUE — SALLE SPECTRE", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_ligue_dragon", targetSpawnX: 3, targetSpawnY: 6 })),
        backgroundImage: "/yellow/sprites/ligue_spectre.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    yellow_ligue_dragon: {
        id: "yellow_ligue_dragon", name: "LIGUE — SALLE DRAGON", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_ligue_rival", targetSpawnX: 3, targetSpawnY: 6 })),
        backgroundImage: "/yellow/sprites/ligue_dragon.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    yellow_ligue_rival: {
        id: "yellow_ligue_rival", name: "LIGUE — TRÔNE DU MAÎTRE", tiles: buildLigueRoom(), width: 22, height: 12,
        // Porte droite (19,5/6/7) = SORTIE de la Ligue → Cendreville (au-dessus du gate sud), une fois le Maître vaincu.
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_cendreville", targetSpawnX: 21, targetSpawnY: 32 })),
        backgroundImage: "/yellow/sprites/ligue_rival.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    // ===== SALLE ULTIME DORÉE (RUN 2 uniquement) — combat vs TON DOUBLE (ancienne équipe run 1) =====
    // Accès : après avoir vaincu LE MAÎTRE (ACE) en run 2, la porte droite du trône mène ICI (cf. gameStore).
    // Le double (nommé du pseudo du joueur, halo mauve) se tient à la place des maîtres (10,2). Sortie droite
    // (19,5-7) → Cendreville, SCELLÉE tant que le double n'est pas vaincu (= sacre / isChampion, cf. gameStore).
    yellow_ligue_final: {
        id: "yellow_ligue_final", name: "LIGUE — SALLE ULTIME", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_cendreville", targetSpawnX: 21, targetSpawnY: 32 })),
        backgroundImage: "/yellow/sprites/ligue_final.png", backgroundImageWidth: 1408, backgroundImageHeight: 768, backgroundImageTileSize: 64,
    },
    // ===== LIGUE DE FUSION — venue (5 salles Conseil + Champion + Miroir), entrée depuis l'Autel =====
    // Salles en enfilade (porte DROITE scellée tant que la chimère de la salle n'est pas vaincue, gating gameStore).
    // Porte GAUCHE (2,6) = RETRAITE → Autel (pas de whiteout en fusion : le joueur peut toujours regrouper son roster).
    // Salles en TUILES (art de fond à poser plus tard, comme les sprites). PNJ auto-dérivés des TRAINERS.
    yellow_fusion_glace: {
        id: "yellow_fusion_glace", name: "LIGUE FUSION — GLACE", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [
            ...[5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_combat", targetSpawnX: 3, targetSpawnY: 6 })),
            { x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },
        ],
        backgroundImage: "/yellow/sprites/fusion_room_will.png", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // décor Johto dédié — WILL (Psy)
    },
    yellow_fusion_combat: {
        id: "yellow_fusion_combat", name: "LIGUE FUSION — COMBAT", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [
            ...[5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_spectre", targetSpawnX: 3, targetSpawnY: 6 })),
            { x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },
        ],
        backgroundImage: "/yellow/sprites/fusion_room_koga.png", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // décor Johto dédié — KOGA (Poison)
    },
    yellow_fusion_spectre: {
        id: "yellow_fusion_spectre", name: "LIGUE FUSION — SPECTRE", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [
            ...[5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_dragon", targetSpawnX: 3, targetSpawnY: 6 })),
            { x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },
        ],
        backgroundImage: "/yellow/sprites/fusion_room_bruno.png", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // décor Johto dédié — BRUNO (Combat)
    },
    yellow_fusion_dragon: {
        id: "yellow_fusion_dragon", name: "LIGUE FUSION — DRAGON", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [
            ...[5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_maitre", targetSpawnX: 3, targetSpawnY: 6 })),
            { x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },
        ],
        backgroundImage: "/yellow/sprites/fusion_room_karen.png", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // décor Johto dédié — KAREN (Ténèbres)
    },
    yellow_fusion_maitre: {
        id: "yellow_fusion_maitre", name: "LIGUE FUSION — CHAMPION", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [
            ...[5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_miroir", targetSpawnX: 3, targetSpawnY: 6 })),
            { x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },
        ],
        backgroundImage: "/yellow/sprites/fusion_room_lance.png", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // décor Johto dédié — LANCE (Dragon, Champion)
    },
    yellow_fusion_miroir: {
        id: "yellow_fusion_miroir", name: "LIGUE FUSION — DIEU SPAGHETTI", tiles: buildLigueRoom(), width: 22, height: 12,
        // Salle du Dieu Spaghetti. Porte DROITE (x:19) → SALLE ULTIME (ton reflet) : GATÉE dans gameStore (ne s'ouvre
        //   qu'après avoir battu le Dieu Spaghetti EN ARGENT/OR, sinon renvoie à l'Autel). Porte gauche (x:2) = retraite Autel.
        exits: [5, 6, 7].map((y) => ({ x: 19, y, targetMapId: "yellow_fusion_ultime", targetSpawnX: 3, targetSpawnY: 6 }))
            .concat([{ x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 }]),
        backgroundImage: "/yellow/sprites/fusion_dome_champion.jpg", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128, // salle du Dieu Spaghetti (porte droite → salle ultime)
    },
    // SALLE ULTIME — « bats ton reflet » (argent/or) : après le Dieu Spaghetti, affronte l'équipe de fusion avec laquelle
    //   tu as bouclé le palier PRÉCÉDENT (reflet gelé). Le trainer y_fusion_reflet barre le fond. Porte gauche → retour miroir.
    yellow_fusion_ultime: {
        id: "yellow_fusion_ultime", name: "LIGUE FUSION — SALLE ULTIME", tiles: buildLigueRoom(), width: 22, height: 12,
        exits: [{ x: 2, y: 6, targetMapId: "yellow_fusion_miroir", targetSpawnX: 18, targetSpawnY: 6 }],
        backgroundImage: "/yellow/sprites/fusion_salle_ultime.jpg", backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128,
    },
    // ===== ARÈNE EAU "SANCTUAIRE DES MARÉES" (Cendreville, badge eau) =====
    yellow_arena_eau: {
        id: "yellow_arena_eau", name: "SANCTUAIRE DES MARÉES", tiles: buildAreneEau(), width: 16, height: 16,
        // Entrée/sortie bas-centre (7-8,15) → Cendreville, juste SOUS la porte de l'arène (10,10) pour ne
        // pas re-déclencher le warp (la porte est en 10,9).
        exits: [7, 8].map((x) => ({ x, y: 15, targetMapId: "yellow_cendreville", targetSpawnX: 10, targetSpawnY: 10 })),
        backgroundImage: "/yellow/sprites/arene_eau.png", backgroundImageWidth: 1024, backgroundImageHeight: 1024, backgroundImageTileSize: 64,
    },
    yellow_grotte: {
        id: "yellow_grotte",
        name: "GROTTE ROCHEUSE",
        tiles: buildGrotte(),
        width: 30,
        height: 31,
        // Sortie = le « trou noir » haut-droite (~25,5, à recaler) → retour Route Nord (12,5).
        exits: [
            { x: 25, y: 5, targetMapId: "yellow_route_nord", targetSpawnX: 12, targetSpawnY: 4 },
            // PORTE SUD (9,22)+(10,22) → GROTTE GELÉE (nouvelle chaîne Gelée→Plage→Bateau).
            ...([[9, 22], [10, 22]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_gelee", targetSpawnX: 4, targetSpawnY: 21 })),
        ],
        backgroundImage: "/yellow/sprites/grotte.png",
        backgroundImageWidth: 720,
        backgroundImageHeight: 744,
        backgroundImageTileSize: 24,
    },
    // ===== GROTTE GELÉE (après la porte Sud de la Rocheuse) =====
    yellow_grotte_gelee: {
        id: "yellow_grotte_gelee",
        name: "GROTTE GELÉE",
        tiles: buildGelee(),
        width: 30,
        height: 31,
        exits: [
            { x: 3, y: 21, targetMapId: "yellow_grotte", targetSpawnX: 9, targetSpawnY: 23 },                                                         // → Rocheuse (retour)
            ...([[19, 22], [20, 22]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_plage", targetSpawnX: 4, targetSpawnY: 20 })),           // → Plage
        ],
        backgroundImage: "/yellow/sprites/gelee.png",
        backgroundImageWidth: 1920,
        backgroundImageHeight: 1984,
        backgroundImageTileSize: 64,
    },
    // ===== PLAGE « Emerald Eastern Path » (herbes hautes 'H' = pop ; quai → bateau) =====
    yellow_plage: {
        id: "yellow_plage",
        name: "PLAGE",
        tiles: buildPlage(),
        width: 24,
        height: 40,
        exits: [
            ...([[3, 19], [4, 19]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_gelee", targetSpawnX: 19, targetSpawnY: 23 })),     // → Gelée (arche)
            ...([[15, 19], [15, 20]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_aqua_arena", targetSpawnX: 1, targetSpawnY: 19 })),      // → Bateau (Aqua Arena)
            // COL 23 → ÎLE ÉMERAUDE, LIGNE PAR LIGNE : le joueur surfe la mer (col 22) puis franchit vers l'EST →
            //   il débarque sur la COL 0 de l'île à la MÊME ligne (rows 0-31). Retour symétrique (île col 0 → plage col 22).
            ...Array.from({ length: 32 }, (_, y) => ({ x: 23, y, targetMapId: ILE_EMERAUDE_MAP_ID, targetSpawnX: 0, targetSpawnY: y })),               // → Île Émeraude (SURF, ligne par ligne)
        ],
        backgroundImage: "/yellow/sprites/plage.png",
        backgroundImageWidth: 960,
        backgroundImageHeight: 1600,
        backgroundImageTileSize: 40,
    },
    // ===== AQUA ARENA (intérieur/pont du bateau) — arène secrète =====
    yellow_aqua_arena: {
        id: "yellow_aqua_arena",
        name: "AQUA ARENA",
        tiles: buildAquaArena(),
        width: 24,
        height: 40,
        exits: [
            ...([[0, 19], [0, 20]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_plage", targetSpawnX: 14, targetSpawnY: 19 })),            // → Plage (quitter le bateau)
        ],
        backgroundImage: "/yellow/sprites/aqua_arena.png",
        backgroundImageWidth: 1536,
        backgroundImageHeight: 2560,
        backgroundImageTileSize: 64,
    },
    // ÎLE ÉMERAUDE (« EMERALD EASTERN PATH ») — île secrète à l'EST de la plage, accessible UNIQUEMENT EN SURF (mer
    //   col 22). SEUL endroit où GALIJAH peut apparaître (herbes hautes centrales). Retour plage = case eau ouest (3,16).
    [ILE_EMERAUDE_MAP_ID]: {
        id: ILE_EMERAUDE_MAP_ID,
        name: "EMERALD EASTERN PATH",
        tiles: buildIleEmeraude(),
        width: ILE_W,
        height: ILE_H,
        exits: [
            // COL 0 (bord OUEST, eau) → RETOUR PLAGE, LIGNE PAR LIGNE : on re-surfe vers l'ouest → on ressort sur la mer
            //   de la plage (col 22) à la MÊME ligne, d'où l'on regagne la crique/plage en surfant. Symétrique de l'aller.
            ...Array.from({ length: 32 }, (_, y) => ({ x: 0, y, targetMapId: "yellow_plage", targetSpawnX: 22, targetSpawnY: y })),
        ],
        backgroundImage: "/yellow/sprites/ile_emeraude.png",
        backgroundImageWidth: 760,
        backgroundImageHeight: 1280,
        backgroundImageTileSize: 40,
        encountersPaused: false, // GALIJAH (rencontre forcée) doit pouvoir se consommer sur l'herbe haute ; AUCUNE entrée ZONES → 0 rencontre aléatoire
    },
    // GROTTE DU NEXUS (casse-tête endgame, Mt. Moon 3 étages) — SÉPARÉE de la GROTTE ROCHEUSE. Accès PAYANT (50 JC)
    // via le MARCHAND (Zone de Combat). SORTIES : porte 1F (18,39) → hub · échelle du Dôme (B1F 45,5) · KO d'équipe
    // (plus de bouton menu « QUITTER »). Les 3 sections de grotte_casse_tete.png (2352px = 3×49
    // tuiles) = 1F (originX 0), B1F (784), B2F (1568). ÉCHELLES : même étiquette = 2 bouts. 1/2/3 relient 1F↔B2F
    // (sautent le B1F), a/b/c/d relient B1F↔B2F, « sortie » (B2F) → Nexus 3. Murs auto-générés + coords d'échelles
    // lues sur les images de solution → À CALER en jeu (debugGrid). Spawn = 1 tuile sous l'échelle d'arrivée (anti re-trigger).
    yellow_grotte_nexus: {
        id: "yellow_grotte_nexus",
        name: "GROTTE DU NEXUS (1F)",
        darkness: 1, // Grotte plongée dans le noir (rayon de base 1) — les lampes torches (marchand, JC) élargissent la vision
        tiles: buildGrotteNexusFloor("1F"),
        width: 49, height: 42,
        backgroundImage: "/yellow/sprites/grotte_casse_tete.png",
        backgroundImageWidth: 2352, backgroundImageHeight: 672, backgroundImageTileSize: 16,
        backgroundImageOriginX: 0, backgroundImageOriginY: 0,
        debugGrid: false, // grille de calage COUPÉE pour les joueurs (?grid=1 en dev si besoin). N.B. les rencontres = ZONES, rien à voir avec debugGrid
        // Topologie (Sartay) : 1F ↔ B1F via les échelles 1/2/3 (un trigger par case d'échelle).
        exits: [
            ...([[5, 7], [6, 7], [5, 8], [6, 8]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 3, targetSpawnY: 4 })),   // échelle 3 → B1F
            ...([[31, 17], [32, 17]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 43, targetSpawnY: 23 })),              // échelle 1 → B1F
            ...([[19, 15], [20, 15]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 25, targetSpawnY: 5 })),               // échelle 2 → B1F
            // PORTE D'ENTRÉE / SORTIE (le trou du mur bas) : ressort au hub Zone de Combat. Avec le KO d'équipe et
            //   l'échelle du Dôme (B1F 45,5), c'est l'UNE des 3 seules sorties (le bouton menu « QUITTER » est retiré).
            //   Trigger sur la SEULE case (18,39) = la case de SPAWN d'entrée : anti-ping-pong (gameStore ne warpe que
            //   sur un PAS EFFECTIF → pas de re-warp à l'arrivée) ET aucune touche unique depuis le spawn ne fait sortir
            //   (haut=grotte, bas/gauche=mur, droite=(19,39) cul-de-sac non-exit). On sort en re-marchant sur (18,39).
            { x: 18, y: 39, targetMapId: "yellow_zone_combat", targetSpawnX: 12, targetSpawnY: 10 },
        ],
    },
    yellow_grotte_nexus_b1f: {
        id: "yellow_grotte_nexus_b1f",
        name: "GROTTE DU NEXUS (B1F)",
        darkness: 1, // sombre (rayon de base 1) — cf. lampes torches
        tiles: buildGrotteNexusFloor("B1F"),
        width: 49, height: 42,
        backgroundImage: "/yellow/sprites/grotte_casse_tete.png",
        backgroundImageWidth: 2352, backgroundImageHeight: 672, backgroundImageTileSize: 16,
        backgroundImageOriginX: 784, backgroundImageOriginY: 0,
        debugGrid: false, encountersPaused: false, // grille COUPÉE (?grid=1 en dev) ; rencontres ACTIVES par BIOTOPE (cf. ZONES.yellow_grotte_nexus_b1f.rects)
        // B1F = étage pivot : échelles 1/2/3 remontent en 1F, a/b/c/d descendent en B2F, et (45,5) SORT de la grotte.
        exits: [
            ...([[3, 3], [3, 4]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus", targetSpawnX: 6, targetSpawnY: 8 })),          // échelle 3 → 1F
            ...([[43, 22], [43, 23]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus", targetSpawnX: 32, targetSpawnY: 17 })),    // échelle 1 → 1F
            { x: 25, y: 5, targetMapId: "yellow_grotte_nexus", targetSpawnX: 20, targetSpawnY: 15 },                                                    // échelle 2 → 1F
            { x: 17, y: 6, targetMapId: "yellow_grotte_nexus_b2f", targetSpawnX: 31, targetSpawnY: 12 },   // échelle a → B2F
            { x: 26, y: 37, targetMapId: "yellow_grotte_nexus_b2f", targetSpawnX: 17, targetSpawnY: 32 },  // échelle b → B2F
            { x: 22, y: 19, targetMapId: "yellow_grotte_nexus_b2f", targetSpawnX: 25, targetSpawnY: 22 },  // échelle c → B2F
            { x: 39, y: 5, targetMapId: "yellow_grotte_nexus_b2f", targetSpawnX: 5, targetSpawnY: 12 },    // échelle d → B2F
            { x: 45, y: 5, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 },          // ÉCHELLE DE FIN → DÔME DE FUSION (Autel de la Chimère) : l'ultime marche de la grotte-casse-tête
        ],
    },
    yellow_grotte_nexus_b2f: {
        id: "yellow_grotte_nexus_b2f",
        name: "GROTTE DU NEXUS (B2F)",
        darkness: 1, // sombre (rayon de base 1) — cf. lampes torches
        tiles: buildGrotteNexusFloor("B2F"),
        width: 49, height: 42,
        backgroundImage: "/yellow/sprites/grotte_casse_tete.png",
        backgroundImageWidth: 2352, backgroundImageHeight: 672, backgroundImageTileSize: 16,
        backgroundImageOriginX: 1568, backgroundImageOriginY: 0,
        debugGrid: false, encountersPaused: false, // grille COUPÉE (?grid=1 en dev) ; rencontres ACTIVES (cf. ZONES.yellow_grotte_nexus_b2f) : créations catchables + finales puissantes niv 75
        // B2F = fond de la grotte : a/b/c/d remontent en B1F (un trigger par case d'échelle).
        exits: [
            ...([[31, 12], [32, 12]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 17, targetSpawnY: 6 })),                                     // échelle a → B1F
            ...([[17, 31], [18, 31], [17, 32], [18, 32], [17, 33], [18, 33]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 26, targetSpawnY: 37 })), // échelle b → B1F
            ...([[25, 22], [26, 22]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 22, targetSpawnY: 19 })),                                     // échelle c → B1F
            ...([[5, 11], [6, 11], [5, 12], [6, 12]] as const).map(([x, y]) => ({ x, y, targetMapId: "yellow_grotte_nexus_b1f", targetSpawnX: 39, targetSpawnY: 5 })),                       // échelle d → B1F
        ],
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

// LIGUE DE FUSION — salle du Dieu Spaghetti en BRONZE : le boss EST la fin (pas de salle ultime), donc fond SANS
//   PORTE (cul-de-sac) + AUCUNE porte droite (seule la porte gauche = retraite Autel). MÊME id "yellow_fusion_miroir"
//   → tout le câblage (trainer, sacre, dialogues) reste INCHANGÉ. Résolue par gameStore.resolveActiveMap() UNIQUEMENT
//   quand le palier actif est le BRONZE. Argent/or gardent le fond AVEC porte (fusion_dome_champion.jpg) → porte
//   droite gated vers la salle ultime (ton reflet).
export const FUSION_MIROIR_BRONZE: YellowMapData = {
    ...YELLOW_MAPS.yellow_fusion_miroir,
    exits: [{ x: 2, y: 6, targetMapId: "yellow_combat_autel", targetSpawnX: 9, targetSpawnY: 8 }], // porte GAUCHE (retraite) seule — pas de porte droite
    backgroundImage: "/yellow/sprites/fusion_dome_champion_bronze.png",
    backgroundImageWidth: 2816, backgroundImageHeight: 1536, backgroundImageTileSize: 128,
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN 3 — VARIANTES d'arène re-thémées (glace / combat / spectre).
// MÊME id de carte que le run 1/2 → TOUT le câblage (équipes re-typées, badges, score, entrée via
// currentArenaMapId, Hall of Fame) reste INCHANGÉ. Ces variantes ne changent QUE la PRÉSENTATION quand on joue
// en run 3 : grille UNIFIÉE 15×10 (buildArenaPlante — collisions validées en jeu par Sartay) + fond re-thémé +
// entrée/sortie standard (7,9). Résolues par gameStore.resolveActiveMap() UNIQUEMENT si effectiveRunWorld()==="run3".
// Les dresseurs sont repositionnés en parallèle via run3X/run3Y (cf. trainers.ts + gameStore.activeNpcs).
// Arènes 4 (élec) & 5 (eau) : pas encore de nouveau fond → elles gardent la carte run 1/2 telle quelle.
const RUN3_ARENA_EXIT = [{ x: 7, y: 9, targetMapId: YELLOW_ENTRANCE_MAP_ID, targetSpawnX: 36, targetSpawnY: 11 }]
export const RUN3_ARENA_MAPS: Record<string, YellowMapData> = {
    yellow_arena: {
        ...YELLOW_MAPS.yellow_arena,
        name: "ARÈNE DE GLACE",
        backgroundImage: "/yellow/sprites/arena_glace_r3.png",
        backgroundImageWidth: 960, backgroundImageHeight: 640, backgroundImageTileSize: 64,
    },
    yellow_arena_roche: {
        ...YELLOW_MAPS.yellow_arena_roche,
        name: "ARÈNE DE COMBAT",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT,
        backgroundImage: "/yellow/sprites/arena_combat_r3.png",
        backgroundImageWidth: 960, backgroundImageHeight: 640, backgroundImageTileSize: 64,
    },
    yellow_arena_feu: {
        ...YELLOW_MAPS.yellow_arena_feu,
        name: "ARÈNE SPECTRALE",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT,
        backgroundImage: "/yellow/sprites/arena_spectre_r3.png",
        backgroundImageWidth: 960, backgroundImageHeight: 640, backgroundImageTileSize: 64,
    },
    yellow_arena_elec: {
        ...YELLOW_MAPS.yellow_arena_elec,
        name: "ARÈNE DRAGON",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT, // arène 4 = Ville Jaune (comme la base élec)
        backgroundImage: "/yellow/sprites/arena_dragon_r3.png",
        backgroundImageWidth: 960, backgroundImageHeight: 640, backgroundImageTileSize: 64,
    },
    yellow_arena_eau: {
        ...YELLOW_MAPS.yellow_arena_eau,
        name: "ARÈNE MULTI",
        tiles: buildArenaPlante(), width: 15, height: 10,
        // Arène 5 à CENDREVILLE → sortie (7,9) vers Cendreville (sous la porte de l'arène en 10,9), PAS Ville Jaune.
        exits: [{ x: 7, y: 9, targetMapId: "yellow_cendreville", targetSpawnX: 10, targetSpawnY: 10 }],
        backgroundImage: "/yellow/sprites/arena_multi_r3.png",
        backgroundImageWidth: 960, backgroundImageHeight: 640, backgroundImageTileSize: 64,
    },
}

// RUN 2 (NG+) — arènes re-skinnées : MÊME grille/dimensions/positions que le run 1 (donc mêmes cases marchables,
//   PNJ, entrée, sortie), SEUL le fond change. Appliqué par resolveActiveMap quand activeWorld === "ngplus".
//   Les gardes/boss sont rendus en sprites Gen 3 par activeNpcs (cf. NGPLUS_ARENA_NPCS) par-dessus ce fond.
export const NGPLUS_ARENA_MAPS: Record<string, YellowMapData> = {
    // Arène 1 (Bosquet Sacré) → arène VOL « Sanctuaire des Vents » (aire céleste, plumes, nuages). Image 2528×1686
    //   (ratio 3:2 = 15×10) → posée en 15×10 (width/tileSize = 15, height/tileSize = 10) → remplit la grille sans distorsion.
    yellow_arena: {
        ...YELLOW_MAPS.yellow_arena,
        name: "SANCTUAIRE DES VENTS",
        backgroundImage: "/yellow/sprites/arena_vol_r2.jpg",
        backgroundImageWidth: 1500, backgroundImageHeight: 1000, backgroundImageTileSize: 100,
    },
    // Arène 2 (Caverne Minière) → arène PSY « Nef Psychique ». Le sprite reprend la CONFIG de l'arène 1 (vol) → on
    //   RE-CONFIGURE la grille (buildArenaPlante 15×10) ET les cases ; les PNJ sont repositionnés via NGPLUS_ARENA_NPCS.
    yellow_arena_roche: {
        ...YELLOW_MAPS.yellow_arena_roche,
        name: "NEF PSYCHIQUE",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT,
        backgroundImage: "/yellow/sprites/arena_psy_r2.jpg",
        backgroundImageWidth: 1500, backgroundImageHeight: 1000, backgroundImageTileSize: 100,
    },
    // Arène 3 (La Caldeira, 16×16) → arène ÉQUILIBRÉE « Temple de l'Harmonie ». Même config que les arènes 1/2 :
    //   grille RE-CONFIGURÉE en 15×10 (buildArenaPlante) + PNJ repositionnés (cf. NGPLUS_ARENA_NPCS).
    yellow_arena_feu: {
        ...YELLOW_MAPS.yellow_arena_feu,
        name: "TEMPLE DE L'HARMONIE",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT,
        backgroundImage: "/yellow/sprites/arena_equi_r2.jpg",
        backgroundImageWidth: 1500, backgroundImageHeight: 1000, backgroundImageTileSize: 100,
    },
    // Arène 4 (Tour Hertz) → arène INSECTE « La Grande Ruche ». Même config que 1/2/3 (grille 15×10 + repositionnement).
    yellow_arena_elec: {
        ...YELLOW_MAPS.yellow_arena_elec,
        name: "LA GRANDE RUCHE",
        tiles: buildArenaPlante(), width: 15, height: 10, exits: RUN3_ARENA_EXIT,
        backgroundImage: "/yellow/sprites/arena_insecte_r2.jpg",
        backgroundImageWidth: 1500, backgroundImageHeight: 1000, backgroundImageTileSize: 100,
    },
    // Arène 5 (Sanctuaire des Marées, 16×16) → « Salle des Colosses » (finals inédits). Même config que 1-4 (15×10) ;
    //   MAIS elle est à Cendreville → sortie (7,9) vers yellow_cendreville (10,10), PAS Ville Jaune.
    yellow_arena_eau: {
        ...YELLOW_MAPS.yellow_arena_eau,
        name: "SALLE DES COLOSSES",
        tiles: buildArenaPlante(), width: 15, height: 10,
        exits: [{ x: 7, y: 9, targetMapId: "yellow_cendreville", targetSpawnX: 10, targetSpawnY: 10 }],
        backgroundImage: "/yellow/sprites/arena_finals_r2.jpg",
        backgroundImageWidth: 1500, backgroundImageHeight: 1000, backgroundImageTileSize: 100,
    },
}
