import { describe, it, expect } from "vitest"
import {
    PLATINE_THRONE_WORLD, encodeThrone, decodeThrone, claimThrone,
    awardFailurePoint, reignDays, reignLabel, throneScore,
} from "./platineThrone"
import { emptyLedger, recordHit, topHits, bestHitOverall, ledgerTotals } from "./platineLedger"
import type { FusionChampionMon } from "../storage/save"
import { openPlatineIfOrCleared } from "../store/playerStore"

const mon = (name: string): FusionChampionMon => ({
    name, sprite: "/x.png", types: ["TENEBRES"], level: 100,
    stats: { hp: 500, atk: 300, def: 300, spe: 400, spc: 700 }, moves: ["Lance-Flammes"],
})
const T0 = new Date("2026-09-01T12:00:00.000Z")
const day = (n: number) => new Date(T0.getTime() + n * 86400000)

describe("platineThrone — le règne", () => {
    it("le monde de stockage n'est PAS préfixé « fusion: » (sinon le Hall of Fame casserait dessus)", () => {
        // La route fusion-hall-of-fame ramasse tout ce qui commence par "fusion:" et attend un TABLEAU ;
        // notre payload est un OBJET. Les deux mondes doivent rester étanches.
        expect(PLATINE_THRONE_WORLD).toBe("platine")
        expect(PLATINE_THRONE_WORLD.startsWith("fusion:")).toBe(false)
    })

    it("un nouveau règne part de zéro point, chrono lancé maintenant", () => {
        const s = claimThrone([mon("A"), mon("B")], "sheet#0,1,1", T0)
        expect(s.points).toBe(0)
        expect(s.sinceAt).toBe(T0.toISOString())
        expect(s.team).toHaveLength(2)
        expect(s.avatar).toBe("sheet#0,1,1")
    })

    it("un challenger qui échoue rapporte +1 au tenant", () => {
        const s = claimThrone([mon("A")], undefined, T0)
        expect(awardFailurePoint(s, "challenger", "tenant").points).toBe(1)
    })

    it("le TENANT ne peut PAS se créditer lui-même (sinon il perdrait exprès en boucle)", () => {
        const s = claimThrone([mon("A")], undefined, T0)
        expect(awardFailurePoint(s, "tenant", "tenant").points).toBe(0)
        expect(awardFailurePoint(s, "", "tenant").points).toBe(0) // challenger inconnu → rien
    })

    it("la durée du règne se compte en jours pleins", () => {
        const s = claimThrone([mon("A")], undefined, T0)
        expect(reignDays(s, T0)).toBe(0)
        expect(reignDays(s, day(1))).toBe(1)
        expect(reignDays(s, day(12))).toBe(12)
        expect(reignLabel(s, T0)).toBe("sacré aujourd'hui")
        expect(reignLabel(s, day(1))).toBe("Maître depuis 1 jour")
        expect(reignLabel(s, day(12))).toBe("Maître depuis 12 jours")
    })

    it("le score de règne : repousser du monde vaut plus que laisser le temps passer", () => {
        const calme = claimThrone([mon("A")], undefined, T0)              // 0 point, 20 jours
        const defendu = awardFailurePoint(claimThrone([mon("A")], undefined, T0), "c", "t") // 1 point, 0 jour
        expect(throneScore(calme, day(20))).toBe(20)
        expect(throneScore(defendu, T0)).toBe(10)
        // 3 challengers repoussés le jour même battent 20 jours de calme plat
        let actif = claimThrone([mon("A")], undefined, T0)
        for (const c of ["c1", "c2", "c3"]) actif = awardFailurePoint(actif, c, "t")
        expect(throneScore(actif, T0)).toBeGreaterThan(throneScore(calme, day(20)))
    })

    it("aller-retour sérialisation, et lecture DÉFENSIVE d'un payload abîmé", () => {
        const s = awardFailurePoint(claimThrone([mon("A")], "sk", T0), "c", "t")
        expect(decodeThrone(encodeThrone(s))).toEqual(s)
        // Un trône illisible dégrade en « personne sur le trône », jamais en exception.
        expect(decodeThrone(null)).toBeNull()
        expect(decodeThrone("pas du json")).toBeNull()
        expect(decodeThrone("[]")).toBeNull()          // un TABLEAU n'est pas un trône
        expect(decodeThrone('{"team":"x"}')).toBeNull() // équipe non-tableau
        // Points négatifs / manquants → 0, jamais de score fantaisiste.
        expect(decodeThrone('{"team":[],"points":-5}')!.points).toBe(0)
        expect(decodeThrone('{"team":[]}')!.points).toBe(0)
    })
})

