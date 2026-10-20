import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    bossStartStack, cashAllowanceLeft, settleDailyCashout, cashBlindsFor, cashBuyinBounds, CASINO_DAILY_NET_CAP,
    POKER_WEEK_MENU, POKER_MENU_ORDER, weekdayOfDayKey, pokerMenuFor, menuBossStack, MAX_BUYIN_SHARE, MIN_TABLE_DEPTH_BB, MAX_TABLE_DEPTH_BB,
    openCashDay, cashDayStake, cashDayTag,
} from "./cashGame"

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
    it("buy-in : minimum 10 BB, conseillé 20 BB, JAMAIS plus que le tapis d'un boss", () => {
        expect(cashBuyinBounds(2, 1000)).toEqual({ min: 20, def: 40, max: 1000 })
        expect(cashBuyinBounds(76, 2000)).toEqual({ min: 760, def: 1520, max: 2000 })
        expect(cashBuyinBounds(2, 30)).toEqual({ min: 20, def: 30, max: 30 })  // table minuscule : le conseillé s'efface
        expect(cashBuyinBounds(2, 12)).toEqual({ min: 12, def: 12, max: 12 })  // … et le minimum aussi
    })
})

describe("menu de la semaine (Sartay 20/10/2026 : « je peux venir avec 5 000 et les bots n'en ont que 40 »)", () => {
    it("le barème annoncé par le croupier : lun 1 000/10 %, mar 2 000/20 %, mer 3 000/30 %, jeu 4 000/40 %, ven 10 000/100 %, sam 20 000/200 %, dim 4 000/40 %", () => {
        const byDay = Object.fromEntries(POKER_WEEK_MENU.map((m) => [m.day, [m.amount, m.pct]]))
        expect(byDay).toEqual({ Lundi: [1000, 10], Mardi: [2000, 20], Mercredi: [3000, 30], Jeudi: [4000, 40], Vendredi: [10_000, 100], Samedi: [20_000, 200], Dimanche: [4000, 40] })
        expect(POKER_MENU_ORDER.map((d) => POKER_WEEK_MENU[d].day)).toEqual(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"])
        expect(new Set(POKER_WEEK_MENU.map((m) => m.dish)).size).toBe(7)
    })
    it("le jour vient de la clé UTC du casino (19/10/2026 = lundi … 25/10/2026 = dimanche) ; clé illisible → lundi", () => {
        const week = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]
        expect(week.map((k) => pokerMenuFor(k).day)).toEqual(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"])
        expect(weekdayOfDayKey("n'importe quoi")).toBe(1)
        expect(weekdayOfDayKey("")).toBe(1)
    })
    it("tapis par boss = le montant du jour, sans dépasser le % de la jauge", () => {
        const at = (k: string, g: number) => menuBossStack(pokerMenuFor(k), g)
        // Jacanon (jauge 38 020) : c'est le montant qui borne, chaque jour
        expect(["2026-10-19", "2026-10-20", "2026-10-23", "2026-10-24", "2026-10-25"].map((k) => at(k, 38_020))).toEqual([1000, 2000, 10_000, 20_000, 4000])
        // jauge 5 000 : c'est le % qui borne
        expect(["2026-10-19", "2026-10-20", "2026-10-23", "2026-10-24"].map((k) => at(k, 5000))).toEqual([500, 1000, 5000, 10_000])
        // jauge 10 000 : les deux coïncident (le barème est calé sur une jauge de 10 000)
        expect(POKER_WEEK_MENU.every((m) => menuBossStack(m, 10_000) === m.amount)).toBe(true)
        expect(at("2026-10-19", 0)).toBe(1)
    })
    it("⚠️ le trou du 20/10 : un mardi, à 38 020 de jauge, on ne s'assoit plus avec 5 000 — au plus le tapis d'un boss (2 000)", () => {
        const stake = menuBossStack(pokerMenuFor("2026-10-20"), 38_020)
        const b = cashBuyinBounds(cashBlindsFor(38_020, false, stake).bb, stake)
        expect(MAX_BUYIN_SHARE).toBe(1)
        expect(b.max).toBe(2000)
        expect(b.max).toBeLessThan(5000)
    })
    it("profondeur : la jauge fixe le PLANCHER des blindes, la table fait entre 10 et 100 BB — les jours prestigieux, les blindes montent", () => {
        expect(MIN_TABLE_DEPTH_BB).toBe(10)
        expect(MAX_TABLE_DEPTH_BB).toBe(100)
        // Jacanon (jauge 38 020, plancher 38/76) : lundi 1 000 → 38/76 (13 BB) ; vendredi 10 000 → 50/100 ; samedi 20 000 → 100/200
        expect(cashBlindsFor(38_020, false, 1000)).toEqual({ sb: 38, bb: 76 })
        expect(cashBlindsFor(38_020, false, 4000)).toEqual({ sb: 38, bb: 76 })
        expect(cashBlindsFor(38_020, false, 10_000)).toEqual({ sb: 50, bb: 100 })
        expect(cashBlindsFor(38_020, false, 20_000)).toEqual({ sb: 100, bb: 200 })
        // jauge 10 000 (plancher 10/20) : 10/20, 10/20, 15/30, 20/40, 50/100, 100/200, 20/40 du lundi au dimanche
        expect(POKER_MENU_ORDER.map((d) => cashBlindsFor(10_000, false, menuBossStack(POKER_WEEK_MENU[d], 10_000)).bb)).toEqual([20, 20, 30, 40, 100, 200, 40])
        // jauge énorme : jamais moins de 10 BB (le buy-in minimal tient dans le tapis d'un boss)
        expect(cashBlindsFor(120_000, false, 1000)).toEqual({ sb: 50, bb: 100 })
        expect(cashBlindsFor(1000, false, 100)).toEqual({ sb: 1, bb: 2 })
        expect(cashBlindsFor(38_020, true, 20_000)).toEqual({ sb: 1, bb: 2 }) // vœu du génie : toujours 1/2
        for (const m of POKER_WEEK_MENU) for (const g of [1000, 5000, 10_000, 38_020, 120_000]) {
            const stake = menuBossStack(m, g), bl = cashBlindsFor(g, false, stake), b = cashBuyinBounds(bl.bb, stake)
            expect(stake / bl.bb).toBeLessThanOrEqual(MAX_TABLE_DEPTH_BB)
            expect(stake / bl.bb).toBeGreaterThanOrEqual(MIN_TABLE_DEPTH_BB)
            expect(bl.bb).toBeGreaterThanOrEqual(Math.min(cashBlindsFor(g).bb, 2 * Math.floor(stake / 20)))
            expect(b.min).toBe(10 * bl.bb)
            expect(b.min).toBeLessThanOrEqual(b.def)
            expect(b.def).toBeLessThanOrEqual(b.max)
            expect(b.max).toBe(stake)
        }
    })
})

describe("journée du cash : le tapis des boss est fixé à la 1re assise du jour", () => {
    const today = "2026-10-20"
    it("1re assise du jour → tapis du menu, boss neufs", () => {
        expect(openCashDay({ date: cashDayTag("2026-10-19"), cap: 1000, bossStacks: { Volta: 1500 } }, today, 38_020)).toEqual({ date: "menu:2026-10-20", cap: 2000, bossStacks: {} })
    })
    it("même jour → tapis du jour et boss conservés (même si la jauge a grandi entre-temps ; les ruinés restent à 0)", () => {
        expect(openCashDay({ date: "menu:2026-10-20", cap: 600, bossStacks: { Volta: 0, Pyra: 900 } }, today, 9000)).toEqual({ date: "menu:2026-10-20", cap: 600, bossStacks: { Volta: 0, Pyra: 900 } })
    })
    it("⚠️ save d'avant le menu (jour sans préfixe, cap = 1er buy-in de 40 ou de 5 000) → repart sur le menu dès la prochaine assise", () => {
        expect(openCashDay({ date: today, cap: 40, bossStacks: { Volta: 40 } }, today, 38_020)).toEqual({ date: "menu:2026-10-20", cap: 2000, bossStacks: {} })
        expect(openCashDay({ date: today, cap: 5000, bossStacks: {} }, today, 38_020).cap).toBe(2000)
    })
    it("cashDayStake = ce que la table appliquera (le tapis déjà fixé aujourd'hui, sinon le menu)", () => {
        expect(cashDayStake({ date: "menu:2026-10-20", cap: 600 }, today, 38_020)).toBe(600)
        expect(cashDayStake({ date: "2026-10-20", cap: 5000 }, today, 38_020)).toBe(2000)
        expect(cashDayStake({ date: "", cap: 0 }, today, 5000)).toBe(1000)
    })
})

describe("⚠️ les verrous sont branchés (panneau, roulette, blackjack, tuto, save)", () => {
    it("poker : buy-in débité à l'assise, blindes de la jauge, encaissement par le plafond casino, marge épuisée = table fermée", () => {
        const ui = read("src/app/gamebook/yellow/DailyPokerPanel.tsx")
        expect(ui).toContain("if (!spendCasinoBet(bi).ok) return")
        expect(ui).toContain("cashBlindsFor(player.repsCap, restricted, dayStake)")
        expect(ui).toContain("joinCash(bi, cap, bossStacks, bl)")
        expect(ui).toContain("settleCasinoNet(\"🃏 Poker\", net)")
        expect(ui).toContain("disabled={allowance <= 0 || player.reps < seatBuyin}")
        expect(ui).not.toContain("buy-in au RISQUE (pas encore débité")
    })
    it("menu : le tapis du jour est fixé AVANT le buy-in, qui ne dépasse jamais ce tapis (ni le plafond du vœu)", () => {
        const ui = read("src/app/gamebook/yellow/DailyPokerPanel.tsx")
        const start = ui.slice(ui.indexOf("function start()"), ui.indexOf("function playerAct("))
        expect(start.indexOf("beginPokerCashGame(todayKey(), player.repsCap)")).toBeGreaterThan(0)
        expect(start.indexOf("beginPokerCashGame(")).toBeLessThan(start.indexOf("spendCasinoBet(bi)"))
        expect(start).toContain("Math.min(player.reps, bounds.max, Math.floor(buyin) || bounds.min)")
        expect(ui).toContain("max={Math.min(player.reps, MAX_BUYIN)}")
        expect(ui).toContain("restricted ? Math.min(b.max, CASINO_VOW_MAX_BET) : b.max")
        expect(ui).toContain("POKER_MENU_ORDER.map((wd) =>")
        const store = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(store).toContain("openCashDay({ date: st.pokerCashDate, cap: st.pokerCashCap, bossStacks: st.pokerBossStacks }, today, gauge)")
        expect(store).not.toContain("cap = Math.max(1, Math.floor(playerBuyin))") // l'ancien cap = 1er buy-in du jour
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
