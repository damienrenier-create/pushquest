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

import type { SpeciesData, PokeType, StatKey } from "../battle/types"
import { POKE_TYPES } from "../battle/types"
import { MOVES, getMove } from "../data/moves"
import { moveCategory } from "../battle/typeChart"

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
/** Budget de BST distribuable sur le STADE FINAL selon la courbe choisie. */
export function bloomerBudget(b: Bloomer): number { return Math.round(BASE_FINAL_BST * BLOOMERS[b].bstMult) }

/** Ratios de BST des stades par rapport au final (calqués sur les vraies lignées : base ≈ 56 % du final). */
const STAGE_RATIOS: Record<number, number[]> = { 1: [1], 2: [0.62, 1], 3: [0.56, 0.78, 1] }

/** Niveaux d'apprentissage : 2 attaques au niv 5, puis 1 tous les 9 niveaux. */
export const LEARN_LEVELS = [5, 5, 9, 18, 27, 36, 45, 54]

/** Puissance MAX d'une attaque apprenable à ce niveau (le garde-fou anti « Ultralaser au niv 6 »).
 *  Seuils CALIBRÉS sur le vrai pool de moves.ts (très peu d'attaques ≤35 ; le gros des basiques est à 40-50). */
export function maxPowerForLevel(level: number): number {
    if (level <= 9) return 50      // Tier 3 : attaques de base (charge, flammèche…)
    if (level <= 27) return 75     // Tier 2 : intermédiaires
    if (level <= 45) return 100    // Tier 1 : lourdes
    return 999                     // Ultimes (niv 54+)
}
/** Les attaques de STATUT (puissance 0) ne sont autorisées qu'à partir du Tier 2 (niv 18). */
export function statusAllowedAtLevel(level: number): boolean { return level >= 18 }

// Attaques JAMAIS proposées à la création (trophées uniques / placeholders / cas spéciaux).
const MOVE_DENYLIST = new Set(["apotheose", "struggle", "lutte", "meteores"])

/** Attaques proposables à un niveau donné, pour une lignée de types donnés (type compatible + tier de puissance). */
export function moveOptionsFor(lineTypes: PokeType[], level: number): string[] {
    const maxP = maxPowerForLevel(level)
    const out: string[] = []
    for (const m of Object.values(MOVES)) {
        if (MOVE_DENYLIST.has(m.id)) continue
        const typeOk = m.type === "NORMAL" || lineTypes.includes(m.type)
        if (!typeOk) continue
        if (m.power > 0) { if (m.power <= maxP) out.push(m.id) }
        else if (statusAllowedAtLevel(level)) out.push(m.id) // statut : Tier 2+
    }
    return out.sort((a, b) => (getMove(b)?.power ?? 0) - (getMove(a)?.power ?? 0))
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

    // Learnset : un pick par slot, attaque légale pour son niveau + les types de la lignée.
    const lts = lineTypes(spec)
    if (spec.learnset.length !== LEARN_LEVELS.length) e.push(`Choisis une attaque pour chacun des ${LEARN_LEVELS.length} paliers.`)
    spec.learnset.forEach((slot, i) => {
        const lvl = LEARN_LEVELS[i]
        if (slot.level !== lvl) { e.push(`Palier ${i + 1} : niveau attendu ${lvl}.`); return }
        const mv = getMove(slot.moveId)
        if (!mv) { e.push(`Palier niv ${lvl} : attaque inconnue.`); return }
        if (!moveOptionsFor(lts, lvl).includes(slot.moveId)) e.push(`« ${mv.name} » n'est pas autorisée au niv ${lvl} (type/puissance).`)
    })
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
