// Nexus II — store externe Zustand.
//
// Sépare l'état du jeu de React. Aucun composant ne possède le state ; ils
// le lisent via useGameStore(selector) qui ne re-render QUE le composant
// concerné (au lieu de tout l'arbre comme useState).
//
// Les actions (move, pressA…) appellent les fonctions pures du moteur et
// remplacent le state immuable. Tout est testable unitairement hors React.

import { create } from "zustand"
import type { Direction, PlayerState } from "../engine/types"
import { createInitialPlayer } from "../engine/types"
import { tryMove } from "../engine/movement"
import { findExitAt } from "../engine/warp"
import { getNpcInFrontOfPlayer, getFacingTile, getTileInFront, findNpcAt } from "../engine/interaction"
import { YELLOW_MAPS, currentArenaMapId, CENDREVILLE_SPAWN } from "../maps"
import { currentGymBadge } from "../data/arenaInfos"
import type { BadgeId } from "../data/cts"
import type { YellowMapData } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { getSnapshot as getBattleSnapshot, startWildBattle, startTrainerBattle, startRun3BossBattle, startNgPlusFinalBattle, startFusionLeagueBattle, resetFleeStreak } from "./battleStore"
import { buildFusion, disposeFusion, type BuiltFusion } from "../data/fusionMon"
import { fusionForParents } from "../data/fusionBaseSpecies"
import { buildFusionLeagueTeam, fusionLeagueKeyForTrainer, activeFusionTier, FUSION_UNLOCK_MARKER } from "../data/fusionLeague"
import { run3ArenaForBoss, run3BossIntroLines, run3LigueMaitreTeam } from "../data/run3Arenas"
import { RUN3_BOSS_TEAMS } from "../data/run3Bosses"
import { getPokedex, markCaught } from "./pokedexStore"
import { getPlayer as getPlayerSave, healAllTeam, claimPastaGodGift, isTrainerDefeated, isTrainerRematched, resetLigueProgress, resetFusionLeagueProgress, aceBattleLevel, aceTeamSizeFor, aceAvailableToday, grantReps, executeTrade, applyTradeEvolution, markCaveTradeDone, markGoshHintHeard, orcalineNextLevel, orcalineAvailableToday, orcalineWinsCount, pnj5WinsCount, addItem, getActiveWorld, effectiveRunWorld, getNgplusNemesisSpeciesId, getRun3AceNemesis, getRun3ThirdStarter, bumpStat, isBerrySecretKnown, setBerrySecretKnown, harvestBerryTree, evolveMagmatorWithChen, markMimimoyReturned, bumpMimimoyAppearances, markCaughtThisRun } from "./playerStore"
import { berryAtTile, BERRY_MAP_IDS } from "../data/berryTrees"
import { getHeldItem } from "../data/heldItems"
import { BERRY_SECRET_LINES_ASSISTANT } from "../data/berryLore"
import { getSpecies } from "../data/species"
import { persistYellowSave, canAbandonNgplus, getNgplusOldTeam } from "./saveManager"
import { rollWildEncounter, wildLevelCap, hasEncounters } from "../data/encounters"
import { reportShiny } from "../shinyGift"
import { getTrainer, trainerBoost, arenaScaledLevel, type TrainTier, type TrainerData } from "../data/trainers"
import { NGPLUS_ARENA_TEAMS, RUN3_ARENA_TEAMS, arenaRevancheBoost, arenaRevancheIntro } from "../data/ngplusArenas"
import { createMonInstance } from "../battle/factory"
import { buildSbireTeam, SBIRE_MAX_FIGHTS_PER_DAY, SBIRE_TRAINER_ID, sbireIntroLines, SBIRE_DONE_LINES, SBIRE_NO_TEAM_LINES } from "../data/sbire"
import { ACE_TRAINER_ID, ACE_TRIGGER_TILES, ACE_DONE_LINES, ACE_NO_TEAM_LINES, ACE_PASS_LINES, ACE_GATE_LINES, aceIntro, aceGiftLine, buildAceTeam, speciesAtLevel } from "../data/ace"
import { CAVE_TRADER_ID, caveTradeConfig } from "../data/caveTrader"
import { HH_KID_ID, HH_KID_DAY_LINES, HH_KID_NIGHT_LINES, HH_KID_DAY_LINES_NGPLUS, HH_KID_DAWN_LINES, isHhKidNight, isHhKidDawn } from "../data/hhKid"
import { ORCALINE_TRAINER_ID, orcalineTrainerDialogue } from "../data/orcalineTrainer"
import { SYLVEBARBE_BLOCK_MAP, inSylvebarbeBlock } from "../data/sylvebarbeBlock"
import { GEKROC_NPC_ID, GEKROC_INTRO_LINES, GEKROC_DONE_LINES, GEKROC_NO_TEAM_LINES, buildGekroc } from "../data/gekroc"
import { SYLVEBARBE_NPC_ID, SYLVEBARBE_INTRO_LINES, SYLVEBARBE_DONE_LINES, SYLVEBARBE_NO_FLUTE_LINES, SYLVEBARBE_NO_TEAM_LINES, buildSylvebarbe, FLUTE_GIVE_LINES } from "../data/sylvebarbe"
import { PNJ5_NPC_ID, PNJ5_TRAINER_ID, PNJ5_MAP_ID, PNJ5_KICK, buildPnj5Team, inPnj5Block, inPnj5Trigger, PNJ5_INTRO_LINES, PNJ5_NO_DOME_LINES, PNJ5_NO_TEAM_LINES, PNJ5_SEAL_LINES } from "../data/pnj5"
import { CHEN_LAB_LINES, LAB_ASSISTANT_LINES, LAB_ASSISTANT_LINES_NGPLUS, LAB_ASSISTANT_LINES_RUN3, CHEN_ABANDON_OFFER_LINES, CHEN_RUN3_TEASER_LINES, CHEN_RUN3_EVOLVE_LINES } from "../data/labDialogues"
import { MAGNETOR_EVO_ITEM } from "../data/items"
import { HH_TRADER_ID, HH_TRADE_GIVE, HH_TRADE_RECEIVE, HH_TRADE_RECEIVE_RUN1, HH_TRADER_OFFER_LINES, HH_TRADER_NEED_LINES, HH_TRADER_OFFER_LINES_RUN1, HH_TRADER_NEED_LINES_RUN1, HH_TRADER_HAS_MORROW_LINES, HH_TRADER_CANCEL_LINES, HH_TRADE_AQUILOTHAN_GIVE, HH_TRADE_AQUILOTHAN_RECEIVE, HH_TRADER_AQUILORD_OFFER_LINES, HH_TRADER_AQUILORD_NEED_LINES, HH_TRADER_AQUILORD_DONE_LINES, HH_TRADER_AQUILORD_CANCEL_LINES, HH_COLLECTOR_ID, HH_COLLECTOR_CT, HH_COLLECTOR_INTRO_LINES, HH_COLLECTOR_REMINDER_LINES, HH_COLLECTOR_DONE_LINES, HH_COLLECTOR_NO_TEAM_LINES, HH_COLLECTOR_WINS_NEEDED, HH_COLLECTOR_SPECTRES_NEEDED, buildHhCollectorTeam } from "../data/hauntedNpcs"

export interface ActiveDialogue {
    npcId: string
    npcName: string
    lines: string[]
    lineIndex: number
}

// Pseudo du compte courant (injecté par le client au montage). Sert au WHITELIST du gate
// Cendreville : certains joueurs (ex. « Ledé ») passent ACE même sans le Badge Flamme.
let currentNickname = ""
export function setCurrentNickname(n: string) { currentNickname = (n ?? "").trim() }
export function getCurrentNickname(): string { return currentNickname }
// Joueurs autorisés à franchir ACE sans le badge ET sans équipe (accès anticipé à Cendreville).
// Match insensible à la casse et à la forme Unicode ("Ledé" / "Lede" / décomposé → ok).
const CENDREVILLE_BYPASS = new Set(["ledé", "lede"])
function aceBypassByNickname(): boolean {
    return CENDREVILLE_BYPASS.has(currentNickname.normalize("NFC").toLowerCase())
}

// LIGUE — quel dresseur garde la porte droite de chaque salle (gauntlet : porte scellée tant qu'il n'est pas vaincu).
const LIGUE_ROOM_TRAINER: Record<string, string> = {
    yellow_ligue_glace: "y_ligue_1_olga",
    yellow_ligue_combat: "y_ligue_2_aldo",
    yellow_ligue_spectre: "y_ligue_3_agatha",
    yellow_ligue_dragon: "y_ligue_4_peter",
    yellow_ligue_rival: "y_ligue_maitre",
}

// LIGUE DE FUSION — même mécanique de porte scellée. La porte de PROGRESSION (→ salle fusion suivante) est
// bloquée tant que la chimère n'est pas vaincue ; la porte de RETRAITE (→ Autel) reste toujours ouverte.
const FUSION_ROOM_TRAINER: Record<string, string> = {
    yellow_fusion_glace: "y_fusion_1",
    yellow_fusion_combat: "y_fusion_2",
    yellow_fusion_spectre: "y_fusion_3",
    yellow_fusion_dragon: "y_fusion_4",
    yellow_fusion_maitre: "y_fusion_maitre",
}

// Espèces éphémères du combat de Ligue de Fusion EN COURS (joueur + ennemi) → à détruire au lancement suivant.
let pendingFusionLeagueSpecies: string[] = []
function disposeFusionLeagueSpecies() {
    for (const id of pendingFusionLeagueSpecies) disposeFusion(id)
    pendingFusionLeagueSpecies = []
}

// GARANTIE DE DÉCOUVERTE — Centrale Psy (run 3) : état TRANSIENT par PASSAGE (non persisté). Tant qu'Hypnoppo
// ou Karmaki n'est pas CAPTURÉ, on force son apparition ≥1× par passage — mais seulement à partir de la 9e/10e
// rencontre (pas avant → non « scripté »). Le flag « vu ce passage » coupe le forçage ensuite (aucun spam si
// le joueur ne capture pas). Le compteur est RÉ-ARMÉ à l'ENTRÉE dans la Centrale (transition de carte, cf. plus bas).
let run3CentralePity = { count: 0, hSeen: false, kSeen: false }

// GROTTE DU NEXUS 1F — règle de pop des FUSIONS (transient, remis à zéro à l'entrée de la grotte). On mémorise les
//   2 dernières rencontres ; quand elles forment la paire de parents EXACTE d'une fusion → on l'AMORCE, et le roll
//   SUIVANT la fait apparaître (garantie). Rareté = combinatoire (2 parents précis coup sur coup).
let grotteFusionPop: { prev1: string; prev2: string; primed: string } = { prev1: "", prev2: "", primed: "" }

interface GameStore {
    // === STATE ===
    player: PlayerState
    map: YellowMapData
    dialogue: ActiveDialogue | null
    shopOpen: boolean // boutique ouverte (vendeur)
    pcOpen: boolean // boîte PC ouverte (ordinateur du Centre Daemon)
    guideOpen: boolean // guide du Bosquet ouvert (panneau devant le gym)
    arenaInfoOpen: BadgeId | null // carrousel d'infos stratégiques d'une arène (panneau devant l'entrée)
    libraryOpen: boolean // Registre des Dresseurs (bibliothèque de l'infirmerie)
    advisorOpen: boolean // Conseiller (PNJ à côté du Centre) : questions → base de données
    labOpen: boolean // Terminal d'expériences (labo, étage de l'infirmerie)
    combatShopOpen: boolean // Boutique de Jetons de Combat (marchand du hub Zone de Combat) — inclut l'entrée Grotte du Nexus
    domeMenuOpen: boolean // carrousel du MAÎTRE DU DÔME (mage central) : S'inscrire / Règles / Stats
    fusionMenuOpen: boolean // AUTEL DE LA CHIMÈRE : choisir 2 Daemons → fusion → combat-épreuve
    fusionAtelierOpen: boolean // ORDINATEUR DE FUSION : atelier (boîte/équipe + les 6 slots de fusion)
    signOpen: number | null // index du panneau du parc ouvert (pop-up dédié), null = fermé
    posterImage: string | null // poster mural du Centre affiché en overlay (src PNG), null = fermé
    poster2Step: number // compteur de SESSION du poster (12,0) : 0→PNG2 · 1→PNG3 · 2+→Dieu des Pâtes
    // Intérieurs PARTAGÉS (shop / Centre) : ville d'origine où ressortir (Ville Jaune ou Cendreville).
    // Posé à l'entrée, consommé à la sortie. null = pas dans un intérieur partagé (ou rechargé).
    interiorReturn: { mapId: string; x: number; y: number } | null
    cendrePosterGiven: boolean // don d'énergie du poster cendre 2 déjà donné cette session (anti-spam)
    hydrated: boolean // true une fois que l'état serveur a été chargé
    stepFrame: 0 | 1 // alterne à chaque déplacement réel → anime les jambes du sprite
    pendingTrainerId: string | null // dresseur dont l'intro est en cours → combat à la fermeture
    pendingRematch: boolean // l'intro en cours est un REMATCH (2e équipe + récompense)
    pendingSbire: boolean // intro du sbire en cours → combat dynamique à la fermeture
    pendingAce: boolean // intro d'ACE en cours → combat à la fermeture
    pendingNgplusAbandon: boolean // NG+ : offre d'abandon de CHEN en cours → confirmation UI à la fermeture du dialogue
    pendingOrcaline: boolean // intro du DRESSEUR D'ORCALINE en cours → combat à la fermeture
    pendingGekroc: boolean // intro de GÉKROC (mini-boss Centrale) en cours → combat à la fermeture
    pendingSylvebarbe: boolean // intro de SYLVEBARBE (gardien sud Ville Jaune) en cours → combat à la fermeture
    pendingPnj5: boolean // intro de PNJ 5 (gardien de la Grotte du Nexus) en cours → combat à la fermeture
    pendingHhTrade: string | null // uid du Roctaur à échanger (BROCANTEUR maison hantée) → échange à la fermeture
    pendingAquilordTrade: string | null // uid de l'Aquilothan → Aquilord (BROCANTEUR, service premium live) à la fermeture
    pendingCaveTrade: string | null // uid du Faukon à échanger (DÉNICHEUR grotte) → échange à la fermeture
    pendingHhCollector: boolean // intro du COLLECTIONNEUR (maison hantée) en cours → combat à la fermeture
    encounterCooldown: number // #7 : pas de rencontre sauvage pendant N déplacements (≥1 case libre après un combat)

