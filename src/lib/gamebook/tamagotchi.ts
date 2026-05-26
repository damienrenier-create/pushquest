// src/lib/gamebook/tamagotchi.ts
//
// v3.14 — Tamagotchi adoptable chez le vétérinaire (V3T) de Macaron'île.
// v3.15 — Rework : le tamagotchi n'évolue plus via feedCount, il suit l'animal
// du bestiaire (lib/xp.ts) correspondant au level XP réel du joueur.
//
// Règles :
//   - Adoption : 50 reps, choix du nom. currentLevel = level XP actuel du joueur.
//   - Feed : 20 reps. Happiness +30 (clamp 100). currentLevel = max(stored, userLevel).
//   - Decay : -1 happiness toutes les 6h depuis lastFedAt. Plancher à 0 (jamais de mort).
//   - Si happiness > 0 (au moment du read) : currentLevel suit le level XP du joueur (catch-up).
//   - Si happiness == 0 : currentLevel reste figé à sa valeur stockée → le tamagotchi REFUSE D'ÉVOLUER.
//
// L'animal affiché (nom + emoji + ceinture) provient de getLevelDetails(currentLevel) côté view.
// Cf. lib/xp.ts pour la liste XP_ANIMALS (100 animaux).

export interface Tamagotchi {
    name: string
    adoptedAt: string       // ISO timestamp
    lastFedAt: string       // ISO timestamp
    happiness: number       // 0..100 (valeur stockée, AVANT decay)
    /** Level du tamagotchi : suit le level XP du joueur quand happy, figé quand sad. */
    currentLevel: number
    // v3.19 — Tracking des 7 défis d'adoption (indices 0..6 = canoniques cf. CANONICAL_DEFIS).
    // Clés numériques as strings (JSON safe). Valeur true = défi complété.
    defiProgress?: Record<string, true>
    // v3.19 — true une fois que les 7 défis sont validés et que le joueur "libère" l'animal.
    recovered?: boolean
    recoveredAt?: string    // ISO timestamp
    // v3.19 — Tracking timestamps de visite (pour défi 4 : matin + après-midi)
    lastMorningVisitDate?: string    // YYYY-MM-DD du dernier matin (avant 12h) où on a vu V3T
    lastAfternoonVisitDate?: string  // YYYY-MM-DD du dernier après-midi (après 12h)
}

// Constantes
// v3.21.1 — Adoption gratuite : c'est le véto qui décide à la libération si l'animal nous suit (post-7 défis).
export const TAMAGOTCHI_ADOPT_COST = 0
export const TAMAGOTCHI_FEED_COST = 20
export const TAMAGOTCHI_FEED_HAPPINESS_BOOST = 30
export const TAMAGOTCHI_HAPPINESS_MAX = 100
/** Heures entre chaque -1 de happiness. */
export const TAMAGOTCHI_DECAY_INTERVAL_HOURS = 6

/**
 * Parse défensif : accepte aussi l'ancien format v3.14 (stage, feedCount) qu'on ignore.
 * Si currentLevel est absent (ancien format), on retombe sur 1.
 */
export function parseTamagotchi(raw: unknown): Tamagotchi | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.name !== "string" || o.name.length === 0) return null
    if (typeof o.adoptedAt !== "string") return null
    if (typeof o.lastFedAt !== "string") return null
    const happinessRaw = typeof o.happiness === "number" && Number.isFinite(o.happiness) ? o.happiness : 0
    const currentLevelRaw = typeof o.currentLevel === "number" && Number.isFinite(o.currentLevel)
        ? o.currentLevel
        : 1
    // v3.19 — defiProgress + recovered (parsing défensif)
    let defiProgress: Record<string, true> | undefined
    if (o.defiProgress && typeof o.defiProgress === "object" && !Array.isArray(o.defiProgress)) {
        defiProgress = {}
        for (const [k, v] of Object.entries(o.defiProgress as Record<string, unknown>)) {
            if (v === true) defiProgress[k] = true
        }
    }
    return {
        name: o.name,
        adoptedAt: o.adoptedAt,
        lastFedAt: o.lastFedAt,
        happiness: Math.max(0, Math.min(TAMAGOTCHI_HAPPINESS_MAX, Math.floor(happinessRaw))),
        currentLevel: Math.max(1, Math.min(100, Math.floor(currentLevelRaw))),
        defiProgress,
        recovered: o.recovered === true,
        recoveredAt: typeof o.recoveredAt === "string" ? o.recoveredAt : undefined,
        lastMorningVisitDate: typeof o.lastMorningVisitDate === "string" ? o.lastMorningVisitDate : undefined,
        lastAfternoonVisitDate: typeof o.lastAfternoonVisitDate === "string" ? o.lastAfternoonVisitDate : undefined,
    }
}

