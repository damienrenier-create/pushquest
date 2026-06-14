// Rendu de contrôle de la plaine d'entraînement (debug-maps/hautes_herbes_check.png).
import sharp from "sharp"
import { join } from "path"
const W = 24, H = 10, T = 30
const SQUARES: [number, number, string][] = [[2, 5, "NORMAL"], [7, 10, "PLANTE"], [12, 15, "EAU"], [17, 20, "FEU"]]
const tile = (x: number, y: number): "tree" | "grass" | "grassTall" => {
    if (y >= 2 && y <= 6 && x >= 2 && x <= 21) return SQUARES.some(([a, b]) => x >= a && x <= b) ? "grassTall" : "grass"
    if ((y === 7 || y === 8) && x >= 2 && x <= 21) return "grass"
    if (y === 9 && (x === 11 || x === 12)) return "grass"
    return "tree"
}
const band = (y: number) => 6 - y // band 0 (bas) .. 4 (haut)
const lvl = (y: number) => `${3 + 3 * band(y)}-${6 + 3 * band(y)}`
async function main() {
    const col = { tree: "#163d22", grass: "#8ed35a", grassTall: "#2f9e44" }
    const s: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W * T}" height="${H * T}" font-family="monospace">`]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const tt = tile(x, y)
        s.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="${col[tt]}" stroke="#0006" stroke-width="0.5"/>`)
        if (tt === "grassTall") s.push(`<text x="${x * T + T / 2}" y="${y * T + T / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.6" paint-order="stroke" font-size="8" text-anchor="middle">${lvl(y)}</text>`)
    }
    // libellés de type au-dessus de chaque carré + entrée/sortie
    for (const [a, , name] of SQUARES) s.push(`<text x="${a * T}" y="${1 * T + 18}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="10" font-weight="bold">${name}</text>`)
    s.push(`<circle cx="${11 * T + T / 2}" cy="${8 * T + T / 2}" r="7" fill="#ffd400" stroke="#000"/>`) // spawn
    s.push(`<text x="${11 * T - 8}" y="${9 * T + 20}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="9">SORTIE↓</text>`)
    s.push(`</svg>`)
    const out = join(process.cwd(), "debug-maps", "hautes_herbes_check.png")
    await sharp({ create: { width: W * T, height: H * T, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
        .composite([{ input: Buffer.from(s.join("")), top: 0, left: 0 }]).png().toFile(out)
    console.log("OK", out)
}
main().catch((e) => { console.error(e); process.exit(1) })
