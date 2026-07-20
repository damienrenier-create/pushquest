import { describe, it, expect } from "vitest"
import {
    fusionLeagueKeyForTrainer, activeFusionTier, isFusionChampion,
    FUSION_TIER_MARKER, FUSION_LEAGUE_ORDER,
} from "./fusionLeague"
import { getTrainer } from "./trainers"
import { YELLOW_MAPS } from "../maps"
import { hydratePlayer, isTrainerDefeated, resetFusionLeagueProgress } from "../store/playerStore"

describe("Ligue de Fusion — flux & intégrité (Inc.C/D)", () => {
    it("mapping dresseur → clé FUSION_LEAGUE (miroir & inconnus = null)", () => {
        expect(fusionLeagueKeyForTrainer("y_fusion_1")).toBe("lorelei")
        expect(fusionLeagueKeyForTrainer("y_fusion_2")).toBe("bruno")
        expect(fusionLeagueKeyForTrainer("y_fusion_3")).toBe("agatha")
        expect(fusionLeagueKeyForTrainer("y_fusion_4")).toBe("peter")
        expect(fusionLeagueKeyForTrainer("y_fusion_maitre")).toBe("ace")
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

    it("les 6 dresseurs existent, IA hof, chaîne requiresTrainers, mapId cohérent", () => {
        const ids = [...FUSION_LEAGUE_ORDER, "y_fusion_miroir"]
        for (const id of ids) {
            const t = getTrainer(id)
            expect(t, id).not.toBeNull()
            expect(t!.aiLevel, `${id} doit être hof`).toBe("hof") // sinon l'IA ignore la Déf Spé des fusions
            expect(t!.mapId.startsWith("yellow_fusion_"), id).toBe(true)
            expect(YELLOW_MAPS[t!.mapId], `map ${t!.mapId}`).toBeDefined() // la salle existe
        }
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
        expect(miroir.exits?.every((e) => e.targetMapId === "yellow_combat_autel")).toBe(true) // sortie + retraite → Autel
        // chaque salle a une RETRAITE vers l'Autel (jamais bloqué)
        for (const id of ["yellow_fusion_glace", "yellow_fusion_combat", "yellow_fusion_spectre", "yellow_fusion_dragon", "yellow_fusion_maitre"]) {
            expect(YELLOW_MAPS[id].exits?.some((e) => e.x === 2 && e.targetMapId === "yellow_combat_autel"), id).toBe(true)
        }
    })
})
