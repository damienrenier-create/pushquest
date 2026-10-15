import { describe, it, expect } from "vitest"
import { heldEffect, consumeHeldConsumable, isHeldItem, getHeldItem } from "../data/heldItems"
import { pinchBerry } from "./berries"
import { createBattle, resolveTurn, maxHpOf, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { SPECIES } from "../data/species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// BAIES SUR UN FUSIONNÉ À DEUX OBJETS — le bug de Jacanon (15/10/2026)
//
// Un fusionné hérite des deux objets de ses parents (heldItem + heldItem2). Le moteur lit un objet SYNTHÉTIQUE
// (heldEffect) qui fusionne les deux… sauf que les champs CONSOMMABLES (baies, Herbe Blanche) n'étaient repris que
// du SLOT 1. Roster réel de Jacanon : Ukognos (Grelot Coque) × Jerbiwat (Baie Phénix) → la Phénix en slot 2,
// invisible, jamais déclenchée. « Les baies ne fonctionnent pas dans la Ligue de Fusion. »
//
// Et une fois visible, il faut encore CONSOMMER le bon slot : manger la Phénix ne doit pas effacer le Grelot.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const SP = Object.keys(SPECIES)[0]
/** Un porteur à deux objets : un passif en slot 1, une baie en slot 2 — la configuration qui ne marchait pas. */
const porteur = (slot1: string, slot2: string) => ({ speciesId: SP, heldItem: slot1, heldItem2: slot2 })

describe("les objets du test existent (sinon tout le reste est vide)", () => {
    it("Grelot Coque, Restes et les baies sont des objets tenus connus", () => {
        for (const id of ["grelot_coque", "restes", "baie_phenix", "baie_soin", "baie_pure", "baie_vive"]) expect(isHeldItem(id), id).toBe(true)
    })
})

describe("une baie en SLOT 2 est enfin vue par le moteur", () => {
    it("⚠️ Grelot Coque × Baie Phénix : l'effet synthétique porte bien berryRevive", () => {
        expect(heldEffect(porteur("grelot_coque", "baie_phenix"))?.berryRevive).toBe(true)
    })

    it("Restes × Baie de Soin : le soin de détresse est visible, et pinchBerry le déclenche sous ⅓", () => {
        const fx = heldEffect(porteur("restes", "baie_soin"))
        expect(fx?.berryHealFrac).toBe(0.3)
        expect(pinchBerry(fx, 0.2)).toEqual({ kind: "heal", frac: 0.3 })
        expect(fx?.leftoversFrac, "le passif du slot 1 est toujours là").toBeTruthy()
    })

    it("Grelot × Baie Pure / Baie Vive : cure et boost visibles aussi", () => {
        expect(heldEffect(porteur("grelot_coque", "baie_pure"))?.berryCureStatus).toBe(true)
        expect(heldEffect(porteur("grelot_coque", "baie_vive"))?.berryBoostStat).toBe("spe")
    })

    it("slot 1 prioritaire quand les deux slots portent la même famille (Soin devant Vive pour le pinch)", () => {
        const fx = heldEffect(porteur("baie_soin", "baie_vive"))
        expect(fx?.berryHealFrac).toBe(0.3)
        expect(fx?.berryBoostStat).toBe("spe") // visible aussi : si le soin a déjà été mangé, le boost prendra le relais
    })
})

describe("consommer le BON slot", () => {
    it("⚠️ manger la Phénix (slot 2) laisse le Grelot (slot 1) en place", () => {
        const m = porteur("grelot_coque", "baie_phenix")
        const eaten = consumeHeldConsumable(m, "revive")
        expect(eaten?.id).toBe("baie_phenix")
        expect(m.heldItem2).toBeUndefined()
        expect(m.heldItem, "le passif n'est pas touché").toBe("grelot_coque")
    })

    it("Daemon normal à un seul objet : byte-identique à l'ancien comportement", () => {
        const m = { speciesId: SP, heldItem: "baie_soin" as string | undefined, heldItem2: undefined as string | undefined }
        expect(consumeHeldConsumable(m, "pinch")?.id).toBe("baie_soin")
        expect(m.heldItem).toBeUndefined()
    })

    it("deux baies de familles différentes : seule celle de la famille déclenchée part", () => {
        const m = porteur("baie_pure", "baie_phenix")
        consumeHeldConsumable(m, "revive")
        expect(m.heldItem).toBe("baie_pure")   // la cure reste armée
        expect(m.heldItem2).toBeUndefined()
    })

    it("aucun slot ne fournit la famille → rien n'est consommé, rien ne casse", () => {
        const m = porteur("grelot_coque", "restes")
        expect(consumeHeldConsumable(m, "revive")).toBeUndefined()
        expect(m.heldItem).toBe("grelot_coque"); expect(m.heldItem2).toBe("restes")
    })
})

// Et dans le MOTEUR, de bout en bout : le cas exact de Jacanon.
describe("Baie Phénix en slot 2, en combat réel", () => {
    const jusqua = (s: BattleState, pred: (s: BattleState) => boolean) => {
        for (let i = 0; i < 8 && !pred(s) && s.phase !== "ended"; i++) s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        return s
    }

    it("⚠️ le porteur Grelot × Phénix survit à 1 PV au lieu de tomber, et garde son Grelot", () => {
        const me = createMonInstance(SP, 5)
        me.heldItem = "grelot_coque"; me.heldItem2 = "baie_phenix"
        me.currentHp = 1 // le prochain coup adverse est fatal
        const foe = createMonInstance(SP, 100)
        let s = createBattle([me], [foe], { isWild: true, seed: 3 })
        s = jusqua(s, (st) => !!(st.player.team[0] as any).__phoenixUsed)
        const mine = s.player.team[0]
        expect((mine as any).__phoenixUsed, "la Phénix doit s'être déclenchée").toBe(true)
        // Survivant : ≥ 1 PV (la Phénix le laisse à 1, puis le Grelot Coque — TOUJOURS porté — peut le soigner en fin
        //   de tour : un PV de plus ici est précisément la preuve que le passif du slot 1 n'a pas été consommé).
        expect(mine.currentHp).toBeGreaterThanOrEqual(1)
        expect(mine.heldItem2, "la Phénix est consommée").toBeUndefined()
        expect(mine.heldItem, "le Grelot Coque survit à la bouchée").toBe("grelot_coque")
        expect(getHeldItem(mine.heldItem)?.name).toBe("Grelot Coque")
        expect(maxHpOf(mine)).toBeGreaterThan(1)
    })

    it("non-régression : un porteur à UNE Phénix (slot 1) se comporte comme avant", () => {
        const me = createMonInstance(SP, 5)
        me.heldItem = "baie_phenix"
        me.currentHp = 1
        let s = createBattle([me], [createMonInstance(SP, 100)], { isWild: true, seed: 3 })
        s = jusqua(s, (st) => !!(st.player.team[0] as any).__phoenixUsed)
        expect(s.player.team[0].currentHp).toBe(1)
        expect(s.player.team[0].heldItem).toBeUndefined()
    })
})
