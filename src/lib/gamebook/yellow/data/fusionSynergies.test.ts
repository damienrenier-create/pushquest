import { describe, it, expect, afterEach } from "vitest"
import { computeFusion, fusionWeights, fusionSynergy, tiedFusionTypes, setFusionTypeChoiceResolver, type FusionParent } from "./fusionSpecies"
import type { StatKey } from "../battle/types"

// Génétique boostée + fusions inédites + synergies (07/08). On travaille en stats ÉGALES (100 partout) → le poids
// appliqué se lit directement : fused[stat] = wA·100 + wB·100. Top-3 (hp/atk/déf) = dominant, bas-2 (vit/spé) = récessif.
const EQ: Record<StatKey, number> = { hp: 100, atk: 100, def: 100, spe: 100, spc: 100 }
function P(speciesId: string, opts: { shiny?: boolean; types?: string[] } = {}): FusionParent {
    return { name: speciesId, types: (opts.types ?? ["NORMAL"]) as FusionParent["types"], stats: { ...EQ }, level: 50, moves: [], speciesId, shiny: opts.shiny }
}

describe("génétique de fusion — tiers de poids", () => {
    it("fusionWeights : normal 0.6/0.45 · boosted 0.7/0.5 · shiny 0.8/0.6 · all(mimimoy) 0.7", () => {
        expect(fusionWeights(EQ, "normal").hp).toBe(0.6); expect(fusionWeights(EQ, "normal").spc).toBe(0.45)
        expect(fusionWeights(EQ, "boosted").hp).toBe(0.7); expect(fusionWeights(EQ, "boosted").spc).toBe(0.5)
        expect(fusionWeights(EQ, "shiny").hp).toBe(0.8); expect(fusionWeights(EQ, "shiny").spc).toBe(0.6)
        expect(fusionWeights(EQ, "shiny_synergy").hp).toBe(0.9); expect(fusionWeights(EQ, "shiny_synergy").spc).toBe(0.7)
        const all = fusionWeights(EQ, "all"); expect(Object.values(all).every((w) => w === 0.7)).toBe(true)
    })
    it("paire NORMALE (aucune synergie) → 0.6/0.45", () => {
        const f = computeFusion(P("draclet"), P("nouillon"))
        expect(f.stats.hp).toBe(120)  // dominant : 0.6+0.6
        expect(f.stats.spc).toBe(90)  // récessif : 0.45+0.45
    })
})

describe("fusions INÉDITES nommées (type MONO forcé + boost)", () => {
    it("Cerfeuillu × Pyrokoss → Cendrecerf, TÉNÈBRES mono, boosté", () => {
        const f = computeFusion(P("sylvapuce"), P("pyrokoss"))
        expect(f.name).toBe("Cendrecerf")
        expect(f.types).toEqual(["TENEBRES"])
        expect(f.stats.hp).toBe(140); expect(f.stats.spc).toBe(100) // 0.7/0.5
    })
    it("Cerfeuillu × Razmarée → Bourbicerf, SOL mono", () => {
        const f = computeFusion(P("sylvapuce"), P("razmaree"))
        expect(f.name).toBe("Bourbicerf"); expect(f.types).toEqual(["SOL"]); expect(f.stats.hp).toBe(140)
    })
    it("Pyrokoss × Razmarée → Vaporêve, SPECTRE mono", () => {
        const f = computeFusion(P("pyrokoss"), P("razmaree"))
        expect(f.name).toBe("Vaporêve"); expect(f.types).toEqual(["SPECTRE"]); expect(f.stats.hp).toBe(140)
    })
    it("Crocavern × Alirocaillus → Crocaroc, boosté, type CALCULÉ (pas forcé)", () => {
        const f = computeFusion(P("crocavern", { types: ["SOL"] }), P("alirocaillus", { types: ["VOL", "ROCHE"] }))
        expect(f.name).toBe("Crocaroc"); expect(f.stats.hp).toBe(140)
        expect(f.types.length).toBeGreaterThanOrEqual(1) // type dérivé, non forcé
    })
    it("ordre des parents indifférent (nom/type identiques)", () => {
        expect(computeFusion(P("pyrokoss"), P("sylvapuce")).name).toBe("Cendrecerf")
    })
})

