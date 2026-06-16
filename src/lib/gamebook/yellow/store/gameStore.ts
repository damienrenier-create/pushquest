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
import type { YellowMapData } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { getSnapshot as getBattleSnapshot, startWildBattle, startTrainerBattle, resetFleeStreak } from "./battleStore"
import { getPlayer as getPlayerSave, healAllTeam, claimPastaGodGift, isTrainerDefeated, isTrainerRematched, aceBattleLevel, aceTeamSizeFor, aceAvailableToday, grantReps, executeTrade, applyTradeEvolution } from "./playerStore"
import { getSpecies } from "../data/species"
import { persistYellowSave } from "./saveManager"
import { rollWildEncounter, wildLevelCap, hasEncounters } from "../data/encounters"
import { getTrainer, trainerBoost, arenaScaledLevel, type TrainTier } from "../data/trainers"
import { createMonInstance } from "../battle/factory"
import { buildSbireTeam, SBIRE_MAX_FIGHTS_PER_DAY, SBIRE_TRAINER_ID, sbireIntroLines, SBIRE_DONE_LINES, SBIRE_NO_TEAM_LINES } from "../data/sbire"
import { ACE_TRAINER_ID, ACE_TRIGGER_TILES, ACE_INTRO_LINES, ACE_DONE_LINES, ACE_NO_TEAM_LINES, ACE_PASS_LINES, ACE_GATE_LINES, buildAceTeam, speciesAtLevel } from "../data/ace"
import { GEKROC_NPC_ID, GEKROC_INTRO_LINES, GEKROC_DONE_LINES, GEKROC_NO_TEAM_LINES, buildGekroc } from "../data/gekroc"
import { HH_TRADER_ID, HH_TRADE_GIVE, HH_TRADE_RECEIVE, HH_TRADER_OFFER_LINES, HH_TRADER_NEED_LINES, HH_COLLECTOR_ID, HH_COLLECTOR_CT, HH_COLLECTOR_INTRO_LINES, HH_COLLECTOR_DONE_LINES, HH_COLLECTOR_NO_TEAM_LINES, HH_COLLECTOR_WINS_NEEDED, HH_COLLECTOR_SPECTRES_NEEDED, buildHhCollectorTeam } from "../data/hauntedNpcs"

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

interface GameStore {
    // === STATE ===
    player: PlayerState
    map: YellowMapData
    dialogue: ActiveDialogue | null
    shopOpen: boolean // boutique ouverte (vendeur)
    pcOpen: boolean // boîte PC ouverte (ordinateur du Centre Daemon)
    guideOpen: boolean // guide du Bosquet ouvert (panneau devant le gym)
    libraryOpen: boolean // Registre des Dresseurs (bibliothèque de l'infirmerie)
    advisorOpen: boolean // Conseiller (PNJ à côté du Centre) : questions → base de données
    labOpen: boolean // Terminal d'expériences (labo, étage de l'infirmerie)
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
    pendingGekroc: boolean // intro de GÉKROC (mini-boss Centrale) en cours → combat à la fermeture
    pendingHhTrade: string | null // uid du Brookhanté à échanger (BROCANTEUR maison hantée) → échange à la fermeture
    pendingHhCollector: boolean // intro du COLLECTIONNEUR (maison hantée) en cours → combat à la fermeture
    encounterCooldown: number // #7 : pas de rencontre sauvage pendant N déplacements (≥1 case libre après un combat)

    // === ACTIONS ===
    move: (dir: Direction) => void
    pressA: () => void
    pressB: () => void
    setMap: (mapId: string, spawnX: number, spawnY: number) => void
    hydrate: (loaded: PlayerState) => void
    closeShop: () => void
    closePc: () => void
    closeGuide: () => void
    closeLibrary: () => void
    closeAdvisor: () => void
    closeLab: () => void
    closeSign: () => void
    closePoster: () => void
    /** Affiche un dialogue simple (ex. explication post-combat du sbire). */
    showDialogue: (npcId: string, npcName: string, lines: string[]) => void
}

