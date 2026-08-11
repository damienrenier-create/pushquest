// src/lib/gamebook/yellow/battle/ai.ts
//
// Nexus Jaune Éclair — IA de combat (React-free, pure, sans dépendre du moteur).
// 3 niveaux : "wild" (erratique), "trainer" (cherche le meilleur coup),
// "ace" (anticipe : KO probable, efficacité de type, change si mauvais matchup).

import type { BattleMon } from "./types"
import { getMove } from "../data/moves"
import { getSpecies } from "../data/species"
import { typeEffectiveness, moveCategory } from "./typeChart"
import { computeDamage } from "./damage"
import { fullStats } from "./stats"
import type { Rng } from "./rng"

// "hof" = boss ultimes / miroirs (le plus malin, PEUT changer de Daemon) ; "elite" = gauntlet de Ligue (Conseil des
// Chimères) — MÊME intelligence de coup que "hof" mais ne CHANGE JAMAIS de Daemon (combat jusqu'au KO, choix de Sartay).
export type AiLevel = "wild" | "trainer" | "ace" | "hof" | "elite"

export interface AiChoice {
    kind: "move" | "switch"
    moveIndex?: number
    teamIndex?: number
}

interface ScoredMove { index: number; score: number; eff: number; power: number }

function scoreMoves(self: BattleMon, foe: BattleMon): ScoredMove[] {
    const selfSp = getSpecies(self.speciesId)
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
    const maxHp = selfSp ? fullStats(self, selfSp).hp : Math.max(1, self.currentHp)
    const selfFrac = self.currentHp / Math.max(1, maxHp)
    const missingFrac = Math.max(0, 1 - selfFrac)
    const out: ScoredMove[] = []
    self.moves.forEach((slot, index) => {
        const mv = getMove(slot.moveId)
        if (!mv || slot.pp <= 0) return
        const isStatus = mv.power <= 0
        const eff = isStatus ? 1 : typeEffectiveness(mv.type, foeTypes)
        const power = mv.power || 0
        let score: number
        if (isStatus) {
            // SOIN (Repos/Linceul/Reprise d'Ailes…) : ne vaut RIEN à pleine vie, précieux à basse vie → on
            // l'échelonne sur les PV MANQUANTS (fini le « Repos en premier alors qu'il a toute sa vie »).
            if (mv.effect?.healPct) score = mv.effect.healPct * missingFrac
            else score = 25 // autre statut (para/sommeil/boost…) : score plancher utile
        } else {
            score = power * eff
            if (eff === 0) score = -1 // IMMUNISÉ (ex. NORMAL→SPECTRE, SOL→VOL) : ne JAMAIS choisir tant qu'un autre coup existe
            // RECUL : à basse vie, un coup à recul risque le SUICIDE → on l'évite fortement SAUF s'il est
            // super-efficace (kamikaze probablement fatal à l'adversaire, assumé). À vie haute, recul OK (survivable).
            if (mv.effect?.recoilPct && selfFrac < 0.4 && eff < 2) score *= 0.15
        }
        out.push({ index, score, eff, power })
    })
    return out
}

