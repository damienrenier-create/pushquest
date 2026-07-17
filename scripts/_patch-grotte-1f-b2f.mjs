// Patch CIBLÉ de la collision Grotte du Nexus (1F + B2F) depuis les données de Sartay.
// Ne touche QUE les cases listées ; le reste de la grille reste inchangé.
//   node scripts/_patch-grotte-1f-b2f.mjs   (ou npx tsx)
import { readFileSync, writeFileSync } from "fs"

const path = "src/lib/gamebook/yellow/data/grotteNexusArt.ts"
const mod = await import("../src/lib/gamebook/yellow/data/grotteNexusArt.ts")
const ART = structuredClone(mod.GROTTE_NEXUS_ART)

// helpers → listes de [col,row]
const col = (c, r1, r2) => { const a = []; for (let r = r1; r <= r2; r++) a.push([c, r]); return a }
const line = (r, c1, c2) => { const a = []; for (let c = c1; c <= c2; c++) a.push([c, r]); return a }
const rect = (c1, r1, c2, r2) => { const a = []; for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) a.push([c, r]); return a }
const SW = 49, SH = 42

function apply(floor, ops) {
    const g = ART[floor].map((row) => [...row])
    const set = (cells, ch) => { for (const [c, r] of cells) { if (c >= 0 && c < SW && r >= 0 && r < SH) g[r][c] = ch } }
    set(ops.wall ?? [], "#")
    set(ops.water ?? [], "~")
    set(ops.walk ?? [], ".") // walkable/échelles/spawn EN DERNIER → gagnent sur les murs en cas de recouvrement
    ART[floor] = g.map((row) => row.join(""))
}

// ── 1F ──
const bottom1F = [...line(39, 0, SW - 1), ...line(40, 0, SW - 1), ...line(41, 0, SW - 1)]
apply("1F", {
    wall: [
        ...col(14, 2, 18), ...col(20, 12, 14), ...col(20, 17, 26), ...col(39, 16, 33), ...col(13, 34, 39),
        ...line(20, 0, 10), ...line(23, 11, 20), ...line(11, 21, 35),
        [40, 10], [41, 10], [41, 9], [42, 9], [43, 9], [44, 9], [42, 8],          // rochers
        [40, 15], [41, 15], [14, 33], [15, 33], [16, 33],                          // isolées
        ...rect(33, 31, 36, 36),                                                   // rectangle
        ...bottom1F,                                                               // bord inférieur (rows 39-41)
    ],
    water: [[4, 23], [5, 23], [6, 23]],                                            // mare
    walk: [
        [5, 7], [6, 7], [5, 8], [6, 8], [19, 15], [20, 15], [19, 16], [20, 16], [31, 17], [32, 17], [31, 18], [32, 18], // échelles
        ...rect(3, 24, 6, 33),                                                     // zone de spawn Eau (marchable)
        [18, 39], [19, 39],                                                        // ENTRÉE (exceptions du bord)
    ],
})

// ── B2F ──
apply("B2F", {
    wall: [...col(42, 19, 24), ...line(24, 14, 42), ...line(15, 28, 42), [37, 20]],
    water: [[39, 7], [40, 7], [41, 7]],                                            // source
    walk: [
        [39, 19], [39, 20], [32, 19], [32, 20], [35, 8], [35, 9],                  // corrections walkable
        [25, 21], [25, 22], [25, 23], [26, 21], [26, 22], [26, 23],                // échelle d'arrivée (AJOUTÉE)
        [31, 11], [32, 11], [31, 12], [32, 12], [31, 13], [32, 13],                // autre échelle
    ],
})

const header = readFileSync(path, "utf8").split("export const GROTTE_NEXUS_ART")[0]
writeFileSync(path, header + `export const GROTTE_NEXUS_ART: Record<"1F" | "B1F" | "B2F", string[]> = ${JSON.stringify(ART, null, 2)}\n`)
console.log("✅ patché", path)
for (const f of ["1F", "B2F"]) { console.log(`\n===== ${f} =====`); ART[f].forEach((r, i) => console.log(String(i).padStart(2), r)) }
