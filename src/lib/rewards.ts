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
    } else if (def.type === "LEGENDARY") {
        if (def.key === "unique_pushups_50") xp = 1000;
        else if (def.key === "unique_pushups_80") xp = 2500;
        else if (def.key === "unique_pushups_100") xp = 5000;
        else if (def.key === "legendary_pullups_20") xp = 3000;
        else if (def.key === "legendary_pullups_30") xp = 7500;
        else if (def.key === "legendary_squats_150") xp = 2000;
        else if (def.key === "legendary_squats_300") xp = 8000;
    } else if (def.type === "MILESTONE") {
        if (def.metricType === "MILESTONE_TOTAL" && def.threshold) {
            xp = Math.floor(def.threshold * 0.25);
        } else if (def.metricType === "MILESTONE_SET") {
            xp = 100;
        } else {
            xp = 100;
        }

        // Special survivors & sprinters
        if (def.key === "survivor_15d") xp += 500;
        else if (def.key === "survivor_30d") xp += 1500;
        else if (def.key === "survivor_60d") xp += 3500;
        else if (def.key === "survivor_90d") xp += 5000;
        else if (def.key === "survivor_120d") xp += 10000;
        else if (def.key === "sprinter_1") xp += 100;
        else if (def.key === "sprinter_5") xp += 250;
        else if (def.key === "sprinter_10") xp += 500;
        else if (def.key === "sprinter_30") xp += 1500;
        else if (def.key === "sprinter_50") xp += 3000;
        else if (def.key === "sprinter_100") xp += 7500;
        else if (def.key === "mecene_50") xp = 200;
        else if (def.key === "mecene_100") xp = 400;
        else if (def.key === "early_bird_1" || def.key === "night_owl_1") xp = 100;
        else if (def.key === "early_bird_3" || def.key === "night_owl_3") xp = 150;
        else if (def.key === "early_bird_7" || def.key === "night_owl_7") xp = 300;
        else if (def.key === "early_bird_30" || def.key === "night_owl_30") xp = 500;
    } else if (def.type === "EVENT") {
        if (def.key === "april_fools_1") xp = 1000;
        else if (def.key === "april_fools_2") xp = 700;
        else if (def.key === "april_fools_3") xp = 500;
        else if (def.key === "april_fools_4") xp = 300;
        else if (def.key === "april_fools_5") xp = 150;
        else if (def.key === "april_fools_6") xp = 50;
        else if (def.key === "st_marvin") xp = 1500;
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
