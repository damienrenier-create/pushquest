import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    parsePcBoxes, pcLiveUids, boxOf, createBox, renameBox, deleteBox, assignBox, mergePcBoxes, prunePcBoxes, cleanBoxName,
    boxNameKey, newPcBoxId, keepPcBoxesFromStored, PC_BOX_MAX, PC_BOX_PARSE_MAX, PC_BOX_OF_MAX, type PcBoxes,
} from "./pcBoxes"

// Projet de Zyran (25/10/2026) : des sous-boîtes dans le PC. Les boîtes vivent dans la save du monde, jamais sur le Daemon.
const live = (...uids: string[]) => new Set(uids)
const pb = (boxes: [string, string][], of: Record<string, string> = {}): PcBoxes => ({ boxes: boxes.map(([id, name]) => ({ id, name })), of })

describe("lecture des boîtes (client et serveur)", () => {
    it("rejette tout ce qui n'est pas une liste de boîtes, et une vieille save n'a pas de boîtes", () => {
        for (const raw of [undefined, null, "x", 3, [], { boxes: "x" }, { boxes: [] }, { of: {} }]) expect(parsePcBoxes(raw, live("a"))).toBeUndefined()
    })
    it("nettoie : ids invalides ou en double écartés, noms sans caractères invisibles, 14 caractères sans couper un émoji", () => {
        const got = parsePcBoxes({ boxes: [
            { id: "bx1", name: "  Ligue​  de‮  Fer  " }, { id: "bx1", name: "doublon" }, { id: "all", name: "réservé" },
            { id: "none", name: "réservé" }, { id: 7, name: "x" }, { id: "bx2", name: "" }, { id: "bx3", name: "🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝🍝" },
        ], of: {} }, live())
        expect(got?.boxes).toEqual([{ id: "bx1", name: "Ligue de Fer" }, { id: "bx2", name: "Boîte 2" }, { id: "bx3", name: "🍝".repeat(14) }])
        expect(cleanBoxName("Équipe\u0000\u0007 A")).toBe("Équipe A")
    })
    it("ne garde que les rangements d'un Daemon vivant (équipe, PC, volé) vers une boîte connue ; jamais de prototype", () => {
        const raw = JSON.parse('{"boxes":[{"id":"bx1","name":"A"}],"of":{"t1":"bx1","p1":"bx1","vol":"bx1","parti":"bx1","p2":"bx9","__proto__":"bx1","constructor":"bx1"}}')
        const got = parsePcBoxes(raw, pcLiveUids([{ uid: "t1" }], [{ uid: "p1" }, { uid: "p2" }], "vol"))
        expect(got?.of).toEqual({ t1: "bx1", p1: "bx1", vol: "bx1" })
        expect(boxOf(got, "constructor")).toBeNull()
        expect(boxOf(got, "__proto__")).toBeNull()
        expect(boxOf(got, "toString")).toBeNull()
    })
    it("bornes : 40 boîtes et 3000 rangements au plus ; lecture idempotente et stable à travers JSON", () => {
        const boxes = Array.from({ length: 50 }, (_, i) => ({ id: `bx${i}`, name: `B${i}` }))
        const uids = Array.from({ length: 3100 }, (_, i) => `u${i}`)
        const of = Object.fromEntries(uids.map((u) => [u, "bx0"]))
        const got = parsePcBoxes({ boxes, of }, new Set(uids))
        expect(got?.boxes).toHaveLength(PC_BOX_PARSE_MAX)
        expect(Object.keys(got?.of ?? {})).toHaveLength(PC_BOX_OF_MAX)
        expect(parsePcBoxes(JSON.parse(JSON.stringify(got)), new Set(uids))).toEqual(got)
    })
})

