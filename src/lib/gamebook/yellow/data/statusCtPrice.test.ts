import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isStatusCt, parseBuyCount, statusCtBuys, statusCtBuysKey, statusCtPrice, STATUS_CT_BASE_PRICE, STATUS_CT_LOT, STATUS_CT_PAST_BUYS, STATUS_CT_PRICE_MAX, STATUS_CT_SURGE } from "./statusCtPrice"
import { getCt } from "./cts"

// Sartay, 29/10/2026 : « dans la boutique de jetons, il y a des CT statut inédites vraiment très très fortes. Quand un joueur
// en achète une, si un joueur souhaite acheter la même, elle passe à 5× le prix à chaque fois », puis : « le prix ×5 ne
// s'applique que par joueur. Tous les joueurs peuvent bien sûr acheter leur première CT pour pas cher ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const MOOLS = "cmml1r6um0000pto29d129npd", JACANON = "cmsat15v80001wvyo5agqw4m4"

describe("CT statut : prix ×5 à chaque rachat de la même CT, par joueur", () => {
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
    it("chaque joueur a son propre compteur par CT : la 1re de chacun reste au prix normal", () => {
        expect(statusCtBuysKey("u1", "ct71")).toBe("statusCtBuys:u1:ct71")
        expect(statusCtBuysKey("u1", "ct71")).not.toBe(statusCtBuysKey("u2", "ct71")) // l'achat d'un autre joueur ne compte pas
        expect(statusCtBuysKey("u1", "ct71")).not.toBe(statusCtBuysKey("u1", "ct72")) // ni l'achat d'une autre CT
        expect(statusCtBuys("nouveau", "ct75", 0)).toBe(0)
        expect(statusCtPrice(STATUS_CT_BASE_PRICE, statusCtBuys("nouveau", "ct75", 0))).toBe(120)
        expect(statusCtBuys("nouveau", "ct75", 2)).toBe(2)
        expect([parseBuyCount("4"), parseBuyCount(null), parseBuyCount("abc"), parseBuyCount("-2")]).toEqual([4, 0, 0, 0])
    })
    it("les achats d'avant la règle comptent pour LEUR acheteur seulement", () => {
        expect(STATUS_CT_PAST_BUYS).toEqual({ [MOOLS]: { ct71: 1, ct75: 1, ct76: 1 }, [JACANON]: { ct74: 1, ct75: 1 } })
        expect(statusCtBuys(MOOLS, "ct75", 0)).toBe(1) // sa 2e Aimantation : 600
        expect(statusCtBuys(MOOLS, "ct74", 0)).toBe(0) // sa 1re Machination : 120
        expect(statusCtBuys(JACANON, "ct75", 1)).toBe(2)
        for (const buys of Object.values(STATUS_CT_PAST_BUYS)) for (const id of Object.keys(buys)) expect(isStatusCt(id)).toBe(true)
    })
    it("le prix affiché (avec le cliquet +10 % du joueur) n'est jamais sous le plancher du serveur", () => {
        for (let k = 0; k <= 30; k++) for (let n = 0; n <= 8; n++) {
            const shown = statusCtPrice(Math.round(STATUS_CT_BASE_PRICE * Math.pow(1.1, k)), n)
            expect(shown).toBeGreaterThanOrEqual(statusCtPrice(STATUS_CT_BASE_PRICE, n))
        }
    })
    it("câblage : la boutique passe par l'action serveur, qui vérifie le prix et compte l'achat DU JOUEUR dans une transaction", () => {
        const shop = read("src/app/gamebook/yellow/CombatShopModal.tsx")
        expect(shop).toContain("const statusCtCost = (id: string) => statusCtPrice(catPrice(STATUS_CT_BASE_PRICE, \"ct\"), boughtCount(id))")
        expect(shop).toContain("const r = await postStatusCtSpend(id, price)")
        expect(shop).not.toContain("const STATUS_CT_LOT =")
        const route = read("src/app/api/gamebook/yellow/frontier/route.ts")
        expect(route).toContain("if (action === \"statusCtSpend\") {")
        expect(route).toContain("const key = statusCtBuysKey(auth.userId, ctId)")
        expect(route).toContain("if (amount < statusCtPrice(STATUS_CT_BASE_PRICE, buys) || amount > STATUS_CT_PRICE_MAX) {")
        expect(route).toContain("const bump = await tx.globalConfig.updateMany({ where: { key, value: row.value }, data: { value: String(counted + 1) } })")
        expect(route).toContain("statusCtBuys: await readStatusCtBuys(auth.userId)")
        expect(route).not.toContain("statusCtSales") // plus aucun compteur commun à tous les joueurs
    })
})
