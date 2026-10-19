import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    FUSIO_BALL_SHOP_PRICE, GROTTE_GOLD_RARE_MULT, GROTTE_GOLD_COMMON_MULT, GROTTE_COMMON_BASE_MIN, GROTTE_RARE_BASE_MAX,
    isGrotteMap, grotteGoldWeightMult, fusioBallInShop,
} from "./fusionLeaguePerks"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// RÉCOMPENSES DU PALIER OR — deux choses à tenir : le privilège ne fuit JAMAIS vers un joueur qui n'a pas bouclé
// l'or, et il ne touche QUE la Grotte (un ×2 sur les rares de toute la carte serait un autre jeu).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("Fusio-Ball en boutique", () => {
    it("1000 ⚡, et seulement pour un champion OR", () => {
        expect(FUSIO_BALL_SHOP_PRICE).toBe(1000)
        expect(fusioBallInShop(true)).toBe(true)
        expect(fusioBallInShop(false)).toBe(false)
    })
})

describe("poids de pop dans la Grotte", () => {
    const COMMON = 100, UNCOMMON = 45, RARE = 14, VERY_RARE = 5, GIGA_RARE = 2

    it("⚠️ sans l'or : rien ne bouge, nulle part", () => {
        for (const base of [COMMON, UNCOMMON, RARE, VERY_RARE, GIGA_RARE]) {
            expect(grotteGoldWeightMult(base, "yellow_grotte_nexus", false), `base ${base}`).toBe(1)
        }
    })

    it("⚠️ avec l'or mais HORS de la Grotte : rien ne bouge non plus", () => {
        for (const map of ["yellow_route_nord", "yellow_plage", "yellow_cendreville", "yellow_entrance"]) {
            expect(grotteGoldWeightMult(COMMON, map, true), map).toBe(1)
            expect(grotteGoldWeightMult(RARE, map, true), map).toBe(1)
        }
    })

    it("avec l'or dans la Grotte : rares ×2, communs ×½, intermédiaires inchangés — sur les 3 étages", () => {
        for (const map of ["yellow_grotte_nexus", "yellow_grotte_nexus_b1f", "yellow_grotte_nexus_b2f"]) {
            expect(isGrotteMap(map)).toBe(true)
            expect(grotteGoldWeightMult(COMMON, map, true)).toBe(GROTTE_GOLD_COMMON_MULT)
            expect(grotteGoldWeightMult(UNCOMMON, map, true)).toBe(1)
            for (const r of [RARE, VERY_RARE, GIGA_RARE]) expect(grotteGoldWeightMult(r, map, true), `rare ${r}`).toBe(GROTTE_GOLD_RARE_MULT)
        }
        expect(GROTTE_GOLD_RARE_MULT).toBe(2)
        expect(GROTTE_GOLD_COMMON_MULT).toBe(0.5)
    })

    it("l'effet net est bien « on voit plus de rares » : le ratio rare/commun est multiplié par 4", () => {
        const avant = RARE / COMMON
        const apres = (RARE * grotteGoldWeightMult(RARE, "yellow_grotte_nexus", true)) / (COMMON * grotteGoldWeightMult(COMMON, "yellow_grotte_nexus", true))
        expect(apres / avant).toBeCloseTo(4)
    })

    it("garde-fou : les seuils suivent les constantes réelles d'encounters.ts", () => {
        const src = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/data/encounters.ts"), "utf8")
        expect(src).toMatch(new RegExp(`const COMMON = ${GROTTE_COMMON_BASE_MIN}\\b`))
        expect(src).toMatch(new RegExp(`RARE = ${GROTTE_RARE_BASE_MAX}\\b`))
    })
})

describe("Fusio-Ball : prix progressif en boutique (Sartay 19/10/2026)", () => {
    it("1000 la 1re, 2000 la 2e, 3000 la 3e…", async () => {
        const { fusioBallShopPrice } = await import("./fusionLeaguePerks")
        expect([0, 1, 2, 9].map(fusioBallShopPrice)).toEqual([1000, 2000, 3000, 10000])
    })
    it("plusieurs d'un coup : chacune à son rang", async () => {
        const { fusioBallShopTotal } = await import("./fusionLeaguePerks")
        expect(fusioBallShopTotal(0, 1)).toBe(1000)
        expect(fusioBallShopTotal(0, 3)).toBe(6000)
        expect(fusioBallShopTotal(2, 2)).toBe(7000) // 3000 + 4000
        expect(fusioBallShopTotal(5, 0)).toBe(0)
    })
    it("le compteur vient des marqueurs d'achat (distincts, préfixe exact)", async () => {
        const { fusioShopBoughtCount, fusioShopMarkersFor } = await import("./fusionLeaguePerks")
        expect(fusioShopMarkersFor(2, 2)).toEqual(["fusio_shop_3", "fusio_shop_4"])
        expect(fusioShopBoughtCount(["fusio_shop_1", "fusio_shop_2", "fusio_shop_2", "y_fusion_maitre", "fusleague_or"])).toBe(2)
        expect(fusioShopBoughtCount([])).toBe(0)
    })
    it("⚠️ la boutique affiche le prix progressif et la fenêtre d'achat facture chaque ball à son rang", async () => {
        const fs = await import("node:fs"); const path = await import("node:path")
        const src = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/YellowDevClient.tsx"), "utf8")
        expect(src).toContain("price: fusioBallShopPrice(fusioBought)")
        expect(src).toContain("fusioBallShopTotal(fusioBoughtNow, buyQty)")
        expect(src).toContain("fusioShopMarkersFor(fusioBoughtNow, buyQty)) markTrainerDefeated(m)")
        expect(src).not.toContain("FUSIO_BALL_SHOP_PRICE") // plus aucun prix fixe en boutique
    })
})