    // === ACTIONS ===
    move: (dir: Direction) => void
    pressA: () => void
    pressB: () => void
    setMap: (mapId: string, spawnX: number, spawnY: number) => void
    /** Lance directement le REMATCH d'un dresseur (boss à 2 phases : enchaîne phase 2 après phase 1). */
    launchRematch: (trainerId: string) => void
    hydrate: (loaded: PlayerState) => void
    closeShop: () => void
    closePc: () => void
    closeGuide: () => void
    closeArenaInfo: () => void
    closeLibrary: () => void
    closeAdvisor: () => void
    closeLab: () => void
    closeCombatShop: () => void
    closeDomeMenu: () => void
    closeFusionMenu: () => void
    closeFusionAtelier: () => void
    openPc: () => void
    closeSign: () => void
    closePoster: () => void
    /** Affiche un dialogue simple (ex. explication post-combat du sbire). */
    showDialogue: (npcId: string, npcName: string, lines: string[]) => void
}

// === PERSISTANCE SERVEUR ===
// Debounce 3s sur l'envoi : si le joueur bouge en rafale, on n'envoie QUE la
// dernière position après 3s d'inactivité. Limite drastiquement le trafic Neon.
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** POST de la position (map/pos/dir) vers le serveur. */
function postPos(player: PlayerState) {
    if (typeof window === "undefined") return
    fetch("/api/gamebook/yellow/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId: player.mapId, posX: player.posX, posY: player.posY, direction: player.direction }),
    }).catch((e) => console.warn("[yellow] save failed", e))
}

function scheduleSave(player: PlayerState) {
    if (typeof window === "undefined") return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => postPos(player), 3000) // PAS des déplacements → débounce anti-trafic Neon
}

/** Sauvegarde IMMÉDIATE de la position (transitions de map : rares mais critiques). Évite la DÉSYNC
 *  position↔flags si le joueur recharge juste après un warp — ex. whiteout Ligue → infirmerie : la
 *  progression est resettée dans les flags (immédiat), la position DOIT suivre tout de suite, sinon le
 *  joueur recharge figé dans la salle (position débouncée perdue) alors que sa Ligue est déjà remise à zéro. */
function saveNow(player: PlayerState) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    postPos(player)
}

// Lance un combat de dresseur. Renvoie un dialogue à afficher (équipe K.O.) ou null
// si le combat a bien démarré. L'équipe ennemie est fabriquée à partir du registre.
/** LIGUE DE FUSION — lance un combat : le joueur PILOTE son roster de fusions ; l'ennemi = équipe fusionnée du
 *  dresseur (buildFusionLeagueTeam au palier actif), ou le REFLET du roster (miroir). Toutes les espèces éphémères
 *  sont enregistrées ici et détruites au lancement suivant (disposeFusionLeagueSpecies). */
function launchFusionLeague(trainerId: string, trainer: TrainerData): ActiveDialogue | null {
    // ⚠️ Détruire le batch du combat PRÉCÉDENT AVANT de rebâtir : les fusions du joueur ont un id d'espèce
    //   DÉTERMINISTE (mêmes parents de roster → même `fusion_<uidA>_<uidB>`). Disposer APRÈS le build
    //   désenregistrerait l'espèce fraîchement construite → speciesOf throw → combat planté (cf. bug atelier).
    disposeFusionLeagueSpecies()
    const save = getPlayerSave()
    const all = [...save.team, ...save.pc]
    const byU = (uid: string) => all.find((m) => m.uid === uid)
    const buildRoster = (): BuiltFusion[] => save.fusionRoster
        .map((p) => { const a = byU(p.a), b = byU(p.b); return a && b && a.uid !== b.uid ? buildFusion(a, b) : null })
        .filter((x): x is BuiltFusion => x !== null)

    const playerFusions = buildRoster()
    if (playerFusions.length === 0) {
        return { npcId: trainerId, npcName: trainer.name, lineIndex: 0, lines: ["Assemble d'abord une équipe de chimères au 💻 de l'Autel avant de m'affronter !"] }
    }

    let enemyFusions: BuiltFusion[]
    if (trainerId === "y_fusion_miroir") {
        // MIROIR : le REFLET du roster (mêmes fusions, instances distinctes → PAS freezeTeam qui perdrait frozenSpd).
        enemyFusions = buildRoster()
    } else {
        const key = fusionLeagueKeyForTrainer(trainerId)
        if (!key) { playerFusions.forEach((f) => disposeFusion(f.speciesId)); return null }
        const tier = activeFusionTier((m) => isTrainerDefeated(m))
        enemyFusions = buildFusionLeagueTeam(key, tier)
    }

    pendingFusionLeagueSpecies = [...playerFusions, ...enemyFusions].map((f) => f.speciesId)
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startFusionLeagueBattle(playerFusions.map((f) => f.instance), enemyFusions.map((f) => f.instance), seed, trainerId)
    return null
}

function tryLaunchTrainer(trainerId: string, isRematch = false): ActiveDialogue | null {
    const trainer = getTrainer(trainerId)
    if (!trainer) return null
    // LIGUE DE FUSION : le joueur pilote son ROSTER de fusions (pas sa vraie équipe) → branche AVANT le check
    //   équipe-KO (sa vraie équipe peut être K.O., on joue des chimères éphémères).
    if (trainerId.startsWith("y_fusion_")) return launchFusionLeague(trainerId, trainer)
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return {
            npcId: trainerId, npcName: trainer.name, lineIndex: 0,
            lines: ["Tes Daemons sont tous K.O. !", "Soigne-les au Centre avant de te battre."],
        }
    }
    // TON DOUBLE (salle dorée, run 2) : combat FINAL contre ton ANCIENNE équipe GELÉE (startNgPlusFinalBattle, SANS
    //   soin). L'équipe statique du trainer n'est PAS utilisée. Déjà vaincu (isChampion) → réplique, pas de re-combat.
    if (trainerId === "y_ligue_double") {
        if (getPlayerSave().isChampion) {
            return { npcId: trainerId, npcName: currentNickname || trainer.name, lineIndex: 0, lines: trainer.defeat }
        }
        if (!startNgPlusFinalBattle(getNgplusOldTeam() ?? [])) {
            return { npcId: trainerId, npcName: currentNickname || trainer.name, lineIndex: 0, lines: ["*Ton reflet s'estompe dans la lueur mauve… reviens quand tu seras prêt.*"] }
        }
        return null
    }
    // Boost "entraînement" : TOUS les dresseurs sont boostés pour ne pas être surclassés
    // par un joueur qui alloue du Saiyan à chaque niveau. Boss d'arène (badge) → "elite" ;
    // tout autre dresseur (route, gardes…) → "guard". Le boost SCALE avec le niveau
    // (trainerBoost), donc un dresseur niv 6 reste modeste et un niv 25 devient solide.
    const tier: TrainTier | undefined = trainer.training ?? (trainer.badge ? "elite" : "guard")
    // Rival de route (Léo/Mia) : niveau d'un garde de l'arène la plus récemment battue. Leurs
    // Daemons ÉVOLUENT au stade correspondant à ce niveau (speciesAtLevel enchaîne les évolutions).
    const scaledLvl = trainer.scaleWithBadges ? arenaScaledLevel(getPlayerSave().badges) : null
    // REJEU : effectiveRunWorld() → un rejeu run 2/3 fielde bien les équipes d'arène re-typées du run rejoué (pas run 1).
    const ngplus = effectiveRunWorld() === "ngplus"
    const run3 = effectiveRunWorld() === "run3"
    // Rematch (match retour) → 2e équipe ; sinon l'équipe de base.
    let specs = isRematch && trainer.rematch ? trainer.rematch.team : trainer.team
    // NG+ REVANCHE (combat SÉPARÉ run 2) : re-parler à un dresseur d'arène déjà battu (isRematch) lance la
    // REVANCHE = son équipe RUN 1 D'ORIGINE boostée de +N niveaux (garde-fou : évolution au stade naturel du
    // niveau). Prime sur la sélection rematch/re-typée ci-dessous.
    const revBoost = ngplus && isRematch ? arenaRevancheBoost(trainerId) : null
    if (revBoost != null) {
        specs = trainer.team.map((s) => {
            const level = Math.min(100, s.level + revBoost)
            return { ...s, level, speciesId: speciesAtLevel(s.speciesId, level) }
        })
    }
    // NG+ : LE MAÎTRE **est** ACE (rival en habit de Champion) → « ace nouvelle formule » : sa lignée Divin Pâte
    // devient le NÉMÉSIS (contre-lignée de ta création), rétro-évolué au bon stade pour le niveau de son slot.
    if (trainerId === "y_ligue_maitre" && ngplus) {
        const nem = getNgplusNemesisSpeciesId()
        if (nem) specs = specs.map((s) => (s.speciesId === "divinpate" ? { ...s, speciesId: speciesAtLevel(nem, s.level) } : s))
    }
    // NG+ : les 5 ARÈNES affichent leurs équipes RUN 2 re-typées — SEULEMENT au 1er combat (PAS la revanche,
    // qui rejoue l'équipe run 1 d'origine ci-dessus). L'AS y porte sa signature exclusive.
    if (ngplus && !isRematch && NGPLUS_ARENA_TEAMS[trainerId]) {
        specs = NGPLUS_ARENA_TEAMS[trainerId]
    }
    // RUN 3 : les 5 arènes affichent leurs GARDIENS re-typés (aperçu de la Ligue). Combat unique (le run 3 n'a
    //   pas de revanche). RUN3_ARENA_TEAMS ne couvre QUE g1-g4 → le BOSS garde son équipe tant que les équipes
    //   de joueur figées ne sont pas injectées (étape suivante).
    if (run3 && !isRematch && RUN3_ARENA_TEAMS[trainerId]) {
        // speciesAtLevel : force chaque gardien à son STADE NATUREL pour son niveau (jamais un stade-1 à un niveau
        //   où il devrait avoir évolué — règle « jamais de Daemon à un niveau non naturel »).
        specs = RUN3_ARENA_TEAMS[trainerId].map((s) => ({ ...s, speciesId: speciesAtLevel(s.speciesId, s.level) }))
    }
    // RUN 3 : LE MAÎTRE de la Ligue (= ACE en Champion) sort une équipe revisitée (écho de son rival run 3) :
    //   Gékraise + Orcaline + némésis(contre-starter) + Aquilord + Divinpâte + Mégalithe. Mêmes niveaux → score
    //   Ligue inchangé. Le némésis est évolué à son stade naturel pour le niveau (jamais une souche à haut niveau).
    if (run3 && !isRematch && trainerId === "y_ligue_maitre") {
        const nem = getRun3AceNemesis()
        if (nem) specs = run3LigueMaitreTeam(speciesAtLevel(nem, 59))
    }
    // RUN 3 : le BOSS d'arène = équipe de JOUEUR FIGÉE (tronquée à la taille de l'arène). Combat spécial
    //   (championToInstance, stats gelées) → on court-circuite le fielding TrainerMonSpec ci-dessous.
    if (run3 && !isRematch) {
        const r3boss = run3ArenaForBoss(trainerId)
        if (r3boss && startRun3BossBattle(r3boss.badge, trainerId)) return null
    }
    // NG+ LIGUE : durcissement des 5 boss → tous les Daemons +2, l'AVANT-DERNIER +3, le DERNIER +5
    // (évolution au stade naturel si le boost dépasse le niveau d'évolution).
    if (ngplus && trainerId.startsWith("y_ligue_")) {
        const n = specs.length
        specs = specs.map((s, i) => {
            const boost = i === n - 1 ? 5 : i === n - 2 ? 3 : 2
            const level = Math.min(100, s.level + boost)
            return { ...s, level, speciesId: speciesAtLevel(s.speciesId, level) }
        })
    }
    const enemyTeam = specs.map((s) => {
        const lvl = scaledLvl ?? s.level
        const speciesId = trainer.scaleWithBadges ? speciesAtLevel(s.speciesId, lvl) : s.speciesId
        const inst = createMonInstance(speciesId, lvl, { owned: false, moveIds: s.moves, ...trainerBoost(speciesId, lvl, tier) })
        // Opening scripté (boss) → attaché au combattant runtime (consommé par l'IA ennemie).
        if (s.opening?.length) Object.assign(inst, { openingMoves: [...s.opening] })
        if (s.heldItem) Object.assign(inst, { heldItem: s.heldItem }) // baie/objet tenu imposé par le dresseur
        return inst
    })
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, { trainerId, reward: isRematch ? 0 : trainer.reward, aiLevel: trainer.aiLevel, isRematch })
    return null
}

