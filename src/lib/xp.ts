import { getUserSummaries } from "./badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { getRequiredRepsForDate } from "./challenge";

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

export function calculateAllUsersXP(users: any[], badgesOwnerships: any[]) {
    const summaries = getUserSummaries(users, []);

    // 1. Gather Global Records
    let maxVolDay = 0, maxVolDayUser: string | null = null;
    let maxVolMonth = 0, maxVolMonthUser: string | null = null;
    let maxVolYear = 0, maxVolYearUser: string | null = null;

    const maxSumDay = 0; // The actual sum of day

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearPrefix = `${now.getFullYear()}`;
    const todayStr = now.toISOString().split("T")[0];

    // Compute Volumetrics first to find Record Holders
    const volStats = users.map(u => {
        const sets = u.sets || [];
        const volDay = sets.filter((s: any) => s.date === todayStr).reduce((a: any, b: any) => a + b.reps, 0);
        const volMonth = sets.filter((s: any) => s.date.startsWith(currentMonthPrefix)).reduce((a: any, b: any) => a + b.reps, 0);
        const volYear = sets.filter((s: any) => s.date.startsWith(currentYearPrefix)).reduce((a: any, b: any) => a + b.reps, 0);

        if (volDay > maxVolDay) { maxVolDay = volDay; maxVolDayUser = u.id; }
        if (volMonth > maxVolMonth) { maxVolMonth = volMonth; maxVolMonthUser = u.id; }
        if (volYear > maxVolYear) { maxVolYear = volYear; maxVolYearUser = u.id; }

        return { id: u.id, volDay, volMonth, volYear };
    });

    // 2. Compute specific XP for each user
    const xpUserMap = new Map();

    users.forEach(u => {
        let totalXP = 0;
        const sets = u.sets || [];
        const summary = summaries.find(s => s.id === u.id);
        const pushups = sets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
        const pullups = sets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
        const squats = sets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
        const planks = sets.filter((s: any) => s.exercise === "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0);

        const league = u.league || "POMPES";
        const marvinBonusDate = "2026-03-08";
        const isMarvinDay = todayStr === marvinBonusDate;

        let pushupsXPContribution = 0;
        let pullupsXPContribution = 0;
        let squatsXPContribution = 0;
        let planksXPContribution = 0;

        if (league === "GAINAGE") {
            planksXPContribution = planks * (isMarvinDay ? 2 : 1);
            totalXP += planksXPContribution;
        } else {
            pushupsXPContribution = pushups * (isMarvinDay ? 2 : 1);
            pullupsXPContribution = pullups * (isMarvinDay ? 6 : 3);
            squatsXPContribution = squats * (isMarvinDay ? 2 : 1);
            totalXP += pushupsXPContribution + pullupsXPContribution + squatsXPContribution;
        }

        // B. Régularité et Flex par Jour
        const days = Array.from(new Set(sets.map((s: any) => s.date))).sort() as string[];
        days.forEach(d => {
            const daySets = sets.filter((s: any) => s.date === d);
            const total = daySets.reduce((sum: number, s: any) => sum + s.reps, 0);
            const req = getRequiredRepsForDate(d);

            if (req > 0 && total >= req) {
                if (total === req) {
                    totalXP += 200; // Jour parfait
                } else {
                    totalXP += 100; // Jour validé

                    // Calcul du Surplus Flex
                    const surplus = total - req;
                    const step10Percent = Math.max(1, Math.floor(req * 0.1));

                    let flexXP = 0;
                    for (let i = 0; i < surplus; i++) {
                        const tier = Math.floor(i / step10Percent);
                        flexXP += (tier + 1); // 1 XP pour les 10 premiers %, 2 XP pour les suivants...
                    }
                    totalXP += flexXP;
                }

                // Saint Marvin Validation Bonus
                if (d === marvinBonusDate) {
                    totalXP += 500;
                }
            }
        });

        // C. Badges (Gloire)
        const userBadges = badgesOwnerships.filter(b => b.currentUserId === u.id);
        userBadges.forEach(b => {
            const def = BADGE_DEFINITIONS.find(d => d.key === b.badgeKey);
            if (def) {
                const monthIndex = b.achievedAt ? new Date(b.achievedAt).getMonth() : new Date().getMonth();
                const timeBonus = MONTH_MULTIPLIERS[monthIndex] || 500;

                if (def.type === "COMPETITIVE") {
                    totalXP += timeBonus; // Value increases later in the year
                } else if (def.type === "LEGENDARY") {
                    if (def.key === "unique_pushups_50") totalXP += 1000;
                    if (def.key === "unique_pushups_80") totalXP += 2500;
                    if (def.key === "unique_pushups_100") totalXP += 5000;
                    if (def.key === "legendary_pullups_20") totalXP += 3000;
                    if (def.key === "legendary_pullups_30") totalXP += 7500;
                    if (def.key === "legendary_squats_150") totalXP += 2000;
                    if (def.key === "legendary_squats_300") totalXP += 8000;
                } else if (def.type === "MILESTONE") {
                    // Weight them depending on the distance
                    // We just give +250 base, + progressively more depending on the milestone tier
                    if (def.metricType === "MILESTONE_TOTAL" && def.threshold) {
                        // NOUVEAU SYSTÈME EXPONENTIEL ET COHÉRENT : 25% du montant du seuil. 
                        // Ex: 1k -> 250 XP | 5k -> 1 250 XP | 10k -> 2 500 XP | 100k -> 25 000 XP
                        totalXP += Math.floor(def.threshold * 0.25);
                    } else if (def.metricType === "MILESTONE_SET") {
                        // Le Centurion
                        totalXP += 100;
                    } else {
                        // time_award, survivor, etc form their base
                        totalXP += 100;
                    }

                    if (def.key === "survivor_15d") totalXP += 500;
                    if (def.key === "survivor_30d") totalXP += 1500;
                    if (def.key === "survivor_60d") totalXP += 3500;
                    if (def.key === "survivor_90d") totalXP += 5000;
                    if (def.key === "survivor_120d") totalXP += 10000;

                    // Sprinter
                    if (def.key === "sprinter_1") totalXP += 100;
                    if (def.key === "sprinter_5") totalXP += 250;
                    if (def.key === "sprinter_10") totalXP += 500;
                    if (def.key === "sprinter_30") totalXP += 1500;
                    if (def.key === "sprinter_50") totalXP += 3000;
                    if (def.key === "sprinter_100") totalXP += 7500;
                } else if (def.type === "EVENT") {
                    totalXP += timeBonus; // + events give current month value
                }
            }
        });

        // D. Fines
        const finesAmount = summary ? summary.totalFinesAmount : 0;
        totalXP += (finesAmount * 50); // +50 XP per Euro paid

        // E. Records Temporels Volatiles (Giga-Chads)
        if (u.id === maxVolDayUser) totalXP += 250;
        if (u.id === maxVolMonthUser) totalXP += 1000;
        if (u.id === maxVolYearUser) totalXP += 2500;

        // F. Ajustements Manuels (Moderateur)
        const manualXP = (u.xpAdjustments || []).reduce((acc: number, adj: any) => acc + adj.amount, 0);
        totalXP += manualXP;

        // G. Final Level Calc
        const level = calculateLevel(totalXP);
        const details = getLevelDetails(level);
        const nextDetails = getLevelDetails(level + 1);
        const xpCurrentLvl = getXPForLevel(level);
        const xpNextLvl = getXPForLevel(level + 1);
        const progress = Math.min(100, Math.max(0, ((totalXP - xpCurrentLvl) / (xpNextLvl - xpCurrentLvl)) * 100));

        // Details Breakdown for Gazette
        const repsXP = pushupsXPContribution + pullupsXPContribution + squatsXPContribution + planksXPContribution;
        const finesXP = (finesAmount * 50);

        // Calculate Badge XP separately to match the logic above
        let badgesXP = 0;
        userBadges.forEach(b => {
            const def = BADGE_DEFINITIONS.find(d => d.key === b.badgeKey);
            if (def) {
                const monthIndex = b.achievedAt ? new Date(b.achievedAt).getMonth() : new Date().getMonth();
                const timeBonus = MONTH_MULTIPLIERS[monthIndex] || 500;
                if (def.type === "COMPETITIVE") badgesXP += timeBonus;
                else if (def.type === "LEGENDARY") {
                    if (def.key === "unique_pushups_50") badgesXP += 1000;
                    if (def.key === "unique_pushups_80") badgesXP += 2500;
                    if (def.key === "unique_pushups_100") badgesXP += 5000;
                    if (def.key === "legendary_pullups_20") badgesXP += 3000;
                    if (def.key === "legendary_pullups_30") badgesXP += 7500;
                    if (def.key === "legendary_squats_150") badgesXP += 2000;
                    if (def.key === "legendary_squats_300") badgesXP += 8000;
                } else if (def.type === "MILESTONE") {
                    if (def.metricType === "MILESTONE_TOTAL" && def.threshold) badgesXP += Math.floor(def.threshold * 0.25);
                    else badgesXP += 100;
                    if (["survivor_15d", "survivor_30d", "survivor_60d", "survivor_90d", "survivor_120d", "sprinter_1", "sprinter_5", "sprinter_10", "sprinter_30", "sprinter_50", "sprinter_100"].includes(def.key)) {
                        // Add extra if matching certain keys
                        if (def.key === "survivor_15d") badgesXP += 500;
                        if (def.key === "survivor_30d") badgesXP += 1500;
                        if (def.key === "survivor_60d") badgesXP += 3500;
                        if (def.key === "survivor_90d") badgesXP += 5000;
                        if (def.key === "survivor_120d") badgesXP += 10000;
                        if (def.key === "sprinter_1") badgesXP += 100;
                        if (def.key === "sprinter_5") badgesXP += 250;
                        if (def.key === "sprinter_10") badgesXP += 500;
                        if (def.key === "sprinter_30") badgesXP += 1500;
                        if (def.key === "sprinter_50") badgesXP += 3000;
                        if (def.key === "sprinter_100") badgesXP += 7500;
                    }
                } else if (def.type === "EVENT") badgesXP += timeBonus;
            }
        });

        const recordsXP = (u.id === maxVolDayUser ? 250 : 0) + (u.id === maxVolMonthUser ? 1000 : 0) + (u.id === maxVolYearUser ? 2500 : 0);
        const flexXP = totalXP - repsXP - finesXP - badgesXP - recordsXP; // Residual is Flex/Regularity

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
                repsXP,
                finesXP,
                badgesXP,
                recordsXP,
                flexXP: Math.max(0, flexXP),
                manualXP
            }
        });
    });

    return Array.from(xpUserMap.values()).sort((a, b) => b.totalXP - a.totalXP);
}
