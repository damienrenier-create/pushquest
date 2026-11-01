import { describe, it, expect } from "vitest"
import { SPECIES } from "./species"
import { MOVES, getMove, getMoveByName } from "./moves"
import { CTS } from "./cts"
import { attackCost, QUOTA_STD } from "./combatCostConfig"
import { growthInfo, growthMult } from "./growthCurve"
import { moveEffectTag } from "./moveEffectTag"
import { pickAttackFx } from "./attackAnims"
import { expForLevel } from "../battle/xp"
import { createMonInstance } from "../battle/factory"
import { moveCategoryOf } from "../battle/typeChart"
import { POKE_TYPES, type PokeType, type StatKey } from "../battle/types"
import { VANISH_TURNS_MIN, VANISH_TURNS_MAX, VANISH_ACT_PCT, AI_VANISH_MAX_STREAK, VANISH_LINES, VANISH_UI } from "../battle/vanish"
import { moveOptionsFor } from "../create/customSpecies"
import { existingNemesisBase } from "../create/nemesisArchitect"
import { MP_VERSION } from "../multiplayer/mp"

// NAMIZEUS, décision de Sartay du 01/11/2026 : 85/90/80/115/105, Rancœur Céleste au 50, Raitei au 66, courbe d'XP inchangée,
// signatures refusées au Créateur, némésis d'ACE inchangées pour tout le monde.
const NOT_FOR_FUN = /pompe|squat|quota|séance|sueur|transpir|workout|vraie vie|encod|(?<!\p{L})reps?(?!\p{L})/iu // = funWording.test.ts
const ids = (sp: string, lv: number) => createMonInstance(sp, lv).moves.map((m) => m.moveId)

describe("Namizeus — statistiques, attaques, rythme", () => {
    it("85/90/80/115/105 (BST 475) ; Namicha inchangée", () => {
        expect(SPECIES.namizeus.baseStats).toEqual({ hp: 85, atk: 90, def: 80, spe: 115, spc: 105 })
        expect(Object.values(SPECIES.namizeus.baseStats).reduce((a, b) => a + b, 0)).toBe(475)
        expect(SPECIES.namicha.baseStats).toEqual({ hp: 45, atk: 55, def: 42, spe: 70, spc: 55 })
        expect(SPECIES.namicha.learnset.map((l) => `${l.level}:${l.moveId}`)).toEqual(["1:leche", "1:vive_attaque", "12:mirage", "20:ombre_furtive"])
    })
    it("learnset exact, dans l'ordre (Rancœur Céleste après Onde Folie, Raitei après Frappe de l'Au-delà)", () => {
        expect(SPECIES.namizeus.learnset.map((l) => `${l.level}:${l.moveId}`)).toEqual([
            "1:leche", "1:mirage", "1:ombre_furtive", "1:vive_attaque", "34:fulgurance", "40:ball_ombre",
            "48:onde_folie", "50:rancoeur_celeste", "66:frappe_audela", "66:raitei",
        ])
    })
    it("attaques par défaut (4 dernières apprises) : inchangées jusqu'au 49, puis 50-65 et 66+", () => {
        expect(ids("namizeus", 49)).toEqual(["vive_attaque", "fulgurance", "ball_ombre", "onde_folie"])
        expect(ids("namizeus", 50)).toEqual(["fulgurance", "ball_ombre", "onde_folie", "rancoeur_celeste"])
        expect(ids("namizeus", 65)).toEqual(["fulgurance", "ball_ombre", "onde_folie", "rancoeur_celeste"])
        expect(ids("namizeus", 66)).toEqual(["onde_folie", "rancoeur_celeste", "frappe_audela", "raitei"])
    })
    it("rythme d'XP INCHANGÉ : ×0,90 « modeste » pour les deux stades, malgré le BST 475", () => {
        for (const id of ["namicha", "namizeus"]) {
            expect(growthMult(id), id).toBe(0.9)
            expect(growthInfo(id).tier, id).toBe("modeste")
            expect(growthInfo(id).bst, id).toBe(475)
        }
        for (const lv of [30, 50, 66, 100]) expect(expForLevel(lv, "namizeus")).toBe(Math.round(expForLevel(lv) * 0.9))
    })
})