describe("synergies", () => {
    it("2 PANTHÈRES → boosté (0.7/0.5)", () => {
        const f = computeFusion(P("florapanthe", { types: ["PLANTE"] }), P("pyropanthe", { types: ["FEU"] }))
        expect(f.stats.hp).toBe(140); expect(f.stats.spc).toBe(100)
    })
    it("1 seule panthère → PAS de boost", () => {
        expect(computeFusion(P("florapanthe"), P("draclet")).stats.hp).toBe(120)
    })
    it("2 PANTHÈRES SHINY → JACKPOT shiny_synergy (0.9/0.7)", () => {
        const f = computeFusion(P("florapanthe", { shiny: true, types: ["PLANTE"] }), P("pyropanthe", { shiny: true, types: ["FEU"] }))
        expect(f.stats.hp).toBe(180)  // dominant : 0.9+0.9
        expect(f.stats.spc).toBe(140) // récessif : 0.7+0.7
    })
    it("2 shiny SANS synergie → shiny seul (0.8/0.6), pas le jackpot", () => {
        const f = computeFusion(P("draclet", { shiny: true }), P("nouillon", { shiny: true }))
        expect(f.stats.hp).toBe(160)  // 0.8+0.8
        expect(f.stats.spc).toBe(120) // 0.6+0.6
    })
    it("merorem × tonytony → boosté", () => {
        expect(computeFusion(P("merorem"), P("tonytony")).stats.hp).toBe(140)
    })
    it("NOUVELLES paires 08/09 : karatame×bouhbou, namizeus×brookhante, kilipanda×druidours → boostées (0,7/0,5)", () => {
        for (const [a, b] of [["karatame", "bouhbou"], ["namizeus", "brookhante"], ["kilipanda", "druidours"]] as const) {
            expect(computeFusion(P(a), P(b)).stats.hp).toBe(140)   // dominant 0,7+0,7
            expect(computeFusion(P(a), P(b)).stats.spc).toBe(100)  // récessif 0,5+0,5
            expect(computeFusion(P(b), P(a)).stats.hp).toBe(140)   // ordre indifférent
        }
    })
    it("fusionSynergy identifie les 3 nouvelles paires (fête de découverte)", () => {
        expect(fusionSynergy("karatame", "bouhbou")?.label).toBe("la synergie des arts martiaux")
        expect(fusionSynergy("namizeus", "brookhante")?.label).toBe("la synergie des âmes errantes")
        expect(fusionSynergy("kilipanda", "druidours")?.label).toBe("la synergie des ursidés")
    })
    it("MIMIMOY parent → ses stats à 0.7 partout (dominant ET récessif)", () => {
        const f = computeFusion(P("mimimoy"), P("draclet"))
        expect(f.stats.hp).toBe(130)  // mimimoy 0.7 + autre 0.6 (dominant)
        expect(f.stats.spc).toBe(115) // mimimoy 0.7 + autre 0.45 (récessif)
    })
    it("Rochison × Mouflorage → Aimouflon, MÉTAL mono forcé, boosté", () => {
        const f = computeFusion(P("rochison", { types: ["ROCHE", "SOL"] }), P("mouflorage", { types: ["SOL", "ELEC"] }))
        expect(f.name).toBe("Aimouflon"); expect(f.types).toEqual(["METAL"]); expect(f.stats.hp).toBe(140)
    })
    it("CLAN gecko : 2 geckos (n'importe quels éléments) → boosté", () => {
        expect(computeFusion(P("gekraise"), P("gekosmic")).stats.hp).toBe(140)
        expect(computeFusion(P("gekroc"), P("geaucke")).stats.hp).toBe(140)
        expect(computeFusion(P("geckebre"), P("gekosmic")).stats.hp).toBe(140) // ténèbre × psy
    })
    it("Crapôtaure × Uzumaro → Gamabunta (les 2 grenouilles), boosté, type calculé", () => {
        const f = computeFusion(P("crapotaure", { types: ["ROCHE", "EAU"] }), P("uzumaro", { types: ["COMBAT", "EAU"] }))
        expect(f.name).toBe("Gamabunta"); expect(f.stats.hp).toBe(140); expect(f.types.length).toBeGreaterThanOrEqual(1)
    })
    it("Vipember × Nécrocorbe → Orochitachi, boosté, type calculé", () => {
        const f = computeFusion(P("vipember", { types: ["PSY", "FEU"] }), P("necrocorbe", { types: ["VOL", "POISON"] }))
        expect(f.name).toBe("Orochitachi"); expect(f.stats.hp).toBe(140)
    })
    it("Karmaki × Enclumind → Karmind Z, boosté, type calculé", () => {
        const f = computeFusion(P("karmaki", { types: ["PLANTE", "PSY"] }), P("enclumind", { types: ["COMBAT", "PSY"] }))
        expect(f.name).toBe("Karmind Z"); expect(f.stats.hp).toBe(140)
    })
    it("synergies marines + meute → boosté", () => {
        expect(computeFusion(P("leviathonn"), P("mobyd")).stats.hp).toBe(140)
        expect(computeFusion(P("mobyd"), P("orcaline")).stats.hp).toBe(140)
        expect(computeFusion(P("tenebrir"), P("loupyre")).stats.hp).toBe(140)
    })
    it("1 seul gecko / paire marine non listée → PAS de boost", () => {
        expect(computeFusion(P("gekraise"), P("draclet")).stats.hp).toBe(120)
        expect(computeFusion(P("leviathonn"), P("orcaline")).stats.hp).toBe(120) // paire non déclarée
    })
    it("fusionSynergy : identifie le SECRET (fête de découverte) ou null", () => {
        expect(fusionSynergy("sylvapuce", "pyrokoss")).toEqual({ key: "special:Cendrecerf", label: "Cendrecerf" })
        expect(fusionSynergy("florapanthe", "pyropanthe")?.key).toBe("clan:panthere")
        expect(fusionSynergy("gekraise", "gekosmic")?.key).toBe("clan:gecko")
        expect(fusionSynergy("leviathonn", "mobyd")?.key).toBe("pair:leviathonn|mobyd")
        expect(fusionSynergy("mimimoy", "draclet")?.key).toBe("mimimoy")
        expect(fusionSynergy("draclet", "nouillon")).toBeNull() // paire banale = pas de secret
        expect(fusionSynergy("florapanthe", "draclet")).toBeNull() // 1 seule panthère = pas de secret
    })

    it("1 seul shiny → pas le tier shiny (reste normal ici)", () => {
        expect(computeFusion(P("draclet", { shiny: true }), P("nouillon")).stats.hp).toBe(120)
    })
})

