import { describe, it, expect, beforeEach } from "vitest"
import { resetForIntro, getPlayer, addCaught, addItem, useLuxePasta, useTiramisu, grantLuxePastaBatch, type LuxeOutcome } from "./playerStore"
import { createMonInstance } from "../battle/factory"
import { PATE_LUXE_ITEM_ID, TIRAMISU_ITEM_ID } from "../data/items"

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

    it("file vide : tirage GÉNÉRIQUE 50/50 (perfect|min uniquement, jamais shiny) sur des Daemons distincts", () => {
        // Verrou 1×/Daemon → on teste la distribution sur 40 Daemons différents (1 Pâte chacun).
        addItem(PATE_LUXE_ITEM_ID, 40)
        const outcomes = new Set<LuxeOutcome>()
        for (let i = 0; i < 40; i++) { const uid = addMon("feuillichot"); const r = useLuxePasta(uid); if (r.outcome) outcomes.add(r.outcome) }
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

const monOf = (uid: string) => [...getPlayer().team, ...getPlayer().pc].find((m) => m.uid === uid)!

describe("Pâte de Luxe — verrou (1×/Daemon) + backup + Tiramisu", () => {
    beforeEach(() => resetForIntro())

    it("VERROU : une 2e Pâte sur le même Daemon est refusée (locked)", () => {
        const uid = addMon("feuillichot")
        addItem(PATE_LUXE_ITEM_ID, 2)
        expect(useLuxePasta(uid).ok).toBe(true)
        expect(useLuxePasta(uid)).toEqual({ ok: false, reason: "locked" })
        expect(getPlayer().items[PATE_LUXE_ITEM_ID]).toBe(1) // 2e non consommée
        expect(monOf(uid).luxeUsed).toBe(true)
    })

    it("BACKUP : la Pâte stocke les IV d'origine (jamais écrasés) → Tiramisu RESTAURE à l'identique", () => {
        const uid = addMon("feuillichot")
        const before = { ...monOf(uid).ivs }
        addItem(PATE_LUXE_ITEM_ID, 1)
        useLuxePasta(uid) // re-tire (perfect/min)
        expect(monOf(uid).luxeIvsBackup?.ivs).toEqual(before) // original figé
        const iv = monOf(uid).ivs
        const allAt = (v: number) => Object.values(iv).every((x) => x === v)
        expect(allAt(0) || allAt(15)).toBe(true)              // IV re-tirés en loterie : 0 partout OU 15 partout
        addItem(TIRAMISU_ITEM_ID, 1)
        expect(useTiramisu(uid, "restore")).toEqual({ ok: true, restored: true })
        expect(monOf(uid).ivs).toEqual(before)                 // restauré à l'identique
    })

    it("TIRAMISU re-tenter : re-tire (perfect|min), consomme 1, garde le backup d'origine", () => {
        const uid = addMon("feuillichot")
        const before = { ...monOf(uid).ivs }
        addItem(PATE_LUXE_ITEM_ID, 1); useLuxePasta(uid)
        addItem(TIRAMISU_ITEM_ID, 1)
        const r = useTiramisu(uid, "reroll")
        expect(r.ok).toBe(true)
        expect(["perfect", "min"]).toContain(r.outcome)
        expect(getPlayer().items[TIRAMISU_ITEM_ID] ?? 0).toBe(0)
        expect(monOf(uid).luxeIvsBackup?.ivs).toEqual(before) // backup = ORIGINAL, pas le résultat intermédiaire
    })

    it("Tiramisu sur un Daemon JAMAIS pâté → refus (not_pate)", () => {
        const uid = addMon("feuillichot")
        addItem(TIRAMISU_ITEM_ID, 1)
        expect(useTiramisu(uid, "restore")).toEqual({ ok: false, reason: "not_pate" })
        expect(getPlayer().items[TIRAMISU_ITEM_ID]).toBe(1) // pas consommé
    })

    it("sans Tiramisu en stock → refus (none)", () => {
        const uid = addMon("feuillichot")
        addItem(PATE_LUXE_ITEM_ID, 1); useLuxePasta(uid)
        expect(useTiramisu(uid, "restore")).toEqual({ ok: false, reason: "none" })
    })
})