// ── IA "hof" : dégâts ATTENDUS (STAB + meilleure stat offensive vs la bonne défense) + ouverture statut ──
interface ScoredHof { index: number; score: number; eff: number }
function scoreMovesHof(self: BattleMon, foe: BattleMon): ScoredHof[] {
    const selfSp = getSpecies(self.speciesId)
    const foeSp = getSpecies(foe.speciesId)
    const selfTypes = selfSp?.types ?? []
    const foeTypes = foeSp?.types ?? []
    const sStats = selfSp ? fullStats(self, selfSp) : null
    const fStats = foeSp ? fullStats(foe, foeSp) : null
    const foeFresh = fStats ? foe.currentHp >= fStats.hp : false
    const selfFrac = sStats ? self.currentHp / Math.max(1, sStats.hp) : 1
    const missingFrac = Math.max(0, 1 - selfFrac)
    const out: ScoredHof[] = []
    self.moves.forEach((slot, index) => {
        const mv = getMove(slot.moveId)
        if (!mv || slot.pp <= 0) return
        const isStatus = mv.power <= 0
        const eff = isStatus ? 1 : typeEffectiveness(mv.type, foeTypes)
        let score: number
        if (isStatus) {
            // SOIN : inutile à pleine vie, précieux à basse vie → échelonné sur les PV MANQUANTS (anti « Repos à full »).
            if (mv.effect?.healPct) score = mv.effect.healPct * missingFrac
            // BUFF de stat sur SOI (Danse-Lames…) : à ÉVITER à bas PV (on meurt avant d'en profiter) ET si le boost
            //   OFFENSIF ne matche pas notre stat d'attaque dominante (ex. +Atk sur un attaquant SPÉCIAL = quasi
            //   inutile). Sinon, mise en place raisonnable (sous un bon coup). Corrige « Danse-Lames à bas PV / spé ».
            else if (mv.effect?.statChanges?.some((c) => c.target === "self" && c.stages > 0)) {
                const boosts = mv.effect.statChanges.filter((c) => c.target === "self" && c.stages > 0)
                const isPhysAttacker = sStats ? sStats.atk >= sStats.spc : true
                const boostsAtk = boosts.some((c) => c.stat === "atk"), boostsSpc = boosts.some((c) => c.stat === "spc")
                const mismatched = (boostsAtk && !boostsSpc && !isPhysAttacker) || (boostsSpc && !boostsAtk && isPhysAttacker)
                score = selfFrac < 0.4 || mismatched ? 2 : 18
            }
            // Ouverture : sur une cible FRAÎCHE et SAINE, mener par un statut (sommeil/para…) est fort.
            else { const inflicts = mv.effect?.inflictStatus; score = inflicts && foe.status === "NONE" && foeFresh ? 80 : 18 }
        } else {
            const stab = selfTypes.includes(mv.type) ? 1.5 : 1
            const phys = moveCategory(mv.type) === "PHYSICAL"
            const off = sStats ? (phys ? sStats.atk : sStats.spc) : 1
            const def = fStats ? (phys ? fStats.def : (foe.frozenSpd ?? fStats.spc)) : 1 // FUSION : SpD séparée si présente
            const acc = mv.accuracy > 0 ? mv.accuracy / 100 : 1 // PRÉCISION : un coup peu fiable vaut moins (n'enchaîne pas un move à 70 %)
            score = mv.power * eff * stab * (off / Math.max(1, def)) * acc
            if (eff === 0) score = -1 // IMMUNISÉ (ex. NORMAL→SPECTRE, SOL→VOL) : ne JAMAIS choisir tant qu'un autre coup existe
            else {
                // KO : le coup TUE la cible ce tour (dégâts RÉELS estimés, sans crit, aléa moyen 0,9 → conservateur)
                //   ≥ PV restants → priorité ABSOLUE (finir le travail plutôt que sur-optimiser). Pondéré par la
                //   précision → un KO fiable prime sur un KO risqué.
                const est = computeDamage({ level: self.level, power: mv.power, attack: off, defense: def, stab: stab > 1, typeEff: eff, isCrit: false, randomFactor: 0.9 }).damage
                if (est >= foe.currentHp) score += 1e6 * acc
            }
            // RECUL : à basse vie, éviter le suicide SAUF coup super-efficace (kamikaze fatal assumé).
            if (mv.effect?.recoilPct && selfFrac < 0.4 && eff < 2) score *= 0.15
        }
        out.push({ index, score, eff })
    })
    return out.length > 0 ? out : [{ index: 0, score: 0, eff: 1 }]
}

/** Meilleur matchup défensif disponible sur le banc (pour décider d'un switch). */
function bestSwitchIndex(team: BattleMon[], activeIndex: number, foe: BattleMon): number | null {
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
    let bestI = -1
    let bestResist = Infinity
    team.forEach((m, i) => {
        if (i === activeIndex || m.currentHp <= 0) return
        const myTypes = getSpecies(m.speciesId)?.types ?? []
        // "resist" = à quel point les types adverses sont peu efficaces contre moi (plus bas = mieux).
        const incoming = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        if (incoming < bestResist) { bestResist = incoming; bestI = i }
    })
    return bestI >= 0 ? bestI : null
}

