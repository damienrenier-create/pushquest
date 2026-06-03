// src/lib/gamebook/yellow/battle/engine.ts
//
// Nexus Jaune Éclair — MOTEUR DE TOUR (machine d'état, React-free, déterministe).
// Résout un tour complet : pré-checks de statut → ordre (priorité puis vitesse) →
// exécution des actions (précision, dégâts, effets) → fin de tour (résiduels) →
// KO / changement forcé / issue. Produit une FILE D'ÉVÉNEMENTS que l'UI rejoue.

import type { BattleMon, MonInstance, MajorStatus, MoveData, StageKey } from "./types"
import { neutralStages } from "./types"
import { Rng } from "./rng"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { fullStats, effectiveStat, clampStage, accEvaMultiplier } from "./stats"
import { computeDamage, hasStab, critProbability } from "./damage"
import { typeEffectiveness, effectivenessMessage } from "./typeChart"
import * as Status from "./status"

// ============================================================
// Types d'état & événements
// ============================================================

export type SideId = "player" | "enemy"

export type BattleEvent =
    | { kind: "message"; text: string }
    | { kind: "hp"; side: SideId; hp: number; max: number }
    | { kind: "faint"; side: SideId; name: string }
    | { kind: "status"; side: SideId; status: MajorStatus }
    | { kind: "switchIn"; side: SideId; name: string }
    | { kind: "end"; outcome: Outcome }

export type Outcome = "win" | "lose" | "run" | "caught"

export interface BattleSide {
    team: BattleMon[]
    activeIndex: number
}

export interface BattleState {
    player: BattleSide
    enemy: BattleSide
    isWild: boolean
    turn: number
    phase: "select" | "ended"
    outcome: Outcome | null
    /** Side devant choisir un remplaçant suite à un KO (sinon null). */
    forcedSwitch: SideId | null
    /** File d'événements du dernier tour résolu (vidée par l'UI). */
    events: BattleEvent[]
    /** État RNG persistant (déterministe / rejouable). */
    seed: number
}

export type PlayerAction =
    | { kind: "move"; moveIndex: number }
    | { kind: "switch"; teamIndex: number }
    | { kind: "run" }

// Action interne résolue pour un camp (le joueur ET l'IA produisent ça).
interface ResolvedAction {
    side: SideId
    kind: "move" | "switch" | "run"
    moveIndex?: number
    teamIndex?: number
}

// ============================================================
// Helpers d'accès
// ============================================================

export function speciesOf(m: MonInstance) {
    const s = getSpecies(m.speciesId)
    if (!s) throw new Error(`Espèce inconnue: ${m.speciesId}`)
    return s
}

export function maxHpOf(m: MonInstance): number {
    return fullStats(m, speciesOf(m)).hp
}

export function displayName(m: MonInstance): string {
    return m.nickname ?? speciesOf(m).name
}

function active(side: BattleSide): BattleMon {
    return side.team[side.activeIndex]
}

function hasAlive(side: BattleSide): boolean {
    return side.team.some((m) => m.currentHp > 0)
}

function firstAliveIndex(side: BattleSide): number {
    return side.team.findIndex((m) => m.currentHp > 0)
}

/** Transforme une instance persistante en combattant runtime (stages neutres). */
export function toBattleMon(inst: MonInstance): BattleMon {
    return { ...inst, stages: neutralStages(), volatiles: {} }
}

// ============================================================
// Création d'un combat
// ============================================================

export function createBattle(
    playerTeam: MonInstance[],
    enemyTeam: MonInstance[],
    opts: { isWild: boolean; seed: number },
): BattleState {
    return {
        player: { team: playerTeam.map(toBattleMon), activeIndex: 0 },
        enemy: { team: enemyTeam.map(toBattleMon), activeIndex: 0 },
        isWild: opts.isWild,
        turn: 1,
        phase: "select",
        outcome: null,
        forcedSwitch: null,
        events: [],
        seed: opts.seed >>> 0,
    }
}

// ============================================================
// Résolution d'un tour
// ============================================================