describe("platineLedger — le générique des meilleurs coups", () => {
    const hit = (name: string, damage: number, move = "Lance-Soleil", target = "X", room = "ACE") =>
        ({ name, move, damage, target, room })

    it("ne garde que le PLUS GROS coup de chaque chimère", () => {
        let l = emptyLedger()
        l = recordHit(l, "mine", hit("Orochitachi", 200))
        l = recordHit(l, "mine", hit("Orochitachi", 450, "Vague Mentale"))
        l = recordHit(l, "mine", hit("Orochitachi", 120))
        expect(topHits(l, "mine")).toHaveLength(1)
        expect(topHits(l, "mine")[0].damage).toBe(450)
        expect(topHits(l, "mine")[0].move).toBe("Vague Mentale")
    })

    it("rater n'est pas un haut fait : les coups à 0 sont ignorés", () => {
        let l = recordHit(emptyLedger(), "mine", hit("A", 0))
        l = recordHit(l, "mine", hit("B", -10))
        l = recordHit(l, "mine", { ...hit("", 500) })
        expect(topHits(l, "mine")).toHaveLength(0)
    })

    it("les deux camps sont comptés séparément", () => {
        let l = recordHit(emptyLedger(), "mine", hit("A", 300))
        l = recordHit(l, "foes", hit("Voltombre", 800))
        expect(topHits(l, "mine")[0].name).toBe("A")
        expect(topHits(l, "foes")[0].name).toBe("Voltombre")
        expect(ledgerTotals(l)).toEqual({ mine: 300, foes: 800 })
    })

    it("LE coup du parcours, tous camps confondus", () => {
        let l = recordHit(emptyLedger(), "mine", hit("A", 300))
        l = recordHit(l, "foes", hit("Voltombre", 800))
        expect(bestHitOverall(l)).toMatchObject({ name: "Voltombre", side: "foes", damage: 800 })
        // à égalité, c'est TON générique : tu passes devant
        const eg = recordHit(recordHit(emptyLedger(), "mine", hit("A", 500)), "foes", hit("B", 500))
        expect(bestHitOverall(eg)!.side).toBe("mine")
        expect(bestHitOverall(emptyLedger())).toBeNull()
    })

    it("le registre est IMMUABLE (il traverse un store sans surprise)", () => {
        const a = emptyLedger()
        const b = recordHit(a, "mine", hit("A", 100))
        expect(a.mine).toEqual({})       // l'original n'a pas bougé
        expect(Object.keys(b.mine)).toEqual(["A"])
        const c = recordHit(b, "mine", hit("A", 50)) // coup plus faible → registre inchangé
        expect(c).toBe(b)
    })

    it("le classement est trié et borné", () => {
        let l = emptyLedger()
        for (let i = 0; i < 10; i++) l = recordHit(l, "mine", hit(`M${i}`, 100 + i))
        const top = topHits(l, "mine", 3)
        expect(top.map((h) => h.damage)).toEqual([109, 108, 107])
    })
})

// OUVERTURE DU PALIER. Le marqueur est pose au sacre OR — mais Jacanon et Mools avaient deja boucle l or AVANT
// que le palier existe. Sans rattrapage au chargement, ils devraient refaire toute la Ligue pour y acceder.
describe("platine — ouverture du palier", () => {
    const OR = "fusleague_or", OPEN = "fusleague_platine_open"

    it("un champion OR d avant la feature recoit le marqueur au chargement", () => {
        expect(openPlatineIfOrCleared(["fusleague_bronze", "fusleague_argent", OR])).toContain(OPEN)
    })

    it("sans l or, la porte reste fermee", () => {
        expect(openPlatineIfOrCleared(["fusleague_bronze", "fusleague_argent"])).not.toContain(OPEN)
        expect(openPlatineIfOrCleared([])).toEqual([])
    })

    it("IDEMPOTENT : rien n est duplique si le marqueur est deja la", () => {
        const once = openPlatineIfOrCleared([OR])
        const twice = openPlatineIfOrCleared(once)
        expect(twice.filter((m) => m === OPEN)).toHaveLength(1)
        expect(twice).toEqual(once)
    })

    it("les autres marqueurs sont preserves tels quels", () => {
        const before = ["y_fusion_1", OR, "fusioball_owed"]
        const after = openPlatineIfOrCleared(before)
        for (const m of before) expect(after).toContain(m)
    })
})
