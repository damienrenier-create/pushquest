// scripts/gen-cendreville-map.ts
//
// Génère DEUX visualisations PNG de la map CENDREVILLE (debug / calage des collisions) :
//   1. cendreville_collisions.png : grille colorée par type de tuile + cases bloquées
//      teintées en rouge + coordonnées + spawn + sorties (portes) + légende.
//   2. cendreville_overlay.png    : l'art réel (cendreville.png) avec la grille de collisions
//      superposée (bloqué = rouge translucide, walkable = vert très léger) + spawn + sorties.
//
// Source de vérité : la VRAIE grille calculée (YELLOW_MAPS.yellow_cendreville.tiles) et la VRAIE
// règle de walkability (isBlockingTile) → jamais désynchronisé du jeu.
//
//   npx tsx scripts/gen-cendreville-map.ts

import { mkdirSync } from "fs"
import { join } from "path"
import sharp from "sharp"
import { YELLOW_MAPS, CENDREVILLE_SPAWN } from "../src/lib/gamebook/yellow/maps"
import { isBlockingTile } from "../src/lib/gamebook/mapEngine"

const TILE = 42 // assez grand pour afficher la coordonnée "x,y" dans CHAQUE case
const map = YELLOW_MAPS.yellow_cendreville
const grid = map.tiles
const H = grid.length
const W = grid[0].length

const TYPE_COLOR: Record<string, string> = {
    path: "#e0d2a6",       // route sable (walkable)
    grass: "#86c96a",      // herbe (walkable, rencontres)
    grassTall: "#5aa843",  // haute herbe
    water: "#3f86c9",      // eau (bloqué)
    tree: "#4b3a2a",       // arbres / bâtiments (bloqué)
    fence: "#9a7b4a",      // barrière (bloqué)
}
const FALLBACK = "#ff00ff"

const exitSet = new Set((map.exits ?? []).map((e: { x: number; y: number }) => `${e.x},${e.y}`))

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;") }

// ── 1) Grille autonome (avec marges coord + légende) ──────────────────────────
const L = 28, T = 28, LEG = 120
const fullW = L + W * TILE + 10
const fullH = T + H * TILE + LEG
const parts: string[] = []
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`)
parts.push(`<rect width="${fullW}" height="${fullH}" fill="#1c1c1c"/>`)

for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const t = grid[y][x]
        const col = TYPE_COLOR[t] ?? FALLBACK
        const px = L + x * TILE, py = T + y * TILE
        parts.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="${col}"/>`)
        if (isBlockingTile(t)) {
            // Teinte rouge translucide = case NON walkable.
            parts.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="#d62828" opacity="0.40"/>`)
        }
        // Coordonnée "x,y" dans CHAQUE case (texte blanc cerné de noir → lisible partout).
        parts.push(`<text x="${px + TILE / 2}" y="${py + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
}
// Grille : fines lignes + emphase toutes les 5 cases.
for (let x = 0; x <= W; x++) {
    const px = L + x * TILE
    const heavy = x % 5 === 0
    parts.push(`<line x1="${px}" y1="${T}" x2="${px}" y2="${T + H * TILE}" stroke="${heavy ? "#000" : "#0006"}" stroke-width="${heavy ? 1.4 : 0.5}"/>`)
    if (heavy && x < W) parts.push(`<text x="${px + 2}" y="${T - 8}" fill="#ddd" font-size="11">${x}</text>`)
}
for (let y = 0; y <= H; y++) {
    const py = T + y * TILE
    const heavy = y % 5 === 0
    parts.push(`<line x1="${L}" y1="${py}" x2="${L + W * TILE}" y2="${py}" stroke="${heavy ? "#000" : "#0006"}" stroke-width="${heavy ? 1.4 : 0.5}"/>`)
    if (heavy && y < H) parts.push(`<text x="4" y="${py + 14}" fill="#ddd" font-size="11">${y}</text>`)
}
// Sorties (portes) : contour orange + libellé.
for (const e of (map.exits ?? []) as { x: number; y: number }[]) {
    const px = L + e.x * TILE, py = T + e.y * TILE
    parts.push(`<rect x="${px + 1}" y="${py + 1}" width="${TILE - 2}" height="${TILE - 2}" fill="#ff9f1c" opacity="0.85" stroke="#5a3a00" stroke-width="1.5"/>`)
}
// Spawn : disque vert + "S".
{
    const cx = L + CENDREVILLE_SPAWN.x * TILE + TILE / 2, cy = T + CENDREVILLE_SPAWN.y * TILE + TILE / 2
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${TILE / 2 - 2}" fill="#2ecc40" stroke="#fff" stroke-width="2"/>`)
    parts.push(`<text x="${cx}" y="${cy + 4}" fill="#06310c" font-size="12" font-weight="bold" text-anchor="middle">S</text>`)
}
// Légende.
const legY = T + H * TILE + 16
const legend: [string, string][] = [
    ["#e0d2a6", "route (walkable)"],
    ["#86c96a", "herbe (walkable)"],
    ["#5aa843", "haute herbe"],
    ["#3f86c9", "eau (bloque)"],
    ["#4b3a2a", "arbre/batiment (bloque)"],
    ["#d62828", "teinte rouge = NON walkable"],
    ["#ff9f1c", "porte / sortie"],
    ["#2ecc40", "spawn (S)"],
]
parts.push(`<text x="${L}" y="${legY - 2}" fill="#fff" font-size="13" font-weight="bold">CENDREVILLE — ${W}x${H} (tuile ${TILE}px) — grille de collisions</text>`)
legend.forEach(([c, label], i) => {
    const ly = legY + 14 + i * 13
    parts.push(`<rect x="${L}" y="${ly - 9}" width="12" height="11" fill="${c}"/>`)
    parts.push(`<text x="${L + 18}" y="${ly}" fill="#eee" font-size="11">${esc(label)}</text>`)
})
parts.push(`</svg>`)

