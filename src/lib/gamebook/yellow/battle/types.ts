// src/lib/gamebook/yellow/battle/types.ts
//
// Nexus Jaune Éclair — TYPES FONDAMENTAUX (moteur de combat STRICT Gen 1).
// 100% React-free. Spécificités Gen 1 :
//   - 5 stats : HP, Attaque, Défense, Vitesse, SPÉCIAL (unifié, pas de split).
//   - la catégorie physique/spéciale d'un move dépend de son TYPE (cf. typeChart),
//     PAS du move → MoveData n'a donc PAS de champ "category".
//   - 15 types, 4 moves max.

// ============================================================
// Types élémentaires (15 — Gen 1)
// ============================================================

export const POKE_TYPES = [
    "NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE",
    "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE",
    "ROCHE", "SPECTRE", "DRAGON",
] as const
export type PokeType = (typeof POKE_TYPES)[number]

// 5 stats Gen 1 (spc = "Spécial" unifié : sert à l'attaque ET à la défense spéciale).
export type StatKey = "hp" | "atk" | "def" | "spe" | "spc"

/** Stats modifiables par stages en combat (+ précision/esquive), -6..+6. */
export type StageKey = "atk" | "def" | "spe" | "spc" | "acc" | "eva"
export type StatStages = Record<StageKey, number>

// Statuts majeurs (non-volatils, EXCLUSIFS entre eux).
export type MajorStatus =
    | "NONE" | "BURN" | "POISON" | "TOXIC" | "PARALYSIS" | "SLEEP" | "FREEZE"

// Statuts volatils (peuvent coexister, disparaissent au switch/fin de combat).
export type VolatileStatus =
    | "CONFUSION" | "FLINCH" | "SEEDED" | "TRAPPED" | "RECHARGE"

// ============================================================
// Données statiques (data/)
// ============================================================

export interface MoveEffect {
    /** Probabilité (0..100) d'appliquer l'effet secondaire. Défaut 100. */
    chance?: number
    inflictStatus?: Exclude<MajorStatus, "NONE">
    inflictVolatile?: VolatileStatus
    statChanges?: Array<{ target: "self" | "target"; stat: StageKey; stages: number }>
    flinch?: boolean
    drainPct?: number
    recoilPct?: number
    multiHit?: [number, number]
    healPct?: number
    /** Move à haute chance de critique (Gen 1 : ratio basé sur la vitesse de base ×8). */
    highCrit?: boolean
    /** Move à DEUX TOURS : tour 1 = décharge faible (power du move) + statChanges, puis le Daemon
     *  est verrouillé et LIBÈRE automatiquement au tour suivant une frappe forte (power 60, highCrit). */
    twoTurn?: boolean
    /** KAMIKAZE : après avoir infligé ses dégâts, l'attaquant tombe à 1 PV (au lieu de s'auto-K.O.
     *  comme une vraie Destruction). Ex. « Détonation » de Bouh → reste systématiquement à 1 PV. */
    selfHpToOne?: boolean
    /** TUNNEL (dig) à 2 tours AVEC invulnérabilité : tour 1 = creuse et disparaît sous terre
     *  (INVULNÉRABLE, les attaques le MANQUENT), tour 2 = jaillit et frappe (power du move).
     *  Distinct de twoTurn (qui frappe aux 2 tours sans invuln). Ex. « Tunnel » de Gékroc. */
    dig?: boolean
    /** VOL (fly) : jumeau de dig, mais invulnérabilité AÉRIENNE — tour 1 = s'envole (INVULNÉRABLE, les
     *  attaques le MANQUENT sauf coup sûr/Météores), tour 2 = fond du ciel et frappe (power du move). */
    fly?: boolean
    /** COUP SÛR (ex. « Météores ») : ignore l'invulnérabilité (cible sous terre via Tunnel / en vol).
     *  Combiné à accuracy ≤ 0, le move NE RATE JAMAIS — esquive, mirage ET semi-invulnérabilité inclus. */
    sureHit?: boolean
    /** BRUME SPORALE (façon Buée Noire) : réinitialise TOUS les changements de stats des DEUX camps. */
    resetStats?: boolean
    /** REPOS : le LANCEUR s'endort volontairement pour EXACTEMENT 1 tour (en plus du soin healPct). */
    restSleep?: boolean
    /** HYPNOSE : précision de base FIXE (move.accuracy), INDÉPENDANTE de l'esquive, modulée par le ratio
     *  de Vitesse lanceur/cible (plus rapide → plus précis, plus lent → moins précis). Clampée. */
    speedScaledAcc?: boolean
}

