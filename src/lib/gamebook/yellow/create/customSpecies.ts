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
/** Stat maximale par caractéristique (échelle d'affichage ; le vrai plafond dur est STAT_HARD_CAP). */
export const MAX_FINAL_STAT = 160

/** Meilleure stat des FINALES stade-3 NON-LÉGENDAIRES du dex (le « 100 % » : au-delà, chaque point coûte + cher).
 *  Calculé via dex-caps.mts sur species.ts (à refléter si le dex évolue). */
export const STAT_DEX_MAX: Record<StatKey, number> = { hp: 120, atk: 135, def: 138, spe: 130, spc: 120 }
/** Plafond DUR par stat = +10 % au-dessus du record du dex (S-tier autorisé, jamais « au-dessus de tout »). */
export const STAT_HARD_CAP: Record<StatKey, number> = { hp: 132, atk: 149, def: 152, spe: 143, spc: 132 }
/** Surcoût de budget par point AU-DESSUS du record du dex (rendement décroissant du min-max). */
export const OVER_MAX_COST = 2
/** Coût en budget d'une valeur de stat : 1/point jusqu'au record du dex, puis OVER_MAX_COST/point au-delà. */
export function statCost(k: StatKey, v: number): number {
    const dexMax = STAT_DEX_MAX[k]
    return Math.min(v, dexMax) + Math.max(0, v - dexMax) * OVER_MAX_COST
}
/** Coût total (budget) d'une distribution de stats — c'est LUI qui est plafonné par bloomerBudget, pas la somme brute. */
export function specStatCost(stats: Record<StatKey, number>): number {
    return STAT_KEYS.reduce((a, k) => a + statCost(k, stats[k] ?? 0), 0)
}
/** Met un profil à l'échelle pour tenir dans le budget (pas de 5, borné MIN..cap). Sert au pré-remplissage
 *  quand on change de rôle/d'éclosion, pour ne jamais partir d'un état « budget dépassé ». */
export function fitStatsToBudget(stats: Record<StatKey, number>, budget: number): Record<StatKey, number> {
    const out = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) out[k] = Math.max(MIN_FINAL_STAT, Math.min(STAT_HARD_CAP[k], Math.round(stats[k] ?? MIN_FINAL_STAT)))
    if (specStatCost(out) <= budget) return out
    const factor = budget / specStatCost(out)
    for (const k of STAT_KEYS) out[k] = Math.max(MIN_FINAL_STAT, Math.min(STAT_HARD_CAP[k], Math.round((out[k] * factor) / 5) * 5))
    let guard = 0
    while (specStatCost(out) > budget && guard++ < 60) {                 // l'arrondi peut dépasser : rabote la + grosse stat
        const k = STAT_KEYS.reduce((a, b) => (out[b] > out[a] ? b : a), STAT_KEYS[0])
        if (out[k] <= MIN_FINAL_STAT) break
        out[k] = Math.max(MIN_FINAL_STAT, out[k] - 5)
    }
    return out
}