/**
 * v3.37 — Le decay temps "-1 toutes les 6h depuis lastFedAt" est RETIRÉ.
 * Le bonheur évolue désormais sur des triggers explicites (cf. happinessChanges.ts) :
 *   - decay activité : -1 par 50 pas
 *   - decay déconnexion : -10 si lastSeen > 6h (1×/jour)
 *   - +/- divers triggers (boire, défis PNJ, brutes, happyFlower, etc.)
 * Cette fonction reste exportée pour compatibilité mais retourne le happiness brut.
 */
export function effectiveHappiness(tam: Tamagotchi, _nowMs: number = Date.now()): number {
    void _nowMs
    return tam.happiness
}

/**
 * v3.23h — Calcule le level "affiché" du tamagotchi.
 *
 * Doctrine v3.23h (validée 2026-05-25) : l'animal ne ré-évolue JAMAIS après l'adoption.
 * Il reste figé au niveau choisi au moment du 1er passage chez V3T (`vetFirstVisitLevel`,
 * utilisé pour seed currentLevel à l'adoption). Le joueur peut level up dans l'app, son
 * animal garde son apparence d'origine — c'est SON animal.
 *
 * (Avant v3.23h : le tamagotchi suivait le level XP du joueur quand happy.)
 */
export function effectiveLevel(tam: Tamagotchi): number {
    return tam.currentLevel
}

export interface TamagotchiView extends Tamagotchi {
    /** Happiness recalculée avec decay (à afficher au client). */
    displayHappiness: number
    /** Level affiché (catch-up XP si happy, sinon figé). */
    displayLevel: number
    /** True si le tamagotchi est gelé (happiness=0) → refuse d'évoluer. */
    isFrozen: boolean
    // v3.19 — Progression d'adoption
    defisDone: number
    defisTotal: number
    /** Ordre des défis pour CET animal (permutation déterministe). */
    defiOrder: number[]
    /** True quand les 7 défis sont validés et qu'on peut libérer. */
    eligibleToRecover: boolean
    /** Narrative actuelle de V3T (lore-style, jamais de chiffres). */
    v3tNarrative: string
}

/**
 * Vue prête à afficher (happiness recalculée + progression défis).
 * v3.23h — Le level affiché est figé sur tam.currentLevel (= vetFirstVisitLevel à l'adoption).
 * Ne dépend pas de xp.ts pour rester côté client safe (l'animal est résolu côté UI).
 *
 * Le paramètre userLevel est conservé pour rétrocompat de signature mais ignoré
 * pour le rendu de l'animal (l'animal ne suit plus le level du joueur).
 */
export function viewTamagotchi(tam: Tamagotchi, _userLevel: number, nowMs: number = Date.now()): TamagotchiView {
    void _userLevel  // intentionnellement ignoré depuis v3.23h
    const displayHappiness = effectiveHappiness(tam, nowMs)
    const displayLevel = effectiveLevel(tam)
    const defisDone = countDefisDone(tam)
    const defisTotal = CANONICAL_DEFIS.length
    const recovered = tam.recovered === true
    return {
        ...tam,
        happiness: displayHappiness,
        currentLevel: displayLevel,
        displayHappiness,
        displayLevel,
        isFrozen: displayHappiness === 0,
        defisDone,
        defisTotal,
        defiOrder: getDefiOrderForAnimalLevel(displayLevel),
        eligibleToRecover: defisDone === defisTotal && !recovered,
        v3tNarrative: v3tNarrativeForProgress(defisDone, defisTotal, recovered),
    }
}

/**
 * Crée un tamagotchi tout neuf au moment de l'adoption.
 */
export function createTamagotchi(name: string, userLevel: number, nowMs: number = Date.now()): Tamagotchi {
    const iso = new Date(nowMs).toISOString()
    return {
        name: name.slice(0, 16),
        adoptedAt: iso,
        lastFedAt: iso,
        happiness: TAMAGOTCHI_HAPPINESS_MAX,
        currentLevel: Math.max(1, Math.min(100, Math.floor(userLevel))),
    }
}

/**
 * Applique un nourrissage : +30 happiness (clamp 100), lastFedAt = now.
 * v3.23h — currentLevel n'est PLUS modifié (l'animal est figé depuis l'adoption).
 */
