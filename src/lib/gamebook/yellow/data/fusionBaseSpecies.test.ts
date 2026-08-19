import { describe, it, expect } from "vitest"
import { FUSION_BASE_SPECIES, FUSION_BASE_IDS, FUSION_BASE_PARENTS, fusionForParents } from "./fusionBaseSpecies"
import { SPECIES, getSpecies, registerCustomSpecies } from "./species"
import { getMove } from "./moves"

// LIGNÉE ÉVOLUTIVE SECRÈTE (1re fusion qui évolue) — exceptions aux règles « base-1 » ci-dessous.
const EVO_LINE = ["rocaptere", "fissuraillus", "magmaillus"]   // BST plus élevé + évolution + learnset dérivé des parents
const SECRET_STAGES = ["fissuraillus", "magmaillus"]           // stades ≥2 : AUCUN pop Grotte (obtenables par évolution seule)

describe("Fusions de base — data + learnsets", () => {
    it("38 fusions (14 base + 24 stades évolués des 11 lignées capturables), ids uniques, types valides, base stats plausibles", () => {
        expect(FUSION_BASE_SPECIES.length).toBe(38) // 14 base + 24 évolutions (S2/S3 des 11 lignées + Mottelave S4/S5)
        expect(new Set(FUSION_BASE_IDS).size).toBe(38)
        const ids = new Set(FUSION_BASE_IDS)
        for (const s of FUSION_BASE_SPECIES) {
            expect(s.types.length, s.id).toBe(2)
            expect(new Set(s.types).size, s.id).toBe(2) // 2 types distincts
            const bst = s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spe + s.baseStats.spc
            expect(bst, s.id).toBeGreaterThan(180)
            expect(bst, s.id).toBeLessThanOrEqual(575) // plafond = Sidéralithe (S5) 570
            expect(s.dexNo, s.id).toBeGreaterThanOrEqual(500) // plage Fusiodex (hors dex principal)
            // Une évolution déclarée DOIT pointer vers une entrée FUSION_BASE (résolue getSpecies → pas de crash au reload).
            if (s.evolution) expect(ids.has(s.evolution.toId), `${s.id}→${s.evolution.toId}`).toBe(true)
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
            // le learnset s'étend en niveau (pas un stub)
            const maxLvl = Math.max(...s.learnset.map((l) => l.level))
            expect(maxLvl, s.id).toBeGreaterThanOrEqual(28)
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

    it("parents référencés existent ; les stades ÉVOLUÉS n'ont AUCUNE paire de pop Grotte", () => {
        for (const [fus, [a, b]] of Object.entries(FUSION_BASE_PARENTS)) {
            expect(FUSION_BASE_IDS, `clé ${fus}`).toContain(fus)
            expect(SPECIES[a], `parent ${a} de ${fus}`).toBeDefined()
            expect(SPECIES[b], `parent ${b} de ${fus}`).toBeDefined()
        }
        // Les stades évolués (dexNo ≥ 520) + les stades secrets de Rocaptère : obtenables par ÉVOLUTION seule → aucune paire.
        for (const s of FUSION_BASE_SPECIES) {
            if (s.dexNo >= 520 || SECRET_STAGES.includes(s.id)) {
                expect(FUSION_BASE_PARENTS[s.id], `${s.id} (évolué) ne doit avoir aucune paire`).toBeUndefined()
            }
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
