// scripts/analyze-cendreville-red.ts
//
// Lit l'overlay Cendreville REPEINT EN ROUGE par Sartay (zones non-walkable) et en extrait
// la grille de collisions au pixel près (échantillonne le centre de chaque case, classe
// "mur" si rouge dominant). Sort une carte ASCII (# = mur, . = walkable) + le JSON des lignes.
//   npx tsx scripts/analyze-cendreville-red.ts "<chemin image>"

import sharp from "sharp"

const PATH = process.argv[2] ?? "C:/Users/Sartay/Downloads/cendreville_overlay red.png"
const W = 44, H = 37, TILE = 42, L = 28, T = 28
const REF_W = L + W * TILE + 10   // 1886 (mon overlay)
const REF_H = T + H * TILE + 120  // 1702

async function main() {
    const { data, info } = await sharp(PATH).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const sx = info.width / REF_W, sy = info.height / REF_H
    console.log(`img ${info.width}x${info.height} · scale ${sx.toFixed(3)},${sy.toFixed(3)} · ch ${info.channels}`)
    const at = (X: number, Y: number) => {
        const ix = Math.min(info.width - 1, Math.max(0, Math.round(X * sx)))
        const iy = Math.min(info.height - 1, Math.max(0, Math.round(Y * sy)))
        const i = (iy * info.width + ix) * info.channels
        return [data[i], data[i + 1], data[i + 2]] as const
    }
    const rows: string[] = []
    let walls = 0
    for (let y = 0; y < H; y++) {
        let row = ""
        for (let x = 0; x < W; x++) {
            let r = 0, g = 0, b = 0, n = 0
            for (let dy = 6; dy < TILE - 6; dy += 3) for (let dx = 4; dx < TILE - 4; dx += 3) {
                // évite la bande centrale où s'affiche le texte de coordonnée
                if (Math.abs(dx - TILE / 2) < 15 && Math.abs(dy - TILE / 2) < 8) continue
                const [R, G, B] = at(L + x * TILE + dx, T + y * TILE + dy)
                if (R > 205 && G > 205 && B > 205) continue // texte blanc
                if (R < 50 && G < 50 && B < 50) continue     // contour noir / lignes
                r += R; g += G; b += B; n++
            }
            if (n === 0) { row += "."; continue }
            r /= n; g /= n; b /= n
            const wall = (r - g > 26) && (r - b > 16) && r > 110
            if (wall) walls++
            row += wall ? "#" : "."
        }
        rows.push(row)
    }
    console.log("     " + Array.from({ length: W }, (_, x) => x % 10).join(""))
    rows.forEach((r, y) => console.log(String(y).padStart(3, " ") + "  " + r))
    console.log(`\nmurs=${walls} walkable=${W * H - walls}`)
    console.log("ROWS_JSON=" + JSON.stringify(rows))
}
main().catch((e) => { console.error(e); process.exit(1) })
