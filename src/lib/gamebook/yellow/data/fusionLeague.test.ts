import { describe, it, expect } from "vitest"
import {
    FUSION_LEAGUE, FUSION_TIERS, FUSION_BOSS_PAIRS, allFusionLeaguePairs,
    buildFusionLeagueTeam, disposeFusionLeagueTeam,
    FUSION_TIER_ORDER, FUSION_TIER_MARKER, FUSION_PLATINE_OPEN_MARKER,
    activeFusionTier, previousFusionTier, isTopFusionTier,
    PLATINE_ACE_PAIRS, buildPlatineAceTeam,
} from "./fusionLeague"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { computeFusion } from "./fusionSpecies"
import { fusionParentFromInstance } from "./fusionMon"
import { createMonInstance } from "../battle/factory"

describe("Ligue de Fusion — data", () => {
    it("30 fusions Johto : parents RÉUTILISABLES (éphémères, invisibles), seuls les NOMS restent uniques", () => {
        const pairs = allFusionLeaguePairs()
        expect(pairs.length).toBe(30)
        const parents = pairs.flatMap((p) => [p.a, p.b])
        expect(parents.length).toBe(60)
        // Ligue Or/Argent : un parent peut nourrir plusieurs fusions/dresseurs (cf. en-tête fusionLeague.ts).
        //   L'invariant player-facing n'est donc PLUS l'unicité des parents mais l'unicité des NOMS de fusion.
        const names = pairs.map((p) => p.name)
        expect(new Set(names).size).toBe(30)
    })

    it("INVARIANT 1-par-parent : chaque fusion curée (Ligue + boss) prend ≥1 type de CHAQUE parent", () => {
        for (const p of [...allFusionLeaguePairs(), ...FUSION_BOSS_PAIRS]) {
            const spA = getSpecies(p.a)!, spB = getSpecies(p.b)!
            const r = computeFusion(
                fusionParentFromInstance(createMonInstance(p.a, 100)),
                fusionParentFromInstance(createMonInstance(p.b, 100)),
            )
            expect(r.types.length, `${p.name}: 1-2 types`).toBeGreaterThanOrEqual(1)
            expect(r.types.length, `${p.name}: 1-2 types`).toBeLessThanOrEqual(2)
            expect(r.types.some((t) => spA.types.includes(t)), `${p.name}: ≥1 type de ${spA.name}`).toBe(true)
            expect(r.types.some((t) => spB.types.includes(t)), `${p.name}: ≥1 type de ${spB.name}`).toBe(true)
        }
    })

    it("order-independent : chaque fusion curée (Ligue + boss + épreuve) a le MÊME set de types quel que soit l'ordre des parents", () => {
        const FPI = (id: string) => fusionParentFromInstance(createMonInstance(id, 100))
        const trial = [{ a: "tonytony", b: "calderont", name: "Tonyront" }, { a: "maitrezenc", b: "hebulmin", name: "Maîtrelmin" }]
        for (const p of [...allFusionLeaguePairs(), ...FUSION_BOSS_PAIRS, ...trial]) {
            const ab = computeFusion(FPI(p.a), FPI(p.b)).types
            const ba = computeFusion(FPI(p.b), FPI(p.a)).types
            expect([...ab].sort(), `${p.name}: SET ordre-indépendant`).toEqual([...ba].sort())
        }
    })

    it("toutes les espèces parents existent + 30 noms de fusion distincts", () => {
        for (const p of allFusionLeaguePairs()) {
            expect(getSpecies(p.a), `parent ${p.a}`).not.toBeNull()
            expect(getSpecies(p.b), `parent ${p.b}`).not.toBeNull()
        }
        const names = allFusionLeaguePairs().map((p) => p.name)
        expect(new Set(names).size).toBe(30)
    })

    it("chaque dresseur bâtit son équipe (bronze) : bon nombre, noms FIGÉS, niveau du palier", () => {
        for (const tr of FUSION_LEAGUE) {
            const team = buildFusionLeagueTeam(tr.key, "bronze")
            try {
                expect(team.length).toBe(tr.pairs.length)
                team.forEach((f, i) => {
                    const sp = getSpecies(f.speciesId)
                    expect(sp).not.toBeNull()
                    expect(sp!.name).toBe(tr.pairs[i].name)          // nom figé appliqué
                    expect(f.instance.level).toBe(FUSION_TIERS.bronze.level) // niveau = max(parents) = palier
                    expect(f.instance.frozenStats).toBeDefined()
                    expect(f.instance.frozenSpd).toBeUndefined()     // Spéciale unique : plus de SpD séparée
                })
            } finally {
                disposeFusionLeagueTeam(team)
            }
            // dé-fusion propre : les espèces disparaissent du registre
            for (const f of team) expect(getSpecies(f.speciesId)).toBeNull()
        }
    })

    it("thème PSY de WILL respecté ; les autres dresseurs Johto ont des équipes de types MIXTES (comme en O/A)", () => {
        // Seul WILL garde un type uniforme (PSY) : l'engine dérive les types des stats, donc Koga/Bruno/Karen/Lance
        // sortent des équipes hétéroclites — exactement comme leurs vrais Conseils 4 d'Or/Argent (types mêlés).
        const will = buildFusionLeagueTeam("will", "bronze")
        try {
            for (const f of will) expect(getSpecies(f.speciesId)!.types, `${getSpecies(f.speciesId)!.name} garde PSY`).toContain("PSY")
        } finally { disposeFusionLeagueTeam(will) }
        // Les 5 clés attendues existent avec leur theme lore.
        const themes = Object.fromEntries(FUSION_LEAGUE.map((t) => [t.key, t.theme]))
        expect(themes).toMatchObject({ will: "PSY", koga: "POISON", bruno: "COMBAT", karen: "TÉNÈBRES", lance: "DRAGON" })
    })

    it("scaling des paliers : Or (niv 100) > Bronze (niv 80), stats plus hautes", () => {
        const bronze = buildFusionLeagueTeam("will", "bronze")
        const or = buildFusionLeagueTeam("will", "or")
        try {
            expect(bronze[0].instance.level).toBe(80)
            expect(or[0].instance.level).toBe(100)
            // même fusion (Divinaquil), parents plus forts → PV gelés plus hauts en Or.
            expect(or[0].instance.frozenStats!.hp).toBeGreaterThan(bronze[0].instance.frozenStats!.hp)
        } finally {
            disposeFusionLeagueTeam(bronze)
            disposeFusionLeagueTeam(or)
        }
    })
})

