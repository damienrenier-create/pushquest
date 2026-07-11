// src/lib/gamebook/yellow/frontier/run.ts
//
// ZONE DE COMBAT — réducteur de RUN (série) PUR & déterministe.
// Modélise une série à la Tour (et base de l'Usine) : enchaînement de vagues, victoire →
// JC + remboursement d'énergie + adversaire suivant ; défaite → fin de série (record).
// Aucune dépendance save/UI/battleStore : un état + des événements → nouvel état (testable).
// (Le Dôme = bracket, modélisé séparément ; il réutilisera la génération du moteur.)

import { Rng } from "../battle/rng"
import {
    type FrontierMode, type LevelRule, type OpponentSpec,
    resolveFrontierLevel, generateFrontierTeam, generateBossWave, isBossWave,
    jcRewardForWin, frontierEnergyRefund, DEFAULT_TEAM_SIZE,
} from "./engine"

export interface FrontierRunState {
    mode: FrontierMode
    levelRule: LevelRule
    level: number            // niveau de combat résolu (50 / 100 / adaptatif)
    seed: number             // graine de la série → reproductible
    teamSize: number
    streak: number           // victoires accumulées
    jc: number               // Jetons de Combat gagnés dans CETTE série
    energyRefunded: number   // énergie totale remboursée dans cette série
    status: "active" | "ended"
    opponent: OpponentSpec[]  // équipe adverse de la vague COURANTE
    isBoss: boolean           // la vague courante est-elle un boss (Cerveau) ?
    bossName?: string         // nom du Cerveau thématique (si la vague courante en est un), pour l'annonce UI
    lastReward: number        // JC du dernier combat gagné (feedback UI)
    lastRefund: number        // énergie remboursée au dernier combat (feedback UI)
    allowRun2?: boolean       // le joueur a fait le run 2 → exclusivités run 2 affrontables (hautes sphères)
    allowRun3?: boolean       // le joueur a fait le run 3 → exclusivités run 3 affrontables (hautes sphères)
}

/** Numéro de la vague courante (1-indexé) = victoires + 1. */
export function currentWaveNumber(s: FrontierRunState): number {
    return s.streak + 1
}

/** RNG déterministe propre à une vague (combine graine de run + n° de vague). */
function waveRng(seed: number, waveNumber: number): Rng {
    return new Rng(((seed >>> 0) ^ (waveNumber * 2654435761)) >>> 0)
}

/** Construit l'équipe adverse d'une vague donnée (boss tous les 7 ; Cerveau thématique possible). */
function buildWave(seed: number, waveNumber: number, level: number, size: number, allowRun2 = false, allowRun3 = false): { opponent: OpponentSpec[]; isBoss: boolean; bossName?: string } {
    const rng = waveRng(seed, waveNumber)
    if (isBossWave(waveNumber)) {
        const bw = generateBossWave(rng, waveNumber, level, size, allowRun2, allowRun3)
        return { opponent: bw.opponent, isBoss: true, bossName: bw.bossName }
    }
    return { opponent: generateFrontierTeam(rng, { streak: waveNumber, level, size, allowRun2, allowRun3 }), isBoss: false }
}

export interface StartRunOpts {
    mode: FrontierMode
    levelRule: LevelRule
    playerTopLevel: number   // pour le mode ADAPT
    seed: number
    teamSize?: number
    allowRun2?: boolean      // exclusivités run 2 affrontables (le joueur a fait le run 2) — cf. runStore
    allowRun3?: boolean      // exclusivités run 3 affrontables (le joueur a fait le run 3) — cf. runStore
}

/** Démarre une série : résout le niveau, prépare la 1re vague. */
export function startFrontierRun(opts: StartRunOpts): FrontierRunState {
    const level = resolveFrontierLevel(opts.levelRule, opts.playerTopLevel)
    const teamSize = opts.teamSize ?? DEFAULT_TEAM_SIZE
    const { opponent, isBoss, bossName } = buildWave(opts.seed, 1, level, teamSize, opts.allowRun2, opts.allowRun3)
    return {
        mode: opts.mode, levelRule: opts.levelRule, level, seed: opts.seed, teamSize,
        streak: 0, jc: 0, energyRefunded: 0, status: "active",
        opponent, isBoss, bossName, lastReward: 0, lastRefund: 0,
        allowRun2: opts.allowRun2, allowRun3: opts.allowRun3,
    }
}

/** Victoire d'une vague : crédite JC + remboursement d'énergie, avance d'une vague.
 *  `energySpent` = énergie réellement dépensée par le joueur dans ce combat. */
export function applyFrontierWin(s: FrontierRunState, energySpent: number): FrontierRunState {
    if (s.status !== "active") return s
    const winNumber = currentWaveNumber(s)
    const reward = jcRewardForWin(s.levelRule, winNumber)
    const refund = frontierEnergyRefund(energySpent)
    const nextWave = winNumber + 1
    const { opponent, isBoss, bossName } = buildWave(s.seed, nextWave, s.level, s.teamSize, s.allowRun2, s.allowRun3)
    return {
        ...s,
        streak: winNumber,
        jc: s.jc + reward,
        energyRefunded: s.energyRefunded + refund,
        opponent, isBoss, bossName,
        lastReward: reward, lastRefund: refund,
    }
}

/** Défaite : la série s'arrête (le record = `streak`). Aucun remboursement. */
export function applyFrontierLoss(s: FrontierRunState): FrontierRunState {
    if (s.status !== "active") return s
    return { ...s, status: "ended", lastReward: 0, lastRefund: 0 }
}

/** Abandon volontaire (forfait) : termine la série en conservant les JC déjà gagnés. */
export function quitFrontierRun(s: FrontierRunState): FrontierRunState {
    if (s.status !== "active") return s
    return { ...s, status: "ended" }
}