// ═══════════════ PILOTE SPÉCIAL : TONYTONY (mur spécial de Mools — PV 250 / DÉF 5 / SPC 105) ═══════════════
// Stratégie voulue par le créateur : Tonytony ENTRE sur un attaquant SPÉCIAL (qu'il mure), monte l'ESQUIVE (Mirage,
// +2/coup, plafond +6) pour survivre aux physiques qui l'OHKO (DÉF 5), et fait boule de neige avec ÉVEIL DIVIN
// (dégâts + Spé +1/coup → et comme « spc » sert d'attaque ET de défense spéciale, il devient irrésistible), en
// glissant un REPOS quand c'est SÛR. Il NE SORT JAMAIS de lui-même. Reproduit l'ESPRIT de la séquence demandée mais
// RÉACTIF : saisit les KO, respecte le plafond d'esquive, détecte les coups « sûrs » qui ignorent l'esquive, se
// soigne au bon moment. Le GARDE-FOU d'ENTRÉE (ne l'envoyer qu'une fois les physiques adverses KO) vit dans
// chooseReplacementIndex + l'ordre d'équipe (buildHubTeam). PvE only (les vraies équipes IA des autres joueurs).
const TONYTONY_ID = "tonytony"
const T_EVEIL = "eveil_divin", T_MIRAGE = "mirage", T_REPOS = "repos"

/** Mon dont l'offensive est à dominante PHYSIQUE (ATK ≥ SPC) → menace mortelle pour Tonytony (DÉF 5). */
function isPhysicalThreat(mon: BattleMon): boolean {
    const sp = getSpecies(mon.speciesId)
    if (!sp) return false
    const st = fullStats(mon, sp)
    return st.atk >= st.spc
}
/** Le foe a-t-il un coup « sûr » (sureHit / précision 0, ex. Météores) qui IGNORE l'esquive ? → Mirage inutile. */
function foeHasSureHit(foe: BattleMon): boolean {
    return foe.moves.some((s) => { const mv = getMove(s.moveId); return !!mv && s.pp > 0 && mv.power > 0 && (mv.effect?.sureHit === true || mv.accuracy === 0) })
}
/** Index d'un move (PP > 0) chez `self`, ou -1. */
function moveIndexOf(self: BattleMon, moveId: string): number {
    return self.moves.findIndex((s) => s.moveId === moveId && s.pp > 0)
}
/** Éveil Divin met-il KO le foe CE tour ? (dégâts spéciaux conservateurs, sans crit). */
function eveilDivinKOs(self: BattleMon, foe: BattleMon): boolean {
    const mv = getMove(T_EVEIL), selfSp = getSpecies(self.speciesId), foeSp = getSpecies(foe.speciesId)
    if (!mv || !selfSp || !foeSp) return false
    const eff = typeEffectiveness(mv.type, foeSp.types)
    if (eff === 0) return false
    const off = fullStats(self, selfSp).spc
    const def = foe.frozenSpd ?? fullStats(foe, foeSp).spc
    const est = computeDamage({ level: self.level, power: mv.power, attack: off, defense: def, stab: selfSp.types.includes(mv.type), typeEff: eff, isCrit: false, randomFactor: 0.9 }).damage
    return est >= foe.currentHp
}
/** Pilote de coup de Tonytony → moveIndex, ou null si son kit n'a pas la panoplie attendue (→ IA générique). */
function chooseTonytonyMove(self: BattleMon, foe: BattleMon): number | null {
    const iEveil = moveIndexOf(self, T_EVEIL), iMirage = moveIndexOf(self, T_MIRAGE), iRepos = moveIndexOf(self, T_REPOS)
    if (iEveil < 0 && iMirage < 0) return null // pas la panoplie → laisse l'IA générique jouer
    const selfSp = getSpecies(self.speciesId)
    const maxHp = selfSp ? fullStats(self, selfSp).hp : Math.max(1, self.currentHp)
    const frac = self.currentHp / Math.max(1, maxHp)
    const eva = self.stages?.eva ?? 0
    const foePhys = isPhysicalThreat(foe)
    const canDodge = !foeHasSureHit(foe) // Mirage ne protège que si le foe n'a pas de coup « sûr »
    // 1) FINIR : Éveil Divin qui met KO ce tour prime sur tout.
    if (iEveil >= 0 && eveilDivinKOs(self, foe)) return iEveil
    // 2) REPOS quand c'est SÛR (PV bas ET on encaisse : foe spécial muré, OU esquive déjà haute face à un physique).
    if (iRepos >= 0 && frac < 0.5 && (!foePhys || (eva >= 4 && canDodge))) return iRepos
    // 3) SURVIE physique : monter l'esquive tant qu'on n'est pas au plafond, face à un physique esquivable.
    if (iMirage >= 0 && eva < 6 && foePhys && canDodge) return iMirage
    // 4) SNOWBALL : Éveil Divin (dégâts + Spé). À défaut, Mirage encore utile ; sinon IA générique.
    if (iEveil >= 0) return iEveil
    if (iMirage >= 0 && eva < 6) return iMirage
    return null
}

