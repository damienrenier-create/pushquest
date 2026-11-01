import { describe, it, expect } from "vitest"
import { createBattle, resolveTurnPvp, type BattleState } from "./engine"
import { createMonInstance } from "./factory"

// PvP — VERROU DE CHARGE (Sartay, 01/11/2026 : « ça serait bien qu'on soit obligé de finir Tunnel ou Vol ») : même règle qu'en solo.
// Un Daemon en pleine charge LIBÈRE sa décharge au tour suivant, quelle que soit l'attaque choisie ; seul un rappel l'annule.

const A = (s: BattleState) => s.player.team[s.player.activeIndex]
const said = (s: BattleState, part: string) => s.events.some((e) => e.kind === "message" && e.text.includes(part))
const mk = (sp: string, moves: string[]) => createMonInstance(sp, 50, { owned: true, ivs: 8, moveIds: moves })
const pvp = (a: ReturnType<typeof mk>[], b: ReturnType<typeof mk>[], seed = 3) => createBattle(a, b, { isWild: false, seed, pvp: true })
const MOVE = (i: number) => ({ kind: "move" as const, moveIndex: i })

describe("PvP — obligé de finir Tunnel / Vol (verrou de charge, comme en solo)", () => {
    it("Vol, puis une AUTRE attaque choisie : la décharge part quand même, il redescend", () => {
        let s = pvp([mk("aquilothan", ["vol", "charge"])], [mk("rochison", ["mur_de_fer"])])
        s = resolveTurnPvp(s, MOVE(0), MOVE(0))
        expect(A(s).semiInvuln).toBe(true)
        s = resolveTurnPvp(s, MOVE(1), MOVE(0))
        expect(said(s, "fond depuis le ciel")).toBe(true)
        expect(A(s).semiInvuln).toBeFalsy()
        expect(A(s).chargingMove).toBeUndefined()
    })
    it("Vol puis Mitra-Poing ×2 : il ne reste plus « en vol » sans fin (l'ancien bug PvP)", () => {
        let s = pvp([mk("aquilothan", ["vol", "mitra_poing"])], [mk("rochison", ["charge"])])
        for (let t = 0; t < 3; t++) s = resolveTurnPvp(s, MOVE(t === 0 ? 0 : 1), MOVE(0))
        expect(A(s).semiInvuln).toBeFalsy()
    })
    it("Tunnel : un rappel (switch) annule la charge, comme en solo", () => {
        let s = pvp([mk("gekroc", ["tunnel"]), mk("rochison", ["charge"])], [mk("rochison", ["mur_de_fer"])])
        s = resolveTurnPvp(s, MOVE(0), MOVE(0))
        expect(A(s).semiInvuln).toBe(true)
        s = resolveTurnPvp(s, { kind: "switch", teamIndex: 1 }, MOVE(0))
        expect(s.player.activeIndex).toBe(1)
        expect(s.player.team[0].semiInvuln).toBeFalsy()
        expect(s.player.team[0].chargingMove).toBeUndefined()
    })
    it("le verrou vaut pour les DEUX camps (l'invité B aussi) et reste déterministe", () => {
        const s0 = pvp([mk("rochison", ["mur_de_fer"])], [mk("aquilothan", ["vol", "charge"])])
        const run = () => resolveTurnPvp(resolveTurnPvp(s0, MOVE(0), MOVE(0)), MOVE(0), MOVE(1)) // resolveTurnPvp ne mute pas prev
        const s1 = run(), s2 = run()
        expect(said(s1, "fond depuis le ciel")).toBe(true)
        expect(s1.enemy.team[0].semiInvuln).toBeFalsy()
        expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))
    })
})
