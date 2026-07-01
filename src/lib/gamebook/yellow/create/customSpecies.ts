// src/lib/gamebook/yellow/create/customSpecies.ts
//
// CRÉATION DE DAEMON (post-Ligue) — KERNEL pur & déterministe. Transforme les choix du joueur (CustomSpec)
// en une LIGNÉE d'espèces JOUABLES (SpeciesData[]), équilibrée et légale pour le moteur. Aucun art : le
// sprite est un placeholder « mystère » (Sartay le remplace plus tard). 100 % testable, zéro dépendance UI/DB.
//
// Garde-fous (pour que le starter ne soit pas « déconnant ») :
//  • BST plafonné au BST d'un STARTER FORT (~435), modulé par la courbe d'éclosion (early/mid/late).
//  • Le joueur distribue les stats du STADE FINAL → le wizard met les stades base/inter à l'échelle (mêmes ratios).
//  • 1 seul changement de type max sur toute la lignée.
//  • Movepool tiéré par niveau (un niv 5 ne peut pas apprendre Ultralaser) ; attaques piochées dans moves.ts.

import type { SpeciesData, PokeType, StatKey, MoveData } from "../battle/types"
import { POKE_TYPES } from "../battle/types"
import { MOVES, getMove } from "../data/moves"
import { moveCategory, typeEffectiveness } from "../battle/typeChart"
import { SPECIES } from "../data/species"

export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
export const STAT_LABEL: Record<StatKey, string> = { hp: "PV", atk: "Attaque", def: "Défense", spe: "Vitesse", spc: "Spécial" }

/** BST d'un STARTER FORT (final), socle du plafond avant modulation par la courbe. */
export const BASE_FINAL_BST = 435
/** Stat minimale par caractéristique sur le stade final (interdit les profils 0/dump total). */
export const MIN_FINAL_STAT = 15
/** Stat maximale par caractéristique (anti mono-stat ridicule). */
export const MAX_FINAL_STAT = 160

/** Courbe d'ÉCLOSION : tôt = monte vite mais plafond plus bas · tard = lent mais plafond plus haut (risk/reward). */
export type Bloomer = "early" | "mid" | "late"
export interface BloomerCfg { label: string; hint: string; bstMult: number; growthRate: SpeciesData["growthRate"]; evo3: [number, number]; evo2: [number] }
export const BLOOMERS: Record<Bloomer, BloomerCfg> = {
    early: { label: "Éclosion précoce", hint: "Monte VITE, plafond plus bas (−10 % BST)", bstMult: 0.90, growthRate: "medium_fast", evo3: [12, 28], evo2: [16] },
    mid: { label: "Éclosion moyenne", hint: "Équilibré (BST de référence)", bstMult: 1.0, growthRate: "medium_slow", evo3: [16, 34], evo2: [22] },
    late: { label: "Éclosion tardive", hint: "Monte LENTEMENT, plafond plus haut (+12 % BST)", bstMult: 1.12, growthRate: "slow", evo3: [22, 40], evo2: [30] },
}
/** Plafond ABSOLU de BST : la plus forte finale NON-LÉGENDAIRE existante (S-tier, jamais « au-dessus de tout »). */
export const MAX_BUDGET = 480
/** Budget de BST distribuable sur le STADE FINAL selon la courbe (plafonné au S-tier existant). */
export function bloomerBudget(b: Bloomer): number { return Math.min(MAX_BUDGET, Math.round(BASE_FINAL_BST * BLOOMERS[b].bstMult)) }

/** Ratios de BST des stades par rapport au final (calqués sur les vraies lignées : base ≈ 56 % du final). */
const STAGE_RATIOS: Record<number, number[]> = { 1: [1], 2: [0.62, 1], 3: [0.56, 0.78, 1] }

