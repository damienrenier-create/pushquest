import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { badgeInputFromSave } from "../data/run1Badges"
import { parisDayOf, pushupDeltaAcrossMidnight } from "../data/labDefis"
import { getPlayer, setTeam, executeTrade, recordBattleLoss, resetFoeLossStreak, recordEvo3IfFinal, grantCt } from "./playerStore"

// Audit des hauts faits & défis du RUN 1 (26/10/2026) — correctifs.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const mon = (uid: string, speciesId: string, extra: Record<string, unknown> = {}) =>
    ({ uid, speciesId, level: 5, moves: [], currentHp: 10, ivs: {}, evs: {}, ...extra }) as unknown as Parameters<typeof setTeam>[0][number]

describe("hauts faits dérivés → marqueurs PERMANENTS", () => {
    it("lab_defi : 150 squats OU un défi pompes/squats 1 h réussi (physWins) OU le marqueur (quota×2)", () => {
        expect(badgeInputFromSave({}).labDefiDone).toBe(false)
        expect(badgeInputFromSave({ labDefi: { squat150Done: true } as never }).labDefiDone).toBe(true)
        expect(badgeInputFromSave({ labDefi: { physWins: { pushup1h: 1 } } as never }).labDefiDone).toBe(true)
        expect(badgeInputFromSave({ labDefi: { physWins: { pushup1h: 0 } } as never }).labDefiDone).toBe(false)
        expect(badgeInputFromSave({ defeatedTrainers: ["ach_lab_defi"] }).labDefiDone).toBe(true)
    })
    it("gift_ct : CT en poche OU marqueur OU un Daemon connaît un move de CT-cadeau (rétro : la CT est consommée à l'apprentissage)", () => {
        expect(badgeInputFromSave({}).giftCts).toBe(0)
        expect(badgeInputFromSave({ ownedCts: ["ct37"] }).giftCts).toBe(1)
        expect(badgeInputFromSave({ defeatedTrainers: ["ach_gift_ct"] }).giftCts).toBe(1)
        expect(badgeInputFromSave({ team: [mon("a", "plumiot", { moves: [{ moveId: "souffle_primordial", pp: 5, ppMax: 5 }] })] as never }).giftCts).toBe(1) // CT37 = cadeau
        expect(badgeInputFromSave({ team: [mon("a", "plumiot", { moves: [{ moveId: "charge", pp: 5, ppMax: 5 }] })] as never }).giftCts).toBe(0)
    })
    it("held_item / evolve : le marqueur suffit (retirer l'objet, relâcher l'évolué ne retire plus le trophée)", () => {
        expect(badgeInputFromSave({ defeatedTrainers: ["ach_held_item"] }).heldItemEquipped).toBe(true)
        expect(badgeInputFromSave({}).heldItemEquipped).toBe(false)
        expect(badgeInputFromSave({ defeatedTrainers: ["ach_evolved"] }).evolutions).toBe(1)
        expect(badgeInputFromSave({}).evolutions).toBe(0)
    })
})

describe("store : qui pose les marqueurs", () => {
    it("grantCt pose ach_gift_ct ; recordEvo3IfFinal pose ach_evolved même pour un stade intermédiaire", () => {
        expect(grantCt("ct37")).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("ach_gift_ct")
        recordEvo3IfFinal("iorours") // stade 2/3 : pas de ach_evo3, mais ach_evolved
        expect(getPlayer().defeatedTrainers).toContain("ach_evolved")
        expect(getPlayer().defeatedTrainers.some((m) => m.startsWith("ach_evo3:"))).toBe(false)
    })
    it("executeTrade (joueur↔joueur) pose ach_trade_shiny si le Daemon DONNÉ ou REÇU est brillant", () => {
        setTeam([mon("give1", "plumiot")])
        expect(executeTrade("give1", mon("recv1", "plumiot") as never)).toBe(true)
        expect(getPlayer().defeatedTrainers).not.toContain("ach_trade_shiny") // aucun brillant
        setTeam([mon("give2", "plumiot", { shiny: true })])
        expect(executeTrade("give2", mon("recv2", "plumiot") as never)).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("ach_trade_shiny")
    })
    it("samefoe_loss3 : une VICTOIRE contre le dresseur casse la série", () => {
        recordBattleLoss("y_trainer_x", "2026-10-26"); recordBattleLoss("y_trainer_x", "2026-10-26")
        resetFoeLossStreak("y_trainer_x")
        recordBattleLoss("y_trainer_x", "2026-10-26")
        expect(getPlayer().defeatedTrainers).not.toContain("ach_samefoe_loss3") // perdu-perdu-GAGNÉ-perdu ≠ 3 d'affilée
        recordBattleLoss("y_trainer_x", "2026-10-26"); recordBattleLoss("y_trainer_x", "2026-10-26")
        expect(getPlayer().defeatedTrainers).toContain("ach_samefoe_loss3")
    })
})

describe("défi « 50 pompes en 1 heure » qui enjambe minuit", () => {
    it("jour local Europe/Paris + delta sur deux jours", () => {
        expect(parisDayOf(Date.parse("2026-10-26T22:30:00Z"))).toBe("2026-10-26") // 23 h 30 à Paris (UTC+1 fin octobre)
        expect(parisDayOf(Date.parse("2026-10-26T23:30:00Z"))).toBe("2026-10-27") // 0 h 30 à Paris
        expect(pushupDeltaAcrossMidnight(120, true, 0, 175)).toBe(55)              // même jour : total − snapshot
        expect(pushupDeltaAcrossMidnight(120, false, 150, 25)).toBe(55)            // 30 reps avant minuit + 25 après
        expect(pushupDeltaAcrossMidnight(120, false, 100, 25)).toBe(25)            // jamais négatif côté veille
    })
    it("câblage : route serveur, date locale des défaites, garde-fous du rejeu, marqueur du labo", () => {
        const route = read("src/app/api/gamebook/yellow/lab-defi/route.ts")
        expect(route).toContain("pushupDeltaAcrossMidnight(body.startSnapshot ?? 0, startDay === today, totalStartDay, total)")
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("recordBattleLoss(lostTid, getTodayISO())")
        expect(bs).toContain("resetFoeLossStreak(storeState.trainer.trainerId)")
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("getActiveWorld() === \"replay\" ? [] : dripBadgeReps(")
        expect(ydc).toContain("if (!hydrated || getActiveWorld() === \"replay\") return")
        expect(read("src/app/gamebook/yellow/LabPanel.tsx")).toContain("markTrainerDefeated(\"ach_lab_defi\")")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("recordEvo3IfFinal(toId) // hauts faits")
        expect(ps).toContain("recordEvo3IfFinal(\"magnetor\")")
    })
})
