import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { SPECIES, getSpecies } from "./species"
import { MOVES, getMove } from "./moves"
import { CTS } from "./cts"
import { fullStats, computeStat, maxHp, effectiveBaseStats, bloomBonusAt } from "../battle/stats"
import { moveOptionsFor } from "../create/customSpecies"
import { createMonInstance } from "../battle/factory"
import { createBattle, resolveTurn, type BattleState } from "../battle/engine"
import { computeFusion } from "./fusionSpecies"
import { fusionParentFromInstance } from "./fusionMon"
import type { StatKey } from "../battle/types"

// 🌸 FLORAPANTHE, L'ÉPANOUIE (Sartay, 31/10/2026) — la plus plate des six panthères devient un investissement : du niveau 60 au 89,
// +1 PV et +1 Défense de base par niveau (soit +30 et +30) ; au 85, RONCES VAMPIRES, une attaque (50) qui pose la graine et cinq
// baisses, qu'elle seule apprend. Le jeu n'en dit rien NULLE PART (choix Sartay) : les joueurs le découvrent en la montant.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const MUSCU = /pompe|squat|quota|séance|sueur|transpir|workout|vraie vie|encod|(?<!\p{L})reps?(?!\p{L})/iu
const ZERO = { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }
const flora = (lvl: number) => createMonInstance("florapanthe", lvl, { owned: true, ivsByStat: ZERO })
const KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const sp = getSpecies("florapanthe")!