/** Courbe d'ÉCLOSION : tôt = monte vite mais plafond plus bas · tard = lent mais plafond plus haut (risk/reward). */
export type Bloomer = "early" | "mid" | "late"
export interface BloomerCfg { label: string; hint: string; bstMult: number; growthRate: SpeciesData["growthRate"]; evo3: [number, number]; evo2: [number] }
export const BLOOMERS: Record<Bloomer, BloomerCfg> = {
    early: { label: "Éclosion précoce", hint: "Monte VITE, plafond légèrement plus bas (−5 % BST)", bstMult: 0.95, growthRate: "medium_fast", evo3: [12, 28], evo2: [16] },
    mid: { label: "Éclosion moyenne", hint: "Équilibré (BST de référence)", bstMult: 1.0, growthRate: "medium_slow", evo3: [16, 34], evo2: [22] },
    late: { label: "Éclosion tardive", hint: "Monte LENTEMENT, plafond légèrement plus haut (+5 % BST)", bstMult: 1.05, growthRate: "slow", evo3: [22, 40], evo2: [30] },
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
/** Bulk (PV+Défense) au-delà duquel on interdit le combo SOIN+USURE (anti mur-imbattable). Profil « mur » ≈ 225. */
export const STALL_BULK_THRESHOLD = 190

/** Puissance MAX de BASE d'une attaque OFFENSIVE à ce niveau. Seuils CALIBRÉS sur la progression réelle
 *  du dex (hors kit inné) : 65 tôt → 150 aux ultimes. cf. dex-analysis. Modulé ensuite par BST+type. */
export function maxPowerForLevel(level: number): number {
    if (level <= 9) return 45   // niv 5 : attaques BASIQUES (Charge, Griffe…), jamais du P65
    if (level <= 18) return 60
    if (level <= 27) return 75
    if (level <= 36) return 90  // les grosses (P100+) restent réservées à la fin
    if (level <= 45) return 115
    return 150                  // ultimes (Ultralaser…) : niv 48-54 seulement
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// ── POOL DE PUISSANCE MODULÉ (le « compromis ») : BST faible → un peu plus de puissance · type fort → nerf ──
let _typeScore: Map<PokeType, number> | null = null
/** Fraction du dex frappée en super-efficace par ce type (utilité offensive ; mémoïsé). */
export function typeOffensivePct(t: PokeType): number {
    if (!_typeScore) {
        _typeScore = new Map()
        const all = Object.values(SPECIES)
        for (const ty of POKE_TYPES) { let se = 0; for (const s of all) if (typeEffectiveness(ty, s.types) >= 2) se++; _typeScore.set(ty, se / all.length) }
    }
    return _typeScore.get(t) ?? 0
}
/** Modificateur de puissance (−15 %..+15 %) : (a) BST sous 435 → bonus · (b) type STAB fort (couvre bien le
 *  dex) → malus. Un Daemon faible ou d'un type peu utile tape un peu plus fort ; un type dominant est nerfé. */
export function powerPoolMod(finalBst: number, types: PokeType[]): number {
    const bstMod = clamp((BASE_FINAL_BST - finalBst) / BASE_FINAL_BST, -0.06, 0.06)     // low BST → + (swing réduit de moitié : ±6%)
    const strongest = types.length ? Math.max(...types.map(typeOffensivePct)) : 0
    const typeMod = clamp((0.25 - strongest) * 0.5, -0.12, 0)                           // type couvrant plus de 25% du dex → nerf ; jamais de BONUS de type
    return clamp(bstMod + typeMod, -0.15, 0.15)
}
/** Puissance d'une attaque BASIQUE toujours accessible (Charge…) : plancher du cap pour ne jamais vider un slot. */
export const BASIC_MOVE_POWER = 40
/** Cap de puissance EFFECTIF pour un slot : le plafond du NIVEAU est un plafond dur (jamais dépassé, même à BST
 *  faible → plus de P70 au niveau 5). La modulation ne fait que le BAISSER (gros BST / type couvrant → nerf),
 *  sans jamais descendre sous une attaque basique (sinon un slot bas niveau n'aurait aucune option). */
export function effectiveMaxPower(level: number, finalBst: number, types: PokeType[]): number {
    const base = maxPowerForLevel(level)
    return Math.max(Math.min(base, BASIC_MOVE_POWER), Math.min(base, Math.round(base * (1 + powerPoolMod(finalBst, types)))))
}
/** Cible de puissance MOYENNE/attaque offensive (entre la moyenne dex 67 et la meilleure lignée 78). */
export const AVG_OFF_POWER_BASE = 70
/** Nb de slots offensifs visés (10 slots − 3 statuts requis) → le pool offensif TOTAL = moyenne × ce nombre. */
export const OFFENSIVE_SLOTS_TARGET = 7
/** Tolérance sur la MOYENNE offensive (le garde-fou global) : marge pour les types pauvres en attaques faibles,
 *  où la cascade slot-par-slot du picker ne peut pas atteindre la cible exacte. La cascade reste le vrai frein. */
export const POWER_AVG_TOLERANCE = 8
/** Pool de puissance offensif TOTAL d'un learnset (cumulatif) : c'est LUI qui est réparti entre les slots. */
export function offensivePool(finalBst: number, types: PokeType[]): number { return maxAvgOffPower(finalBst, types) * OFFENSIVE_SLOTS_TARGET }
/** Plafond de la MOYENNE de puissance des attaques offensives d'un learnset, calé sur le dex et modulé par le BST/type.
 *  → corrèle le pool de puissance avec les vraies lignées ; un gros BST ⇒ moyenne plus basse (pas de double bonus) ;
 *  et pour caser une attaque très forte, il faut des attaques faibles ailleurs (le compromis « Ultralaser »). */
export function maxAvgOffPower(finalBst: number, types: PokeType[]): number {
    return Math.round(AVG_OFF_POWER_BASE * (1 + powerPoolMod(finalBst, types)))
}

// ── RÔLE → contraintes de stats (min/max) + distribution suggérée (le joueur choisit sa DIRECTION) ──
export type RoleKey = "attaquant-phys" | "attaquant-spe" | "rapide" | "mur" | "equilibre"
export interface RoleCfg { label: string; hint: string; min: Partial<Record<StatKey, number>>; max: Partial<Record<StatKey, number>>; profile: Record<StatKey, number> }
export const ROLES: Record<RoleKey, RoleCfg> = {
    "attaquant-phys": { label: "Attaquant physique", hint: "Grosse Attaque, frappe fort au contact", min: { atk: 95 }, max: { spc: 70 }, profile: { hp: 75, atk: 130, def: 70, spe: 90, spc: 50 } },
    "attaquant-spe": { label: "Attaquant spécial", hint: "Gros Spécial, attaques à distance", min: { spc: 95 }, max: { atk: 70 }, profile: { hp: 75, atk: 50, def: 70, spe: 90, spc: 130 } },
    "rapide": { label: "Rapide (sweeper)", hint: "Vitesse élevée, frappe en premier", min: { spe: 100 }, max: { hp: 85, def: 85 }, profile: { hp: 70, atk: 100, def: 60, spe: 125, spc: 60 } },
    "mur": { label: "Mur (défenseur)", hint: "Gros PV/Défense, encaisse et use l'adversaire", min: { hp: 85, def: 90 }, max: { spe: 70 }, profile: { hp: 105, atk: 60, def: 120, spe: 45, spc: 85 } },
    "equilibre": { label: "Équilibré", hint: "Polyvalent, sans faille marquée", min: {}, max: {}, profile: { hp: 87, atk: 87, def: 87, spe: 87, spc: 87 } },
}

// ── FORME DE COURBE (2e axe) : comment le BST se répartit entre les stades ──
export type CurveShape = "linear" | "accel" | "decel"
export const CURVE_RATIOS: Record<CurveShape, [number, number, number]> = {
    linear: [0.57, 0.77, 1.0],   // progression régulière (défaut dex)
    accel: [0.45, 0.68, 1.0],    // pic tardif : faible longtemps, monstre final
    decel: [0.68, 0.88, 1.0],    // fort tôt : costaud vite, plafonne
}
export const CURVE_LABEL: Record<CurveShape, string> = { linear: "Linéaire", accel: "Accélérée (pic tardif)", decel: "Décélérée (fort tôt)" }
export const CURVE_HINT: Record<CurveShape, string> = { linear: "Les stats montent régulièrement.", accel: "Faible longtemps, mais final surpuissant.", decel: "Costaud dès le début, mais plafonne vite." }

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
/** Puissance de GATE (accessibilité par niveau uniquement) : puissance brute + PRIME pour les effets qui rendent
 *  une attaque bien plus forte que ses chiffres (ne rate jamais, priorité, gros multi-hit…). → gatées plus tard.
 *  N'affecte PAS le pool cascade (qui reste sur la puissance réelle). */
export function gatePower(m: MoveData): number {
    let p = effectivePower(m)
    if (m.priority && m.priority > 0) p += 15       // priorité (Vive-Attaque, Ombre Furtive) — niveau move, hors effect
    const e = m.effect
    if (e) {
        if (e.sureHit) p += 20                       // Météores : NE RATE JAMAIS → gate ~niv 30, pas 18
        if (e.multiHit && e.multiHit[1] >= 5) p += 10 // gros multi-coups
        if (e.drainPct) p += 10                       // vol de PV (récupération offensive)
    }
    return p
}
/** Attaque BASIQUE = offensive sans aucun effet secondaire (Charge, Griffe…). Pour le slot 1 forcé. */
export function hasNoSideEffect(m: MoveData): boolean {
    const e = m.effect
    if (!e) return true
    return !(e.inflictStatus || e.statChanges?.length || e.healPct || e.restSleep || e.recoilPct || e.drainPct
        || e.multiHit || e.highCrit || e.inflictVolatile || e.sureHit || e.adaptiveStab || e.fixedDamage || e.chance)
}

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
    if (e.inflictVolatile === "SEEDED") return 3 // Vampigraine = usure + soin passif, au niveau de Toxik (pas cherry-pickable tôt)
    return 2 // onde folie, brume sporale…
}
/** Palier de force de statut MAX proposable à ce niveau (progression). */
export function statusTierCapForLevel(level: number): number {
    if (level < 18) return 1
    if (level < 27) return 2
    if (level < 40) return 3
    return 4
}

// ── COHÉRENCE DE TYPE (dex-like Gen 1) : par MONTÉE DE NIVEAU, un Daemon n'apprend que du NORMAL (universel)
//    + ses propres STAB (types de la lignée). Pas de couverture off-type aléatoire (fini « Pistolet à O sur un
//    Normal/Plante »). La SEULE couverture possible vient d'un changement de type : les attaques de l'ancien type
//    restent au learnset et comptent comme couverture (bornée à MAX_COVERAGE). La couverture THÉMATIQUE élargie
//    (par nom/anatomie) viendra via un filtre sémantique validé par Sartay. ──
export function weaknessTypes(types: PokeType[]): PokeType[] { return POKE_TYPES.filter((t) => typeEffectiveness(t, types) >= 2) }
export function allowedOffensiveTypes(types: PokeType[]): Set<PokeType> {
    return new Set<PokeType>(["NORMAL", ...types]) // Normal + STAB de la lignée uniquement
}

// ── ATTRIBUTS ANATOMIQUES (DA) : le joueur en coche MAX 2 dans le concept → ils JUSTIFIENT des attaques
//    hors-type précises (couverture thématique). L'attribut PRIME (débloque même un type de faiblesse) ; le
//    cap MAX_COVERAGE=2 s'applique toujours. Table validée par Sartay (02/07/2026). ──
export type Attribute =
    | "ailes" | "bec" | "crocs" | "griffes" | "dard" | "epines" | "antennes" | "sabots" | "cornes"
    | "bois" | "armes" | "carapace" | "massif" | "muscles" | "jambes" | "queue" | "voix"
    | "ecailles" | "joues" | "pelage"
export const MAX_ATTRIBUTES = 2
export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
    ailes: "Ailes", bec: "Bec", crocs: "Crocs", griffes: "Griffes", dard: "Dard", epines: "Épines dorsales",
    antennes: "Antennes", sabots: "Sabots", cornes: "Cornes", bois: "Bois (ramure)", armes: "Armes / Lames",
    carapace: "Carapace", massif: "Corps massif", muscles: "Muscles", jambes: "Longues jambes", queue: "Queue",
    voix: "Voix envoûtante", ecailles: "Écailles", joues: "Joues électriques", pelage: "Pelage épais",
}
/** Attaques HORS-TYPE que chaque attribut débloque (justifie la couverture). Bypass type + anti-patch (l'attribut prime). */
export const ATTRIBUTE_MOVES: Record<Attribute, string[]> = {
    ailes: ["tornade", "pique_fatal", "vol"],
    bec: ["picpic", "fonce_bec"],
    crocs: ["crocs_de_feu", "morsure"],
    griffes: ["griffe_draconique", "griffe_spectrale"],
    dard: ["dard_venin", "dard_mortel", "dard_fatal"],
    epines: ["jet_pierres", "dard_nuee"],
    antennes: ["choc_mental", "vague_mentale"],
    sabots: ["secousse", "seisme", "tir_boue"],
    cornes: ["coup_de_boutoir", "eboulis"],
    bois: ["fouet_lianes", "tranche_feuille"],
    armes: ["lame_roche", "crochet_maitre"],
    carapace: ["jet_pierres", "lame_roche", "carapace_diamant"],
    massif: ["seisme", "roc_titanesque"],
    muscles: ["poing_karate", "crochet_maitre", "coup_de_boutoir"],
    jambes: ["double_pied", "balayage"],
    queue: ["balayage", "secousse"],
    voix: ["hypnose", "onde_folie"],
    ecailles: ["pistolet_a_o", "lame_eau", "deferlante"], // EAU
    joues: ["etincelle", "fulgurance", "cage_eclair"],     // ÉLEC
    pelage: ["coup_d_givre", "souffle_polaire"],           // GLACE
}
/** Ensemble des ids d'attaques débloqués par les attributs choisis (⊆ 2). */
export function attributeMoveIds(attributes: Attribute[] | undefined): Set<string> {
    const s = new Set<string>()
    for (const a of attributes ?? []) for (const id of ATTRIBUTE_MOVES[a] ?? []) s.add(id)
    return s
}

