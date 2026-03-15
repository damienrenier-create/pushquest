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
        xp = timeBonus;
        // Boost Trinity streak (difficult to maintain)
        if (def.key === "trinity") xp += 500;
    } else if (def.type === "LEGENDARY") {
        if (def.key === "unique_pushups_50") xp = 1000;
        else if (def.key === "unique_pushups_80") xp = 2500;
        else if (def.key === "unique_pushups_100") xp = 5000;
        else if (def.key.includes("pullups_20")) xp = 3000;
        else if (def.key.includes("pullups_30")) xp = 7500;
        else if (def.key.includes("squats_150")) xp = 2000;
        else if (def.key.includes("squats_300")) xp = 8000;
        else if (def.key === "murph_hero") xp = 2500;
    } else if (def.type === "MILESTONE") {
        if (def.metricType === "MILESTONE_TOTAL" && def.threshold) {
             xp = Math.min(Math.floor(def.threshold * 0.1), 10000); // 10% volume capped at 10k
        } else if (def.metricType === "MILESTONE_SET") {
            xp = 100;
        } else if (def.key.startsWith("headhunter_")) {
            // High boost for headhunters
            if (def.key === "headhunter_1") xp = 500;
            else if (def.key === "headhunter_3") xp = 1500;
            else if (def.key === "headhunter_10") xp = 3500;
            else if (def.key === "headhunter_50") xp = 7500;
            else if (def.key === "headhunter_100") xp = 15000;
        } else if (def.key === "trinity_gold") {
            xp = 2500;
        } else if (def.key === "trinity_ultimate") {
            xp = 7500;
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
        if (def.key === "torch_legacy") xp = 500; 
    } else if (def.type === "EVENT") {
        if (def.key === "april_fools_1") xp = 1000;
        else if (def.key === "st_marvin") xp = 1500;
        else if (def.key.includes("st_kevin") || def.key.includes("st_thomas") || def.key.includes("st_damien") || def.key.includes("st_xavier")) {
            xp = timeBonus + 500;
        } else if (def.key === "sally_participation") xp = 250;
        else if (def.key === "sally_podium_1") xp = 1000;
        else if (def.key.includes("equinox") || def.key.includes("solstice")) xp = 250;
        else xp = timeBonus;
    }

    return xp;
}

export function getRewardInfo(key: string, achievedAt?: Date | string): RewardInfo | null {
    const def = BADGE_DEFINITIONS.find(d => d.key === key);
    if (!def) return null;

    return {
        key: def.key,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        type: def.type,
        xp: getXPForReward(def.key, achievedAt),
        condition: (def as any).condition // If available in definition
    };
}
