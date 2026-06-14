// scripts/render-maison-hantee-maze.ts
//
// Rend le LABYRINTHE INVISIBLE tel qu'il est CÂBLÉ dans maps.ts, par-dessus l'art réel de la
// maison hantée (public/yellow/sprites/maison_hantee.png), pour validation visuelle par Sartay.
// Murs d'arête = ROUGE, spawn = pastille verte, porte = bleu. (Données copiées de maps.ts.)
//   npx tsx scripts/render-maison-hantee-maze.ts

import sharp from "sharp"
import { join } from "path"

const W = 22, H = 16, TILE = 44
const COLLISION = [
    "######################", "######################", "######################",
    "######################", "######################", "########.....#########",
    "########......########", "#######........#######", "#####............#####",
    "#####...........######", "######..........######", "#####............#####",
    "#####...........######", "#########...##########", "##########DD##########", "##########DD##########",
]
const VWALLS = [
    "......................", "......................", "............|.|.......",
    "..............|.......", ".|...|................", ".|....................",
    ".|.|........|.........", "...|........|.........", "..||........|.........",
    "..........|.|.|.......", ".||..|......|.|.......", ".|............|.......",
    ".|............|.......", "..........|...........", "..........|...........", "......................",
]
const HWALLS = [
    "......................", "...._______......___..", "......................",
    "..__..___....__.......", "......_...............", "......................",
    "......................", "......................", "......................",
    "......................", "...__._....__.........", "......................",
    "...._______...........", "......................", "......................", "......................",
]
const walk = (x: number, y: number) => !!COLLISION[y] && x >= 0 && x < W && COLLISION[y][x] !== "#"
const SPAWN = { x: 10, y: 13 }

async function main() {
    const svg: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W * TILE}" height="${H * TILE}">`]
    // Porte (bleu) + cases praticables légèrement teintées pour situer la salle
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = COLLISION[y][x]
        if (c === "D") svg.push(`<rect x="${x * TILE}" y="${y * TILE}" width="${TILE}" height="${TILE}" fill="#2196f3" fill-opacity="0.5"/>`)
    }
    // Murs d'arête masqués (entre 2 cases praticables uniquement) = ROUGE épais
    let kept = 0
    for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (VWALLS[y][x] === "|" && walk(x, y) && walk(x + 1, y)) {
        const X = (x + 1) * TILE
        svg.push(`<line x1="${X}" y1="${y * TILE + 2}" x2="${X}" y2="${(y + 1) * TILE - 2}" stroke="#ff1744" stroke-width="5"/>`); kept++
    }
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (HWALLS[y][x] === "_" && walk(x, y) && walk(x, y + 1)) {
        const Y = (y + 1) * TILE
        svg.push(`<line x1="${x * TILE + 2}" y1="${Y}" x2="${(x + 1) * TILE - 2}" y2="${Y}" stroke="#ff1744" stroke-width="5"/>`); kept++
    }
    // Spawn (vert) + coordonnée légère sur chaque case praticable
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y)) {
        svg.push(`<text x="${x * TILE + TILE / 2}" y="${y * TILE + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.6" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
    svg.push(`<circle cx="${SPAWN.x * TILE + TILE / 2}" cy="${SPAWN.y * TILE + TILE / 2}" r="9" fill="#00e676" stroke="#000" stroke-width="2"/>`)
    svg.push(`</svg>`)
    const out = join(process.cwd(), "debug-maps", "maison_hantee_maze_FINAL.png")
    await sharp(join(process.cwd(), "public", "yellow", "sprites", "maison_hantee.png"))
        .composite([{ input: Buffer.from(svg.join("")), top: 0, left: 0 }]).png().toFile(out)
    console.log(`✅ ${out} — ${kept} arêtes barrées (rouge), spawn vert (${SPAWN.x},${SPAWN.y})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