/** Choix du REMPLAÇANT à envoyer après un KO (envoi FORCÉ, TOUS niveaux de dresseur). Renvoie l'index du banc
 *  au MEILLEUR matchup face à l'actif adverse : priorité à ENCAISSER ses types (le remplaçant ne doit pas vouloir
 *  re-switcher aussitôt → fin du ping-pong « on renvoie le suivant, il fuit, on renvoie le suivant… »), puis à le
 *  PUNIR (meilleur coup réel). Déterministe (aucun RNG) → sûr côté replay/checksum. -1 si le banc est vide
 *  (le moteur garantit ≥1 vivant avant l'appel). Remplace l'ancien « firstAliveIndex » (= premier dans la liste). */
export function chooseReplacementIndex(team: BattleMon[], foe: BattleMon, foeTeam?: BattleMon[]): number {
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
    // GARDE-FOU TONYTONY : tant qu'un attaquant PHYSIQUE adverse est ENCORE VIVANT (n'importe lequel de l'équipe,
    //   pas seulement l'actif), on ÉVITE d'envoyer Tonytony (DÉF 5 → un physique l'OHKO). On le déprécie fortement ;
    //   il reste choisi s'il est le SEUL Daemon vivant du banc. `foeTeam` absent → repli sur l'actif seul.
    const foePhysAlive = (foeTeam ?? [foe]).some((m) => m.currentHp > 0 && isPhysicalThreat(m))
    let bestI = -1
    let bestScore = -Infinity
    team.forEach((m, i) => {
        if (m.currentHp <= 0) return
        const myTypes = getSpecies(m.speciesId)?.types ?? []
        // Défensif : produit des efficacités des types adverses SUR MOI (0,25 = grosse résistance … 4 = ×4 faible).
        const incoming = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        // Offensif : mon meilleur coup RÉEL (PP > 0, à dégâts) contre l'adverse, pondéré STAB × efficacité.
        let bestOff = 0
        for (const slot of m.moves) {
            const mv = getMove(slot.moveId)
            if (!mv || slot.pp <= 0 || mv.power <= 0) continue
            const stab = myTypes.includes(mv.type) ? 1.5 : 1
            bestOff = Math.max(bestOff, mv.power * typeEffectiveness(mv.type, foeTypes) * stab)
        }
        // Encaisser PRIME (anti-ping-pong), punir en SECONDAIRE. Magnitudes comparables (def ~25→400, off ~0→300).
        let score = (1 / Math.max(0.25, incoming)) * 100 + bestOff
        if (m.speciesId === TONYTONY_ID && foePhysAlive) score -= 1e6 // réservé tant qu'un physique adverse est debout
        if (score > bestScore) { bestScore = score; bestI = i }
    })
    return bestI
}