// PALIER PLATINE (Sartay 11/09) - le TRONE, 4e cran de l echelle. Il est POSE mais VERROUILLE : ses adversaires
// (ACE + les equipes figees des champions OR) n existent pas encore. Sans ce verrou, tout joueur ayant deja boucle
// l OR basculerait instantanement en platine et re-combattrait le Conseil en boucle - d ou le test central ci-dessous.
describe("Ligue de Fusion - palier PLATINE (pose, verrouille)", () => {
    const cleared = (...marks: string[]) => (m: string) => marks.includes(m)
    const ALL_TIERS = [FUSION_TIER_MARKER.bronze, FUSION_TIER_MARKER.argent, FUSION_TIER_MARKER.or]

    it("l echelle compte 4 crans, et chacun a son libelle + son marqueur", () => {
        expect([...FUSION_TIER_ORDER]).toEqual(["bronze", "argent", "or", "platine"])
        expect(FUSION_TIERS.platine.label).toBe("Platine")
        expect(FUSION_TIER_MARKER.platine).toBe("fusleague_platine")
        for (const t of FUSION_TIER_ORDER) expect(FUSION_TIERS[t]).toBeTruthy()
    })

    it("VERROU : or boucle SANS le marqueur d ouverture -> on reste sur OR (prod inchangee)", () => {
        expect(activeFusionTier(cleared(...ALL_TIERS))).toBe("or")
    })

    it("le marqueur d ouverture fait basculer en PLATINE", () => {
        expect(activeFusionTier(cleared(...ALL_TIERS, FUSION_PLATINE_OPEN_MARKER))).toBe("platine")
    })

    it("le marqueur d ouverture ne SAUTE PAS les paliers inferieurs", () => {
        expect(activeFusionTier(cleared(FUSION_PLATINE_OPEN_MARKER))).toBe("bronze")
        expect(activeFusionTier(cleared(FUSION_TIER_MARKER.bronze, FUSION_PLATINE_OPEN_MARKER))).toBe("argent")
        expect(activeFusionTier(cleared(FUSION_TIER_MARKER.bronze, FUSION_TIER_MARKER.argent, FUSION_PLATINE_OPEN_MARKER))).toBe("or")
    })

    it("previousFusionTier : le REFLET affronte le roster du cran d en dessous", () => {
        expect(previousFusionTier("bronze")).toBeUndefined()
        expect(previousFusionTier("argent")).toBe("bronze")
        expect(previousFusionTier("or")).toBe("argent")
        expect(previousFusionTier("platine")).toBe("or") // en platine, ton reflet serait ton roster OR
    })

    it("isTopFusionTier : platine herite du budget d objets maximal de l OR", () => {
        expect(isTopFusionTier("platine")).toBe(true)
        expect(isTopFusionTier("or")).toBe(true)
        expect(isTopFusionTier("argent")).toBe(false)
        expect(isTopFusionTier("bronze")).toBe(false)
    })
})

