import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { chenLabRoute, CHEN_ABANDON_OFFER_LINES, CHEN_ABANDON_OFFER_LINES_FUN, type ChenRouteInput } from "./labDialogues"

// Bug du 20/10/2026 : en mode fun, le cadeau d'énergie de Chen passait AVANT tout le reste → aucun Champion fun ne recevait la
// Daemonflûte (Rob, run 3 fini : Sylvebarbe, Zone de Combat et labo fermés à vie), ni l'offre d'abandon du run 2.
// Ces tests fixent le contrat : les joueurs fun suivent EXACTEMENT le parcours des autres, et un labo verrouillé se
// débloque TOUJOURS en parlant à Chen (le verrou du LabPanel est calculé par le même aiguillage).

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
const base: ChenRouteInput = { fun: false, world: "live", canAbandon: false, isChampion: false, hasFlute: false, sylvebarbeAwake: false }
const WORLDS = ["live", "ngplus", "run3", "replay"]

describe("Prof. CHEN — aiguillage commun à tous les modes", () => {
    it("⚠️ un Champion FUN sans flûte (Sylvebarbe endormi) reçoit la Daemonflûte, comme les autres (cas de Rob)", () => {
        for (const world of ["live", "ngplus", "replay"]) {
            expect(chenLabRoute({ ...base, fun: true, world, isChampion: true })).toBe("flute")
            expect(chenLabRoute({ ...base, fun: false, world, isChampion: true })).toBe("flute")
        }
    })
    it("fun et non-fun suivent le MÊME ordre : abandon (run 2, ≤ 15 combats) → Magnetor (run 3) → flûte → cadeau fun / terminal", () => {
        for (const fun of [false, true]) {
            const rest = fun ? "fun_gift" : "lab"
            expect(chenLabRoute({ ...base, fun, world: "ngplus", canAbandon: true })).toBe("abandon")
            expect(chenLabRoute({ ...base, fun, world: "ngplus", canAbandon: true, isChampion: true })).toBe("abandon")
            expect(chenLabRoute({ ...base, fun, world: "run3", isChampion: true })).toBe("magnetor")
            expect(chenLabRoute({ ...base, fun, isChampion: true, hasFlute: true })).toBe(rest)
            expect(chenLabRoute({ ...base, fun, isChampion: true, sylvebarbeAwake: true })).toBe(rest)
            expect(chenLabRoute({ ...base, fun })).toBe(rest)
            expect(chenLabRoute({ ...base, fun, world: "ngplus" })).toBe(rest)
        }
    })
    it("seul le cadeau d'énergie distingue les modes : sur TOUTES les combinaisons, fun = non-fun hors cadeau/terminal", () => {
        let n = 0
        for (const world of WORLDS) for (const canAbandon of [false, true]) for (const isChampion of [false, true])
            for (const hasFlute of [false, true]) for (const sylvebarbeAwake of [false, true]) {
                const s = { world, canAbandon, isChampion, hasFlute, sylvebarbeAwake }
                const a = chenLabRoute({ ...s, fun: false }), b = chenLabRoute({ ...s, fun: true })
                expect(a === "lab" ? "fun_gift" : a).toBe(b)
                n++
            }
        expect(n).toBe(64)
    })
    it("⚠️ le verrou du labo est calculé par le MÊME aiguillage (un labo verrouillé = Chen te remet la flûte)", () => {
        const lab = read("src/app/gamebook/yellow/LabPanel.tsx")
        expect(lab).toContain("const paused = chenLabRoute({")
        expect(lab).toContain("=== \"flute\"")
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("const route = chenLabRoute({")
        expect(gs).not.toContain("getGameMode() === \"fun\" && getActiveWorld() !== \"run3\"") // l'ancienne tête fun
    })
    it("dialogues fun : l'abandon annonce le vrai don de départ (1000⚡ + 10 Nexus-Balls), plus de Fusio-Balls ni de 6000⚡", () => {
        expect(CHEN_ABANDON_OFFER_LINES_FUN.join(" ")).toContain("tes 1000 énergies et tes 10 Nexus-Balls")
        expect(CHEN_ABANDON_OFFER_LINES_FUN.join(" ")).not.toContain("10000")
        expect(CHEN_ABANDON_OFFER_LINES.join(" ")).toContain("10000 énergies")
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).not.toContain("10 FUSIO-BALLS")
        expect(ui).not.toContain("les Fusio-Balls")
        expect(ui).not.toContain("<b>6000⚡</b>")
    })
})