export function applyFeed(tam: Tamagotchi, _userLevel: number, nowMs: number = Date.now()): Tamagotchi {
    void _userLevel  // intentionnellement ignoré depuis v3.23h
    const currentHappiness = effectiveHappiness(tam, nowMs)
    const newHappiness = Math.min(TAMAGOTCHI_HAPPINESS_MAX, currentHappiness + TAMAGOTCHI_FEED_HAPPINESS_BOOST)
    return {
        ...tam,
        lastFedAt: new Date(nowMs).toISOString(),
        happiness: newHappiness,
        // currentLevel ne change pas — l'animal reste celui choisi au 1er passage chez V3T
    }
}

/**
 * Validation simple d'un nom de tamagotchi.
 * Pas vide, max 16 caractères, alphanumérique + espaces simples.
 */
export function isValidTamagotchiName(name: string): boolean {
    if (typeof name !== "string") return false
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 16) return false
    return /^[\p{L}\p{N} '-]+$/u.test(trimmed)
}

// ============================================================
// v3.19 — DÉFIS D'ADOPTION (les 7 défis canoniques)
// ============================================================

export interface CanonicalDefi {
    index: number  // 0..6
    code: string   // identifiant logique
    title: string  // libellé court
    description: string  // libellé détaillé pour la BIBLIO et le modal V3T
    /** Seuil de base (en reps ou secondes), à multiplier par ratio onboarding côté serveur. */
    baseThreshold?: number
}

// v3.24d — 6 stats animales calculées depuis level + bonus.
export interface AnimalStats {
    force: number
    vitesse: number
    defense: number
    hp: number
    bonheur: number       // = happiness (0..100)
    intelligence: number
}

export interface StatBonus {
    force?: number
    vitesse?: number
    defense?: number
    hp?: number
    intelligence?: number
}

/**
 * Calcule les 6 stats d'un animal à partir de son level, son bonheur,
 * et des bonus permanents (sérum, gourde Capo, etc.).
 *
 * Formules :
 *   force        = level
 *   vitesse      = max(1, round(level * 0.8))
 *   defense      = max(1, round(level * 0.6))
 *   hp           = level * 10
 *   intelligence = max(1, round(level * 0.5)) + serumBonus
 *   bonheur      = happiness
 */
export function computeAnimalStats(
    level: number,
    happiness: number,
    bonus: StatBonus = {},
): AnimalStats {
    const lv = Math.max(1, Math.floor(level))
    return {
        force:        lv + (bonus.force ?? 0),
        vitesse:      Math.max(1, Math.round(lv * 0.8)) + (bonus.vitesse ?? 0),
        defense:      Math.max(1, Math.round(lv * 0.6)) + (bonus.defense ?? 0),
        hp:           lv * 10 + (bonus.hp ?? 0),
        bonheur:      Math.max(0, Math.min(100, Math.round(happiness))),
        intelligence: Math.max(1, Math.round(lv * 0.5)) + (bonus.intelligence ?? 0),
    }
}

export const CANONICAL_DEFIS: CanonicalDefi[] = [
    { index: 0, code: "VISIT", title: "Aller le voir", description: "Rends visite à ton tamagotchi chez le vétérinaire V3T (Macaron'île)." },
    { index: 1, code: "DRINK", title: "Lui donner à boire", description: "Bois ta gourde pendant que tu es chez V3T avec ton tamagotchi." },
    { index: 2, code: "PATES", title: "Lui offrir des pâtes", description: "Consomme une Corned Pâtes (TRENETTE) chez V3T pour la partager avec ton tamagotchi." },
    { index: 3, code: "DAY_HALVES", title: "Le voir matin ET après-midi", description: "Visite V3T une fois avant midi ET une fois après midi le même jour." },
    { index: 4, code: "PLANK_180", title: "180 secondes de gainage", description: "Encode 180 secondes de gainage aujourd'hui (ajusté au ratio onboarding).", baseThreshold: 180 },
    { index: 5, code: "PUSHUP_200", title: "200 pompes APRÈS le gainage", description: "Encode 200 pompes aujourd'hui APRÈS ton premier set de gainage (séquence stricte par timestamp).", baseThreshold: 200 },
    { index: 6, code: "SQUAT_300", title: "300 squats APRÈS les pompes", description: "Encode 300 squats aujourd'hui APRÈS ton premier set de pompes (lui-même post-gainage).", baseThreshold: 300 },
]

/**
 * Permutation déterministe (Fisher-Yates seedé) des 7 indices de défis pour un animal donné.
 * L'ordre dépend du level de l'animal du joueur — chaque animal a son propre ordre.
 */
