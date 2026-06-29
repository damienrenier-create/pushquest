import { describe, it, expect } from "vitest"
import { WHEEL_ORDER, POCKET_COUNT, colorOf, spinWheel, DOZENS, COLUMNS, REDS } from "./wheel"
import { PAYOUT, betReturn, straight, split, dozen, column, red, even, low, isValidBet, type Bet } from "./bets"
import {
    createRouletteState, placeBet, undoLast, clearZone, clearAll, totalStaked, cycleChip,
    settle, resolveSpin, settleSpin, lockBets,
} from "./engine"
import { computeStats } from "./stats"
import { trachetLine } from "./trachet"

describe("cylindre & couleurs (roulette européenne)", () => {
    it("37 cases uniques 0..36", () => {
        expect(POCKET_COUNT).toBe(37)
        expect(new Set(WHEEL_ORDER).size).toBe(37)
        expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i))
    })
    it("18 rouges, 18 noirs, 1 vert ; couleurs connues correctes", () => {
        let r = 0, b = 0, g = 0
        for (let n = 0; n <= 36; n++) { const c = colorOf(n); if (c === "red") r++; else if (c === "black") b++; else g++ }
        expect([r, b, g]).toEqual([18, 18, 1])
        expect(colorOf(0)).toBe("green")
        expect(colorOf(32)).toBe("red")
        expect(colorOf(26)).toBe("black")
    })
    it("spinWheel reste dans 0..36", () => {
        for (const v of [0, 0.5, 0.999999]) { const n = spinWheel(() => v); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(36) }
    })
    it("couvertures dérivées : douzaines, colonnes, rouges", () => {
        expect(DOZENS[1]).toHaveLength(12); expect(DOZENS[3][0]).toBe(25)
        expect(COLUMNS[1]).toContain(34); expect(COLUMNS[3]).toContain(36)
        expect(REDS).toHaveLength(18)
    })
})

describe("payouts & retours", () => {
    it("retour d'un PLEIN gagnant = mise × 36 (35:1)", () => {
        expect(PAYOUT.STRAIGHT).toBe(35)
        expect(betReturn(straight(17, 5), 17)).toBe(180) // 5 × (35+1)
        expect(betReturn(straight(17, 5), 18)).toBe(0)
    })
    it("cheval/douzaine/rouge : retours corrects", () => {
        expect(betReturn(split([1, 2], 10), 2)).toBe(180)   // 10 × 18
        expect(betReturn(dozen(1, 10), 7)).toBe(30)         // 10 × 3
        expect(betReturn(dozen(1, 10), 20)).toBe(0)
        expect(betReturn(red(10), 32)).toBe(20)             // 10 × 2 (32 rouge)
        expect(betReturn(red(10), 26)).toBe(0)              // 26 noir
    })
    it("le 0 fait perdre les chances extérieures, gagner le plein 0", () => {
        expect(betReturn(red(10), 0)).toBe(0)
        expect(betReturn(even(10), 0)).toBe(0)
        expect(betReturn(low(10), 0)).toBe(0)
        expect(betReturn(column(2, 10), 0)).toBe(0)
        expect(betReturn(straight(0, 10), 0)).toBe(360)
    })
    it("validation des paris", () => {
        expect(isValidBet(straight(17, 5))).toBe(true)
        expect(isValidBet({ type: "SPLIT", numbers: [1], chips: 5, zoneId: "x" } as Bet)).toBe(false) // mauvaise taille
        expect(isValidBet(straight(17, 0))).toBe(false) // mise nulle
    })
})

describe("AVANTAGE MAISON = 1/37 (≈ 2,70%) — exact, tous types de paris", () => {
    // Sur les 37 résultats équiprobables, 1 chip misé rapporte au TOTAL 36 → EV = 36/37.
    const cases: Array<[string, Bet]> = [
        ["plein", straight(17, 1)],
        ["cheval", split([1, 2], 1)],
        ["douzaine", dozen(2, 1)],
        ["colonne", column(1, 1)],
        ["rouge", red(1)],
        ["pair", even(1)],
        ["manque", low(1)],
    ]
    for (const [name, bet] of cases) {
        it(`${name} : retour total sur 37 tours = 36 (mises = 37)`, () => {
            let total = 0
            for (let n = 0; n <= 36; n++) total += betReturn(bet, n)
            expect(total).toBe(36)            // EV = 36/37 ≈ 0,973 → edge = 1/37 ≈ 2,70%
        })
    }
})