export interface MoveData {
    id: string
    name: string
    type: PokeType
    /** Puissance de base (0 = move de STATUT, ne fait pas de dégâts directs). */
    power: number
    /** Précision 0..100. 0 = ne rate jamais. */
    accuracy: number
    pp: number
    priority?: number
    /** STATUTS (puissance 0) : « puissance de coût » pour le calcul du prix en reps (palier d'impact).
     *  Absent → palier par défaut (cf. STATUS_DEFAULT_CP). Ignoré pour les attaques de dégâts (cp = puissance). */
    costPower?: number
    effect?: MoveEffect
    description?: string
}

/** Un move fait-il des dégâts directs ? (Gen 1 : sinon c'est un move de statut.) */
export function isDamaging(move: MoveData): boolean {
    return move.power > 0
}

export type EvolutionMethod =
    | { kind: "LEVEL"; level: number }
    | { kind: "ITEM"; itemId: string }
    | { kind: "TRADE" }

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY"

export interface SpeciesData {
    id: string
    dexNo: number
    name: string
    types: PokeType[]                 // 1 ou 2 types
    baseStats: Record<StatKey, number>  // hp, atk, def, spe, spc
    learnset: Array<{ level: number; moveId: string }>
    evolution?: { toId: string; method: EvolutionMethod }
    catchRate: number                 // 0..255
    baseExp: number
    rarity: Rarity
    description: string
    sprite: string
    /** Courbe d'XP (cf. game design). Défaut implicite : "medium_fast" (= L³). */
    growthRate?: "medium_fast" | "fast" | "slow" | "medium_slow"
    /** Rôle de game-design (lisibilité éditoriale, non utilisé par le moteur). */
    role?: string
    /** GÉKROC : apprend TOUTES les CT, quel que soit le type (couteau-suisse). Défaut : compat normale. */
    learnsAllCts?: boolean
    /** SURPRISE : MASQUÉ du Pokédex (même pas « vu ») tant que NON capturé (ex. Gékroc, Goshendofy). */
    hiddenUntilCaught?: boolean
    /** EXCLUSIF : Daemon unique/offert (reçu UNE seule fois). Plancher de courbe ×1.10
     *  (jamais plus rapide à monter ; un exclusif colossal prend quand même ×1.25). Voir growthCurve.ts. */
    exclusive?: boolean
    /** COURBE PAR STADE : le palier d'XP suit le BST du STADE COURANT (et non du stade final).
     *  Réservé aux lignées à très gros écart base→final (ex. lignée golem Mottoche→Mégalithe) :
     *  on monte vite tant qu'on est petit, le grind n'arrive qu'au sommet. Défaut = BST final. */
    growthByStage?: boolean
}

// ============================================================
// Instances concrètes
// ============================================================

export interface MoveSlot {
    moveId: string
    pp: number
    ppMax: number
}