/** 10 slots d'apprentissage : 2 attaques au niv 5, puis 1 tous les ~6 niveaux (dex réel : 8-14 distinctes). */
export const LEARN_LEVELS = [5, 5, 12, 18, 24, 30, 36, 42, 48, 54]
/** Nb max d'attaques STAB (dex réel : moy 8) et de COUVERTURE (hors STAB/Normal) dans un learnset. */
export const MAX_STAB = 8
export const MAX_COVERAGE = 2
/** Part minimale d'attaques de STATUT (dex réel : ~22 % ≈ 1 sur 4,5). */
export const MIN_STATUS_RATIO = 0.25
/** Part minimale d'attaques offensives COMMUNES/RÉPANDUES (anti cherry-pick de raretés). */
export const MIN_COMMON_RATIO = 0.5

/** Puissance MAX d'une attaque OFFENSIVE apprenable à ce niveau. Seuils CALIBRÉS sur la progression réelle
 *  du dex (hors kit inné) : 65 tôt → 150 aux ultimes. cf. dex-analysis. */
export function maxPowerForLevel(level: number): number {
    if (level <= 9) return 65
    if (level <= 18) return 75
    if (level <= 27) return 90
    if (level <= 36) return 110
    if (level <= 45) return 120
    return 150
}

// ── RARETÉ (nb d'espèces qui apprennent l'attaque, calculé sur SPECIES ; mémoïsé) ──
let _learnCount: Map<string, number> | null = null
function learnCountMap(): Map<string, number> {
    if (_learnCount) return _learnCount
    const m = new Map<string, number>()
    for (const s of Object.values(SPECIES)) { const seen = new Set<string>(); for (const l of s.learnset) if (!seen.has(l.moveId)) { seen.add(l.moveId); m.set(l.moveId, (m.get(l.moveId) ?? 0) + 1) } }
    _learnCount = m; return m
}
export type Rarity = "commune" | "répandue" | "rare" | "exceptionnelle"
export function moveLearnCount(id: string): number { return learnCountMap().get(id) ?? 0 }
/** Apprise par ≥1 espèce du dex ? (sinon = CT-only / inexistante → JAMAIS proposée en learnset). */
export function isLearnableMove(id: string): boolean { return moveLearnCount(id) > 0 }
export function moveRarity(id: string): Rarity {
    const n = moveLearnCount(id)
    return n >= 8 ? "commune" : n >= 4 ? "répandue" : n >= 2 ? "rare" : "exceptionnelle"
}

// ── ATTAQUES OFFENSIVES vs STATUT (Draco-Rage & co : power 0 mais dégâts fixes → offensives) ──
export function isDamagingMove(m: MoveData): boolean { return m.power > 0 || !!m.effect?.fixedDamage }
export function effectivePower(m: MoveData): number { return m.power > 0 ? m.power : (m.effect?.fixedDamage ?? 0) }

// ── FORCE des attaques de STATUT (1 faible → 4 fort) → proposées PROGRESSIVEMENT (débuff adverse tôt,
//    +/−1 puis +/−2 sur soi, sommeil/soin tard). cf. classement calculé. ──
export function statusTier(m: MoveData): 1 | 2 | 3 | 4 {
    const e = m.effect
    if (!e) return 1
    if (e.restSleep || e.healPct) return 4                       // Repos, soins → le plus fort
    if (e.inflictStatus === "SLEEP") return e.speedScaledAcc ? 4 : 3
    if (e.inflictStatus === "TOXIC") return 3
    if (e.inflictStatus) return 2                                // paralysie / brûlure garanties
    if (e.statChanges?.length) {
        const mag = Math.max(...e.statChanges.map((c) => Math.abs(c.stages)))
        if (mag >= 2) return 3                                   // +2 (Danse-Lames, Carapace, Mirage)
        if (e.statChanges.length > 1) return 2                   // multi-stat
        return e.statChanges.some((c) => c.target === "self" && c.stages > 0) ? 2 : 1 // +1 soi = 2 · −1 adv = 1
    }
    return 2 // vampigraine, onde folie, brume sporale…
}
/** Palier de force de statut MAX proposable à ce niveau (progression). */
export function statusTierCapForLevel(level: number): number {
    if (level < 18) return 1
    if (level < 27) return 2
    if (level < 40) return 3
    return 4
}

