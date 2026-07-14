// src/lib/gamebook/yellow/create/nemesisArchitect.ts
//
// PROTOCOLE NÉMÉSIS — « l'architecte ». Pur & déterministe. Pour un Daemon donné (création de joueur ou espèce
// du pool), calcule le CONTRE optimal, PROUVÉ correct sur les types via la table réelle :
//   1. TYPES  : un typage qui RÉSISTE les STAB effectifs du joueur ET le frappe en super-efficace DANS SA STAT
//               DÉFENSIVE LA PLUS FAIBLE (règle Gen-1 : phys tape la DÉF, spé tape la SPÉ → on vise la plus basse).
//               → évite le piège classique (frapper ×2 en spécial droit dans un mur spécial : dégâts gâchés).
//   2. STATS  : archétype INVERSÉ — stat offensive alignée sur la catégorie qui perce, VIT « plus rapide mais
//               pas trop », reste dumpé. BST calée sur le joueur (zéro power-creep).
//   3. LEARNSET: STAB de la BONNE catégorie + couverture + un brise-mur (set-up / statut / priorité).
//   4. POOL   : si une espèce EXISTANTE contre déjà bien → on la remonte (1er choix) + un némésis bespoke (2e choix).
//
// Aucune dépendance UI/combat : lisible par un script dev (cf. scripts/_nemesis-architect.ts) comme par buildNemesis.

import { POKE_TYPES, type PokeType, type StatKey, type SpeciesData } from "../battle/types"
import { typeEffectiveness, moveCategory } from "../battle/typeChart"
import { SPECIES } from "../data/species"
import { MOVES } from "../data/moves"

type Cat = "PHYSICAL" | "SPECIAL"
const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const BST = (s: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + (s[k] ?? 0), 0)
/** Stat offensive utilisée par une catégorie (Gen-1 : phys=ATQ, spé=SPÉ). */
const offStatOf = (c: Cat): StatKey => (c === "PHYSICAL" ? "atk" : "spc")
/** Stat DÉFENSIVE encaissée par une catégorie (Gen-1 : phys→DÉF, spé→SPÉ). */
const defStatOf = (c: Cat): StatKey => (c === "PHYSICAL" ? "def" : "spc")

export interface DaemonProfile {
    name?: string
    types: PokeType[]                 // types du STADE FINAL
    stats: Record<StatKey, number>    // baseStats du STADE FINAL
}

export interface StabThreat { type: PokeType; category: Cat; threat: number } // threat = stat offensive de cette catégorie

export interface CounterTyping {
    types: PokeType[]
    resistMult: number       // pire multiplicateur ENCAISSÉ des STAB réels du joueur (≤1 = résiste)
    offenseType: PokeType    // meilleur type offensif du contre CONTRE le joueur
    offenseMult: number      // efficacité (0/0.5/1/2/4) de offenseType vs le joueur
    offenseCat: Cat
    hitsWeakDefense: boolean  // la catégorie offensive tape-t-elle la stat défensive la plus faible du joueur ?
    score: number
    verdict: string
}

export interface PoolCounter {
    id: string; name: string; types: PokeType[]; bst: number
    resistMult: number; offenseType: PokeType; offenseMult: number; offenseCat: Cat
    fasterThanPlayer: boolean; usableOffense: boolean // le pool-mon a-t-il la stat pour exploiter son STAB efficace ?
    score: number; flags: string[]                    // runThreeOnly / exclusive / etc.
}

export interface NemesisPlan {
    player: DaemonProfile
    liveStabs: StabThreat[]            // STAB réels du joueur, triés par menace
    weakDefense: Cat                   // catégorie à privilégier pour PERCER (tape la stat def la + basse)
    topTypings: CounterTyping[]        // meilleurs typages bespoke, classés
    poolCounters: PoolCounter[]        // espèces existantes qui contrent déjà, classées
    chosen: { types: PokeType[]; stats: Record<StatKey, number>; learnset: Array<{ level: number; moveId: string }> }
    recommendation: string
}

// ───────── 1. PROFIL OFFENSIF / DÉFENSIF DU JOUEUR ─────────

