import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { moveCategory, moveCategoryOf } from "./typeChart"
import { MOVES, getMove } from "../data/moves"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// CATÉGORIE D'UNE ATTAQUE : UN SEUL VERDICT, PARTOUT
//
// LE BUG (signalé par Sartay le 15/10/2026 : « croc de feu, les affichages se contredisent »). En Gen 1 la
// catégorie découle du TYPE. Mais trois attaques portent une surcharge assumée — une morsure ou une griffade
// frappe à l'Attaque, pas au Spécial :
//     Crocs de Feu (FEU) · Griffe Draconique (DRAGON) · Frappe Cavitation (EAU)
// Le calcul de dégâts respectait la surcharge, mais SIX affichages redérivaient la catégorie depuis le seul
// type et annonçaient « Spécial » pour une attaque qui frappe physiquement. Le joueur lisait donc une étiquette
// qui contredisait ce qu'il subissait en combat.
//
// Deux garde-fous ici : le verdict lui-même, et un test STRUCTUREL qui relit les sources — parce que la panne
// ne venait pas d'une logique fausse mais du choix du mauvais helper, ce qu'aucun test de comportement ne voit.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Les attaques dont la catégorie CONTREDIT leur type. Le cœur du sujet. */
const SURCHARGEES = ["crocs_de_feu", "griffe_draconique", "frappe_cavitation"] as const

describe("le verdict : une attaque surchargée est PHYSIQUE", () => {
    for (const id of SURCHARGEES) {
        it(`${id} : physique malgré un type spécial`, () => {
            const mv = getMove(id)
            expect(mv, `${id} doit exister`).toBeTruthy()
            expect(moveCategory(mv!.type), "son TYPE est bien spécial en Gen 1").toBe("SPECIAL")
            expect(mv!.category, "la surcharge est bien posée").toBe("PHYSICAL")
            expect(moveCategoryOf(mv!), "⚠️ le verdict réel doit être PHYSIQUE").toBe("PHYSICAL")
        })
    }

    it("sans surcharge, le type décide — rien n'a changé pour les autres", () => {
        let verifiees = 0
        for (const mv of Object.values(MOVES)) {
            if (mv.category) continue
            expect(moveCategoryOf(mv), mv.id).toBe(moveCategory(mv.type))
            verifiees++
        }
        expect(verifiees, "l'écrasante majorité des attaques n'a pas de surcharge").toBeGreaterThan(100)
    })

    it("toute attaque surchargée du jeu est couverte par ce test", () => {
        const contredisent = Object.values(MOVES)
            .filter((mv) => mv.category && mv.category !== moveCategory(mv.type))
            .map((mv) => mv.id)
            .sort()
        expect(contredisent, "une nouvelle surcharge a été ajoutée → l'ajouter à SURCHARGEES")
            .toEqual([...SURCHARGEES].sort())
    })
})

// ── Garde-fou STRUCTUREL : aucun code ne doit plus déduire la catégorie d'une ATTAQUE depuis son seul type ──
//
// Le motif FAUTIF est précis : `moveCategory(<quelque chose>.type)`. C'est la signature de « j'ai une attaque
// sous la main et j'en déduis la catégorie depuis son type » — donc en ignorant la surcharge.
// `moveCategory(unType)` reste parfaitement légitime : la table des types, l'architecte de némésis et le
// créateur de Daemon raisonnent sur des TYPES (quel STAB pour cette stat dominante ?), pas sur des attaques.
const RACINE = process.cwd()
const EXEMPTS = new Set([
    "src/lib/gamebook/yellow/battle/typeChart.ts", // la définition elle-même
])

function sources(dir: string, acc: string[] = []): string[] {
    for (const e of fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) sources(rel, acc)
        else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".test.ts")) acc.push(rel)
    }
    return acc
}

describe("garde-fou structurel", () => {
    it("⚠️ personne ne redérive la catégorie d'une ATTAQUE depuis son .type", () => {
        // `moveCategory(` suivi d'un argument qui finit par `.type` → on tenait une attaque, on a lu son type.
        const FAUTIF = /moveCategory\(\s*[A-Za-z_$][\w$.]*\.type\s*\)/
        const fautifs: string[] = []
        for (const rel of sources("src")) {
            if (EXEMPTS.has(rel)) continue
            const src = fs.readFileSync(path.join(RACINE, rel), "utf8")
            for (const ligne of src.split("\n")) {
                if (ligne.trimStart().startsWith("//") || ligne.trimStart().startsWith("*")) continue
                if (FAUTIF.test(ligne)) fautifs.push(`${rel} → ${ligne.trim().slice(0, 100)}`)
            }
        }
        expect(fautifs, "ces lignes doivent passer par moveCategoryOf(move)").toEqual([])
    })

    it("le garde-fou attrape bien le motif qu'il surveille (test du test)", () => {
        const FAUTIF = /moveCategory\(\s*[A-Za-z_$][\w$.]*\.type\s*\)/
        // Ce qu'il DOIT attraper : on part d'une attaque.
        expect(FAUTIF.test('const c = moveCategory(mv.type) === "PHYSICAL"')).toBe(true)
        expect(FAUTIF.test("cat: moveCategory(m.type)")).toBe(true)
        expect(FAUTIF.test("moveCategory( move.type )")).toBe(true)
        // Ce qu'il doit LAISSER PASSER : on part d'un type, ou on utilise le bon helper.
        expect(FAUTIF.test("moveCategory(t) === domCat")).toBe(false)
        expect(FAUTIF.test("moveCategory(candidate[0])")).toBe(false)
        expect(FAUTIF.test("moveCategoryOf(mv) === \"PHYSICAL\"")).toBe(false)
        expect(FAUTIF.test("POKE_TYPES.filter((t) => moveCategory(t) === \"PHYSICAL\")")).toBe(false)
    })
})