// ── 2) Overlay COMBINÉ : art réel + collisions + COORDONNÉES + légende, tout d'un
//      coup. Même canevas/marges que la grille (1), mais les tuiles ne sont PAS remplies
//      d'une couleur pleine — seulement teintées (bloqué=rouge / walkable=vert léger) pour
//      laisser voir l'art dessous. L'art est composité à l'offset (L,T) dans main().
const oParts: string[] = []
oParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`)
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const px = L + x * TILE, py = T + y * TILE
        if (isBlockingTile(grid[y][x])) {
            oParts.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="#d62828" opacity="0.42"/>`)
        } else {
            oParts.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="#2ecc40" opacity="0.12"/>`)
        }
        // Coordonnée "x,y" sur CHAQUE case (par-dessus l'art).
        oParts.push(`<text x="${px + TILE / 2}" y="${py + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
}
// Grille + COORDONNÉES dans les marges (sur fond sombre → lisibles).
for (let x = 0; x <= W; x++) {
    const px = L + x * TILE, heavy = x % 5 === 0
    oParts.push(`<line x1="${px}" y1="${T}" x2="${px}" y2="${T + H * TILE}" stroke="${heavy ? "#000a" : "#0005"}" stroke-width="${heavy ? 1.2 : 0.4}"/>`)
    if (heavy && x < W) oParts.push(`<text x="${px + 2}" y="${T - 8}" fill="#fff" font-size="11">${x}</text>`)
}
for (let y = 0; y <= H; y++) {
    const py = T + y * TILE, heavy = y % 5 === 0
    oParts.push(`<line x1="${L}" y1="${py}" x2="${L + W * TILE}" y2="${py}" stroke="${heavy ? "#000a" : "#0005"}" stroke-width="${heavy ? 1.2 : 0.4}"/>`)
    if (heavy && y < H) oParts.push(`<text x="4" y="${py + 14}" fill="#fff" font-size="11">${y}</text>`)
}
for (const e of (map.exits ?? []) as { x: number; y: number }[]) {
    oParts.push(`<rect x="${L + e.x * TILE + 1}" y="${T + e.y * TILE + 1}" width="${TILE - 2}" height="${TILE - 2}" fill="#ff9f1c" opacity="0.7" stroke="#5a3a00" stroke-width="1.5"/>`)
}
{
    const cx = L + CENDREVILLE_SPAWN.x * TILE + TILE / 2, cy = T + CENDREVILLE_SPAWN.y * TILE + TILE / 2
    oParts.push(`<circle cx="${cx}" cy="${cy}" r="${TILE / 2 - 2}" fill="#2ecc40" stroke="#fff" stroke-width="2"/>`)
    oParts.push(`<text x="${cx}" y="${cy + 4}" fill="#06310c" font-size="12" font-weight="bold" text-anchor="middle">S</text>`)
}
// Légende (mêmes positions que la grille autonome).
const oLegItems: [string, string][] = [
    ["#d62828", "rouge = NON walkable (bloque)"],
    ["#2ecc40", "vert leger = walkable"],
    ["#ff9f1c", "porte / sortie"],
    ["#2ecc40", "spawn (S)"],
]
oParts.push(`<text x="${L}" y="${legY - 2}" fill="#fff" font-size="13" font-weight="bold">CENDREVILLE — art + collisions + coordonnees (${W}x${H})</text>`)
oLegItems.forEach(([c, label], i) => {
    const ly = legY + 14 + i * 14
    oParts.push(`<rect x="${L}" y="${ly - 10}" width="13" height="12" fill="${c}" opacity="${c === "#2ecc40" && i === 1 ? 0.5 : 1}"/>`)
    oParts.push(`<text x="${L + 19}" y="${ly}" fill="#eee" font-size="11">${esc(label)}</text>`)
})
oParts.push(`</svg>`)

// ── Rendu ─────────────────────────────────────────────────────────────────────
const OUT_DIR = join(process.cwd(), "debug-maps")
mkdirSync(OUT_DIR, { recursive: true })

async function main() {
    const outA = join(OUT_DIR, "cendreville_collisions.png")
    await sharp(Buffer.from(parts.join(""))).png().toFile(outA)
    console.log("✅", outA)

    const artPath = join(process.cwd(), "public", "yellow", "sprites", "cendreville.png")
    const artBuf = await sharp(artPath).resize(W * TILE, H * TILE, { kernel: "nearest" }).toBuffer()
    const outB = join(OUT_DIR, "cendreville_overlay.png")
    // Canevas sombre (mêmes dimensions que la grille) → art inséré dans la zone (L,T) →
    // overlay collisions + coordonnées + légende par-dessus.
    await sharp({ create: { width: fullW, height: fullH, channels: 4, background: { r: 28, g: 28, b: 28, alpha: 1 } } })
        .composite([
            { input: artBuf, top: T, left: L },
            { input: Buffer.from(oParts.join("")), top: 0, left: 0 },
        ])
        .png()
        .toFile(outB)
    console.log("✅", outB)

    // Stats utiles.
    let blocked = 0
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isBlockingTile(grid[y][x])) blocked++
    console.log(`Grille ${W}x${H} = ${W * H} cases · bloquées ${blocked} · walkable ${W * H - blocked} · spawn (${CENDREVILLE_SPAWN.x},${CENDREVILLE_SPAWN.y}) · sorties ${exitSet.size}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
