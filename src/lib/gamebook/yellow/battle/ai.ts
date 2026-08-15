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

// ═══════════════ PILOTES D'ARCHÉTYPE (mur-sweepers / stallers) — IA dédiée ═══════════════
// Certains Daemons ont une identité « mise en place / usure / esquive / soin » que l'IA générique GÂCHE (tous ces
// moves de statut/boost scorés ~18, jamais enchaînés). Ce pilote détecte les RÔLES depuis les moves ÉQUIPÉS (→ marche
// pour les BOSS à kit fixe ET les REFLETS au kit du joueur) puis applique une échelle de priorités commune. Il NE SORT
// JAMAIS de lui-même. Réservé à une WHITELIST d'espèces → n'altère QU'elles. PvE only (équipes IA). Le GARDE-FOU
// d'ENTRÉE (Tonytony DÉF 5 : ne l'envoyer qu'une fois les physiques adverses KO) vit dans chooseReplacementIndex +
// buildHubTeam. Tonytony est un CAS de ce pilote (Éveil Divin snowball + Mirage esquive + Repos).
const TONYTONY_ID = "tonytony"
const ARCHETYPE_PILOTS = new Set([TONYTONY_ID, "sylvebarbe", "torturoche", "omnhippo", "merorem", "ukognos", "megamonarx", "brookhante", "uzumaro", "karmaki"])

/** Mon dont l'offensive est à dominante PHYSIQUE (ATK ≥ SPC) → menace pour un mur à faible DÉF physique. */
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
/** Puissance EFFECTIVE d'un move (gère Patience : dynamicPower "lowHp" → 40 à pleins PV, ~150 quasi K.O.). */
function effPower(self: BattleMon, moveId: string): number {
    const mv = getMove(moveId); if (!mv) return 0
    if (mv.effect?.dynamicPower === "lowHp") {
        const sp = getSpecies(self.speciesId)
        const maxHp = sp ? fullStats(self, sp).hp : Math.max(1, self.currentHp)
        return Math.round(40 + 110 * (1 - self.currentHp / Math.max(1, maxHp)))
    }
    return mv.power
}
/** Dégâts estimés (conservateurs, sans crit) du move `moveId` de `self` sur `foe`. 0 si non-offensif/immunisé. */
function estMoveDamage(self: BattleMon, foe: BattleMon, moveId: string): number {
    const mv = getMove(moveId); if (!mv) return 0
    const power = effPower(self, moveId)
    if (power <= 0) return 0
    const selfSp = getSpecies(self.speciesId), foeSp = getSpecies(foe.speciesId)
    if (!selfSp || !foeSp) return 0
    const eff = typeEffectiveness(mv.type, foeSp.types)
    if (eff === 0) return 0
    const phys = moveCategory(mv.type) === "PHYSICAL"
    const off = phys ? fullStats(self, selfSp).atk : fullStats(self, selfSp).spc
    const fs = fullStats(foe, foeSp)
    const def = phys ? fs.def : (foe.frozenSpd ?? fs.spc)
    return computeDamage({ level: self.level, power, attack: off, defense: def, stab: selfSp.types.includes(mv.type), typeEff: eff, isCrit: false, randomFactor: 0.9 }).damage
}
/** Index du meilleur coup (PP > 0) qui MET KO le foe ce tour, ou -1. */
function bestKoMove(self: BattleMon, foe: BattleMon): number {
    let bi = -1, bd = 0
    self.moves.forEach((s, i) => {
        if (s.pp <= 0) return
        const d = estMoveDamage(self, foe, s.moveId)
        if (d >= foe.currentHp && d > bd) { bd = d; bi = i }
    })
    return bi
}
/** Index du meilleur coup OFFENSIF pour snowballer (évite un 2-tours si on peut mourir pendant la charge). */
function bestDamageMove(self: BattleMon, foe: BattleMon, safe: boolean): number {
    let bi = -1, bs = -1
    self.moves.forEach((s, i) => {
        if (s.pp <= 0) return
        const mv = getMove(s.moveId); if (!mv || effPower(self, s.moveId) <= 0) return
        let d = estMoveDamage(self, foe, s.moveId) * (mv.accuracy > 0 ? mv.accuracy / 100 : 1)
        if (mv.effect?.twoTurn && !safe) d *= 0.1 // charge risquée si on peut mourir avant de frapper
        if (mv.effect?.statChanges?.some((c) => c.target === "self" && c.stages > 0)) d *= 1.05 // boost-en-frappant (Éveil/Éclat) → snowball
        if (d > bs) { bs = d; bi = i }
    })
    return bi
}
const boostsSelf = (moveId: string, stat: string): boolean => {
    const mv = getMove(moveId)
    return !!mv && mv.power <= 0 && !!mv.effect?.statChanges?.some((c) => c.target === "self" && c.stat === stat && c.stages > 0)
}
const findMove = (self: BattleMon, pred: (moveId: string) => boolean): number =>
    self.moves.findIndex((s) => s.pp > 0 && pred(s.moveId))

/** Pilote de coup d'ARCHÉTYPE → moveIndex, ou null si le kit ÉQUIPÉ n'a aucune mécanique spéciale (→ IA générique).
 *  Échelle : finir > soin d'urgence > esquive > usure/statut > graine > neutraliser un physique > setup offensif >
 *  soin d'entretien > snowball. NE renvoie JAMAIS de switch. */
