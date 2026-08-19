// src/lib/gamebook/yellow/storage/save.ts
//
// Nexus Jaune Éclair — modèle de sauvegarde (sérialisation pure, React-free).
// Stocké côté DB dans GamebookProgress.flags de la ligne chapterId="yellow"
// (isolée de l'arc v3 → aucune migration). Versionné pour rester compatible.

import type { MonInstance, StatKey, MajorStatus, PokeType } from "../battle/types"
import { POKE_TYPES } from "../battle/types"
import { emptyLabDefi, clampTicketValue, TICKET_QUEUE_MAX, ROULETTE_CLAIMED_MAX, BLESSING_QUEUE_MAX, type LabDefiState, type LabDefiKind, type LabActiveDefi } from "../data/labDefis"
import { isHeldItem } from "../data/heldItems"
import { isPlausibleStoredDaemon, type StoredCustomDaemon } from "../create/customSpecies"

export interface YellowSave {
    version: number
    team: MonInstance[]
    /** Réserve (PC) au-delà des 6 de l'équipe. */
    pc: MonInstance[]
    items: Record<string, number>
    /** Portefeuille reps (pool stocké, plafonné). */
    reps: number
    /** Plafond de stockage des reps (augmenté par les badges d'arène). */
    repsCap: number
    /** Dernier jour tické (YYYY-MM-DD) — reset quotidien pasta/sbire (plus le crédit reps). */
    creditedThrough: string
    /** High-water des reps banquées en énergie (total déjà crédité). -1 = non initialisé. */
    repsBankedTotal: number
    /** Cadeau de bienvenue (100 énergie) déjà réclamé ? */
    welcomeGift: boolean
    /** 1re partie de poker (tuto solo house-funded) déjà jouée ? */
    pokerFirstGameDone: boolean
    /** Cash quotidien vs les boss : tapis du jour de chaque boss (nom → reps), + cap (buy-in 1re partie) + jour. */
    pokerBossStacks: Record<string, number>
    pokerCashCap: number
    pokerCashDate: string
    /** Cadeau du DIEU SPAG (+150 énergie, one-shot événementiel) déjà réclamé ? */
    spagGift: boolean
    /** Cadeau du DIEU DES PÂTES (poster mural du Centre, +100 énergie, one-shot) déjà réclamé ? */
    pastaGodGift: boolean
    /** Nb de Super Pastas achetés aujourd'hui (reset quotidien). */
    pastaBoughtToday: number
    /** VŒU DU GÉNIE (cap casino) : énergie MISÉE au casino aujourd'hui (reset quotidien). Sert au plafond 200/jour. */
    casinoSpentToday: number
    /** Bonus cumulé du prix plancher du Super Pasta (+3/jour). */
    pastaDayBonus: number
    /** DÔME de Combat : nombre de TOURNOIS gagnés (titres) — pilote le tier MAX débloqué + le palmarès. Additif. */
    domeChampionships: number
    pokedex: { seen: string[]; caught: string[] }
    /** Ids des dresseurs déjà battus (ne se recombattent pas). */
    defeatedTrainers: string[]
    /** Ids des dresseurs déjà RE-battus (match retour / rematch fait). */
    rematchedTrainers: string[]
    /** Badges d'arène gagnés. */
    badges: string[]
    /** La cinématique d'intro (choix du starter) a-t-elle déjà été jouée ? */
    introSeen: boolean
    /** Nb de victoires sur le sbire AUJOURD'HUI (reset quotidien ; plafond 2/jour). */
    sbireDefeatsToday: number
    /** Daemomaniaque : nb de consultations AUJOURD'HUI (reset quotidien ; 5 gratuites puis payant). Optionnel (défaut 0). */
    consultsToday?: number
    /** VIEUX SAGE SAIYAN : nb de points Saiyan redistribués AUJOURD'HUI (reset quotidien ; plafond 20/jour). Optionnel (défaut 0). */
    sageSaiyanPointsToday?: number
    /** ANANAS (chercheur de baies) : nb de badges au dernier combat (run 1-3), jour du dernier combat (run 4), pic de niveau (run 4). Optionnels. */
    ananasLastBadgeCount?: number
    ananasDate?: string
    ananasPeakLevel?: number
    /** OBSOLÈTE depuis 12/08 (Galijah piloté par le nb d'ESPÈCES du Pokédex). Champ conservé pour compat de save, plus lu/écrit. Optionnel (défaut 0). */
    capturesToday?: number
    /** Nb total de victoires sur le sbire (cumulatif → cycle des explications). */
    sbireWinsTotal: number
    /** Réputation PvP : matchs + usages (Daemon fétiche / attaque favorite) + dégâts infligés par Daemon (top-5 duels). */
    pvpStats: { wins: number; losses: number; forfeits: number; daemonUse: Record<string, number>; moveUse: Record<string, number>; dmgByDaemon: Record<string, number> }
    domeStats?: { wins: number; losses: number; daemonUse: Record<string, number>; moveUse: Record<string, number> } // DÔME UNIQUEMENT
    /** Statistiques de la PARTIE (per-world → un jeu de stats par run, dont le NG+). */
    stats: YellowStats
    /** ACE (rival) : pic de niveau (ratchet) + box des contres + défaites + jour. */
    acePeakLevel: number
    aceBox: Record<string, number>
    /** Taille d'équipe d'ACE = pic (cliquet) de la taille d'équipe du joueur, ne redescend jamais. */
    aceTeamSizePeak: number
    aceWins: number
    aceDefeatedDate: string
    /** DUELS reflets (Viridian/arène eau) : userId du joueur-IA → date de la DERNIÈRE victoire
     *  (= creditedThrough). Sert la limite « 1 victoire par joueur-IA et par jour ». */
    duelWins: Record<string, string>
    /** CT cadeaux possédées (trophées de boss). */
    ownedCts: string[]
    /** CT « achat unique » déjà achetées (ex. Météores) → retirées du shop définitivement. */
    boughtCts: string[]
    /** GÉKROC (mini-boss de la Centrale) vaincu OU capturé (one-time) → ne réapparaît plus. */
    gekrocResolved: boolean
    /** COLLECTIONNEUR DE SPECTRES (maison hantée) : espèces SPECTRE distinctes montrées en combat gagné. */
    hhSpectresShown: string[]
    /** COLLECTIONNEUR DE SPECTRES : nb de victoires contre lui (réward = 3 victoires + 3 spectres). */
    hhCollectorWins: number
    /** LIGUE : le joueur a battu LE MAÎTRE (Champion du Nexus) → débloque le Hall of Fame / post-game. */
    isChampion: boolean
    /** BADGE run 1 « Ligue 6-shiny » : sacré Champion avec une équipe de 6 Daemons TOUS shiny (figé au sacre). */
    leagueSixShiny: boolean
    /** BADGE run 1 « Reflet niveau-sup » : a battu le reflet d'un joueur au niveau cumulé SUPÉRIEUR au sien. */
    mirrorWinHigherLevel: boolean
    /** BAIES (post-Ligue) : le SECRET des baies est-il révélé ? (Druide en run 2, ou assistant du Prof. CHEN)
     *  → active la récolte sur les arbres de Route Nord & Ville Jaune. Par monde (défaut false). */
    berrySecretKnown: boolean
    /** BAIES : jour (YYYY-MM-DD) du suivi de récolte courant. Change de jour → les arbres se réinitialisent. */
    berryHarvestDay: string
    /** BAIES : arbres déjà cueillis CE jour (clés "mapId:x:y") → anti-refarm au refresh. Vidé au jour suivant. */
    berryHarvestPicked: string[]
    /** SYLVEBARBE réveillé/battu (flûte) → sortie sud de Ville Jaune ouverte (accès Zone de Combat). */
    sylvebarbeAwake: boolean
    /** DÉNICHEUR (grotte Route Nord) : échange UNIQUE Faukon → Blaziper effectué (one-time, anti-duplication). */
    caveTradeDone: boolean
    /** GAMIN (plaine d'entraînement) : confidence de nuit entendue → boost Goshendofy ×2 les nuits suivantes. */
    goshHintHeard: boolean
    /** DRESSEUR D'ORCALINE (plaine) : nb de victoires (pilote le niveau = 35 + 10×victoires). */
    orcalineWins: number
    /** DRESSEUR D'ORCALINE : jour (=creditedThrough) de la dernière victoire → 1 combat gagnant/jour. */
    orcalineDate: string
    /** PNJ 5 (gardien de la Grotte du Nexus) : nb de victoires du joueur → SCALING (+2 niveaux/victoire). */
    pnj5Wins: number
    /** NG+ : nb de combats livrés depuis le lancement du NG+ (fenêtre d'abandon = ≤ NGPLUS_ABANDON_LIMIT).
     *  Vit DANS le monde NG+ (0 dans le monde live). Au-delà de la limite → engagé, plus d'abandon possible. */
    ngplusBattles: number
    /** MAÎTRE DES CAPACITÉS (étage du Centre) : nb de réapprentissages payés → prix des reps croissant. */
    moveReminderUses: number
    /** DÉFIS DU LABO (étage du Centre) : défi actif, flags one-shot, cumul dégâts CT, casino/Tonytony. */
    labDefi: LabDefiState
    /** DAEMONS CUSTOM créés (post-Ligue, Phase 2) — persistés pour être ré-enregistrés/joués. Optionnel (anciennes saves). */
    customDaemons: StoredCustomDaemon[]
    /** RUN 2 — timestamp (ms) de lancement du NG+ (undefined hors NG+). */
    ngplusStartedAt?: number
    /** RUN 2 — temps de jeu actif cumulé (ms). */
    playtimeMs: number
    /** RUN 2 — potions utilisées en combat de Ligue (malus du score « maîtrise »). */
    leaguePotions: number
    /** RUN 2 — le New Game+ a-t-il déjà été LANCÉ ? Posé au démarrage du run 2, il SURVIT à la fusion
     *  (reste dans le monde live) → interdit un 2e run 2. Remis à false uniquement par un reset complet
     *  du run 1 (resetForIntro). Défaut false (anciennes saves : jamais lancé). */
    ngplusUsed: boolean
    /** NG+ (2 mondes navigables) — monde ACTIF que le joueur contrôle. "live" = partie d'origine (= ces champs
     *  plats), "ngplus" = New Game+ (= `ngplusWorld`). Défaut "live" (anciennes saves). Les champs plats de haut
     *  niveau reflètent TOUJOURS le monde LIVE (le garde-fou anti-wipe voit donc toujours la vraie progression). */
    activeWorld: "live" | "ngplus" | "run3" | "replay"
    /** NG+ — le monde New Game+ COMPLET, sérialisé comme une YellowSave imbriquée (SANS sous-monde : profondeur
     *  bornée à 1). null tant qu'aucun NG+ n'a été lancé. */
    ngplusWorld: YellowSave | null
    /** NG+ — équipe d'origine FIGÉE au lancement du NG+ (façon Hall of Fame, immuable) : c'est l'adversaire du
     *  combat de fin de Ligue en NG+. null hors NG+. */
    ngplusOldTeam: ChampionMon[] | null
    /** RUN 3 (concours) — le 3e monde COMPLET, sérialisé comme une YellowSave imbriquée (SANS sous-monde :
     *  profondeur bornée à 1). null tant qu'aucun run 3 n'a été lancé. ADDITIF : les saves 2-mondes existantes
     *  le lisent à null (aucun effet). */
    run3World: YellowSave | null
    /** REJEU (« run bis / Pseudo² ») — monde de rejeu ISOLÉ (bulle jetable), sérialisé comme une YellowSave
     *  imbriquée (profondeur bornée à 1). null hors rejeu. Pendant un rejeu, le monde RÉEL (live/ngplus/run3)
     *  reste stashé et INTACT (les champs plats = toujours le run 1 → garde-fou anti-wipe préservé). ADDITIF. */
    replayWorld: YellowSave | null
    /** REJEU — quel run est rejoué : pilote les RÈGLES (énergie…) de la bulle. null hors rejeu. */
    replayRun: "run1" | "run2" | "run3" | null
    /** REJEU — monde réel à RESTAURER en sortant du rejeu (celui qui était actif avant). "live" par défaut. null hors rejeu. */
    replayReturn: "live" | "ngplus" | "run3" | null
    /** MULTI-PROFILS — profils COMPLETS inactifs (chacun un save à part entière avec ses runs 1/2/3). Le profil ACTIF
     *  vit au top-level (100 % rétro-compat) ; « Rejouer le RUN 1 » stashe l'actif ici et démarre un profil FRAIS.
     *  Portés OPAQUES dans le cycle save (re-parsés seulement au moment de basculer dessus). Absent = 1 seul profil. */
    altProfiles?: YellowSave[]
    /** RUN 3 — le concours a-t-il déjà été LANCÉ ? (jumeau de ngplusUsed). Survit à la fusion. Défaut false. */
    run3Used: boolean
    /** RUN 2 — le Maître de Ligue vient d'être battu et il RESTE le combat de fin (vs l'ancienne équipe). Marqueur
     *  PERSISTANT (survit au refresh/redéploiement) : tant qu'il est true, on n'est PAS encore Champion et le combat
     *  final est accessible (auto-relance + bouton menu). Posé à la défaite du Maître en run 2, retiré à l'issue du
     *  combat final (victoire = sacre ; défaite = il faut refaire la Ligue). Défaut false. */
    ngplusMaitreBeaten: boolean
    /** RUN 3 — speciesId de BASE du starter CHOISI (elefer/cornaive/coccipoing). Sert à donner à ACE le starter
     *  qui CONTRE le joueur (triangle Métal›Fée›Combat›Métal) + à résoudre le 3e starter (éleveur). "" hors run 3. */
    run3StarterBase: string
    /** REJEU RUN 2 — speciesId du STARTER du run 2 (le Daemon perso créé au NG+). Sert à REJOUER le run 2 avec lui,
     *  même après CANONISATION de la création (auquel cas customDaemons peut être vide). Global (survit aux bascules
     *  de monde) ; "" / absent si le run 2 n'a jamais été lancé. */
    ngplusStarterBase?: string
    /** ARC LAMPE & GÉNIE — le colporteur a-t-il déjà été rencontré/battu ? GLOBAL au PROFIL (survit aux runs 1/2/3) →
     *  le génie n'apparaît qu'UNE fois par profil, pas à chaque run. Frais pour un NOUVEAU profil (emptySave). */
    genieArcSeen?: boolean
    /** MODE GENÈSE — profil « 6 Daemons craftés / zéro capture » : on démarre avec 6 créations et la Ball est
     *  VERROUILLÉE jusqu'à la victoire à la Ligue de Fusion (marqueur fusleague_or). GLOBAL au profil. La fusion
     *  reste autorisée. Absent/false = mode normal. */
    genesisMode?: boolean
    /** RUN 3 — ennemis VAINCUS (boss d'arène + Ligue), dédupliqués par clé (cf. bossEnemyKey/leagueEnemyKey),
     *  pour le SCORE du concours = Σ de leurs niveaux (run3Score). Per-monde (vit dans le monde run 3). Défaut [].
     *  Type structurel (= Run3DefeatedEnemy) inliné pour éviter tout cycle d'import storage↔data. */
    run3Defeated: { key: string; level: number }[]
    /** RUN 3 — score « Survivant » : énergie (reps) restante relevée à la fin de CHAQUE arène/Ligue (clé → snapshot).
     *  Le score = Σ des valeurs. Per-monde run 3. Défaut {}. */
    run3EnergyByArena: Record<string, number>
    /** POKÉDEX — espèces capturées PENDANT le run EN COURS (overlay PER-MONDE par-dessus le Pokédex GLOBAL
     *  cumulatif) → distingue « capturé ce run » de « capturé un run précédent ». Défaut []. */
    caughtThisRun: string[]
    /** ATELIER DE FUSION (salle de l'Autel) — jusqu'à 6 paires {uid parent A, uid parent B} = l'équipe de fusion
     *  du joueur (réutilisée pour la Ligue de Fusion + le futur PvP « dépôt »). Per-monde (uids du monde courant). Défaut []. */
    fusionRoster: { a: string; b: string }[]
    /** FUSIODEX — journal PERMANENT de toutes les fusions créées (speciesId des 2 parents, a=tête). Non plafonné à 6
     *  (contrairement au roster) ; union monotone à la fusion des mondes. Défaut []. */
    fusionHistory: { a: string; b: string }[]
    /** RUN 3 — teaser Dieu Spaghetti sur Lavapetit déjà montré (à la rencontre) / Lavapetit déjà capturé ?
     *  Per-monde, one-time (ne re-teaser jamais). Défaut false. */
    run3LavapetitSeen: boolean
    run3LavapetitCaught: boolean
    /** MIMIMOY (roaming, monde LIVE) — le joueur a-t-il « rendu » Mimimoy au brocanteur (→ roaming armé) ? +
     *  nombre d'apparitions du roaming (0..10, disparaît ensuite). Défaut false / 0. */
    mimimoyReturned: boolean
    mimimoyAppearances: number
    /** VŒU DU GÉNIE (monde LIVE) — ⚡ restant à dépenser avant de pouvoir RÉUTILISER/ACHETER une Ball.
     *  Verrou actif tant que > 0 ; chaque dépense de reps le réduit ; à 0 le verrou se lève. Défaut 0. */
    ballLockRemaining: number
    /** VŒU « ABONDANCE MAUDITE » (Jacanon) — début (ms) de la malédiction (1 semaine) ; nb d'objets gratuits pris
     *  (→ nb de Daemons rendus désobéissants à la fin, max 7) ; date du dernier objet gratuit (throttle 1/jour).
     *  Tous optionnels/absents par défaut → save-safe, additif. */
    curseAbundanceStart?: number
    curseFreeItemsTaken?: number
    curseFreeItemDate?: string
    /** BOURSE — nb d'achats de soins du jour (inflation perso ; reset quotidien). Optionnel/additif → save-safe. */
    potionBuysToday?: number
    /** BOURSE — nb de recharges d'énergie payées en JC ce jour (+10 %/achat sur tout le shop ; reset quotidien). */
    jcEnergyBuysToday?: number
    /** VŒU DU GÉNIE (cap casino) — plafond de mise QUOTIDIEN progressif (50 → +10/jour → 1000). Optionnel/additif. */
    casinoCapToday?: number
    /** HAUT FAIT — défaites cumulées par palier de la Ligue de Fusion (barème du badge de complétion). Optionnel/additif. */
    fusionLeagueDefeats?: Record<string, number>
    /** GROTTE/BOUTIQUE JC — cliquet prix par catégorie (nb d'achats par catégorie, CE RUN). Optionnel/additif. */
    grotteShopBuys?: Record<string, number>
    /** FASHION VICTIM — avatar Gen3 choisi (chemin de planche), préférence cosmétique globale. Optionnel/additif. */
    chosenAvatar?: string
    /** LIGUE DE FUSION — MÉGAMONARX inclus dans l'équipe (per-run). Optionnel/additif. */
    megaInLigue?: boolean
    /** OBJETS TENUS ENNEMIS — date (YYYY-MM-DD) de la DERNIÈRE tentative de Ligue de Fusion : sert la règle « baies
     *  ennemies seulement à la 1re run du jour » (argent). Optionnel/additif. */
    fusionLeagueTryDate?: string
    /** SALLE ULTIME — roster de fusion GELÉ qui a bouclé chaque palier (parents à plat : [a0,b0,a1,b1,…]). Sert à
     *  reconstruire TON reflet dans la salle ultime (argent affronte le bronze ; or affronte l'argent). Optionnel/additif. */
    fusionChampionRoster?: Record<string, MonInstance[]>
    /** VŒU DU GÉNIE — rencontre FORCÉE one-shot (JSON {speciesId,level,hard}) : la prochaine rencontre sauvage
     *  devient cette espèce, puis se consomme. Absent = aucune rencontre forcée. */
    forcedEncounter?: string
    /** LIGUE DE FUSION — usure du gauntlet persistée (JSON {team:[{a,b,hp,status,statusCounter,pp}]}) → au reload on
     *  REPREND la ligue dans la salle courante avec l'équipe ABÎMÉE (pas de soin gratuit). Absent = pas de run en cours. */
    fusionLeagueCarry?: string
}

