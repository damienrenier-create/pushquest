/**
 * PUSHQUEST - Core Challenge Logic (Hybrid Integration v2.1)
 * Optimized Timezone Handling & Secure Date Parsing.
 */

export const CHALLENGE_START_DATE = "2026-01-01";
export const FINE_START_DATE = "2026-03-11";

/**
 * SÉCURITÉ : Parse une chaîne YYYY-MM-DD en objet Date local (Minuit)
 * Évite les décalages UTC/Local de "new Date(dateISO)".
 */
function parseISODate(dateISO: string): Date {
    const [year, month, day] = dateISO.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * SÉCURITÉ : Récupère l'instant présent forcé sur le fuseau Europe/Paris
 */
function getParisNow(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
}

/**
 * Normalise une date en chaîne ISO YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Retourne la date du jour en YYYY-MM-DD (Europe/Paris)
 */
export function getTodayISO(): string {
    return formatDateISO(getParisNow());
}

/**
 * Retourne la date d'hier en YYYY-MM-DD (Europe/Paris)
 */
export function getYesterdayISO(): string {
    const d = getParisNow();
    d.setDate(d.getDate() - 1);
    return formatDateISO(d);
}

/**
 * Retourne les dates autorisées pour l'encodage (Aujourd'hui, Hier, J-2, J-3)
 */
export function getAllowedEncodingDates(): string[] {
    const dates = [];
    for (let i = 0; i < 4; i++) {
        const d = getParisNow();
        d.setDate(d.getDate() - i);
        dates.push(formatDateISO(d));
    }
    return dates;
}

/**
 * Calcule le jour de l'année (1-366)
 * Utilise parseISODate pour une stabilité totale face aux changements d'heure (DST).
 */
export function getDayOfYear(dateISO: string): number {
    const d = parseISODate(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

export function getRequiredRepsForDate(dateISO: string): number {
    return getDayOfYear(dateISO);
}

/**
 * Calcul du quota d'onboarding : 30 au départ, +3 par jour (+2 le dimanche)
 */
export function calculateOnboardingQuota(startISO: string, targetISO: string): number {
    const start = parseISODate(startISO);
    const target = parseISODate(targetISO);
    
    if (target < start) return 30;

    let quota = 30;
    const current = new Date(start);

    while (current < target) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay(); // 0 = Dimanche
        quota += (dayOfWeek === 0) ? 2 : 3;
    }

    return quota;
}

export interface DailyTargetResult {
    target: number;
    mode: 'STANDARD' | 'ONBOARDING';
    onboardingFinished: boolean;
}

/**
 * Retourne la cible quotidienne pour un utilisateur (Système à 3 champs).
 */
export function getDailyTargetForUserOnDate(user: any, dateISO: string): DailyTargetResult {
    const standardTarget = getRequiredRepsForDate(dateISO);

    // Garde-fou : vérification de l'existence du compte
    if (user?.createdAt) {
        const createdAtISO = typeof user.createdAt === 'string' 
            ? user.createdAt.split('T')[0] 
            : formatDateISO(new Date(user.createdAt));
        if (dateISO < createdAtISO) {
            return { target: standardTarget, mode: 'STANDARD', onboardingFinished: true };
        }
    }

    // Logique Onboarding 3 champs
    if (!user?.onboardingMode || !user?.onboardingStartISO || dateISO < user.onboardingStartISO) {
        return { target: standardTarget, mode: 'STANDARD', onboardingFinished: true };
    }

    const onboardingTarget = calculateOnboardingQuota(user.onboardingStartISO, dateISO);

    if (onboardingTarget >= standardTarget) {
        return { target: standardTarget, mode: 'STANDARD', onboardingFinished: true };
    }

    return { 
        target: onboardingTarget, 
        mode: 'ONBOARDING', 
        onboardingFinished: false 
    };
}

/**
 * Retourne un tableau de dates ISO du début à aujourd'hui (Timezone Safe)
 */
export function getDatesInRangeToToday(startISO: string): string[] {
    const dates: string[] = [];
    const current = parseISODate(startISO);
    const today = parseISODate(getTodayISO());

    while (current <= today) {
        dates.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Retourne un tableau de dates ISO du début à hier (Timezone Safe)
 */
export function getDatesInRangeToYesterday(startISO: string): string[] {
    const dates: string[] = [];
    const current = parseISODate(startISO);
    const yesterday = parseISODate(getYesterdayISO());

    while (current <= yesterday) {
        dates.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Vérifie si la date est le dernier jour de son mois
 */
export function isLastDayOfMonth(dateISO: string): boolean {
    const d = parseISODate(dateISO);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    return nextDay.getMonth() !== d.getMonth();
}

/**
 * Montant de l'amende selon le mois de la date
 */
export function getFineAmountForMonth(dateISO: string): number {
    const month = parseISODate(dateISO).getMonth();
    const amounts: Record<number, number> = {
        2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 10,
    };
    return amounts[month] || 0;
}
