// src/lib/gamebook/yellow/battle/types.ts
//
// Nexus Jaune Éclair — TYPES FONDAMENTAUX (moteur de combat STRICT Gen 1).
// 100% React-free. Spécificités Gen 1 :
//   - 5 stats : HP, Attaque, Défense, Vitesse, SPÉCIAL (unifié, pas de split).
//   - la catégorie physique/spéciale d'un move dépend de son TYPE (cf. typeChart),
//     PAS du move → MoveData n'a donc PAS de champ "category".
//   - 17 types (15 Gen 1 + FÉE réservée à Ukognos + MÉTAL introduit au run 3, forteresse
//     de Magnetor), 4 moves max.

// ============================================================
// Types élémentaires (17 — Gen 1 + FÉE + MÉTAL)
// ============================================================

export const POKE_TYPES = [
    "NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE",
    "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE",
    "ROCHE", "SPECTRE", "DRAGON", "FEE", "METAL", "TENEBRES",
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
    | "CONFUSION" | "FLINCH" | "SEEDED" | "OSMOSED" | "TRAPPED" | "RECHARGE"

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
    /** AROMATHÉRAPIE (façon Glas de Soin) : soigne TOUS les statuts majeurs de TOUTE l'équipe du LANCEUR
     *  (banc compris). Ne touche ni les stats, ni le camp adverse. Le move a power 0. */
    healTeamStatus?: boolean
    /** REPOS : le LANCEUR s'endort volontairement pour EXACTEMENT 1 tour (en plus du soin healPct). */
    restSleep?: boolean
    /** HYPNOSE : précision de base FIXE (move.accuracy), INDÉPENDANTE de l'esquive, modulée par le ratio
     *  de Vitesse lanceur/cible (plus rapide → plus précis, plus lent → moins précis). Clampée. */
    speedScaledAcc?: boolean
    /** DÉGÂTS FIXES (ex. Draco-Rage Gen 1) : inflige toujours exactement N PV, indépendamment des
     *  stats/STAB/multiplicateur de type (seule l'immunité ×0 l'annule). Le move a power 0. */
    fixedDamage?: number
    /** DÉGÂTS FIXES = NIVEAU DU LANCEUR (ex. « Frappe Atlas » / Seismic Toss Gen 1) : inflige toujours
     *  exactement `attacker.level` PV (seule l'immunité ×0 l'annule). Le move a power 0. */
    fixedDamageLevel?: boolean
    /** DRAIN CROISSANT (« Essaim Vorace ») : à chaque coup CONSÉCUTIF réussi, le % de drain grimpe
     *  (20 → 30 → 40 → 50 → 60 → 70%, plafond). Se réinitialise si l'attaque rate, si le Daemon change
     *  d'attaque ou se retire. S'appuie sur `drainPct` (base) et le compteur runtime `swarmStacks`. */
    escalatingDrain?: boolean
    /** CHANCE DE CRITIQUE par espèce (interaction signature) : si l'attaquant est dans cette map,
     *  la proba de critique vaut la valeur (0..1) au lieu du calcul normal. Ex. Fouet de Nouilles :
     *  Nouillon 1.0, Vermisaint 0.8, Divinpâte 0.6. */
    critChanceForSpecies?: Record<string, number>
    /** STAB ADAPTATIF (CT signature « Apothéose ») : au lancement, le TYPE devient un type du Daemon
     *  ET la CATÉGORIE se cale sur sa MEILLEURE stat offensive. Donc toujours STAB, frappant avec la
     *  bonne stat (ex. un Daemon Feu à grosse Attaque tape Feu… mais en PHYSIQUE). Type stocké = NORMAL
     *  (→ apprenable par tous) ; le moteur substitue type+catégorie au calcul de dégâts. */
    adaptiveStab?: boolean
    /** PUISSANCE DYNAMIQUE : "lowHp" = la puissance CROÎT à mesure que les PV de l'ATTAQUANT baissent
     *  (façon Reversal). Le moteur substitue la puissance calculée à move.power (cf. dealMoveDamage).
     *  Utilisé par « Patience » (Karmaki) : plus il a encaissé, plus il rend. */
    dynamicPower?: "lowHp"
    /** MITRA-POING (Focus Punch) : le lanceur CHARGE 1 tour (aucun dégât, vulnérable) ; s'il est TOUCHÉ pendant
     *  la charge il est DÉCONCENTRÉ et rate ; sinon il libère une frappe COMBAT dévastatrice au tour suivant. */
    focusCharge?: boolean
    /** VOL D'ÉCLAT (Wistree) : AVANT les dégâts, transfère TOUS les boosts POSITIFS de la cible vers le lanceur. */
    stealBoosts?: boolean
}