/** Un « meilleur moment » d'un combat de la Ligue (best-of affiché au Hall of Fame). Runtime. */
export interface LeagueHighlight { trainer: string; mon: string; dmg: number; move: string }

/** Un Daemon de l'équipe de champion, figé au sacre (sprite + fiche complète pour la parade du générique). */
export interface ChampionMon {
    speciesId: string
    nickname?: string
    level: number
    shiny?: boolean
    /** Stats finales calculées au sacre (hp/atk/def/spe/spc). */
    stats: { hp: number; atk: number; def: number; spe: number; spc: number }
    /** Noms d'affichage des attaques (jusqu'à 4). */
    moves: string[]
}

/** Run de champion : l'équipe sacrée + les meilleurs moments de la Ligue. Runtime (déclenche le Hall of Fame). */
export interface ChampionRun { team: ChampionMon[]; highlights: LeagueHighlight[] }

/** Chimère figée pour le HALL OF FAME de la Ligue de Fusion. Un fusionné n'est PAS une vraie espèce (éphémère,
 *  speciesId non résolvable après coup) → on stocke directement son nom / sprite / types / stats pour l'affichage. */
export interface FusionChampionMon {
    name: string
    sprite: string
    types: string[]
    level: number
    stats: { hp: number; atk: number; def: number; spe: number; spc: number }
    moves: string[]
}

