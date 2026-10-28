import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isStatusCt, parseSalesCount, statusCtPrice, statusCtSales, statusCtSalesKey, STATUS_CT_BASE_PRICE, STATUS_CT_LOT, STATUS_CT_PAST_SALES, STATUS_CT_PRICE_MAX, STATUS_CT_SURGE } from "./statusCtPrice"
import { getCt } from "./cts"

// Sartay, 29/10/2026 : « dans la boutique de jetons, il y a des CT statut inédites vraiment très très fortes. Quand un joueur
// en achète une, si un joueur souhaite acheter la même, elle passe à 5× le prix à chaque fois ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("CT statut : prix ×5 à chaque vente, tous joueurs confondus", () => {
    it("120, puis 600, puis 3 000… et un plafond qui tient dans le solde de JC", () => {
        expect(STATUS_CT_SURGE).toBe(5)
        expect([0, 1, 2, 3].map((n) => statusCtPrice(STATUS_CT_BASE_PRICE, n))).toEqual([120, 600, 3000, 15000])
        expect(statusCtPrice(STATUS_CT_BASE_PRICE, 40)).toBe(STATUS_CT_PRICE_MAX)
        expect(STATUS_CT_PRICE_MAX).toBeLessThan(2 ** 31)
    })
    it("les 6 CT du lot sont bien des CT de la boutique, et seulement elles", () => {
        expect(STATUS_CT_LOT).toEqual(["ct71", "ct72", "ct73", "ct74", "ct75", "ct76"])
        for (const id of STATUS_CT_LOT) { expect(isStatusCt(id)).toBe(true); expect(getCt(id)).toBeTruthy() }
        expect(isStatusCt("ct08")).toBe(false) // les « CT rares » gardent leur prix
    })
    it("ventes = celles d'avant la règle + le compteur serveur ; un compteur illisible vaut 0", () => {
        expect(STATUS_CT_PAST_SALES).toEqual({ ct71: 1, ct74: 1, ct75: 2, ct76: 1 })
        expect(statusCtSales("ct75", 0)).toBe(2)
        expect(statusCtSales("ct75", 3)).toBe(5)
        expect(statusCtSales("ct72", 0)).toBe(0)
        expect([parseSalesCount("4"), parseSalesCount(null), parseSalesCount("abc"), parseSalesCount("-2")]).toEqual([4, 0, 0, 0])
        expect(statusCtSalesKey("ct71")).toBe("statusCtSales:ct71")
    })
    it("le prix affiché (avec le cliquet +10 % du joueur) n'est jamais sous le plancher du serveur", () => {
        for (let k = 0; k <= 30; k++) for (let n = 0; n <= 8; n++) {
            const shown = statusCtPrice(Math.round(STATUS_CT_BASE_PRICE * Math.pow(1.1, k)), n)
            expect(shown).toBeGreaterThanOrEqual(statusCtPrice(STATUS_CT_BASE_PRICE, n))
        }
    })
    it("câblage : la boutique passe par l'action serveur, qui vérifie le prix et compte la vente dans une transaction", () => {
        const shop = read("src/app/gamebook/yellow/CombatShopModal.tsx")
        expect(shop).toContain("const statusCtCost = (id: string) => statusCtPrice(catPrice(STATUS_CT_BASE_PRICE, \"ct\"), soldCount(id))")
        expect(shop).toContain("const r = await postStatusCtSpend(id, price)")
        expect(shop).not.toContain("const STATUS_CT_LOT =")
        const route = read("src/app/api/gamebook/yellow/frontier/route.ts")
        expect(route).toContain("if (action === \"statusCtSpend\") {")
        expect(route).toContain("if (amount < statusCtPrice(STATUS_CT_BASE_PRICE, sales) || amount > STATUS_CT_PRICE_MAX) {")
        expect(route).toContain("const bump = await tx.globalConfig.updateMany({ where: { key, value: row.value }, data: { value: String(counted + 1) } })")
        expect(route).toContain("statusCtSales: await readStatusCtSales()")
    })
})
