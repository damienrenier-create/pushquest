import { describe, it, expect } from "vitest"
import {
    fusionLeagueKeyForTrainer, activeFusionTier, isFusionChampion, fusionTierHasReflet,
    FUSION_TIER_MARKER, FUSION_LEAGUE_ORDER,
} from "./fusionLeague"
import { getTrainer } from "./trainers"
import { YELLOW_MAPS, FUSION_MIROIR_BRONZE } from "../maps"
import { hydratePlayer, isTrainerDefeated, resetFusionLeagueProgress } from "../store/playerStore"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"

describe("Ligue de Fusion — flux & intégrité (Inc.C/D)", () => {
    it("mapping dresseur → clé FUSION_LEAGUE (miroir & inconnus = null)", () => {
        expect(fusionLeagueKeyForTrainer("y_fusion_1")).toBe("will")
        expect(fusionLeagueKeyForTrainer("y_fusion_2")).toBe("koga")
        expect(fusionLeagueKeyForTrainer("y_fusion_3")).toBe("bruno")
        expect(fusionLeagueKeyForTrainer("y_fusion_4")).toBe("karen")
        expect(fusionLeagueKeyForTrainer("y_fusion_maitre")).toBe("lance")
        expect(fusionLeagueKeyForTrainer("y_fusion_miroir")).toBeNull() // dynamique (reflet), pas dans FUSION_LEAGUE
        expect(fusionLeagueKeyForTrainer("y_ligue_1_olga")).toBeNull()
    })

    it("échelle de paliers : bronze → argent → or (plafonné), titre dès bronze bouclé", () => {
        const cleared = new Set<string>()
        const is = (m: string) => cleared.has(m)
        expect(activeFusionTier(is)).toBe("bronze")
        expect(isFusionChampion(is)).toBe(false)
        cleared.add(FUSION_TIER_MARKER.bronze)
        expect(activeFusionTier(is)).toBe("argent")
        expect(isFusionChampion(is)).toBe(true) // « Maître de la Chimère » dès le 1er palier
        cleared.add(FUSION_TIER_MARKER.argent)
        expect(activeFusionTier(is)).toBe("or")
        cleared.add(FUSION_TIER_MARKER.or)
        expect(activeFusionTier(is)).toBe("or") // plafonné
    })

    it("resetFusionLeagueProgress purge les y_fusion_* MAIS garde les paliers fusleague_* et la vraie Ligue", () => {
        hydratePlayer({ defeatedTrainers: ["y_fusion_1", "y_fusion_2", "y_fusion_maitre", "fusleague_bronze", "y_ligue_1_olga"] })
        resetFusionLeagueProgress()
        expect(isTrainerDefeated("y_fusion_1")).toBe(false)
        expect(isTrainerDefeated("y_fusion_2")).toBe(false)
        expect(isTrainerDefeated("y_fusion_maitre")).toBe(false)
        expect(isTrainerDefeated("fusleague_bronze")).toBe(true) // échelle PRÉSERVÉE
        expect(isTrainerDefeated("y_ligue_1_olga")).toBe(true)   // vraie Ligue de Cendreville PRÉSERVÉE
    })

    it("les 6 dresseurs existent, IA hof/elite (scoreMovesHof), chaîne requiresTrainers, mapId cohérent", () => {
        const ids = [...FUSION_LEAGUE_ORDER, "y_fusion_miroir"]
        for (const id of ids) {
            const t = getTrainer(id)
            expect(t, id).not.toBeNull()
            expect(["hof", "elite"], `${id} doit router vers scoreMovesHof (Déf Spé des fusions)`).toContain(t!.aiLevel)
            expect(t!.mapId.startsWith("yellow_fusion_"), id).toBe(true)
            expect(YELLOW_MAPS[t!.mapId], `map ${t!.mapId}`).toBeDefined() // la salle existe
        }
        // LIGUE HARDCORE : TOUS les dresseurs (Conseil des Chimères + LANCE + DIEU SPAGHETTI) = "hof" → l'IA la plus
        //   intelligente (joue au mieux : KO/statut/setup + pilotes d'archétype) ET change face à un mauvais matchup.
        for (const id of ["y_fusion_1", "y_fusion_2", "y_fusion_3", "y_fusion_4", "y_fusion_maitre", "y_fusion_miroir"]) expect(getTrainer(id)!.aiLevel, id).toBe("hof")
        // chaîne de gating
        expect(getTrainer("y_fusion_1")!.requiresTrainers).toBeUndefined()
        expect(getTrainer("y_fusion_2")!.requiresTrainers).toEqual(["y_fusion_1"])
        expect(getTrainer("y_fusion_maitre")!.requiresTrainers).toEqual(["y_fusion_4"])
        expect(getTrainer("y_fusion_miroir")!.requiresTrainers).toEqual(["y_fusion_maitre"])
    })

    it("la venue est reliée : l'Autel a la porte d'entrée, le miroir ressort vers l'Autel", () => {
        const autel = YELLOW_MAPS["yellow_combat_autel"]
        expect(autel.exits?.some((e) => e.targetMapId === "yellow_fusion_glace")).toBe(true)
        const miroir = YELLOW_MAPS["yellow_fusion_miroir"]
        // Porte GAUCHE (x:2) = retraite → Autel ; porte DROITE (x:19) → SALLE ULTIME (ton reflet, gatée dans gameStore).
        expect(miroir.exits?.some((e) => e.x === 2 && e.targetMapId === "yellow_combat_autel")).toBe(true)
        expect(miroir.exits?.some((e) => e.x === 19 && e.targetMapId === "yellow_fusion_ultime")).toBe(true)
        // La salle ultime retraite vers le miroir (donc vers l'Autel) → jamais bloqué.
        expect(YELLOW_MAPS["yellow_fusion_ultime"].exits?.some((e) => e.x === 2 && e.targetMapId === "yellow_fusion_miroir")).toBe(true)
        // chaque salle a une RETRAITE vers l'Autel (jamais bloqué)
        for (const id of ["yellow_fusion_glace", "yellow_fusion_combat", "yellow_fusion_spectre", "yellow_fusion_dragon", "yellow_fusion_maitre"]) {
            expect(YELLOW_MAPS[id].exits?.some((e) => e.x === 2 && e.targetMapId === "yellow_combat_autel"), id).toBe(true)
        }
    })

    it("SALLE ULTIME (reflet) réservée au palier OR : bronze/argent = salle SANS porte, OR = porte droite", () => {
        // Le reflet (salle ultime) n'existe QU'en OR.
        expect(fusionTierHasReflet("bronze")).toBe(false)
        expect(fusionTierHasReflet("argent")).toBe(false)
        expect(fusionTierHasReflet("or")).toBe(true)
        // Variante bronze/argent (FUSION_MIROIR_BRONZE) : PAS de porte droite (x:19), seulement la retraite gauche + sprite sans porte.
        expect(FUSION_MIROIR_BRONZE.exits?.some((e) => e.x === 19)).toBe(false)
        expect(FUSION_MIROIR_BRONZE.exits?.some((e) => e.x === 2 && e.targetMapId === "yellow_combat_autel")).toBe(true)
        expect(FUSION_MIROIR_BRONZE.backgroundImage).toContain("fusion_dome_champion_bronze")
        // La map OR (base yellow_fusion_miroir) GARDE la porte droite → salle ultime + sprite avec porte.
        expect(YELLOW_MAPS["yellow_fusion_miroir"].exits?.some((e) => e.x === 19 && e.targetMapId === "yellow_fusion_ultime")).toBe(true)
        expect(YELLOW_MAPS["yellow_fusion_miroir"].backgroundImage).toContain("fusion_dome_champion.jpg")
    })

    it("TOUTES les portes de la venue sont sur des tuiles MARCHABLES (régression CRITICAL revue : (9,0) était un mur)", () => {
        // entrée depuis l'Autel
        const autel = YELLOW_MAPS["yellow_combat_autel"]
        const entry = autel.exits!.find((e) => e.targetMapId === "yellow_fusion_glace")!
        expect(isBlockingTile(autel.tiles[entry.y][entry.x]), "porte d'entrée de l'Autel (sinon Ligue injouable)").toBe(false)
        // chaque salle de fusion : toutes ses portes (progression + retraite) marchables
        for (const id of ["yellow_fusion_glace", "yellow_fusion_combat", "yellow_fusion_spectre", "yellow_fusion_dragon", "yellow_fusion_maitre", "yellow_fusion_miroir"]) {
            const m = YELLOW_MAPS[id]
            for (const e of m.exits ?? []) {
                expect(isBlockingTile(m.tiles[e.y][e.x]), `${id} porte (${e.x},${e.y})`).toBe(false)
            }
        }
    })
})
