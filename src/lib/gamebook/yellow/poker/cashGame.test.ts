import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { bossStartStack, cashAllowanceLeft, settleDailyCashout, cashBlindsFor, cashBuyinBounds, CASINO_DAILY_NET_CAP } from "./cashGame"

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("poker cash — tapis de départ des boss (un don par jour, gains persistés, pertes non rendues)", () => {
    it("nouveau boss du jour → reçoit le cap (ton buy-in)", () => {
        expect(bossStartStack(undefined, 40)).toBe(40)
    })
    it("boss ruiné aujourd'hui (0) → null (ne s'assoit pas, out du jour)", () => {
        expect(bossStartStack(0, 40)).toBeNull()
    })
    it("⚠️ boss qui avait PERDU (< cap) → repart avec ce qu'il a : plus JAMAIS rechargé (le trou de Jacanon, 20/10/2026)", () => {
        expect(bossStartStack(15, 40)).toBe(15)
        expect(bossStartStack(1, 2500)).toBe(1)
    })
    it("boss qui avait GAGNÉ (> cap) → GARDE ses gains (peut dépasser ton buy-in)", () => {
        expect(bossStartStack(120, 40)).toBe(120)
    })
    it("stored exactement au cap → reste au cap", () => {
        expect(bossStartStack(40, 40)).toBe(40)
    })
})

describe("casino — plafond NET quotidien (la maison plafonne, tout casino confondu)", () => {
    it("le plafond vaut 10 000 ⚡ net par jour (décision Sartay 20/10/2026)", () => {
        expect(CASINO_DAILY_NET_CAP).toBe(10_000)
    })
    it("marge restante = plafond − net déjà encaissé ; une perte RE-OUVRE de la marge ; jamais négatif", () => {
        expect(cashAllowanceLeft(0)).toBe(10_000)
        expect(cashAllowanceLeft(7_000)).toBe(3_000)
        expect(cashAllowanceLeft(-5_000)).toBe(15_000)
        expect(cashAllowanceLeft(50_000)).toBe(0)
    })
    it("un gain dans la marge est crédité en entier ; au-delà, l'excédent est REPRIS", () => {
        expect(settleDailyCashout(300, 0)).toEqual({ credit: 300, taken: 0, netToday: 300 })
        expect(settleDailyCashout(17_166, 0)).toEqual({ credit: 10_000, taken: 7_166, netToday: 10_000 })
        expect(settleDailyCashout(6_000, 7_000)).toEqual({ credit: 3_000, taken: 3_000, netToday: 10_000 })
        expect(settleDailyCashout(50, 10_000)).toEqual({ credit: 0, taken: 50, netToday: 10_000 })
    })
    it("une perte est entière et compte en négatif (perdre 5 000 puis regagner 15 000 reste dans le plafond)", () => {
        const l = settleDailyCashout(-5_000, 0)
        expect(l).toEqual({ credit: -5_000, taken: 0, netToday: -5_000 })
        expect(settleDailyCashout(15_000, l.netToday)).toEqual({ credit: 15_000, taken: 0, netToday: 10_000 })
    })
    it("la journée de Jacanon du 19/10 (+38 674) aurait rapporté 10 000 ⚡ au lieu de 38 674", () => {
        const gains = [1321, 1662, 1049, 37, 6592, 40, 10807, 17166]
        let net = 0, credited = 0
        for (const g of gains) { const r = settleDailyCashout(g, net); net = r.netToday; credited += r.credit }
        expect(credited).toBe(10_000)
    })
})

describe("blindes indexées sur la jauge (Sartay 20/10/2026 : « forcer Jacanon à jouer beaucoup »)", () => {
    it("2 BB par tranche de 1 000 ⚡ de jauge, plancher 1/2 ; la jauge de Jacanon (38 020) donne 38/76", () => {
        expect(cashBlindsFor(1000)).toEqual({ sb: 1, bb: 2 })
        expect(cashBlindsFor(999)).toEqual({ sb: 1, bb: 2 })
        expect(cashBlindsFor(0)).toEqual({ sb: 1, bb: 2 })
        expect(cashBlindsFor(5000)).toEqual({ sb: 5, bb: 10 })
        expect(cashBlindsFor(38_020)).toEqual({ sb: 38, bb: 76 })
    })
    it("un joueur sous plafond casino (vœu du génie) reste en 1/2", () => {
        expect(cashBlindsFor(38_020, true)).toEqual({ sb: 1, bb: 2 })
    })
    it("buy-in : minimum 10 BB, conseillé 20 BB (inchangé en 1/2 : 20 et 40)", () => {
        expect(cashBuyinBounds(2)).toEqual({ min: 20, def: 40 })
        expect(cashBuyinBounds(76)).toEqual({ min: 760, def: 1520 })
    })
})

describe("⚠️ les verrous sont branchés (panneau, roulette, blackjack, tuto, save)", () => {
    it("poker : buy-in débité à l'assise, blindes de la jauge, encaissement par le plafond casino, marge épuisée = table fermée", () => {
        const ui = read("src/app/gamebook/yellow/DailyPokerPanel.tsx")
        expect(ui).toContain("if (!spendCasinoBet(bi).ok) return")
        expect(ui).toContain("cashBlindsFor(player.repsCap, isCasinoRestricted())")
        expect(ui).toContain("joinCash(bi, cap, bossStacks, blinds)")
        expect(ui).toContain("settleCasinoNet(\"🃏 Poker\", net)")
        expect(ui).toContain("disabled={allowance <= 0 || player.reps < Math.max(MIN_BUYIN, buyin)}")
        expect(ui).not.toContain("buy-in au RISQUE (pas encore débité")
    })
    it("roulette (solo + multi), blackjack et tuto passent par le même plafond", () => {
        expect(read("src/app/gamebook/yellow/roulette/RouletteCasinoModal.tsx")).toContain("settleCasinoNet(\"🎰 Roulette\", finalBalance - caisse)")
        const multi = read("src/app/gamebook/yellow/roulette/RouletteMultiTable.tsx")
        expect(multi).toContain("settleCasinoNet(\"🎰 Roulette\", pc.net)")
        expect(multi).toContain("settleCasinoNet(\"🎰 Roulette\", mine.net)")
        expect(read("src/lib/gamebook/yellow/store/playerStore.ts")).toContain("settleCasinoNet(\"🃏 Blackjack (gain net)\", n)")
        expect(read("src/app/gamebook/yellow/SoloPokerPanel.tsx")).toContain("settleCasinoNet(\"🃏 Poker\", kept)")
    })
    it("casinoNetToday / casinoNetDate traversent les deux sérialiseurs et la lecture de save", () => {
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("casinoNetToday: w.casinoNetToday, casinoNetDate: w.casinoNetDate")
        expect(sm).toContain("casinoNetToday: p.casinoNetToday ?? 0")
        const sv = read("src/lib/gamebook/yellow/storage/save.ts")
        expect(sv).toContain("casinoNetToday: typeof o.casinoNetToday === \"number\"")
        expect(sv).toContain("casinoNetDate: typeof o.casinoNetDate === \"string\"")
    })
})