// Lance le combat DYNAMIQUE du sbire : équipe = miroir du lead (1re victoire du
// jour) puis faiblesse du lead (2e), toujours à niveau équivalent. Renvoie un
// dialogue (équipe K.O.) ou null si le combat démarre.
function tryLaunchSbire(): ActiveDialogue | null {
    const team = getPlayerSave().team
    const lead = team.find((m) => m.currentHp > 0)
    if (!lead) {
        return {
            npcId: SBIRE_TRAINER_ID, npcName: "SBIRE", lineIndex: 0,
            lines: SBIRE_NO_TEAM_LINES,
        }
    }
    const fightIndex = getPlayerSave().sbireDefeatsToday // 0 → miroir, 1 → faiblesse
    // Le sbire MIROIR ton lead (boosté Saiyan) → on le booste en "elite" pour qu'il
    // soit un vrai rival, pas une version nerfée de toi-même.
    const enemyTeam = buildSbireTeam(team, fightIndex).map((m) =>
        createMonInstance(m.speciesId, m.level, { owned: false, ...trainerBoost(m.speciesId, m.level, "elite") }))
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, { trainerId: SBIRE_TRAINER_ID, reward: 0, aiLevel: "trainer" })
    return null
}

// Lance le combat de GÉKROC : mini-boss STATIQUE wild-style (capturable), instance fixe N35.
// Renvoie un dialogue (équipe K.O.) ou null si le combat démarre. Résolu (one-time) dans finishBattle.
function tryLaunchGekroc(): ActiveDialogue | null {
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: GEKROC_NPC_ID, npcName: "GÉKROC", lineIndex: 0, lines: GEKROC_NO_TEAM_LINES }
    }
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startWildBattle(team, [buildGekroc(effectiveRunWorld())], seed) // gardien selon le monde : Gékroc / Gékraise / Gékosmic (rejeu → run rejoué)
    return null
}

// Lance le combat de SYLVEBARBE : gardien endormi wild-style (capturable), instance fixe N60.
// Renvoie un dialogue (équipe K.O.) ou null si le combat démarre. Résolu (one-time) dans finishBattle.
function tryLaunchSylvebarbe(): ActiveDialogue | null {
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: SYLVEBARBE_NPC_ID, npcName: "SYLVEBARBE", lineIndex: 0, lines: SYLVEBARBE_NO_TEAM_LINES }
    }
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startWildBattle(team, [buildSylvebarbe()], seed)
    return null
}

// BROCANTEUR (maison hantée) : échange le Roctaur (uid) du joueur — WORLD-AWARE. RUN 1 : il revient trade-ÉVOLUÉ
// en ROCHISON (service d'évolution). RUN 2 : échangé contre un MORROW (Glace/Psy, exclusif run 2). Renvoie le dialogue.
function doHhTrade(giveUid: string): ActiveDialogue | null {
    const owner = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.uid === giveUid)
    if (!owner) return null
    const ngplus = getActiveWorld() === "ngplus"
    const receiveId = ngplus ? HH_TRADE_RECEIVE : HH_TRADE_RECEIVE_RUN1 // run 2 = Morrow ; run 1 = Rochison (trade-évo)
    const received = createMonInstance(receiveId, owner.level, { owned: true })
    received.statPoints = owner.statPoints ?? 0 // préserve l'investissement Saiyan (Rochison trade-évo ET Morrow)
    if (owner.shiny) received.shiny = true      // NE JAMAIS détruire un shiny à l'échange (Rochison/Morrow héritent de la brillance)
    executeTrade(giveUid, received)      // retire le Roctaur, ajoute le reçu (Morrow ou Rochison)
    applyTradeEvolution(received.uid)    // Morrow/Rochison ne trade-évoluent pas plus loin → no-op (défensif)
    persistYellowSave()
    return {
        npcId: HH_TRADER_ID, npcName: "BROCANTEUR", lineIndex: 0,
        lines: ngplus
            ? ["Marché conclu ! Je récupère ton Roctaur…", "…et tu reçois mon MORROW ! Une créature d'un autre monde, dont le baiser glace le cœur. Prends-en soin."]
            : ["Marché conclu ! Ton Roctaur file dans mon canal d'échange secret…", "…et il te REVIENT, ÉVOLUÉ en ROCHISON ! La magie de l'échange, l'ami. 🪨"],
    }
}

// BROCANTEUR — SERVICE PREMIUM (live) : trade-évolue un AQUILOTHAN → AQUILORD (moveset naturel du niveau =
// Vol+Glace+Feu+Soin), en préservant le niveau + l'investissement Saiyan + la brillance. Le passage narratif
// du Mimimoy AMORCE son roaming (markMimimoyReturned). Aquilord entre au Pokédex.
function doAquilordTrade(giveUid: string): ActiveDialogue | null {
    const owner = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.uid === giveUid)
    if (!owner) return null
    // Évo EN PLACE (comme un échange joueur↔joueur) : conserve niveau, IV, MOVES CHOISIS, points Saiyan, brillance
    //   et surnom. Aquilord apprend simplement SES nouveaux moves (Glace/Feu/soin) en montant de niveau.
    applyTradeEvolution(giveUid)
    markCaught(HH_TRADE_AQUILOTHAN_RECEIVE); markCaughtThisRun(HH_TRADE_AQUILOTHAN_RECEIVE) // Aquilord au Pokédex
    markMimimoyReturned()                            // le Mimimoy passé entre les mains → roaming amorcé (live)
    persistYellowSave()
    return { npcId: HH_TRADER_ID, npcName: "BROCANTEUR", lineIndex: 0, lines: HH_TRADER_AQUILORD_DONE_LINES }
}

// DÉNICHEUR (Route Nord) : donne un COMMUN → reçoit un BÉLUNODE (base lignée Léviathonn) au MÊME niveau
// + MÊMES points Saiyan (récompense de l'investissement). Bélunode évolue ensuite en Sonarque → Léviathonn.
function doCaveTrade(giveUid: string): ActiveDialogue | null {
    const owner = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.uid === giveUid)
    if (!owner) return null
    const cfg = caveTradeConfig(getActiveWorld() === "run3") // run 3 = ruffiant→marmoterre ; sinon limaroche→belunode
    const received = createMonInstance(cfg.receive, owner.level, { owned: true })
    received.statPoints = owner.statPoints ?? 0 // préserve les points Saiyan
    if (owner.shiny) received.shiny = true       // NE JAMAIS détruire un shiny à l'échange (comme doHhTrade)
    executeTrade(giveUid, received)             // retire le donné, ajoute le reçu
    markCaveTradeDone()                          // échange unique (per-monde) → ne se reproposera plus
    persistYellowSave()
    return { npcId: CAVE_TRADER_ID, npcName: "DÉNICHEUR", lineIndex: 0, lines: cfg.done }
}

// COLLECTIONNEUR DE SPECTRES (maison hantée) : combat de dresseur réaffrontable, équipe = 3 spectres au
// niveau du meilleur Daemon du joueur. La récompense (CT26) est gérée dans battleStore.finishBattle.
function tryLaunchHhCollector(): ActiveDialogue | null {
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: HH_COLLECTOR_ID, npcName: "COLLECTIONNEUR", lineIndex: 0, lines: HH_COLLECTOR_NO_TEAM_LINES }
    }
    const level = Math.max(...team.map((m) => m.level))
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, buildHhCollectorTeam(level), seed, { trainerId: HH_COLLECTOR_ID, reward: 0, aiLevel: "trainer" })
    return null
}

// Lance le combat ACE : équipe = celle STOCKÉE pour ce joueur (IA "ace"), budget
// d'énergie ennemi = 1,5× les reps du joueur. Renvoie un dialogue (K.O.) ou null.
function tryLaunchAce(): ActiveDialogue | null {
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: ACE_TRAINER_ID, npcName: "ACE", lineIndex: 0, lines: ACE_NO_TEAM_LINES }
    }
    // ACE se cale sur la MOYENNE de l'équipe du joueur (plus sur son meilleur) : un dresseur n'a jamais
    // toute son équipe au niveau de son plus fort → combat bien plus équitable.
    const avg = Math.round(team.reduce((s, m) => s + m.level, 0) / Math.max(1, team.length))
    const last = team[team.length - 1]
    const lastTypes = getSpecies(last.speciesId)?.types ?? []
    // CLIQUET : le niveau d'ACE est FIGÉ entre deux défaites (aceBattleLevel). Il ne monte
    // qu'APRÈS sa défaite (recordAceDefeat) — fini la recalibration à chaque rencontre.
    // NG+ (2e run) : ACE sort la contre-lignée NÉMÉSIS + trio thématisé (tonytony/enclumind/tortoracle) au lieu du Panthéon.
    const ngplus = getActiveWorld() === "ngplus"
    // RUN 3 : ACE sort le STARTER qui CONTRE le tien (triangle) comme némésis, rétro-évolué à son niveau.
    const run3 = getActiveWorld() === "run3"
    const nemesisSpeciesId = ngplus ? (getNgplusNemesisSpeciesId() ?? undefined) : run3 ? (getRun3AceNemesis() ?? undefined) : undefined
    const built = buildAceTeam({ aceLevel: aceBattleLevel(avg), playerLastTypes: lastTypes, badgeCount: getPlayerSave().badges.length, ngplus, run3, nemesisSpeciesId })
    // Taille d'équipe d'ACE = celle du joueur (min 3 = les 3 panthères), avec cliquet.
    const aceSize = aceTeamSizeFor(team.length)
    // ACE = élite (boss ultime) : ses Daemons sont entraînés comme un joueur assidu.
    const enemyTeam = built.team.slice(0, aceSize).map((m) => createMonInstance(m.speciesId, m.level, { ...trainerBoost(m.speciesId, m.level, "elite") }))
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, {
        trainerId: ACE_TRAINER_ID, reward: 0, aiLevel: "ace",
        // Règle revue : un PNJ n'est JAMAIS à court d'énergie → aucun cap d'énergie ennemi.
        // (L'ACE utilise toujours ses meilleures attaques ; sa difficulté vient de ses stats.)
    })
    return null
}

// DRESSEUR D'ORCALINE (plaine) : aligne 2 Orcalines de même niveau (35 + 10×victoires, cap 100).
function tryLaunchOrcaline(): ActiveDialogue | null {
    const team = getPlayerSave().team
    const dlg = orcalineTrainerDialogue(effectiveRunWorld()) // run 2 = PANTHÉGEL, run 3 = ÉLEVEUR (dialogues + nom adaptés ; rejeu → run rejoué)
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: ORCALINE_TRAINER_ID, npcName: dlg.name, lineIndex: 0, lines: ["Tes Daemons sont tous K.O. !", "Soigne-les au Centre avant de m'affronter."] }
    }
    const lvl = orcalineNextLevel()
    // NG+ : le « Dompteur » aligne des PANTHÉGEL. RUN 3 : l'ÉLEVEUR aligne le 3e STARTER (celui qu'il va te confier),
    //   évolué au bon stade pour le niveau (foreshadow du cadeau). Run 1 = Orcaline.
    const sp = getActiveWorld() === "run3"
        ? speciesAtLevel(getRun3ThirdStarter() ?? "orcaline", lvl)
        : getActiveWorld() === "ngplus" ? "panthegel" : "orcaline"
    const enemyTeam = [0, 1].map(() => createMonInstance(sp, lvl, { owned: false, ...trainerBoost(sp, lvl, "guard") }))
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, { trainerId: ORCALINE_TRAINER_ID, reward: 0, aiLevel: "trainer" })
    return null
}

// GARDIEN DE LA GROTTE DU NEXUS (PNJ 5). Nb de victoires MÉMORISÉ à l'entrée de la grotte : le gardien est
// « battu cette visite » dès que pnj5WinsCount() dépasse ce repère → le blocage (18-20,33) se lève. Ré-armé
// à chaque nouvelle entrée (setMap) → on le rebat à chaque visite. Runtime-only (non persistant = re-combat au reload).
// Sentinelle -1 = « pas entré cette session » → JAMAIS cleared (échec SÛR : au pire un combat en trop, jamais un skip).
// Couvre le reload direct DANS la grotte (setMap non rappelé) : le blocage reste actif tant qu'on n'a pas ré-entré+vaincu.
let pnj5WinsAtEntry = -1
const pnj5ClearedThisVisit = (): boolean => pnj5WinsAtEntry >= 0 && pnj5WinsCount() > pnj5WinsAtEntry

// Meute de 5 Gek scalée (+2 niveaux/victoire) + IA « hof » (la plus maligne). Récurrent, sans cap journalier.
// La GATE « titre Or au Dôme » est vérifiée à l'INTERACTION (sinon renvoi hors grotte) — cf. handler pressA.
function tryLaunchPnj5(): ActiveDialogue | null {
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return { npcId: PNJ5_TRAINER_ID, npcName: "GARDIEN", lineIndex: 0, lines: PNJ5_NO_TEAM_LINES }
    }
    const enemyTeam = buildPnj5Team(pnj5WinsCount())
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, { trainerId: PNJ5_TRAINER_ID, reward: 0, aiLevel: "hof" })
    return null
}