/** STAB « réels » du joueur = ses types, avec la menace = stat offensive de leur catégorie. Triés menace desc. */
export function liveStabs(p: DaemonProfile): StabThreat[] {
    return p.types
        .map((t) => { const category = moveCategory(t); return { type: t, category, threat: p.stats[offStatOf(category)] } })
        .sort((a, b) => b.threat - a.threat)
}

/** Catégorie qui PERCE le joueur : celle qui tape sa stat défensive la plus BASSE (DÉF vs SPÉ). Égalité → physique. */
export function weakDefenseCategory(stats: Record<StatKey, number>): Cat {
    return stats.def <= stats.spc ? "PHYSICAL" : "SPECIAL"
}

/** STAB dont la menace ≥ 60% de la plus forte (les « vraies » armes — on ignore un STAB anecdotique sur une stat faible). */
function relevantStabs(stabs: StabThreat[]): StabThreat[] {
    const max = stabs.length ? stabs[0].threat : 0
    return stabs.filter((s) => s.threat >= 0.6 * max)
}

// ───────── 2. SCORE D'UN TYPAGE-CONTRE ─────────

export function scoreTyping(candidate: PokeType[], p: DaemonProfile): CounterTyping {
    const stabs = relevantStabs(liveStabs(p))
    const weak = weakDefenseCategory(p.stats)
    // Défense : pire multiplicateur encaissé des STAB réels du joueur (on veut ≤1, idéalement 0.5/0.25).
    const resistMult = stabs.reduce((worst, s) => Math.max(worst, typeEffectiveness(s.type, candidate)), 0) || 1
    // Offense : pour chaque type du contre, efficacité vs le joueur, bonifiée si la catégorie tape la stat def faible.
    let best = { type: candidate[0], mult: 0, cat: moveCategory(candidate[0]), value: -1 }
    for (const a of candidate) {
        const mult = typeEffectiveness(a, p.types)
        const cat = moveCategory(a)
        const value = mult * (cat === weak ? 1 : 0.4) // un STAB efficace mais dans le mauvais mur ne « compte » qu'à 40%
        if (value > best.value) best = { type: a, mult, cat, value }
    }
    // Score global : offense utile / résistance encaissée (0.5 double, 2 divise). Un contre faible (×2 encaissé) chute.
    const score = best.value / resistMult
    const hitsWeak = best.cat === weak
    const verdict =
        best.mult >= 2 && hitsWeak && resistMult <= 0.5 ? "HARD-COUNTER (résiste + perce le mur faible)" :
        best.mult >= 2 && hitsWeak && resistMult >= 2 ? "⚠️ perce mais FAIBLE au STAB adverse (×2 encaissé)" :
        best.mult >= 2 && hitsWeak ? "solide (perce le mur faible, neutre défensivement)" :
        best.mult >= 2 && !hitsWeak ? "piège : ×2 mais dans le mur FORT (dégâts gâchés)" :
        resistMult <= 0.5 ? "mur défensif (résiste mais ne perce pas)" : "médiocre"
    return { types: candidate, resistMult, offenseType: best.type, offenseMult: best.mult, offenseCat: best.cat, hitsWeakDefense: hitsWeak, score, verdict }
}

/** Énumère tous les typages 1-type et 2-types, score, renvoie le top N (dédupliqué, trié). */
export function bestCounterTypings(p: DaemonProfile, topN = 6): CounterTyping[] {
    const cands: PokeType[][] = []
    for (let i = 0; i < POKE_TYPES.length; i++) {
        cands.push([POKE_TYPES[i]])
        for (let j = i + 1; j < POKE_TYPES.length; j++) cands.push([POKE_TYPES[i], POKE_TYPES[j]])
    }
    return cands.map((c) => scoreTyping(c, p)).sort((a, b) => b.score - a.score).slice(0, topN)
}

// ───────── 3. STATS DU CONTRE (archétype inversé) ─────────

/** Spread de stats proposé : archétype inversé. Stat offensive = catégorie qui perce ; VIT « plus rapide mais pas
 *  trop » que le joueur ; le reste dumpé (glass-breaker). BST calée sur le joueur (zéro power-creep). À AJUSTER. */