describe("🌸 Florapanthe — épanouissement tardif, niveau après niveau du 60 au 89", () => {
    it("stats de base effectives : rien jusqu'au 59, +1 PV / +1 Déf par niveau dès le 60, +30 au 89 et au-delà ; les autres espèces ne bougent pas", () => {
        expect(sp.lateBloom).toEqual({ fromLevel: 60, fullLevel: 89, bonus: { hp: 30, def: 30 } })
        expect(effectiveBaseStats(sp, 59)).toBe(sp.baseStats) // le même objet : rien n'est recopié tant qu'il ne se passe rien
        expect(bloomBonusAt(sp, 59)).toEqual({})
        expect(bloomBonusAt(sp, 60)).toEqual({ hp: 1, def: 1 })
        expect(effectiveBaseStats(sp, 60)).toEqual({ hp: 91, atk: 80, def: 83, spe: 90, spc: 98 })
        expect(effectiveBaseStats(sp, 75)).toEqual({ hp: 106, atk: 80, def: 98, spe: 90, spc: 98 })
        expect(effectiveBaseStats(sp, 89)).toEqual({ hp: 120, atk: 80, def: 112, spe: 90, spc: 98 })
        expect(effectiveBaseStats(sp, 100)).toEqual({ hp: 120, atk: 80, def: 112, spe: 90, spc: 98 })
        for (let l = 60; l < 89; l++) expect(effectiveBaseStats(sp, l + 1).hp - effectiveBaseStats(sp, l).hp, `niveau ${l}`).toBe(1) // dilué : +1 par niveau
        for (const id of ["pyropanthe", "aquapanthe", "pantheon", "rochison"]) {
            const o = getSpecies(id)!
            expect(o.lateBloom).toBeUndefined()
            expect(effectiveBaseStats(o, 100)).toBe(o.baseStats)
        }
        expect(Object.values(SPECIES).filter((s) => s.lateBloom).map((s) => s.id)).toEqual(["florapanthe"]) // la seule
    })
    it("stats réelles : la formule d'origine jusqu'au 59, puis PV et Défense montent plus vite ; Attaque / Vitesse / Spécial intacts", () => {
        const s59 = fullStats(flora(59), sp), s60 = fullStats(flora(60), sp), s100 = fullStats(flora(100), sp)
        expect(s59.hp).toBe(Math.floor((2 * 90 * 59) / 100) + 59 + 10)
        expect(s59.def).toBe(computeStat(82, 0, 59))
        expect(s60.hp).toBe(Math.floor((2 * 91 * 60) / 100) + 60 + 10)
        expect(s60.def).toBe(computeStat(83, 0, 60))
        expect(s100.hp).toBe(Math.floor((2 * 120 * 100) / 100) + 110)
        expect(s100.def).toBe(computeStat(112, 0, 100))
        expect(s100.hp - (Math.floor((2 * 90 * 100) / 100) + 110)).toBe(60) // au 100 : +60 PV réels…
        expect(s100.def - computeStat(82, 0, 100)).toBe(60)                 // …et +60 de Défense par rapport à l'ancienne Florapanthe
        for (const k of ["atk", "spe", "spc"] as StatKey[]) expect(s100[k]).toBe(computeStat(sp.baseStats[k], 0, 100))
        expect(maxHp(sp, 100, 0)).toBe(s100.hp)
        const born = flora(70)
        expect(born.currentHp).toBe(fullStats(born, sp).hp) // née en cours d'épanouissement : PV pleins au bon maximum
    })
    it("fusion : une Florapanthe épanouie amène ses PV et sa Défense dans Nénufauve (dominantes des deux côtés, ×0,7 + ×0,7)", () => {
        const f = createMonInstance("florapanthe", 100, { owned: true, ivsByStat: ZERO })
        const a = createMonInstance("aquapanthe", 100, { owned: true, ivsByStat: ZERO })
        const pf = fusionParentFromInstance(f), pa = fusionParentFromInstance(a)
        expect(pf.stats).toEqual(fullStats(f, sp)) // les stats réelles, épanouissement compris
        const fused = computeFusion(pf, pa)
        expect(fused.name).toBe("Nénufauve")
        expect(fused.stats.hp).toBe(Math.round(0.7 * pf.stats.hp + 0.7 * pa.stats.hp))
        expect(fused.stats.def).toBe(Math.round(0.7 * pf.stats.def + 0.7 * pa.stats.def))
        expect(fused.stats.spe).toBe(Math.round(0.5 * pf.stats.spe + 0.5 * pa.stats.spe)) // la Vitesse est sortie de son top 3
        // Témoin : sans épanouissement (niveau 59), la Défense de Flora était récessive (×0,5) et sa Vitesse dominante.
        const w = fusionParentFromInstance(createMonInstance("florapanthe", 59, { owned: true, ivsByStat: ZERO }))
        const order = [...KEYS].sort((x, y) => w.stats[y] - w.stats[x] || KEYS.indexOf(x) - KEYS.indexOf(y))
        expect([...order.slice(0, 3)].sort()).toEqual(["hp", "spc", "spe"]) // l'ensemble compte, pas l'ordre
    })
    it("silence : le jeu n'en parle nulle part (fiche, Pierre Gékroc, Pokédex, rôle, description) — les joueurs le découvrent en la montant", () => {
        // Aucun écran ne lit le champ : on balaie TOUTE l'interface (src/app), pas seulement les deux écrans d'origine.
        const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
            .flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(tsx?|jsx?)$/.test(d.name) ? [path.join(dir, d.name)] : [])
        expect(walk(path.join(process.cwd(), "src/app")).filter((f) => /lateBloom|bloomLabel/.test(fs.readFileSync(f, "utf8")))).toEqual([])
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).not.toMatch(/épanou/i)
        expect(fs.existsSync(path.join(process.cwd(), "src/lib/gamebook/yellow/data/lateBloom.ts"))).toBe(false)
        expect(sp.role).not.toMatch(/épanou/i); expect(sp.description ?? "").not.toMatch(/épanou/i)
        expect(read("src/lib/gamebook/yellow/battle/stats.ts")).toContain("const base = effectiveBaseStats(species, lv)")
    })
})