// ── COHÉRENCE DE TYPE (dex-like + anti-patch) : STAB + Normal toujours ; couverture = tout SAUF les
//    types dont on est FAIBLE (on ne « patche » pas sa faiblesse), et bornée à MAX_COVERAGE moves. ──
export function weaknessTypes(types: PokeType[]): PokeType[] { return POKE_TYPES.filter((t) => typeEffectiveness(t, types) >= 2) }
export function allowedOffensiveTypes(types: PokeType[]): Set<PokeType> {
    const weak = new Set(weaknessTypes(types))
    const out = new Set<PokeType>(["NORMAL", ...types])
    for (const t of POKE_TYPES) if (!weak.has(t)) out.add(t)
    return out
}
export function isStabMove(id: string, types: PokeType[]): boolean { const m = getMove(id); return !!m && isDamagingMove(m) && types.includes(m.type) }
export function isCoverageMove(id: string, types: PokeType[]): boolean { const m = getMove(id); return !!m && isDamagingMove(m) && m.type !== "NORMAL" && !types.includes(m.type) }

/** Fiche complète d'une attaque pour le picker (toutes les infos pour choisir en connaissance de cause). */
export interface MoveCardInfo { id: string; name: string; type: PokeType; cat: "PHYS" | "SPÉ" | "STATUT"; power: number; accuracy: number; pp: number; rarity: Rarity; stab: boolean; coverage: boolean; statusTier?: number; effect: string }
export function moveCard(id: string, types: PokeType[]): MoveCardInfo | null {
    const m = getMove(id); if (!m) return null
    const dmg = isDamagingMove(m)
    return {
        id, name: m.name, type: m.type,
        cat: !dmg ? "STATUT" : moveCategory(m.type) === "PHYSICAL" ? "PHYS" : "SPÉ",
        power: effectivePower(m), accuracy: m.accuracy, pp: m.pp,
        rarity: moveRarity(id), stab: isStabMove(id, types), coverage: isCoverageMove(id, types),
        statusTier: dmg ? undefined : statusTier(m), effect: effectSummary(m),
    }
}
function effectSummary(m: MoveData): string {
    const e = m.effect; if (!e) return m.power > 0 ? "" : "—"
    if (e.adaptiveStab) return "type & catégorie adaptatifs"
    if (e.fixedDamage) return `${e.fixedDamage} PV fixes`
    if (e.healPct) return `soigne ${e.healPct}% PV`
    if (e.restSleep) return "soigne + s'endort"
    if (e.inflictStatus) return `inflige ${e.inflictStatus}${e.chance && e.chance < 100 ? ` (${e.chance}%)` : ""}`
    if (e.statChanges?.length) return e.statChanges.map((c) => `${c.stat} ${c.stages > 0 ? "+" : ""}${c.stages}${c.target === "self" ? " (soi)" : " (adv)"}`).join(", ")
    if (e.recoilPct) return `recul ${e.recoilPct}%`
    if (e.drainPct) return `vol de PV ${e.drainPct}%`
    if (e.multiHit) return `frappe ${e.multiHit[0]}-${e.multiHit[1]}×`
    if (e.highCrit) return "taux de crit élevé"
    if (e.sureHit) return "ne rate jamais"
    return ""
}

// Placeholders jamais sélectionnables (Lutte etc.). Les CT-only sont déjà exclues par isLearnableMove.
const MOVE_DENYLIST = new Set(["struggle", "lutte"])

/**
 * Attaques ACCESSIBLES pour un slot donné (lignée de types + niveau) : uniquement des attaques réellement
 * apprises par ≥1 espèce (pas de CT-only), cohérentes en type (STAB + Normal + couverture hors faiblesse),
 * offensives sous le cap de puissance du niveau, statuts sous le cap de FORCE du niveau (progression).
 */