// v2 (2026-06) : NERF ACE — migration one-time qui remet le CLIQUET d'ACE à zéro (acePeakLevel +
// aceTeamSizePeak) pour les saves existantes, en CONSERVANT aceWins. ACE se recalibrera alors sur
// l'équipe ACTUELLE du joueur (au lieu d'un pic figé trop haut) → enfin battable. Ne peut que l'adoucir.
export const SAVE_VERSION = 2
/** Version à partir de laquelle le cliquet ACE est réinitialisé une fois (cf. coerce). */
const ACE_RATCHET_RESET_VERSION = 2

export function emptySave(): YellowSave {
    return { version: SAVE_VERSION, team: [], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pokerFirstGameDone: false, pokerBossStacks: {}, pokerCashCap: 0, pokerCashDate: "", spagGift: false, pastaGodGift: false, pastaBoughtToday: 0, casinoSpentToday: 0, pastaDayBonus: 0, domeChampionships: 0, pokedex: { seen: [], caught: [] }, defeatedTrainers: [], rematchedTrainers: [], badges: [], introSeen: false, sbireDefeatsToday: 0, capturesToday: 0, sbireWinsTotal: 0, pvpStats: { wins: 0, losses: 0, forfeits: 0, daemonUse: {}, moveUse: {}, dmgByDaemon: {} }, domeStats: { wins: 0, losses: 0, daemonUse: {}, moveUse: {} }, stats: emptyYellowStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", duelWins: {}, ownedCts: [], boughtCts: [], gekrocResolved: false, hhSpectresShown: [], hhCollectorWins: 0, isChampion: false, leagueSixShiny: false, mirrorWinHigherLevel: false, berrySecretKnown: false, berryHarvestDay: "", berryHarvestPicked: [], sylvebarbeAwake: false, caveTradeDone: false, goshHintHeard: false, orcalineWins: 0, orcalineDate: "", pnj5Wins: 0, ngplusBattles: 0, moveReminderUses: 0, labDefi: emptyLabDefi(), customDaemons: [], ngplusStartedAt: undefined, playtimeMs: 0, leaguePotions: 0, ngplusUsed: false, activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null, run3World: null, replayWorld: null, replayRun: null, replayReturn: null, run3Used: false, ngplusMaitreBeaten: false, run3StarterBase: "", run3Defeated: [], run3EnergyByArena: {}, caughtThisRun: [], fusionRoster: [], fusionHistory: [], run3LavapetitSeen: false, run3LavapetitCaught: false, mimimoyReturned: false, mimimoyAppearances: 0, ballLockRemaining: 0 }
}

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const MAJOR: MajorStatus[] = ["NONE", "BURN", "POISON", "TOXIC", "PARALYSIS", "SLEEP", "FREEZE"]

/** Parse défensif d'une instance (tolère les vieux/mauvais formats). */
function parseMon(raw: unknown): MonInstance | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.speciesId !== "string" || typeof o.level !== "number") return null
    const ivsRaw = (o.ivs ?? {}) as Record<string, unknown>
    const ivs = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) ivs[k] = typeof ivsRaw[k] === "number" ? (ivsRaw[k] as number) : 15
    const moves = Array.isArray(o.moves)
        ? (o.moves as unknown[]).map((m) => {
            const mm = m as Record<string, unknown>
            const ppMax = typeof mm.ppMax === "number" ? mm.ppMax : 5
            return {
                moveId: String(mm.moveId ?? ""),
                pp: typeof mm.pp === "number" ? mm.pp : ppMax,
                ppMax,
            }
        }).filter((m) => m.moveId)
        : []
    const status = MAJOR.includes(o.status as MajorStatus) ? (o.status as MajorStatus) : "NONE"
    return {
        uid: typeof o.uid === "string" ? o.uid : `${o.speciesId}-${o.level}-${Math.floor(Number(o.exp) || 0)}`,
        speciesId: o.speciesId,
        nickname: typeof o.nickname === "string" ? o.nickname : undefined,
        level: Math.max(1, Math.min(100, Math.floor(o.level as number))),
        exp: typeof o.exp === "number" ? o.exp : 0,
        ivs,
        currentHp: typeof o.currentHp === "number" ? o.currentHp : 1,
        status,
        statusCounter: typeof o.statusCounter === "number" ? o.statusCounter : 0,
        moves,
        owned: o.owned === true,
        shiny: o.shiny === true ? true : undefined,
        growthMult: typeof o.growthMult === "number" && o.growthMult > 0 ? o.growthMult : undefined, // courbe d'XP forcée (cadeau « lent »)
        heldItem: typeof o.heldItem === "string" && isHeldItem(o.heldItem) ? o.heldItem : undefined, // sanitize : ignore un id inconnu/corrompu
        statPoints: typeof o.statPoints === "number" ? Math.max(0, Math.floor(o.statPoints)) : undefined,
        allocated: parseAllocated(o.allocated),
        ev: parseAllocated(o.ev),
        evCapBoost: o.evCapBoost === true ? true : undefined,
        evCurveV2: o.evCurveV2 === true ? true : undefined,
        pendingSaiyanLevels: typeof o.pendingSaiyanLevels === "number" ? Math.max(0, Math.floor(o.pendingSaiyanLevels)) : undefined,
        lastLevelUpAt: typeof o.lastLevelUpAt === "string" ? o.lastLevelUpAt : undefined,
        capturedLevel: typeof o.capturedLevel === "number" ? Math.floor(o.capturedLevel) : undefined,
        capturedAt: typeof o.capturedAt === "string" ? o.capturedAt : undefined,
        bestDmg: typeof o.bestDmg === "number" ? Math.max(0, Math.floor(o.bestDmg)) : undefined,
        bestDmgMove: typeof o.bestDmgMove === "string" ? o.bestDmgMove : undefined,
        originalTrainerId: typeof o.originalTrainerId === "string" ? o.originalTrainerId : undefined,
        currentOwnerId: typeof o.currentOwnerId === "string" ? o.currentOwnerId : undefined,
        traded: o.traded === true ? true : undefined,
        originalNickname: typeof o.originalNickname === "string" ? o.originalNickname : undefined,
        capturedMapId: typeof o.capturedMapId === "string" ? o.capturedMapId : undefined,
        capturedQuotaReached: o.capturedQuotaReached === true ? true : undefined,
        disobedient: o.disobedient === true ? true : undefined, // VŒU MAUDIT (Jacanon) : ce Daemon refuse d'obéir jusqu'à la grâce du créateur
    }
}