export interface MoveData {
    id: string
    name: string
    type: PokeType
    /** OVERRIDE de catégorie (rare) : par défaut la catégorie est déduite du TYPE (strict Gen 1,
     *  cf. moveCategory). Ce champ force phys/spéc pour une poignée de moves-signature (ex. Crocs de
     *  Feu / Griffe Draconique = FEU/DRAGON mais PHYSIQUES pour taper sur l'ATQ). Absent = règle Gen 1. */
    category?: "PHYSICAL" | "SPECIAL"
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
    /** FUSION (espèce éphémère) : speciesId des 2 parents → permet d'afficher le placeholder Chimère (moitié-moitié)
     *  en COMBAT quand aucun sprite dédié/généré n'est disponible (repli bien plus joli que MissingNo). */
    fusionParents?: [string, string]
    /** Courbe d'XP (cf. game design). Défaut implicite : "medium_fast" (= L³). */
    growthRate?: "medium_fast" | "fast" | "slow" | "medium_slow"
    /** Rôle de game-design (lisibilité éditoriale, non utilisé par le moteur). */
    role?: string
    /** TALENT SECRET d'une lignée CUSTOM (créateur de Daemon) : clé de talent lue par le moteur (talentEffects).
     *  Undefined pour toute espèce standard → aucun effet (le combat existant est strictement inchangé). */
    secretTalent?: string
    /** GÉKROC : apprend TOUTES les CT, quel que soit le type (couteau-suisse). Défaut : compat normale. */
    learnsAllCts?: boolean
    /** SURPRISE : MASQUÉ du Pokédex (même pas « vu ») tant que NON capturé (ex. Gékroc, Goshendofy). */
    hiddenUntilCaught?: boolean
    /** RÉSERVÉ AU RUN 2 (New Game+) : ABSENT des dex (Pokédex in-game ET dex de référence) — pas même une
     *  case « ??? » ni un point dans le compteur — TANT QUE non capturé. N'apparaît qu'une fois obtenu en NG+
     *  (ex. Gékraise, Ukognos, Merorem). Cf. visibleDexSpecies(). */
    runTwoOnly?: boolean
    /** RÉSERVÉ AU RUN 3 (concours) : ABSENT des dex TANT QU'ON N'EST PAS EN RUN 3. Le DEX (catalogue) est tiéré
     *  par run — run 1 → Daemons du run 1 ; run 2 → run 1+2 ; run 3 → TOUS. Le tiering l'emporte sur `caught`
     *  (une espèce run-3 capturée ne s'affiche PAS dans le dex d'un run antérieur). Ex. Magnetor + les 9 starters
     *  run 3. Le POKÉDEX (captures) reste, lui, cumulatif/persistant d'un run à l'autre. Cf. isDexHidden(). */
    runThreeOnly?: boolean
    /** GROS LATE BLOOMER (créatures très anciennes de la Grotte du Nexus B2F) : règle d'EV SPÉCIALE et durcie —
     *  capturé TÔT (bas niveau) → plafond d'EV +20 % ; capturé TARD (haut niveau) → −20 %. Interpolé sur la plage
     *  de pop (niv 5→90). Intrinsèque à l'espèce (indépendant de evCapBoost). Cf. evConfig.evTotalCap. */
    lateBloomerEv?: boolean
    /** POST-LIGUE : ABSENT des dex (Pokédex in-game ET dex de référence) TANT QUE le joueur n'est pas
     *  CHAMPION — puis intègre le dex de TOUT LE MONDE (révélation post-sacre). Sert aux créations de
     *  joueur canonisées (hommage). Contrairement à runTwoOnly, le gate est le statut Champion, pas la
     *  capture. Cf. visibleDexSpecies(caught, isChampion). N'affecte PAS la Zone de Combat (ces espèces
     *  non-exclusives y apparaissent normalement comme adversaires/locations). */
    postLeague?: boolean
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
    /** COURBE D'XP FORCÉE pour cette instance (multiplicateur d'XP nécessaire), indépendante de l'espèce.
     *  Ex. Daemon offert « lent comme un légendaire » = 1.25 (colossal). Absent → courbe de l'espèce. Persisté. */
    growthMult?: number
    /** CHROMATIQUE (shiny) : tiré ~1/512 au spawn sauvage. IV parfaits + **+10% sur chaque stat**
     *  (cf. fullStats — "un peu plus que parfait"). Cosmétique : rendu avec un filtre + ✨. */
    shiny?: boolean
    /** STATS FIGÉES (Hall of Fame uniquement) : si présent, fullStats renvoie ces valeurs telles quelles
     *  (le champion combat avec ses stats exactes du sacre, sans recalcul IV/EV/Saiyan). Jamais persisté. */
    frozenStats?: Record<StatKey, number>
    /** FUSION (Autel de la Chimère) : défense spéciale (SpD) SÉPARÉE de l'attaque spéciale. Un Daemon fusionné
     *  porte frozenStats.spc = SpA (attaque spé, lue nativement en OFFENSE) et frozenSpd = SpD. Le moteur lit
     *  frozenSpd en DÉFENSE spéciale s'il est présent, sinon spc → comportement Gen-1 STRICTEMENT inchangé pour
     *  toute espèce existante (frozenSpd undefined). Jamais persisté (construct de combat éphémère).
     *  ⚠️ INVARIANT (setter Inc.1) : frozenStats.spc (SpA) ET frozenSpd (SpD) doivent être posés ENSEMBLE — ils
     *  viennent en PAIRE de computeFusion. Poser l'un sans l'autre = profil incohérent. Utiliser UN seul helper. */
    frozenSpd?: number
    /** LIGUE DE FUSION : uids des 2 PARENTS d'un fusionné éphémère → à la fin d'un combat de Ligue, chaque parent
     *  reçoit la MOITIÉ de l'XP gagnée par le fusionné (cf. finishBattle). Transient (jamais persisté). */
    fusionParents?: [string, string]
    /** OBJET TENU (held item) : id d'un objet de data/heldItems.ts. 1 max par Daemon.
     *  Effets lus par fullStats (stats) et le moteur (dégâts/combat). cf. data/heldItems.ts. */
    heldItem?: string
    /** 2e OBJET TENU — RÉSERVÉ AUX FUSIONNÉS (héritent des objets de leurs 2 parents). Les Daemons normaux n'en ont
     *  jamais (undefined → comportement byte-identique). Combiné à heldItem par les helpers de data/heldItems.ts. */
    heldItem2?: string
    /** Attaques apprises à un niveau alors que les 4 slots étaient pleins :
     *  en attente d'un choix « oublier une capacité » côté UI. Transitoire. */
    pendingMoves?: string[]
    /** EXPÉRIENCE DE COMBAT (EV) — effort accumulé par stat au fil des victoires (plafonné, additif). */
    ev?: Partial<Record<StatKey, number>>
    /** EV : capturé APRÈS la 1ʳᵉ Ligue → plafond d'EV modulé (voir evTotalCap). Estampillé à la capture,
     *  NON rétroactif : absent sur les Daemons capturés avant le déblocage → plafond de base 510. */
    evCapBoost?: boolean
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
    /** SAUVAGE (Grotte du Nexus) : capture IMPOSSIBLE tant que le Daemon est à PLEINS PV — il faut d'abord
     *  l'affaiblir. La Master Ball shunte. Posé sur le spawn (gameStore), lu dans engine.performCapture. Runtime. */
    captureRequiresDamage?: boolean
}