describe("créer, renommer, supprimer une boîte", () => {
    it("12 boîtes au maximum ; un nom déjà pris (casse et accents ignorés) est refusé ; nom vide = première « Boîte N » libre", () => {
        let cur: PcBoxes | undefined
        for (let i = 0; i < PC_BOX_MAX; i++) {
            const r = createBox(cur, `bx${i}`, i === 0 ? "Ligue" : "")
            expect(r.ok).toBe(true)
            if (r.ok) cur = r.pb
        }
        expect(cur?.boxes.map((b) => b.name).slice(0, 3)).toEqual(["Ligue", "Boîte 1", "Boîte 2"])
        expect(createBox(cur, "bx99", "Autre")).toEqual({ ok: false, reason: "max" })
        const two = pb([["bx1", "Ligue"]])
        expect(createBox(two, "bx2", "LIGUÉ")).toEqual({ ok: false, reason: "taken" })
        expect(createBox(two, "bx1", "Neuf")).toEqual({ ok: false, reason: "id" })
        expect(createBox(two, "pas-un-id", "Neuf")).toEqual({ ok: false, reason: "id" })
    })
    it("renommer vers un nom pris par une autre boîte est refusé ; garder son propre nom en changeant la casse est permis", () => {
        const cur = pb([["bx1", "Ligue"], ["bx2", "Échange"]])
        expect(renameBox(cur, "bx2", "ligue")).toEqual({ ok: false, reason: "taken" })
        expect(renameBox(cur, "bx3", "x")).toEqual({ ok: false, reason: "introuvable" })
        expect(renameBox(cur, "bx1", "   ")).toEqual({ ok: false, reason: "vide" })
        const r = renameBox(cur, "bx1", "LIGUE")
        expect(r.ok && r.pb.boxes[0].name).toBe("LIGUE")
    })
    it("supprimer ne retire que les rangements de cette boîte ; la dernière boîte supprimée efface le champ", () => {
        const cur = pb([["bx1", "A"], ["bx2", "B"]], { u1: "bx1", u2: "bx2", u3: "bx1" })
        const r = deleteBox(cur, "bx1")
        expect(r.removed).toBe(2)
        expect(r.pb).toEqual(pb([["bx2", "B"]], { u2: "bx2" }))
        expect(deleteBox(r.pb, "bx2")).toEqual({ pb: undefined, removed: 1 })
        expect(deleteBox(cur, "bx9")).toEqual({ pb: cur, removed: 0 })
    })
    it("ids générés : préfixe bx, lisibles par la save", () => {
        const id = newPcBoxId(1793208772836, () => 0.5)
        expect(id).toMatch(/^bx[a-z0-9]+$/)
        expect(createBox(undefined, id, "A").ok).toBe(true)
        expect(boxNameKey("  Équipe  ")).toBe("equipe")
    })
})

describe("ranger des Daemons", () => {
    it("null sort un Daemon de sa boîte ; une boîte inconnue ne change rien ; ranger ailleurs déplace (une seule boîte)", () => {
        const cur = pb([["bx1", "A"], ["bx2", "B"]], { u1: "bx1" })
        const moved = assignBox(cur, ["u1", "u2"], "bx2")
        expect(moved.changed).toBe(2)
        expect(moved.pb?.of).toEqual({ u1: "bx2", u2: "bx2" })
        expect(assignBox(moved.pb, ["u1"], null).pb?.of).toEqual({ u2: "bx2" })
        const same = assignBox(cur, ["u1"], "bx9")
        expect(same.pb).toBe(cur)
        expect(same.changed).toBe(0)
        expect(assignBox(cur, ["u1"], "bx1").pb).toBe(cur) // déjà rangé là : même objet
        expect(assignBox(undefined, ["u1"], "bx1")).toEqual({ pb: undefined, changed: 0 })
    })
    it("un uid « __proto__ » reste une simple entrée", () => {
        const r = assignBox(pb([["bx1", "A"]]), ["__proto__"], "bx1")
        expect(Object.getPrototypeOf(r.pb?.of)).toBe(Object.prototype)
        expect(boxOf(r.pb, "__proto__")).toBe("bx1")
    })
    it("prunePcBoxes oublie les Daemons partis, et rend le même objet si tout le monde est là", () => {
        const cur = pb([["bx1", "A"]], { u1: "bx1", u2: "bx1" })
        expect(prunePcBoxes(cur, live("u1", "u2"))).toBe(cur)
        expect(prunePcBoxes(cur, live("u1"))?.of).toEqual({ u1: "bx1" })
    })
})