// ACE, PORTIER DU TRONE (palier platine). Son equipe melange ses PANTHERES signature, les legendaires et une
// fusion curee. Les exceptions shiny voulues par Sartay (Ukognofy et Galijah x Flamarokto en normaux) creent une
// COURBE MONTANTE : sans elles, l ACE final n aurait pas ete le plus fort de sa propre salle.
describe("Ligue de Fusion - equipe PLATINE d ACE", () => {
    it("6 fusions, movesets de 4, ACE final = les pantheres (sa signature)", () => {
        expect(PLATINE_ACE_PAIRS).toHaveLength(6)
        for (const p of PLATINE_ACE_PAIRS) expect(p.moves).toHaveLength(4)
        const ace = PLATINE_ACE_PAIRS[PLATINE_ACE_PAIRS.length - 1]
        expect([ace.a, ace.b].sort()).toEqual(["ombrapanthe", "voltapanthe"])
    })

    it("la puissance MONTE du 1er au dernier (crescendo, pas un mur plat)", () => {
        const team = buildPlatineAceTeam()
        const bst = team.map((f) => { const s = f.result.stats; return s.hp + s.atk + s.def + s.spe + s.spc })
        expect(bst).toEqual([...bst].sort((a, b) => a - b)) // strictement croissant
        expect(bst[0]).toBeLessThan(2000)      // une vraie marche d entree
        expect(bst[5]).toBeGreaterThan(2400)   // un vrai climax
        disposeFusionLeagueTeam(team)
    })

    it("CHAQUE fusion a au moins un STAB offensif (transmutation comprise)", () => {
        const team = buildPlatineAceTeam()
        for (const f of team) {
            const types = f.result.types as string[]
            const stab = f.instance.moves.filter((slot) => {
                const mv = getMove(slot.moveId)!
                const eff = f.instance.moveTypeOverride?.[slot.moveId] ?? mv.type
                return (mv.power ?? 0) > 0 && types.includes(eff)
            })
            expect(stab.length, `${f.result.name} sans STAB`).toBeGreaterThan(0)
        }
        disposeFusionLeagueTeam(team)
    })

    it("Cendrecerf : son Lance-Soleil est bien TRANSMUTE en TENEBRES", () => {
        const team = buildPlatineAceTeam()
        const cc = team.find((f) => f.result.name === "Cendrecerf")!
        expect(cc.instance.moveTypeOverride?.["lance_soleil"]).toBe("TENEBRES")
        disposeFusionLeagueTeam(team)
    })

    it("Gekaucke sort bien en ROCHE/EAU (le role tank_atk evite le basculement en FEU)", () => {
        const team = buildPlatineAceTeam()
        const i = PLATINE_ACE_PAIRS.findIndex((p) => p.a === "gekraise" && p.b === "geaucke")
        const g = team[i]
        expect([...g.result.types].sort()).toEqual(["EAU", "ROCHE"])
        disposeFusionLeagueTeam(team)
    })

    it("budget platine = celui de l OR : 2 baies dont la Phenix sur l ACE", () => {
        const team = buildPlatineAceTeam(0, true)
        expect(team[team.length - 1].instance.heldItem).toBe("baie_phenix")
        disposeFusionLeagueTeam(team)
    })
})
