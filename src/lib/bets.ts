/**
 * bets.ts — Logique métier du système de paris PushQuest
 * Multiplicateurs, malus, distribution parimutuelle, calcul EC
 * Aucun import Prisma — logique pure.
 */

// ─── MULTIPLICATEUR D'ENTRÉE ─────────────────────────────────────────────────

/**
 * Calcule le multiplicateur selon le % du temps écoulé.
 * Appelé au moment où un joueur place ou augmente sa mise.
 */
export function calculateEntryMultiplier(
    openAt: Date,
    closeAt: Date,
    now: Date
): number {
    const total = closeAt.getTime() - openAt.getTime();
    const elapsed = now.getTime() - openAt.getTime();
    const ratio = Math.min(1, Math.max(0, elapsed / total));

    if (ratio <= 0.20) return 2.0;
    if (ratio <= 0.50) return 1.6;
    if (ratio <= 0.80) return 1.3;
    if (ratio <= 0.95) return 1.0;
    return 0.85; // dernière heure — pénalité affichée
}

// ─── MULTIPLICATEUR EN CAS D'AUGMENTATION ────────────────────────────────────

/**
 * Calcule le nouveau multiplicateur moyen pondéré quand un joueur augmente sa mise.
 */
export function calculateWeightedMultiplier(
    existingStake: number,
    existingMultiplier: number,
    additionalStake: number,
    newMultiplier: number
): number {
    const total = existingStake + additionalStake;
    if (total === 0) return newMultiplier;
    return (existingStake * existingMultiplier + additionalStake * newMultiplier) / total;
}

// ─── MALUS DE RETRAIT ────────────────────────────────────────────────────────

/**
 * Calcule les XP récupérés après retrait.
 * Retourne null si le retrait est impossible (dernière heure = lockAt).
 */
export function calculateWithdrawReturn(
    xpStaked: number,
    openAt: Date,
    closeAt: Date,
    now: Date
): number | null {
    const total = closeAt.getTime() - openAt.getTime();
    const elapsed = now.getTime() - openAt.getTime();
    const ratio = Math.min(1, Math.max(0, elapsed / total));

    if (ratio >= 0.95) return null; // impossible
    if (ratio < 0.20) return Math.floor(xpStaked * 0.90);
    if (ratio < 0.50) return Math.floor(xpStaked * 0.60);
    return Math.floor(xpStaked * 0.30);
}

// ─── DISTRIBUTION DES GAINS ──────────────────────────────────────────────────

export interface BetEntryForCalc {
    userId: string;
    xpStaked: number;
    multiplier: number;
    withdrawn: boolean;
    xpReturned: number | null;
    option: string;
}

export interface WinningDistribution {
    userId: string;
    xpGain: number;    // gain total XP (inclut la mise)
    ecGain: number;    // gain en Embercoins (xpGain / 10, arrondi)
}

/**
 * Calcule la distribution des gains après résolution.
 * Retourne [] si aucun gagnant (pool brûlée).
 */
export function calculateWinnings(
    entries: BetEntryForCalc[],
    winnerOption: string
): WinningDistribution[] {
    // Pool totale = toutes les mises - XP retournés aux retirés
    const totalStaked = entries.reduce((sum, e) => sum + e.xpStaked, 0);
    const totalReturned = entries.reduce((sum, e) => sum + (e.xpReturned || 0), 0);
    const pool = totalStaked - totalReturned;

    // Gagnants = non retirés + bonne option
    const winners = entries.filter(e => !e.withdrawn && e.option === winnerOption);

    // Aucun gagnant → pool brûlée
    if (winners.length === 0 || pool <= 0) return [];

    // Mises pondérées
    const weightedWinners = winners.map(w => ({
        userId: w.userId,
        weighted: w.xpStaked * w.multiplier
    }));
    const totalWeighted = weightedWinners.reduce((sum, w) => sum + w.weighted, 0);

    if (totalWeighted === 0) return [];

    // Gains théoriques décimaux
    const rawGains = weightedWinners.map(w => ({
        userId: w.userId,
        raw: (w.weighted / totalWeighted) * pool
    }));

    // Arrondi vers le bas
    const floored = rawGains.map(g => ({
        userId: g.userId,
        xpGain: Math.floor(g.raw),
        remainder: g.raw - Math.floor(g.raw)
    }));

    // Distribution du reliquat aux meilleurs restes décimaux
    const totalFloored = floored.reduce((sum, g) => sum + g.xpGain, 0);
    const residual = Math.round(pool - totalFloored);
    const sorted = [...floored].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < residual && i < sorted.length; i++) {
        sorted[i].xpGain += 1;
    }

    return sorted.map(g => ({
        userId: g.userId,
        xpGain: g.xpGain,
        ecGain: Math.floor(g.xpGain / 10)
    }));
}

// ─── COTES EN TEMPS RÉEL ─────────────────────────────────────────────────────

export interface OddsDisplay {
    key: string;
    label: string;
    betCount: number;
    totalXp: number;
    percentage: number;
    currentMultiplier: number;
}

/**
 * Calcule les stats de cotes pour affichage temps réel.
 */
export function calculateOddsDisplay(
    options: Array<{ key: string; label: string }>,
    entries: Array<{ option: string; xpStaked: number; withdrawn: boolean }>,
    openAt: Date,
    closeAt: Date,
    now: Date
): OddsDisplay[] {
    const activeEntries = entries.filter(e => !e.withdrawn);
    const totalXp = activeEntries.reduce((sum, e) => sum + e.xpStaked, 0);
    const currentMultiplier = calculateEntryMultiplier(openAt, closeAt, now);

    return options.map(opt => {
        const optEntries = activeEntries.filter(e => e.option === opt.key);
        const optXp = optEntries.reduce((sum, e) => sum + e.xpStaked, 0);
        return {
            key: opt.key,
            label: opt.label,
            betCount: optEntries.length,
            totalXp: optXp,
            percentage: totalXp > 0 ? Math.round((optXp / totalXp) * 100) : 0,
            currentMultiplier
        };
    });
}