/** Parse défensif des points alloués (Saiyan) : sous-ensemble de stats → entiers >= 0. */
function parseAllocated(raw: unknown): Partial<Record<StatKey, number>> | undefined {
    if (!raw || typeof raw !== "object") return undefined
    const out: Partial<Record<StatKey, number>> = {}
    for (const k of STAT_KEYS) {
        const v = (raw as Record<string, unknown>)[k]
        if (typeof v === "number" && v > 0) out[k] = Math.floor(v)
    }
    return Object.keys(out).length ? out : undefined
}

function strArr(raw: unknown): string[] {
    return Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === "string") : []
}

/** Record<string,number> défensif (compteurs d'usage). */
function numRec(raw: unknown): Record<string, number> {
    const out: Record<string, number> = {}
    if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === "number" && v > 0) out[k] = Math.floor(v)
        }
    }
    return out
}

/** Comme numRec mais GARDE les 0 (≥ 0) : pour les tapis boss du cash, où 0 = RUINÉ (doit persister). */
function numRecNonNeg(raw: unknown): Record<string, number> {
    const out: Record<string, number> = {}
    if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === "number" && isFinite(v) && v >= 0) out[k] = Math.floor(v)
        }
    }
    return out
}

/** Record<string,string> défensif (ex. duelWins : userId → date de la dernière victoire). */
function strRec(raw: unknown): Record<string, string> {
    const out: Record<string, string> = {}
    if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === "string") out[k] = v
        }
    }
    return out
}

