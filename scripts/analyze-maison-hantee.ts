// scripts/analyze-maison-hantee.ts
//
// Diagnostic + extraction des collisions de la MAISON HANTÉE depuis l'overlay annoté
// `debug-maps/maison_hantee_zonewalkable.png` (1008x742, peint sur la grille numérotée).
// Géométrie de la grille : L=32, T=30, TILE=44, 22x16 (cf. gen-map-grid.ts).
//
// Classement par case (échantillonnage multi-points pour ignorer texte de coordonnée + lignes) :
//   B = noir  (fond/extérieur → MUR)      W = blanc (peint → MUR)
//   G = vert  (porte)                      . = autre/pierre (SOL praticable)
//   npx tsx scripts/analyze-maison-hantee.ts

import sharp from "sharp"
import { join } from "path"

const SRC = join(process.cwd(), "debug-maps", "maison_hantee_zonewalkable.png")
const L = 32, T = 30, TILE = 44, W = 22, H = 16

type Cls = "B" | "W" | "G" | "."
function classifyPixel(r: number, g: number, b: number): Cls {
    if (g > 120 && r < 140 && b < 140 && g - r > 40 && g - b > 40) return "G" // vert franc
    if (r < 55 && g < 55 && b < 55) return "B"                                 // quasi noir
    if (r > 200 && g > 200 && b > 200) return "W"                              // quasi blanc
    return "."                                                                  // pierre/art
}

async function main() {
    const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const ch = info.channels
    const at = (px: number, py: number): [number, number, number] => {
        const i = (py * info.width + px) * ch
        return [data[i], data[i + 1], data[i + 2]]
    }
    const rows: string[] = []
    for (let y = 0; y < H; y++) {
        let row = ""
        for (let x = 0; x < W; x++) {
            const cx = L + x * TILE, cy = T + y * TILE
            const counts: Record<Cls, number> = { B: 0, W: 0, G: 0, ".": 0 }
            // grille de points insérée (10..34) pour éviter lignes de grille + texte central
            for (let oy = 10; oy <= 34; oy += 4) for (let ox = 10; ox <= 34; ox += 4) {
                const [r, g, b] = at(cx + ox, cy + oy)
                counts[classifyPixel(r, g, b)]++
            }
            // Priorité : porte (vert) > peinture blanche > noir > sol. Le texte blanc de coordonnée
            // est minoritaire sur une case de sol → seuils élevés pour W.
            let cls: Cls = "."
            if (counts.G >= 6) cls = "G"
            else if (counts.W >= 30) cls = "W"
            else if (counts.B >= 30) cls = "B"
            row += cls
        }
        rows.push(row)
    }
    console.log("Grille brute (B=noir W=blanc G=vert .=sol) :")
    rows.forEach((r, i) => console.log(String(i).padStart(2), r))

    // --- FLOOD-FILL depuis les portes : ne garde que le SOL CONNECTÉ à la porte ---
    // (élimine les fragments d'art isolés, ex. le bandeau du haut coupé du reste).
    const grid = rows.map((r) => [...r])
    const isOpen = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && (grid[y][x] === "." || grid[y][x] === "G")
    const reach = Array.from({ length: H }, () => new Array(W).fill(false))
    const stack: [number, number][] = []
    grid.forEach((r, y) => r.forEach((c, x) => { if (c === "G") { stack.push([x, y]); reach[y][x] = true } }))
    while (stack.length) {
        const [x, y] = stack.pop()!
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = x + dx, ny = y + dy
            if (isOpen(nx, ny) && !reach[ny][nx]) { reach[ny][nx] = true; stack.push([nx, ny]) }
        }
    }

    // Carte finale : # = mur · . = sol praticable · D = porte (sortie). Sol non connecté → mur.
    const greens: [number, number][] = []
    const final = grid.map((r, y) => r.map((c, x) => {
        if (c === "G") { greens.push([x, y]); return "D" }
        return reach[y][x] ? "." : "#"
    }).join(""))
    console.log("\nCarte finale (# mur · . sol · D porte) :")
    final.forEach((r, i) => console.log(String(i).padStart(2), r))
    console.log("\nPortes (vert) :", greens.map(([x, y]) => `${x},${y}`).join(" | ") || "(aucune)")
    const nFloor = final.join("").split("").filter((c) => c === ".").length
    console.log(`Sol praticable=${nFloor}  Portes=${greens.length}`)
    console.log("\nÀ COLLER dans maps.ts (MAISON_HANTEE_COLLISION_MAP) :")
    console.log(final.map((r) => `    "${r}",`).join("\n"))

    // --- OVERLAY de vérification (art + sol vert / mur rouge / porte bleue + coordonnée) ---
    const svg: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${L + W * TILE + 8}" height="${T + H * TILE + 8}" font-family="monospace">`]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = final[y][x]
        const fill = c === "D" ? "#2196f3" : c === "." ? "#00e676" : "#f44336"
        svg.push(`<rect x="${L + x * TILE}" y="${T + y * TILE}" width="${TILE}" height="${TILE}" fill="${fill}" fill-opacity="0.42" stroke="#0008" stroke-width="0.5"/>`)
        svg.push(`<text x="${L + x * TILE + TILE / 2}" y="${T + y * TILE + TILE / 2 + 3}" fill="#fff" stroke="#000" stroke-width="0.7" paint-order="stroke" font-size="9" text-anchor="middle">${x},${y}</text>`)
    }
    svg.push(`</svg>`)
    const art = await sharp(SRC).extract({ left: L, top: T, width: W * TILE, height: H * TILE }).toBuffer()
    const outPath = join(process.cwd(), "debug-maps", "maison_hantee_check.png")
    await sharp({ create: { width: L + W * TILE + 8, height: T + H * TILE + 8, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
        .composite([{ input: art, top: T, left: L }, { input: Buffer.from(svg.join("")), top: 0, left: 0 }])
        .png().toFile(outPath)
    console.log("\n✅ Overlay de vérif :", outPath)
}
main().catch((e) => { console.error(e); process.exit(1) })
