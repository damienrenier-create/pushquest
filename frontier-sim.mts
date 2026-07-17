// frontier-sim.mts — SIMULATEUR ANALYTIQUE de la Zone de Combat (Tour).
//
// But : mesurer, AVANT de toucher à l'équilibrage, où la difficulté décroche.
// Méthode : on rejoue des centaines de RUNS Tour avec le VRAI moteur de combat (déterministe) :
//   - vagues consécutives, l'équipe joueur garde ses PV/statut/PP entre les vagues,
//   - soin complet aux vagues de boss (streak % 7 == 0), comme le vrai jeu,
//   - IA SYMÉTRIQUE (même niveau d'IA des deux côtés) → le taux de victoire reflète le MATCHUP, pas le skill,
//   - règle de niveau ADAPT (adversaires au niveau du joueur), tailles d'équipe réelles (joueur N vs vague 3).
// Sorties : courbe de survie par streak, win% conditionnel par vague, énergie/combat, % remboursé, BST adverse.
//
//   npx tsx frontier-sim.mts
import { createBattle, resolveTurn, type BattleState } from "./src/lib/gamebook/yellow/battle/engine"
import { chooseAiAction, type AiLevel } from "./src/lib/gamebook/yellow/battle/ai"
import { Rng } from "./src/lib/gamebook/yellow/battle/rng"
import { createMonInstance } from "./src/lib/gamebook/yellow/battle/factory"
import { fullStats } from "./src/lib/gamebook/yellow/battle/stats"
import { getSpecies } from "./src/lib/gamebook/yellow/data/species"
import { getMove } from "./src/lib/gamebook/yellow/data/moves"
import type { MonInstance } from "./src/lib/gamebook/yellow/battle/types"
import {
    generateFrontierTeam, generateBossWave, isBossWave, resolveFrontierLevel, bstOf, bstBandForStreak,
    frontierRefundPct, frontierEnergyRefund, BOSS_EVERY, DEFAULT_TEAM_SIZE, type LevelRule,
} from "./src/lib/gamebook/yellow/frontier/engine"
import { attackCost, QUOTA_STD } from "./src/lib/gamebook/yellow/data/combatCostConfig"
import { battleEnergyCap } from "./src/lib/gamebook/yellow/data/badges"

const MAX_WAVES = 42      // couvre les paliers de BST (>27 = tier max)
const N_RUNS = 200        // runs par scénario
const MAX_TURNS = 400     // garde-fou anti-stall par combat
// FIDÉLITÉ : le vrai jeu pilote l'ENNEMI en "trainer" (cf. startTrainerBattle frontier). Le joueur est un
// humain compétent → on l'approxime par "ace" (plancher de skill ; un humain réfléchi fera au moins aussi bien).
const PLAYER_AI: AiLevel = "ace"
const ENEMY_AI: AiLevel = "trainer"
const PLAYER_BADGES = 5   // post-Ligue → cap d'énergie max

// ── Équipe joueur : on reconstruit des instances FRAÎCHES (PV pleins) à chaque run ──
function buildTeam(specs: { id: string; level: number }[], heldItem?: string): MonInstance[] {
    return specs.map((s) => {
        const m = createMonInstance(s.id, s.level, { owned: true })
        if (heldItem) m.heldItem = heldItem // objet tenu (ex. Restes : +1/16 PV/tour) — testé contre l'attrition
        return m
    })
}
function healTeam(team: MonInstance[]): void {
    for (const m of team) {
        const sp = getSpecies(m.speciesId)
        m.currentHp = sp ? fullStats(m, sp).hp : m.currentHp
        m.status = "NONE"; m.statusCounter = 0
        m.moves = m.moves.map((mv) => ({ ...mv, pp: mv.ppMax }))
    }
}
// Reporte l'état survivant (PV/statut/PP) du combat fini vers les instances (carryover inter-vagues).
function carryOver(team: MonInstance[], final: BattleState): void {
    final.player.team.forEach((bm, i) => {
        if (!team[i]) return
        team[i].currentHp = bm.currentHp
        team[i].status = bm.status
        team[i].statusCounter = bm.statusCounter
        team[i].moves = bm.moves.map((mv) => ({ ...mv }))
    })
}

interface FightResult { win: boolean; energy: number; turns: number; stalled: boolean }