// ── TALENT SECRET (« pouvoir caché ») : le joueur en pioche UN au hasard à la fin de la création ; il peut
//    RELANCER en payant 1 point sur sa stat la plus faible (max 15). Tous ~5 %, calés sur des mécaniques que le
//    moteur possède déjà (crit, précision, STAB, effets secondaires, recul, drain, dégâts). cf. liste validée v2.
//    L'effet en combat sera câblé côté moteur à l'instanciation (Phase 2) ; ici : data + choix + coût. ──
export type TalentKey =
    // offensif
    | "coup_sort" | "zele" | "acharnement" | "coup_dur" | "fine_lame" | "poigne_fer" | "affinite_elem" | "frappe_repetee"
    // défensif
    | "anti_crit" | "cuir_epais" | "resistant" | "voile" | "chair_coriace" | "volonte_fer"
    // précision / statut
    | "oeil_lynx" | "sang_froid" | "chanceux" | "regard_percant" | "corps_sain"
    // survie
    | "endurant" | "sangsue" | "instinct_survie" | "coeur_vaillant" | "cuirasse_mentale"
    // utilitaire
    | "reflexes" | "main_leste" | "studieux"
export interface TalentInfo { label: string; desc: string }
export const TALENTS: Record<TalentKey, TalentInfo> = {
    // ── Offensif ──
    coup_sort: { label: "Coup du sort", desc: "Tu portes des coups critiques bien plus souvent (façon Lentilscope)." },
    zele: { label: "Zèle élémentaire", desc: "Bonus STAB porté à ×1,55 (au lieu de ×1,5)." },
    acharnement: { label: "Acharnement", desc: "+5 % de dégâts si la cible est à moins de 25 % de PV." },
    coup_dur: { label: "Talon d'acier", desc: "Tes coups critiques font un peu plus mal (×2,05 au lieu de ×2)." },
    fine_lame: { label: "Fine lame", desc: "Tes dégâts sont plus réguliers : moins de coups faibles au hasard." },
    poigne_fer: { label: "Poigne de fer", desc: "+5 % de dégâts sur les coups super-efficaces." },
    affinite_elem: { label: "Affinité élémentaire", desc: "+5 % de dégâts sur les attaques de ton type principal." },
    frappe_repetee: { label: "Frappe répétée", desc: "+5 % de chance d'un coup en plus sur les attaques multi-coups." },
    // ── Défensif ──
    anti_crit: { label: "Sang-froid tactique", desc: "L'adversaire a −5 % de chances de te porter un critique." },
    cuir_epais: { label: "Cuir épais", desc: "−5 % de tous les dégâts subis." },
    resistant: { label: "Résistant", desc: "−5 % de dégâts sur les coups super-efficaces subis." },
    voile: { label: "Voile", desc: "L'adversaire a −5 % de précision contre toi (tu esquives plus souvent)." },
    chair_coriace: { label: "Chair coriace", desc: "−5 % de dégâts physiques subis." },
    volonte_fer: { label: "Volonté de fer", desc: "Annule la 1re baisse de stat du combat (façon Herbe Blanche)." },
    // ── Précision / statut ──
    oeil_lynx: { label: "Œil de lynx", desc: "+5 % de précision sur tes attaques." },
    sang_froid: { label: "Nerfs d'acier", desc: "−5 % de chances de subir une altération (para/brûlure/poison/sommeil)." },
    chanceux: { label: "Chanceux", desc: "+5 % de déclenchement des effets/statuts secondaires de tes attaques." },
    regard_percant: { label: "Regard perçant", desc: "+5 % de chances d'apeurer (flinch) la cible après une attaque." },
    corps_sain: { label: "Corps sain", desc: "−5 % de chances de te faire apeurer (résistance flinch)." },
    // ── Survie ──
    endurant: { label: "Endurant", desc: "Le recul (Bélier, Coup de Boutoir…) te fait un quart de dégâts en moins." },
    sangsue: { label: "Sangsue", desc: "Tes attaques te rendent un peu de PV (1/20 des dégâts infligés)." },
    instinct_survie: { label: "Instinct de survie", desc: "+5 % de survivre à 1 PV à un coup fatal (depuis PV pleins)." },
    coeur_vaillant: { label: "Cœur vaillant", desc: "Régénère 1/20 de tes PV max à la fin de chaque tour." },
    cuirasse_mentale: { label: "Cuirasse mentale", desc: "Une fois par combat, l'un de tes coups est un critique garanti." },
    // ── Utilitaire ──
    reflexes: { label: "Réflexes", desc: "+5 % de Vitesse au combat." },
    main_leste: { label: "Main leste", desc: "+5 % d'agir en premier à priorité égale (façon Vive-Griffe)." },
    studieux: { label: "Studieux", desc: "+5 % d'XP gagnée à chaque victoire." },
}
export const TALENT_KEYS = Object.keys(TALENTS) as TalentKey[]
export const MAX_TALENT_REROLLS = 15
/** Clé de la stat la PLUS FAIBLE (> MIN_FINAL_STAT si possible) — la « monnaie » du reroll de talent. */
export function weakestStatKey(stats: Record<StatKey, number>): StatKey {
    const payable = STAT_KEYS.filter((k) => stats[k] > MIN_FINAL_STAT)
    const pool = payable.length ? payable : STAT_KEYS
    return pool.reduce((a, k) => (stats[k] < stats[a] ? k : a), pool[0])
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
export function moveOptionsFor(lineTypes: PokeType[], level: number, finalBst: number = BASE_FINAL_BST, extraAllowed: Set<string> = new Set()): string[] {
    const maxP = effectiveMaxPower(level, finalBst, lineTypes) // cap MODULÉ (BST faible → +, type fort → −)
    const statusCap = statusTierCapForLevel(level)
    const allowed = allowedOffensiveTypes(lineTypes)
    const out: string[] = []
    for (const m of Object.values(MOVES)) {
        if (MOVE_DENYLIST.has(m.id)) continue
        const byAttr = extraAllowed.has(m.id)              // débloqué par un attribut → prime (bypass type + CT-only)
        if (!byAttr && !isLearnableMove(m.id)) continue    // sinon : pas de CT-only / inexistante
        if (isDamagingMove(m)) {
            if (!byAttr && !allowed.has(m.type)) continue  // cohérence dex-like (Normal + STAB) sauf attribut
            if (gatePower(m) <= maxP) out.push(m.id)        // gate niveau = puissance + prime d'effet (Météores plus tard)
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
export function slotOptions(lineTypes: PokeType[], level: number, finalBst: number = BASE_FINAL_BST): { offensive: string[]; status: string[] } {
    const all = moveOptionsFor(lineTypes, level, finalBst)
    return {
        offensive: all.filter((id) => isDamagingMove(getMove(id)!)),
        status: all.filter((id) => !isDamagingMove(getMove(id)!)).sort((a, b) => statusTier(getMove(a)!) - statusTier(getMove(b)!)),
    }
}

/** SLOTS FORCÉS : slot 1 (index 0) = attaque basique · slot 2 (index 1) = statut faible. */
export const FORCED_BASIC_SLOT = 0
export const FORCED_STATUS_SLOT = 1

/** Cap de puissance offensif d'un slot en CASCADE cumulative (« un pool pour l'attaque 1, un pool pour 1+2… ») :
 *  la MOYENNE des attaques offensives jusqu'à ce slot doit rester ≤ le plafond → le max de ce slot dépend de la
 *  somme des PRÉCÉDENTES. Plus tu as tapé fort avant, moins il reste ici. Borné par le niveau, plancher = basique. */
export function slotOffensiveCap(learnset: Array<{ moveId: string }>, i: number, finalBst: number, types: PokeType[]): number {
    const cap = maxAvgOffPower(finalBst, types)
    const levelCap = effectiveMaxPower(LEARN_LEVELS[i], finalBst, types)
    let usedBefore = 0, offBefore = 0
    for (let j = 0; j < i && j < learnset.length; j++) {
        const m = getMove(learnset[j].moveId); if (m && isDamagingMove(m)) { usedBefore += effectivePower(m); offBefore++ }
    }
    const prefixCap = cap * (offBefore + 1) - usedBefore // somme(0..i) ≤ cap×(nb offensifs) ⇒ moyenne ≤ cap
    return Math.max(BASIC_MOVE_POWER, Math.min(levelCap, prefixCap))
}

/** Une option de slot : l'attaque + POURQUOI elle est bloquée (grisée) le cas échéant.
 *  `null` = choisissable · "dup" = déjà prise à un autre palier · "cascade" = trop forte vu le pool restant. */
export type BlockReason = null | "dup" | "cascade"
export interface SlotOpt { id: string; blocked: BlockReason }
/** Attaques d'un slot pour le PICKER : les jamais-valides (mauvais type/niveau/catégorie forcée) sont EXCLUES ;
 *  celles bloquées par des choix précédents (doublon / pool cascade épuisé) sont RENVOYÉES grisées (blocked ≠ null). */
export function slotChoices(spec: CustomSpec, i: number, finalBst: number = STAT_KEYS.reduce((a, k) => a + spec.finalStats[k], 0)): { offensive: SlotOpt[]; status: SlotOpt[]; cap: number } {
    const types = lineTypes(spec)
    const level = LEARN_LEVELS[i]
    const otherIds = new Set(spec.learnset.filter((_, j) => j !== i).map((l) => l.moveId))
    const all = moveOptionsFor(types, level, finalBst, attributeMoveIds(spec.attributes)) // type/niveau valides (+ attributs)
    const offIds = all.filter((id) => isDamagingMove(getMove(id)!)).sort((a, b) => effectivePower(getMove(b)!) - effectivePower(getMove(a)!))
    const staIds = all.filter((id) => !isDamagingMove(getMove(id)!)).sort((a, b) => statusTier(getMove(a)!) - statusTier(getMove(b)!))
    const tagDup = (id: string): BlockReason => otherIds.has(id) ? "dup" : null
    if (i === FORCED_BASIC_SLOT) { // slot 1 : offensive BASIQUE (Normal/STAB ≤ cap niv, sans effet), pas de statut
        const cap = maxPowerForLevel(level)
        const basics = offIds.filter((id) => { const m = getMove(id)!; return hasNoSideEffect(m) && effectivePower(m) <= cap })
        return { offensive: basics.map((id) => ({ id, blocked: tagDup(id) })), status: [], cap }
    }
    if (i === FORCED_STATUS_SLOT) return { offensive: [], status: staIds.map((id) => ({ id, blocked: tagDup(id) })), cap: 0 } // slot 2 : statut faible
    const cap = slotOffensiveCap(spec.learnset, i, finalBst, types)
    const offensive = offIds.map((id) => ({ id, blocked: otherIds.has(id) ? "dup" as const : (effectivePower(getMove(id)!) > cap ? "cascade" as const : null) }))
    return { offensive, status: staIds.map((id) => ({ id, blocked: tagDup(id) })), cap }
}

// ══════ CAROTTE ULTIME ══════
// Un slot BONUS, HORS du pool de puissance cumulatif : le joueur y apprend UNE attaque puissante, plafonnée
// par la VITESSE du Daemon (les lents, punis en initiative, frappent plus fort). Respecte le type (Normal+STAB
// +attributs) mais ignore la cascade ET les quotas de composition. Optionnel. Rangé au niveau ULTIMATE_LEVEL.
export const ULTIMATE_LEVEL = 60
/** Plafond de puissance de la carotte ultime selon la vitesse : rapide 70 · moyen 75 · lent 80. */
export function ultimatePowerCap(spe: number): number {
    if (spe >= 100) return 70 // rapide
    if (spe <= 60) return 80  // lent (compense la faible initiative)
    return 75                 // moyen
}
/** Attaques éligibles à la carotte ultime : type valide (Normal/STAB/attributs), offensives, P ≤ cap-vitesse,
 *  pas déjà dans le learnset. Triées par puissance décroissante. */
export function ultimateMoveOptions(spec: CustomSpec, finalBst: number = BST(spec.finalStats)): string[] {
    const types = lineTypes(spec)
    const cap = ultimatePowerCap(spec.finalStats.spe)
    const taken = new Set(spec.learnset.map((l) => l.moveId))
    return moveOptionsFor(types, ULTIMATE_LEVEL, finalBst, attributeMoveIds(spec.attributes))
        .filter((id) => { const m = getMove(id); return !!m && isDamagingMove(m) && effectivePower(m) <= cap && !taken.has(id) })
        .sort((a, b) => effectivePower(getMove(b)!) - effectivePower(getMove(a)!))
}

/** Slots de STATUT par défaut : slot 2 (forcé) + 2 autres (milieu/fin) pour tenir le quota 25 %. */
const DEFAULT_STATUS_SLOTS = [FORCED_STATUS_SLOT, 5, 8]

/** Learnset PAR DÉFAUT valide : slot 1 basique · slot 2 statut faible · 2 autres statuts · le reste offensif en
 *  CASCADE (pool cumulatif partagé). Sans doublon. Point de départ du wizard, toujours conforme à validateSpec. */
export function suggestLearnset(lineTypes: PokeType[], finalBst: number = BASE_FINAL_BST, finalTypes: PokeType[] = lineTypes, attrMoves: Set<string> = new Set()): Array<{ level: number; moveId: string }> {
    const types = lineTypes
    const pow = (id: string) => effectivePower(getMove(id)!)
    const isCov = (id: string) => { const m = getMove(id)!; return m.type !== "NORMAL" && !finalTypes.includes(m.type) }
    const used = new Set<string>()
    const chosen: string[] = LEARN_LEVELS.map(() => "")
    const opts = (i: number) => moveOptionsFor(types, LEARN_LEVELS[i], finalBst, attrMoves).filter((id) => !used.has(id))
    const take = (id: string) => { if (id) used.add(id); return id }

    // Slot 1 (forcé) : attaque BASIQUE (Normal/STAB ≤ cap niv, sans effet).
    {
        const cap = maxPowerForLevel(LEARN_LEVELS[FORCED_BASIC_SLOT])
        const basics = opts(FORCED_BASIC_SLOT).filter((id) => { const m = getMove(id)!; return isDamagingMove(m) && hasNoSideEffect(m) && pow(id) <= cap }).sort((a, b) => pow(b) - pow(a))
        chosen[FORCED_BASIC_SLOT] = take(basics[0] ?? opts(FORCED_BASIC_SLOT).find((id) => isDamagingMove(getMove(id)!)) ?? "")
    }
    // Statuts progressifs (slot 2 forcé + 2 autres).
    for (const i of DEFAULT_STATUS_SLOTS) {
        const sta = opts(i).filter((id) => !isDamagingMove(getMove(id)!)).sort((a, b) => statusTier(getMove(a)!) - statusTier(getMove(b)!))
        chosen[i] = take(sta[0] ?? "")
    }
    // Offensifs restants, en CASCADE cumulative gauche→droite (moyenne courante ≤ plafond). Priorité STAB/Normal.
    const offIdx = LEARN_LEVELS.map((_, i) => i).filter((i) => !chosen[i])
    let coverageUsed = 0
    for (const i of offIdx) {
        const cap = slotOffensiveCap(chosen.map((id) => ({ moveId: id })), i, finalBst, types) // ne lit que les slots AVANT i
        const cand = opts(i).filter((id) => isDamagingMove(getMove(id)!))
        const nonCov = cand.filter((id) => !isCov(id))
        const fit = (arr: string[]) => arr.filter((id) => pow(id) <= cap).sort((a, b) => pow(b) - pow(a))
        let pick = fit(nonCov)[0]
            ?? (coverageUsed < MAX_COVERAGE ? fit(cand)[0] : undefined)
            ?? [...nonCov].sort((a, b) => pow(a) - pow(b))[0]
            ?? [...cand].sort((a, b) => pow(a) - pow(b))[0]
        if (!pick) pick = opts(i).find((id) => !isDamagingMove(getMove(id)!)) ?? "" // pool offensif épuisé → statut de secours
        if (pick && isDamagingMove(getMove(pick)!) && isCov(pick)) coverageUsed++
        chosen[i] = take(pick)
    }
    // Réparation : le plancher basique peut faire déborder la moyenne de 1-2. On baisse la + forte offensive
    // (par une inutilisée plus faible du même palier) jusqu'à repasser sous le plafond → suggestion toujours valide.
    const capAvg = maxAvgOffPower(finalBst, finalTypes)
    for (let guard = 0; guard < 40; guard++) {
        const off = chosen.filter((id) => id && isDamagingMove(getMove(id)!))
        if (!off.length || Math.round(off.reduce((a, id) => a + pow(id), 0) / off.length) <= capAvg) break
        let hi = -1
        for (let j = 0; j < chosen.length; j++) if (chosen[j] && isDamagingMove(getMove(chosen[j])!) && (hi < 0 || pow(chosen[j]) > pow(chosen[hi]))) hi = j
        if (hi < 0) break
        const cur = pow(chosen[hi])
        used.delete(chosen[hi])
        const weaker = moveOptionsFor(types, LEARN_LEVELS[hi], finalBst, attrMoves).find((id) => !used.has(id) && isDamagingMove(getMove(id)!) && pow(id) < cur)
        if (!weaker) { used.add(chosen[hi]); break }
        chosen[hi] = take(weaker)
    }
    // Sécurité : aucun slot vide (types pauvres en attaques accessibles) → 1re option restante, sinon Charge.
    for (let i = 0; i < chosen.length; i++) if (!chosen[i]) { const id = opts(i)[0] ?? "charge"; used.add(id); chosen[i] = id }
    return LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: chosen[i] }))
}

// ───────── Spécification saisie par le joueur ─────────
export interface CustomSpec {
    name: string                 // nom du STADE 1 (base) — sert aussi de racine à l'id (slug)
    /** NOMS PERSONNALISÉS par stade (2 et 3), édités au récap. Absent/vide → suffixe romain auto
     *  (`${name} II`, `${name} III`). Le stade 1 reste `name`. Purement cosmétique (l'id ne dépend que de `name`). */
    stageNames?: Record<number, string>
    da: string                   // direction artistique : 1-2 phrases (sert au sprite + description)
    character: string            // caractère / personnalité
    daFinal?: string             // DA du STADE FINAL (en + de celle de la base) — pour le sprite artist
    stages: 1 | 2 | 3
    bloomer: Bloomer
    curve: CurveShape            // forme de courbe (répartition du BST entre stades)
    role: RoleKey               // rôle → contraintes min/max de stats
    finalTypes: PokeType[]                       // 1 ou 2 types du STADE FINAL
    typeChange?: { atStage: 2 | 3; types: PokeType[] } // 1 changement MAX : les stades < atStage portent ces types
    finalStats: Record<StatKey, number>          // distribution du STADE FINAL (somme ≤ budget)
    attributes?: Attribute[]                     // MAX 2 attributs anatomiques → débloquent des attaques hors-type
    secretTalent?: TalentKey                     // talent « pouvoir caché » pioché en fin de création
    talentRerolls?: number                       // nb de relances de talent déjà payées (max MAX_TALENT_REROLLS)
    learnset: Array<{ level: number; moveId: string }> // 1 pick par slot de LEARN_LEVELS
    ultimateMove?: string                        // « CAROTTE ULTIME » : 1 attaque bonus HORS pool de puissance (cap selon la vitesse). Optionnel.
}

/** Entrée PERSISTÉE dans la save (Phase 2) : la spec + l'ownerId (pour reconstruire des ids déterministes). */
export interface StoredCustomDaemon { ownerId: string; spec: CustomSpec }
/** Validation DÉFENSIVE d'une entrée custom lue de la save (une entrée malformée ne doit jamais casser le chargement). */
export function isPlausibleStoredDaemon(x: unknown): x is StoredCustomDaemon {
    if (!x || typeof x !== "object") return false
    const d = x as { ownerId?: unknown; spec?: unknown }
    if (typeof d.ownerId !== "string" || !d.spec || typeof d.spec !== "object") return false
    const s = d.spec as Partial<CustomSpec>
    return typeof s.name === "string" && Array.isArray(s.finalTypes) && !!s.finalStats && Array.isArray(s.learnset)
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
    if (spec.stages === 3 && !CURVE_RATIOS[spec.curve]) e.push("Forme de courbe invalide.")
    if (!ROLES[spec.role]) e.push("Rôle invalide.")
    if (spec.attributes && (spec.attributes.length > MAX_ATTRIBUTES || spec.attributes.some((a) => !ATTRIBUTE_MOVES[a])))
        e.push(`Attributs invalides (max ${MAX_ATTRIBUTES}, valeurs connues).`)

    const badType = (ts: PokeType[]) => ts.length < 1 || ts.length > 2 || ts.some((t) => !POKE_TYPES.includes(t)) || (ts.length === 2 && ts[0] === ts[1])
    if (badType(spec.finalTypes)) e.push("Type final invalide (1 ou 2 types distincts).")
    if (spec.typeChange) {
        if (spec.typeChange.atStage > spec.stages) e.push("Le changement de type vise un stade qui n'existe pas.")
        if (badType(spec.typeChange.types)) e.push("Types pré-changement invalides.")
    }

    // Stats : intégrité (entier ≥ MIN, ≤ cap dur par stat) + budget avec surcoût au-delà du record du dex.
    // Le RÔLE n'est qu'un GUIDE (pré-remplit un profil) : plus de min/max bloquant, la personnalisation est libre
    // dans les bornes dures. Le seul verrou anti-god-tier = cap +10 % du record + coût croissant passé ce record.
    const budget = bloomerBudget(spec.bloomer)
    for (const k of STAT_KEYS) {
        const v = spec.finalStats[k]
        if (typeof v !== "number" || !Number.isInteger(v)) { e.push(`${STAT_LABEL[k]} invalide (doit être un entier).`); continue }
        if (v < MIN_FINAL_STAT) e.push(`${STAT_LABEL[k]} trop basse (min ${MIN_FINAL_STAT}).`)
        if (v > STAT_HARD_CAP[k]) e.push(`${STAT_LABEL[k]} plafonnée à ${STAT_HARD_CAP[k]} (record du dex +10 %).`)
    }
    const cost = specStatCost(spec.finalStats)
    if (Number.isFinite(cost) && cost > budget)
        e.push(`Budget de stats dépassé : ${cost} / ${budget} (les points au-dessus du record du dex coûtent double — courbe ${BLOOMERS[spec.bloomer].label}).`)

    // Cohérence stat ↔ type (anti build-piège) : si une stat offensive DOMINE nettement, au moins un type STAB
    // doit frapper de ce côté-là (sinon le STAB est inexploitable). Basé sur les VRAIES stats, pas sur le rôle.
    const atk = spec.finalStats.atk ?? 0, spc = spec.finalStats.spc ?? 0
    if (Math.abs(atk - spc) >= 25 && !badType(spec.finalTypes)) {
        const domCat = atk > spc ? "PHYSICAL" : "SPECIAL"
        const hasMatchingStab = spec.finalTypes.some((t) => moveCategory(t) === domCat)
        if (!hasMatchingStab)
            e.push(`Incohérence stat/type : ta plus grosse stat offensive est ${domCat === "PHYSICAL" ? "l'Attaque (types physiques)" : "le Spécial (types spéciaux)"}, mais aucun de tes types (${spec.finalTypes.join("/")}) ne frappe de ce côté → ton STAB serait inexploitable. Choisis un type ${domCat === "PHYSICAL" ? "physique (Normal/Combat/Sol/Roche/Vol…)" : "spécial (Feu/Eau/Élec/Psy/Plante/Glace…)"} ou rééquilibre tes stats.`)
    }

    // Learnset : un pick par slot, attaque ACCESSIBLE pour son niveau (+ attributs), pas de doublon.
    const lts = lineTypes(spec)
    const total = BST(spec.finalStats)
    const attr = attributeMoveIds(spec.attributes)
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
        const accessible = moveOptionsFor(lts, lvl, total, attr).includes(slot.moveId) // type + niveau (+ attributs)
        // Slots forcés : 1 = basique (Normal/STAB, sans effet) · 2 = statut faible.
        if (i === FORCED_BASIC_SLOT) {
            if (!accessible || !isDamagingMove(mv) || !hasNoSideEffect(mv)) e.push(`Palier 1 (niv ${lvl}) : doit être une attaque BASIQUE — Normal ou ton type, P≤${maxPowerForLevel(lvl)}, sans effet secondaire.`)
        } else if (i === FORCED_STATUS_SLOT) {
            if (!accessible || isDamagingMove(mv)) e.push(`Palier 2 (niv ${lvl}) : doit être une attaque de STATUT faible.`)
        } else if (!accessible) e.push(`« ${mv.name} » n'est pas accessible au niv ${lvl} (type/puissance/force).`)
    })

    // CAROTTE ULTIME (optionnelle) : offensive de ton type (Normal/STAB/attribut), P ≤ cap-vitesse, apprenable, non-doublon.
    if (spec.ultimateMove) {
        const um = getMove(spec.ultimateMove)
        const cap = ultimatePowerCap(spec.finalStats.spe)
        if (!um || !isLearnableMove(spec.ultimateMove)) e.push("Carotte ultime : attaque inconnue ou inapprenable.")
        else if (spec.learnset.some((l) => l.moveId === spec.ultimateMove)) e.push(`Carotte ultime : « ${um.name} » est déjà dans ton learnset.`)
        else if (!moveOptionsFor(lts, ULTIMATE_LEVEL, total, attr).includes(spec.ultimateMove) || !isDamagingMove(um) || effectivePower(um) > cap)
            e.push(`Carotte ultime : attaque offensive de ton type (Normal/STAB/attribut), P≤${cap}.`)
    }

    // Composition du learnset (équilibre) : statuts, STAB, couverture, rareté.
    const moves = spec.learnset.map((s) => getMove(s.moveId)).filter((m): m is MoveData => !!m)
    const offensive = moves.filter(isDamagingMove)
    const status = moves.filter((m) => !isDamagingMove(m))
    if (moves.length > 0 && status.length / moves.length < MIN_STATUS_RATIO)
        e.push(`Trop peu de statuts : ${status.length}/${moves.length} (min ${Math.ceil(moves.length * MIN_STATUS_RATIO)}, soit 1 sur 4).`)
    // STAB & couverture évalués sur les types du STADE FINAL (pas l'union de la lignée) : sinon un typeChange
    // ferait passer les attaques du type pré-évolution pour du STAB gratuit alors que le final ne les a plus.
    const stab = offensive.filter((m) => spec.finalTypes.includes(m.type)).length
    if (stab > MAX_STAB) e.push(`Trop d'attaques STAB : ${stab} (max ${MAX_STAB}).`)
    const coverage = offensive.filter((m) => m.type !== "NORMAL" && !spec.finalTypes.includes(m.type)).length
    if (coverage > MAX_COVERAGE) e.push(`Trop d'attaques de couverture : ${coverage} (max ${MAX_COVERAGE}).`)
    const commonish = offensive.filter((m) => { const r = moveRarity(m.id); return r === "commune" || r === "répandue" }).length
    if (offensive.length > 0 && commonish / offensive.length < MIN_COMMON_RATIO)
        e.push(`Trop d'attaques rares : au moins ${Math.ceil(offensive.length * MIN_COMMON_RATIO)} offensives doivent être communes/répandues (actuel : ${commonish}/${offensive.length}).`)

    // POOL DE PUISSANCE : la cascade cumulative est appliquée en direct dans le PICKER (le max d'un slot dépend des
    // précédents). Ici on garde un garde-fou global tolérant : la MOYENNE offensive ne doit pas exploser le dex
    // (tolérance pour les types pauvres en attaques faibles, où la cascade ne peut pas être satisfaite exactement).
    if (offensive.length > 0) {
        const avgPow = Math.round(offensive.reduce((a, m) => a + effectivePower(m), 0) / offensive.length)
        const capAvg = maxAvgOffPower(total, spec.finalTypes)
        if (avgPow > capAvg + POWER_AVG_TOLERANCE)
            e.push(`Pool de puissance trop élevé : moyenne ${avgPow}/attaque (max ~${capAvg}). Pour une attaque très forte, prends des attaques plus faibles ailleurs.`)
    }

    // Anti-stall : un Daemon très résistant ne peut PAS cumuler SOIN (Repos/soin %) ET USURE (Toxik/Vampigraine)
    // — ça crée un mur imbattable. Compromis : sur un gros bulk, choisis de te soigner OU d'user, pas les deux.
    const hasHeal = moves.some((m) => m.effect?.restSleep || (m.effect?.healPct ?? 0) > 0)
    const hasWear = moves.some((m) => m.effect?.inflictStatus === "TOXIC" || m.effect?.inflictVolatile === "SEEDED")
    const bulk = (spec.finalStats.hp ?? 0) + (spec.finalStats.def ?? 0)
    if (hasHeal && hasWear && bulk >= STALL_BULK_THRESHOLD)
        e.push(`Combo de stall interdit : avec autant de PV+Défense (${bulk}), tu ne peux pas avoir À LA FOIS une attaque de SOIN et une d'USURE (Toxik/Vampigraine) — mur imbattable. Retire l'une des deux, ou baisse ta bulk.`)
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
    // 3 stades → forme de courbe choisie ; 1-2 stades → ratios par défaut.
    const ratios = spec.stages === 3 ? CURVE_RATIOS[spec.curve ?? "linear"] : STAGE_RATIOS[spec.stages]
    const finalBst = BST(spec.finalStats)
    const baseId = `custom_${slug(ownerId)}_${slug(spec.name)}`
    const evoLevels = spec.stages === 3 ? cfg.evo3 : spec.stages === 2 ? cfg.evo2 : []
    const learnset = spec.learnset.map((s) => ({ level: s.level, moveId: s.moveId }))
    // CAROTTE ULTIME : attaque bonus hors-pool, ajoutée au learnset au niveau ULTIMATE_LEVEL (si valide/apprenable).
    if (spec.ultimateMove && isLearnableMove(spec.ultimateMove) && !learnset.some((l) => l.moveId === spec.ultimateMove)) {
        learnset.push({ level: ULTIMATE_LEVEL, moveId: spec.ultimateMove })
    }

    const chain: SpeciesData[] = []
    for (let i = 0; i < spec.stages; i++) {
        const stage = i + 1
        const id = `${baseId}_s${stage}`
        const types = typesAtStage(spec, stage)
        const baseStats = stage === spec.stages ? { ...spec.finalStats } : scaledStats(spec.finalStats, ratios[i])
        const nextId = `${baseId}_s${stage + 1}`
        chain.push({
            id, dexNo: dexNoFor(id),
            name: spec.stageNames?.[stage]?.trim() || `${spec.name}${ROMAN[stage] ?? ""}`,
            types: [...types],
            baseStats,
            learnset,
            evolution: i < spec.stages - 1 ? { toId: nextId, method: { kind: "LEVEL", level: evoLevels[i] } } : undefined,
            catchRate: 45,
            baseExp: Math.round(BST(baseStats) * 0.45),
            rarity: "RARE",
            growthRate: cfg.growthRate,
            role: roleOf(spec.finalStats, spec.finalTypes),
            secretTalent: spec.secretTalent, // talent secret de la lignée → lu par le moteur (talentEffects)
            description: ((stage === spec.stages && spec.daFinal?.trim()) ? spec.daFinal.trim() : spec.da.trim())
                + (spec.character.trim() ? ` — ${spec.character.trim()}` : ""),
            sprite: "/yellow/sprites/dex/missingno.png", // placeholder MISSINGNO : Sartay génère le vrai sprite après la 1re création (notif Ligue)
        })
        void finalBst
    }
    return chain
}