export interface BattleMon extends MonInstance {
    stages: StatStages
    volatiles: Partial<Record<VolatileStatus, number>>
    /** BÉNÉDICTION barman (secret, SOLO) : le PROCHAIN coup de ce Daemon est un COUP CRITIQUE garanti,
     *  puis le flag est consommé. Posé quand il boit une potion "triple prix". Runtime, non persisté. */
    nextCritGuaranteed?: boolean
    /** TALENT Volonté de fer : la 1re baisse de stat du combat a-t-elle déjà été annulée ? (one-shot, runtime, non persisté). */
    talentStatGuardUsed?: boolean
    /** TALENT Cuirasse mentale : le crit garanti du combat a-t-il déjà été consommé ? (one-shot, runtime, non persisté). */
    talentCritUsed?: boolean
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
    /** MITRA-POING (Focus Punch) : le Daemon CONCENTRE son énergie (tour 1) → il est vulnérable ; `focusBroken`
     *  passe à true s'il subit des dégâts pendant la charge → il rate au tour 2. Posés/levés avec chargingMove. */
    focusing?: boolean
    focusBroken?: boolean
    /** ESSAIM VORACE : nb de coups CONSÉCUTIFS réussis d'« Essaim Vorace » (0→5) → pilote le drain croissant
     *  (20 + 10×stacks, plafond 70%). Réinitialisé à 0 dès qu'un autre move est lancé, qu'il rate ou au switch.
     *  Runtime, non persisté (toBattleMon le laisse undefined ≡ 0). */
    swarmStacks?: number
    /** SAUVAGE (Centrale) : le Daemon FUIT (fin de combat, aucune récompense) une fois ce nombre
     *  de tours atteint (ex. Boltah ≤5, Heatah ≤3). Runtime, non persisté. */
    fleeAfterTurns?: number
    /** SAUVAGE : capture IMPOSSIBLE si le ballBonus de la Ball lancée est < cette valeur
     *  (ex. Zappeuréal = Hyper Ball+ → 4). Runtime, non persisté. */
    captureMinBallBonus?: number
    /** SAUVAGE : multiplie la valeur de capture (×<1 = plus dur, ex. Thundah/Bélunode). Runtime. */
    captureMult?: number
    /** SAUVAGE : message de RAILLERIE affiché au 1er lancer de Ball (ex. créations finales niv 75 de la Grotte du
     *  Nexus : « tu ne pensais pas l'attraper aussi facilement ? »). Runtime, non persisté. */
    captureTaunt?: string
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