// Spawn par défaut : VILLE JAUNE = Viridian City 45×40 (scale natif FireRed),
// entrée sud (Route 1) centre-bas pour explorer la ville.
export const DEFAULT_SPAWN = { x: 22, y: 37 } // juste AU-DESSUS du Sylvebarbe endormi qui bouche la sortie sud

export const useGameStore = create<GameStore>((set, get) => ({
    player: createInitialPlayer(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, "up"),
    map: YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID],
    dialogue: null,
    shopOpen: false,
    pcOpen: false,
    guideOpen: false,
    arenaInfoOpen: null,
    libraryOpen: false,
    advisorOpen: false,
    labOpen: false,
    combatShopOpen: false,
    domeMenuOpen: false,
    fusionMenuOpen: false,
    fusionAtelierOpen: false,
    signOpen: null,
    posterImage: null,
    poster2Step: 0,
    interiorReturn: null,
    cendrePosterGiven: false,
    hydrated: false,
    stepFrame: 0,
    pendingTrainerId: null,
    pendingRematch: false,
    pendingSbire: false,
    pendingAce: false,
    pendingNgplusAbandon: false,
    pendingOrcaline: false,
    pendingGekroc: false,
    pendingSylvebarbe: false,
    pendingPnj5: false,
    pendingHhTrade: null,
    pendingAquilordTrade: null,
    pendingCaveTrade: null,
    pendingHhCollector: false,
    encounterCooldown: 0,

    move: (dir) => {
        const { player, map, dialogue } = get()
        // Mouvement bloqué pendant un dialogue, une boutique, le PC ou un combat.
        if (dialogue || get().shopOpen || get().pcOpen || get().guideOpen || get().arenaInfoOpen !== null || get().libraryOpen || get().advisorOpen || get().labOpen || get().combatShopOpen || get().domeMenuOpen || get().fusionMenuOpen || get().fusionAtelierOpen || get().signOpen !== null) return
        if (getBattleSnapshot().battle) return

        const next = tryMove(player, dir, map)

        // Les PNJ ne sont JAMAIS traversables : si la case cible est occupée par un
        // PNJ, on tourne sur place (comme un mur). tryMove ne connaît pas les PNJ.
        if ((next.posX !== player.posX || next.posY !== player.posY)
            && findNpcAt(YELLOW_NPCS, next.posX, next.posY, player.mapId)) {
            set({ player: { ...player, direction: next.direction } })
            scheduleSave({ ...player, direction: next.direction })
            return
        }

        // SYLVEBARBE ENDORMI : bloque la sortie SUD de Ville Jaune tant qu'il dort (réveil = Daemonflûte).
        if ((next.posX !== player.posX || next.posY !== player.posY)
            && player.mapId === SYLVEBARBE_BLOCK_MAP && !getPlayerSave().sylvebarbeAwake
            && inSylvebarbeBlock(next.posX, next.posY)) {
            set({ player: { ...player, direction: next.direction } })
            scheduleSave({ ...player, direction: next.direction })
            return
        }

        // GARDIEN DE LA GROTTE (PNJ 5) — INTERCEPTION : marcher sur une CASE-PIÈGE (18,33 / 19,33) LANCE le défi
        // (gate Or → renvoi hors grotte, sinon combat contre les 5 Gek), tant qu'il n'est pas battu CETTE visite.
        if ((next.posX !== player.posX || next.posY !== player.posY)
            && player.mapId === PNJ5_MAP_ID && !pnj5ClearedThisVisit()
            && inPnj5Trigger(next.posX, next.posY)) {
            if (getPlayerSave().domeChampionships < 3) {
                const kicked = createInitialPlayer(PNJ5_KICK.mapId, PNJ5_KICK.x, PNJ5_KICK.y, "down")
                set({ map: YELLOW_MAPS[PNJ5_KICK.mapId], player: kicked, dialogue: { npcId: PNJ5_NPC_ID, npcName: "GARDIEN", lineIndex: 0, lines: PNJ5_NO_DOME_LINES } })
                saveNow(kicked) // transition de map → save immédiat (anti-désync)
                return
            }
            // Titre Or OK : on ne bouge pas sur la case-piège, on tourne face au gardien et on enchaîne le combat.
            set({ player: { ...player, direction: next.direction }, dialogue: { npcId: PNJ5_NPC_ID, npcName: "GARDIEN", lines: PNJ5_INTRO_LINES, lineIndex: 0 }, pendingPnj5: true })
            return
        }
        // GARDIEN DE LA GROTTE (PNJ 5) : le reste du barrage (20,33) bloque simplement le passage tant que non battu.
        if ((next.posX !== player.posX || next.posY !== player.posY)
            && player.mapId === PNJ5_MAP_ID && !pnj5ClearedThisVisit()
            && inPnj5Block(next.posX, next.posY)) {
            set({ player: { ...player, direction: next.direction } })
            scheduleSave({ ...player, direction: next.direction })
            return
        }

        // Le joueur vient-il d'atterrir sur une case warp ? (porte de bâtiment
        // ou doorMat de sortie). Si oui : transition de map immédiate.
        const exit = findExitAt(map, next.posX, next.posY)
        if (exit) {
            // Le GYM se réorganise selon les badges : la porte mène à l'arène courante.
            let targetMapId = exit.targetMapId === "yellow_arena"
                ? currentArenaMapId(getPlayerSave().badges)
                : exit.targetMapId
            let spawnX = exit.targetSpawnX
            let spawnY = exit.targetSpawnY
            // RETOUR DYNAMIQUE des intérieurs PARTAGÉS (shop / Centre) : on ressort dans la VILLE
            // d'où l'on vient (Ville Jaune OU Cendreville), pas systématiquement yellow_entrance.
            // interiorReturn a été posé à l'ENTRÉE (cf. plus bas). Scopé aux 2 intérieurs partagés.
            // ⚠️ UNIQUEMENT pour la PORTE de sortie (returnExit cible YELLOW_ENTRANCE_MAP_ID) : sinon
            // l'escalier intérieur du Centre (2,6 → labo) se ferait AUSSI rediriger vers la ville
            // (bug "monter à l'étage = sortir dehors", défis scientifiques inaccessibles).
            const leavingShared = map.id === "yellow_shop" || map.id === "yellow_infirmary"
            const ret = get().interiorReturn
            if (leavingShared && ret && exit.targetMapId === YELLOW_ENTRANCE_MAP_ID) {
                targetMapId = ret.mapId; spawnX = ret.x; spawnY = ret.y
            }
            // GATE GROTTE : interdite tant que le Badge Plante n'est pas gagné → le dieu
            // Spaghetti barre la route et te renvoie au Centre Daemon (comme un K.O.).
            if (targetMapId === "yellow_grotte" && !getPlayerSave().badges.includes("plante")) {
                const newPlayer = createInitialPlayer("yellow_infirmary", 4, 3, "down")
                set({
                    map: YELLOW_MAPS["yellow_infirmary"], player: newPlayer,
                    dialogue: {
                        npcId: "spaghetti_gate", npcName: "DIEU SPAGHETTI", lineIndex: 0,
                        lines: [
                            "Olà, aventurier ! Des créatures terribles rôdent dans ces cavernes…",
                            "Reviens quand tu auras prouvé ta valeur en décrochant le Badge Feuille !",
                            "*D'un claquement de doigts, te voilà ramené au Centre Daemon, sain et sauf.*",
                        ],
                    },
                })
                scheduleSave(newPlayer)
                return
            }
            // GATE LIGUE (teaser) : la Ligue (sud de Cendreville) n'ouvre qu'avec TOUS les badges.
            // Sinon le dieu Spaghetti barre la route avec un message → l'utilisateur sait qu'il y aura
            // du contenu ici (au lieu d'un simple mur). Pas de téléportation : on reste sur place.
            if (targetMapId === "yellow_ligue_glace" && player.mapId === "yellow_cendreville") {
                const badges = getPlayerSave().badges
                const allBadges = (["plante", "roche", "feu", "eau", "elec"] as const).every((b) => badges.includes(b))
                if (!allBadges) {
                    set({
                        player: next,
                        dialogue: {
                            npcId: "spaghetti_gate", npcName: "DIEU SPAGHETTI", lineIndex: 0,
                            lines: [
                                "HOLÀ ! Pas si vite, jeune Dresseur — ce n'est pas le moment d'aller là-bas.",
                                "La Ligue n'ouvre ses portes qu'aux champions accomplis. Reviens quand tu auras décroché TOUS les badges !",
                                "*Le dieu Spaghetti s'efface dans un tourbillon de semoule.*",
                            ],
                        },
                    })
                    scheduleSave(next)
                    return
                }
                // Tous les badges réunis → ENTRÉE FRAÎCHE : on rejoue le gauntlet DEPUIS LE DÉBUT.
                // On rescelle toutes les portes même si on l'avait déjà battue (« si on recommence,
                // on recommence au début ») et même après une tentative K.O. (entrée par Cendreville).
                resetLigueProgress()
            }
            // ENTRÉE LIGUE DE FUSION (depuis l'Autel) : roster de fusions REQUIS, puis rescelle le gauntlet
            //   (l'échelle de paliers `fusleague_*` est préservée) + repart sur un registre d'espèces propre.
            if (targetMapId === "yellow_fusion_glace" && player.mapId === "yellow_combat_autel") {
                // GATE d'OUVERTURE : la porte à dragons reste SCELLÉE (sprite fermé) tant que le joueur n'a pas
                //   remporté une épreuve de fusion à l'autel (FUSION_UNLOCK_MARKER). C'est le « quand » de la Ligue.
                if (!isTrainerDefeated(FUSION_UNLOCK_MARKER)) {
                    set({ player: next, dialogue: { npcId: "y_fusion_gate", npcName: "PORTE DE LA CHIMÈRE", lineIndex: 0, lines: ["*La porte à dragons est scellée par une lueur mauve.*", "« Prouve d'abord ta maîtrise de la fusion : remporte une épreuve à l'autel central. Alors la Ligue s'ouvrira à toi. »"] } })
                    scheduleSave(next)
                    return
                }
                if (getPlayerSave().fusionRoster.length === 0) {
                    set({ player: next, dialogue: { npcId: "y_fusion_gate", npcName: "AUTEL DE LA CHIMÈRE", lineIndex: 0, lines: ["La Ligue de Fusion exige une équipe de chimères. Assemble-la au 💻 de l'Autel, puis reviens !"] } })
                    scheduleSave(next)
                    return
                }
                resetFusionLeagueProgress()
                disposeFusionLeagueSpecies()
            }
            // GATE GAUNTLET LIGUE : la porte DROITE d'une salle ne s'ouvre qu'une fois SON adversaire vaincu
            // (point de non-retour : pas de retour par la gauche, aucune infirmerie — potions seulement).
            const roomTrainer = LIGUE_ROOM_TRAINER[player.mapId]
            if (roomTrainer && !isTrainerDefeated(roomTrainer)) {
                const tName = getTrainer(roomTrainer)?.name ?? "l'adversaire"
                set({
                    player: next,
                    dialogue: { npcId: roomTrainer, npcName: "LIGUE", lineIndex: 0, lines: [`La porte est scellée. Tu dois d'abord vaincre ${tName} pour avancer !`] },
                })
                scheduleSave(next)
                return
            }
            // GATE GAUNTLET LIGUE DE FUSION : la porte de PROGRESSION (→ salle fusion suivante) est scellée tant
            //   que la chimère de la salle n'est pas vaincue. La RETRAITE (→ Autel) reste TOUJOURS ouverte.
            const fusionRoomTrainer = FUSION_ROOM_TRAINER[player.mapId]
            if (fusionRoomTrainer && targetMapId.startsWith("yellow_fusion_") && !isTrainerDefeated(fusionRoomTrainer)) {
                const tName = getTrainer(fusionRoomTrainer)?.name ?? "la chimère"
                set({
                    player: next,
                    dialogue: { npcId: fusionRoomTrainer, npcName: "LIGUE DE FUSION", lineIndex: 0, lines: [`La porte est scellée. Vaincs d'abord ${tName} pour avancer !`] },
                })
                scheduleSave(next)
                return
            }
            // RUN 2 — SALLE DORÉE : LE MAÎTRE vaincu, la porte droite du TRÔNE mène à la salle ULTIME (ton DOUBLE),
            //   pas à Cendreville. Le Dieu Spaghetti annonce le « match surprise » à l'arrivée (goldenAnnounce).
            let goldenAnnounce = false
            if (player.mapId === "yellow_ligue_rival" && getActiveWorld() === "ngplus" && getPlayerSave().ngplusMaitreBeaten) {
                targetMapId = "yellow_ligue_final"; spawnX = 3; spawnY = 6; goldenAnnounce = true
            }
            // SALLE DORÉE — porte droite SCELLÉE tant que TON DOUBLE n'est pas vaincu (= sacre / isChampion).
            if (player.mapId === "yellow_ligue_final" && !getPlayerSave().isChampion) {
                set({ player: next, dialogue: { npcId: "y_ligue_double", npcName: "LIGUE", lineIndex: 0, lines: ["La salle est scellée. Tu dois d'abord vaincre ton ANCIEN TOI !"] } })
                scheduleSave(next)
                return
            }
            // GATE HAUTES HERBES : la plaine d'entraînement n'ouvre qu'une fois l'arène ÉLECTRIQUE battue
            // (Daemons costauds, paliers jusqu'à 50). Sinon, message + on reste sur place.
            if (targetMapId === "yellow_hautes_herbes" && !getPlayerSave().badges.includes("elec")) {
                set({
                    player: next,
                    dialogue: {
                        npcId: "spaghetti_gate", npcName: "DIEU SPAGHETTI", lineIndex: 0,
                        lines: [
                            "HOLÀ ! Ces hautes herbes grouillent de Daemons surpuissants…",
                            "Reviens quand tu auras dompté la foudre — décroche d'abord le Badge Éclair !",
                            "*Le dieu Spaghetti te repousse gentiment dans une volute de semoule.*",
                        ],
                    },
                })
                scheduleSave(next)
                return
            }
            // GATE ARÈNE EAU : le Sanctuaire des Marées (Cendreville) n'ouvre qu'une fois l'arène
            // ÉLECTRIQUE vaincue (Badge Éclair). Sinon, message à la porte + on reste sur place.
            if (targetMapId === "yellow_arena_eau" && !getPlayerSave().badges.includes("elec")) {
                set({
                    player: next,
                    dialogue: {
                        npcId: "spaghetti_gate", npcName: "SANCTUAIRE DES MARÉES", lineIndex: 0,
                        lines: [
                            "*La porte du Sanctuaire est scellée par un sceau crépitant d'électricité.*",
                            "« Le Sanctuaire des Marées ne s'ouvre qu'à ceux qui ont d'abord dompté la foudre. »",
                            "Reviens une fois l'arène ÉLECTRIQUE vaincue (Badge Éclair) !",
                        ],
                    },
                })
                scheduleSave(next)
                return
            }
            // GARDIEN DE LA GROTTE (PNJ 5) — DESCENTE SCELLÉE : la 1re descente (1F → B1F par une échelle) est
            // bloquée tant que le gardien n'a pas été vaincu CETTE visite. Verrou ROBUSTE : même si le joueur
            // contourne physiquement le gardien (collision WIP), il ne peut pas atteindre le casse-tête sans combattre.
            if (player.mapId === PNJ5_MAP_ID && targetMapId === "yellow_grotte_nexus_b1f" && !pnj5ClearedThisVisit()) {
                set({ player: next, dialogue: { npcId: PNJ5_NPC_ID, npcName: "GARDIEN", lineIndex: 0, lines: PNJ5_SEAL_LINES } })
                scheduleSave(next)
                return
            }
            const newMap = YELLOW_MAPS[targetMapId]
            if (newMap) {
                // Override de spawn : l'arène Feu (16×16) a son entrée en bas (8,14),
                // pas au spawn générique du gym (7,8) calé sur les arènes 15×10.
                if (targetMapId === "yellow_arena_feu") { spawnX = 8; spawnY = 14 }
                const newPlayer = createInitialPlayer(targetMapId, spawnX, spawnY, next.direction)
                // GARANTIE Centrale Psy (run 3) : une ENTRÉE (transition) dans la Centrale = un NOUVEAU passage →
                // on ré-arme ICI (pas via un pas dans la ville) pour couvrir l'aller-retour immédiat par la porte.
                if (getActiveWorld() === "run3" && targetMapId === "yellow_centrale") run3CentralePity = { count: 0, hSeen: false, kSeen: false }
                // Mémorise l'origine en ENTRANT dans un intérieur partagé (→ retour dynamique +
                // posters de Cendreville) ; on l'efface en SORTANT d'un partagé.
                const enteringShared = targetMapId === "yellow_shop" || targetMapId === "yellow_infirmary"
                const fromOverworld = map.id === YELLOW_ENTRANCE_MAP_ID || map.id === "yellow_cendreville"
                // L'escalier INTERNE du Centre (infirmary ↔ 2e étage labo) ne quitte PAS le complexe →
                // on PRÉSERVE interiorReturn. Sinon, monter à l'étage efface la ville de retour → bug
                // "sortir du Centre de Cendreville renvoie à Ville Jaune".
                const stairInfirmary = (map.id === "yellow_infirmary" && targetMapId === "yellow_infirmary_2e")
                    || (map.id === "yellow_infirmary_2e" && targetMapId === "yellow_infirmary")
                const interiorReturn = enteringShared && fromOverworld
                    ? { mapId: map.id, x: player.posX, y: player.posY }
                    : (stairInfirmary ? ret : (leavingShared ? null : ret))
                set({
                    map: newMap, player: newPlayer, interiorReturn,
                    // SALLE DORÉE : le Dieu Spaghetti annonce le « match surprise » (pas de soin) à l'entrée.
                    dialogue: goldenAnnounce ? {
                        npcId: "spaghetti_gate", npcName: "DIEU SPAGHETTI", lineIndex: 0,
                        lines: [
                            "*À peine la porte franchie, une odeur de basilic incandescent envahit la salle dorée…*",
                            "« STOP ! Tu croyais en avoir fini avec le Maître ? Le VRAI dernier test t'attend ICI. »",
                            "« J'ai rappelé des limbes ton ANCIENNE équipe — celle de ton tout premier run. Elle est fraîche, reposée. Toi, tu sors du combat contre le Maître : à bout de souffle. »",
                            "« Pas de soin, pas de répit. Ton REFLET t'attend au fond de la salle. Affronte ton passé DANS L'ÉTAT où tu es — et prouve qui tu es DEVENU ! »",
                        ],
                    } : null,
                })
                scheduleSave(newPlayer)
                return
            }
        }

        // Pas de transition : move standard
        const moved = next.posX !== player.posX || next.posY !== player.posY
        const dirChanged = next.direction !== player.direction
        if (moved) {
            // Animation : alterne stepFrame uniquement quand on bouge réellement
            set({ player: next, stepFrame: (get().stepFrame === 0 ? 1 : 0) })
            bumpStat("steps") // STAT : un pas de déplacement effectif
        } else if (dirChanged) {
            set({ player: next }) // simple rotation face au mur, pas d'anim
        }
        if (moved || dirChanged) scheduleSave(next)

        // Rencontre sauvage : marcher sur des hautes herbes (zone à rencontres).
        // Le biome (proximité eau/montagne/sapins), le niveau du lead et les stats
        // d'effort du jour (pompes/squats/quota, fetchées au chargement) modulent le tirage.
        // Rencontre : hautes herbes (overworld) OU sol d'une GROTTE (map à fond image
        // AVEC une zone de rencontres → tout le sol praticable déclenche, façon donjon).
        const onWildTile = map.tiles[next.posY]?.[next.posX]
        const isWildTile = onWildTile === "grassTall"
            || ((onWildTile === "grass" || onWildTile === "caveFloor") && !!map.backgroundImage && hasEncounters(map.id))
        // #7 : juste après un combat, on garantit au moins UNE case sans rencontre (anti-rafale).
        if (moved && get().encounterCooldown > 0) {
            set({ encounterCooldown: get().encounterCooldown - 1 })
        } else if (moved && isWildTile && !map.encountersPaused) {
            const team = getPlayerSave().team
            const lead = team.find((m) => m.currentHp > 0)
            if (lead) {
                const badges = getPlayerSave().badges
                // Niveau du pop (3 bandes) : dès le badge ROCHE, basé sur la MOYENNE de
                // l'équipe ; avant, basé sur le 1er Daemon (lead).
                const levelBasis = badges.includes("roche")
                    ? Math.round(team.reduce((s, m) => s + m.level, 0) / Math.max(1, team.length))
                    : lead.level
                // RAMPE D'ACCUEIL : les 5 premiers sauvages croisés = -2 niveaux, les 5 suivants
                // = -1, pour laisser le temps de progresser. Compteur persistant (par appareil).
                const ENC_KEY = "yellow_wild_enc"
                const encCount = typeof window !== "undefined" ? (parseInt(window.localStorage.getItem(ENC_KEY) || "0", 10) || 0) : 999
                // NG+ : DÉMARRAGE MOTIVANT — les 2 premiers sauvages sont TRÈS faibles (starter niv 5 → victoire
                // quasi certaine), indépendamment de la rampe device-level (qui peut être épuisée). Après → normal.
                const ngEasyWild = getActiveWorld() === "ngplus" && getPlayerSave().ngplusBattles < 2
                const wild = rollWildEncounter({
                    mapId: next.mapId, x: next.posX, y: next.posY, leadLevel: ngEasyWild ? 3 : levelBasis,
                    weakestTeamLevel: Math.min(...team.map((m) => m.level)), // pour Namicha (Centrale / maison hantée)
                    strongestTeamLevel: Math.max(...team.map((m) => m.level)), // pour Vipember (+5, maison hantée)
                    player: ngEasyWild ? undefined : (getPlayerSave().wildCtx ?? undefined), // pas de modulation d'effort sur le démarrage garanti
                    levelCap: ngEasyWild ? 4 : wildLevelCap(badges), // NG+ : plafond niv 4 sur les 2 premiers → victoire assurée
                    encounterCount: ngEasyWild ? 0 : encCount, // force la rampe la + douce (-2 niv) au démarrage NG+
                    dayKey: new Date().toISOString().slice(0, 10), // rotation quotidienne des types (hautes herbes)
                    // GAMIN : ×2 le légendaire de la plaine dans SA fenêtre — RUN 1 Goshendofy la NUIT (21h+),
                    // RUN 2 (NG+) Ukognos à l'AUBE (5h-11h). Gate : confidence entendue (goshHintHeard, par monde).
                    goshBoost: (effectiveRunWorld() === "ngplus" ? isHhKidDawn(new Date().getHours()) : isHhKidNight(new Date().getHours())) && getPlayerSave().goshHintHeard,
                    goshCaught: getPokedex().caught.includes("goshendofy"), // déjà capturé → ne réapparaît plus jamais
                    caughtSpecies: getPokedex().caught, // gate les entrées catchOnce (ex. Pyropanthe : 1 seule capture)
                    // REJEU : effectiveRunWorld() → un rejeu run 2/3 rencontre bien les espèces EXCLUSIVES du run rejoué (but = compléter le Pokédex).
                    ngplus: effectiveRunWorld() === "ngplus", // NG+ : bascule sur les pools RUN 2 (Route Nord / Grotte re-mixées)
                    run3: effectiveRunWorld() === "run3",      // RUN 3 : pools RUN3_ZONES (espèces inédites Route Nord / Grotte)
                    champion: getPlayerSave().isChampion,   // LIVE post-Ligue → rattrapage des inédits run 3 (champ + Grotte)
                    run3Used: getPlayerSave().run3Used,     // run 3 déjà fait → rattrapage RARE (sinon ULTRA-RARE : teaser)
                })
                if (wild) {
                    // MIMIMOY roaming (post-quête du brocanteur) : peut REMPLACER cette rencontre. Rôde dans le monde
                    //   où l'échange l'a armé — l'échange est proposé en LIVE et en RUN 3, donc le pop suit les deux
                    //   (pas le run 2). Chance décroissante par apparition (25→20→15→10→5 %, plancher 5 %), MAX 10
                    //   apparitions ; une capture stoppe le roaming (goshCaught-like). Compte comme UNE apparition.
                    let spawn = wild
                    const p = getPlayerSave()
                    const mimimoyWorld = effectiveRunWorld() === "live" || effectiveRunWorld() === "run3"
                    // Ne JAMAIS écraser un shiny ni un légendaire/surprise (hiddenUntilCaught : Goshendofy…) par Mimimoy.
                    const precious = wild.shiny || !!getSpecies(wild.speciesId)?.hiddenUntilCaught
                    if (!precious && mimimoyWorld && p.mimimoyReturned && p.mimimoyAppearances < 10 && !getPokedex().caught.includes("mimimoy")) {
                        const chance = [0.25, 0.20, 0.15, 0.10, 0.05][Math.min(p.mimimoyAppearances, 4)]
                        if (Math.random() < chance) {
                            spawn = createMonInstance("mimimoy", Math.max(5, ngEasyWild ? 3 : levelBasis), { owned: false })
                            bumpMimimoyAppearances()
                            persistYellowSave()
                        }
                    }
                    // GARANTIE Centrale Psy (run 3) : compte les rencontres du passage, marque les exclusivités VUES,
                    // et FORCE une non-capturée/non-vue dès la 9e/10e rencontre (Hypnoppo puis Karmaki). Vu ⇒ stop.
                    if (effectiveRunWorld() === "run3" && next.mapId === "yellow_centrale") {
                        run3CentralePity.count++
                        if (spawn.speciesId === "hypnoppo") run3CentralePity.hSeen = true
                        if (spawn.speciesId === "karmaki") run3CentralePity.kSeen = true
                        const dex = getPokedex().caught
                        // Garde sur le spawn COURANT (pas le wild d'origine) : si le bloc Mimimoy vient de remplacer la
                        // rencontre, spawn est un Mimimoy (hiddenUntilCaught) → le forçage ne DOIT PAS l'écraser (sinon
                        // une apparition Mimimoy déjà consommée serait perdue). count++/hSeen/kSeen déjà faits → la
                        // garantie n'est que RETARDÉE d'une rencontre (le prochain non-précieux ≥9/10 force l'exclusivité).
                        const spawnPrecious = spawn.shiny || !!getSpecies(spawn.speciesId)?.hiddenUntilCaught
                        if (!dex.includes("hypnoppo") && !run3CentralePity.hSeen && !spawnPrecious && run3CentralePity.count >= 9) {
                            spawn = createMonInstance("hypnoppo", 9 + Math.floor(Math.random() * 7), { owned: false }); run3CentralePity.hSeen = true
                        } else if (!dex.includes("karmaki") && !run3CentralePity.kSeen && !spawnPrecious && run3CentralePity.count >= 10) {
                            spawn = createMonInstance("karmaki", 38 + Math.floor(Math.random() * 13), { owned: false }); run3CentralePity.kSeen = true
                        }
                    }
                    // GROTTE DU NEXUS 1F — POP DES FUSIONS : si une fusion est AMORCÉE (les 2 rencontres précédentes
                    //   étaient sa paire de parents exacte) → elle SE PRODUIT ici (GARANTIE, niv 2-18). Sinon on met à
                    //   jour l'historique + on amorce si les 2 dernières forment une paire. On respecte les rencontres
                    //   PRÉCIEUSES (shiny / Mimimoy) : on ne les écrase pas et elles n'entrent pas dans l'historique.
                    if (next.mapId === "yellow_grotte_nexus") {
                        const spawnPrecious = spawn.shiny || !!getSpecies(spawn.speciesId)?.hiddenUntilCaught
                        if (grotteFusionPop.primed && !spawnPrecious) {
                            spawn = createMonInstance(grotteFusionPop.primed, 2 + Math.floor(Math.random() * 17), { owned: false })
                            grotteFusionPop = { prev1: "", prev2: "", primed: "" } // consommé (le fusionné n'entre pas dans l'historique)
                        } else if (!grotteFusionPop.primed && !spawnPrecious) {
                            grotteFusionPop = { prev1: spawn.speciesId, prev2: grotteFusionPop.prev1, primed: "" }
                            const fus = fusionForParents(grotteFusionPop.prev1, grotteFusionPop.prev2)
                            if (fus) grotteFusionPop.primed = fus
                        }
                    }
                    if (typeof window !== "undefined" && encCount < 10) window.localStorage.setItem(ENC_KEY, String(encCount + 1))
                    const seed = Math.floor(Math.random() * 1e9) >>> 0
                    set({ encounterCooldown: 1 }) // #7 : la 1re case après ce combat sera sans rencontre
                    startWildBattle(team, [spawn], seed)
                    // ✨ FÊTE SHINY : croiser un shiny offre +50 énergie à TOUS les joueurs (annonce Dieu Spaghetti).
                    if (spawn.shiny) reportShiny("encounter", spawn.uid, spawn.speciesId)
                }
            }
        }

        // ACE (rival + gardien) : sa bande de déclenchement borde le passage OUEST vers
        // CENDREVILLE. Avec le Badge Flamme il s'écarte (→ Cendreville) ; sinon il barre
        // la route (et te défie une fois par jour).
        if (moved && next.mapId === YELLOW_ENTRANCE_MAP_ID
            && ACE_TRIGGER_TILES.some((t) => t.x === next.posX && t.y === next.posY)) {
            if (getPlayerSave().badges.includes("feu") || aceBypassByNickname()) {
                // Badge Flamme (ou pseudo whitelisté) → ACE laisse passer vers CENDREVILLE.
                const cp = createInitialPlayer("yellow_cendreville", CENDREVILLE_SPAWN.x, CENDREVILLE_SPAWN.y, "left")
                set({
                    map: YELLOW_MAPS["yellow_cendreville"], player: cp,
                    dialogue: { npcId: ACE_TRAINER_ID, npcName: "ACE", lines: ACE_PASS_LINES, lineIndex: 0 },
                })
                scheduleSave(cp)
                return
            }
            // Pas de Badge Flamme : ACE barre la route. Combat quotidien s'il est dispo,
            // sinon simple rappel du gate (« reviens avec le badge »).
            // CADEAU : le PANTHÉON est offert à la 7e victoire (cf. aceReward) → teaser/compte à rebours.
            // Intro PIOCHÉE AU HASARD (différente à chaque rencontre) + ligne cadeau.
            set({
                dialogue: {
                    npcId: ACE_TRAINER_ID, npcName: "ACE", lineIndex: 0,
                    lines: aceAvailableToday() ? [...aceIntro(), aceGiftLine(getPlayerSave().aceWins)] : ACE_GATE_LINES,
                },
                pendingAce: aceAvailableToday(),
            })
        }
    },

    pressA: () => {
        const { player, dialogue, map } = get()

        // Pendant un combat : l'UI de combat gère les entrées, on ignore ici.
        if (getBattleSnapshot().battle) return

        // Si un dialogue est ouvert : avancer à la ligne suivante (ou fermer si dernière).
        if (dialogue) {
            const nextIndex = dialogue.lineIndex + 1
            if (nextIndex >= dialogue.lines.length) {
                // Fin d'un dialogue : si c'était l'intro d'un dresseur, on lance le combat.
                const pid = get().pendingTrainerId
                if (pid) {
                    set({ dialogue: tryLaunchTrainer(pid, get().pendingRematch), pendingTrainerId: null, pendingRematch: false })
                } else if (get().pendingSbire) {
                    set({ dialogue: tryLaunchSbire(), pendingSbire: false })
                } else if (get().pendingAce) {
                    set({ dialogue: tryLaunchAce(), pendingAce: false })
                } else if (get().pendingOrcaline) {
                    set({ dialogue: tryLaunchOrcaline(), pendingOrcaline: false })
                } else if (get().pendingGekroc) {
                    set({ dialogue: tryLaunchGekroc(), pendingGekroc: false })
                } else if (get().pendingSylvebarbe) {
                    set({ dialogue: tryLaunchSylvebarbe(), pendingSylvebarbe: false })
                } else if (get().pendingPnj5) {
                    set({ dialogue: tryLaunchPnj5(), pendingPnj5: false })
                } else if (get().pendingHhTrade) {
                    set({ dialogue: doHhTrade(get().pendingHhTrade!), pendingHhTrade: null })
                } else if (get().pendingAquilordTrade) {
                    set({ dialogue: doAquilordTrade(get().pendingAquilordTrade!), pendingAquilordTrade: null })
                } else if (get().pendingCaveTrade) {
                    set({ dialogue: doCaveTrade(get().pendingCaveTrade!), pendingCaveTrade: null })
                } else if (get().pendingHhCollector) {
                    set({ dialogue: tryLaunchHhCollector(), pendingHhCollector: false })
                } else {
                    set({ dialogue: null })
                }
            } else {
                set({ dialogue: { ...dialogue, lineIndex: nextIndex } })
            }
            return
        }

        // Sinon : chercher un NPC devant le joueur et déclencher son dialogue.
        let npc = getNpcInFrontOfPlayer(player, YELLOW_NPCS)
        // Parler PAR-DESSUS un comptoir : si la case devant est un comptoir et
        // qu'un PNJ se tient juste derrière (2 cases devant), on l'interpelle.
        if (!npc) {
            const front = getFacingTile(player)
            if (map.tiles[front.y]?.[front.x] === "shopCounter") {
                const beyond = getTileInFront(player, 2)
                npc = findNpcAt(YELLOW_NPCS, beyond.x, beyond.y, player.mapId)
            }
        }

        // 🍒 ARBRE FERTILE (post-Ligue) : face à un arbre portant une baie AUJOURD'HUI → A la récolte (→ sac).
        //    Gate : secret des baies connu (Druide run 2 / assistant CHEN). Cartes : Route Nord & Ville Jaune.
        if (isBerrySecretKnown() && BERRY_MAP_IDS.includes(player.mapId)) {
            const front = getFacingTile(player)
            // Jour recalculé ici (même clé que l'affichage MapView). À la bascule EXACTE de minuit UTC, un A peut
            // viser la tuile du jour suivant → au pire un no-op (l'icône se corrige au rendu suivant) ou la
            // récolte d'une VRAIE baie du nouveau jour : jamais de doublon ni de corruption.
            const day = new Date().toISOString().slice(0, 10)
            const berryId = berryAtTile(player.mapId, front.x, front.y, day)
            if (berryId && harvestBerryTree(player.mapId, front.x, front.y, day, berryId)) {
                const it = getHeldItem(berryId)
                persistYellowSave()
                set({ dialogue: { npcId: "berry_tree", npcName: "🌳 Arbre fertile", lineIndex: 0, lines: [
                    `Tu écartes le feuillage… ${it?.emoji ?? "🍒"} une ${it?.name ?? "baie"} bien mûre atterrit dans ton sac !`,
                    `${it?.description ?? "Elle se déclenche seule au combat."} Fais-la tenir à un Daemon (fiche → objet tenu).`,
                ] } })
                return
            }
        }

        if (!npc) return

        // Ordinateur du Centre : ouvre la boîte PC (rangement des Daemons).
        if (npc.id === "y_pc_box") {
            set({ pcOpen: true })
            return
        }
        // MAÎTRE DU DÔME (mage central) : ouvre le carrousel (S'inscrire / Règles / Stats).
        if (npc.id === "y_dome_maitre") {
            set({ domeMenuOpen: true })
            return
        }
        // AUTEL DE LA CHIMÈRE : ouvre le flux de fusion (choisir 2 Daemons → aperçu → combat-épreuve).
        if (npc.id === "y_autel_chimere") {
            set({ fusionMenuOpen: true })
            return
        }
        // ORDINATEUR DE FUSION (les 4 hotspots PC gauche+droite) : ouvre l'atelier (équipe de 6 fusions + boîte/équipe).
        if (npc.id.startsWith("y_autel_pc")) {
            set({ fusionAtelierOpen: true })
            return
        }

        // Médecin du Centre Daemon : soigne toute l'équipe.
        if (npc.id === "y_medecin") {
            healAllTeam()
            resetFleeStreak() // #2 : se soigner remet la fuite à 100% (nouvelle boucle d'explo)
            persistYellowSave()
            set({
                dialogue: {
                    npcId: npc.id,
                    npcName: npc.name,
                    lines: [
                        "Bienvenue au Centre Daemon ! Confie-moi ton équipe, je m'en occupe…",
                        "🩹 *L'infirmière place tes Daemons dans le soigneur. Quelques secondes plus tard, ils en ressortent pétillants de santé.*",
                        "✨ Et voilà ! Toute ton équipe est soignée à bloc, PV et statuts au max. Reviens quand tu veux !",
                    ],
                    lineIndex: 0,
                },
            })
            return
        }

        // Vendeur : ouvre la boutique.
        if (npc.id === "y_vendeur") {
            set({ shopOpen: true })
            return
        }

        // Panneau devant une arène : ouvre le CARROUSEL d'infos stratégiques (auto-calculé, run 1 & 2).
        // Gym de Ville Jaune = l'arène courante (prochaine non vaincue) ; Cendreville = l'arène Eau.
        if (npc.id === "y_gym_sign") {
            set({ arenaInfoOpen: currentGymBadge(getPlayerSave().badges) })
            return
        }
        if (npc.id === "y_eau_arena_sign") {
            set({ arenaInfoOpen: "eau" })
            return
        }

        // Bibliothèque de l'infirmerie : ouvre le REGISTRE DES DRESSEURS.
        if (npc.id === "y_biblio") {
            set({ libraryOpen: true })
            return
        }

        // Conseiller (à côté du Centre) : ouvre le panneau pour poser une question (→ base).
        if (npc.id === "y_conseiller") {
            set({ advisorOpen: true })
            return
        }

        // Terminal du labo : ouvre le menu d'EXPÉRIENCES (défis).
        if (npc.id === "y_lab_computer") {
            set({ labOpen: true })
            return
        }

        // Prof. CHEN (chef du labo) : au sacre, remet la DAEMONFLÛTE (1×, son œuvre de mélomane) ; sinon
        // explique le terminal de défis + ses enjeux et t'invite à revenir après la Ligue. Le TERMINAL (3,3)
        // reste la machine qui ouvre les défis ; CHEN, lui, te guide.
        if (npc.id === "y_lab_scientist") {
            // NG+ : dans la fenêtre d'abandon (≤15 combats), CHEN propose de rendre le starter → confirmation côté UI.
            if (getActiveWorld() === "ngplus" && canAbandonNgplus()) {
                set({ dialogue: { npcId: npc.id, npcName: "Prof. CHEN", lineIndex: 0, lines: CHEN_ABANDON_OFFER_LINES }, pendingNgplusAbandon: true })
                return
            }
            const save = getPlayerSave()
            // RUN 3 (concours) : le Prof. CHEN ne sert QU'À Magnetor (casino/flûte/défis hors-sujet). S'il voit un
            //   MAGMATOR niv 50+ dans l'équipe/PC, il l'évolue en MAGNETOR (fournit le Noyau) ; sinon il teaser.
            if (getActiveWorld() === "run3") {
                const mag = [...save.team, ...save.pc].find((m) => m.speciesId === "magmator" && m.level >= 50)
                if (mag) {
                    addItem(MAGNETOR_EVO_ITEM, 1)     // CHEN fournit le Noyau de Métal
                    evolveMagmatorWithChen(mag.uid)   // Magmator → Magnetor (consomme le Noyau, entre au Pokédex)
                    persistYellowSave()
                    set({ dialogue: { npcId: npc.id, npcName: "Prof. CHEN", lineIndex: 0, lines: CHEN_RUN3_EVOLVE_LINES } })
                } else {
                    set({ dialogue: { npcId: npc.id, npcName: "Prof. CHEN", lineIndex: 0, lines: CHEN_RUN3_TEASER_LINES } })
                }
                return
            }
            if (save.isChampion && (save.items["daemonflute"] ?? 0) <= 0 && !save.sylvebarbeAwake) {
                addItem("daemonflute", 1)
                set({ dialogue: { npcId: npc.id, npcName: "Prof. CHEN", lineIndex: 0, lines: FLUTE_GIVE_LINES } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: "Prof. CHEN", lineIndex: 0, lines: CHEN_LAB_LINES } })
            return
        }

        // Assistant du labo (apprenti du Prof. CHEN) : aiguille vers les récompenses (CT du terminal, CT
        // UNIQUE du blackjack, œuf-soigneur Tonytony) et révèle le grand projet du chef.
        if (npc.id === "y_lab_assistant") {
            // 🍒 Post-Ligue, si le secret des baies n'est pas connu, l'assistant le RÉVÈLE (fallback hors run 2,
            //    où c'est le Druide, boss arène 1, qui s'en charge) — puis il débloque la récolte.
            if (getPlayerSave().isChampion && !isBerrySecretKnown()) {
                setBerrySecretKnown()
                persistYellowSave()
                set({ dialogue: { npcId: npc.id, npcName: "ASSISTANT", lineIndex: 0, lines: BERRY_SECRET_LINES_ASSISTANT } })
                return
            }
            const assistantLines = getActiveWorld() === "run3" ? LAB_ASSISTANT_LINES_RUN3
                : getActiveWorld() === "ngplus" ? LAB_ASSISTANT_LINES_NGPLUS : LAB_ASSISTANT_LINES
            set({ dialogue: { npcId: npc.id, npcName: "ASSISTANT", lineIndex: 0, lines: assistantLines } })
            return
        }

        // Marchand de Jetons de Combat (hub Zone de Combat) : ouvre la boutique JC.
        if (npc.id === "y_combat_merchant") {
            set({ combatShopOpen: true })
            return
        }

        // Panneau du parc (Route Nord) : chaque panneau ouvre SON pop-up dédié.
        // id = "y_park_sign_<n>" (1-based) → index de sujet 0-based.
        const signMatch = npc.id.match(/^y_park_sign_(\d+)$/)
        if (signMatch) {
            set({ signOpen: parseInt(signMatch[1], 10) - 1 })
            return
        }

        // Posters muraux du Centre Daemon. Contenu DIFFÉRENT selon la ville d'origine :
        // à CENDREVILLE → posters « cendre » + gag voyeur/énergie ; sinon → DIEU DES PÂTES.
        const fromCendre = get().interiorReturn?.mapId === "yellow_cendreville"
        if (npc.id === "y_pasta_poster_1") {
            set({ posterImage: fromCendre ? "/yellow/sprites/poster_cendre1.jpg" : "/yellow/sprites/poster1.jpg" })
            return
        }
        if (npc.id === "y_pasta_poster_2" && fromCendre) {
            // CENDREVILLE — cycle 2 phases : on regarde le poster, puis on se fait traiter de
            // voyeur/gros cochon + don d'énergie (1×/session via cendrePosterGiven, anti-spam).
            const phase = get().poster2Step % 2
            const step = get().poster2Step + 1
            if (phase === 0) { set({ posterImage: "/yellow/sprites/poster_cendre2.jpg", poster2Step: step }); return }
            const give = !get().cendrePosterGiven
            const added = give ? grantReps(80) : 0
            if (give) persistYellowSave()
            set({
                posterImage: null, poster2Step: step, cendrePosterGiven: true,
                dialogue: {
                    npcId: "y_cendre_voyeur", npcName: "???", lineIndex: 0,
                    lines: give
                        ? [
                            "*Une voix sèche claque derrière toi.*",
                            "Eh, le VOYEUR ! On se rince l'œil sur les posters, gros cochon ? 👀",
                            `Tiens, +${added} d'énergie pour la honte… et maintenant DÉGAGE te défouler ! 💪`,
                        ]
                        : [
                            "Encore là à reluquer les murs, gros cochon ? 👀",
                            "L'énergie, c'était UNE fois. Ouste !",
                        ],
                },
            })
            return
        }
        if (npc.id === "y_pasta_poster_2") {
            // Cycle EN BOUCLE (toujours accessible) : poster2 → poster3 → DIEU DES PÂTES → poster2 → …
            const phase = get().poster2Step % 3
            const next = get().poster2Step + 1
            if (phase === 0) { set({ posterImage: "/yellow/sprites/poster2.jpg", poster2Step: next }); return }
            if (phase === 1) { set({ posterImage: "/yellow/sprites/poster3.jpg", poster2Step: next }); return }
            // phase 2 : le DIEU DES PÂTES surgit. +100 énergie UNE seule fois (ensuite : il le dit, rien de plus).
            const granted = claimPastaGodGift()
            if (granted) persistYellowSave()
            set({
                posterImage: null,
                poster2Step: next,
                dialogue: {
                    npcId: "y_dieu_pates", npcName: "DIEU DES PÂTES", lineIndex: 0,
                    lines: granted
                        ? [
                            "🍝 *Le mur se fend — le DIEU DES PÂTES en jaillit, fumant.*",
                            "TOI. T'es BOUILLANT, gamin. Y'a bien trop d'énergie qui déborde de ta carcasse !",
                            "Tiens, +100 d'énergie offerte. Et arrête de mater des posters : VA TE DÉFOULER ! 💪🔥",
                        ]
                        : [
                            "🍝 Encore là, à reluquer les murs ?",
                            "Le boost d'énergie, c'était UNE fois, gamin — t'en auras plus. 🤌",
                            "Mais admire les posters tant que tu veux… puis VA TE DÉFOULER ! 💪",
                        ],
                },
            })
            return
        }

        // Sbire du dieu Spaghetti : combat dynamique, 2×/jour max.
        if (npc.id === SBIRE_TRAINER_ID) {
            const wins = getPlayerSave().sbireDefeatsToday
            if (wins >= SBIRE_MAX_FIGHTS_PER_DAY) {
                set({
                    dialogue: {
                        npcId: npc.id, npcName: npc.name, lineIndex: 0,
                        lines: SBIRE_DONE_LINES,
                    },
                })
                return
            }
            const intro = sbireIntroLines(wins) // 0 → miroir, 1 → faiblesse
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: intro, lineIndex: 0 }, pendingSbire: true })
            return
        }

        // ACE (rival) : combat quotidien, équipe évolutive par joueur, IA "ace".
        if (npc.id === ACE_TRAINER_ID) {
            if (!aceAvailableToday()) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: ACE_DONE_LINES, lineIndex: 0 } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: [...aceIntro(), aceGiftLine(getPlayerSave().aceWins)], lineIndex: 0 }, pendingAce: true })
            return
        }

        // GÉKROC (mini-boss STATIQUE de la Centrale) : combat UNIQUE. Une fois vaincu/capturé
        // (gekrocResolved), il ne réapparaît plus → réplique "déjà descellé".
        if (npc.id === GEKROC_NPC_ID) {
            if (getPlayerSave().gekrocResolved) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: GEKROC_DONE_LINES } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: GEKROC_INTRO_LINES, lineIndex: 0 }, pendingGekroc: true })
            return
        }

        // SYLVEBARBE (gardien endormi du sud de Ville Jaune) : combat UNIQUE déclenché par la Daemonflûte.
        if (npc.id === SYLVEBARBE_NPC_ID) {
            if (getPlayerSave().sylvebarbeAwake) {
                set({ dialogue: { npcId: npc.id, npcName: "SYLVEBARBE", lineIndex: 0, lines: SYLVEBARBE_DONE_LINES } })
                return
            }
            if ((getPlayerSave().items["daemonflute"] ?? 0) <= 0) {
                set({ dialogue: { npcId: npc.id, npcName: "SYLVEBARBE", lineIndex: 0, lines: SYLVEBARBE_NO_FLUTE_LINES } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: "SYLVEBARBE", lines: SYLVEBARBE_INTRO_LINES, lineIndex: 0 }, pendingSylvebarbe: true })
            return
        }

        // PNJ 5 — GARDIEN DE LA GROTTE DU NEXUS : GATE « titre OR au Dôme » (domeChampionships >= 3 = Bronze+Argent+Or).
        // Sans le titre → refus + RENVOI hors de la grotte (retour Zone de Combat). Avec le titre → combat RÉCURRENT
        // contre la meute des 5 Gek (scaling +2 niveaux/victoire, IA hof), à rebattre à chaque visite.
        if (npc.id === PNJ5_NPC_ID) {
            if (getPlayerSave().domeChampionships < 3) {
                // Renvoi : on repositionne le joueur hors de la grotte et on affiche le refus par-dessus (comme un K.O.).
                const kicked = createInitialPlayer(PNJ5_KICK.mapId, PNJ5_KICK.x, PNJ5_KICK.y, "down")
                set({
                    map: YELLOW_MAPS[PNJ5_KICK.mapId], player: kicked,
                    dialogue: { npcId: npc.id, npcName: "GARDIEN", lineIndex: 0, lines: PNJ5_NO_DOME_LINES },
                })
                saveNow(kicked) // transition de map → save IMMÉDIAT (anti-désync position/flags au reload, cf. setMap)
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: "GARDIEN", lines: PNJ5_INTRO_LINES, lineIndex: 0 }, pendingPnj5: true })
            return
        }

        // BROCANTEUR (maison hantée) — WORLD-AWARE. RUN 1 → Roctaur→ROCHISON (trade-évo) ; RUN 2 → Roctaur→MORROW ;
        // RUN 3 → PLUS de Roctaur : uniquement le service AQUILOTHAN→AQUILORD. (Post-game live : Aquilord ET Roctaur.)
        if (npc.id === HH_TRADER_ID) {
            const world = getActiveWorld()
            // SERVICE PREMIUM (post-game : live OU run 3) : un AQUILOTHAN en équipe → trade-évo en AQUILORD (interlude
            //   Mimimoy → amorce son roaming). Prioritaire sur le service Roctaur (le joueur l'apporte exprès).
            if (world === "live" || world === "run3") {
                const aq = getPlayerSave().team.find((m) => m.speciesId === HH_TRADE_AQUILOTHAN_GIVE)
                if (aq) {
                    set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: HH_TRADER_AQUILORD_OFFER_LINES, lineIndex: 0 }, pendingAquilordTrade: aq.uid })
                    return
                }
            }
            // RUN 3 : le brocanteur ne fait QUE l'Aquilord (le Roctaur→Rochison n'a aucun sens ici). Sans Aquilothan → invite.
            if (world === "run3") {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: HH_TRADER_AQUILORD_NEED_LINES } })
                return
            }
            // RUN 1/2 : service Roctaur (→ Rochison / Morrow).
            const ngplus = world === "ngplus"
            if (!ngplus && getPokedex().caught.includes(HH_TRADE_RECEIVE)) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: HH_TRADER_HAS_MORROW_LINES } })
                return
            }
            const give = getPlayerSave().team.find((m) => m.speciesId === HH_TRADE_GIVE) // ÉQUIPE uniquement (jamais le PC)
            if (!give) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: ngplus ? HH_TRADER_NEED_LINES : HH_TRADER_NEED_LINES_RUN1 } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: ngplus ? HH_TRADER_OFFER_LINES : HH_TRADER_OFFER_LINES_RUN1, lineIndex: 0 }, pendingHhTrade: give.uid })
            return
        }

        // DÉNICHEUR (Route Nord) : run 1/2 = LIMAROCHE→Bélunode ; run 3 = RUFFIANT→Marmoterre. UNE SEULE FOIS (per-monde).
        if (npc.id === CAVE_TRADER_ID) {
            const cfg = caveTradeConfig(getActiveWorld() === "run3")
            if (getPlayerSave().caveTradeDone) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: cfg.already } })
                return
            }
            const give = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.speciesId === cfg.give)
            if (!give) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: cfg.need } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: cfg.offer, lineIndex: 0 }, pendingCaveTrade: give.uid })
            return
        }

        // GAMIN (plaine d'entraînement) : révèle le légendaire de la plaine dans SA fenêtre → DOUBLE ses chances
        // (flag goshHintHeard, par monde). RUN 1 = Goshendofy la NUIT (21h+) ; RUN 2 (NG+) = Ukognos à l'AUBE (5h-11h).
        if (npc.id === HH_KID_ID) {
            const ng = getActiveWorld() === "ngplus"
            const inWindow = ng ? isHhKidDawn(new Date().getHours()) : isHhKidNight(new Date().getHours())
            if (inWindow) {
                markGoshHintHeard()
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: ng ? HH_KID_DAWN_LINES : HH_KID_NIGHT_LINES } })
            } else {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: ng ? HH_KID_DAY_LINES_NGPLUS : HH_KID_DAY_LINES } })
            }
            return
        }

        // DRESSEUR D'ORCALINE (plaine) : 1 combat gagnant/jour ; le niveau de ses 2 Orcalines monte de +10
        // à chaque victoire. 1re victoire → cadeau Orcaline (géré dans finishBattle). Combat à la fermeture.
        if (npc.id === ORCALINE_TRAINER_ID) {
            const dlg = orcalineTrainerDialogue(effectiveRunWorld()) // run 2 → Panthégel ; run 3 → ÉLEVEUR (rejeu → run rejoué)
            if (!orcalineAvailableToday()) {
                set({ dialogue: { npcId: npc.id, npcName: dlg.name, lineIndex: 0, lines: dlg.doneToday } })
                return
            }
            const lines = orcalineWinsCount() === 0 ? dlg.intro : dlg.rematch
            set({ dialogue: { npcId: npc.id, npcName: dlg.name, lines, lineIndex: 0 }, pendingOrcaline: true })
            return
        }

        // COLLECTIONNEUR DE SPECTRES : 3 victoires + 3 spectres distincts → CT26. Réaffrontable jusque-là.
        if (npc.id === HH_COLLECTOR_ID) {
            // RUN 3 (Maison COMBAT) : le Collectionneur enseigne MITRA-POING (ct58) à qui lui montre un GAMARUTO.
            if (getActiveWorld() === "run3") {
                if (getPlayerSave().ownedCts.includes("ct58")) {
                    set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: ["Tu maîtrises déjà Mitra-Poing, disciple du crapaud. 🐸"] } })
                    return
                }
                const hasGamaruto = getPlayerSave().team.some((m) => m.speciesId === "gamaruto")
                const lead = hasGamaruto
                    ? ["Ce GAMARUTO à tes côtés… tu suis la voie du crapaud-ninja !", "Bats-moi et je t'enseignerai la technique COMBAT ultime : MITRA-POING."]
                    : ["Ce dojo hanté ne récompense que les vrais disciples du crapaud…", "Reviens avec un GAMARUTO dans ton équipe, bats-moi, et MITRA-POING — la technique Combat ultime — sera à toi."]
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: lead, lineIndex: 0 }, pendingHhCollector: true })
                return
            }
            if (getPlayerSave().ownedCts.includes(HH_COLLECTOR_CT)) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: HH_COLLECTOR_DONE_LINES } })
                return
            }
            const wins = Math.min(getPlayerSave().hhCollectorWins, HH_COLLECTOR_WINS_NEEDED)
            const shown = Math.min(getPlayerSave().hhSpectresShown.length, HH_COLLECTOR_SPECTRES_NEEDED)
            const progress = `(Progression : ${wins}/${HH_COLLECTOR_WINS_NEEDED} victoires · ${shown}/${HH_COLLECTOR_SPECTRES_NEEDED} spectres distincts montrés.)`
            // 1re rencontre = topo complet ; ensuite = rappel court (le joueur a déjà combattu/montré un spectre).
            const engaged = getPlayerSave().hhCollectorWins > 0 || getPlayerSave().hhSpectresShown.length > 0
            const lead = engaged ? HH_COLLECTOR_REMINDER_LINES : HH_COLLECTOR_INTRO_LINES
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: [...lead, progress], lineIndex: 0 }, pendingHhCollector: true })
            return
        }

        // Dresseur : intro + combat (ou réplique de défaite s'il est déjà battu).
        const trainer = getTrainer(npc.id)
        if (trainer) {
            // Champion : verrouillé tant que les 3 badges ne sont pas réunis.
            if (trainer.requiresAllBadges && !isTrainerDefeated(trainer.id) && getPlayerSave().badges.length < 3) {
                set({
                    dialogue: {
                        npcId: npc.id, npcName: npc.name,
                        lines: [
                            "*Le Champion ne lève même pas les yeux.*",
                            "Reviens quand tu auras conquis les trois salles.",
                            `Il te manque ${3 - getPlayerSave().badges.length} badge(s).`,
                        ],
                        lineIndex: 0,
                    },
                })
                return
            }
            // Boss d'arène : verrouillé tant que les gardes (requiresTrainers) ne sont
            // pas TOUS battus (ordre libre).
            if (trainer.requiresTrainers && !isTrainerDefeated(trainer.id)) {
                const restants = trainer.requiresTrainers.filter((id) => !isTrainerDefeated(id)).length
                if (restants > 0) {
                    set({
                        dialogue: {
                            npcId: npc.id, npcName: npc.name, lineIndex: 0,
                            lines: [
                                "*Le Doyen reste impassible, enraciné.*",
                                `Bats d'abord mes ${restants} garde(s) restant(s). Alors seulement je t'affronterai.`,
                            ],
                        },
                    })
                    return
                }
            }
            // Boss d'arène — 2e verrou : les gardes (battus) réclament leur REVANCHE.
            // Tant qu'ils ne sont pas tous RE-battus, le boss renvoie le joueur les affronter.
            // RUN 2 & RUN 3 : verrou DÉSACTIVÉ (=== "live" seulement) — le run 2 boucle l'arène re-typée sans
            //   revanche ; le run 3 reframe le boss en champion figé (pas de revanche = « combat unique »). Sinon
            //   VOLTA (élec) forcerait 4 revanches + une phase-2 hors-score qui draineraient l'énergie du concours.
            if (trainer.requiresRematch && !isTrainerDefeated(trainer.id) && getActiveWorld() === "live") {
                const restants = trainer.requiresRematch.filter((id) => !isTrainerRematched(id)).length
                if (restants > 0) {
                    set({
                        dialogue: {
                            npcId: npc.id, npcName: npc.name, lineIndex: 0,
                            lines: [
                                "*VOLTA t'arrête d'un geste, un éclair dans les yeux.*",
                                `Pas si vite. Mes ${restants} gardien(s) réclament leur revanche : bats-les une seconde fois.`,
                                "Reviens quand ils t'auront tous redéfié — alors je te jugerai digne de m'affronter.",
                            ],
                        },
                    })
                    return
                }
            }
            // RUN 3 : le boss d'arène n'est PAS le PNJ d'origine (Druide, …) mais l'ÉQUIPE GELÉE d'un vrai joueur
            //   (champion des runs précédents). On reframe l'intro ET le nom → le champion, pas le Druide. Pas de
            //   revanche en run 3 → une réplique post-victoire si déjà battu.
            const r3boss = effectiveRunWorld() === "run3" ? run3ArenaForBoss(trainer.id) : null
            if (r3boss) {
                const champName = RUN3_BOSS_TEAMS[r3boss.badge]?.nickname ?? trainer.name
                if (isTrainerDefeated(trainer.id)) {
                    set({ dialogue: { npcId: npc.id, npcName: champName, lines: [`L'équipe gelée de ${champName.toUpperCase()} a déjà plié devant toi. Cette arène est conquise, champion du concours !`], lineIndex: 0 } })
                } else {
                    set({ dialogue: { npcId: npc.id, npcName: champName, lines: run3BossIntroLines(champName), lineIndex: 0 }, pendingTrainerId: trainer.id, pendingRematch: false })
                }
                return
            }
            if (isTrainerDefeated(trainer.id)) {
                const inNgplus = getActiveWorld() === "ngplus"
                // RUN 2 — REVANCHE (combat séparé) : re-parler à un dresseur d'arène déjà battu (re-typé) propose
                // sa revanche = son équipe RUN 1 d'origine +N. Une seule fois (rematchedTrainers, per-monde).
                if (inNgplus && arenaRevancheBoost(trainer.id) != null && !isTrainerRematched(trainer.id)) {
                    set({
                        dialogue: { npcId: npc.id, npcName: npc.name, lines: arenaRevancheIntro(trainer.name, !!trainer.badge), lineIndex: 0 },
                        pendingTrainerId: trainer.id, pendingRematch: true,
                    })
                    return
                }
                const rm = trainer.rematch
                // REMATCH RUN 1 (match retour VOLTA / gardes élec) : 2e équipe, une fois le dresseur déjà battu.
                // Hors NG+ uniquement (en run 2 c'est la revanche ci-dessus qui prend le relais).
                if (rm && !isTrainerRematched(trainer.id) && !inNgplus) {
                    set({
                        dialogue: { npcId: npc.id, npcName: npc.name, lines: rm.intro ?? trainer.intro, lineIndex: 0 },
                        pendingTrainerId: trainer.id, pendingRematch: true,
                    })
                    return
                }
                // Plus de rematch/revanche (ou déjà fait) → simple réplique de défaite.
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: trainer.defeat, lineIndex: 0 } })
            } else {
                // TON DOUBLE / TON REFLET DE CHIMÈRE : le PNJ porte TON pseudo (tu affrontes ta propre légende).
                const dispName = (trainer.id === "y_ligue_double" || trainer.id === "y_fusion_miroir") ? (currentNickname || npc.name) : npc.name
                set({
                    dialogue: { npcId: npc.id, npcName: dispName, lines: trainer.intro, lineIndex: 0 },
                    pendingTrainerId: trainer.id, pendingRematch: false,
                })
            }
            return
        }

        set({
            dialogue: {
                npcId: npc.id,
                npcName: npc.name,
                lines: npc.dialoguesAfter,
                lineIndex: 0,
            },
        })
    },

    pressB: () => {
        const { dialogue, pendingTrainerId } = get()
        if (!dialogue) return
        // Un défi ne se refuse pas : fermer l'intro lance quand même le combat.
        if (pendingTrainerId) {
            set({ dialogue: tryLaunchTrainer(pendingTrainerId, get().pendingRematch), pendingTrainerId: null, pendingRematch: false })
        } else if (get().pendingSbire) {
            set({ dialogue: tryLaunchSbire(), pendingSbire: false })
        } else if (get().pendingAce) {
            set({ dialogue: tryLaunchAce(), pendingAce: false })
        } else if (get().pendingOrcaline) {
            set({ dialogue: tryLaunchOrcaline(), pendingOrcaline: false })
        } else if (get().pendingGekroc) {
            set({ dialogue: tryLaunchGekroc(), pendingGekroc: false })
        } else if (get().pendingSylvebarbe) {
            set({ dialogue: tryLaunchSylvebarbe(), pendingSylvebarbe: false })
        } else if (get().pendingPnj5) {
            set({ dialogue: tryLaunchPnj5(), pendingPnj5: false })
        } else if (get().pendingHhTrade) {
            // Ⓑ = RENONCER à l'échange (étape de validation) : on ne troque RIEN, le Roctaur reste dans l'équipe.
            set({ dialogue: { npcId: HH_TRADER_ID, npcName: "BROCANTEUR", lineIndex: 0, lines: HH_TRADER_CANCEL_LINES }, pendingHhTrade: null })
        } else if (get().pendingAquilordTrade) {
            // Ⓑ = RENONCER : l'Aquilothan reste dans l'équipe (pas d'évolution).
            set({ dialogue: { npcId: HH_TRADER_ID, npcName: "BROCANTEUR", lineIndex: 0, lines: HH_TRADER_AQUILORD_CANCEL_LINES }, pendingAquilordTrade: null })
        } else if (get().pendingCaveTrade) {
            // Ⓑ = RENONCER à l'échange : on ne troque RIEN, le Daemon donné reste dans l'équipe.
            set({ dialogue: { npcId: CAVE_TRADER_ID, npcName: "DÉNICHEUR", lineIndex: 0, lines: caveTradeConfig(getActiveWorld() === "run3").cancel }, pendingCaveTrade: null })
        } else if (get().pendingHhCollector) {
            set({ dialogue: tryLaunchHhCollector(), pendingHhCollector: false })
        } else {
            set({ dialogue: null })
        }
    },

    showDialogue: (npcId, npcName, lines) => set({ dialogue: { npcId, npcName, lines, lineIndex: 0 } }),

    setMap: (mapId, spawnX, spawnY) => {
        const map = YELLOW_MAPS[mapId]
        if (!map) {
            console.warn(`[gameStore] Map inconnue : ${mapId}`)
            return
        }
        // GARDIEN DE LA GROTTE : entrer dans la grotte (par le passeur → setMap) RÉ-ARME PNJ 5 → il faut le rebattre.
        // Les échelles intra-grotte passent par la transition inline (findExitAt), PAS setMap → aucun ré-arm parasite.
        if (mapId === PNJ5_MAP_ID) { pnj5WinsAtEntry = pnj5WinsCount(); grotteFusionPop = { prev1: "", prev2: "", primed: "" } } // entrée grotte → reset pop fusions
        const player = createInitialPlayer(mapId, spawnX, spawnY)
        set({ map, player, dialogue: null })
        saveNow(player) // transition de map → persistance IMMÉDIATE (anti-désync position/flags au reload, cf. whiteout Ligue)
    },

    launchRematch: (trainerId) => {
        const trainer = getTrainer(trainerId)
        if (!trainer?.rematch || isTrainerRematched(trainerId)) return
        // Affiche l'intro du rematch puis enchaîne le combat (phase 2) à la fermeture du dialogue.
        set({
            dialogue: { npcId: trainerId, npcName: trainer.name, lines: trainer.rematch.intro ?? trainer.intro, lineIndex: 0 },
            pendingTrainerId: trainerId, pendingRematch: true,
        })
    },

    hydrate: (loaded) => {
        const map = YELLOW_MAPS[loaded.mapId] ?? YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID]
        set({ player: loaded, map, hydrated: true })
    },

    closeShop: () => set({ shopOpen: false }),
    closeGuide: () => set({ guideOpen: false }),
    closeArenaInfo: () => set({ arenaInfoOpen: null }),
    closeLibrary: () => set({ libraryOpen: false }),
    closeAdvisor: () => set({ advisorOpen: false }),
    closeLab: () => set({ labOpen: false }),
    closeCombatShop: () => set({ combatShopOpen: false }),
    closeDomeMenu: () => set({ domeMenuOpen: false }),
    closeFusionMenu: () => set({ fusionMenuOpen: false }),
    closeFusionAtelier: () => set({ fusionAtelierOpen: false }),
    openPc: () => set({ pcOpen: true, fusionAtelierOpen: false }),
    closeSign: () => set({ signOpen: null }),
    closePoster: () => set({ posterImage: null }),
    closePc: () => set({ pcOpen: false }),
}))