export function resolveTurn(prev: BattleState, playerAction: PlayerAction): BattleState {
    if (prev.phase === "ended") return prev

    // Clone profond minimal (immutabilité pour le store).
    const state: BattleState = structuredCloneState(prev)
    const rng = new Rng(state.seed)
    const events: BattleEvent[] = []

    // --- Cas spécial : changement forcé après KO (pas un vrai tour) ---
    if (state.forcedSwitch === "player" && playerAction.kind === "switch") {
        doSwitch(state, "player", playerAction.teamIndex!, events)
        state.forcedSwitch = null
        return commit(state, events, rng, prev.turn)
    }

    // --- Fuite (combats sauvages) ---
    if (playerAction.kind === "run") {
        if (!state.isWild) {
            events.push({ kind: "message", text: "On ne fuit pas un combat de Dresseur !" })
            return commit(state, events, rng, prev.turn, /*advance*/ false)
        }
        // Fuite garantie pour l'instant (formule de vitesse → Phase polish).
        events.push({ kind: "message", text: "Tu prends la fuite !" })
        state.phase = "ended"
        state.outcome = "run"
        events.push({ kind: "end", outcome: "run" })
        return commit(state, events, rng, prev.turn, false)
    }

    // --- Construit les actions des deux camps ---
    const enemyAction = chooseEnemyAction(state, rng)
    const playerResolved: ResolvedAction = {
        side: "player",
        kind: playerAction.kind,
        moveIndex: playerAction.kind === "move" ? playerAction.moveIndex : undefined,
        teamIndex: playerAction.kind === "switch" ? playerAction.teamIndex : undefined,
    }

    // Les switchs passent AVANT les attaques.
    const order = orderActions(state, playerResolved, enemyAction, rng)

    for (const act of order) {
        if (state.phase === "ended") break
        // Si l'actif du camp est KO (suite à l'action adverse), il n'agit pas.
        if (active(state[act.side]).currentHp <= 0) continue

        if (act.kind === "switch") {
            doSwitch(state, act.side, act.teamIndex!, events)
        } else if (act.kind === "move") {
            performMove(state, act.side, act.moveIndex!, events, rng)
        }
        checkFaints(state, events)
    }

    // --- Fin de tour : résiduels de statut (ordre vitesse) ---
    if (state.phase !== "ended") {
        endOfTurn(state, events, rng)
        checkFaints(state, events)
    }

    return commit(state, events, rng, prev.turn, true)
}

// ============================================================
// Ordre des actions : switch > priorité de capacité > vitesse
// ============================================================

function actionPriority(state: BattleState, a: ResolvedAction): number {
    if (a.kind === "switch") return 6 // les switchs passent avant tout
    if (a.kind === "move") {
        const mon = active(state[a.side])
        const slot = mon.moves[a.moveIndex!]
        const move = slot ? getMove(slot.moveId) : null
        return move?.priority ?? 0
    }
    return 0
}

function effectiveSpeed(mon: BattleMon): number {
    const raw = fullStats(mon, speciesOf(mon)).spe
    return effectiveStat(raw, "spe", mon.stages.spe, mon.status)
}

function orderActions(
    state: BattleState,
    p: ResolvedAction,
    e: ResolvedAction,
    rng: Rng,
): ResolvedAction[] {
    const pp = actionPriority(state, p)
    const ep = actionPriority(state, e)
    if (pp !== ep) return pp > ep ? [p, e] : [e, p]
    const ps = effectiveSpeed(active(state.player))
    const es = effectiveSpeed(active(state.enemy))
    if (ps !== es) return ps > es ? [p, e] : [e, p]
    // Égalité de vitesse → aléatoire (comme dans le jeu).
    return rng.chance(50) ? [p, e] : [e, p]
}

// ============================================================
// Exécution d'une capacité
// ============================================================

