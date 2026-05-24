// ============================================================
// v3.24b — Casino pattern (Muscuville)
// ============================================================
// Le casino de Muscuville (casino_muscuville) propose une roulette à pattern
// déterministe. Spec :
//   - 11 cases : 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
//   - Mise par case : 10 à 50 reps
//   - Le joueur peut miser sur plusieurs cases simultanément
//   - À chaque spin, la roulette tombe sur PATTERN[spinIndex % 20]
//   - Gain : mise × 10 sur la case gagnante. Toutes les autres mises sont perdues.
//   - 5 wins consécutifs (au moins une case gagnée par spin) → BANQUEROUTE :
//       → badge "Casseur de banque" (200 XP)
//       → cooldown 24h
//       → reset spinIndex
//
// Le pattern est fixe mais déterministe — un joueur attentif peut le craquer
// en notant les résultats successifs.
// ============================================================

/** Pattern fixe de 20 chiffres dans [0, 10]. */
export const CASINO_PATTERN: readonly number[] = [
    4, 7, 2, 9, 0, 5, 8, 1, 10, 3,
    6, 4, 9, 2, 7, 0, 8, 5, 3, 10,
] as const

export const CASINO_PATTERN_LENGTH = CASINO_PATTERN.length // 20
export const CASINO_NUM_CASES = 11                          // cases 0 à 10
export const CASINO_MIN_BET = 10
export const CASINO_MAX_BET = 50
export const CASINO_WIN_MULTIPLIER = 10                     // mise gagnante × 10
export const CASINO_BANKRUPT_STREAK = 5                     // 5 wins d'affilée → banqueroute
export const CASINO_BANKRUPT_COOLDOWN_HOURS = 24
export const CASINO_BANKRUPT_BADGE_KEY = "gamebook_casseur_banque"
export const CASINO_BANKRUPT_BADGE_XP = 200

/** Bet placé par le joueur sur une case. */
export interface CasinoBet {
    case: number      // 0-10
    amount: number    // 10-50
}

/** Résultat d'un spin pour réponse API. */
export interface CasinoSpinResult {
    winningCase: number
    totalBet: number
    totalWin: number
    netGain: number   // totalWin - totalBet
    newSpinIndex: number
    newWinStreak: number
    bankrupt: boolean
    bankruptUntil?: Date
    badgeAwarded: boolean
}

/** Valide la forme + bornes d'un array de bets. */
export function validateBets(bets: unknown): { ok: true; bets: CasinoBet[] } | { ok: false; reason: string } {
    if (!Array.isArray(bets) || bets.length === 0) {
        return { ok: false, reason: "Place au moins une mise." }
    }
    const seen = new Set<number>()
    const out: CasinoBet[] = []
    for (const raw of bets) {
        if (!raw || typeof raw !== "object") return { ok: false, reason: "Mise invalide." }
        const caseN = (raw as { case?: unknown }).case
        const amount = (raw as { amount?: unknown }).amount
        if (typeof caseN !== "number" || !Number.isInteger(caseN) || caseN < 0 || caseN >= CASINO_NUM_CASES) {
            return { ok: false, reason: `Case invalide (doit être entre 0 et ${CASINO_NUM_CASES - 1}).` }
        }
        if (typeof amount !== "number" || !Number.isInteger(amount) || amount < CASINO_MIN_BET || amount > CASINO_MAX_BET) {
            return { ok: false, reason: `Mise invalide (doit être entre ${CASINO_MIN_BET} et ${CASINO_MAX_BET} reps).` }
        }
        if (seen.has(caseN)) {
            return { ok: false, reason: `Tu as déjà misé sur la case ${caseN}.` }
        }
        seen.add(caseN)
        out.push({ case: caseN, amount })
    }
    return { ok: true, bets: out }
}