function parsePvpStats(raw: unknown): YellowSave["pvpStats"] {
    const o = (raw ?? {}) as Record<string, unknown>
    const n = (v: unknown) => (typeof v === "number" ? Math.max(0, Math.floor(v)) : 0)
    return { wins: n(o.wins), losses: n(o.losses), forfeits: n(o.forfeits), daemonUse: numRec(o.daemonUse), moveUse: numRec(o.moveUse), dmgByDaemon: numRec(o.dmgByDaemon) }
}
function parseDomeStats(raw: unknown): NonNullable<YellowSave["domeStats"]> {
    const o = (raw ?? {}) as Record<string, unknown>
    const n = (v: unknown) => (typeof v === "number" ? Math.max(0, Math.floor(v)) : 0)
    return { wins: n(o.wins), losses: n(o.losses), daemonUse: numRec(o.daemonUse), moveUse: numRec(o.moveUse) }
}

/** Statistiques de partie (per-world). Compteurs cumulés, affichés dans le menu. */
export interface YellowStats {
    battles: number       // combats joués (issue win / lose / caught)
    wins: number          // combats gagnés
    steps: number         // pas de déplacement
    energySpent: number   // reps dépensés (attaques + boutique + casino)
    xpTotal: number       // XP de combat cumulée gagnée par l'équipe
    hpDealt: number       // PV totaux infligés en combat
    potionsUsed: number   // objets de soin / statut consommés
    ballsUsed: number     // balls lancées
    teamKos: number       // fois où l'équipe a été mise KO (défaites)
    heals: number         // soins effectués (Centre / soin d'équipe)
    leagueEnergySpent: number // reps dépensés en COMBAT DE LIGUE (attaques face à un y_ligue_*) — volet score run 2/3. Non rétroactif (compteur ajouté en cours de route → 0 pour ceux déjà en Ligue).
    run2BestGrade: number     // meilleur SCORE GLOBAL /1000 atteint pendant le run 2 (PIC : la note n'est pas monotone) — montré au recap de fin de run 2. Per-world.
    duelWinsTotal: number     // reflets d'autres joueurs battus (cumul, per-world → SOMMÉ sur les mondes au leaderboard « Duelliste »).
    modeFillsUsed: number      // PARRAINAGE — modes "easy"/"debutant" : nombre de « remplissages » d'énergie consommés (le crédit de départ compte pour 1). Ignoré en mode "normal" (énergie = vrais reps).
    playerTrades: number       // ÉCHANGES entre JOUEURS (Casino) réalisés — forward-only (alimente le haut-fait trade_player). Compté au monde actif.
}
export function emptyYellowStats(): YellowStats {
    return { battles: 0, wins: 0, steps: 0, energySpent: 0, xpTotal: 0, hpDealt: 0, potionsUsed: 0, ballsUsed: 0, teamKos: 0, heals: 0, leagueEnergySpent: 0, run2BestGrade: 0, duelWinsTotal: 0, modeFillsUsed: 0, playerTrades: 0 }
}
function parseStats(raw: unknown): YellowStats {
    const o = (raw ?? {}) as Record<string, unknown>
    const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : 0)
    return { battles: n(o.battles), wins: n(o.wins), steps: n(o.steps), energySpent: n(o.energySpent), xpTotal: n(o.xpTotal), hpDealt: n(o.hpDealt), potionsUsed: n(o.potionsUsed), ballsUsed: n(o.ballsUsed), teamKos: n(o.teamKos), heals: n(o.heals), leagueEnergySpent: n(o.leagueEnergySpent), run2BestGrade: n(o.run2BestGrade), duelWinsTotal: n(o.duelWinsTotal), modeFillsUsed: n(o.modeFillsUsed), playerTrades: n(o.playerTrades) }
}

const LAB_DEFI_KINDS: LabDefiKind[] = ["pushup1h", "squat150", "quota2x", "ct"]

/** Parse défensif de l'état des défis du labo (tolère une vieille save sans `labDefi`). */
function parseLabDefi(raw: unknown): LabDefiState {
    const d = emptyLabDefi()
    if (!raw || typeof raw !== "object") return d
    const o = raw as Record<string, unknown>
    const isType = (v: unknown): v is PokeType => typeof v === "string" && (POKE_TYPES as readonly string[]).includes(v)
    const nz = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : 0)
    // Défis actifs (physique + CT, slots indépendants).
    const parseActive = (raw: unknown): LabActiveDefi | null => {
        if (!raw || typeof raw !== "object") return null
        const a = raw as Record<string, unknown>
        if (!LAB_DEFI_KINDS.includes(a.kind as LabDefiKind) || typeof a.startedAt !== "string") return null
        const act: LabActiveDefi = { kind: a.kind as LabDefiKind, startedAt: a.startedAt }
        if (typeof a.startSnapshot === "number" && isFinite(a.startSnapshot)) act.startSnapshot = Math.max(0, Math.floor(a.startSnapshot))
        if (isType(a.ctType)) act.ctType = a.ctType
        if (typeof a.ctMoveId === "string") act.ctMoveId = a.ctMoveId
        if (typeof a.ctThreshold === "number" && isFinite(a.ctThreshold)) act.ctThreshold = Math.max(0, Math.floor(a.ctThreshold))
        if (typeof a.ctTargetCtId === "string") act.ctTargetCtId = a.ctTargetCtId
        return act
    }
    // MIGRATION : ancienne save = un unique `active` (physique OU CT) → on le route vers le bon slot.
    const legacy = parseActive(o.active)
    d.activePhys = parseActive(o.activePhys) ?? (legacy && legacy.kind !== "ct" ? legacy : null)
    d.activeCt = parseActive(o.activeCt) ?? (legacy && legacy.kind === "ct" ? legacy : null)
    d.squat150Done = o.squat150Done === true
    if (o.ctDamageByType && typeof o.ctDamageByType === "object") {
        for (const [k, v] of Object.entries(o.ctDamageByType as Record<string, unknown>)) {
            if (isType(k) && typeof v === "number" && v > 0) d.ctDamageByType[k] = Math.floor(v)
        }
    }
    d.ctEarned = strArr(o.ctEarned)
    d.tomorrowEnergyMult = typeof o.tomorrowEnergyMult === "number" && o.tomorrowEnergyMult >= 1 ? Math.floor(o.tomorrowEnergyMult) : 1
    d.tomorrowEnergyDate = typeof o.tomorrowEnergyDate === "string" ? o.tomorrowEnergyDate : ""
    d.casinoSpinIndex = nz(o.casinoSpinIndex)
    d.casinoWinStreak = nz(o.casinoWinStreak)
    d.casinoBankruptUntil = typeof o.casinoBankruptUntil === "string" ? o.casinoBankruptUntil : ""
    d.casinoTotalWon = nz(o.casinoTotalWon)
    d.blackjackWon = nz(o.blackjackWon)
    d.blackjackCtClaimed = o.blackjackCtClaimed === true
    d.blackjackNgplusPicks = nz(o.blackjackNgplusPicks)
    d.tonytonyClaimed = o.tonytonyClaimed === true
    d.tonytonyShiny = o.tonytonyShiny === true
    d.dailyTicketDate = typeof o.dailyTicketDate === "string" ? o.dailyTicketDate : ""
    d.casinoFirstBetDone = o.casinoFirstBetDone === true
    if (Array.isArray(o.grantedTickets)) {
        d.grantedTickets = (o.grantedTickets as unknown[])
            .filter((v): v is number => typeof v === "number" && isFinite(v))
            .map(clampTicketValue)
            .slice(0, TICKET_QUEUE_MAX)
    }
    // Origines des tickets : alignées sur grantedTickets (même longueur). Manquant/incohérent → "boss"
    // (= non rachetable), pour que les vieux tickets ne deviennent pas rachetables par erreur.
    {
        const raw = Array.isArray(o.grantedTicketOrigins) ? (o.grantedTicketOrigins as unknown[]) : []
        d.grantedTicketOrigins = d.grantedTickets.map((_, i) => {
            const v = raw[i]
            return v === "casino" || v === "boss" || v === "spag" ? v : "boss"
        })
    }
    d.spagRouletteSeen = o.spagRouletteSeen === true
    d.spagWelcomeGift = o.spagWelcomeGift === true
    d.spagStepGiftClaimed = o.spagStepGiftClaimed === true
    d.rouletteCredit = typeof o.rouletteCredit === "number" && o.rouletteCredit > 0 ? Math.floor(o.rouletteCredit) : 0
    d.geneIntroSeen = o.geneIntroSeen === true
    d.rouletteClaimed = strArr(o.rouletteClaimed).slice(-ROULETTE_CLAIMED_MAX)
    // BARMAN (secret)
    d.barmanPotionsBought = nz(o.barmanPotionsBought)
    if (Array.isArray(o.battleBlessings)) d.battleBlessings = (o.battleBlessings as unknown[]).filter((v): v is "eva" | "crit" => v === "eva" || v === "crit").slice(-BLESSING_QUEUE_MAX)
    if (Array.isArray(o.rouletteLuck)) {
        d.rouletteLuck = (o.rouletteLuck as unknown[])
            .filter((v): v is { kind: "luck25" | "luckMax"; cap: number } => !!v && typeof v === "object" && ((v as { kind?: unknown }).kind === "luck25" || (v as { kind?: unknown }).kind === "luckMax") && typeof (v as { cap?: unknown }).cap === "number")
            .map((v) => ({ kind: v.kind, cap: Math.max(0, Math.floor(v.cap)) }))
            .slice(-BLESSING_QUEUE_MAX)
    }
    if (o.physWins && typeof o.physWins === "object") {
        for (const [k, v] of Object.entries(o.physWins as Record<string, unknown>)) {
            if (typeof v === "number" && isFinite(v) && v > 0) d.physWins[k] = Math.floor(v)
        }
    }
    // Jetons invisibles (casino)
    d.chipDay = typeof o.chipDay === "string" ? o.chipDay : ""
    if (Array.isArray(o.chips)) {
        d.chips = (o.chips as unknown[])
            .filter((c): c is { x: number; y: number; count: number } => !!c && typeof c === "object" && typeof (c as { x?: unknown }).x === "number" && typeof (c as { y?: unknown }).y === "number" && typeof (c as { count?: unknown }).count === "number")
            .map((c) => ({ x: Math.floor(c.x), y: Math.floor(c.y), count: Math.max(1, Math.min(9, Math.floor(c.count))) }))
            .slice(0, 30)
    }
    d.chipSearched = Array.isArray(o.chipSearched) ? (o.chipSearched as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 80) : []
    d.blessedSearch = o.blessedSearch === true
    return d
}