export function moveOptionsFor(lineTypes: PokeType[], level: number): string[] {
    const maxP = maxPowerForLevel(level)
    const statusCap = statusTierCapForLevel(level)
    const allowed = allowedOffensiveTypes(lineTypes)
    const out: string[] = []
    for (const m of Object.values(MOVES)) {
        if (MOVE_DENYLIST.has(m.id)) continue
        if (!isLearnableMove(m.id)) continue          // pas de CT-only / inexistante
        if (isDamagingMove(m)) {
            if (!allowed.has(m.type)) continue        // cohérence dex-like (anti-patch)
            if (effectivePower(m) <= maxP) out.push(m.id)
        } else {
            if (statusTier(m) <= statusCap) out.push(m.id) // statut progressif (tout type de statut permis)
        }
    }
    // Tri : STAB d'abord, puis par puissance décroissante (les statuts en fin, par force).
    return out.sort((a, b) => {
        const ma = getMove(a)!, mb = getMove(b)!
        const sa = lineTypes.includes(ma.type) && isDamagingMove(ma) ? 1 : 0
        const sb = lineTypes.includes(mb.type) && isDamagingMove(mb) ? 1 : 0
        if (sa !== sb) return sb - sa
        return effectivePower(mb) - effectivePower(ma)
    })
}
/** Options SÉPARÉES par nature, pour un picker en fiches (offensives triées par puissance · statuts par force). */
export function slotOptions(lineTypes: PokeType[], level: number): { offensive: string[]; status: string[] } {
    const all = moveOptionsFor(lineTypes, level)
    return {
        offensive: all.filter((id) => isDamagingMove(getMove(id)!)),
        status: all.filter((id) => !isDamagingMove(getMove(id)!)).sort((a, b) => statusTier(getMove(a)!) - statusTier(getMove(b)!)),
    }
}

/** Learnset PAR DÉFAUT valide (respecte les règles de composition) : 3 statuts en slots mid/late,
 *  offensives communes/STAB ailleurs, sans doublon. Sert de point de départ au wizard. */
export function suggestLearnset(lineTypes: PokeType[]): Array<{ level: number; moveId: string }> {
    const used = new Set<string>()
    const pick = (ids: string[]) => { for (const id of ids) if (!used.has(id)) { used.add(id); return id } return ids[0] ?? "" }
    return LEARN_LEVELS.map((lvl, i) => {
        const { offensive, status } = slotOptions(lineTypes, lvl)
        if (status.length && (i === 3 || i === 6 || i === 8)) return { level: lvl, moveId: pick(status) }
        const common = offensive.filter((id) => { const r = moveRarity(id); return r === "commune" || r === "répandue" })
        return { level: lvl, moveId: pick(common.length ? common : offensive) }
    })
}

// ───────── Spécification saisie par le joueur ─────────
export interface CustomSpec {
    name: string                 // nom proposé (Sartay peut peaufiner)
    da: string                   // direction artistique : 1-2 phrases (sert au sprite + description)
    character: string            // caractère / personnalité
    stages: 1 | 2 | 3
    bloomer: Bloomer
    finalTypes: PokeType[]                       // 1 ou 2 types du STADE FINAL
    typeChange?: { atStage: 2 | 3; types: PokeType[] } // 1 changement MAX : les stades < atStage portent ces types
    finalStats: Record<StatKey, number>          // distribution du STADE FINAL (somme ≤ budget)
    learnset: Array<{ level: number; moveId: string }> // 1 pick par slot de LEARN_LEVELS
}

/** Types d'un stade donné (1-indexé) compte tenu de l'éventuel changement de type. */
export function typesAtStage(spec: CustomSpec, stage: number): PokeType[] {
    if (spec.typeChange && stage < spec.typeChange.atStage) return spec.typeChange.types
    return spec.finalTypes
}
/** Union de tous les types de la lignée (pour filtrer les attaques compatibles). */
export function lineTypes(spec: CustomSpec): PokeType[] {
    const s = new Set<PokeType>(spec.finalTypes)
    spec.typeChange?.types.forEach((t) => s.add(t))
    return [...s]
}

const BST = (st: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + st[k], 0)