/** baseId d'une lignée custom stockée (`custom_${slug(ownerId)}_${slug(name)}`) — préfixe commun à tous ses
 *  stades (_s1/_s2/_s3). Sert à retrouver la spec depuis un speciesId d'instance (éventuellement évoluée). */
export function customLineageBaseId(d: StoredCustomDaemon): string {
    return `custom_${slug(d.ownerId)}_${slug(d.spec.name)}`
}
/** speciesId du STADE 1 (starter) d'une lignée custom stockée — pour createMonInstance en NG+.
 *  Déterministe et aligné sur buildCustomSpecies (`custom_${slug(ownerId)}_${slug(name)}_s1`). */
export function customStarterSpeciesId(d: StoredCustomDaemon): string {
    return `${customLineageBaseId(d)}_s1`
}

/** NÉMÉSIS : à partir de la création du JOUEUR, génère une lignée CONTRE (pure, valide) — types super-efficaces
 *  contre lui + archétype INVERSÉ (joueur rapide/fragile → némésis costaud qui survit et riposte ; joueur lent/mur
 *  → némésis rapide qui le déborde), catégorie offensive alignée sur le STAB choisi. Deviendra l'équipe d'ACE. */
export function buildNemesis(player: CustomSpec): CustomSpec {
    const sum = (s: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + s[k], 0)
    // 1) Types : ceux qui frappent le joueur en SUPER-EFFICACE (exploitent ses faiblesses). Fallback = Dragon.
    //    FÉE est EXCLUE (réservée au légendaire Ukognos) : la némésis d'ACE ne sera jamais Fée avant qu'on ne le rencontre.
    const weak = weaknessTypes(player.finalTypes).filter((t) => t !== "FEE")
    const nemTypes: PokeType[] = (weak.length ? weak.slice(0, 2) : ["DRAGON"])
    const physSTAB = moveCategory(nemTypes[0]) === "PHYSICAL" // catégorie du STAB principal → oriente l'offense
    // 2) Archétype INVERSÉ. Joueur rapide (spe ≥ 100) → némésis costaud (bulk < seuil anti-stall) mais lent ;
    //    joueur lent/mur → némésis rapide qui l'outspeed. Offense sur la stat du STAB (physique/spéciale).
    const playerFast = (player.finalStats.spe ?? 0) >= 100
    const spe = playerFast ? 60 : Math.min(STAT_HARD_CAP.spe, Math.max(115, (player.finalStats.spe ?? 0) + 12))
    const bulk = playerFast ? { hp: 100, def: 82 } : { hp: 72, def: 62 } // hp+def < 190 → pas de blocage anti-stall
    const off = physSTAB ? { atk: 130, spc: 52 } : { atk: 52, spc: 130 }
    const raw: Record<StatKey, number> = { hp: bulk.hp, atk: off.atk, def: bulk.def, spe, spc: off.spc }
    const finalStats = fitStatsToBudget(raw, bloomerBudget(player.bloomer))
    return {
        name: player.name ? `Némésis de ${player.name}` : "Némésis",
        da: `Un Daemon-miroir ténébreux, forgé sur mesure pour anéantir ${player.name || "ta création"} : chaque trait vise ses failles.`,
        character: "froid, calculateur, obsédé par ta défaite",
        stages: 3, bloomer: player.bloomer, curve: "linear",
        role: physSTAB ? "attaquant-phys" : "attaquant-spe",
        finalTypes: nemTypes, finalStats,
        learnset: suggestLearnset(nemTypes, sum(finalStats), nemTypes),
    }
}

/** Aperçu compact pour l'UI : BST + stats + types par stade, et un libellé de catégorie d'attaque. */
export interface StagePreview { name: string; types: PokeType[]; baseStats: Record<StatKey, number>; bst: number; evoLevel?: number }
export function previewLine(spec: CustomSpec, ownerId = "preview"): StagePreview[] {
    const chain = buildCustomSpecies(spec, ownerId)
    return chain.map((s) => ({ name: s.name, types: s.types, baseStats: s.baseStats, bst: BST(s.baseStats), evoLevel: s.evolution?.method && "level" in s.evolution.method ? (s.evolution.method as { level: number }).level : undefined }))
}

/** Catégorie (PHYS/SPÉ) qu'aura une attaque de ce type — aide le joueur à aligner ses stats. */
export function moveCat(type: PokeType): "PHYS" | "SPÉ" { return moveCategory(type) === "PHYSICAL" ? "PHYS" : "SPÉ" }
