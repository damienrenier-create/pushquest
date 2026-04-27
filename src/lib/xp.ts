import { getUserSummaries } from "./badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { getRequiredRepsForDate } from "./challenge";
import { getXPForReward } from "./rewards";
import prisma from "./prisma";

export const XP_ANIMALS = [
    { level: 1, name: "Moustique", emoji: "🦟" },
    { level: 2, name: "Fourmi", emoji: "🐜" },
    { level: 3, name: "Abeille", emoji: "🐝" },
    { level: 4, name: "Papillon", emoji: "🦋" },
    { level: 5, name: "Mante religieuse", emoji: "🦗" },
    { level: 6, name: "Scorpion", emoji: "🦂" },
    { level: 7, name: "Mygale", emoji: "🕷️" },
    { level: 8, name: "Escargot", emoji: "🐌" },
    { level: 9, name: "Grenouille dendrobate", emoji: "🐸" },
    { level: 10, name: "Axolotl", emoji: "🦎" },
    { level: 11, name: "Salamandre géante", emoji: "🦎" },
    { level: 12, name: "Hippocampe", emoji: "🧜‍♂️" },
    { level: 13, name: "Poisson-globe", emoji: "🐡" },
    { level: 14, name: "Poisson-lion", emoji: "🐠" },
    { level: 15, name: "Murène", emoji: "🐍" },
    { level: 16, name: "Martin-pêcheur", emoji: "🐦" },
    { level: 17, name: "Chouette effraie", emoji: "🦉" },
    { level: 18, name: "Faucon pèlerin", emoji: "🦅" },
    { level: 19, name: "Corbeau", emoji: "🐦‍⬛" },
    { level: 20, name: "Hibou grand-duc", emoji: "🦉" },
    { level: 21, name: "Aigle royal", emoji: "🦅" },
    { level: 22, name: "Condor des Andes", emoji: "🦅" },
    { level: 23, name: "Fennec", emoji: "🦊" },
    { level: 24, name: "Suricate", emoji: "🦦" },
    { level: 25, name: "Lémurien", emoji: "🐒" },
    { level: 26, name: "Ornithorynque", emoji: "🦆" },
    { level: 27, name: "Panda roux", emoji: "🐼" },
    { level: 28, name: "Paresseux", emoji: "🦥" },
    { level: 29, name: "Koala", emoji: "🐨" },
    { level: 30, name: "Loutre", emoji: "🦦" },
    { level: 31, name: "Blaireau", emoji: "🦡" },
    { level: 32, name: "Glouton", emoji: "🐻" },
    { level: 33, name: "Caracal", emoji: "🐈" },
    { level: 34, name: "Serval", emoji: "🐆" },
    { level: 35, name: "Lynx", emoji: "🐈" },
    { level: 36, name: "Renard", emoji: "🦊" },
    { level: 37, name: "Chacal", emoji: "🐺" },
    { level: 38, name: "Dingo", emoji: "🐕" },
    { level: 39, name: "Loup", emoji: "🐺" },
    { level: 40, name: "Capybara", emoji: "🐹" },
    { level: 41, name: "Sanglier", emoji: "🐗" },
    { level: 42, name: "Cerf", emoji: "🦌" },
    { level: 43, name: "Renne", emoji: "🦌" },
    { level: 44, name: "Wapiti", emoji: "🦌" },
    { level: 45, name: "Kangourou roux", emoji: "🦘" },
    { level: 46, name: "Puma", emoji: "🐆" },
    { level: 47, name: "Guépard", emoji: "🐆" },
    { level: 48, name: "Léopard", emoji: "🐆" },
    { level: 49, name: "Panthère noire", emoji: "🐆" },
    { level: 50, name: "Jaguar", emoji: "🐆" },
    { level: 51, name: "Hyène tachetée", emoji: "🐺" },
    { level: 52, name: "Lion", emoji: "🦁" },
    { level: 53, name: "Tigre", emoji: "🐅" },
    { level: 54, name: "Chimpanzé", emoji: "🐒" },
    { level: 55, name: "Orang-outan", emoji: "🦧" },
    { level: 56, name: "Gorille", emoji: "🦍" },
    { level: 57, name: "Autruche", emoji: "🦅" },
    { level: 58, name: "Pélican", emoji: "🦤" },
    { level: 59, name: "Albatros", emoji: "🕊️" },
    { level: 60, name: "Manchot empereur", emoji: "🐧" },
    { level: 61, name: "Panda géant", emoji: "🐼" },
    { level: 62, name: "Anaconda", emoji: "🐍" },
    { level: 63, name: "Python", emoji: "🐍" },
    { level: 64, name: "Cobra royal", emoji: "🐍" },
    { level: 65, name: "Tortue des Galápagos", emoji: "🐢" },
    { level: 66, name: "Tortue luth", emoji: "🐢" },
    { level: 67, name: "Dragon de Komodo", emoji: "🦎" },
    { level: 68, name: "Alligator", emoji: "🐊" },
    { level: 69, name: "Crocodile du Nil", emoji: "🐊" },
    { level: 70, name: "Requin blanc", emoji: "🦈" },
    { level: 71, name: "Requin-marteau", emoji: "🦈" },
    { level: 72, name: "Raie manta", emoji: "🪸" },
    { level: 73, name: "Poisson-lune", emoji: "🐟" },
    { level: 74, name: "Otarie", emoji: "🦭" },
    { level: 75, name: "Phoque", emoji: "🦭" },
    { level: 76, name: "Dauphin", emoji: "🐬" },
    { level: 77, name: "Béluga", emoji: "🐳" },
    { level: 78, name: "Narval", emoji: "🐋" },
    { level: 79, name: "Orque", emoji: "🐋" },
    { level: 80, name: "Requin-baleine", emoji: "🦈" },
    { level: 81, name: "Rhinocéros", emoji: "🦏" },
    { level: 82, name: "Hippopotame", emoji: "🦛" },
    { level: 83, name: "Girafe", emoji: "🦒" },
    { level: 84, name: "Bison", emoji: "🦬" },
    { level: 85, name: "Yak", emoji: "🐂" },
    { level: 86, name: "Éléphant d’Afrique", emoji: "🐘" },
    { level: 87, name: "Cachalot", emoji: "🐳" },
    { level: 88, name: "Baleine bleue", emoji: "🐋" },
    { level: 89, name: "Calmar géant", emoji: "🦑" },
    { level: 90, name: "Pieuvre géante", emoji: "🐙" },
    { level: 91, name: "Licorne", emoji: "🦄" },
    { level: 92, name: "Pégase", emoji: "🐎" },
    { level: 93, name: "Griffon", emoji: "🦅" },
    { level: 94, name: "Sphinx", emoji: "🦁" },
    { level: 95, name: "Phénix", emoji: "🐦🔥" },
    { level: 96, name: "Basilic", emoji: "🦎" },
    { level: 97, name: "Hydre", emoji: "🐉" },
    { level: 98, name: "Dragon", emoji: "🐉" },
    { level: 99, name: "Kraken", emoji: "🦑" },
    { level: 100, name: "Léviathan", emoji: "🐋" }
];

