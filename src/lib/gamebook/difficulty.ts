// src/lib/gamebook/difficulty.ts
//
// v3.23e — Module re-exporté depuis ratio.ts (centralisation de la doctrine).
// Les anciens imports `from "@/lib/gamebook/difficulty"` continuent de marcher
// pour rétrocompat. La logique vit désormais dans ratio.ts.

export {
    getUserDifficultyRatio,
    applyRatio,
    applyRatioToReward,
    applyRatioToCost,
    applyRatioToThreshold,
    keepFixedXp,
    keepFixedEc,
    keepFixedMultiplier,
    keepFixedMalus,
    keepFixedCasinoStake,
} from "@/lib/gamebook/ratio"