// ───────── Validation (renvoie la liste des erreurs ; vide = OK) ─────────
export function validateSpec(spec: CustomSpec): string[] {
    const e: string[] = []
    if (!spec.name.trim()) e.push("Donne un nom à ton Daemon.")
    if (spec.da.trim().length < 10) e.push("Décris ton Daemon (direction artistique) en une phrase au moins.")
    if (![1, 2, 3].includes(spec.stages)) e.push("Nombre de stades invalide (1 à 3).")
    if (!BLOOMERS[spec.bloomer]) e.push("Courbe d'éclosion invalide.")

    const badType = (ts: PokeType[]) => ts.length < 1 || ts.length > 2 || ts.some((t) => !POKE_TYPES.includes(t)) || (ts.length === 2 && ts[0] === ts[1])
    if (badType(spec.finalTypes)) e.push("Type final invalide (1 ou 2 types distincts).")
    if (spec.typeChange) {
        if (spec.typeChange.atStage > spec.stages) e.push("Le changement de type vise un stade qui n'existe pas.")
        if (badType(spec.typeChange.types)) e.push("Types pré-changement invalides.")
    }

    const budget = bloomerBudget(spec.bloomer)
    const total = BST(spec.finalStats)
    if (total > budget) e.push(`BST trop élevé : ${total} / ${budget} max (courbe ${BLOOMERS[spec.bloomer].label}).`)
    for (const k of STAT_KEYS) {
        const v = spec.finalStats[k]
        if (v < MIN_FINAL_STAT) e.push(`${STAT_LABEL[k]} trop basse (min ${MIN_FINAL_STAT}).`)
        if (v > MAX_FINAL_STAT) e.push(`${STAT_LABEL[k]} trop haute (max ${MAX_FINAL_STAT}).`)
    }

    // Learnset : un pick par slot, attaque ACCESSIBLE pour son niveau, pas de doublon.
    const lts = lineTypes(spec)
    if (spec.learnset.length !== LEARN_LEVELS.length) e.push(`Choisis une attaque pour chacun des ${LEARN_LEVELS.length} paliers.`)
    const seen = new Set<string>()
    spec.learnset.forEach((slot, i) => {
        const lvl = LEARN_LEVELS[i]
        if (slot.level !== lvl) { e.push(`Palier ${i + 1} : niveau attendu ${lvl}.`); return }
        const mv = getMove(slot.moveId)
        if (!mv) { e.push(`Palier niv ${lvl} : attaque inconnue.`); return }
        if (!isLearnableMove(slot.moveId)) { e.push(`« ${mv.name} » ne s'apprend par aucune espèce (CT/inexistante).`); return }
        if (seen.has(slot.moveId)) e.push(`« ${mv.name} » est en double (une attaque ne peut apparaître qu'une fois).`)
        seen.add(slot.moveId)
        if (!moveOptionsFor(lts, lvl).includes(slot.moveId)) e.push(`« ${mv.name} » n'est pas accessible au niv ${lvl} (type/puissance/force).`)
    })

    // Composition du learnset (équilibre) : statuts, STAB, couverture, rareté.
    const moves = spec.learnset.map((s) => getMove(s.moveId)).filter((m): m is MoveData => !!m)
    const offensive = moves.filter(isDamagingMove)
    const status = moves.filter((m) => !isDamagingMove(m))
    if (moves.length > 0 && status.length / moves.length < MIN_STATUS_RATIO)
        e.push(`Trop peu de statuts : ${status.length}/${moves.length} (min ${Math.ceil(moves.length * MIN_STATUS_RATIO)}, soit 1 sur 4).`)
    const stab = offensive.filter((m) => lts.includes(m.type)).length
    if (stab > MAX_STAB) e.push(`Trop d'attaques STAB : ${stab} (max ${MAX_STAB}).`)
    const coverage = offensive.filter((m) => m.type !== "NORMAL" && !lts.includes(m.type)).length
    if (coverage > MAX_COVERAGE) e.push(`Trop d'attaques de couverture : ${coverage} (max ${MAX_COVERAGE}).`)
    const commonish = offensive.filter((m) => { const r = moveRarity(m.id); return r === "commune" || r === "répandue" }).length
    if (offensive.length > 0 && commonish / offensive.length < MIN_COMMON_RATIO)
        e.push(`Trop d'attaques rares : au moins ${Math.ceil(offensive.length * MIN_COMMON_RATIO)} offensives doivent être communes/répandues (actuel : ${commonish}/${offensive.length}).`)
    return e
}