export interface MonInstance {
    uid: string
    speciesId: string
    nickname?: string
    level: number
    exp: number
    ivs: Record<StatKey, number>      // 0..15 (Gen 1 : "DV" sur 4 bits)
    currentHp: number
    status: MajorStatus
    statusCounter: number
    moves: MoveSlot[]
    owned?: boolean
    /** CHROMATIQUE (shiny) : tiré ~1/512 au spawn sauvage. IV parfaits + **+10% sur chaque stat**
     *  (cf. fullStats — "un peu plus que parfait"). Cosmétique : rendu avec un filtre + ✨. */
    shiny?: boolean
    /** Attaques apprises à un niveau alors que les 4 slots étaient pleins :
     *  en attente d'un choix « oublier une capacité » côté UI. Transitoire. */
    pendingMoves?: string[]
    /** EXPÉRIENCE DE COMBAT (EV) — effort accumulé par stat au fil des victoires (plafonné, additif). */
    ev?: Partial<Record<StatKey, number>>
    /** ENTRAÎNEMENT SAIYAN — points de stats non encore dépensés (gagnés au level-up). */
    statPoints?: number
    /** ENTRAÎNEMENT SAIYAN — bonus à plat alloués par le joueur, par stat (additif). */
    allocated?: Partial<Record<StatKey, number>>
    /** SAIYAN — niveaux gagnés pas encore convertis en points (règle amende/quota appliquée après coup, async). */
    pendingSaiyanLevels?: number
    /** SAIYAN — date (YYYY-MM-DD) du dernier passage de niveau converti (début de fenêtre). */
    lastLevelUpAt?: string
    /** Niveau auquel ce Daemon a été capturé (flavor, affiché dans la fiche). */
    capturedLevel?: number
    /** Date de capture (YYYY-MM-DD). */
    capturedAt?: string
    /** Plus gros dégât infligé par ce Daemon jusqu'ici + l'attaque correspondante. */
    bestDmg?: number
    bestDmgMove?: string
    // ── IDENTITÉ SOCIALE (échanges/Pokédex) — flavor, JAMAIS lu par le moteur de combat ──
    /** Dresseur d'ORIGINE (User.id du captureur). Posé une fois à la capture, jamais réécrit. */
    originalTrainerId?: string
    /** Possesseur ACTUEL (User.id). Réassigné à chaque échange. */
    currentOwnerId?: string
    /** Échangé au moins une fois → surnom verrouillé + bonus d'XP d'échange. */
    traded?: boolean
    /** Surnom d'origine figé (affichage verrouillé si le Daemon a été reçu d'un autre). */
    originalNickname?: string
    /** NOM (pseudo) du dresseur d'origine, pour l'afficher sur la fiche d'un Daemon reçu. */
    originalTrainerName?: string
    // ── MÉTADONNÉES DE CAPTURE (Pokédex enrichi) ──
    /** Carte où le Daemon a été capturé. */
    capturedMapId?: string
    /** Quota du jour atteint au moment de la capture (génétique bonifiée). */
    capturedQuotaReached?: boolean
}

export interface BattleMon extends MonInstance {
    stages: StatStages
    volatiles: Partial<Record<VolatileStatus, number>>
    /** Plus gros coup porté DANS CE COMBAT — runtime, JAMAIS persisté. Repart de 0 à
     *  chaque combat (toBattleMon le laisse undefined) → le débrief GOAT ne reflète QUE
     *  le combat courant, sans traîner les records des combats précédents. À ne pas
     *  confondre avec `bestDmg` (record À VIE, persisté, affiché sur la fiche). */
    battleBestDmg?: number
    battleBestDmgMove?: string
    /** OPENING SCRIPTÉ (ennemi/boss) : moveIds imposés à ses 1ers tours, dans l'ordre, quoi qu'il
     *  arrive (priorité sur l'IA et le budget d'énergie). Consommé un par un. Runtime, non persisté. */
    openingMoves?: string[]
    /** MOVE À 2 TOURS en cours : moveId que ce Daemon est en train de CHARGER → il est verrouillé
     *  et libère sa décharge au tour suivant (quoi qu'il arrive). Runtime, non persisté. */
    chargingMove?: string
    /** TUNNEL (dig) : le Daemon est SOUS TERRE (tour 1 de Tunnel) → les attaques adverses le MANQUENT,
     *  jusqu'à ce qu'il ressorte au tour 2. Posé/levé en même temps que chargingMove. Runtime, non persisté. */
    semiInvuln?: boolean
    /** SAUVAGE (Centrale) : le Daemon FUIT (fin de combat, aucune récompense) une fois ce nombre
     *  de tours atteint (ex. Boltah ≤5, Heatah ≤3). Runtime, non persisté. */
    fleeAfterTurns?: number
    /** SAUVAGE : capture IMPOSSIBLE si le ballBonus de la Ball lancée est < cette valeur
     *  (ex. Zappeuréal = Hyper Ball+ → 4). Runtime, non persisté. */
    captureMinBallBonus?: number
    /** SAUVAGE : multiplie la valeur de capture (×<1 = plus dur, ex. Thundah/Bélunode). Runtime. */
    captureMult?: number
    /** SAUVAGE : capture IMPOSSIBLE tant que le Daemon n'a pas de STATUT majeur (para/sommeil/poison/
     *  brûlure/gel) — hommage légendaire Gen1 (ex. Goshendofy). La Master Ball shunte. Runtime. */
    captureRequiresStatus?: boolean
    /** SAUVAGE : si présent avec captureMinBallBonus, un STATUT majeur SHUNTE l'exigence de Ball
     *  (capturable avec Super Ball+ OU sous statut, ex. Bouh). Runtime, non persisté. */
    captureStatusBypassesBall?: boolean
}

export function neutralStages(): StatStages {
    return { atk: 0, def: 0, spe: 0, spc: 0, acc: 0, eva: 0 }
}