describe("onglet resté sur une version d'avant les boîtes (route serveur de la save)", () => {
    const stored = {
        team: [{ uid: "t1" }], pc: [{ uid: "p1" }, { uid: "p2" }],
        pcBoxes: pb([["bx1", "Ligue"]], { p1: "bx1", p2: "bx1" }),
        ngplusWorld: { team: [{ uid: "n1" }], pc: [], pcBoxes: pb([["bx2", "Run 2"]], { n1: "bx2" }) },
    }
    it("le serveur remet les boîtes stockées de chaque monde, relues contre les Daemons reçus", () => {
        const save = { team: [{ uid: "t1" }], pc: [{ uid: "p1" }], ngplusWorld: { team: [{ uid: "n1" }], pc: [] }, run3World: null }
        expect(keepPcBoxesFromStored(stored, save)).toBe(true)
        expect((save as { pcBoxes?: PcBoxes }).pcBoxes).toEqual(pb([["bx1", "Ligue"]], { p1: "bx1" })) // p2 n'est plus là
        expect((save.ngplusWorld as { pcBoxes?: PcBoxes }).pcBoxes).toEqual(pb([["bx2", "Run 2"]], { n1: "bx2" }))
    })
    it("un monde qui arrive avec ses boîtes n'est pas touché ; rien à remettre → false", () => {
        const mine = pb([["bx9", "Neuve"]])
        const save = { team: [{ uid: "t1" }], pc: [{ uid: "p1" }], pcBoxes: mine }
        expect(keepPcBoxesFromStored(stored, save)).toBe(false)
        expect(save.pcBoxes).toBe(mine)
        expect(keepPcBoxesFromStored(null, { team: [], pc: [] })).toBe(false)
        expect(keepPcBoxesFromStored({ team: [], pc: [] }, { team: [], pc: [] })).toBe(false)
    })
    it("câblage : la route ne le fait que pour un client qui ne déclare pas les boîtes, jamais lors d'une remise à zéro ; les 3 envois du client les déclarent", () => {
        const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
        expect(read("src/app/api/gamebook/yellow/save/route.ts")).toContain("if (existing?.flags && !body.intentionalReset && !(Array.isArray(body.caps) && body.caps.includes(\"pcBoxes\"))) keepPcBoxesFromStored(existing.flags, save)")
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("const SAVE_CAPS = [\"pcBoxes\"]")
        expect(sm.split("caps: SAVE_CAPS").length - 1).toBe(3)
    })
})

describe("fusion de fin de run", () => {
    it("les Daemons absorbés gardent leur boîte sous leur nouvel uid ; même nom ou même id = une seule boîte", () => {
        const primary = pb([["bx1", "Ligue"]], { a: "bx1" })
        const secondary = pb([["bx7", "ligue"], ["bx8", "Shiny"], ["bx1", "Autre nom"]], { r1: "bx7", r2: "bx8", r3: "bx1", r4: "bx8" })
        const got = mergePcBoxes(primary, secondary, [["r1", "fus0-r1"], ["r2", "fus1-r2"], ["r3", "fus2-r3"], ["r1", "fus3-r1"]])
        expect(got?.boxes).toEqual([{ id: "bx1", name: "Ligue" }, { id: "bx8", name: "Shiny" }])
        // deux Daemons qui partageaient l'ancien uid r1 suivent tous les deux ; r4 n'est pas dans le remap → non rangé
        expect(got?.of).toEqual({ a: "bx1", "fus0-r1": "bx1", "fus1-r2": "bx8", "fus2-r3": "bx1", "fus3-r1": "bx1" })
    })
    it("au-delà de 40 boîtes, les boîtes en trop sont abandonnées et leurs Daemons arrivent dans « Non rangés »", () => {
        const primary = pb(Array.from({ length: PC_BOX_PARSE_MAX }, (_, i): [string, string] => [`bx${i}`, `P${i}`]))
        const got = mergePcBoxes(primary, pb([["bxz", "Z"]], { r: "bxz" }), [["r", "fus0-r"]])
        expect(got?.boxes).toHaveLength(PC_BOX_PARSE_MAX)
        expect(boxOf(got, "fus0-r")).toBeNull()
    })
    it("fonctionne sans boîtes d'un côté ou de l'autre", () => {
        const s = pb([["bx1", "A"]], { r: "bx1" })
        expect(mergePcBoxes(undefined, undefined, [])).toBeUndefined()
        expect(mergePcBoxes(s, undefined, [])).toBe(s)
        expect(mergePcBoxes(undefined, s, [["r", "fus0-r"]])).toEqual(pb([["bx1", "A"]], { "fus0-r": "bx1" }))
    })
})