describe("moteur d'état (dépôt / undo / clear / résolution)", () => {
    it("placeBet débite le solde, empile sur la même zone, undo rembourse", () => {
        let s = createRouletteState(100, 5)
        s = placeBet(s, straight(17, 5))
        expect(s.balance).toBe(95); expect(totalStaked(s)).toBe(5)
        s = placeBet(s, straight(17, 5)) // empile
        expect(s.balance).toBe(90); expect(s.bets).toHaveLength(1); expect(s.bets[0].chips).toBe(10)
        s = undoLast(s)
        expect(s.balance).toBe(95); expect(s.bets[0].chips).toBe(5)
    })
    it("fonds insuffisants = no-op", () => {
        const s = createRouletteState(3, 5)
        expect(placeBet(s, straight(17, 5)).balance).toBe(3) // 5 > 3 → refusé
    })
    it("clearZone et clearAll remboursent", () => {
        let s = createRouletteState(100, 5)
        s = placeBet(s, straight(17, 5)); s = placeBet(s, red(10))
        expect(s.balance).toBe(85)
        s = clearZone(s, "red"); expect(s.balance).toBe(95); expect(s.bets).toHaveLength(1)
        s = clearAll(s); expect(s.balance).toBe(100); expect(s.bets).toHaveLength(0)
    })
    it("settle crédite les gagnants, archive le numéro, déverrouille", () => {
        let s = createRouletteState(100, 5)
        s = placeBet(s, straight(17, 5)) // balance 95
        s = lockBets(s); expect(s.locked).toBe(true)
        const { state, result } = settle(s, 17)
        expect(state.balance).toBe(95 + 180)   // retour 180
        expect(result.net).toBe(175)
        expect(state.history[0]).toBe(17)
        expect(state.bets).toHaveLength(0); expect(state.locked).toBe(false)
    })
    it("settle d'une donne perdante : solde inchangé (mise déjà débitée), net négatif", () => {
        let s = createRouletteState(100, 5)
        s = placeBet(s, straight(17, 5)) // 95
        const { state, result } = settle(s, 0)
        expect(state.balance).toBe(95); expect(result.net).toBe(-5)
    })
    it("cycleChip fait défiler 1·5·10·25·100", () => {
        let s = createRouletteState(100, 1)
        const seen = [s.chipValue]
        for (let i = 0; i < 5; i++) { s = cycleChip(s); seen.push(s.chipValue) }
        expect(seen).toEqual([1, 5, 10, 25, 100, 1])
    })
    it("resolveSpin (sans état) calcule staked/returned/net", () => {
        const r = resolveSpin(7, [dozen(1, 10), red(10)]) // 7 ∈ douzaine1 (gagne 30), 7 rouge (gagne 20)
        expect(r.staked).toBe(20); expect(r.returned).toBe(50); expect(r.net).toBe(30)
    })
})

describe("settleSpin (async, prêt prod)", () => {
    it("utilise le `winning` serveur + appelle le hook persist", async () => {
        let s = createRouletteState(100, 5)
        s = placeBet(s, straight(17, 5))
        const saved: Array<{ winning: number; net: number; newBalance: number }> = []
        const out = await settleSpin({ state: s, winning: 17, persist: async (p) => { saved.push(p) } })
        expect(out.result.winning).toBe(17)
        expect(saved).toEqual([{ winning: 17, net: 175, newBalance: 275 }])
    })
    it("accepte un rng seedé (déterministe) et lève sans source de hasard", async () => {
        const s = createRouletteState(100, 5)
        const out = await settleSpin({ state: s, rng: () => 0 }) // → numéro 0
        expect(out.result.winning).toBe(0)
        await expect(settleSpin({ state: s })).rejects.toThrow()
    })
})

describe("statistiques temps réel", () => {
    it("% couleurs, chaud/froid, séries en cours", () => {
        // history[0] = plus récent. 3 rouges d'affilée (32,19,21), puis noir 26, vert 0.
        const history = [32, 19, 21, 26, 0]
        const st = computeStats(history, { topK: 3 })
        expect(st.spins).toBe(5)
        expect(st.colors.red).toBe(3); expect(st.colors.green).toBe(1)
        expect(st.streaks.color).toEqual({ value: "red", len: 3 }) // série rouge en cours = 3
        // 21 est impair → parité en cours = impair (32 pair casserait, mais 32 est en tête → pair len 1)
        expect(st.streaks.parity).toEqual({ value: "pair", len: 1 })
        // chaud = les plus fréquents ; froid = les plus en retard (jamais vus → sinceSpins = spins)
        expect(st.hot.length).toBe(3)
        expect(st.cold[0].sinceSpins).toBe(5)
    })
})

describe("Trachet Talk", () => {
    it("répliques contextuelles (0, acharnement froid, gros gain, perte)", () => {
        const base = { winning: 0, bankroll: 500 }
        expect(trachetLine({ ...base, won: false, net: -50, isZero: true, insistedColdNumber: false }, () => 0)).toMatch(/0|zéro|maison/i)
        expect(trachetLine({ won: false, net: -50, winning: 13, isZero: false, insistedColdNumber: true, bankroll: 500 }, () => 0)).toMatch(/froid|grands nombres|non/i)
        expect(trachetLine({ won: true, net: 360, winning: 17, isZero: false, insistedColdNumber: false, bankroll: 800 }, () => 0)).toBeTruthy()
        expect(trachetLine({ won: false, net: -10, winning: 5, isZero: false, insistedColdNumber: false, bankroll: 10 }, () => 0)).toMatch(/miettes|critique|gauche/i)
    })
})