export function chooseAiAction(
    self: BattleMon,
    foe: BattleMon,
    team: BattleMon[],
    activeIndex: number,
    level: AiLevel,
    rng: Rng,
): AiChoice {
    // PILOTE SPÉCIAL TONYTONY : stratégie dédiée (esquive + Éveil Divin + Repos), et JAMAIS de switch volontaire
    //   (il reste en jeu jusqu'au KO). S'applique à tous les niveaux d'IA — Tonytony n'est piloté que côté IA.
    if (self.speciesId === TONYTONY_ID) {
        const ti = chooseTonytonyMove(self, foe)
        if (ti !== null) return { kind: "move", moveIndex: ti }
    }
    const scored = scoreMoves(self, foe)
    if (scored.length === 0) return { kind: "move", moveIndex: 0 } // Lutte (placeholder)

    // --- "hof" (Hall of Fame) : la plus maligne. Dégâts attendus (STAB + bonne stat), ouverture statut,
    //     et un switch UNIQUEMENT face à une faiblesse ×4 qu'on ne peut pas punir (sans yo-yo). ---
    if (level === "hof" || level === "elite") {
        const scoredHof = scoreMovesHof(self, foe)
        // SWITCH réservé aux BOSS ULTIMES / MIROIRS ("hof") : face à une faiblesse ×4 imparable, ils changent vers
        //   un banc STRICTEMENT plus résistant (anti yo-yo). La GAUNTLET de Ligue ("elite" = Conseil des Chimères)
        //   ne switch JAMAIS — chaque membre combat jusqu'au KO ; toute son intelligence est dans le choix du coup
        //   (dégâts réels + KO + précision + anti-immunité + anti-buff-gâché, cf. scoreMovesHof).
        if (level === "hof") {
            const myTypes = getSpecies(self.speciesId)?.types ?? []
            const foeTypes = getSpecies(foe.speciesId)?.types ?? []
            const incomingOnMe = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
            const myBestEff = Math.max(0, ...scoredHof.map((s) => s.eff))
            if (incomingOnMe >= 4 && myBestEff < 2) {
                const sw = bestSwitchIndex(team, activeIndex, foe)
                if (sw !== null) {
                    const candTypes = getSpecies(team[sw].speciesId)?.types ?? []
                    const incomingOnCand = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, candTypes), 1)
                    if (incomingOnCand < incomingOnMe && rng.chance(75)) return { kind: "switch", teamIndex: sw }
                }
            }
        }
        let best = scoredHof[0]
        for (const s of scoredHof) if (s.score > best.score) best = s
        return { kind: "move", moveIndex: best.index }
    }

    // --- "ace" : envisage un switch si le matchup actuel est mauvais ---
    if (level === "ace") {
        const myTypes = getSpecies(self.speciesId)?.types ?? []
        const foeTypes = getSpecies(foe.speciesId)?.types ?? []
        const incomingOnMe = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        const myBestEff = Math.max(...scored.map((s) => s.eff))
        if (incomingOnMe >= 2 && myBestEff < 2) {
            const sw = bestSwitchIndex(team, activeIndex, foe)
            if (sw !== null && rng.chance(60)) return { kind: "switch", teamIndex: sw }
        }
    }

    // --- "wild" : choix erratique (souvent sous-optimal) ---
    if (level === "wild") {
        if (rng.chance(35)) {
            const r = scored[rng.int(0, scored.length - 1)]
            return { kind: "move", moveIndex: r.index }
        }
    }

    // --- "trainer"/"ace"/"wild" (cas par défaut) : meilleur score, petit bruit ---
    let best = scored[0]
    let bestScore = -1
    for (const s of scored) {
        const noise = 0.85 + rng.next() * 0.3
        const sc = s.score * noise
        if (sc > bestScore) { bestScore = sc; best = s }
    }
    return { kind: "move", moveIndex: best.index }
}