// Auto-joue un combat (IA des 2 côtés). L'ennemi est piloté par createBattle(aiLevel) ; le joueur par
// chooseAiAction. Renvoie issue + énergie dépensée par le joueur (somme des attackCost de ses attaques).
function simulateFight(team: MonInstance[], enemy: MonInstance[], seed: number): { res: FightResult; final: BattleState } {
    let s = createBattle(team, enemy, { isWild: false, seed, aiLevel: ENEMY_AI })
    const pRng = new Rng((seed ^ 0x9e3779b9) >>> 0)
    let energy = 0, turns = 0, stalled = false
    while (s.phase !== "ended" && turns < MAX_TURNS) {
        if (s.enemySendOut) { s = resolveTurn(s, { kind: "stay" }) }
        else if (s.forcedSwitch === "player") {
            const idx = s.player.team.findIndex((m) => m.currentHp > 0)
            s = resolveTurn(s, { kind: "switch", teamIndex: idx >= 0 ? idx : 0 })
        } else {
            const self = s.player.team[s.player.activeIndex]
            const foe = s.enemy.team[s.enemy.activeIndex]
            const a = chooseAiAction(self, foe, s.player.team, s.player.activeIndex, PLAYER_AI, pRng)
            if (a.kind === "move") {
                const mi = a.moveIndex ?? 0
                energy += attackCost(getMove(self.moves[mi]?.moveId ?? ""), self.level, QUOTA_STD)
                s = resolveTurn(s, { kind: "move", moveIndex: mi })
            } else {
                s = resolveTurn(s, { kind: "switch", teamIndex: a.teamIndex ?? 0 })
            }
        }
        turns++
    }
    if (turns >= MAX_TURNS && s.phase !== "ended") stalled = true
    const win = s.phase === "ended" && s.outcome === "win"
    return { res: { win, energy, turns, stalled }, final: s }
}

interface WaveStat { reached: number; won: number; energySum: number; refundSum: number; oppBstSum: number; stalls: number }

function simulateScenario(name: string, specs: { id: string; level: number }[], rule: LevelRule, healEvery = BOSS_EVERY, heldItem?: string): void {
    const top = Math.max(...specs.map((s) => s.level))
    const level = resolveFrontierLevel(rule, top)
    const waves: WaveStat[] = Array.from({ length: MAX_WAVES + 1 }, () => ({ reached: 0, won: 0, energySum: 0, refundSum: 0, oppBstSum: 0, stalls: 0 }))
    const reachedStreaks: number[] = []
    const cap = battleEnergyCap(PLAYER_BADGES)

    for (let run = 0; run < N_RUNS; run++) {
        const team = buildTeam(specs, heldItem)
        let reached = 0
        for (let streak = 1; streak <= MAX_WAVES; streak++) {
            // FIDÉLITÉ : le vrai jeu soigne quand (victoires % 7 == 0), or victoires = numéroVague−1 → soin
            // AVANT les vagues 1,8,15… (donc le BOSS de la vague 7/14 est combattu ÉPUISÉ). D'où (streak−1).
            if ((streak - 1) % healEvery === 0) healTeam(team)
            const wRng = new Rng((run * 100003 + streak * 9176 + 1) >>> 0)
            const wave = isBossWave(streak) ? generateBossWave(wRng, streak, level, DEFAULT_TEAM_SIZE) : { opponent: generateFrontierTeam(wRng, { streak, level, size: DEFAULT_TEAM_SIZE }) }
            const enemy = wave.opponent.map((o) => createMonInstance(o.speciesId, o.level, { owned: false }))
            const oppBst = wave.opponent.reduce((a, o) => a + bstOf(o.speciesId), 0) / wave.opponent.length

            const w = waves[streak]
            w.reached++; w.oppBstSum += oppBst
            const { res, final } = simulateFight(team, enemy, run * 1_000_003 + streak)
            w.energySum += res.energy
            w.refundSum += res.win ? frontierRefundPct(res.energy) : 0
            if (res.stalled) w.stalls++
            if (res.win) { w.won++; carryOver(team, final); reached = streak }
            else { break } // run terminé à la 1re défaite
        }
        reachedStreaks.push(reached)
    }

    // ── Rapport ──
    reachedStreaks.sort((a, b) => a - b)
    const pct = (p: number) => reachedStreaks[Math.min(reachedStreaks.length - 1, Math.floor(p * reachedStreaks.length))]
    const reachPct = (k: number) => `${Math.round(100 * reachedStreaks.filter((s) => s >= k).length / N_RUNS)}%`
    console.log(`\n══════════ ${name} — règle ${rule} (niveau adverse ${level}) · soin/${healEvery} vagues — ${N_RUNS} runs ══════════`)
    console.log(`Streak atteint : médiane ${pct(0.5)} · p25 ${pct(0.25)} · p75 ${pct(0.75)} · p90 ${pct(0.9)} · max ${reachedStreaks[reachedStreaks.length - 1]}`)
    console.log(`% des runs atteignant : vague 7(boss) ${reachPct(7)} · 14 ${reachPct(14)} · 21 ${reachPct(21)} · 28(tier max) ${reachPct(28)} · 35 ${reachPct(35)}`)
    console.log("Streak | %runs ici | win% (cond) | BST adv | énergie/cbt | %remb | cap?")
    for (let k = 1; k <= MAX_WAVES; k++) {
        const w = waves[k]
        if (w.reached === 0) break
        const winCond = Math.round(100 * w.won / w.reached)
        const avgE = Math.round(w.energySum / w.reached)
        const avgRef = w.won > 0 ? Math.round(w.refundSum / w.won) : 0
        const oppBst = Math.round(w.oppBstSum / w.reached)
        const reachP = Math.round(100 * w.reached / N_RUNS)
        const boss = isBossWave(k) ? " ★BOSS" : ""
        const capFlag = avgE > cap ? ` ⚠️>cap(${cap})` : ""
        const stall = w.stalls > 0 ? ` stalls=${w.stalls}` : ""
        console.log(`${String(k).padStart(2)}${boss.padEnd(6)} | ${String(reachP).padStart(3)}%     | ${String(winCond).padStart(3)}%       | ${String(oppBst).padStart(4)}    | ${String(avgE).padStart(4)}        | ${String(avgRef).padStart(3)}%${capFlag}${stall}`)
    }
}

