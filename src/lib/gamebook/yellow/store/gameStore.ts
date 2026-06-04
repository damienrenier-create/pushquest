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
import { getNpcInFrontOfPlayer } from "../engine/interaction"
import { YELLOW_MAPS } from "../maps"
import type { YellowMapData } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { getSnapshot as getBattleSnapshot, startWildBattle, startTrainerBattle } from "./battleStore"
import { getPlayer as getPlayerSave, healAllTeam, isTrainerDefeated } from "./playerStore"
import { persistYellowSave } from "./saveManager"
import { rollWildEncounter } from "../data/encounters"
import { getTrainer } from "../data/trainers"
import { createMonInstance } from "../battle/factory"

export interface ActiveDialogue {
    npcId: string
    npcName: string
    lines: string[]
    lineIndex: number
}

interface GameStore {
    // === STATE ===
    player: PlayerState
    map: YellowMapData
    dialogue: ActiveDialogue | null
    shopOpen: boolean // boutique ouverte (vendeur)
    hydrated: boolean // true une fois que l'état serveur a été chargé
    stepFrame: 0 | 1 // alterne à chaque déplacement réel → anime les jambes du sprite
    pendingTrainerId: string | null // dresseur dont l'intro est en cours → combat à la fermeture

    // === ACTIONS ===
    move: (dir: Direction) => void
    pressA: () => void
    pressB: () => void
    setMap: (mapId: string, spawnX: number, spawnY: number) => void
    hydrate: (loaded: PlayerState) => void
    closeShop: () => void
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
function tryLaunchTrainer(trainerId: string): ActiveDialogue | null {
    const trainer = getTrainer(trainerId)
    if (!trainer) return null
    const team = getPlayerSave().team
    if (!team.some((m) => m.currentHp > 0)) {
        return {
            npcId: trainerId, npcName: trainer.name, lineIndex: 0,
            lines: ["Tes Daemons sont tous K.O. !", "Soigne-les au Centre avant de te battre."],
        }
    }
    const enemyTeam = trainer.team.map((s) => createMonInstance(s.speciesId, s.level, { owned: false }))
    const seed = Math.floor(Math.random() * 1e9) >>> 0
    startTrainerBattle(team, enemyTeam, seed, { trainerId, reward: trainer.reward, aiLevel: trainer.aiLevel })
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
    hydrated: false,
    stepFrame: 0,
    pendingTrainerId: null,

    move: (dir) => {
        const { player, map, dialogue } = get()
        // Mouvement bloqué pendant un dialogue, une boutique ou un combat.
        if (dialogue || get().shopOpen) return
        if (getBattleSnapshot().battle) return

        const next = tryMove(player, dir, map)

        // Le joueur vient-il d'atterrir sur une case warp ? (porte de bâtiment
        // ou doorMat de sortie). Si oui : transition de map immédiate.
        const exit = findExitAt(map, next.posX, next.posY)
        if (exit) {
            const newMap = YELLOW_MAPS[exit.targetMapId]
            if (newMap) {
                const newPlayer = createInitialPlayer(
                    exit.targetMapId,
                    exit.targetSpawnX,
                    exit.targetSpawnY,
                    next.direction,
                )
                set({ map: newMap, player: newPlayer, dialogue: null })
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
        if (moved && map.tiles[next.posY]?.[next.posX] === "grassTall") {
            const team = getPlayerSave().team
            if (team.some((m) => m.currentHp > 0)) {
                const wild = rollWildEncounter(next.mapId)
                if (wild) {
                    const seed = Math.floor(Math.random() * 1e9) >>> 0
                    startWildBattle(team, [wild], seed)
                }
            }
        }
    },

    pressA: () => {
        const { player, dialogue } = get()

        // Pendant un combat : l'UI de combat gère les entrées, on ignore ici.
        if (getBattleSnapshot().battle) return

        // Si un dialogue est ouvert : avancer à la ligne suivante (ou fermer si dernière).
        if (dialogue) {
            const nextIndex = dialogue.lineIndex + 1
            if (nextIndex >= dialogue.lines.length) {
                // Fin d'un dialogue : si c'était l'intro d'un dresseur, on lance le combat.
                const pid = get().pendingTrainerId
                if (pid) {
                    set({ dialogue: tryLaunchTrainer(pid), pendingTrainerId: null })
                } else {
                    set({ dialogue: null })
                }
            } else {
                set({ dialogue: { ...dialogue, lineIndex: nextIndex } })
            }
            return
        }

        // Sinon : chercher un NPC devant le joueur et déclencher son dialogue.
        const npc = getNpcInFrontOfPlayer(player, YELLOW_NPCS)
        if (!npc) return

        // Médecin du Centre Daemon : soigne toute l'équipe.
        if (npc.id === "y_medecin") {
            healAllTeam()
            persistYellowSave()
            set({
                dialogue: {
                    npcId: npc.id,
                    npcName: npc.name,
                    lines: ["Bienvenue au Centre Daemon !", "Tes Daemons sont soignés à bloc. Reviens quand tu veux !"],
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

        // Dresseur : intro + combat (ou réplique de défaite s'il est déjà battu).
        const trainer = getTrainer(npc.id)
        if (trainer) {
            if (isTrainerDefeated(trainer.id)) {
                set({ dialogue: { npcId: npc.id, npcName: npc.name, lines: trainer.defeat, lineIndex: 0 } })
            } else {
                set({
                    dialogue: { npcId: npc.id, npcName: npc.name, lines: trainer.intro, lineIndex: 0 },
                    pendingTrainerId: trainer.id,
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
        // Un défi de dresseur ne se refuse pas : fermer l'intro lance quand même le combat.
        if (pendingTrainerId) {
            set({ dialogue: tryLaunchTrainer(pendingTrainerId), pendingTrainerId: null })
        } else {
            set({ dialogue: null })
        }
    },

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
}))
