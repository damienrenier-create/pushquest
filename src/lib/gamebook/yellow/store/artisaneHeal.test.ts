import { describe, it, expect } from "vitest"
import { dedupeCraftedItemIds, uniqueCraftedItemId, craftsUsedFloor, type CraftedItem } from "../data/artisane"
import { hydratePlayer, getPlayer, setCraftedItemEquipped, equippedCraftedItem, getCraftsUsed, canCraftSignature } from "./playerStore"
import type { MonInstance } from "../battle/types"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// ARTISANE — GUÉRISON DE L'ÉTAT FORGÉ (18/10/2026). Cas réel de Jacanon : deux pièces au MÊME id `sig_0_rpl2-1`
// (Dard perforant → Ténèbrir du PC, Orbe psychique → Ténèbrir d'équipe), compteur à vie jamais persisté (undefined
// après deux forges), et le Ténèbrir d'équipe qui portait ENCORE un Grelot Coque sous sa pièce équipée — parce que
// (dés)équiper par id tombait sur l'autre pièce et libérait l'objet tenu de l'autre Ténèbrir.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const DARD: CraftedItem = { id: "sig_0_rpl2-1", name: "Dard perforant", stat: "atk", pct: 40, precision: 100, boundUid: "rpl2-1-caninombre-5-16", boundName: "Ténèbrir", boundSpeciesId: "tenebrir", equipped: true }
const ORBE: CraftedItem = { id: "sig_0_rpl2-1", name: "Orbe psychique", stat: "spc", pct: 40, precision: 100, boundUid: "rpl2-1-caninombre-17-10", boundName: "Ténèbrir", boundSpeciesId: "tenebrir", equipped: true }

const mkMon = (uid: string, extra: Partial<MonInstance> = {}): MonInstance => ({
    uid, speciesId: "tenebrir", level: 100, exp: 0, currentHp: 300, status: "NONE", statusCounter: 0,
    ivs: { hp: 15, atk: 15, def: 15, spc: 15, spe: 15 }, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true, ...extra,
} as MonInstance)

describe("helpers purs", () => {
    it("dedupeCraftedItemIds : le 1er garde son id, le 2e devient _2 ; idempotent ; ordre conservé", () => {
        const out = dedupeCraftedItemIds([DARD, ORBE])
        expect(out.map((c) => c.id)).toEqual(["sig_0_rpl2-1", "sig_0_rpl2-1_2"])
        expect(out[0]).toBe(DARD) // objet inchangé quand l'id est déjà unique
        expect(out[1].name).toBe("Orbe psychique")
        expect(dedupeCraftedItemIds(out)).toEqual(out)
        expect(dedupeCraftedItemIds([DARD, ORBE, { ...ORBE, name: "Troisième" }]).map((c) => c.id)).toEqual(["sig_0_rpl2-1", "sig_0_rpl2-1_2", "sig_0_rpl2-1_3"])
    })
    it("uniqueCraftedItemId : évite les ids existants, y compris les suffixés", () => {
        expect(uniqueCraftedItemId("sig_0_rpl2-1", [])).toBe("sig_0_rpl2-1")
        expect(uniqueCraftedItemId("sig_0_rpl2-1", [DARD])).toBe("sig_0_rpl2-1_2")
        expect(uniqueCraftedItemId("sig_0_rpl2-1", [DARD, { ...ORBE, id: "sig_0_rpl2-1_2" }])).toBe("sig_0_rpl2-1_3")
    })
    it("craftsUsedFloor : jamais sous le nombre de pièces forgées", () => {
        expect(craftsUsedFloor(undefined, [DARD, ORBE])).toBe(2)
        expect(craftsUsedFloor(0, [DARD])).toBe(1)
        expect(craftsUsedFloor(7, [DARD])).toBe(7)
        expect(craftsUsedFloor(undefined, [])).toBe(0)
    })
})

describe("hydratation : l'état de Jacanon est guéri", () => {
    const load = () => hydratePlayer({
        team: [mkMon("rpl2-1-caninombre-17-10", { heldItem: "grelot_coque" })],
        pc: [mkMon("rpl2-1-caninombre-5-16")],
        items: { grelot_coque: 0 },
        craftedItems: [DARD, { ...ORBE }], craftsUsed: undefined, craftReady: undefined, isChampion: true, fusionChampionRoster: undefined,
    })

    it("ids dédoublonnés, compteur à vie = 2, Grelot Coque rendu au sac, chaque Ténèbrir porte SA pièce", () => {
        load()
        const p = getPlayer()
        expect(p.craftedItems!.map((c) => c.id)).toEqual(["sig_0_rpl2-1", "sig_0_rpl2-1_2"])
        expect(getCraftsUsed()).toBe(2)
        expect(p.team[0].heldItem).toBeUndefined()
        expect(p.items.grelot_coque).toBe(1)
        expect(p.team[0].signatureItem).toEqual({ stat: "spc", pct: 40, precision: 100 })
        expect(p.pc[0].signatureItem).toEqual({ stat: "atk", pct: 40, precision: 100 })
    })

    it("retirer l'Orbe ne touche QUE l'Orbe (le Dard perforant de l'autre Ténèbrir reste équipé)", () => {
        load()
        const orbe = equippedCraftedItem("rpl2-1-caninombre-17-10")!
        expect(orbe.name).toBe("Orbe psychique")
        setCraftedItemEquipped(orbe.id, false)
        expect(equippedCraftedItem("rpl2-1-caninombre-17-10")).toBeUndefined()
        expect(getPlayer().team[0].signatureItem).toBeUndefined()
        expect(equippedCraftedItem("rpl2-1-caninombre-5-16")?.name).toBe("Dard perforant")
        expect(getPlayer().pc[0].signatureItem).toEqual({ stat: "atk", pct: 40, precision: 100 })
    })

    it("compteur guéri → la forge redemande une Ligue avant une 3e pièce (le verrou redevient effectif)", () => {
        load()
        expect(canCraftSignature()).toEqual({ ok: false, reason: "needLeague" })
    })

    it("idempotent : un second chargement de l'état guéri ne change rien", () => {
        load()
        const once = getPlayer()
        hydratePlayer({ team: once.team, pc: once.pc, items: once.items, craftedItems: once.craftedItems, craftsUsed: once.craftsUsed, craftReady: undefined, isChampion: true, fusionChampionRoster: undefined })
        const twice = getPlayer()
        expect(twice.craftedItems!.map((c) => c.id)).toEqual(["sig_0_rpl2-1", "sig_0_rpl2-1_2"])
        expect(twice.items.grelot_coque).toBe(1)
        expect(getCraftsUsed()).toBe(2)
    })
})
