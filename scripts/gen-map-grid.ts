// scripts/gen-map-grid.ts
//
// Génère un OVERLAY NUMÉROTÉ d'une image de map (art + grille + coordonnée X,Y sur CHAQUE case)
// pour que Sartay puisse indiquer entrée/sortie + cases walkables (à peindre en rouge ensuite,
// puis ré-extraction via analyze-cendreville-red.ts). NE déduit PAS les collisions (illustration).
//   npx tsx scripts/gen-map-grid.ts "<image>" <W> <H> <nomSortie>

import { mkdirSync } from "fs"
import { join, basename } from "path"
import sharp from "sharp"

const SRC = process.argv[2]
const W = Number(process.argv[3])
const H = Number(process.argv[4])
const OUT = process.argv[5] ?? basename(SRC).replace(/\.[^.]+$/, "") + "_grid"
if (!SRC || !W || !H) { console.error("usage: gen-map-grid <image> <W> <H> [out]"); process.exit(1) }

const TILE = 44, L = 32, T = 30, MARGIN = 8

async function main() {
    const fullW = L + W * TILE + MARGIN
    const fullH = T + H * TILE + MARGIN
    const s: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`]
    // Coordonnée X,Y sur chaque case (texte blanc cerné de noir → lisible sur tout fond).
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        s.push(`<text x="${L + x * TILE + TILE / 2}" y="${T + y * TILE + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="10" text-anchor="middle">${x},${y}</text>`)
    }
    // Grille fine + emphase toutes les 5 + numéros de repère dans les marges.
    for (let x = 0; x <= W; x++) {
        const p = L + x * TILE, hv = x % 5 === 0
        s.push(`<line x1="${p}" y1="${T}" x2="${p}" y2="${T + H * TILE}" stroke="${hv ? "#000c" : "#0006"}" stroke-width="${hv ? 1.4 : 0.5}"/>`)
        if (hv && x < W) s.push(`<text x="${p + 2}" y="${T - 8}" fill="#fff" font-size="12" font-weight="bold">${x}</text>`)
    }
    for (let y = 0; y <= H; y++) {
        const p = T + y * TILE, hv = y % 5 === 0
        s.push(`<line x1="${L}" y1="${p}" x2="${L + W * TILE}" y2="${p}" stroke="${hv ? "#000c" : "#0006"}" stroke-width="${hv ? 1.4 : 0.5}"/>`)
        if (hv && y < H) s.push(`<text x="4" y="${p + 14}" fill="#fff" font-size="12" font-weight="bold">${y}</text>`)
    }
    s.push(`<text x="${L}" y="${T + H * TILE + 6}" fill="#fff" font-size="12" font-weight="bold">${esc(basename(SRC))} — grille ${W}x${H}</text>`)
    s.push(`</svg>`)

    const OUT_DIR = join(process.cwd(), "debug-maps"); mkdirSync(OUT_DIR, { recursive: true })
    const art = await sharp(SRC).resize(W * TILE, H * TILE, { fit: "fill", kernel: "nearest" }).toBuffer()
    const out = join(OUT_DIR, OUT + ".png")
    await sharp({ create: { width: fullW, height: fullH, channels: 4, background: { r: 22, g: 22, b: 22, alpha: 1 } } })
        .composite([{ input: art, top: T, left: L }, { input: Buffer.from(s.join("")), top: 0, left: 0 }])
        .png().toFile(out)
    console.log("✅", out, `(${fullW}x${fullH})`)
}
function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;") }
main().catch((e) => { console.error(e); process.exit(1) })