function chooseArchetypeMove(self: BattleMon, foe: BattleMon): number | null {
    const iHeal = findMove(self, (m) => (getMove(m)?.effect?.healPct ?? 0) > 0)
    const iEva = findMove(self, (m) => boostsSelf(m, "eva"))
    const iAtk = findMove(self, (m) => boostsSelf(m, "atk"))
    const iSpc = findMove(self, (m) => boostsSelf(m, "spc"))
    const iDef = findMove(self, (m) => boostsSelf(m, "def"))
    const iToxic = findMove(self, (m) => getMove(m)?.power === 0 && getMove(m)?.effect?.inflictStatus === "TOXIC")
    const iSleep = findMove(self, (m) => getMove(m)?.power === 0 && getMove(m)?.effect?.inflictStatus === "SLEEP")
    const iSeed = findMove(self, (m) => getMove(m)?.effect?.inflictVolatile === "SEEDED")
    const iDebuff = findMove(self, (m) => { const mv = getMove(m); return !!mv && mv.power <= 0 && !!mv.effect?.statChanges?.some((c) => c.target === "target" && c.stages < 0) })
    if ([iHeal, iEva, iAtk, iSpc, iDef, iToxic, iSleep, iSeed, iDebuff].every((i) => i < 0)) return null // kit banal → IA générique

    const selfSp = getSpecies(self.speciesId)
    const stats = selfSp ? fullStats(self, selfSp) : null
    const maxHp = stats ? stats.hp : Math.max(1, self.currentHp)
    const frac = self.currentHp / Math.max(1, maxHp)
    const eva = self.stages?.eva ?? 0
    const physAttacker = stats ? stats.atk >= stats.spc : false
    const foePhys = isPhysicalThreat(foe)
    const canDodge = !foeHasSureHit(foe)
    const foeSp = getSpecies(foe.speciesId)
    const foeFresh = foe.currentHp >= (foeSp ? fullStats(foe, foeSp).hp : foe.currentHp) * 0.9
    const foeTypes = foeSp?.types ?? []
    const foeNeutralized = foe.status === "SLEEP" || foe.status === "FREEZE"
    const safe = !foePhys || (eva >= 4 && canDodge) || foeNeutralized
    // Win-con « bas PV » (Patience, dynamicPower lowHp) : NE PAS se soigner tant qu'un tel coup grimpe (PV bas = arme).
    const hasLowHpNuke = self.moves.some((s) => s.pp > 0 && getMove(s.moveId)?.effect?.dynamicPower === "lowHp")

    // 1) FINIR
    const ko = bestKoMove(self, foe)
    if (ko >= 0) return ko
    // 2) SOIN d'urgence (PV bas ET tour sûr) — sauf win-con bas-PV vivante.
    if (iHeal >= 0 && frac < 0.5 && safe && !hasLowHpNuke) return iHeal
    // 3) SURVIE : monter l'esquive face à un physique esquivable, tant qu'on n'est pas au plafond.
    if (iEva >= 0 && foePhys && canDodge && eva < 6) return iEva
    // 4) USURE / DISABLE sur un foe FRAIS et sans statut : Toxik (si empoisonnable) > Sommeil.
    if (foe.status === "NONE") {
        if (iToxic >= 0 && !foeTypes.includes("POISON") && !foeTypes.includes("METAL")) return iToxic
        if (iSleep >= 0 && foeFresh) return iSleep
    }
    // 5) VAMPIGRAINE (drain passif) si pas déjà posée et cible non-Plante.
    if (iSeed >= 0 && !foe.volatiles?.SEEDED && !foeTypes.includes("PLANTE")) return iSeed
    // 6) NEUTRALISER un physique : débuff (Voile) puis +DÉF.
    if (iDebuff >= 0 && foePhys && foeFresh) return iDebuff
    if (iDef >= 0 && foePhys && (self.stages?.def ?? 0) < 2) return iDef
    // 7) MISE EN PLACE offensive quand c'est SÛR et pas au plafond (boost de la stat d'attaque dominante).
    if (safe) {
        if (physAttacker && iAtk >= 0 && (self.stages?.atk ?? 0) < 4) return iAtk
        if (!physAttacker && iSpc >= 0 && (self.stages?.spc ?? 0) < 4) return iSpc
    }
    // 8) SOIN d'entretien (PV bas, hors win-con bas-PV) — mieux que mourir sans rien faire.
    if (iHeal >= 0 && frac < 0.4 && !hasLowHpNuke) return iHeal
    // 9) SNOWBALL : meilleur coup offensif.
    const atk = bestDamageMove(self, foe, safe)
    return atk >= 0 ? atk : null
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
    // PILOTES D'ARCHÉTYPE (Tonytony, Sylvebarbe, Merorem, Ukognos, MégamonarX…) : stratégie dédiée (setup/usure/
    //   esquive/soin) et JAMAIS de switch volontaire (restent en jeu). S'applique à tous les niveaux d'IA.
    if (ARCHETYPE_PILOTS.has(self.speciesId)) {
        const ti = chooseArchetypeMove(self, foe)
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
            // Se replie dès un matchup PERDANT (faiblesse ×2, plus seulement ×4) qu'on ne peut pas punir en retour,
            //   vers un banc STRICTEMENT plus résistant. DÉTERMINISTE : plus de rng.chance(75) — le miroir ne « rate »
            //   plus jamais son repli (fini le sweep facile). L'anti yo-yo (incomingOnCand < incomingOnMe) borne le va-et-vient.
            if (incomingOnMe >= 2 && myBestEff < 2) {
                const sw = bestSwitchIndex(team, activeIndex, foe)
                if (sw !== null) {
                    const candTypes = getSpecies(team[sw].speciesId)?.types ?? []
                    const incomingOnCand = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, candTypes), 1)
                    if (incomingOnCand < incomingOnMe) return { kind: "switch", teamIndex: sw }
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
