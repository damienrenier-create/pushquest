export const CHALLENGE_START_DATE = "2026-01-01";
export const FINE_START_DATE = "2026-03-11";

/**
 * Returns today's date in YYYY-MM-DD format (local time)
 */
export function getTodayISO(): string {
    // Force French timezone (Europe/Paris) for the game logic
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    return formatDateISO(d);
}

/**
 * Returns yesterday's date in YYYY-MM-DD format (local time)
 */
export function getYesterdayISO(): string {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    d.setDate(d.getDate() - 1);
    return formatDateISO(d);
}

/**
 * Returns the day of the year (1-366)
 * Correctly handles leap years.
 */
export function getDayOfYear(dateISO: string): number {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Returns an array of allowed dates for encoding (Today, Yesterday, J-2, J-3)
 */
export function getAllowedEncodingDates(): string[] {
    const dates = [];
    for (let i = 0; i < 4; i++) {
        const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        d.setDate(d.getDate() - i);
        dates.push(formatDateISO(d));
    }
    return dates;
}

/**
 * Returns the number of required reps for a given date
 * Always based on the day of the year.
 */
export function getRequiredRepsForDate(dateISO: string): number {
    return getDayOfYear(dateISO);
}

/**
 * Returns the onboarding quota based on the start date and target date
 * Rule: Day 1 = 30, then +3/day, except Sunday (+2)
 */
export function calculateOnboardingQuota(startDateISO: string, targetDateISO: string): number {
    const start = new Date(startDateISO);
    const target = new Date(targetDateISO);
    
    // Si la date cible est avant le début, on renvoie le quota initial
    if (target < start) return 30;

    // Reset hours to compare dates only
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let quota = 30;
    for (let i = 0; i < diffDays; i++) {
        const current = new Date(start);
        current.setDate(current.getDate() + i + 1);
        const dayOfWeek = current.getDay(); // 0 = Sunday
        quota += (dayOfWeek === 0 ? 2 : 3);
    }
    return quota;
}

/**
 * Main source of truth for user daily target.
 * Combines standard logic and onboarding logic.
 */
export function getDailyTargetForUserOnDate(user: any, dateISO: string): number {
    const standardTarget = getRequiredRepsForDate(dateISO);
    
    if (!user || !user.onboardingStartedAt) {
        return standardTarget;
    }

    // Normaliser la date de début en YYYY-MM-DD
    const startISO = typeof user.onboardingStartedAt === 'string' 
        ? user.onboardingStartedAt.split('T')[0]
        : formatDateISO(new Date(user.onboardingStartedAt));

    const onboardingTarget = calculateOnboardingQuota(startISO, dateISO);
    
    // On prend le minimum pour "rejoindre" le standard sans le dépasser
    return Math.min(onboardingTarget, standardTarget);
}

/**
 * Returns the fine amount based on the month of the date
 */
export function getFineAmountForMonth(dateISO: string): number {
    const month = new Date(dateISO).getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar...

    const amounts: Record<number, number> = {
        2: 2,  // March
        3: 3,  // April
        4: 4,  // May
        5: 5,  // June
        6: 6,  // July
        7: 7,  // August
        8: 8,  // September
        9: 9,  // October
        10: 10, // November
        11: 10, // December
    };

    return amounts[month] || 0;
}

/**
 * Returns an array of ISO dates from a start ISO date to today
 */
export function getDatesInRangeToToday(startISO: string): string[] {
    const dates: string[] = [];
    const start = new Date(startISO);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const current = new Date(start);
    while (current <= today) {
        dates.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Returns an array of ISO dates from a start ISO date to yesterday
 */
export function getDatesInRangeToYesterday(startISO: string): string[] {
    const dates: string[] = [];
    const start = new Date(startISO);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    start.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    const current = new Date(start);
    while (current <= yesterday) {
        dates.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Returns true if the given date is the last day of its month
 */
export function isLastDayOfMonth(dateISO: string): boolean {
    const d = new Date(dateISO);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    return nextDay.getMonth() !== d.getMonth();
}

/**
 * Normalizes a date to ISO string YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

