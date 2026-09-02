import { describe, it, expect, beforeEach } from "vitest"
import { resetForIntro, getPlayer, addCaught, addItem, useLuxePasta, grantLuxePastaBatch, type LuxeOutcome } from "./playerStore"
import { createMonInstance } from "../battle/factory"
import { PATE_LUXE_ITEM_ID } from "../data/items"

const ivTotal = (m: { ivs: Record<string, number> }) => Object.values(m.ivs).reduce((a, b) => a + b, 0)

// Un Daemon dont on connaît l'uid, ajouté à l'équipe.
function addMon(species: string, level = 20): string {
    const inst = createMonInstance(species, level, { owned: true })
    addCaught(inst)
    return inst.uid
}

describe("Pâte de Luxe — loterie génétique", () => {
    beforeEach(() => resetForIntro())

    it("grantLuxePastaBatch(6) : 6 objets + file garantie {1 shiny+parfait, ≥1 parfait, ≥1 min}", () => {
        grantLuxePastaBatch(6)
        expect(getPlayer().items[PATE_LUXE_ITEM_ID]).toBe(6)
        const q = getPlayer().luxeOutcomeQueue as LuxeOutcome[]
        expect(q).toHaveLength(6)
        expect(q.filter((x) => x === "shiny_perfect")).toHaveLength(1)     // exactement 1 shiny
        expect(q.filter((x) => x === "min").length).toBeGreaterThanOrEqual(1) // ≥ 1 raté garanti
        expect(q.filter((x) => x === "perfect").length).toBeGreaterThanOrEqual(1) // ≥ 1 parfait garanti
        expect(q.every((x) => x === "perfect" || x === "min" || x === "shiny_perfect")).toBe(true)
    })

    it("useLuxePasta applique CHAQUE issue correctement + consomme objets + vide la file", () => {
        const uids = [addMon("feuillichot"), addMon("broutame"), addMon("piouflot"), addMon("tetardoc"), addMon("draclet"), addMon("cailloutchi")]
        grantLuxePastaBatch(6)
        const seen: LuxeOutcome[] = []
        for (const uid of uids) {
            const r = useLuxePasta(uid)
            expect(r.ok).toBe(true)
            seen.push(r.outcome!)
            const mon = [...getPlayer().team, ...getPlayer().pc].find((m) => m.uid === uid)!
            if (r.outcome === "min") { expect(ivTotal(mon)).toBe(0) }
            else { expect(ivTotal(mon)).toBe(75) } // perfect & shiny_perfect → IV max (5×15)
            if (r.outcome === "shiny_perfect") expect(mon.shiny).toBe(true)
        }
        // multiset garanti
        expect(seen.filter((x) => x === "shiny_perfect")).toHaveLength(1)
        expect(seen.filter((x) => x === "min").length).toBeGreaterThanOrEqual(1)
        expect(seen.filter((x) => x === "perfect").length).toBeGreaterThanOrEqual(1)
        // tout consommé
        expect(getPlayer().items[PATE_LUXE_ITEM_ID] ?? 0).toBe(0)
        expect(getPlayer().luxeOutcomeQueue).toHaveLength(0)
    })

    it("sans objet : useLuxePasta refuse (reason none)", () => {
        const uid = addMon("feuillichot")
        expect(useLuxePasta(uid)).toEqual({ ok: false, reason: "none" })
    })

    it("file vide : tirage GÉNÉRIQUE 50/50 (perfect|min uniquement, jamais shiny), les deux sortent", () => {
        const uid = addMon("feuillichot")
        addItem(PATE_LUXE_ITEM_ID, 60)
        const outcomes = new Set<LuxeOutcome>()
        for (let i = 0; i < 60; i++) { const r = useLuxePasta(uid); if (r.outcome) outcomes.add(r.outcome) }
        expect(outcomes.has("shiny_perfect")).toBe(false) // générique ne rend jamais shiny
        expect(outcomes.has("perfect")).toBe(true)
        expect(outcomes.has("min")).toBe(true)
    })

    it("cible introuvable → reason introuvable (aucun objet consommé)", () => {
        addMon("feuillichot")
        addItem(PATE_LUXE_ITEM_ID, 2)
        const r = useLuxePasta("uid-inexistant")
        expect(r).toEqual({ ok: false, reason: "introuvable" })
        expect(getPlayer().items[PATE_LUXE_ITEM_ID]).toBe(2) // pas consommé
    })
})