export function getDefiOrderForAnimalLevel(animalLevel: number): number[] {
    const arr = [0, 1, 2, 3, 4, 5, 6]
    // Mulberry32 seedé par level
    let seed = (animalLevel * 2654435761) >>> 0
    const rand = () => {
        seed = (seed + 0x6D2B79F5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

/**
 * Compte combien de défis ont été complétés.
 */
export function countDefisDone(tam: Tamagotchi): number {
    if (!tam.defiProgress) return 0
    let n = 0
    for (let i = 0; i < CANONICAL_DEFIS.length; i++) {
        if (tam.defiProgress[String(i)] === true) n++
    }
    return n
}

export function isDefiDone(tam: Tamagotchi, index: number): boolean {
    return tam.defiProgress?.[String(index)] === true
}

/**
 * Renvoie un texte narratif pour V3T en fonction de la progression (lore-style, jamais de %).
 */
export function v3tNarrativeForProgress(done: number, total: number, recovered: boolean): string {
    if (recovered) return "Ton animal te suit partout maintenant. Il a confiance."
    if (done === 0) return "Il te regarde de loin. Il ne te connaît pas encore."
    if (done === total) return "Il est prêt. Reviens quand tu veux le récupérer."
    const pct = done / total
    if (pct < 0.25) return "Il commence à reconnaître ton odeur. Mais il garde ses distances."
    if (pct < 0.5) return "Il s'approche quand tu entres. Bon signe."
    if (pct < 0.75) return "Il te suit des yeux. Il attend autre chose de toi."
    return "Il s'agite quand tu arrives. Il est presque prêt. Encore un effort."
}

/**
 * v3.26 — Renvoie le dialogue dynamique COMPLET du vétérinaire V3T selon la progression Tamagotchi.
 * Le véto ne RÉVÈLE PLUS la marche à suivre (voir Livre/Biblio) : il COMMENTE.
 * 8 paliers : aucun défi, premier, ~1/3, ~moitié, ~2/3, presque, prêt, récupéré.
 *
 * @param hasTamagotchi true si le joueur a déjà un tamagotchi associé chez V3T
 * @param done nombre de défis d'adoption validés (0..total)
 * @param total nombre total de défis (= CANONICAL_DEFIS.length)
 * @param recovered true si l'animal a été récupéré (adopté)
 */
export function v3tDialogueLines(hasTamagotchi: boolean, done: number, total: number, recovered: boolean): string[] {
    if (!hasTamagotchi) {
        return [
            "Bienvenue à la Clinique des Compagnons Totem.",
            "Ici, je m'occupe des animaux qui choisissent leurs humains — pas l'inverse.",
            "Approche du comptoir pour rencontrer le tien.",
        ]
    }
    if (recovered) {
        return [
            "*V3T sourit.* Tu reviens en visite ? Bien.",
            "Tu te débrouilles très bien avec lui. Continue.",
        ]
    }
    if (done === 0) {
        return [
            "*V3T te toise par-dessus ses lunettes.*",
            "Ton tamagotchi est là, mais il ne te connaît pas. Pas encore.",
            "Je ne peux pas te dire QUOI faire — va lire les rayons de la biblio.",
            "Mais je te le dis : commence par t'occuper de lui.",
        ]
    }
    const pct = done / total
    if (done === total) {
        return [
            "*V3T applaudit doucement.* Voilà, tu as tout fait.",
            "Il est prêt. Reviens quand tu veux le récupérer — il te suivra partout.",
        ]
    }
    if (pct < 0.2) {
        return [
            "*V3T hoche la tête, sceptique mais bienveillant.*",
            "Il commence à te sentir. C'est un début. Mais ne traîne pas.",
            "S'il a faim ou soif, il finira par t'oublier.",
        ]
    }
    if (pct < 0.4) {
        return [
            "*V3T te regarde avec un sourire en coin.*",
            "Super, je vois que ton animal t'aime un petit peu plus. Il a l'air vraiment content.",
            "Continue. Tu as bien commencé.",
        ]
    }
    if (pct < 0.6) {
        return [
            "*V3T tape doucement sur le comptoir.*",
            "Vous progressez bien tous les deux. Il s'approche quand tu entres maintenant.",
            "Si tu continues tes efforts, vous allez devenir de super amis.",
        ]
    }
    if (pct < 0.8) {
        return [
            "*V3T sourit franchement.*",
            "Il te suit des yeux. Il attend quelque chose de toi — encore.",
            "Tu n'es plus très loin.",
        ]
    }
    return [
        "*V3T retient un sourire.*",
        "Il s'agite quand tu arrives. Tu es son humain, ou presque.",
        "Encore un effort. Un seul.",
    ]
}
