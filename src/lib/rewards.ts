import { BADGE_DEFINITIONS } from "@/config/badges";
import { MONTH_MULTIPLIERS } from "./xp-constants";

export interface RewardInfo {
    key: string;
    name: string;
    emoji: string;
    description: string;
    type: string;
    xp: number;
    condition?: string;
}

export function getTorchPalier(streak: number) {
    if (streak >= 30) return { name: "Feu Sacré", emoji: "🔥", description: "Légende éternelle. Plus de 30 flambeaux consécutifs.", xp: 3000 };
    if (streak >= 14) return { name: "Seigneur des Braises", emoji: "🌋", description: "Domine la forge. Plus de 14 flambeaux consécutifs.", xp: 1800 };
    if (streak >= 7) return { name: "Sentinelle de l’Aube", emoji: "🌅", description: "Gardien de la lumière. Plus de 7 flambeaux consécutifs.", xp: 1000 };
    if (streak >= 3) return { name: "Gardien du Flambeau", emoji: "🏮", description: "Protecteur de la flamme. Plus de 3 flambeaux consécutifs.", xp: 500 };
    return { name: "Éclaireur du Flambeau", emoji: "🔦", description: "Le premier à s'élancer. Moins de 3 flambeaux consécutifs.", xp: 300 };
}

export function getXPForReward(key: string, achievedAt?: Date | string): number {
    const def = BADGE_DEFINITIONS.find(d => d.key === key);
    if (!def) return 0;

    let xp = 0;
    const date = achievedAt ? new Date(achievedAt) : new Date();
    const monthIndex = date.getMonth();
    const timeBonus = MONTH_MULTIPLIERS[monthIndex] || 500;

    if (def.key === "level_up" || def.key === "level_down") {
        return 0;
    }

    if (def.type === "COMPETITIVE") {
        const isMonthly = def.key.startsWith("month_");
        const monthStartISO = "2026-05";
        const currentMonthISO = date.toISOString().substring(0, 7);

        if (isMonthly && currentMonthISO >= monthStartISO) {
            // New economy: Volatile core is fixed at 500 XP, surplus is captured monthly
            xp = 500;
        } else {
            xp = timeBonus;
            // Evolutive streaks for Perfect Soldier
            if (def.key === "perfect_soldier") {
                const streak = (achievedAt as any)?.currentStreak || 0; 
                if (streak >= 50) xp = timeBonus * 3;
                else if (streak >= 30) xp = timeBonus * 2;
                else if (streak >= 10) xp = timeBonus * 1.5;
            }
            // Boost Trinity streak
            if (def.key === "trinity") xp += 500;
        }
    } else if (def.type === "LEGENDARY") {
        if (def.key === "unique_pushups_50") xp = 1000;
        else if (def.key === "unique_pushups_80") xp = 2500;
        else if (def.key.includes("100")) xp = 5000;
        else if (def.key.includes("pullups_20")) xp = 3000;
        else if (def.key.includes("pullups_30")) xp = 5000;
        else if (def.key.includes("squats_150")) xp = 2000;
        else if (def.key.includes("squats_300")) xp = 5000;
        else if (def.key.includes("squats_1k_day")) xp = 5000;
        else if (def.key.includes("pushups_1k_week")) xp = 5000;
        else if (def.key.includes("pushups_1k_day")) xp = 5000;
        else if (def.key === "murph_hero") xp = 2500;
    } else if (def.type === "MILESTONE") {
        if (def.metricType === "MILESTONE_TOTAL" && def.threshold) {
             xp = Math.min(Math.floor(def.threshold * 0.1), 10000); // 10% volume capped at 10k
        } else if (def.metricType === "MILESTONE_SET") {
            xp = 100;
        } else if (def.key.startsWith("headhunter_")) {
            // Rebalanced: Lower values
            if (def.key === "headhunter_1") xp = 250;
            else if (def.key === "headhunter_3") xp = 750;
            else if (def.key === "headhunter_10") xp = 1750;
            else if (def.key === "headhunter_50") xp = 4000;
            else if (def.key === "headhunter_100") xp = 8000;
        } else if (def.key === "trinity_gold") {
            xp = 800; // Was 2500
        } else if (def.key === "trinity_ultimate") {
            xp = 2500; // Was 7500
        } else if (def.key.startsWith("early_bird_p") || def.key.startsWith("night_owl_p")) {
            if (def.key.endsWith("p1")) xp = 200;
            else if (def.key.endsWith("p2")) xp = 500;
            else if (def.key.endsWith("p3")) xp = 1200;
        } else if (def.key.includes("_balance_")) {
            if (def.key.endsWith("_bronze")) xp = 200;
            else if (def.key.endsWith("_silver")) xp = 450;
            else if (def.key.endsWith("_gold")) xp = 800;
        } else {
            xp = 100;
        }

        // Special survivors & sprinters
        if (def.key === "survivor_30d") xp += 1000;
        else if (def.key === "survivor_90d") xp += 4000;

        // Tiered habit streaks
        if (def.key.includes("_3") && !def.key.includes("headhunter")) xp += 50;
        else if (def.key.includes("_7")) xp += 150;
        else if (def.key.includes("_14")) xp += 400;
        else if (def.key.includes("_30")) xp += 1000;

        if (def.key.includes("sprinter_5")) xp += 150;
        else if (def.key.includes("sprinter_10") && !def.key.includes("headhunter")) xp += 400;
        else if (def.key.includes("sprinter_30")) xp += 1400;
        else if (def.key.includes("sprinter_50")) xp += 2900;
        else if (def.key.includes("sprinter_100") && !def.key.includes("headhunter")) xp += 7400;

        // Torch Legacy (Base XP, bonus calc is in xp.ts but FAQ uses this for static display)
        if (def.key === "torch_legacy") {
            const streak = (achievedAt as any)?.newValue || (achievedAt as any)?.currentValue || (achievedAt as any)?.currentStreak || 0;
            xp = getTorchPalier(streak).xp;
        }
    } else if (def.type === "EVENT") {
        if (def.key === "april_fools_1") xp = 1000;
        else if (def.key === "st_marvin") xp = 1500;
        else if (def.key.includes("st_kevin") || def.key.includes("st_thomas") || def.key.includes("st_damien") || def.key.includes("st_xavier")) {
            xp = timeBonus + 500;
        } else if (def.key === "sally_participation") xp = 250;
        else if (def.key === "sally_podium_1") xp = 1000;
        else if (def.key === "solstice_summer") xp = 900;
        else if (def.key === "noel_sapin") xp = 500;
        else if (def.key.includes("equinox") || def.key.includes("solstice")) xp = 250;
        else if (def.key.startsWith("workout_") && def.key.endsWith("_std")) xp = 0; // XP is handled via XpAdjustment
        else if (def.key.startsWith("workout_") && def.key.endsWith("_plat")) xp = timeBonus; 
        else xp = timeBonus;
    }

    return xp;
}