const hit = (s: BattleState, sub: string) => s.events.some((e) => e.kind === "message" && e.text.includes(sub))
/** Lance Ronces Vampires (slot 0) avec des graines successives jusqu'à ce que le coup porte (précision 90). */
function lash(target: string, level = 60): { s: BattleState; seed: number } {
    const me = createMonInstance("florapanthe", 90, { owned: true, ivsByStat: ZERO, moveIds: ["ronces_vampires"] })
    for (let seed = 1; seed < 60; seed++) {
        const foe = createMonInstance(target, level, { owned: false, ivsByStat: ZERO })
        const s = resolveTurn(createBattle([me], [foe], { isWild: true, seed }), { kind: "move", moveIndex: 0 })
        if (s.enemy.team[0].volatiles.SEEDED) return { s, seed }
    }
    throw new Error("jamais touché en 60 graines")
}

describe("🌸 Ronces Vampires — la signature (niveau 85)", () => {
    it("données : attaque Plante spéciale, 50 de puissance, 90 de précision, sans poison ; apprise au 85 par Florapanthe seule ; aucune CT ; texte neutre", () => {
        const mv = getMove("ronces_vampires")!
        expect(mv).toMatchObject({ type: "PLANTE", power: 50, accuracy: 90, pp: 10 })
        expect(mv.effect?.inflictVolatile).toBe("SEEDED"); expect(mv.effect?.inflictStatus).toBeUndefined()
        expect(mv.effect?.statChanges?.map((c) => `${c.target}:${c.stat}${c.stages}`)).toEqual(["target:spe-1", "target:def-1", "target:atk-1", "target:spc-1", "target:acc-1"])
        expect(sp.learnset.find((l) => l.moveId === "ronces_vampires")?.level).toBe(85)
        expect(Object.values(SPECIES).filter((s) => s.learnset.some((l) => l.moveId === "ronces_vampires")).map((s) => s.id)).toEqual(["florapanthe"])
        expect(CTS.some((c) => c.moveId === "ronces_vampires")).toBe(false)
        for (const t of [["PLANTE"], ["EAU"], ["NORMAL", "PLANTE"]] as const) expect(moveOptionsFor([...t], 100), t.join("/")).not.toContain("ronces_vampires") // jamais au Créateur de Daemon
        expect(mv.description).not.toMatch(MUSCU); expect(mv.description).not.toMatch(/poison/i)
        expect(getMove("lianes_etrangleuses")).toBeNull() // l'ancien nom a disparu
        expect(Object.keys(MOVES).filter((id) => id === "ronces_vampires")).toHaveLength(1)
    })
    it("en combat : des dégâts, la graine et les cinq baisses sur un seul coup, aucun statut ; la graine boit dès la fin du tour", () => {
        const { s } = lash("megalithe")
        const foe = s.enemy.team[0]
        expect(foe.currentHp).toBeLessThan(fullStats(foe, getSpecies("megalithe")!).hp) // une vraie attaque
        expect(foe.volatiles.SEEDED).toBe(1)
        expect(foe.status).toBe("NONE")
        expect([foe.stages.spe, foe.stages.def, foe.stages.atk, foe.stages.spc, foe.stages.acc]).toEqual([-1, -1, -1, -1, -1])
        expect(foe.stages.eva).toBe(0)
        expect(s.player.team[0].stages.def).toBe(0) // rien n'améliore la lanceuse elle-même
        expect(hit(s, "infecté par des graines")).toBe(true)
        expect(hit(s, "vidé de son énergie")).toBe(true) // la graine boit la sève dès la fin du tour où elle est posée
    })
    it("un Métal n'est pas épargné (pas de poison à craindre) ; relancer resserre encore, la graine ne se repose pas deux fois", () => {
        const { s } = lash("magnetor")
        const foe = s.enemy.team[0]
        expect(foe.status).toBe("NONE")
        expect(foe.volatiles.SEEDED).toBe(1)
        expect(foe.stages.spe).toBe(-1); expect(foe.stages.acc).toBe(-1)
        for (let seed = 1; seed < 80; seed++) {
            const again = resolveTurn({ ...s, seed }, { kind: "move", moveIndex: 0 })
            if (again.enemy.team[0].stages.spe === -2) {
                expect(again.enemy.team[0].stages.def).toBe(-2); expect(again.enemy.team[0].volatiles.SEEDED).toBe(1)
                return
            }
        }
        throw new Error("la seconde attaque n'a jamais touché")
    })
})
