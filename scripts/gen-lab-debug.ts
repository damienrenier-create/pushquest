// scripts/gen-lab-debug.ts
//
// DEBUG MAP du LABO SCIENTIFIQUE (yellow_infirmary_2e, 14×10). Rejoue EXACTEMENT buildLabInterior()
// → superpose à l'art : collisions (sol praticable / mur / escalator), PNJ, sortie, coordonnée par case.
//   npx tsx scripts/gen-lab-debug.ts
import { mkdirSync } from "fs"
import { join } from "path"
import sharp from "sharp"

const W = 14, H = 10
// --- Réplique fidèle de buildLabInterior() (maps.ts) ---
type T = "wall" | "floor" | "door"
const m: T[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "wall" as T))
const open = (y: number, x0: number, x1: number) => { for (let x = x0; x <= x1; x++) m[y][x] = "floor" }
open(4, 0, 10); open(5, 2, 10); open(6, 2, 6); open(7, 1, 4); open(8, 0, 4); open(9, 1, 4)
m[6][1] = "door" // escalator → infirmerie

// PNJ / interactifs (npcs.ts) + sortie (maps.ts exits).
const NPCS = [
    { x: 3, y: 3, label: "TERMINAL", color: "#3a8ee0" },
    { x: 5, y: 3, label: "SCIENTIF.", color: "#e0b020" },
]
const EXIT = { x: 1, y: 6, label: "↧ infirm." }

const TILE = 52, L = 34, TOP = 32, MARGIN = 10
const COL: Record<T, string> = { wall: "rgba(200,40,40,0.42)", floor: "rgba(40,200,90,0.30)", door: "rgba(60,130,240,0.55)" }

async function main() {
    const fullW = L + W * TILE + MARGIN, fullH = TOP + H * TILE + MARGIN
    const s: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" font-family="monospace">`]
    // Tinte chaque case selon sa collision + coordonnée.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = L + x * TILE, py = TOP + y * TILE
        s.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="${COL[m[y][x]]}"/>`)
        s.push(`<text x="${px + TILE / 2}" y="${py + TILE - 5}" fill="#fff" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
    // Sortie (escalator).
    s.push(marker(EXIT.x, EXIT.y, "#2f7ae0", "🪜"))
    s.push(`<text x="${L + EXIT.x * TILE + TILE / 2}" y="${TOP + EXIT.y * TILE + 13}" fill="#cfe6ff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="8" text-anchor="middle">${EXIT.label}</text>`)
    // PNJ (interaction depuis la case sol DEVANT, en y+1).
    for (const n of NPCS) {
        s.push(`<rect x="${L + n.x * TILE + 3}" y="${TOP + n.y * TILE + 3}" width="${TILE - 6}" height="${TILE - 6}" fill="none" stroke="${n.color}" stroke-width="3" rx="6"/>`)
        s.push(`<text x="${L + n.x * TILE + TILE / 2}" y="${TOP + n.y * TILE + 16}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="8.5" font-weight="bold" text-anchor="middle">${n.label}</text>`)
        // Flèche vers la case d'interaction (devant, y+1).
        s.push(`<text x="${L + n.x * TILE + TILE / 2}" y="${TOP + (n.y + 1) * TILE + TILE / 2 + 4}" fill="${n.color}" stroke="#000" stroke-width="0.8" paint-order="stroke" font-size="16" font-weight="bold" text-anchor="middle">▲</text>`)
    }
    // Grille + repères de marge.
    for (let x = 0; x <= W; x++) { const p = L + x * TILE; s.push(`<line x1="${p}" y1="${TOP}" x2="${p}" y2="${TOP + H * TILE}" stroke="#000a" stroke-width="${x % 5 === 0 ? 1.4 : 0.5}"/>`); if (x < W) s.push(`<text x="${p + TILE / 2}" y="${TOP - 8}" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">${x}</text>`) }
    for (let y = 0; y <= H; y++) { const p = TOP + y * TILE; s.push(`<line x1="${L}" y1="${p}" x2="${L + W * TILE}" y2="${p}" stroke="#000a" stroke-width="${y % 5 === 0 ? 1.4 : 0.5}"/>`); if (y < H) s.push(`<text x="6" y="${p + TILE / 2 + 4}" fill="#fff" font-size="11" font-weight="bold">${y}</text>`) }
    s.push(`<text x="${L}" y="${TOP + H * TILE + 7}" fill="#fff" font-size="11" font-weight="bold">LABO (yellow_infirmary_2e) 14x10 — vert=sol · rouge=mur · bleu=escalator · cadre=PNJ · ▲=case d'interaction</text>`)
    s.push(`</svg>`)

    const OUT_DIR = join(process.cwd(), "debug-maps"); mkdirSync(OUT_DIR, { recursive: true })
    const art = await sharp(join(process.cwd(), "public/yellow/sprites/lab_interior.png")).resize(W * TILE, H * TILE, { fit: "fill" }).toBuffer()
    const out = join(OUT_DIR, "lab_debug.png")
    await sharp({ create: { width: fullW, height: fullH, channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
        .composite([{ input: art, top: TOP, left: L }, { input: Buffer.from(s.join("")), top: 0, left: 0 }])
        .png().toFile(out)
    console.log("✅", out, `(${fullW}x${fullH})`)
}
function marker(x: number, y: number, color: string, glyph: string) {
    return `<rect x="${L + x * TILE + 3}" y="${TOP + y * TILE + 3}" width="${TILE - 6}" height="${TILE - 6}" fill="none" stroke="${color}" stroke-width="3" rx="6"/><text x="${L + x * TILE + TILE / 2}" y="${TOP + y * TILE + TILE - 16}" font-size="18" text-anchor="middle">${glyph}</text>`
}
main().catch((e) => { console.error(e); process.exit(1) })