// ───────── Stats par stade : on met le profil FINAL à l'échelle du BST de chaque stade ─────────
function scaledStats(finalStats: Record<StatKey, number>, ratio: number): Record<StatKey, number> {
    const out = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) out[k] = Math.max(1, Math.round(finalStats[k] * ratio))
    return out
}

/** Rôle éditorial dérivé du profil (lisibilité ; non utilisé par le moteur). */
function roleOf(finalStats: Record<StatKey, number>, types: PokeType[]): string {
    const off = finalStats.atk >= finalStats.spc ? "physique" : "spécial"
    const top = [...STAT_KEYS].sort((a, b) => finalStats[b] - finalStats[a])[0]
    const flavor = top === "spe" ? "rapide" : top === "hp" || top === "def" ? "défensif" : "offensif"
    return `${types.join("/")} — ${flavor} ${off} (création)`
}

/** Hash stable d'un id → dexNo custom (900..9899). Réel : la DB tranchera ; ici c'est pour l'aperçu/jeu local. */
function dexNoFor(id: string): number {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return 900 + (h % 9000)
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 16) || "daemon"
const ROMAN = ["", "", " II", " III"]

/** Construit la LIGNÉE complète (SpeciesData[]) à partir de la spec validée. ownerId rend les ids uniques (partage Zone de Combat). */
export function buildCustomSpecies(spec: CustomSpec, ownerId: string): SpeciesData[] {
    const cfg = BLOOMERS[spec.bloomer]
    const ratios = STAGE_RATIOS[spec.stages]
    const finalBst = BST(spec.finalStats)
    const baseId = `custom_${slug(ownerId)}_${slug(spec.name)}`
    const evoLevels = spec.stages === 3 ? cfg.evo3 : spec.stages === 2 ? cfg.evo2 : []
    const learnset = spec.learnset.map((s) => ({ level: s.level, moveId: s.moveId }))

    const chain: SpeciesData[] = []
    for (let i = 0; i < spec.stages; i++) {
        const stage = i + 1
        const id = `${baseId}_s${stage}`
        const types = typesAtStage(spec, stage)
        const baseStats = stage === spec.stages ? { ...spec.finalStats } : scaledStats(spec.finalStats, ratios[i])
        const nextId = `${baseId}_s${stage + 1}`
        chain.push({
            id, dexNo: dexNoFor(id),
            name: `${spec.name}${ROMAN[stage] ?? ""}`,
            types: [...types],
            baseStats,
            learnset,
            evolution: i < spec.stages - 1 ? { toId: nextId, method: { kind: "LEVEL", level: evoLevels[i] } } : undefined,
            catchRate: 45,
            baseExp: Math.round(BST(baseStats) * 0.45),
            rarity: "RARE",
            growthRate: cfg.growthRate,
            role: roleOf(spec.finalStats, spec.finalTypes),
            description: spec.da.trim() + (spec.character.trim() ? ` — ${spec.character.trim()}` : ""),
            sprite: "", // « sprite mystère » : vide → fallback emoji/silhouette ; Sartay branche le vrai sprite ensuite
        })
        void finalBst
    }
    return chain
}

/** Aperçu compact pour l'UI : BST + stats + types par stade, et un libellé de catégorie d'attaque. */
export interface StagePreview { name: string; types: PokeType[]; baseStats: Record<StatKey, number>; bst: number; evoLevel?: number }
export function previewLine(spec: CustomSpec, ownerId = "preview"): StagePreview[] {
    const chain = buildCustomSpecies(spec, ownerId)
    return chain.map((s) => ({ name: s.name, types: s.types, baseStats: s.baseStats, bst: BST(s.baseStats), evoLevel: s.evolution?.method && "level" in s.evolution.method ? (s.evolution.method as { level: number }).level : undefined }))
}

/** Catégorie (PHYS/SPÉ) qu'aura une attaque de ce type — aide le joueur à aligner ses stats. */
export function moveCat(type: PokeType): "PHYS" | "SPÉ" { return moveCategory(type) === "PHYSICAL" ? "PHYS" : "SPÉ" }
