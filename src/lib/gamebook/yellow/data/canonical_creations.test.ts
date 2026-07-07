// Créations de joueur CANONISÉES (post-Ligue) : lignées Gavillus (Vol/Roche) & Goatiny→Mouflorage (Sol/Élec).
// Vérifie la forme, le gate Champion (visibleDexSpecies/compteur), l'éligibilité Zone de Combat, et le design
// du contre (Mouflorage mure Gavillus). Lecture pure des données + stores.
import { describe, it, expect } from "vitest"
import { SPECIES, visibleDexSpecies, isDexHidden, CANONICAL_NEMESIS } from "./species"
import { getMove } from "./moves"
import { speciesAtLevel } from "./ace"
import { hydratePokedex, pokedexCompletion } from "../store/pokedexStore"
import { typeEffectiveness, moveCategory } from "../battle/typeChart"

const CANON = ["gavillus", "crocodaillus", "alirocaillus", "goatiny", "mouflorage"]
const bst = (id: string) => { const b = SPECIES[id].baseStats; return b.hp + b.atk + b.def + b.spe + b.spc }

describe("Créations canonisées — lignées Gavillus & Goatiny", () => {
    it("Lignée Gavillus : Vol/Roche, BST 310/401/455, évolutions 22/40, dexNo 139-141", () => {
        for (const id of ["gavillus", "crocodaillus", "alirocaillus"]) expect(SPECIES[id].types).toEqual(["VOL", "ROCHE"])
        expect(bst("gavillus")).toBe(310)
        expect(bst("crocodaillus")).toBe(401)
        expect(bst("alirocaillus")).toBe(455)
        expect([SPECIES.gavillus.dexNo, SPECIES.crocodaillus.dexNo, SPECIES.alirocaillus.dexNo]).toEqual([139, 140, 141])
        expect(SPECIES.gavillus.evolution).toEqual({ toId: "crocodaillus", method: { kind: "LEVEL", level: 22 } })
        expect(SPECIES.crocodaillus.evolution).toEqual({ toId: "alirocaillus", method: { kind: "LEVEL", level: 40 } })
        expect(SPECIES.alirocaillus.evolution).toBeUndefined()
    })

    it("Lignée Goatiny : Sol/Élec, BST 263/424, évolution 30, dexNo 142-143", () => {
        expect(SPECIES.goatiny.types).toEqual(["SOL", "ELEC"])
        expect(SPECIES.mouflorage.types).toEqual(["SOL", "ELEC"])
        expect(bst("goatiny")).toBe(263)
        expect(bst("mouflorage")).toBe(424)
        expect([SPECIES.goatiny.dexNo, SPECIES.mouflorage.dexNo]).toEqual([142, 143])
        expect(SPECIES.goatiny.evolution).toEqual({ toId: "mouflorage", method: { kind: "LEVEL", level: 30 } })
        expect(SPECIES.mouflorage.evolution).toBeUndefined()
    })

    it("les 5 sont postLeague, NON exclusives, NON runTwoOnly (→ éligibles Zone de Combat)", () => {
        for (const id of CANON) {
            expect(SPECIES[id].postLeague).toBe(true)
            expect(SPECIES[id].exclusive).toBeFalsy()   // non-exclusive → apparaissent bien dans le pool frontier
            expect(SPECIES[id].runTwoOnly).toBeFalsy()
        }
    })

    it("dexNo uniques dans tout le registre (pas de collision)", () => {
        const nums = Object.values(SPECIES).map((s) => s.dexNo)
        expect(new Set(nums).size).toBe(nums.length)
    })

    it("toutes les attaques de learnset existent (pas de moveId fantôme)", () => {
        for (const id of CANON) for (const l of SPECIES[id].learnset) {
            expect(getMove(l.moveId), `${id}:${l.moveId}`).toBeTruthy()
        }
    })

    it("GATE POST-LIGUE : invisibles au dex tant qu'on n'est pas Champion, révélées après le sacre", () => {
        const notChamp = visibleDexSpecies([], false).map((s) => s.id)
        for (const id of CANON) expect(notChamp).not.toContain(id)
        const champ = visibleDexSpecies([], true).map((s) => s.id)
        for (const id of CANON) expect(champ).toContain(id)
        // repli défensif : une espèce POSSÉDÉE reste visible même sans être Champion
        const owned = visibleDexSpecies(["mouflorage"], false).map((s) => s.id)
        expect(owned).toContain("mouflorage")
        expect(owned).not.toContain("gavillus")
    })

    it("isDexHidden : masqué hors Champion, révélé au sacre OU si possédé (anti-spoiler chaîne d'évolution)", () => {
        for (const id of CANON) {
            expect(isDexHidden(SPECIES[id], [], false)).toBe(true)    // non-Champion, non possédé → scellé (masque le stade voisin dans la chaîne)
            expect(isDexHidden(SPECIES[id], [], true)).toBe(false)    // Champion → révélé
            expect(isDexHidden(SPECIES[id], [id], false)).toBe(false) // possédé → révélé même hors Champion
        }
        expect(isDexHidden(SPECIES.feuillichot, [], false)).toBe(false) // une espèce standard n'est jamais scellée
    })

    it("compteur Pokédex : +5 au sacre (les post-Ligue rentrent dans le total), pas avant", () => {
        hydratePokedex({ seen: [], caught: [] })
        const before = pokedexCompletion(false).total
        const after = pokedexCompletion(true).total
        expect(after).toBe(before + 5)
    })

    it("RUN 2 : les créations post-Ligue ET les exclusifs run-2 sont RÉVÉLÉS (le joueur y est ex-champion)", () => {
        // hors run 2, non-Champion → les postLeague sont masqués
        for (const id of CANON) expect(isDexHidden(SPECIES[id], [], false, false)).toBe(true)
        // en run 2 → révélés
        for (const id of CANON) expect(isDexHidden(SPECIES[id], [], false, true)).toBe(false)
        // les exclusifs runTwoOnly : cachés hors run 2, révélés en run 2 (même non capturés)
        expect(isDexHidden(SPECIES.ukognos, [], false, false)).toBe(true)
        expect(isDexHidden(SPECIES.ukognos, [], false, true)).toBe(false)
        const run2 = visibleDexSpecies([], false, true).map((s) => s.id)
        for (const id of [...CANON, "ukognos", "merorem", "gekraise"]) expect(run2).toContain(id)
    })

    it("NÉMÉSIS CANONIQUE : Gavillus (tous stades) → Goatiny, qu'ACE field au bon stade (Mouflorage en haut niveau)", () => {
        expect(CANONICAL_NEMESIS.gavillus).toBe("goatiny")
        expect(CANONICAL_NEMESIS.crocodaillus).toBe("goatiny")
        expect(CANONICAL_NEMESIS.alirocaillus).toBe("goatiny")
        // ACE field le némésis via speciesAtLevel → Goatiny bas niveau, Mouflorage dès l'évolution (30)
        expect(speciesAtLevel("goatiny", 5)).toBe("goatiny")
        expect(speciesAtLevel("goatiny", 50)).toBe("mouflorage")
    })

    it("DESIGN DU CONTRE : Mouflorage (Sol/Élec) mure Gavillus (Vol/Roche)", () => {
        // les STAB physiques de Gavillus (Vol + Roche) sont à moitié encaissés par Mouflorage
        expect(typeEffectiveness("VOL", ["SOL", "ELEC"])).toBeCloseTo(0.5)
        expect(typeEffectiveness("ROCHE", ["SOL", "ELEC"])).toBeCloseTo(0.5)
        // l'Élec (spécial) de Mouflorage frappe Gavillus en super-efficace
        expect(typeEffectiveness("ELEC", ["VOL", "ROCHE"])).toBe(2)
        // Gavillus est IMMUNISÉ au Sol → le Sol de Mouflorage est un bouclier, pas une arme
        expect(typeEffectiveness("SOL", ["VOL", "ROCHE"])).toBe(0)
        // catégories : arme de Mouflorage = Élec SPÉCIAL (sublimé par SPÉ 130) ; STAB de Gavillus = physiques (ATQ 135)
        expect(moveCategory("ELEC")).toBe("SPECIAL")
        expect(moveCategory("VOL")).toBe("PHYSICAL")
        expect(moveCategory("ROCHE")).toBe("PHYSICAL")
        expect(moveCategory("SOL")).toBe("PHYSICAL")
    })
})
