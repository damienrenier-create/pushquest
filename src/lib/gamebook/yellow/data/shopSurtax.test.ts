import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { freshShopSurtax, shopSurtaxActive, shopSurtaxMult, surtaxedPrice, parseShopSurtax } from "./shopSurtax"

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
const T0 = 1_760_000_000_000

describe("🧾 contrôle fiscal du Nexus — surtaxe boutique personnelle (Jacanon, 20/10/2026)", () => {
    it("par défaut : prix ×2 pendant 7 jours ; bornes ×1..×10, 1 h..1 an", () => {
        expect(freshShopSurtax(T0)).toEqual({ until: T0 + 168 * 3600_000, mult: 2 })
        expect(freshShopSurtax(T0, 50, 99999)).toEqual({ until: T0 + 24 * 365 * 3600_000, mult: 10 })
        expect(freshShopSurtax(T0, 0.5, 0).mult).toBe(1) // un multiplicateur < 1 est plafonné à 1 : jamais de rabais ; durée 0 → 7 jours
        expect(freshShopSurtax(T0, 0.5, 0).until).toBe(T0 + 168 * 3600_000)
    })
    it("active jusqu'à la fin, puis plus rien ; prix arrondi, jamais sous le prix de base", () => {
        const s = freshShopSurtax(T0, 2, 24)
        expect(shopSurtaxActive(s, T0 + 1)).toBe(true)
        expect(shopSurtaxActive(s, T0 + 24 * 3600_000)).toBe(false)
        expect(shopSurtaxMult(s, T0)).toBe(2)
        expect(shopSurtaxMult(s, T0 + 25 * 3600_000)).toBe(1)
        expect(surtaxedPrice(1000, s, T0)).toBe(2000)
        expect(surtaxedPrice(1000, s, T0 + 25 * 3600_000)).toBe(1000)
        expect(surtaxedPrice(7, { until: T0 + 1, mult: 1.5 }, T0)).toBe(11)
        expect(surtaxedPrice(7, undefined, T0)).toBe(7)
    })
    it("lecture de save défensive", () => {
        expect(parseShopSurtax({ until: T0, mult: 2 })).toEqual({ until: T0, mult: 2 })
        expect(parseShopSurtax({ until: T0, mult: 1 })).toBeUndefined()
        expect(parseShopSurtax("x")).toBeUndefined()
        expect(parseShopSurtax(null)).toBeUndefined()
    })
    it("⚠️ la surtaxe s'applique partout où la boutique encaisse : objets, Fusio-Ball, Super Pasta, Capsules CT", () => {
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).toContain("surtaxShopPrice(it.id === \"fusio_ball\" ? fusioBallShopPrice(fusioBought) : shopPrice(it.price, it.category, bourseCtx))")
        expect(ui).toContain("surtaxShopPrice(fusioBallShopTotal(fusioBoughtNow, buyQty))")
        expect(ui).toContain("const ctPrice = surtaxShopPrice(ct.price)")
        expect(ui).toContain("Contrôle fiscal du Nexus")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("return surtaxShopPrice(Math.round((SUPER_PASTA_BASE + st.pastaDayBonus) * SUPER_PASTA_GROWTH ** st.pastaBoughtToday))")
        expect(ps).toContain("const cost = owned ? 0 : surtaxShopPrice(ct.price)")
        expect(ps).toContain("case \"shop_surtax\":")
        // la save la transporte (deux sérialiseurs + lecture)
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("shopSurtax: w.shopSurtax")
        expect(sm).toContain("shopSurtax: p.shopSurtax")
        expect(read("src/lib/gamebook/yellow/storage/save.ts")).toContain("shopSurtax: parseShopSurtax(")
    })
})