/** Parse défensif d'un Daemon de champion figé (ChampionMon) — tolère tout format inconnu. */
function parseChampionMon(raw: unknown): ChampionMon | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.speciesId !== "string" || typeof o.level !== "number") return null
    const s = (o.stats ?? {}) as Record<string, unknown>
    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.max(1, Math.floor(v)) : 1)
    return {
        speciesId: o.speciesId,
        nickname: typeof o.nickname === "string" ? o.nickname : undefined,
        level: Math.max(1, Math.min(100, Math.floor(o.level as number))),
        shiny: o.shiny === true ? true : undefined,
        stats: { hp: num(s.hp), atk: num(s.atk), def: num(s.def), spe: num(s.spe), spc: num(s.spc) },
        moves: Array.isArray(o.moves) ? (o.moves as unknown[]).filter((m): m is string => typeof m === "string").slice(0, 4) : [],
    }
}

/** Parse défensif d'une équipe de champion figée (NG+ : ancienne équipe). null si vide/absente. */
function parseChampionTeam(raw: unknown): ChampionMon[] | null {
    if (!Array.isArray(raw)) return null
    const t = (raw as unknown[]).map(parseChampionMon).filter((m): m is ChampionMon => m !== null)
    return t.length ? t : null
}

/** Parse défensif du monde NG+ imbriqué (une YellowSave, SANS sous-monde → profondeur bornée à 1). */
function parseNestedWorld(raw: unknown): YellowSave | null {
    if (!raw || typeof raw !== "object") return null
    return parseSave(raw, true)
}

/** Parse défensif d'une sauvegarde complète. `nested` = on parse un monde NG+ imbriqué → on n'y REparse
 *  pas de sous-monde (activeWorld forcé "live", ngplusWorld/ngplusOldTeam null) pour borner la récursion. */
