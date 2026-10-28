import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot, mergeWorlds, switchWorld, startNewGamePlus, startReplay, exitReplay, startNewProfileFromRun1, switchProfile } from "./saveManager"
import { getPlayer, getActiveWorld, getPcBoxes, pcBoxCreate, pcBoxRename, pcBoxDelete, pcBoxAssign } from "./playerStore"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"
import { boxOf, type PcBoxes } from "../data/pcBoxes"

// Projet de Zyran (25/10/2026) : des sous-boîtes dans le PC. Les boîtes sont un champ de save PAR MONDE ; ces tests suivent
// le vrai cycle de la save (chargement, sauvegarde, mondes, profils, fusions de fin de run, bulle de rejeu, Voleur).
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}
const live = (over: Partial<YellowSave> = {}): YellowSave => ({
    ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0,
    team: [mon("t1", "razmaree", 50)], pc: [mon("p1", "feuillichot", 12), mon("p2", "pampousse", 12), mon("p3", "ruffiant", 28)], ...over,
})
const boxes = (list: [string, string][], of: Record<string, string> = {}): PcBoxes => ({ boxes: list.map(([id, name]) => ({ id, name })), of })
const roundTrip = (s: YellowSave) => parseSave(JSON.parse(JSON.stringify(s)))
const nameOf = (pb: PcBoxes | undefined, uid: string) => pb?.boxes.find((b) => b.id === boxOf(pb, uid))?.name ?? null

