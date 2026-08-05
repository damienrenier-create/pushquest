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

    it("compteur Pokédex : les post-Ligue rentrent dans le total au sacre, pas avant", () => {
        hydratePokedex({ seen: [], caught: [] })
        const before = pokedexCompletion(false).total
        const after = pokedexCompletion(true).total
        // Saut = nb d'espèces RÉVÉLÉES au sacre (masquées hors Champion → visibles au Champion). Dérivé dynamiquement
        // via isDexHidden → robuste aux futures canonisations (ne casse plus quand on ajoute des créations postLeague).
        const revealedAtChamp = Object.values(SPECIES).filter((s) => isDexHidden(s, [], false) && !isDexHidden(s, [], true)).length
        expect(after).toBe(before + revealedAtChamp)
        expect(revealedAtChamp).toBeGreaterThanOrEqual(5) // ≥ lignées Gavillus/Goatiny + les créations canonisées
    })

    it("Phoéchaud (Guillaume) + némésis Léviabysse : runThreeOnly → exclus des totaux Pokédex run 1/2 (anti-inflation score)", () => {
        for (const id of ["phoechaudi", "phoechaudii", "phoechaudiii", "obscurene", "abyssombre", "leviabysse"]) {
            expect(SPECIES[id].runThreeOnly, id).toBe(true)
            expect(isDexHidden(SPECIES[id], [], false, false, false), `${id} run1`).toBe(true) // run 1 → masqué
            expect(isDexHidden(SPECIES[id], [], true, true, false), `${id} run2`).toBe(true)    // run 2 (champion) → TOUJOURS masqué (runThreeOnly, pas postLeague)
            expect(isDexHidden(SPECIES[id], [], false, false, true), `${id} run3`).toBe(false)  // run 3 → visible
        }
        // némésis branchée : Phoéchaud (canonique) → Obscurène (stade 1 de Léviabysse)
        expect(CANONICAL_NEMESIS.phoechaudi).toBe("obscurene")
        expect(CANONICAL_NEMESIS.phoechaudiii).toBe("obscurene")
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

    it("Lignée Joeyrrant (Jacanon) : TÉNÈBRES/FEU→TÉNÈBRES/GLACE, BST 198/300/440, évo 22/40, dexNo 200-202, runThreeOnly", () => {
        // stade 1 = TÉNÈBRES/FEU, puis la lignée passe TÉNÈBRES/GLACE dès le stade 2 (fidèle à buildCustomSpecies)
        expect(SPECIES.joeyrrant.types).toEqual(["TENEBRES", "FEU"])
        expect(SPECIES.wallabisan.types).toEqual(["TENEBRES", "GLACE"])
        expect(SPECIES.kangoudead.types).toEqual(["TENEBRES", "GLACE"])
        expect(bst("joeyrrant")).toBe(198)
        expect(bst("wallabisan")).toBe(300)
        expect(bst("kangoudead")).toBe(440)
        expect([SPECIES.joeyrrant.dexNo, SPECIES.wallabisan.dexNo, SPECIES.kangoudead.dexNo]).toEqual([200, 201, 202])
        expect(SPECIES.joeyrrant.evolution).toEqual({ toId: "wallabisan", method: { kind: "LEVEL", level: 22 } })
        expect(SPECIES.wallabisan.evolution).toEqual({ toId: "kangoudead", method: { kind: "LEVEL", level: 40 } })
        expect(SPECIES.kangoudead.evolution).toBeUndefined()
        // talent fidèle + learnset partagé (identique aux 3 stades) + tous les moves existent
        for (const id of ["joeyrrant", "wallabisan", "kangoudead"]) {
            expect(SPECIES[id].secretTalent).toBe("chair_coriace")
            expect(SPECIES[id].growthRate).toBe("slow")
            for (const l of SPECIES[id].learnset) expect(getMove(l.moveId), `${id}:${l.moveId}`).toBeTruthy()
        }
        expect(SPECIES.joeyrrant.learnset).toEqual(SPECIES.kangoudead.learnset)
        // runThreeOnly (comme les autres créations users) → masqué run 1/2, révélé run 3 (n'infle pas le leaderboard)
        for (const id of ["joeyrrant", "wallabisan", "kangoudead"]) {
            expect(SPECIES[id].runThreeOnly, id).toBe(true)
            expect(isDexHidden(SPECIES[id], [], false, false, false), `${id} run1`).toBe(true)
            expect(isDexHidden(SPECIES[id], [], true, true, false), `${id} run2 champion`).toBe(true)
            expect(isDexHidden(SPECIES[id], [], false, false, true), `${id} run3`).toBe(false)
        }
        // NÉMÉSIS CANONIQUE : lignée Tauricendre (Brasicow→Tauricendre, FEU/COMBAT) — hard-counter GLACE/TÉNÈBRES
        for (const id of ["joeyrrant", "wallabisan", "kangoudead"]) expect(CANONICAL_NEMESIS[id]).toBe("brasicow")
        expect(speciesAtLevel("brasicow", 5)).toBe("brasicow")
        expect(speciesAtLevel("brasicow", 50)).toBe("tauricendre")
        // Tauricendre (FEU/COMBAT) contre bien Kangoudead (TÉNÈBRES/GLACE) : Combat ×4 + Feu ×2, et PAS faible à sa Glace
        expect(typeEffectiveness("COMBAT", ["TENEBRES", "GLACE"])).toBe(4)
        expect(typeEffectiveness("FEU", ["TENEBRES", "GLACE"])).toBe(2)
        expect(typeEffectiveness("GLACE", ["FEU", "COMBAT"])).toBeLessThanOrEqual(1)
    })
})