export function counterStatSpread(p: DaemonProfile, offenseCat: Cat): Record<StatKey, number> {
    const targetBst = BST(p.stats)
    const off = offStatOf(offenseCat)          // atk (physique) ou spc (spécial)
    const otherOff: StatKey = off === "atk" ? "spc" : "atk" // dump (et, si off=atk, c'est aussi la déf spé → frêle)
    // VIT : plus rapide que le joueur, borné (≤ ~125, +15 mini). Le contre frappe le premier sans être increvable.
    const spe = Math.min(125, Math.max(p.stats.spe + 15, Math.round(p.stats.spe * 1.2)))
    // Répartition du reste (targetBst − off − spe) sur hp/def/otherOff, offensif prioritaire.
    const w: Record<StatKey, number> = { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }
    w[off] = Math.round(targetBst * 0.27)
    w.spe = spe
    let rest = targetBst - w[off] - w.spe
    if (rest < 0) { w[off] += rest; rest = 0 } // sécurité si le joueur est ultra-rapide
    // hp 45% du reste, def 33%, otherOff (dump/def spé) 22%.
    w.hp = Math.round(rest * 0.45)
    w.def = Math.round(rest * 0.33)
    w[otherOff] = Math.max(1, targetBst - w[off] - w.spe - w.hp - w.def) // ferme la somme exactement
    return w
}

// ───────── 4. LEARNSET DU CONTRE ─────────

interface MoveLite { id: string; type: PokeType; power: number; cat: Cat; status: boolean; effect: any }
function moveLite(id: string): MoveLite | null {
    const m = MOVES[id]; if (!m) return null
    return { id, type: m.type, power: m.power ?? 0, cat: (m as any).category ?? moveCategory(m.type), status: (m.power ?? 0) === 0, effect: (m as any).effect ?? null }
}
const allMovesOfType = (t: PokeType): MoveLite[] =>
    Object.keys(MOVES).map(moveLite).filter((m): m is MoveLite => !!m && m.type === t)

/** Learnset proposé : STAB de la BONNE catégorie (montée en puissance) + couverture 2e type + un brise-mur
 *  (set-up universel Danse du Fauve, ou statut « spores/hypnose » si dispo) + une priorité. Ids réels de MOVES. */
export function suggestLearnset(types: PokeType[], offenseCat: Cat, offenseType: PokeType): Array<{ level: number; moveId: string }> {
    const ls: Array<{ level: number; moveId: string }> = []
    const has = (id: string) => !!MOVES[id]
    const push = (level: number, id: string) => { if (has(id) && !ls.some((l) => l.moveId === id)) ls.push({ level, moveId: id }) }
    // STAB principal (type qui perce) — attaques damage, triées par puissance croissante → étalées en niveaux.
    const stab = allMovesOfType(offenseType).filter((m) => !m.status && m.cat === offenseCat).sort((a, b) => a.power - b.power)
    const coverageType = types.find((t) => t !== offenseType) ?? offenseType
    const cover = allMovesOfType(coverageType).filter((m) => !m.status).sort((a, b) => a.power - b.power)
    // Brise-mur : un STATUT dispo dans les types (sommeil/paralysie) sinon set-up universel Danse du Fauve.
    const statusBreakers = [...allMovesOfType(types[0]), ...(types[1] ? allMovesOfType(types[1]) : [])]
        .filter((m) => m.status && m.effect && (m.effect.inflictStatus === "SLEEP" || m.effect.paralyze || m.effect.inflictStatus === "PARALYSIS"))
    const levels = [1, 5, 12, 18, 24, 30, 38, 46, 54]
    let li = 0
    push(1, "charge")
    if (stab[0]) push(levels[li++] ?? 8, stab[0].id)               // 1er STAB faible
    if (has("vive_attaque")) push(levels[li++] ?? 14, "vive_attaque") // priorité
    if (statusBreakers[0]) push(levels[li++] ?? 20, statusBreakers[0].id) // sommeil/para signature
    if (cover[Math.floor(cover.length / 2)]) push(levels[li++] ?? 26, cover[Math.floor(cover.length / 2)].id) // couverture mid
    if (has("danse_fauve")) push(levels[li++] ?? 32, "danse_fauve")  // set-up ATQ+VIT universel
    if (stab[Math.floor(stab.length / 2)]) push(levels[li++] ?? 40, stab[Math.floor(stab.length / 2)].id) // STAB mid
    if (stab[stab.length - 1]) push(66, stab[stab.length - 1].id)   // capstone STAB (le plus fort)
    return ls.sort((a, b) => a.level - b.level)
}