describe("ranger ne touche jamais aux Daemons", () => {
    it("créer, ranger, renommer, sortir, supprimer : l'équipe et le PC restent les mêmes objets", () => {
        applyServerSave(live())
        const team = getPlayer().team, pc = getPlayer().pc
        const r = pcBoxCreate("Ligue")
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(pcBoxAssign(["p1", "p2", "inconnu"], r.id)).toBe(2) // un uid qui n'est pas dans ce monde est ignoré
        expect(pcBoxRename(r.id, "Ligue 2").ok).toBe(true)
        expect(pcBoxAssign(["p1"], null)).toBe(1)
        expect(pcBoxDelete(r.id)).toBe(1)
        expect(getPcBoxes()).toBeUndefined()
        expect(getPlayer().team).toBe(team)
        expect(getPlayer().pc).toBe(pc)
    })
    it("aucune donnée de boîte sur un Daemon (ce qu'envoient l'étal, le troc et l'Espion)", () => {
        applyServerSave(live())
        const r = pcBoxCreate("Secret")
        if (r.ok) pcBoxAssign(["p1", "t1"], r.id)
        const json = JSON.stringify([...getPlayer().team, ...getPlayer().pc])
        expect(json).not.toContain("Secret")
        expect(json).not.toMatch(/"bx[a-z0-9]/)
    })
})

describe("cycle de la save", () => {
    it("les boîtes survivent à la sauvegarde et au rechargement ; une vieille save n'a pas de boîtes", () => {
        applyServerSave(live())
        expect(getPcBoxes()).toBeUndefined()
        const r = pcBoxCreate("Parfaits")
        if (!r.ok) throw new Error("création refusée")
        pcBoxAssign(["p1", "t1"], r.id)
        const before = getPcBoxes()
        const reloaded = roundTrip(snapshot())
        expect(reloaded.pcBoxes).toEqual(before)
        applyServerSave(reloaded)
        expect(getPcBoxes()).toEqual(before)
        expect(nameOf(getPcBoxes(), "t1")).toBe("Parfaits") // un Daemon d'équipe garde sa boîte pour son retour au PC
    })
    it("le serveur lit deux fois (POST puis GET) : même résultat qu'une lecture", () => {
        const raw = live({ pcBoxes: boxes([["bx1", "A"]], { p1: "bx1", parti: "bx1" }) })
        const once = roundTrip(raw)
        expect(roundTrip(once).pcBoxes).toEqual(once.pcBoxes)
        expect(once.pcBoxes?.of).toEqual({ p1: "bx1" })
    })
    it("le Daemon détenu par le Voleur garde sa boîte en attendant son retour", () => {
        const thief = { thefts: 1, lastTheftDay: "2026-10-28", stolen: mon("p9", "ruffiant", 30), snapshot: [], stolenAt: "2026-10-28T10:00:00Z", stolenWorld: "live" }
        const s = roundTrip(live({ thief, pcBoxes: boxes([["bx1", "A"]], { p9: "bx1", p1: "bx1" }) }))
        expect(s.pcBoxes?.of).toEqual({ p9: "bx1", p1: "bx1" })
        const back = roundTrip({ ...s, thief: { ...thief, stolen: null }, pc: [...s.pc, mon("p9", "ruffiant", 30)] })
        expect(boxOf(back.pcBoxes, "p9")).toBe("bx1")
    })
})

describe("mondes et profils : les boîtes ne passent jamais de l'un à l'autre", () => {
    it("un run 2 démarre sans boîtes ; chaque monde retrouve les siennes à la bascule", async () => {
        applyServerSave(live({ isChampion: true, pcBoxes: boxes([["bx1", "Run 1"]], { p1: "bx1" }) }))
        expect(await startNewGamePlus(createMonInstance("feuillichot", 5), [])).toBe(true)
        expect(getActiveWorld()).toBe("ngplus")
        expect(getPcBoxes()).toBeUndefined()
        const r = pcBoxCreate("Run 2")
        expect(r.ok).toBe(true)
        expect(await switchWorld("live")).toBe(true)
        expect(getPcBoxes()?.boxes.map((b) => b.name)).toEqual(["Run 1"])
        expect(await switchWorld("ngplus")).toBe(true)
        expect(getPcBoxes()?.boxes.map((b) => b.name)).toEqual(["Run 2"])
        const reloaded = roundTrip(snapshot()) // les deux mondes à travers la save
        expect(reloaded.pcBoxes?.boxes.map((b) => b.name)).toEqual(["Run 1"])
        expect(reloaded.ngplusWorld?.pcBoxes?.boxes.map((b) => b.name)).toEqual(["Run 2"])
    })
    it("un nouveau profil n'a pas de boîtes ; revenir au premier profil les rend", async () => {
        applyServerSave(live({ pcBoxes: boxes([["bx1", "Profil A"]], { p1: "bx1" }) }))
        expect(await startNewProfileFromRun1()).toBe(true)
        expect(getPcBoxes()).toBeUndefined()
        expect(await switchProfile(0)).toBe(true)
        expect(getPcBoxes()?.boxes.map((b) => b.name)).toEqual(["Profil A"])
        expect(boxOf(getPcBoxes(), "p1")).toBe("bx1")
    })
    it("bulle de rejeu : aucune boîte, création refusée ; à la sortie, les vraies boîtes sont intactes et les Daemons du run 2 arrivent non rangés", async () => {
        applyServerSave(live({ pcBoxes: boxes([["bx1", "A"]], { p1: "bx1" }) }))
        expect(await startReplay("run2", createMonInstance("feuillichot", 5))).toBe(true)
        expect(getPcBoxes()).toBeUndefined()
        expect(pcBoxCreate("Bulle")).toEqual({ ok: false, reason: "replay" })
        expect(pcBoxAssign(getPlayer().team.map((m) => m.uid), "bx1")).toBe(0)
        await exitReplay()
        expect(getActiveWorld()).toBe("live")
        expect(getPcBoxes()).toEqual(boxes([["bx1", "A"]], { p1: "bx1" }))
        const added = getPlayer().pc.filter((m) => m.uid.startsWith("rpl2-"))
        expect(added.length).toBeGreaterThan(0)
        expect(added.every((m) => boxOf(getPcBoxes(), m.uid) === null)).toBe(true)
    })
})

describe("fusions de fin de run : chaque Daemon garde sa boîte", () => {
    it("fin du run 2 : les Daemons du run 1 changent d'uid mais restent dans leurs boîtes ; même nom = une seule boîte", () => {
        const run2 = live({ team: [mon("n1", "razmaree", 40)], pc: [mon("n2", "ro", 30)], pcBoxes: boxes([["bx2", "Ligue"]], { n2: "bx2" }) })
        const run1 = live({ team: [mon("a1", "magnetor", 60)], pc: [mon("a2", "elefer", 20), mon("a3", "belunode", 41)], pcBoxes: boxes([["bx7", "ligue"], ["bx8", "Shiny"]], { a1: "bx8", a2: "bx7" }) })
        const m = mergeWorlds(run2, run1)
        expect(m.team.length + m.pc.length).toBe(5)
        expect(new Set([...m.team, ...m.pc].map((x) => x.uid)).size).toBe(5)
        expect(m.pcBoxes?.boxes.map((b) => b.name)).toEqual(["Ligue", "Shiny"])
        const uidOf = (sp: string) => m.pc.find((x) => x.speciesId === sp)?.uid ?? ""
        expect(nameOf(m.pcBoxes, uidOf("magnetor"))).toBe("Shiny")
        expect(nameOf(m.pcBoxes, uidOf("elefer"))).toBe("Ligue")
        expect(nameOf(m.pcBoxes, uidOf("belunode"))).toBeNull()
        expect(nameOf(m.pcBoxes, "n2")).toBe("Ligue")
        expect(roundTrip(m).pcBoxes).toEqual(m.pcBoxes) // et la save fusionnée se relit à l'identique
    })
    it("le Daemon que détient le Voleur, volé dans le monde absorbé, garde sa boîte (sous son uid, qui ne change pas)", () => {
        const thief = { thefts: 1, lastTheftDay: "2026-10-28", stolen: mon("vole1", "ruffiant", 30), snapshot: [], stolenAt: "2026-10-28T10:00:00Z", stolenWorld: "live" }
        const run2 = live({ team: [mon("n1", "razmaree", 40)], pc: [], thief })
        const run1 = live({ team: [mon("a1", "magnetor", 60)], pc: [], thief, pcBoxes: boxes([["bx1", "Ligue"]], { a1: "bx1", vole1: "bx1" }) })
        const m = mergeWorlds(run2, run1)
        expect(boxOf(m.pcBoxes, "vole1")).toBe("bx1")
        expect(roundTrip(m).pcBoxes?.of.vole1).toBe("bx1") // et la lecture le garde : le Daemon volé est « vivant »
    })
    it("fin du run 3 (run 3 ⊕ run 2 ⊕ run 1) : les deux mondes absorbés gardent leurs rangements", () => {
        const run3 = live({ team: [mon("z1", "magnetor", 60)], pc: [], pcBoxes: undefined })
        const run2 = live({ team: [mon("y1", "razmaree", 40)], pc: [mon("y2", "ro", 30)], pcBoxes: boxes([["bx2", "Run 2"]], { y2: "bx2" }) })
        const run1 = live({ team: [mon("x1", "elefer", 20)], pc: [mon("x2", "belunode", 41)], pcBoxes: boxes([["bx1", "Run 1"]], { x1: "bx1", x2: "bx1" }) })
        const merged = mergeWorlds(mergeWorlds(run3, run2, "fusR2"), run1, "fusR1")
        expect(merged.pcBoxes?.boxes.map((b) => b.name)).toEqual(["Run 2", "Run 1"])
        const at = (sp: string) => nameOf(merged.pcBoxes, merged.pc.find((x) => x.speciesId === sp)?.uid ?? "")
        expect(at("ro")).toBe("Run 2")
        expect(at("elefer")).toBe("Run 1")
        expect(at("belunode")).toBe("Run 1")
        expect(at("razmaree")).toBeNull()
    })
})