// Returns the details for a given level
export function getLevelDetails(level: number) {
    const safeLevel = Math.max(1, Math.min(100, level));
    const animal = XP_ANIMALS[safeLevel - 1];

    let belt = "Ceinture Blanche ⚪";
    if (level >= 90) belt = "Légende Vivante 👑";
    else if (level >= 80) belt = "Maître Suprême 🔴";
    else if (level >= 70) belt = "Ceinture Noire 2e Dan ⚫⭐";
    else if (level >= 60) belt = "Ceinture Noire 1er Dan ⚫";
    else if (level >= 50) belt = "Ceinture Marron 🟤";
    else if (level >= 40) belt = "Ceinture Bleue 🔵";
    else if (level >= 30) belt = "Ceinture Verte 🟢";
    else if (level >= 20) belt = "Ceinture Orange 🟠";
    else if (level >= 10) belt = "Ceinture Jaune 🟡";

    return { ...animal, belt };
}

// XP Progression formula: 250 * (Lvl-1) + 50 * (Lvl-1)^2
export function getXPForLevel(level: number) {
    return 250 * (level - 1) + 50 * Math.pow(level - 1, 2);
}

export function calculateLevel(xp: number) {
    let lvl = 1;
    while (lvl < 100 && getXPForLevel(lvl + 1) <= xp) {
        lvl++;
    }
    return lvl;
}

import { MONTH_MULTIPLIERS } from "./xp-constants";
export { MONTH_MULTIPLIERS };

