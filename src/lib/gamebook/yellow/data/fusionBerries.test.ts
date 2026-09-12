import { describe, it, expect } from "vitest"
import { fusionRunBerriesActive, buildPlatineAceTeam, disposeFusionLeagueTeam, FUSION_TIER_ORDER } from "./fusionLeague"
import { getSpecies } from "./species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LES BAIES ENNEMIES DE LA LIGUE DE FUSION
//
// Elles n'ont JAMAIS fonctionné : la formule vivait en double (démarrage de run + reprise après
// rechargement), et l'appel du démarrage était devenu mort le jour où l'entrée par la porte à dragons s'est
// mise à construire l'équipe elle-même. Les adversaires n'ont donc jamais porté leurs baies, Baie Phénix
// comprise — celle qui fait se relever une fois l'ACE de l'ACE.
//
// Sartay a tranché : tant pis pour les paliers du dessous, MAIS ça doit marcher au PLATINE. Ce fichier est
// ce qui l'empêche de redevenir muet — la règle est à un seul endroit, et il est testé des deux côtés :
// la décision (fusionRunBerriesActive) ET son effet réel sur l'équipe d'ACE.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("Ligue de Fusion — quand les baies ennemies sont actives", () => {
    it("⚠️ AU PLATINE : TOUJOURS, quoi qu'il arrive", () => {
        expect(fusionRunBerriesActive("platine", true)).toBe(true)
        expect(fusionRunBerriesActive("platine", false)).toBe(true) // même à la 10e tentative du jour
    })

    it("en OR aussi : c'est ce qui rend le palier haut réellement dangereux", () => {
        expect(fusionRunBerriesActive("or", true)).toBe(true)
        expect(fusionRunBerriesActive("or", false)).toBe(true)
    })

    it("en ARGENT, seulement à la PREMIÈRE traversée du jour — le palier reste apprenable en réessayant", () => {
        expect(fusionRunBerriesActive("argent", true)).toBe(true)
        expect(fusionRunBerriesActive("argent", false)).toBe(false)
    })

    it("jamais en BRONZE", () => {
        expect(fusionRunBerriesActive("bronze", true)).toBe(false)
        expect(fusionRunBerriesActive("bronze", false)).toBe(false)
    })

    it("tous les paliers connus ont une réponse (un palier ajouté ne peut pas passer à travers)", () => {
        for (const t of FUSION_TIER_ORDER) {
            expect(typeof fusionRunBerriesActive(t, true)).toBe("boolean")
            expect(typeof fusionRunBerriesActive(t, false)).toBe("boolean")
        }
    })
})

describe("couloir platine — l'équipe d'ACE porte réellement ses baies", () => {
    const itemsOf = (berries: boolean) => {
        const team = buildPlatineAceTeam(0, berries)
        try {
            return team.map((f) => ({
                name: getSpecies(f.speciesId)?.name ?? "?",
                item: f.instance.heldItem,
            }))
        } finally { disposeFusionLeagueTeam(team) }
    }

    it("baies actives → DEUX baies, dont la Baie Phénix sur l'ACE de l'ACE", () => {
        const rows = itemsOf(true)
        const berries = rows.filter((r) => r.item?.startsWith("baie_"))
        expect(berries).toHaveLength(2)
        // La dernière chimère du couloir est la plus forte : c'est elle qui se relève.
        expect(rows[rows.length - 1]).toMatchObject({ name: "Voltombre", item: "baie_phenix" })
    })

    it("baies inactives → plus une seule (c'est bien ce drapeau qui décide, pas autre chose)", () => {
        expect(itemsOf(false).filter((r) => r.item?.startsWith("baie_"))).toHaveLength(0)
    })

    it("les objets PASSIFS, eux, sont posés dans les deux cas", () => {
        for (const berries of [true, false]) {
            const withItem = itemsOf(berries).filter((r) => r.item && !r.item.startsWith("baie_"))
            expect(withItem.length, `baies=${berries}`).toBeGreaterThan(0)
        }
    })
})