function performMove(state: BattleState, side: SideId, moveIndex: number, events: BattleEvent[], rng: Rng) {
    const atkSide = state[side]
    const defSide = state[other(side)]
    const attacker = active(atkSide)
    const defender = active(defSide)
    const slot = attacker.moves[moveIndex]
    if (!slot) return
    const move = getMove(slot.moveId)
    if (!move) return

    // --- Pré-checks de statut (peut empêcher l'action) ---
    if (!canAct(attacker, events, rng)) return

    // Consomme 1 PP.
    slot.pp = Math.max(0, slot.pp - 1)
    events.push({ kind: "message", text: `${displayName(attacker)} utilise ${move.name} !` })

    // --- Confusion : risque de se blesser soi-même ---
    if (attacker.volatiles.CONFUSION && attacker.volatiles.CONFUSION > 0) {
        attacker.volatiles.CONFUSION -= 1
        if (attacker.volatiles.CONFUSION <= 0) {
            delete attacker.volatiles.CONFUSION
            events.push({ kind: "message", text: `${displayName(attacker)} n'est plus confus.` })
        } else if (Status.confusionSelfHit(rng)) {
            const selfDmg = confusionDamage(attacker)
            applyDamage(state, side, selfDmg, events)
            events.push({ kind: "message", text: `${displayName(attacker)} est confus ! Il se blesse en se débattant !` })
            return
        }
    }

    // --- Précision ---
    if (!accuracyCheck(move, attacker, defender, rng)) {
        events.push({ kind: "message", text: `${displayName(attacker)} rate son attaque !` })
        return
    }

    if (move.category === "STATUS") {
        applyStatusMove(state, side, move, events, rng)
        return
    }

    // --- Capacité offensive (gère multi-hit) ---
    const hits = move.effect?.multiHit ? rng.int(move.effect.multiHit[0], move.effect.multiHit[1]) : 1
    let landed = 0
    let lastEff = 1
    for (let h = 0; h < hits; h++) {
        if (active(defSide).currentHp <= 0) break
        const res = dealMoveDamage(state, side, move, rng, events)
        lastEff = res.typeEff
        if (res.dealt > 0 || res.typeEff > 0) landed++
        // Drain / recul basés sur les dégâts de CE coup.
        if (move.effect?.drainPct && res.dealt > 0) {
            const heal = Math.max(1, Math.floor((res.dealt * move.effect.drainPct) / 100))
            applyHeal(state, side, heal, events)
            events.push({ kind: "message", text: `${displayName(attacker)} récupère de l'énergie !` })
        }
        if (move.effect?.recoilPct && res.dealt > 0) {
            const recoil = Math.max(1, Math.floor((res.dealt * move.effect.recoilPct) / 100))
            applyDamage(state, side, recoil, events)
            events.push({ kind: "message", text: `${displayName(attacker)} est blessé par le contrecoup !` })
        }
    }

    if (lastEff === 0) {
        events.push({ kind: "message", text: "Ça n'affecte pas l'adversaire…" })
        return
    }
    if (hits > 1 && landed > 0) {
        events.push({ kind: "message", text: `Touché ${landed} fois !` })
    }

    // --- Effet secondaire (proba) sur capacité offensive ---
    if (move.effect && active(defSide).currentHp > 0) {
        maybeApplySecondary(state, side, move, events, rng)
    }
}

interface DamageOutcome { dealt: number; typeEff: number }

function dealMoveDamage(state: BattleState, side: SideId, move: MoveData, rng: Rng, events: BattleEvent[]): DamageOutcome {
    const attacker = active(state[side])
    const defender = active(state[other(side)])
    const atkSpecies = speciesOf(attacker)
    const defSpecies = speciesOf(defender)

    const eff = typeEffectiveness(move.type, defSpecies.types)
    if (eff === 0) return { dealt: 0, typeEff: 0 }

    const rawStats = fullStats(attacker, atkSpecies)
    const rawDefStats = fullStats(defender, defSpecies)
    const isPhysical = move.category === "PHYSICAL"
    const atk = effectiveStat(isPhysical ? rawStats.atk : rawStats.spa, isPhysical ? "atk" : "spa", isPhysical ? attacker.stages.atk : attacker.stages.spa, attacker.status)
    const def = effectiveStat(isPhysical ? rawDefStats.def : rawDefStats.spd, isPhysical ? "def" : "spd", isPhysical ? defender.stages.def : defender.stages.spd, "NONE")

    const isCrit = rng.next() < critProbability(move.effect?.critStage ?? 0)
    const result = computeDamage({
        level: attacker.level,
        power: move.power,
        attack: atk,
        defense: def,
        stab: hasStab(move.type, atkSpecies.types),
        typeEff: eff,
        isCrit,
        randomFactor: rng.damageFactor(),
    })

    applyDamage(state, other(side), result.damage, events)
    if (isCrit) events.push({ kind: "message", text: "Coup critique !" })
    const effMsg = effectivenessMessage(eff)
    if (effMsg) events.push({ kind: "message", text: effMsg })

    return { dealt: result.damage, typeEff: eff }
}