export async function calculateAllUsersXP(users: any[], badgesOwnerships: any[], precomputedSummaries?: any[], events: any[] = []) {
    // 0. Fetch Featured Badge from GlobalConfig
    const featuredConfig = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
    const featuredBadgeKey = featuredConfig?.value;

    const summaries = precomputedSummaries ?? getUserSummaries(users, events);

    // 1. Gather Global Records from summaries
    let maxVolDay = 0, maxVolDayUser: string | null = null;
    let maxVolMonth = 0, maxVolMonthUser: string | null = null;
    let maxVolYear = 0, maxVolYearUser: string | null = null;

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayISO = now.toISOString().split("T")[0];

    summaries.forEach(s => {
        const volDay = s.getDayTotal(todayISO);
        const volMonth = s.getMonthTotal(currentMonthPrefix);
        const volYear = s.totalAll;

        if (volDay > maxVolDay) { maxVolDay = volDay; maxVolDayUser = s.id; }
        if (volMonth > maxVolMonth) { maxVolMonth = volMonth; maxVolMonthUser = s.id; }
        if (volYear > maxVolYear) { maxVolYear = volYear; maxVolYearUser = s.id; }
    });

    // 2. Compute specific XP for each user
    const xpUserMap = new Map();

    users.forEach(u => {
        const summary = summaries.find(s => s.id === u.id);
        if (!summary) return;

        let totalXP = 0;
        let regularityXP = 0;
        const sets = u.sets || [];

        const marvinBonusDate = "2026-03-08";
        const isMarvinDay = todayISO === marvinBonusDate;

        let pushupsXPContribution = summary.totalPushups * (isMarvinDay ? 2 : 1);
        let pullupsXPContribution = summary.totalPullups * (isMarvinDay ? 6 : 3);
        let squatsXPContribution = summary.totalSquats * (isMarvinDay ? 2 : 1);
        totalXP += pushupsXPContribution + pullupsXPContribution + squatsXPContribution;

        // B. Régularité et Flex par Jour
        const daysWithActivity = Array.from(new Set(sets.map((s: any) => s.date))).sort() as string[];
        daysWithActivity.forEach(d => {
            const dayTotal = summary.getDayTotal(d);
            const req = getRequiredRepsForDate(d);

            if (req > 0 && dayTotal >= req) {
                let dayXP = 0;
                if (dayTotal === req) {
                    dayXP = 200; // Jour parfait
                } else {
                    dayXP = 100; // Jour validé
                    const surplus = dayTotal - req;
                    const step10Percent = Math.max(1, Math.floor(req * 0.1));
                    let flexXP = 0;
                    for (let i = 0; i < surplus; i++) {
                        const tier = Math.floor(i / step10Percent);
                        flexXP += (tier + 1);
                    }
                    dayXP += Math.min(flexXP, 1000); // Flex XP capped at 1000 per day
                }

                // Birthday Triple XP Logic
                const userNickname = (u.nickname || "").toLowerCase();
                const isMilkaBday = d.endsWith("-11-17") && (userNickname.includes("milka") || userNickname.includes("milkardashian"));
                const isMoolsBday = d.endsWith("-09-26") && (userNickname === "mools" || userNickname === "commissaire");

                if (isMilkaBday || isMoolsBday) {
                    // Check if they were #1 that day
                    const isWinner = summaries.every(s => s.id === u.id || s.getDayTotal(d) < dayTotal);
                    if (isWinner) dayXP *= 3;
                }

                regularityXP += dayXP;
                totalXP += dayXP;

                // Specific Event XP
                if (d === marvinBonusDate) {
                    regularityXP += 500;
                    totalXP += 500;
                }

                // --- Chronological/Surgical Event Logic ---
                if (d === "2026-03-20" || d === "2026-09-22") { // Equinoxes
                    const p = summary.getDaySum(d, "PUSHUP");
                    const s = summary.getDaySum(d, "SQUAT");
                    if (p > 0 && p === s) {
                        regularityXP += 250;
                        totalXP += 250;
                    }
                }
                if (d === "2026-04-05") { // Pâques
                    const dayReps = summary.getScaleReps(d);
                    if (dayReps.includes(10) && dayReps.includes(20) && dayReps.includes(30)) {
                        regularityXP += 750;
                        totalXP += 750;
                    }
                }
                if (d === "2026-06-21" && dayTotal >= 900) {
                    regularityXP += 900;
                    totalXP += 900;
                } // Solstice Eté
                if (d === "2026-12-06" && dayTotal % 10 === 6) {
                    regularityXP += 500;
                    totalXP += 500;
                } // St Nicolas
                if (d === "2026-12-21") { // Solstice Hiver
                    const hoursWithReps = new Set(sets.filter((s: any) => s.date === d).map((s: any) => new Date(s.createdAt).getHours()));
                    if (hoursWithReps.size >= 12) {
                        regularityXP += 500;
                        totalXP += 500;
                    }
                }
                if (d === "2026-12-25") { // Noël
                    const scalePushups = (summary as any).getScaleRepsByExo(d, "PUSHUP");
                    const scalePullups = (summary as any).getScaleRepsByExo(d, "PULLUP");
                    const scaleSquats = (summary as any).getScaleRepsByExo(d, "SQUAT");
                    const target = Array.from({ length: 15 }, (_, i) => i + 1);
                    const hasScale = target.every(n => scalePushups.includes(n)) &&
                        target.every(n => scalePullups.includes(n)) &&
                        target.every(n => scaleSquats.includes(n));
                    if (hasScale) {
                        regularityXP += 500;
                        totalXP += 500;
                    }
                }
            }
        });

        // C. Badges (Gloire)
        let badgeXPContribution = 0;
        const userBadges = badgesOwnerships.filter(b => b.currentUserId === u.id);
        const processedBadges = userBadges.map(b => {
            const streak = summary.perfectTargetStreak || 0;
            let displayBadge = { ...b };

            // Perfect Soldier Tier Names, Emojis, and Descriptions
            if (b.badgeKey === "perfect_soldier") {
                if (streak >= 50) {
                    displayBadge.name = "Hitler himself";
                    displayBadge.emoji = "☠️";
                    displayBadge.description = "L'incarnation de la précision macabre. Plus de 50 jours parfaits.";
                } else if (streak >= 30) {
                    displayBadge.name = "Der Kanzler";
                    displayBadge.emoji = "🦅";
                    displayBadge.description = "Main de fer sur l'objectif. Plus de 30 jours parfaits.";
                } else if (streak >= 10) {
                    displayBadge.name = "Le parfait SS";
                    displayBadge.emoji = "⚡";
                    displayBadge.description = "Discipline militaire allemande. Plus de 10 jours parfaits.";
                } else {
                    displayBadge.name = "Le bon petit nazi";
                    // keep default emoji and description for < 10
                }
            }

            const badgeXP = getXPForReward(b.badgeKey, { ...b, currentStreak: streak } as any);

            // Featured badge bonus
            let finalBadgeXP = badgeXP;
            if (featuredBadgeKey === b.badgeKey) {
                finalBadgeXP += Math.floor(badgeXP * 0.5);
            }

            badgeXPContribution += finalBadgeXP;
            totalXP += finalBadgeXP;

            return { ...displayBadge, xp: finalBadgeXP };
        });

        // D. Fines
        totalXP += (summary.totalFinesAmount * 50);

        // E. Records Temporels Volatiles
        if (u.id === maxVolDayUser) totalXP += 250;
        if (u.id === maxVolMonthUser) totalXP += 1000;
        if (u.id === maxVolYearUser) totalXP += 2500;

        // F. Ajustements Manuels
        const manualXP = (u.xpAdjustments || []).reduce((acc: number, adj: any) => acc + adj.amount, 0);
        totalXP += manualXP;

        // Le Flambeau (+100 XP par flambeau remporté - Cumulatif)
        const flambeauXP = (summary.sprinterCount || 0) * 100;
        totalXP += flambeauXP;

        // G. Final Level Calc
        const level = calculateLevel(totalXP);
        const details = getLevelDetails(level);
        const nextDetails = getLevelDetails(level + 1);
        const xpCurrentLvl = getXPForLevel(level);
        const xpNextLvl = getXPForLevel(level + 1);
        const progress = Math.min(100, Math.max(0, ((totalXP - xpCurrentLvl) / (xpNextLvl - xpCurrentLvl)) * 100));

        xpUserMap.set(u.id, {
            id: u.id,
            nickname: u.nickname,
            totalXP,
            level,
            animal: details.name,
            emoji: details.emoji,
            belt: details.belt,
            nextAnimal: nextDetails.name,
            nextEmoji: nextDetails.emoji,
            xpCurrentLvl,
            xpNextLvl,
            progress: Math.floor(progress),
            details: {
                repsXP: pushupsXPContribution + pullupsXPContribution + squatsXPContribution,
                regularityXP,
                badgesXP: badgeXPContribution,
                finesXP: (summary.totalFinesAmount * 50),
                recordsXP: (u.id === maxVolDayUser ? 250 : 0) + (u.id === maxVolMonthUser ? 1000 : 0) + (u.id === maxVolYearUser ? 2500 : 0),
                flambeauXP,
                manualXP
            }
        });
    });

    return Array.from(xpUserMap.values()).sort((a, b) => b.totalXP - a.totalXP);
}