describe("Raitei et Rancœur Céleste — données", () => {
    it("Raitei : Élec PHYSIQUE (surcharge), 150 / 90, sans effet ; aucun résumé d'effet ; anim de gros coup", () => {
        const r = getMove("raitei")!
        expect(r).toMatchObject({ id: "raitei", name: "Raitei", type: "ELEC", category: "PHYSICAL", power: 150, accuracy: 90 })
        expect(r.effect).toBeUndefined()
        expect(moveCategoryOf(r)).toBe("PHYSICAL")
        expect(moveEffectTag(r)).toBeNull()
        expect(pickAttackFx("raitei").category).toBe("impact_heavy")
    })
    it("Rancœur Céleste : Spectre, statut, 90 % de lancement, coûte EXACTEMENT comme Repos (le maximum), aucun champ de soin/sommeil réutilisé", () => {
        const rc = getMove("rancoeur_celeste")!, repos = getMove("repos")!
        expect(rc).toMatchObject({ id: "rancoeur_celeste", name: "Rancœur Céleste", type: "SPECTRE", power: 0, accuracy: 90, costPower: 100 })
        expect(rc.effect).toEqual({ vanish: true }) // ni healPct (soin immédiat), ni restSleep (sommeil d'1 tour), ni inflictStatus
        for (const lv of [20, 30, 50, 60, 66, 80, 100]) for (const q of [30, 90, QUOTA_STD, 400]) for (const ext of [false, true])
            expect(attackCost(rc, lv, q, 1, ext), `L${lv} q${q} ${ext}`).toBe(attackCost(repos, lv, q, 1, ext))
        expect(pickAttackFx("rancoeur_celeste").profile.onCaster).toBe(true)
    })
    it("résumés d'effet (combat / apprentissage) : clairs, sans code brut", () => {
        const rc = getMove("rancoeur_celeste")!
        expect(moveEffectTag(rc)).toBe("Invisible 1 à 5 tours (intouchable) · 1 chance sur 2 d'agir · puis dort, PV au max")
        expect(moveEffectTag(rc, "short")).toBe("Invisible 1-5 tours · 1 chance sur 2 d'agir · puis dort, PV max")
    })
    it("les textes supposent 1 à 5 tours, 1 chance sur 2, et 2 lancers d'affilée pour l'ordinateur", () => {
        expect([VANISH_TURNS_MIN, VANISH_TURNS_MAX, VANISH_ACT_PCT, AI_VANISH_MAX_STREAK]).toEqual([1, 5, 50, 2])
    })
    it("signatures : seul Namizeus les apprend (50 et 66), aucune CT, jamais proposées au Créateur", () => {
        const learners = (id: string) => Object.values(SPECIES).filter((s) => s.learnset.some((l) => l.moveId === id)).map((s) => s.id)
        expect(learners("rancoeur_celeste")).toEqual(["namizeus"])
        expect(learners("raitei")).toEqual(["namizeus"])
        expect(CTS.some((c) => c.moveId === "rancoeur_celeste" || c.moveId === "raitei")).toBe(false)
        const lines: PokeType[][] = [["SPECTRE"], ["ELEC"], ["SPECTRE", "ELEC"], ["ELEC", "NORMAL"], ["PSY", "ELEC"]]
        for (const t of lines) for (const lv of [18, 48, 54, 66, 100]) {
            const opts = moveOptionsFor(t, lv)
            expect(opts, `${t.join("/")} niv ${lv}`).not.toContain("rancoeur_celeste")
            expect(opts, `${t.join("/")} niv ${lv}`).not.toContain("raitei")
        }
    })
    it("noms FIGÉS : les équipes gelées retrouvent les attaques par leur nom ; aucun doublon de nom dans tout le jeu", () => {
        expect(getMoveByName("Raitei")?.id).toBe("raitei")
        expect(getMoveByName("Rancœur Céleste")?.id).toBe("rancoeur_celeste")
        const names = Object.values(MOVES).map((m) => m.name)
        expect(new Set(names).size).toBe(names.length)
    })
    it("vocabulaire : descriptions, résumés et tous les textes de Rancœur Céleste lisibles en mode fun", () => {
        const texts = [
            getMove("raitei")!.description ?? "", getMove("rancoeur_celeste")!.description ?? "",
            moveEffectTag(getMove("rancoeur_celeste")!) ?? "", moveEffectTag(getMove("rancoeur_celeste")!, "short") ?? "",
            ...Object.values(VANISH_UI),
            ...Object.values(VANISH_LINES).map((f) => (f as (a: string, b: string) => string)("Namizeus", "Nexus-Ball")),
        ]
        for (const t of texts) { expect(t.length).toBeGreaterThan(0); expect(t, t).not.toMatch(NOT_FOR_FUN) }
    })
})