// ============================================================
// Capacités de statut (buff/debuff/soin/statut/volatil)
// ============================================================

function applyStatusMove(state: BattleState, side: SideId, move: MoveData, events: BattleEvent[], rng: Rng) {
    const fx = move.effect
    if (!fx) {
        events.push({ kind: "message", text: "Mais rien ne se passe…" })
        return
    }
    const selfMon = active(state[side])
    const foeMon = active(state[other(side)])

    if (fx.healPct) {
        const heal = Math.floor((maxHpOf(selfMon) * fx.healPct) / 100)
        applyHeal(state, side, heal, events)
        events.push({ kind: "message", text: `${displayName(selfMon)} récupère des PV !` })
    }
    if (fx.statChanges) {
        for (const sc of fx.statChanges) {
            const tgtSide: SideId = sc.target === "self" ? side : other(side)
            applyStatChange(state, tgtSide, sc.stat, sc.stages, events)
        }
    }
    if (fx.inflictStatus) {
        tryInflictStatus(state, other(side), fx.inflictStatus, events, rng)
    }
    if (fx.inflictVolatile) {
        applyVolatile(foeMon, fx.inflictVolatile, rng, events, foeMon)
    }
}

function maybeApplySecondary(state: BattleState, side: SideId, move: MoveData, events: BattleEvent[], rng: Rng) {
    const fx = move.effect!
    const chance = fx.chance ?? 100
    if (!rng.chance(chance)) return
    if (fx.inflictStatus) tryInflictStatus(state, other(side), fx.inflictStatus, events, rng)
    if (fx.inflictVolatile) applyVolatile(active(state[other(side)]), fx.inflictVolatile, rng, events, active(state[other(side)]))
    if (fx.statChanges) {
        for (const sc of fx.statChanges) {
            const tgtSide: SideId = sc.target === "self" ? side : other(side)
            applyStatChange(state, tgtSide, sc.stat, sc.stages, events)
        }
    }
    if (fx.flinch) {
        const foe = active(state[other(side)])
        foe.volatiles.FLINCH = 1
    }
}

function tryInflictStatus(state: BattleState, targetSide: SideId, status: Exclude<MajorStatus, "NONE">, events: BattleEvent[], rng: Rng) {
    const mon = active(state[targetSide])
    if (!Status.canInflictStatus(mon.status, status, speciesOf(mon).types)) return
    mon.status = status
    mon.statusCounter = Status.initialStatusCounter(status, rng)
    events.push({ kind: "status", side: targetSide, status })
    events.push({ kind: "message", text: Status.statusApplyMessage(status, displayName(mon)) })
}

function applyVolatile(mon: BattleMon, vol: NonNullable<MoveData["effect"]>["inflictVolatile"], rng: Rng, events: BattleEvent[], named: BattleMon) {
    if (!vol) return
    if (vol === "CONFUSION") {
        if (mon.volatiles.CONFUSION) return
        mon.volatiles.CONFUSION = rng.int(2, 4)
        events.push({ kind: "message", text: `${displayName(named)} est confus !` })
    } else if (vol === "SEEDED") {
        if (mon.volatiles.SEEDED) return
        mon.volatiles.SEEDED = 1
        events.push({ kind: "message", text: `${displayName(named)} est infecté par des graines !` })
    } else {
        mon.volatiles[vol] = 1
    }
}

function applyStatChange(state: BattleState, side: SideId, stat: StageKey, delta: number, events: BattleEvent[]) {
    const mon = active(state[side])
    const before = mon.stages[stat]
    mon.stages[stat] = clampStage(before + delta)
    const real = mon.stages[stat] - before
    if (real === 0) {
        events.push({ kind: "message", text: `${displayName(mon)} : sa stat ne change plus.` })
        return
    }
    const up = delta > 0
    events.push({ kind: "message", text: `${displayName(mon)} : ${labelStat(stat)} ${up ? "augmente" : "baisse"}${Math.abs(real) >= 2 ? " beaucoup" : ""} !` })
}

// ============================================================
// Pré-checks de statut (le mon peut-il agir ?)
// ============================================================