// ── Scénarios ──
const BALANCED6_L60 = [
    { id: "razmaree", level: 60 }, { id: "pyrokoss", level: 60 }, { id: "zappeureal", level: 60 },
    { id: "maitrezenc", level: 60 }, { id: "draconarque", level: 60 }, { id: "regnantaur", level: 60 },
]
const BALANCED3_L60 = BALANCED6_L60.slice(0, 3) // pour mesurer l'effet de la taille d'équipe (3 vs 6)
const BALANCED6_L75 = BALANCED6_L60.map((s) => ({ ...s, level: 75 }))

console.log(`Bandes de BST par streak : 1-6=${bstBandForStreak(1)} · 7-13=${bstBandForStreak(7)} · 14-27=${bstBandForStreak(14)} · 28+=${bstBandForStreak(28)}`)
console.log(`BST de l'équipe test (Balanced-6) : ${BALANCED6_L60.map((s) => `${s.id}=${bstOf(s.id)}`).join(" · ")}`)

// Phase de soin CORRIGÉE (boss combattu épuisé). Scénarios de décision :
simulateScenario("ACTUEL — ADAPT · soin/7 · sans objet", BALANCED6_L60, "ADAPT", 7)
simulateScenario("LEVIER OBJETS — ADAPT · soin/7 · Restes sur les 6", BALANCED6_L60, "ADAPT", 7, "restes")
simulateScenario("LEVIER CADENCE — ADAPT · soin/3 · sans objet", BALANCED6_L60, "ADAPT", 3)
simulateScenario("LEVIER CADENCE — ADAPT · soin/2 · sans objet", BALANCED6_L60, "ADAPT", 2)
simulateScenario("RÉFÉRENCE haute — ADAPT · soin CHAQUE vague (Émeraude)", BALANCED6_L60, "ADAPT", 1)
simulateScenario("COMBINÉ — ADAPT · soin/3 · Restes sur les 6", BALANCED6_L60, "ADAPT", 3, "restes")
simulateScenario("RÈGLE L50 — soin/7 · sans objet (phase corrigée)", BALANCED6_L60, "L50", 7)
simulateScenario("ÉQUIPE de 3 — ADAPT · soin/7 · sans objet", BALANCED3_L60, "ADAPT", 7)
