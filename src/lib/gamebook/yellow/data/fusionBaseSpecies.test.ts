import { describe, it, expect } from "vitest"
import { FUSION_BASE_SPECIES, FUSION_BASE_IDS, FUSION_BASE_PARENTS, fusionForParents } from "./fusionBaseSpecies"
import { SPECIES, getSpecies, registerCustomSpecies } from "./species"
import { getMove } from "./moves"

// LIGNÉE ÉVOLUTIVE SECRÈTE (1re fusion qui évolue) — exceptions aux règles « base-1 » ci-dessous.
const EVO_LINE = ["rocaptere", "fissuraillus", "magmaillus"]   // BST plus élevé + évolution + learnset dérivé des parents
const SECRET_STAGES = ["fissuraillus", "magmaillus"]           // stades ≥2 : AUCUN pop Grotte (obtenables par évolution seule)

describe("Fusions de base — data + learnsets", () => {
    it("14 fusions (5 de base + 7 exclusives de zone + 2 stades évolutifs), ids uniques, types valides, base stats plausibles", () => {
        expect(FUSION_BASE_SPECIES.length).toBe(14) // 12 base-1 + Fissuraillus/Magmaillus (lignée évolutive de Rocaptère)
        expect(new Set(FUSION_BASE_IDS).size).toBe(14)
        for (const s of FUSION_BASE_SPECIES) {
            expect(s.types.length, s.id).toBe(2)
            expect(new Set(s.types).size).toBe(2) // 2 types distincts
            const bst = s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spe + s.baseStats.spc
            if (EVO_LINE.includes(s.id)) {
                expect(bst, s.id).toBeGreaterThan(280) // lignée évolutive : BST plus haut (fusion base×base : 306→414→491)
                expect(bst, s.id).toBeLessThan(560)
            } else {
                expect(bst, s.id).toBeGreaterThan(180) // base-1 plausible
                expect(bst, s.id).toBeLessThan(300)
                expect(s.evolution, s.id).toBeUndefined() // base-1 : pas d'évolution
            }
            expect(s.dexNo, s.id).toBeGreaterThanOrEqual(500) // plage Fusiodex (hors dex principal)
        }
    })

    it("learnsets : tous les moves EXISTENT + STAB présent + montent haut (base-1 ≥84 ; lignée évolutive dérivée des parents)", () => {
        for (const s of FUSION_BASE_SPECIES) {
            for (const l of s.learnset) {
                expect(getMove(l.moveId), `${s.id}:${l.moveId}`).toBeDefined()
            }
            // au moins un move de chaque type de la fusion (STAB)
            for (const t of s.types) {
                const hasStab = s.learnset.some((l) => getMove(l.moveId)?.type === t)
                expect(hasStab, `${s.id} STAB ${t}`).toBe(true)
            }
            // le learnset s'étend jusqu'au haut niveau (la lignée évolutive hérite des paliers de ses parents → cap ≤60)
            const maxLvl = Math.max(...s.learnset.map((l) => l.level))
            expect(maxLvl, s.id).toBeGreaterThanOrEqual(EVO_LINE.includes(s.id) ? 28 : 84)
        }
    })

    it("lignée évolutive Rocaptère → Fissuraillus → Magmaillus : chaîne correcte, BST croissant, stades ≥2 ULTRA SECRETS", () => {
        const byId = Object.fromEntries(FUSION_BASE_SPECIES.map((s) => [s.id, s]))
        expect(byId["rocaptere"].evolution).toEqual({ toId: "fissuraillus", method: { kind: "LEVEL", level: 20 } })
        expect(byId["fissuraillus"].evolution).toEqual({ toId: "magmaillus", method: { kind: "LEVEL", level: 39 } })
        expect(byId["magmaillus"].evolution).toBeUndefined() // stade final
        const bst = (id: string) => { const b = byId[id].baseStats; return b.hp + b.atk + b.def + b.spe + b.spc }
        expect(bst("rocaptere")).toBeLessThan(bst("fissuraillus"))
        expect(bst("fissuraillus")).toBeLessThan(bst("magmaillus"))
        // stades ≥2 = ULTRA SECRETS : aucune paire de pop (obtenables uniquement par évolution) + masqués tant que non capturés
        for (const id of SECRET_STAGES) {
            expect(FUSION_BASE_PARENTS[id], `${id} ne doit avoir AUCUNE paire de pop Grotte`).toBeUndefined()
            expect(byId[id].hiddenUntilCaught, id).toBe(true)
        }
        // Rocaptère (stade 1) reste catchable en Grotte via sa paire de parents (inchangé)
        expect(FUSION_BASE_PARENTS["rocaptere"]).toEqual(["gavillus", "lavapetit"])
    })

    it("fusionForParents résout les paires exclusives de zone (ordre indifférent) → la règle de pop les trouvera", () => {
        expect(fusionForParents("goatiny", "guizer")).toBe("givrasol")     // B2F (audit : le pop tourne maintenant en B2F)
        expect(fusionForParents("guizer", "goatiny")).toBe("givrasol")     // ordre indifférent
        expect(fusionForParents("batchu", "draclet")).toBe("voltaile")     // 1F
        expect(fusionForParents("obscurene", "electroatiss")).toBe("abyssvolt") // B1F-1
        expect(fusionForParents("draclet", "electroatiss")).toBe("dractriss")   // paire de BASE distincte (pas de collision avec Voltaile/Oniridrak)
    })

    it("parents référencés existent, et forment bien les paires", () => {
        // Tous les ids SAUF les stades évolutifs secrets (≥2) ont une paire de pop Grotte.
        expect(Object.keys(FUSION_BASE_PARENTS).sort()).toEqual(FUSION_BASE_IDS.filter((id) => !SECRET_STAGES.includes(id)).sort())
        for (const [fus, [a, b]] of Object.entries(FUSION_BASE_PARENTS)) {
            expect(SPECIES[a], `parent ${a} de ${fus}`).toBeDefined()
            expect(SPECIES[b], `parent ${b} de ${fus}`).toBeDefined()
        }
    })

    it("ANTI-SPOILER : JAMAIS dans SPECIES (source du Pokédex) → 0 fuite dex, même une fois enregistrées custom en jeu", () => {
        // Elles sont enregistrées comme espèces CUSTOM en jeu (reregisterCustomDaemons) → getSpecies les résout.
        // Mais visibleDexSpecies n'itère QUE SPECIES : tant qu'elles n'y sont pas, le Pokédex ne peut PAS les montrer.
        registerCustomSpecies(FUSION_BASE_SPECIES) // simule l'enregistrement in-game
        for (const s of FUSION_BASE_SPECIES) {
            expect(SPECIES[s.id], `${s.id} ne doit JAMAIS être dans SPECIES (source dex)`).toBeUndefined()
            expect(getSpecies(s.id), `${s.id} résolvable en jeu (custom)`).not.toBeNull() // jouable pour les rencontres
        }
    })
})
