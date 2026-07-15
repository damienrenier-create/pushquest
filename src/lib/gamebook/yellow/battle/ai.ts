// src/lib/gamebook/yellow/battle/ai.ts
//
// Nexus Jaune Éclair — IA de combat (React-free, pure, sans dépendre du moteur).
// 3 niveaux : "wild" (erratique), "trainer" (cherche le meilleur coup),
// "ace" (anticipe : KO probable, efficacité de type, change si mauvais matchup).

import type { BattleMon } from "./types"
import { getMove } from "../data/moves"
import { getSpecies } from "../data/species"
import { typeEffectiveness, moveCategory } from "./typeChart"
import { fullStats } from "./stats"
import type { Rng } from "./rng"

export type AiLevel = "wild" | "trainer" | "ace" | "hof"

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
            // Ouverture : sur une cible FRAÎCHE et SAINE, mener par un statut (sommeil/para…) est fort.
            else { const inflicts = mv.effect?.inflictStatus; score = inflicts && foe.status === "NONE" && foeFresh ? 80 : 18 }
        } else {
            const stab = selfTypes.includes(mv.type) ? 1.5 : 1
            const phys = moveCategory(mv.type) === "PHYSICAL"
            const off = sStats ? (phys ? sStats.atk : sStats.spc) : 1
            const def = fStats ? (phys ? fStats.def : fStats.spc) : 1
            score = mv.power * eff * stab * (off / Math.max(1, def))
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

/** Choix du REMPLAÇANT à envoyer après un KO (envoi FORCÉ, TOUS niveaux de dresseur). Renvoie l'index du banc
 *  au MEILLEUR matchup face à l'actif adverse : priorité à ENCAISSER ses types (le remplaçant ne doit pas vouloir
 *  re-switcher aussitôt → fin du ping-pong « on renvoie le suivant, il fuit, on renvoie le suivant… »), puis à le
 *  PUNIR (meilleur coup réel). Déterministe (aucun RNG) → sûr côté replay/checksum. -1 si le banc est vide
 *  (le moteur garantit ≥1 vivant avant l'appel). Remplace l'ancien « firstAliveIndex » (= premier dans la liste). */
export function chooseReplacementIndex(team: BattleMon[], foe: BattleMon): number {
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
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
        const score = (1 / Math.max(0.25, incoming)) * 100 + bestOff
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
    const scored = scoreMoves(self, foe)
    if (scored.length === 0) return { kind: "move", moveIndex: 0 } // Lutte (placeholder)

    // --- "hof" (Hall of Fame) : la plus maligne. Dégâts attendus (STAB + bonne stat), ouverture statut,
    //     et un switch UNIQUEMENT face à une faiblesse ×4 qu'on ne peut pas punir (sans yo-yo). ---
    if (level === "hof") {
        const myTypes = getSpecies(self.speciesId)?.types ?? []
        const foeTypes = getSpecies(foe.speciesId)?.types ?? []
        const incomingOnMe = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        const scoredHof = scoreMovesHof(self, foe)
        const myBestEff = Math.max(0, ...scoredHof.map((s) => s.eff))
        // Switch seulement si on est ×4 faible ET incapable de frapper en super-efficace, vers un banc
        // STRICTEMENT plus résistant (anti yo-yo : une fois rentré sur un bon matchup, on cesse de switcher).
        if (incomingOnMe >= 4 && myBestEff < 2) {
            const sw = bestSwitchIndex(team, activeIndex, foe)
            if (sw !== null) {
                const candTypes = getSpecies(team[sw].speciesId)?.types ?? []
                const incomingOnCand = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, candTypes), 1)
                if (incomingOnCand < incomingOnMe && rng.chance(75)) return { kind: "switch", teamIndex: sw }
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
