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

// ─── SYSTÈME DE COTES BOOKMAKER ──────────────────────────────────────────────

export interface StatOddsInput {
    key: string
    label: string
    statValue: number   // valeur brute de la stat (ex: 12 flambeaux sur 30j)
    statLabel: string   // texte affiché (ex: "12 flambeaux / 30j")
    isInverse?: boolean // true pour l'option "Non" d'un pari binaire
}

export interface BookmakerOdds {
    key: string
    label: string
    statLabel: string
    probability: number  // probabilité estimée (0-1)
    odd: number          // cote affichée arrondie à 2 décimales
    impliedGain: number  // gain pour une mise de 100 XP
}

/**
 * Calcule les cotes bookmaker depuis des stats réelles.
 * Pour les paris binaires (Oui/Non), l'option marquée isInverse=true
 * reçoit P(inverse) = 1 - P(principale).
 * margin = marge de la maison (0.10 = 10%)
 * Plancher de probabilité à 0.05 pour éviter des cotes absurdes.
 */
export function calculateBookmakerOdds(
    inputs: StatOddsInput[],
    margin: number = 0.10
): BookmakerOdds[] {
    if (inputs.length === 0) return [];

    // Séparer les options normales des options inverses (binaire Non)
    const normalInputs = inputs.filter(i => !i.isInverse);
    const inverseInputs = inputs.filter(i => i.isInverse);

    // Valeurs brutes — plancher à 1
    const values = normalInputs.map(i => Math.max(i.statValue, 1));
    const total = values.reduce((sum, v) => sum + v, 0);
    const rawProbs: number[] = values.map(v => Math.max(v / total, 0.05));

    // Normaliser pour que la somme = 1
    const probSum = rawProbs.reduce((s, p) => s + p, 0);
    const normalizedProbs = rawProbs.map(p => p / probSum);

    const result: BookmakerOdds[] = normalInputs.map((input, i) => {
        const probability = normalizedProbs[i];
        const odd = Math.max(1.05, parseFloat((1 / (probability * (1 + margin))).toFixed(2)));
        return {
            key: input.key,
            label: input.label,
            statLabel: input.statLabel,
            probability: parseFloat(probability.toFixed(3)),
            odd,
            impliedGain: Math.round(100 * odd)
        };
    });

    // Options inverses : P(inverse) = 1 - P(principale correspondante)
    // Pour un binaire Oui/Non : Non = 1 - P(Oui)
    for (const inv of inverseInputs) {
        // La principale est la première option normale
        const mainProb = normalizedProbs[0] || 0.5;
        const invProb = Math.max(1 - mainProb, 0.05);
        const odd = Math.max(1.05, parseFloat((1 / (invProb * (1 + margin))).toFixed(2)));
        result.push({
            key: inv.key,
            label: inv.label,
            statLabel: inv.statLabel,
            probability: parseFloat(invProb.toFixed(3)),
            odd,
            impliedGain: Math.round(100 * odd)
        });
    }

    return result;
}

// ─── MULTIPLICATEUR EARLY BIRD ────────────────────────────────────────────────

/**
 * Calcule le multiplicateur Early Bird selon la durée totale du pari
 * et le temps écoulé depuis l'ouverture.
 *
 * Règles :
 * - Période de grâce de 24h : multiplicateur au maximum (Mmax)
 * - Après 24h : déclin linéaire de Mmax à 1.0 jusqu'à closeAt
 *
 * Mmax selon durée totale du pari :
 * - 1-7 jours   : 1.2
 * - 8-30 jours  : 1.5
 * - 31-90 jours : 2.0
 * - 91-180 jours: 3.0
 * - > 180 jours : 5.0
 */
export function calculateEarlyBirdMultiplier(
    openAt: Date,
    closeAt: Date,
    now: Date
): number {
    const totalMs = closeAt.getTime() - openAt.getTime();
    const totalDays = totalMs / (1000 * 60 * 60 * 24);
    const elapsedMs = now.getTime() - openAt.getTime();

    // Déterminer Mmax selon durée totale
    let mMax: number;
    if (totalDays <= 7)   mMax = 1.2;
    else if (totalDays <= 30)  mMax = 1.5;
    else if (totalDays <= 90)  mMax = 2.0;
    else if (totalDays <= 180) mMax = 3.0;
    else mMax = 5.0;

    // Période de grâce : premières 24h
    const gracePeriodMs = 24 * 60 * 60 * 1000;
    if (elapsedMs <= gracePeriodMs) {
        return mMax;
    }

    // Après la période de grâce : déclin linéaire de Mmax à 1.0
    const remainingMs = totalMs - gracePeriodMs;
    const elapsedAfterGrace = elapsedMs - gracePeriodMs;
    const ratio = Math.min(1, elapsedAfterGrace / remainingMs);
    const multiplier = mMax - (mMax - 1.0) * ratio;

    return parseFloat(Math.max(1.0, multiplier).toFixed(4));
}

/**
 * Calcule la cote finale = cote bookmaker × multiplicateur Early Bird.
 * C'est cette valeur qui est figée (lockedOdd) au moment de la mise.
 */
export function calculateFinalOdd(
    bookmakerOdd: number,
    earlyBirdMultiplier: number
): number {
    return parseFloat((bookmakerOdd * earlyBirdMultiplier).toFixed(2));
}

/**
 * Calcule le bonus XP que la maison doit créer si le gain parimutuel
 * est inférieur à la cote garantie.
 * Retourne 0 si la pool parimutuelle est suffisante.
 */
export function calculateBookmakerBonus(
    xpStaked: number,
    lockedOdd: number,
    xpGainParimutuel: number
): number {
    const guaranteedGain = Math.floor(xpStaked * lockedOdd);
    return Math.max(0, guaranteedGain - xpGainParimutuel);
}
