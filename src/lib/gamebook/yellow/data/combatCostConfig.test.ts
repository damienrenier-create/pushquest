import { describe, it, expect } from "vitest"
import { attackCost, effectiveQuota, STRUGGLE_INDEX, STRUGGLE_MOVE_ID, QUOTA_STD } from "./combatCostConfig"
import { getMove } from "./moves"

const hydro = getMove("hydrocanon")!   // dégâts, puissance 110
const seisme = getMove("seisme")!      // dégâts, puissance 100 (= seuil)
const charge = getMove("charge")!      // dégâts, puissance 40
const mirage = getMove("mirage")!      // statut game-changer (costPower 50)
const hurl = getMove("hurlement")!     // statut mineur (costPower 20)
const sable = getMove("jet_de_sable")! // statut sans costPower → défaut 30

describe("attackCost — coût = 10 × (cp/100) × (quota/150) × (niveau/60)", () => {
    it("max 10 : puissance ≥100 + quota 150 + niveau ≥60", () => {
        expect(attackCost(hydro, 60, 150)).toBe(10)
        expect(attackCost(seisme, 60, 150)).toBe(10)
        expect(attackCost(hydro, 90, 300)).toBe(10) // plafonné (niv & quota au-delà des seuils)
    })
    it("Hydrocanon (niv 60) selon le quota : 150→10, 75→5, 30→2", () => {
        expect(attackCost(hydro, 60, 150)).toBe(10)
        expect(attackCost(hydro, 60, 75)).toBe(5)
        expect(attackCost(hydro, 60, 30)).toBe(2)
    })
    it("le NIVEAU compte (coût plein à N60) : Hydrocanon quota 150 → niv 30 = 5 (moitié), niv 15 ≈ 3", () => {
        expect(attackCost(hydro, 30, 150)).toBe(5)
        expect(attackCost(hydro, 15, 150)).toBe(3) // 2,5 → arrondi 3
    })
    it("statuts (niv 60) : game-changer (Mirage) max 5 · mineur (Hurlement) max 2 · défaut max 3", () => {
        expect(attackCost(mirage, 60, 150)).toBe(5)
        expect(attackCost(hurl, 60, 150)).toBe(2)
        expect(attackCost(sable, 60, 150)).toBe(3)
    })
    it("statut scalé par quota : Mirage niv60 quota 75 → 3, quota 30 → 1", () => {
        expect(attackCost(mirage, 60, 75)).toBe(3) // 2,5 → arrondi 3
        expect(attackCost(mirage, 60, 30)).toBe(1)
    })
    it("plancher 1 ; move absent → 1", () => {
        expect(attackCost(charge, 1, 30)).toBe(1)
        expect(attackCost(null, 60, 150)).toBe(1)
    })
    it("effectiveQuota : indispo / ≤1 → 150 ; valeur plausible conservée", () => {
        expect(effectiveQuota(undefined)).toBe(150)
        expect(effectiveQuota(1)).toBe(150)
        expect(effectiveQuota(30)).toBe(30)
        expect(effectiveQuota(150)).toBe(150)
    })
    it("constantes de secours", () => {
        expect(STRUGGLE_INDEX).toBeLessThan(0)
        expect(STRUGGLE_MOVE_ID).toBe("charge_desesperee")
        expect(QUOTA_STD).toBe(150)
    })
})