// === PERSISTANCE SERVEUR ===
// Debounce 3s sur l'envoi : si le joueur bouge en rafale, on n'envoie QUE la
// dernière position après 3s d'inactivité. Limite drastiquement le trafic Neon.
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave(player: PlayerState) {
    if (typeof window === "undefined") return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        fetch("/api/gamebook/yellow/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mapId: player.mapId,
                posX: player.posX,
                posY: player.posY,
                direction: player.direction,
            }),
        }).catch((e) => console.warn("[yellow] save failed", e))
    }, 3000)
}

// Lance un combat de dresseur. Renvoie un dialogue à afficher (équipe K.O.) ou null
// si le combat a bien démarré. L'équipe ennemie est fabriquée à partir du registre.
function tryLaunchTrainer(trainerId: string, isRematch = false): ActiveDialogue | null {
    const trainer = getTrainer(trainerId)
    if (!trainer) return null
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return {
            npcId: trainerId, npcName: trainer.name, lineIndex: 0,
            lines: ["Tes Daemons sont tous K.O. !", "Soigne-les au Centre avant de te battre."],
        }
    }
    // Boost "entraînement" : TOUS les dresseurs sont boostés pour ne pas être surclassés
    // par un joueur qui alloue du Saiyan à chaque niveau. Boss d'arène (badge) → "elite" ;
    // tout autre dresseur (route, gardes…) → "guard". Le boost SCALE avec le niveau
    // (trainerBoost), donc un dresseur niv 6 reste modeste et un niv 25 devient solide.
    const tier: TrainTier | undefined = trainer.training ?? (trainer.badge ? "elite" : "guard")
    // Rival de route (Léo/Mia) : niveau d'un garde de l'arène la plus récemment battue. Leurs
    // Daemons ÉVOLUENT au stade correspondant à ce niveau (speciesAtLevel enchaîne les évolutions).
    const scaledLvl = trainer.scaleWithBadges ? arenaScaledLevel(getPlayerSave().badges) : null
    // Rematch (match retour) → 2e équipe ; sinon l'équipe de base.
    const specs = isRematch && trainer.rematch ? trainer.rematch.team : trainer.team
    const enemyTeam = specs.map((s) => {
        const lvl = scaledLvl ?? s.level
        const speciesId = trainer.scaleWithBadges ? speciesAtLevel(s.speciesId, lvl) : s.speciesId
        const inst = createMonInstance(speciesId, lvl, { owned: false, moveIds: s.moves, ...trainerBoost(speciesId, lvl, tier) })
        // Opening scripté (boss) → attaché au combattant runtime (consommé par l'IA ennemie).
        if (s.opening?.length) Object.assign(inst, { openingMoves: [...s.opening] })
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
    const enemyTeam = buildSbireTeam(lead, fightIndex).map((m) =>
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
    startWildBattle(team, [buildGekroc()], seed)
    return null
}

// BROCANTEUR (maison hantée) : échange le Brookhanté (uid) du joueur contre un Roctaur qui, reçu par
// échange, évolue aussitôt en Rochison (applyTradeEvolution). Renvoie le dialogue de résultat.
function doHhTrade(brookUid: string): ActiveDialogue | null {
    const owner = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.uid === brookUid)
    if (!owner) return null
    const roctaur = createMonInstance(HH_TRADE_RECEIVE, owner.level, { owned: true })
    executeTrade(brookUid, roctaur)              // retire le Brookhanté, ajoute le Roctaur
    const evo = applyTradeEvolution(roctaur.uid) // Roctaur → Rochison (évolution par échange)
    persistYellowSave()
    const got = evo ? evo.toName : "Roctaur"
    return {
        npcId: HH_TRADER_ID, npcName: "BROCANTEUR", lineIndex: 0,
        lines: evo
            ? ["Marché conclu ! Je récupère ton Brookhanté…", `…et sous tes yeux, mon Roctaur se transforme en ${got} ! L'échange a réveillé sa vraie forme. Prends-en soin !`]
            : ["Marché conclu ! Je récupère ton Brookhanté…", `…et tu reçois mon ${got} ! Prends-en soin.`],
    }
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
    const best = Math.max(...team.map((m) => m.level))
    const last = team[team.length - 1]
    const lastTypes = getSpecies(last.speciesId)?.types ?? []
    // CLIQUET : le niveau d'ACE est FIGÉ entre deux défaites (aceBattleLevel). Il ne monte
    // qu'APRÈS sa défaite (recordAceDefeat) — fini la recalibration à chaque rencontre.
    const built = buildAceTeam({ aceLevel: aceBattleLevel(best), playerLastTypes: lastTypes })
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

// Spawn par défaut : VILLE JAUNE = Viridian City 45×40 (scale natif FireRed),
// entrée sud (Route 1) centre-bas pour explorer la ville.
const DEFAULT_SPAWN = { x: 22, y: 38 }

export const useGameStore = create<GameStore>((set, get) => ({
    player: createInitialPlayer(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, "up"),
    map: YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID],
    dialogue: null,
    shopOpen: false,
    pcOpen: false,
    guideOpen: false,
    libraryOpen: false,
    advisorOpen: false,
    labOpen: false,
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
    pendingGekroc: false,
    pendingHhTrade: null,
    pendingHhCollector: false,
    encounterCooldown: 0,

    move: (dir) => {
        const { player, map, dialogue } = get()
        // Mouvement bloqué pendant un dialogue, une boutique, le PC ou un combat.
        if (dialogue || get().shopOpen || get().pcOpen || get().guideOpen || get().libraryOpen || get().advisorOpen || get().labOpen || get().signOpen !== null) return
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
            const leavingShared = map.id === "yellow_shop" || map.id === "yellow_infirmary"
            const ret = get().interiorReturn
            if (leavingShared && ret) { targetMapId = ret.mapId; spawnX = ret.x; spawnY = ret.y }
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
                // Tous les badges réunis → on entre réellement dans la 1re salle (glace).
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
            const newMap = YELLOW_MAPS[targetMapId]
            if (newMap) {
                // Override de spawn : l'arène Feu (16×16) a son entrée en bas (8,14),
                // pas au spawn générique du gym (7,8) calé sur les arènes 15×10.
                if (targetMapId === "yellow_arena_feu") { spawnX = 8; spawnY = 14 }
                const newPlayer = createInitialPlayer(targetMapId, spawnX, spawnY, next.direction)
                // Mémorise l'origine en ENTRANT dans un intérieur partagé (→ retour dynamique +
                // posters de Cendreville) ; on l'efface en SORTANT d'un partagé.
                const enteringShared = targetMapId === "yellow_shop" || targetMapId === "yellow_infirmary"
                const fromOverworld = map.id === YELLOW_ENTRANCE_MAP_ID || map.id === "yellow_cendreville"
                const interiorReturn = enteringShared && fromOverworld
                    ? { mapId: map.id, x: player.posX, y: player.posY }
                    : (leavingShared ? null : ret)
                set({ map: newMap, player: newPlayer, dialogue: null, interiorReturn })
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
            || (onWildTile === "grass" && !!map.backgroundImage && hasEncounters(map.id))
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
                const wild = rollWildEncounter({
                    mapId: next.mapId, x: next.posX, y: next.posY, leadLevel: levelBasis,
                    weakestTeamLevel: Math.min(...team.map((m) => m.level)), // pour Namicha (Centrale / maison hantée)
                    strongestTeamLevel: Math.max(...team.map((m) => m.level)), // pour Vipember (+5, maison hantée)
                    player: getPlayerSave().wildCtx ?? undefined,
                    levelCap: wildLevelCap(badges), // bridage par badges (Route Nord + Grotte)
                    encounterCount: encCount,
                    dayKey: new Date().toISOString().slice(0, 10), // rotation quotidienne des types (hautes herbes)
                })
                if (wild) {
                    if (typeof window !== "undefined" && encCount < 10) window.localStorage.setItem(ENC_KEY, String(encCount + 1))
                    const seed = Math.floor(Math.random() * 1e9) >>> 0
                    set({ encounterCooldown: 1 }) // #7 : la 1re case après ce combat sera sans rencontre
                    startWildBattle(team, [wild], seed)
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
            set({
                dialogue: {
                    npcId: ACE_TRAINER_ID, npcName: "ACE", lineIndex: 0,
                    lines: aceAvailableToday() ? ACE_INTRO_LINES : ACE_GATE_LINES,
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
                } else if (get().pendingGekroc) {
                    set({ dialogue: tryLaunchGekroc(), pendingGekroc: false })
                } else if (get().pendingHhTrade) {
                    set({ dialogue: doHhTrade(get().pendingHhTrade!), pendingHhTrade: null })
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
        if (!npc) return

        // Ordinateur du Centre : ouvre la boîte PC (rangement des Daemons).
        if (npc.id === "y_pc_box") {
            set({ pcOpen: true })
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

        // Panneau du Bosquet : ouvre le GUIDE (pop-up riche) au lieu d'un dialogue.
        if (npc.id === "y_gym_sign") {
            set({ guideOpen: true })
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
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: ACE_INTRO_LINES, lineIndex: 0 }, pendingAce: true })
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

        // BROCANTEUR (maison hantée) : échange Brookhanté → Roctaur (→ Rochison). Répétable.
        if (npc.id === HH_TRADER_ID) {
            const brook = [...getPlayerSave().team, ...getPlayerSave().pc].find((m) => m.speciesId === HH_TRADE_GIVE)
            if (!brook) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: HH_TRADER_NEED_LINES } })
                return
            }
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: HH_TRADER_OFFER_LINES, lineIndex: 0 }, pendingHhTrade: brook.uid })
            return
        }

        // COLLECTIONNEUR DE SPECTRES : 3 victoires + 3 spectres distincts → CT26. Réaffrontable jusque-là.
        if (npc.id === HH_COLLECTOR_ID) {
            if (getPlayerSave().ownedCts.includes(HH_COLLECTOR_CT)) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lineIndex: 0, lines: HH_COLLECTOR_DONE_LINES } })
                return
            }
            const wins = Math.min(getPlayerSave().hhCollectorWins, HH_COLLECTOR_WINS_NEEDED)
            const shown = Math.min(getPlayerSave().hhSpectresShown.length, HH_COLLECTOR_SPECTRES_NEEDED)
            const progress = `(Progression : ${wins}/${HH_COLLECTOR_WINS_NEEDED} victoires · ${shown}/${HH_COLLECTOR_SPECTRES_NEEDED} spectres distincts montrés.)`
            set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: [...HH_COLLECTOR_INTRO_LINES, progress], lineIndex: 0 }, pendingHhCollector: true })
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
            // Tant qu'ils ne sont pas tous RE-battus, le boss renvoie le joueur les affronter
            // (sans rien dévoiler de SON propre rematch ni des récompenses).
            if (trainer.requiresRematch && !isTrainerDefeated(trainer.id)) {
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
            if (isTrainerDefeated(trainer.id)) {
                const rm = trainer.rematch
                // REMATCH (match retour) : 2e équipe, dispo une fois le dresseur déjà battu.
                // (Pour le boss, ses gardes étaient déjà requis en revanche AVANT son 1er combat.)
                if (rm && !isTrainerRematched(trainer.id)) {
                    set({
                        dialogue: { npcId: npc.id, npcName: npc.name, lines: rm.intro ?? trainer.intro, lineIndex: 0 },
                        pendingTrainerId: trainer.id, pendingRematch: true,
                    })
                    return
                }
                // Plus de rematch (ou déjà fait) → simple réplique de défaite.
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: trainer.defeat, lineIndex: 0 } })
            } else {
                set({
                    dialogue: { npcId: npc.id, npcName: npc.name, lines: trainer.intro, lineIndex: 0 },
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
        } else if (get().pendingGekroc) {
            set({ dialogue: tryLaunchGekroc(), pendingGekroc: false })
        } else if (get().pendingHhTrade) {
            set({ dialogue: doHhTrade(get().pendingHhTrade!), pendingHhTrade: null })
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
        const player = createInitialPlayer(mapId, spawnX, spawnY)
        set({ map, player, dialogue: null })
        scheduleSave(player)
    },

    hydrate: (loaded) => {
        const map = YELLOW_MAPS[loaded.mapId] ?? YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID]
        set({ player: loaded, map, hydrated: true })
    },

    closeShop: () => set({ shopOpen: false }),
    closeGuide: () => set({ guideOpen: false }),
    closeLibrary: () => set({ libraryOpen: false }),
    closeAdvisor: () => set({ advisorOpen: false }),
    closeLab: () => set({ labOpen: false }),
    closeSign: () => set({ signOpen: null }),
    closePoster: () => set({ posterImage: null }),
    closePc: () => set({ pcOpen: false }),
}))