describe("garde-fous : némésis d'ACE et PvP", () => {
    const typings: PokeType[][] = []
    for (let i = 0; i < POKE_TYPES.length; i++) { typings.push([POKE_TYPES[i]]); for (let j = i + 1; j < POKE_TYPES.length; j++) typings.push([POKE_TYPES[i], POKE_TYPES[j]]) }
    const PROFILES: Record<string, Record<StatKey, number>> = {
        flat80: { hp: 80, atk: 80, def: 80, spe: 80, spc: 80 },
        visualAudit: { hp: 80, atk: 100, def: 80, spe: 90, spc: 70 },
        specialSweeper: { hp: 75, atk: 45, def: 70, spe: 110, spc: 130 },
        physBruiser: { hp: 95, atk: 130, def: 90, spe: 60, spc: 50 },
        wallSpecial: { hp: 110, atk: 40, def: 70, spe: 50, spc: 140 },
        fastPhys: { hp: 70, atk: 125, def: 60, spe: 125, spc: 60 },
        wallPhys: { hp: 100, atk: 60, def: 140, spe: 40, spc: 70 },
    }
    it("la lignée Namicha n'est la némésis de personne (7 profils × 171 typages)", () => {
        for (const [name, stats] of Object.entries(PROFILES)) for (const types of typings)
            expect(existingNemesisBase({ types, stats }), `${name} ${types.join("/")}`).not.toBe("namicha")
    })
    it("les créations où Namizeus aurait doublé Oragron gardent leur némésis (lignée Piouflot)", () => {
        expect(existingNemesisBase({ types: ["COMBAT", "VOL"], stats: PROFILES.visualAudit })).toBe("piouflot")
        expect(existingNemesisBase({ types: ["VOL", "INSECTE"], stats: PROFILES.visualAudit })).toBe("piouflot")
        expect(existingNemesisBase({ types: ["EAU", "INSECTE"], stats: PROFILES.physBruiser })).toBe("piouflot")
        expect(existingNemesisBase({ types: ["COMBAT", "VOL"], stats: PROFILES.wallPhys })).toBe("piouflot")
    })
    it("les 12 créations réelles (instantané du 28/10) gardent exactement leur némésis", () => {
        const C: [string, PokeType[], Record<StatKey, number>, string][] = [
            ["Joeyrrant", ["TENEBRES", "GLACE"], { hp: 132, atk: 110, def: 43, spc: 110, spe: 45 }, "forgeotin"],
            ["Guizer", ["EAU", "GLACE"], { hp: 90, atk: 70, def: 80, spc: 132, spe: 70 }, "forgeotin"],
            ["Stashex", ["PSY"], { hp: 80, atk: 30, def: 45, spc: 130, spe: 135 }, "ruffiant"],
            ["Shady", ["NORMAL", "SPECTRE"], { hp: 90, atk: 130, def: 75, spc: 28, spe: 130 }, "snatchacoolt"],
            ["Phoéchaud", ["FEU", "SPECTRE"], { hp: 85, atk: 34, def: 75, spc: 132, spe: 115 }, "lavapetit"],
            ["Ewokid", ["DRAGON", "PLANTE"], { hp: 90, atk: 45, def: 80, spc: 130, spe: 100 }, "ruffiant"],
            ["Dracominus", ["DRAGON", "SPECTRE"], { hp: 105, atk: 45, def: 100, spc: 125, spe: 100 }, "bouh"],
            ["Chadine", ["EAU", "COMBAT"], { hp: 75, atk: 130, def: 70, spc: 49, spe: 90 }, "blaziper"],
            ["Coucouminou", ["PSY", "ELEC"], { hp: 75, atk: 35, def: 70, spc: 132, spe: 110 }, "ruffiant"],
            ["Possyl", ["NORMAL", "SPECTRE"], { hp: 105, atk: 100, def: 115, spc: 85, spe: 50 }, "snatchacoolt"],
            ["Snatchacoolt", ["ELEC", "TENEBRES"], { hp: 132, atk: 15, def: 152, spc: 130, spe: 15 }, "trolystrik"],
            ["Bidouzen", ["PSY", "COMBAT"], { hp: 75, atk: 49, def: 70, spc: 130, spe: 90 }, "draclet"],
        ]
        for (const [name, types, stats, nemesis] of C) expect(existingNemesisBase({ name, types, stats }), name).toBe(nemesis)
    })
    it("protocole PvP relevé (moteur + données changés : un vieil onglet refuse le duel au lieu de se désynchroniser)", () => {
        expect(MP_VERSION).not.toBe("mp-2026-07-20.1")
        expect(MP_VERSION).not.toBe("mp-2026-11-01.1") // 01/11 : les attaques sur soi marchent contre un Daemon invisible
    })
})