function canAct(mon: BattleMon, events: BattleEvent[], rng: Rng): boolean {
    if (mon.volatiles.FLINCH) {
        delete mon.volatiles.FLINCH
        events.push({ kind: "message", text: `${displayName(mon)} a peur et ne peut pas agir !` })
        return false
    }
    if (mon.status === "SLEEP") {
        mon.statusCounter -= 1
        if (mon.statusCounter <= 0) {
            mon.status = "NONE"
            events.push({ kind: "message", text: `${displayName(mon)} se réveille !` })
            return true
        }
        events.push({ kind: "message", text: `${displayName(mon)} dort profondément.` })
        return false
    }
    if (mon.status === "FREEZE") {
        if (Status.freezeThaws(rng)) {
            mon.status = "NONE"
            events.push({ kind: "message", text: `${displayName(mon)} dégèle !` })
            return true
        }
        events.push({ kind: "message", text: `${displayName(mon)} est gelé !` })
        return false
    }
    if (mon.status === "PARALYSIS" && Status.paralysisSkips(rng)) {
        events.push({ kind: "message", text: `${displayName(mon)} est paralysé ! Il ne peut pas bouger !` })
        return false
    }
    return true
}

// ============================================================
// Fin de tour : résiduels
// ============================================================

function endOfTurn(state: BattleState, events: BattleEvent[], rng: Rng) {
    void rng
    const order: SideId[] = effectiveSpeed(active(state.player)) >= effectiveSpeed(active(state.enemy))
        ? ["player", "enemy"]
        : ["enemy", "player"]
    for (const side of order) {
        const mon = active(state[side])
        if (mon.currentHp <= 0) continue
        // Statut résiduel
        const res = Status.residualDamage(mon.status, maxHpOf(mon), displayName(mon), mon.statusCounter)
        if (res.damage > 0) {
            applyDamage(state, side, res.damage, events)
            if (res.message) events.push({ kind: "message", text: res.message })
            if (mon.status === "TOXIC") mon.statusCounter += 1
        }
        // Vampigraine (SEEDED) : draine vers l'adversaire
        if (mon.volatiles.SEEDED && mon.currentHp > 0) {
            const drain = Math.max(1, Math.floor(maxHpOf(mon) / 8))
            applyDamage(state, side, drain, events)
            applyHeal(state, other(side), drain, events)
            events.push({ kind: "message", text: `${displayName(mon)} est vidé de son énergie !` })
        }
    }
}

// ============================================================
// PV : dégâts / soin (+ événements hp pour l'UI)
// ============================================================

function applyDamage(state: BattleState, side: SideId, amount: number, events: BattleEvent[]) {
    if (amount <= 0) return
    const mon = active(state[side])
    mon.currentHp = Math.max(0, mon.currentHp - amount)
    events.push({ kind: "hp", side, hp: mon.currentHp, max: maxHpOf(mon) })
}

function applyHeal(state: BattleState, side: SideId, amount: number, events: BattleEvent[]) {
    if (amount <= 0) return
    const mon = active(state[side])
    const max = maxHpOf(mon)
    mon.currentHp = Math.min(max, mon.currentHp + amount)
    events.push({ kind: "hp", side, hp: mon.currentHp, max })
}

function confusionDamage(mon: BattleMon): number {
    const s = speciesOf(mon)
    const stats = fullStats(mon, s)
    const atk = effectiveStat(stats.atk, "atk", mon.stages.atk, mon.status)
    const def = effectiveStat(stats.def, "def", mon.stages.def, "NONE")
    // Attaque "type ???" puissance 40, sans STAB ni type ni crit.
    return computeDamage({ level: mon.level, power: 40, attack: atk, defense: def, stab: false, typeEff: 1, isCrit: false, randomFactor: 1 }).damage
}

// ============================================================
// Précision
// ============================================================

function accuracyCheck(move: MoveData, attacker: BattleMon, defender: BattleMon, rng: Rng): boolean {
    if (move.accuracy <= 0) return true // ne rate jamais
    const accMult = accEvaMultiplier(attacker.stages.acc)
    const evaMult = accEvaMultiplier(-defender.stages.eva)
    const finalAcc = move.accuracy * accMult * evaMult
    return rng.chance(finalAcc)
}

// ============================================================
// Switch / KO / IA
// ============================================================