// ───────── 5. SCAN DU POOL (contre existant) ─────────

const isTerminal = (s: SpeciesData) => !s.evolution
/** Le pool-mon peut-il EXPLOITER son meilleur STAB efficace ? (a-t-il la stat de la bonne catégorie ≥ l'autre ?) */
function usableOffense(s: SpeciesData, offType: PokeType): boolean {
    const cat = moveCategory(offType)
    return s.baseStats[offStatOf(cat)] >= s.baseStats[cat === "PHYSICAL" ? "spc" : "atk"] - 10
}

export function findPoolCounters(p: DaemonProfile, topN = 5): PoolCounter[] {
    const stabs = relevantStabs(liveStabs(p))
    const weak = weakDefenseCategory(p.stats)
    const out: PoolCounter[] = []
    for (const s of Object.values(SPECIES)) {
        if (!isTerminal(s)) continue
        if (s.types.some((t) => p.types.includes(t)) && s.types.length === p.types.length && p.types.every((t) => s.types.includes(t))) continue // pas le joueur lui-même
        const resistMult = stabs.reduce((w, st) => Math.max(w, typeEffectiveness(st.type, s.types)), 0) || 1
        let best = { type: s.types[0], mult: 0, cat: moveCategory(s.types[0]), value: -1 }
        for (const a of s.types) {
            const mult = typeEffectiveness(a, p.types); const cat = moveCategory(a)
            const value = mult * (cat === weak ? 1 : 0.4)
            if (value > best.value) best = { type: a, mult, cat, value }
        }
        const usable = usableOffense(s, best.type)
        const faster = s.baseStats.spe > p.stats.spe
        // Score pool : offense utile (bonifiée si exploitable) / résistance encaissée, × petit bonus de bulk/vitesse.
        const bulk = (s.baseStats.hp + s.baseStats.def + s.baseStats.spc) / 300
        const score = (best.value * (usable ? 1 : 0.5)) / resistMult * (0.7 + 0.3 * Math.min(1.4, bulk))
        const flags: string[] = []
        if ((s as any).exclusive) flags.push("exclusif")
        if ((s as any).runThreeOnly) flags.push("run3")
        if ((s as any).runTwoOnly) flags.push("run2")
        out.push({ id: s.id, name: s.name, types: s.types, bst: BST(s.baseStats), resistMult, offenseType: best.type, offenseMult: best.mult, offenseCat: best.cat, fasterThanPlayer: faster, usableOffense: usable, score, flags })
    }
    return out.filter((c) => c.offenseMult >= 2 && c.resistMult <= 1).sort((a, b) => b.score - a.score).slice(0, topN)
}

// ───────── 6. ORCHESTRATION ─────────

export function architectNemesis(p: DaemonProfile): NemesisPlan {
    const stabs = liveStabs(p)
    const weak = weakDefenseCategory(p.stats)
    const topTypings = bestCounterTypings(p, 6)
    const pool = findPoolCounters(p, 5)
    const chosenTyping = topTypings[0]
    const stats = counterStatSpread(p, chosenTyping.offenseCat)
    const learnset = suggestLearnset(chosenTyping.types, chosenTyping.offenseCat, chosenTyping.offenseType)
    const strongPool = pool.find((c) => c.resistMult <= 1 && c.offenseMult >= 2 && c.usableOffense)
    const recommendation = strongPool
        ? `Un contre EXISTE DÉJÀ dans le pool : ${strongPool.name} (${strongPool.types.join("/")}) — le fielder directement (1er choix). ` +
          `2e choix (bespoke) : ${chosenTyping.types.join("/")}, ${chosenTyping.verdict}.`
        : `Aucun contre idéal dans le pool. Créer un bespoke : ${chosenTyping.types.join("/")} — ${chosenTyping.verdict}.`
    return { player: p, liveStabs: stabs, weakDefense: weak, topTypings, poolCounters: pool, chosen: { types: chosenTyping.types, stats, learnset }, recommendation }
}

/** Construit un DaemonProfile depuis une espèce du pool (par id) — pratique pour tester le contre d'un Daemon existant. */
export function profileFromSpecies(id: string): DaemonProfile | null {
    const s = SPECIES[id]; if (!s) return null
    return { name: s.name, types: [...s.types], stats: { ...s.baseStats } }
}
