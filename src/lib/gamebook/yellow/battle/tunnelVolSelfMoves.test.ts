import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, maxHpOf, type BattleState } from "./engine"
import { createMonInstance } from "./factory"

// TUNNEL / VOL (Sartay, 01/11/2026) : « même règle des attaques sur soi contre Tunnel et Vol, oui ». Une cible SOUS TERRE ou EN
// VOL reste intouchable pour tout ce qui la VISE (sauf coup sûr), mais les attaques SUR SOI marchent (Repos, Danse-Lames…), ainsi
// que la PHASE 1 de Mitra-Poing / Tunnel / Vol. Une émergence qui vise une cible encore enfouie se perd et ramène à découvert.

const P = (s: BattleState) => s.player.team[s.player.activeIndex]
const E = (s: BattleState) => s.enemy.team[s.enemy.activeIndex]
const msgs = (s: BattleState) => s.events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
const OUT_OF_REACH = (s: BattleState) => msgs(s).some((t) => t.includes("hors d'atteinte"))
/** Thundah (le plus rapide du jeu) joue AVANT l'adversaire, encore sous terre / en vol ce tour-ci. */
function vsHidden(moveId: string, foeMove: "tunnel" | "vol", hp?: number): BattleState {
    const user = createMonInstance("thundah", 50, { owned: true, ivs: 8, moveIds: [moveId] })
    const foe = createMonInstance("rochison", 50, { ivs: 8, moveIds: [foeMove] })
    const s = createBattle([user], [foe], { isWild: false, seed: 7, aiLevel: "trainer" })
    Object.assign(s.enemy.team[0], { semiInvuln: true, chargingMove: foeMove })
    if (hp !== undefined) s.player.team[0].currentHp = hp
    return s
}

describe("Tunnel / Vol : les attaques SUR SOI marchent contre une cible enfouie ou en vol", () => {
    it("Repos, Danse-Lames, Mur de Fer, Machination : effet appliqué, rien n'est « hors d'atteinte »", () => {
        const cases: [string, (m: ReturnType<typeof P>) => boolean][] = [
            ["repos", (m) => m.status === "SLEEP"],
            ["danse_lames", (m) => m.stages.atk === 2],
            ["mur_de_fer", (m) => m.stages.def === 1],
            ["machination", (m) => m.stages.spc === 2],
        ]
        for (const foeMove of ["tunnel", "vol"] as const) for (const [mv, ok] of cases) {
            const s = resolveTurn(vsHidden(mv, foeMove, mv === "repos" ? 40 : undefined), { kind: "move", moveIndex: 0 })
            expect(ok(P(s)), `${mv} vs ${foeMove}`).toBe(true)
            expect(OUT_OF_REACH(s), `${mv} vs ${foeMove}`).toBe(false)
        }
    })
    it("Mitra-Poing : la concentration marche contre une cible sous terre", () => {
        const s = resolveTurn(vsHidden("mitra_poing", "tunnel"), { kind: "move", moveIndex: 0 })
        expect(msgs(s).some((t) => t.includes("concentre toute son énergie"))).toBe(true)
        expect(OUT_OF_REACH(s)).toBe(false)
    })
    it("une attaque qui VISE la cible la manque toujours (contrôle)", () => {
        const s = resolveTurn(vsHidden("charge", "tunnel"), { kind: "move", moveIndex: 0 })
        expect(OUT_OF_REACH(s)).toBe(true)
    })
    it("émergence vers une cible encore enfouie : elle se perd et ramène à découvert (pas de verrou bloqué)", () => {
        const user = createMonInstance("gekroc", 50, { owned: true, ivs: 8, moveIds: ["tunnel"] })
        const foe = createMonInstance("rochison", 50, { ivs: 8, moveIds: ["tunnel"] })
        const s0 = createBattle([user], [foe], { isWild: false, seed: 7, aiLevel: "trainer" })
        Object.assign(s0.player.team[0], { semiInvuln: true, chargingMove: "tunnel" })
        Object.assign(s0.enemy.team[0], { semiInvuln: true, chargingMove: "tunnel" })
        const hp0 = s0.player.team[0].currentHp
        const s = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(OUT_OF_REACH(s)).toBe(true)            // Gékroc, plus rapide, jaillit vers un Rochison encore enfoui : raté
        expect(P(s).semiInvuln).toBeFalsy()           // … et il est revenu à la surface
        expect(P(s).chargingMove).toBeUndefined()
        expect(E(s).semiInvuln).toBeFalsy()           // Rochison jaillit ensuite et le touche
        expect(P(s).currentHp).toBeLessThan(hp0)
    })
    it("deux Daemons qui creusent ne se ratent jamais sans fin : le combat avance", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const user = createMonInstance("gekroc", 50, { owned: true, ivs: 8, moveIds: ["tunnel"] })
            const foe = createMonInstance("rochison", 50, { ivs: 8, moveIds: ["tunnel"] })
            let s = createBattle([user], [foe], { isWild: false, seed, aiLevel: "trainer" })
            let bothBuried = 0
            for (let t = 0; t < 12 && s.phase !== "ended"; t++) {
                s = resolveTurn(s, { kind: "move", moveIndex: 0 })
                bothBuried = P(s).semiInvuln && E(s).semiInvuln ? bothBuried + 1 : 0
                expect(bothBuried, `seed ${seed} tour ${t}`).toBeLessThanOrEqual(1)
            }
            expect(P(s).currentHp < maxHpOf(P(s)) || E(s).currentHp < maxHpOf(E(s)) || s.phase === "ended", `seed ${seed}`).toBe(true)
        }
    })
})