// CHOIX DE TYPE (égalités). Avec des stats ÉGALES (EQ 100 partout), repValue est identique pour TOUS les types →
// un parent bi-type est TOUJOURS à égalité → cas idéal pour tester le mécanisme de choix.
describe("choix de type sur égalité", () => {
    afterEach(() => setFusionTypeChoiceResolver(null)) // le résolveur est module-global → on nettoie après chaque test

    it("tiedFusionTypes : 2 types (stats égales) → égalité proposée ; mono-type → aucun choix", () => {
        expect(tiedFusionTypes(P("x", { types: ["FEU", "EAU"] }))).toEqual(["FEU", "EAU"])
        expect(tiedFusionTypes(P("y", { types: ["FEU"] }))).toEqual([])
    })

    it("sans résolveur : type par défaut = 1er du tableau (comportement d'origine intact)", () => {
        const f = computeFusion(P("aa", { types: ["FEU", "EAU"] }), P("bb", { types: ["PLANTE"] }))
        expect(f.types).toEqual(["FEU", "PLANTE"])
    })

    it("résolveur : le type CHOISI (à égalité) prime pour le parent tête", () => {
        setFusionTypeChoiceResolver((aId) => (aId === "aa" ? { a: "EAU" } : undefined))
        const f = computeFusion(P("aa", { types: ["FEU", "EAU"] }), P("bb", { types: ["PLANTE"] }))
        expect(f.types).toEqual(["EAU", "PLANTE"])
    })

    it("choix ignoré si le type n'appartient pas au parent (garde de validité)", () => {
        setFusionTypeChoiceResolver(() => ({ a: "PLANTE" })) // PLANTE n'est pas un type de aa → ignoré
        const f = computeFusion(P("aa", { types: ["FEU", "EAU"] }), P("bb", { types: ["PLANTE"] }))
        expect(f.types).toEqual(["FEU", "PLANTE"])
    })

    it("choix des DEUX parents indépendants", () => {
        setFusionTypeChoiceResolver(() => ({ a: "EAU", b: "GLACE" }))
        const f = computeFusion(P("aa", { types: ["FEU", "EAU"] }), P("bb", { types: ["ELEC", "GLACE"] }))
        expect(f.types).toEqual(["EAU", "GLACE"])
    })
})
