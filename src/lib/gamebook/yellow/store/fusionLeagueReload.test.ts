import { describe, it, expect, beforeEach, vi } from "vitest"

// Pas de jsdom dans ce projet → on simule un window.localStorage minimal pour tester le MIROIR LS du carry gauntlet.
const _ls: Record<string, string> = {}
vi.stubGlobal("window", { localStorage: {
    getItem: (k: string) => (k in _ls ? _ls[k] : null),
    setItem: (k: string, v: string) => { _ls[k] = v },
    removeItem: (k: string) => { delete _ls[k] },
} })
import { hydratePlayer, setActiveWorld, setFusionLeagueCarry } from "./playerStore"
import { restoreFusionGauntletFromCarry } from "./gameStore"
import { getGauntletTeam, setGauntletTeam, swapGauntletTeam, reorderGauntletMoves, writeGauntletCarryLs } from "./fusionGauntlet"
import { buildFusion } from "../data/fusionMon"
import { createMonInstance } from "../battle/factory"

// LIGUE DE FUSION — reprise au reload : restoreFusionGauntletFromCarry reconstruit l'équipe depuis le roster + ré-applique
// l'usure persistée (PV/statut/PP), matchée par PAIRE DE PARENTS (clé stable au reload). Fail-safe si carry absent / tous K.O.
const setupTeam = () => {
    setGauntletTeam(null)
    const a = createMonInstance("feuillichot", 30, { owned: true })
    const b = createMonInstance("gouttiny", 30, { owned: true })
    hydratePlayer({ team: [a, b], pc: [], fusionRoster: [{ a: a.uid, b: b.uid }] } as never)
    setActiveWorld("live")
    return { a, b }
}

describe("Ligue de Fusion — reprise au reload (carry)", () => {
    beforeEach(() => writeGauntletCarryLs(null)) // isole les tests : pas de miroir LS résiduel d'un test précédent

    it("reconstruit l'équipe-gauntlet ABÎMÉE depuis le carry (match par paire de parents)", () => {
        const { a, b } = setupTeam()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 7, status: "NONE", statusCounter: 0, pp: {} }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(true)
        const gt = getGauntletTeam()
        expect(gt?.length).toBe(1)
        expect(gt![0].instance.currentHp).toBe(7) // usure restaurée, PAS soigné à fond
    })

    it("pas de carry → false (repli Autel)", () => {
        setGauntletTeam(null)
        writeGauntletCarryLs(null)
        hydratePlayer({ team: [], pc: [], fusionRoster: [] } as never)
        setActiveWorld("live")
        setFusionLeagueCarry(null)
        expect(restoreFusionGauntletFromCarry()).toBe(false)
    })

    // BUG SOIN/REFRESH — le miroir localStorage (persisté à CHAQUE tour) est PRIORITAIRE sur la save serveur (qui peut
    //   être en retard d'un tour) → l'usure mi-combat (K.O. inclus) est reprise telle quelle, sans soin gratuit.
    it("le miroir localStorage (frais) prime sur la save serveur (en retard) → PV réels repris", () => {
        const { a, b } = setupTeam()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 30, status: "NONE", statusCounter: 0, pp: {} }] })) // save serveur : « en pleine forme » (avant les dégâts)
        writeGauntletCarryLs(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 3, status: "NONE", statusCounter: 0, pp: {} }] })) // LS : usure RÉELLE du dernier tour
        expect(restoreFusionGauntletFromCarry()).toBe(true)
        expect(getGauntletTeam()![0].instance.currentHp).toBe(3) // repris ABÎMÉ (LS), PAS soigné à 30 (serveur périmé)
        writeGauntletCarryLs(null)
    })

    it("une fusion K.O. mi-combat (dans le carry) NE ressuscite PAS au reload", () => {
        setGauntletTeam(null); writeGauntletCarryLs(null)
        const a1 = createMonInstance("feuillichot", 30, { owned: true }), b1 = createMonInstance("gouttiny", 30, { owned: true })
        const a2 = createMonInstance("braisille", 30, { owned: true }), b2 = createMonInstance("plumiot", 30, { owned: true })
        hydratePlayer({ team: [a1, b1, a2, b2], pc: [], fusionRoster: [{ a: a1.uid, b: b1.uid }, { a: a2.uid, b: b2.uid }] } as never)
        setActiveWorld("live")
        setFusionLeagueCarry(JSON.stringify({ team: [
            { a: a1.uid, b: b1.uid, hp: 0, status: "NONE", statusCounter: 0, pp: {} },   // K.O. pendant la salle
            { a: a2.uid, b: b2.uid, hp: 9, status: "NONE", statusCounter: 0, pp: {} },   // survivante abîmée
        ] }))
        expect(restoreFusionGauntletFromCarry()).toBe(true) // au moins 1 debout → on reste
        const gt = getGauntletTeam()!
        const koFusion = gt.find((f) => (f.instance as { fusionParents?: [string, string] }).fusionParents?.includes(a1.uid))
        expect(koFusion!.instance.currentHp).toBe(0) // TOUJOURS K.O. — pas de soin gratuit
    })

    it("toutes les fusions K.O. dans le carry → false (fail-safe, on renverra à l'Autel)", () => {
        const { a, b } = setupTeam()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 0, status: "NONE", statusCounter: 0, pp: {}, moves: [] }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(false)
    })

    it("swapGauntletTeam échange l'ordre de combat de 2 fusionnés", () => {
        setGauntletTeam(null)
        const a1 = createMonInstance("feuillichot", 30, { owned: true }), b1 = createMonInstance("gouttiny", 30, { owned: true })
        const a2 = createMonInstance("braisille", 30, { owned: true }), b2 = createMonInstance("plumiot", 30, { owned: true })
        const f1 = buildFusion(a1, b1), f2 = buildFusion(a2, b2)
        setGauntletTeam([f1, f2])
        expect(getGauntletTeam()![0].instance.uid).toBe(f1.instance.uid)
        expect(swapGauntletTeam(f1.instance.uid, f2.instance.uid)).toBe(true)
        expect(getGauntletTeam()![0].instance.uid).toBe(f2.instance.uid)
    })

    it("reorderGauntletMoves réordonne les attaques d'un fusionné", () => {
        setGauntletTeam(null)
        const a = createMonInstance("feuillichot", 40, { owned: true }), b = createMonInstance("gouttiny", 40, { owned: true })
        const f = buildFusion(a, b); setGauntletTeam([f])
        const before = f.instance.moves.map((m) => m.moveId)
        if (before.length >= 2) {
            expect(reorderGauntletMoves(f.instance.uid, 0, 1)).toBe(true)
            const after = getGauntletTeam()![0].instance.moves.map((m) => m.moveId)
            expect(after[0]).toBe(before[1])
            expect(after[1]).toBe(before[0])
        }
    })

    it("le carry restaure l'ORDRE des attaques choisi par le joueur", () => {
        setGauntletTeam(null)
        const a = createMonInstance("feuillichot", 40, { owned: true }), b = createMonInstance("gouttiny", 40, { owned: true })
        hydratePlayer({ team: [a, b], pc: [], fusionRoster: [{ a: a.uid, b: b.uid }] } as never)
        setActiveWorld("live")
        const probe = buildFusion(a, b)
        const reversed = [...probe.instance.moves.map((m) => m.moveId)].reverse()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 12, status: "NONE", statusCounter: 0, pp: {}, moves: reversed }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(true)
        expect(getGauntletTeam()![0].instance.moves.map((m) => m.moveId)).toEqual(reversed)
    })
})
