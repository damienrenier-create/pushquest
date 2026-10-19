import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { bossStartStack, cashAllowanceLeft, settleDailyCashout, POKER_DAILY_NET_CAP } from "./cashGame"

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

describe("poker cash — plafond NET quotidien (la maison plafonne)", () => {
    it("le plafond vaut 1000 ⚡ net par jour, comme le tuto", () => {
        expect(POKER_DAILY_NET_CAP).toBe(1000)
    })
    it("marge restante = plafond − net déjà encaissé ; une perte RE-OUVRE de la marge ; jamais négatif", () => {
        expect(cashAllowanceLeft(0)).toBe(1000)
        expect(cashAllowanceLeft(700)).toBe(300)
        expect(cashAllowanceLeft(-500)).toBe(1500)
        expect(cashAllowanceLeft(5000)).toBe(0)
    })
    it("un gain dans la marge est crédité en entier ; au-delà, l'excédent est REPRIS", () => {
        expect(settleDailyCashout(300, 0)).toEqual({ credit: 300, taken: 0, netToday: 300 })
        expect(settleDailyCashout(17166, 0)).toEqual({ credit: 1000, taken: 16166, netToday: 1000 })
        expect(settleDailyCashout(600, 700)).toEqual({ credit: 300, taken: 300, netToday: 1000 })
        expect(settleDailyCashout(50, 1000)).toEqual({ credit: 0, taken: 50, netToday: 1000 })
    })
    it("une perte est entière et compte en négatif (perdre 500 puis regagner 1 500 reste dans le plafond)", () => {
        const l = settleDailyCashout(-500, 0)
        expect(l).toEqual({ credit: -500, taken: 0, netToday: -500 })
        expect(settleDailyCashout(1500, l.netToday)).toEqual({ credit: 1500, taken: 0, netToday: 1000 })
    })
    it("la journée de Jacanon du 19/10 (+38 674) aurait rapporté 1 000 ⚡ au lieu de 38 674", () => {
        const gains = [1321, 1662, 1049, 37, 6592, 40, 10807, 17166]
        let net = 0, credited = 0
        for (const g of gains) { const r = settleDailyCashout(g, net); net = r.netToday; credited += r.credit }
        expect(credited).toBe(1000)
    })
})

describe("⚠️ le panneau applique les verrous (buy-in débité à l'assise, plafond à l'encaissement)", () => {
    const ui = read("src/app/gamebook/yellow/DailyPokerPanel.tsx")
    it("le buy-in est débité à l'assise (plus de free-roll au rechargement) et la marge épuisée ferme la table", () => {
        expect(ui).toContain("if (!spendCasinoBet(bi).ok) return")
        expect(ui).toContain("disabled={allowance <= 0 || player.reps < Math.max(MIN_BUYIN, buyin)}")
        expect(ui).not.toContain("buy-in au RISQUE (pas encore débité")
    })
    it("l'encaissement passe par settleDailyCashout et mémorise le net du jour", () => {
        expect(ui).toContain("settleDailyCashout(net, getPokerCashNet())")
        expect(ui).toContain("setPokerCashNet(settled.netToday)")
    })
    it("pokerCashNet traverse les deux sérialiseurs et la lecture de save, et se remet à zéro au changement de jour", () => {
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("pokerCashNet: w.pokerCashNet")
        expect(sm).toContain("pokerCashNet: p.pokerCashNet ?? 0")
        expect(read("src/lib/gamebook/yellow/storage/save.ts")).toContain("pokerCashNet: typeof o.pokerCashNet === \"number\"")
        expect(read("src/lib/gamebook/yellow/store/playerStore.ts")).toContain("pokerBossStacks: {}, pokerCashNet: 0 }")
    })
})
