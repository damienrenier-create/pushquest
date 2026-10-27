import { describe, it, expect, vi, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createMonInstance } from "../battle/factory"
import { ITEMS, PATE_LUXE_ITEM_ID, PATE_LUXE_VOLEUR_ITEM_ID } from "./items"
import { THIEF_LUXE_ITEM_ID } from "./thief"
import { caveTradeConfig, caveTradeDoneForRun, CAVE_TRADE_R3_MARKER } from "./caveTrader"
import { hydratePlayer, getPlayer, useLuxePasta, setActiveWorld } from "../store/playerStore"

// Décisions Sartay du 27/10/2026 :
//  • « Pâtes de luxe du voleur : systématiquement 33 % shiny, 33 % parfait, 33 % rang D. Le joueur doit être averti. »
//  • « Dénicheur doit être corrigé : il faut suivre le run joué, ainsi que les autres rejeux ! » + « que l'échangeur lui propose
//    le bon échange à partir de maintenant » (DaKumba : rejeu du run 3, Limaroche→Bélunode au lieu de Ruffiant→Marmoterre).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
afterEach(() => { vi.restoreAllMocks() })

describe("Pâte de Luxe du Voleur : trois issues égales, annoncées", () => {
    it("objet à part (hors boutique), description avec les chances ; c'est elle que le Voleur offre", () => {
        const it_ = ITEMS[PATE_LUXE_VOLEUR_ITEM_ID]
        expect(it_.luxePasta).toBe(true); expect(it_.price).toBe(0)
        expect(it_.description).toContain("un tiers SHINY et PARFAIT"); expect(it_.description).toContain("un tiers RANG D")
        expect(THIEF_LUXE_ITEM_ID).toBe(PATE_LUXE_VOLEUR_ITEM_ID)
    })
    it("tirage : <1/3 shiny+parfait, <2/3 parfait, sinon rang D ; la file des cadeaux du génie n'est PAS consommée", () => {
        setActiveWorld("live")
        const mk = () => createMonInstance("rochison", 30)
        const a = mk(), b = mk(), c = mk()
        a.ivs = { hp: 5, atk: 5, def: 5, spe: 5, spc: 5 }; b.ivs = { ...a.ivs }; c.ivs = { ...a.ivs }
        hydratePlayer({ team: [a, b, c], pc: [], items: { [PATE_LUXE_VOLEUR_ITEM_ID]: 3 }, luxeOutcomeQueue: ["min"] })
        vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValueOnce(0.9)
        expect(useLuxePasta(a.uid, PATE_LUXE_VOLEUR_ITEM_ID).outcome).toBe("shiny_perfect")
        expect(useLuxePasta(b.uid, PATE_LUXE_VOLEUR_ITEM_ID).outcome).toBe("perfect")
        expect(useLuxePasta(c.uid, PATE_LUXE_VOLEUR_ITEM_ID).outcome).toBe("min")
        const [ra, rb, rc] = getPlayer().team
        expect(ra.shiny).toBe(true); expect(Object.values(ra.ivs).every((v) => v === 15)).toBe(true)
        expect(rb.shiny).toBeFalsy(); expect(Object.values(rb.ivs).every((v) => v === 15)).toBe(true)
        expect(Object.values(rc.ivs).every((v) => v === 0)).toBe(true)
        expect([ra, rb, rc].every((m) => m.luxeUsed)).toBe(true)
        expect(getPlayer().items[PATE_LUXE_VOLEUR_ITEM_ID] ?? 0).toBe(0)
        expect(getPlayer().luxeOutcomeQueue).toEqual(["min"]) // intacte
    })
    it("même verrou (1 Pâte par Daemon, toutes sortes) ; la Pâte classique garde sa file puis son pile ou face", () => {
        const done = { ...createMonInstance("rochison", 30), luxeUsed: true }
        const fresh = createMonInstance("plumiot", 12)
        hydratePlayer({ team: [done, fresh], pc: [], items: { [PATE_LUXE_VOLEUR_ITEM_ID]: 1, [PATE_LUXE_ITEM_ID]: 1 }, luxeOutcomeQueue: ["min"] })
        expect(useLuxePasta(done.uid, PATE_LUXE_VOLEUR_ITEM_ID).reason).toBe("locked")
        expect(useLuxePasta(fresh.uid, PATE_LUXE_ITEM_ID).outcome).toBe("min") // la file passe d'abord, comme avant
        expect(getPlayer().luxeOutcomeQueue).toEqual([])
        expect(useLuxePasta(fresh.uid, "objet_au_hasard").reason).toBe("none")
    })
    it("câblage : poche du sac, sélecteur et mise en garde annoncent les vraies chances", () => {
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("Un tiers SHINY et PARFAIT, un tiers PARFAIT, un tiers RANG D. Un pari irréversible !")
        expect(ydc).toContain("Pâte du Voleur : un tiers SHINY et PARFAIT, un tiers PARFAIT, un tiers RANG D.")
        expect(ydc).toContain("Cette Pâte de Luxe DU VOLEUR RE-TIRE tout le génome")
        expect(ydc).toContain("setLuxeItem(PATE_LUXE_VOLEUR_ITEM_ID); setLuxePick(true)")
    })
})

describe("Dénicheur : suit le RUN JOUÉ (rejeux compris) et répare les rejeux du run 3 touchés", () => {
    it("caveTradeDoneForRun : run 1/2 → le drapeau ; vrai run 3 → le drapeau ; rejeu du run 3 → seulement si le BON échange est fait", () => {
        expect(caveTradeDoneForRun(false, true, false, false)).toBe(false)
        expect(caveTradeDoneForRun(true, false, false, false)).toBe(true)   // run 1/2 (ou leurs rejeux)
        expect(caveTradeDoneForRun(true, true, true, false)).toBe(true)     // vrai run 3 : jamais touché par le bug
        expect(caveTradeDoneForRun(true, true, false, false)).toBe(false)   // rejeu du run 3 après l'échange erroné (DaKumba) → re-proposé
        expect(caveTradeDoneForRun(true, true, false, true)).toBe(true)     // …puis servi pour de bon
        expect(caveTradeConfig(true).give).toBe("ruffiant"); expect(caveTradeConfig(true).receive).toBe("marmoterre")
        expect(CAVE_TRADE_R3_MARKER).toBe("cave_trade_r3")
    })
    it("câblage : plus aucun choix de marché sur le monde réel ; le bon échange pose le marqueur", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).not.toContain("caveTradeConfig(getActiveWorld()")
        expect((gs.match(/const r3 = effectiveRunWorld\(\) === "run3"/g) ?? []).length).toBeGreaterThanOrEqual(2)
        expect(gs).toContain("caveTradeConfig(effectiveRunWorld() === \"run3\").cancel")
        expect(gs).toContain("if (caveTradeAlreadyDone(r3)) {")
        expect(gs).toContain("if (r3) markTrainerDefeated(CAVE_TRADE_R3_MARKER)")
    })
})