export function parseSave(raw: unknown, nested = false): YellowSave {
    if (!raw || typeof raw !== "object") return emptySave()
    const o = raw as Record<string, unknown>
    // MIGRATION cliquet ACE (v2) : une save antérieure à v2 → on remet acePeakLevel + aceTeamSizePeak
    // à leur défaut (recalibration sur l'équipe actuelle). aceWins est conservé (cf. plus bas).
    const fromVersion = typeof o.version === "number" ? o.version : 0
    const aceRatchetReset = fromVersion < ACE_RATCHET_RESET_VERSION
    const team = Array.isArray(o.team) ? (o.team as unknown[]).map(parseMon).filter((m): m is MonInstance => m !== null) : []
    const pc = Array.isArray(o.pc) ? (o.pc as unknown[]).map(parseMon).filter((m): m is MonInstance => m !== null) : []
    const dex = (o.pokedex ?? {}) as Record<string, unknown>
    const items: Record<string, number> = {}
    if (o.items && typeof o.items === "object") {
        for (const [k, v] of Object.entries(o.items as Record<string, unknown>)) {
            if (typeof v === "number") items[k] = v
        }
    }
    return {
        version: SAVE_VERSION,
        team,
        pc,
        items,
        reps: typeof o.reps === "number" ? Math.max(0, Math.floor(o.reps)) : 0,
        repsCap: typeof o.repsCap === "number" ? Math.max(1, Math.floor(o.repsCap)) : 1000,
        creditedThrough: typeof o.creditedThrough === "string" ? o.creditedThrough : "",
        repsBankedTotal: typeof o.repsBankedTotal === "number" ? Math.floor(o.repsBankedTotal) : -1,
        welcomeGift: o.welcomeGift === true,
        pokerFirstGameDone: o.pokerFirstGameDone === true,
        pokerBossStacks: numRecNonNeg(o.pokerBossStacks), // garde les 0 (boss ruinés) → ne ressuscitent pas au reload
        pokerCashCap: typeof o.pokerCashCap === "number" && isFinite(o.pokerCashCap) ? Math.max(0, Math.floor(o.pokerCashCap)) : 0,
        pokerCashDate: typeof o.pokerCashDate === "string" ? o.pokerCashDate : "",
        spagGift: o.spagGift === true,
        pastaGodGift: o.pastaGodGift === true,
        pastaBoughtToday: typeof o.pastaBoughtToday === "number" ? Math.max(0, Math.floor(o.pastaBoughtToday)) : 0,
        casinoSpentToday: typeof o.casinoSpentToday === "number" ? Math.max(0, Math.floor(o.casinoSpentToday)) : 0,
        pastaDayBonus: typeof o.pastaDayBonus === "number" ? Math.max(0, Math.floor(o.pastaDayBonus)) : 0,
        domeChampionships: typeof o.domeChampionships === "number" ? Math.max(0, Math.floor(o.domeChampionships)) : 0,
        pokedex: { seen: strArr(dex.seen), caught: strArr(dex.caught) },
        defeatedTrainers: strArr(o.defeatedTrainers),
        rematchedTrainers: strArr(o.rematchedTrainers),
        badges: strArr(o.badges),
        introSeen: o.introSeen === true,
        sbireDefeatsToday: typeof o.sbireDefeatsToday === "number" ? Math.max(0, Math.floor(o.sbireDefeatsToday)) : 0,
        consultsToday: typeof o.consultsToday === "number" ? Math.max(0, Math.floor(o.consultsToday)) : 0,
        sageSaiyanPointsToday: typeof o.sageSaiyanPointsToday === "number" ? Math.max(0, Math.floor(o.sageSaiyanPointsToday)) : 0,
        ananasLastBadgeCount: typeof o.ananasLastBadgeCount === "number" ? Math.max(0, Math.floor(o.ananasLastBadgeCount)) : 0,
        ananasDate: typeof o.ananasDate === "string" ? o.ananasDate : "",
        ananasPeakLevel: typeof o.ananasPeakLevel === "number" ? Math.max(0, Math.floor(o.ananasPeakLevel)) : 0,
        capturesToday: typeof o.capturesToday === "number" ? Math.max(0, Math.floor(o.capturesToday)) : 0,
        sbireWinsTotal: typeof o.sbireWinsTotal === "number" ? Math.max(0, Math.floor(o.sbireWinsTotal)) : 0,
        pvpStats: parsePvpStats(o.pvpStats),
        domeStats: parseDomeStats(o.domeStats),
        stats: parseStats(o.stats),
        // NERF ACE (migration v2) : cliquet remis à zéro pour les vieilles saves → recalibrage.
        acePeakLevel: aceRatchetReset ? 0 : (typeof o.acePeakLevel === "number" ? Math.max(0, Math.floor(o.acePeakLevel)) : 0),
        aceBox: numRec(o.aceBox),
        aceTeamSizePeak: aceRatchetReset ? 3 : (typeof o.aceTeamSizePeak === "number" ? Math.max(3, Math.min(6, Math.floor(o.aceTeamSizePeak))) : 3),
        aceWins: typeof o.aceWins === "number" ? Math.max(0, Math.floor(o.aceWins)) : 0, // CONSERVÉ (progrès Panthéon)
        aceDefeatedDate: typeof o.aceDefeatedDate === "string" ? o.aceDefeatedDate : "",
        duelWins: strRec(o.duelWins),
        ownedCts: strArr(o.ownedCts),
        boughtCts: strArr(o.boughtCts),
        gekrocResolved: o.gekrocResolved === true,
        hhSpectresShown: strArr(o.hhSpectresShown),
        hhCollectorWins: typeof o.hhCollectorWins === "number" ? Math.max(0, Math.floor(o.hhCollectorWins)) : 0,
        isChampion: o.isChampion === true,
        leagueSixShiny: o.leagueSixShiny === true,
        mirrorWinHigherLevel: o.mirrorWinHigherLevel === true,
        berrySecretKnown: o.berrySecretKnown === true,
        berryHarvestDay: typeof o.berryHarvestDay === "string" ? o.berryHarvestDay : "",
        berryHarvestPicked: strArr(o.berryHarvestPicked),
        sylvebarbeAwake: o.sylvebarbeAwake === true,
        caveTradeDone: o.caveTradeDone === true,
        goshHintHeard: o.goshHintHeard === true,
        orcalineWins: typeof o.orcalineWins === "number" ? Math.max(0, Math.floor(o.orcalineWins)) : 0,
        pnj5Wins: typeof o.pnj5Wins === "number" ? Math.max(0, Math.floor(o.pnj5Wins)) : 0,
        orcalineDate: typeof o.orcalineDate === "string" ? o.orcalineDate : "",
        ngplusBattles: typeof o.ngplusBattles === "number" ? Math.max(0, Math.floor(o.ngplusBattles)) : 0,
        moveReminderUses: typeof o.moveReminderUses === "number" ? Math.max(0, Math.floor(o.moveReminderUses)) : 0,
        labDefi: parseLabDefi(o.labDefi),
        // Défensif : on ne garde que les entrées custom PLAUSIBLES (une entrée cassée ne bloque pas le chargement).
        customDaemons: Array.isArray(o.customDaemons) ? o.customDaemons.filter(isPlausibleStoredDaemon) : [],
        ngplusStartedAt: typeof o.ngplusStartedAt === "number" && isFinite(o.ngplusStartedAt) ? Math.floor(o.ngplusStartedAt) : undefined,
        playtimeMs: typeof o.playtimeMs === "number" && isFinite(o.playtimeMs) ? Math.max(0, Math.floor(o.playtimeMs)) : 0,
        leaguePotions: typeof o.leaguePotions === "number" && isFinite(o.leaguePotions) ? Math.max(0, Math.floor(o.leaguePotions)) : 0,
        ngplusUsed: o.ngplusUsed === true,
        // Mondes (jusqu'à 3 + bulle de rejeu) : un monde imbriqué (`nested`) n'a AUCUN sous-monde → récursion bornée à 1 niveau.
        activeWorld: !nested && (o.activeWorld === "ngplus" || o.activeWorld === "run3" || o.activeWorld === "replay") ? (o.activeWorld as "ngplus" | "run3" | "replay") : "live",
        ngplusWorld: nested ? null : parseNestedWorld(o.ngplusWorld),
        ngplusOldTeam: nested ? null : parseChampionTeam(o.ngplusOldTeam),
        run3World: nested ? null : parseNestedWorld(o.run3World),
        // REJEU (« run bis ») — bulle isolée + méta. Top-level uniquement (jamais imbriquée → pas de récursion).
        replayWorld: nested ? null : parseNestedWorld(o.replayWorld),
        replayRun: !nested && (o.replayRun === "run1" || o.replayRun === "run2" || o.replayRun === "run3") ? (o.replayRun as "run1" | "run2" | "run3") : null,
        replayReturn: !nested && (o.replayReturn === "ngplus" || o.replayReturn === "run3") ? (o.replayReturn as "ngplus" | "run3") : (!nested && o.activeWorld === "replay" ? "live" : null),
        run3Used: o.run3Used === true,
        // Marqueur run 2 « Maître battu, combat final en attente » : per-monde (vit dans le monde run 2). Parsé
        // à tous les niveaux ; false par défaut (anciennes saves + monde live/run3 qui ne l'utilisent pas).
        ngplusMaitreBeaten: o.ngplusMaitreBeaten === true,
        run3StarterBase: typeof o.run3StarterBase === "string" ? o.run3StarterBase : "",
        ngplusStarterBase: typeof o.ngplusStarterBase === "string" ? o.ngplusStarterBase : undefined,
        genieArcSeen: o.genieArcSeen === true ? true : undefined,
        genesisMode: o.genesisMode === true ? true : undefined,
        // RUN 3 — ennemis vaincus (score). Parse défensif (façon chips) : ne garde que les entrées {key,level}
        // plausibles, dédup non nécessaire ici (addRun3Defeated dédup à l'écriture), borné à 64.
        run3Defeated: Array.isArray(o.run3Defeated)
            ? (o.run3Defeated as unknown[])
                .filter((e): e is { key: string; level: number } => !!e && typeof e === "object" && typeof (e as { key?: unknown }).key === "string" && typeof (e as { level?: unknown }).level === "number")
                .map((e) => ({ key: e.key, level: Math.max(0, Math.floor(e.level)) }))
                .slice(0, 64)
            : [],
        // RUN 3 — snapshots d'énergie par arène (score Survivant). Parse défensif : objet {clé: nombre≥0}, borné à 32.
        run3EnergyByArena: (o.run3EnergyByArena && typeof o.run3EnergyByArena === "object" && !Array.isArray(o.run3EnergyByArena))
            ? Object.fromEntries(Object.entries(o.run3EnergyByArena as Record<string, unknown>).filter(([, v]) => typeof v === "number" && isFinite(v)).map(([k, v]) => [k, Math.max(0, Math.floor(v as number))]).slice(0, 32))
            : {},
        caughtThisRun: Array.isArray(o.caughtThisRun) ? (o.caughtThisRun as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 300) : [],
        fusionRoster: Array.isArray(o.fusionRoster)
            ? (o.fusionRoster as unknown[]).filter((v): v is { a: string; b: string } => !!v && typeof v === "object" && typeof (v as { a?: unknown }).a === "string" && typeof (v as { b?: unknown }).b === "string").map((v) => ({ a: v.a, b: v.b })).slice(0, 6)
            : [],
        fusionHistory: Array.isArray(o.fusionHistory)
            ? (o.fusionHistory as unknown[]).filter((v): v is { a: string; b: string } => !!v && typeof v === "object" && typeof (v as { a?: unknown }).a === "string" && typeof (v as { b?: unknown }).b === "string").map((v) => ({ a: v.a, b: v.b })).slice(-200) // garde les 200 PLUS RÉCENTES (cohérent avec recordFusionCreated/mergeWorlds)
            : [],
        run3LavapetitSeen: o.run3LavapetitSeen === true,
        run3LavapetitCaught: o.run3LavapetitCaught === true,
        mimimoyReturned: o.mimimoyReturned === true,
        mimimoyAppearances: typeof o.mimimoyAppearances === "number" ? Math.max(0, Math.min(10, Math.floor(o.mimimoyAppearances))) : 0,
        ballLockRemaining: typeof o.ballLockRemaining === "number" ? Math.max(0, Math.min(100000, Math.floor(o.ballLockRemaining))) : 0,
        forcedEncounter: typeof o.forcedEncounter === "string" ? o.forcedEncounter : undefined,
        // MULTI-PROFILS : profils inactifs portés OPAQUES (jamais imbriqués dans un monde `nested` → top-level only).
        //   Re-parsés seulement au moment de la bascule (switchProfile). Les blobs stockés n'ont PAS d'altProfiles (stripés au stash).
        altProfiles: !nested && Array.isArray(o.altProfiles) ? (o.altProfiles as YellowSave[]) : undefined,
        fusionLeagueCarry: typeof o.fusionLeagueCarry === "string" ? o.fusionLeagueCarry : undefined,
        curseAbundanceStart: typeof o.curseAbundanceStart === "number" ? o.curseAbundanceStart : undefined,       // vœu maudit Jacanon
        curseFreeItemsTaken: typeof o.curseFreeItemsTaken === "number" ? Math.max(0, Math.floor(o.curseFreeItemsTaken)) : undefined,
        curseFreeItemDate: typeof o.curseFreeItemDate === "string" ? o.curseFreeItemDate : undefined,
        potionBuysToday: typeof o.potionBuysToday === "number" ? Math.max(0, Math.floor(o.potionBuysToday)) : undefined,
        jcEnergyBuysToday: typeof o.jcEnergyBuysToday === "number" ? Math.max(0, Math.floor(o.jcEnergyBuysToday)) : undefined,
        casinoCapToday: typeof o.casinoCapToday === "number" ? Math.max(0, Math.floor(o.casinoCapToday)) : undefined,
        fusionLeagueDefeats: o.fusionLeagueDefeats && typeof o.fusionLeagueDefeats === "object" && !Array.isArray(o.fusionLeagueDefeats)
            ? Object.fromEntries(Object.entries(o.fusionLeagueDefeats as Record<string, unknown>).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, Math.max(0, Math.floor(v as number))]))
            : undefined,
        grotteShopBuys: o.grotteShopBuys && typeof o.grotteShopBuys === "object" && !Array.isArray(o.grotteShopBuys)
            ? Object.fromEntries(Object.entries(o.grotteShopBuys as Record<string, unknown>).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, Math.max(0, Math.floor(v as number))]))
            : undefined,
        chosenAvatar: typeof o.chosenAvatar === "string" ? o.chosenAvatar : undefined,
        megaInLigue: o.megaInLigue === true ? true : undefined,
        fusionLeagueTryDate: typeof o.fusionLeagueTryDate === "string" ? o.fusionLeagueTryDate : undefined,
        fusionChampionRoster: o.fusionChampionRoster && typeof o.fusionChampionRoster === "object" && !Array.isArray(o.fusionChampionRoster)
            ? Object.fromEntries(Object.entries(o.fusionChampionRoster as Record<string, unknown>)
                .filter(([, v]) => Array.isArray(v))
                .map(([k, v]) => [k, (v as unknown[]).map(parseMon).filter((m): m is MonInstance => m !== null).slice(0, 12)]))
            : undefined,
    }
}