export function getRewardInfo(key: string, achievedAt?: Date | string): RewardInfo | null {
    const def = BADGE_DEFINITIONS.find(d => d.key === key);
    if (!def) return null;

    const info: RewardInfo = {
        key: def.key,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        type: def.type,
        xp: getXPForReward(def.key, achievedAt),
        condition: (def as any).condition // If available in definition
    };

    // Dynamic Torch Legacy details
    if (key === "torch_legacy") {
        const streak = (achievedAt as any)?.newValue || (achievedAt as any)?.currentValue || (achievedAt as any)?.currentStreak || 0;
        const palier = getTorchPalier(streak);
        info.name = palier.name;
        info.emoji = palier.emoji;
        info.description = palier.description;
        info.xp = palier.xp;
    }

    // Monthly split clarification
    const isMonthly = key.startsWith("month_");
    const dateObj = (achievedAt instanceof Date) ? achievedAt : (typeof achievedAt === 'string' ? new Date(achievedAt) : new Date());
    if (isMonthly && dateObj.toISOString().substring(0, 7) >= "2026-05") {
        const monthIndex = dateObj.getMonth();
        const fullValue = MONTH_MULTIPLIERS[monthIndex] || 500;
        const capture = Math.max(0, fullValue - 500);
        if (capture > 0) {
            info.description += `\n\n✨ Capture de Gloire : À la clôture du mois, +${capture} XP seront définitivement acquis.`;
        }
    }

    return info;
}