function doSwitch(state: BattleState, side: SideId, teamIndex: number, events: BattleEvent[]) {
    const s = state[side]
    if (teamIndex < 0 || teamIndex >= s.team.length) return
    if (s.team[teamIndex].currentHp <= 0) return
    if (teamIndex === s.activeIndex) return
    // Réinitialise stages/volatils du sortant.
    const out = s.team[s.activeIndex]
    out.stages = neutralStages()
    out.volatiles = {}
    s.activeIndex = teamIndex
    const incoming = s.team[teamIndex]
    events.push({ kind: "switchIn", side, name: displayName(incoming) })
    events.push({ kind: "message", text: side === "player" ? `En avant, ${displayName(incoming)} !` : `L'adversaire envoie ${displayName(incoming)} !` })
    events.push({ kind: "hp", side, hp: incoming.currentHp, max: maxHpOf(incoming) })
}

function checkFaints(state: BattleState, events: BattleEvent[]) {
    for (const side of ["player", "enemy"] as SideId[]) {
        const s = state[side]
        const mon = active(s)
        if (mon.currentHp <= 0 && !(mon as any).__fainted) {
            (mon as any).__fainted = true
            events.push({ kind: "faint", side, name: displayName(mon) })
            events.push({ kind: "message", text: `${displayName(mon)} est K.O. !` })
        }
    }
    // Issue / changement forcé
    if (!hasAlive(state.enemy)) {
        state.phase = "ended"; state.outcome = "win"
        events.push({ kind: "end", outcome: "win" })
        return
    }
    if (!hasAlive(state.player)) {
        state.phase = "ended"; state.outcome = "lose"
        events.push({ kind: "end", outcome: "lose" })
        return
    }
    // Auto-switch ennemi si son actif est KO
    if (active(state.enemy).currentHp <= 0) {
        doSwitch(state, "enemy", firstAliveIndex(state.enemy), events)
    }
    // Le joueur doit choisir un remplaçant si son actif est KO
    if (active(state.player).currentHp <= 0) {
        state.forcedSwitch = "player"
    }
}

/** IA basique (Phase 4 enrichira) : choisit l'attaque la plus rentable. */
export function chooseEnemyAction(state: BattleState, rng: Rng): ResolvedAction {
    const mon = active(state.enemy)
    const foe = active(state.player)
    const usable = mon.moves.map((m, i) => ({ i, move: getMove(m.moveId), pp: m.pp })).filter((x) => x.move && x.pp > 0)
    if (usable.length === 0) return { side: "enemy", kind: "move", moveIndex: 0 } // Lutte (placeholder)

    // Score = puissance × efficacité de type (status moves → score bas mais possible).
    let best = usable[0]
    let bestScore = -1
    for (const u of usable) {
        const mv = u.move!
        const eff = mv.category === "STATUS" ? 0.5 : typeEffectiveness(mv.type, speciesOf(foe).types)
        const score = (mv.power || 30) * eff * (0.85 + rng.next() * 0.3)
        if (score > bestScore) { bestScore = score; best = u }
    }
    return { side: "enemy", kind: "move", moveIndex: best.i }
}

// ============================================================
// Utilitaires
// ============================================================

function other(side: SideId): SideId {
    return side === "player" ? "enemy" : "player"
}

function labelStat(stat: StageKey): string {
    const map: Record<StageKey, string> = {
        atk: "l'Attaque", def: "la Défense", spa: "l'Atq. Spé.", spd: "la Déf. Spé.",
        spe: "la Vitesse", acc: "la Précision", eva: "l'Esquive",
    }
    return map[stat]
}

function commit(state: BattleState, events: BattleEvent[], rng: Rng, prevTurn: number, advance = true): BattleState {
    // Nettoie les marqueurs internes de KO.
    for (const side of ["player", "enemy"] as SideId[]) {
        for (const m of state[side].team) delete (m as any).__fainted
    }
    state.events = events
    state.seed = rng.getState()
    if (advance && state.phase !== "ended") state.turn = prevTurn + 1
    return state
}

function structuredCloneState(s: BattleState): BattleState {
    return {
        ...s,
        player: { activeIndex: s.player.activeIndex, team: s.player.team.map(cloneMon) },
        enemy: { activeIndex: s.enemy.activeIndex, team: s.enemy.team.map(cloneMon) },
        events: [],
    }
}

function cloneMon(m: BattleMon): BattleMon {
    return {
        ...m,
        ivs: { ...m.ivs },
        moves: m.moves.map((mv) => ({ ...mv })),
        stages: { ...m.stages },
        volatiles: { ...m.volatiles },
    }
}
