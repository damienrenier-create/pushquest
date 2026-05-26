// scripts/downscale-animal-sprites.ts
//
// v3.34+ — Downscale les PNG animaux générés par Gemini (souvent en 1024×1024)
// vers 64×64 avec préservation du pixel art (nearest-neighbor, pas d'anti-alias).
//
// Usage :
//   1. Drop les PNG bruts dans scripts/sprites-raw/ (nommés "level_NN_slug.png")
//   2. npm install sharp --save-dev
//   3. npx tsx scripts/downscale-animal-sprites.ts
//   4. Les versions 64×64 sont écrites dans public/sprites/animals/
//
// Idempotent : ré-exécutable, écrase les outputs.

import { promises as fs } from "fs"
import path from "path"
import sharp from "sharp"

const INPUT_DIR = path.join(process.cwd(), "scripts", "sprites-raw")
const OUTPUT_DIR = path.join(process.cwd(), "public", "sprites", "animals")
const TARGET_SIZE = 64

async function main() {
    console.log(`→ Downscale ${INPUT_DIR} → ${OUTPUT_DIR} (cible ${TARGET_SIZE}×${TARGET_SIZE})`)
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    let files: string[]
    try {
        files = (await fs.readdir(INPUT_DIR)).filter((f) => f.toLowerCase().endsWith(".png"))
    } catch {
        console.error(`Le dossier ${INPUT_DIR} n'existe pas. Crée-le et drop tes PNG dedans.`)
        process.exit(1)
    }

    if (files.length === 0) {
        console.error("Aucun PNG trouvé. Drop les PNG dans scripts/sprites-raw/.")
        process.exit(1)
    }

    let ok = 0, failed = 0
    for (const f of files) {
        try {
            const inPath = path.join(INPUT_DIR, f)
            const outPath = path.join(OUTPUT_DIR, f)
            await sharp(inPath)
                .resize(TARGET_SIZE, TARGET_SIZE, {
                    fit: "contain",
                    kernel: "nearest",   // préserve le pixel art
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .png({ compressionLevel: 9 })
                .toFile(outPath)
            console.log(`  ✓ ${f}`)
            ok++
        } catch (e) {
            console.warn(`  ✗ ${f} —`, (e as Error).message)
            failed++
        }
    }
    console.log(`\nDone. ${ok} OK, ${failed} fail.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