/** Retire l'état runtime de combat (stages/volatiles) pour persister une instance propre. */
export function toMonInstance(m: MonInstance & { stages?: unknown; volatiles?: unknown }): MonInstance {
    return {
        uid: m.uid, speciesId: m.speciesId, nickname: m.nickname, level: m.level, exp: m.exp,
        ivs: { ...m.ivs }, currentHp: m.currentHp, status: m.status, statusCounter: m.statusCounter,
        moves: m.moves.map((mv) => ({ ...mv })), owned: m.owned,
        shiny: m.shiny ? true : undefined,
        growthMult: m.growthMult && m.growthMult > 0 ? m.growthMult : undefined, // courbe d'XP forcée (cadeau « lent ») — persistée
        heldItem: m.heldItem,
        pendingMoves: m.pendingMoves && m.pendingMoves.length ? [...m.pendingMoves] : undefined,
        statPoints: m.statPoints && m.statPoints > 0 ? m.statPoints : undefined,
        allocated: m.allocated && Object.keys(m.allocated).length ? { ...m.allocated } : undefined,
        ev: m.ev && Object.keys(m.ev).length ? { ...m.ev } : undefined,
        evCapBoost: m.evCapBoost ? true : undefined,
        evCurveV2: m.evCurveV2 ? true : undefined,
        pendingSaiyanLevels: m.pendingSaiyanLevels && m.pendingSaiyanLevels > 0 ? m.pendingSaiyanLevels : undefined,
        lastLevelUpAt: m.lastLevelUpAt,
        capturedLevel: m.capturedLevel,
        capturedAt: m.capturedAt,
        bestDmg: m.bestDmg && m.bestDmg > 0 ? m.bestDmg : undefined,
        bestDmgMove: m.bestDmgMove,
        originalTrainerId: m.originalTrainerId,
        currentOwnerId: m.currentOwnerId,
        traded: m.traded ? true : undefined,
        originalNickname: m.originalNickname,
        capturedMapId: m.capturedMapId,
        capturedQuotaReached: m.capturedQuotaReached ? true : undefined,
        disobedient: m.disobedient ? true : undefined, // VŒU MAUDIT (Jacanon) : persiste le refus d'obéir
    }
}
