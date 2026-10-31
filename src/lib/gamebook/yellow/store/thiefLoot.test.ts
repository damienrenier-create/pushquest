import { describe, it, expect, afterEach, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    hydratePlayer, getPlayer, setActiveWorld, getThief, commitTheft, recoverStolen, setOtherWorldMarkerCheck, applyAcceptedGenieWishEffects,
    thiefPowersAsleep, thiefMustStayHidden, thiefCatchCharges, thiefHealsUsable, thiefMinitelCalls, thiefFreeFightsUsable, getThiefLoot,
    thiefFrenzyChance, consumeThiefFrenzyStartMessage, thiefFrenzyActiveHere, recordThiefFrenzyCapture, healStandingTeam,
    WILD_HEAL_MARKER, MINITEL_UNLOCK_MARKER, GENIE_CATCH_PREFIX, genieCatchCharges,
} from "./playerStore"
import {
    startWildBattle, startTrainerBattle, startFusionTrialBattle, submitPlayerAction, moveCostForDisplay, getBattleEnergy, getSnapshot, getMinitelState, armMinitel,
} from "./battleStore"
import { useGameStore, activeNpcs } from "./gameStore"
import { createMonInstance } from "../battle/factory"
import { createBattle, catchGuaranteeDecisive } from "../battle/engine"
import { fullStats } from "../battle/stats"
import { getSpecies } from "../data/species"
import { emptySave, parseSave, keepThiefFromStored } from "../storage/save"
import { shinyFeteSuppressed } from "../data/shinyFrenzy"
import { BONBON_EV_ITEM_ID } from "../data/items"
import { duelWinLines } from "../data/duel"
import {
    emptyThiefState, stateAfterTheft, thiefGone, thiefDayKey, thiefStoleLines, thiefWinLines, thiefHomeLines, thiefLootRows, thiefLootAsleepNote, thiefFrenzyEndLabel,
    thiefFreeFightStartLine, thiefHealUsedLine, thiefMinitelUsedLine, thiefCatchUsedLine, THIEF_FRENZY_CAUGHT_LINE, THIEF_LOOT_HOWTO, THIEF_LUXE_ITEM_ID,
    THIEF_MAX_THEFTS, THIEF_LOOT_BY_THEFT, THIEF_NPC_ID, type ThiefGift, type ThiefState,
} from "../data/thief"
import type { MonInstance } from "../battle/types"

// LE VOLEUR À NEUF VOLS (Sartay, 31/10/2026) — « 6 récompenses supplémentaires inspirées des précédents vœux, dans une mesure
// moindre » : 4 Bons Bonbons EV ×2 · 5 captures garanties ×2 · 6 soins après combat sauvage ×15 · 7 MINITEL 10 appels ·
// 8 combats à coups gratuits ×10 · 9 Frénésie du Voleur. Choix : « run 3 : comme les vœux » ; « vœu déjà entier : 2 Pâtes ».
// + la revue adversariale du 31/10 : comptes dans le JOURNAL DU COMBAT (jamais une fenêtre qui écraserait ACE, le sbire, un duel…),
// captures jamais gâchées, MINITEL coupé dans le bac à sable de l'Autel, cadeau des duels-reflets, profils et vieux onglets.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const MUSCU = /pompe|squat|quota|séance|sueur|transpir|workout|vraie vie|encod|(?<!\p{L})reps?(?!\p{L})/iu
const DAY = 3_600_000 * 24
const maxHp = (m: MonInstance) => fullStats(m, getSpecies(m.speciesId)!).hp
const team3 = () => [createMonInstance("rochison", 40), createMonInstance("plumiot", 12), createMonInstance("gouttiny", 20)]
const thiefAt = (thefts: number, extra: Partial<ThiefState> = {}): ThiefState => ({ ...emptyThiefState(), thefts, lastTheftDay: "2026-10-30", ...extra })
const pendingTheft = (thefts: number): ThiefState => { const v = createMonInstance("gouttiny", 20); return thiefAt(thefts, { stolen: v, snapshot: [v], stolenAt: "2026-10-30T10:00:00.000Z", stolenWorld: "live" }) }
const ALL_BADGES = ["plante", "roche", "feu", "ancre", "elec", "eau"] as const
const hydrate = (o: { team?: MonInstance[]; pc?: MonInstance[]; thief?: ThiefState | null; items?: Record<string, number>; badges?: string[]; defeatedTrainers?: string[]; reps?: number }) =>
    hydratePlayer({ team: o.team ?? team3(), pc: o.pc ?? [], items: o.items ?? {}, thief: o.thief ?? null, badges: (o.badges ?? [...ALL_BADGES]) as never, defeatedTrainers: o.defeatedTrainers ?? [], reps: o.reps ?? 500, craftedItems: [], clanDaemonUid: undefined })
const evText = () => (getSnapshot().battle?.events ?? []).map((e) => (e.kind === "message" ? e.text : "")).join(" ")

afterEach(() => { setActiveWorld("live"); setOtherWorldMarkerCheck(() => false); vi.restoreAllMocks() })

describe("Voleur à 9 vols — les butins remis AU VOL", () => {
    it("vols 1 à 9 : chaque butin tombe au bon vol, les charges s'AJOUTENT et survivent aux vols suivants ; il disparaît au 9e", () => {
        hydrate({})
        const before = Date.now()
        const gifts: ThiefGift[] = []
        for (let n = 1; n <= 9; n++) {
            const c = commitTheft(getPlayer().team[0].uid)!
            expect(c.gift.theftNo).toBe(n)
            gifts.push(c.gift)
            if (n < 9) { expect(recoverStolen()?.theftNo).toBe(n); expect(thiefGone(getThief())).toBe(false) }
        }
        expect(gifts.map((g) => g.loot ?? null)).toEqual([null, null, null, "bonbons", "catches", "heals", "minitel", "freeFights", "frenzy"])
        expect(getPlayer().items[BONBON_EV_ITEM_ID]).toBe(2)
        const th = getThief()
        expect([th.lootCatches, th.lootHeals, th.lootMinitel, th.lootFreeFights]).toEqual([2, 15, 10, 10]) // rien d'écrasé par les vols suivants
        expect(th.lootFrenzy?.left).toBe(1)
        expect(th.lootFrenzy!.until).toBeGreaterThanOrEqual(before + DAY); expect(th.lootFrenzy!.until).toBeLessThanOrEqual(Date.now() + DAY)
        expect(gifts[8].frenzyUntil).toBe(th.lootFrenzy!.until)
        expect(recoverStolen()?.theftNo).toBe(9)
        expect(thiefGone(getThief())).toBe(true)
        expect(commitTheft(getPlayer().team[0].uid)).toBeNull() // plus jamais de vol
        expect(THIEF_MAX_THEFTS).toBe(9)
        expect(Object.keys(THIEF_LOOT_BY_THEFT)).toEqual(["4", "5", "6", "7", "8", "9"])
    })
    it("3e vol résolu : ses (faux) adieux valent pour la journée — le jour de la victoire, il n'est pas chez lui", () => {
        hydrate({ thief: pendingTheft(3) })
        expect(recoverStolen()?.theftNo).toBe(3)
        expect(getThief().lastTheftDay).toBe(thiefDayKey()) // il revient le lendemain
        hydrate({ thief: pendingTheft(5) })
        recoverStolen()
        expect(getThief().lastTheftDay).toBe("2026-10-30") // les autres victoires ne touchent pas au jour du vol
    })
    it("vœu déjà ENTIER : 2 Pâtes de Luxe du Voleur à la place des soins (Gass) ou du MINITEL (Task1) — même au run 3, même vœu encore en attente", () => {
        hydrate({ thief: thiefAt(5), defeatedTrainers: [WILD_HEAL_MARKER] })
        const c6 = commitTheft(getPlayer().team[0].uid)!
        expect(c6.gift).toMatchObject({ theftNo: 6, loot: "pates", swappedFor: "heals" })
        expect(getThief().lootHeals).toBeUndefined()
        expect(getPlayer().items[THIEF_LUXE_ITEM_ID]).toBe(2)
        // Task1 au run 3 : le marqueur n'y est pas reposé, mais il est dans son run 1 stashé.
        setActiveWorld("run3"); setOtherWorldMarkerCheck((m) => m === MINITEL_UNLOCK_MARKER)
        hydrate({ thief: thiefAt(6), badges: ["plante"] })
        expect(commitTheft(getPlayer().team[0].uid)!.gift).toMatchObject({ theftNo: 7, loot: "pates", swappedFor: "minitel" })
        expect(getThief().lootMinitel).toBeUndefined()
        // Vœu ACCEPTÉ mais pas encore versé (accepté au run 3) : aucun marqueur nulle part, la ligne de vœux suffit.
        setOtherWorldMarkerCheck(() => false)
        hydrate({ thief: thiefAt(5), badges: ["plante"] })
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "wild_heal" }), round: 0 })
        expect(commitTheft(getPlayer().team[0].uid)!.gift).toMatchObject({ theftNo: 6, loot: "pates", swappedFor: "heals" })
        // Un tour ARCHIVÉ jamais versé ne compte pas (il ne sera jamais payé) : le joueur garde ses soins.
        applyAcceptedGenieWishEffects({ history: JSON.stringify([{ round: 0, accepted1: true, effect1: JSON.stringify({ kind: "wild_heal" }) }]) })
        hydrate({ thief: thiefAt(5), badges: ["plante"] })
        expect(commitTheft(getPlayer().team[0].uid)!.gift).toMatchObject({ theftNo: 6, loot: "heals" })
        applyAcceptedGenieWishEffects({}) // oublie la ligne de vœux pour la suite
    })
})

describe("Voleur à 9 vols — où les pouvoirs marchent", () => {
    it("run 3 : les pouvoirs dorment (charges gardées), les captures marchent ; rejeu : tout dort ; monde jetable : il ne se cache pas", () => {
        setActiveWorld("run3")
        hydrate({ thief: thiefAt(7, { lootCatches: 2, lootHeals: 15, lootMinitel: 10 }), badges: ["plante", "roche", "feu"] })
        expect(commitTheft(getPlayer().team[0].uid)!.gift).toMatchObject({ theftNo: 8, loot: "freeFights", asleep: true })
        expect(getThief().lootFreeFights).toBe(10)
        expect(thiefPowersAsleep()).toBe(true)
        expect([thiefHealsUsable(), thiefMinitelCalls(), thiefFreeFightsUsable()]).toEqual([0, 0, 0])
        expect(thiefCatchCharges()).toBe(2)
        expect(getThiefLoot().asleep).toBe("run3")
        expect(thiefMustStayHidden()).toBe(false)
        hydrate({ thief: getThief(), badges: [] })
        expect(thiefMustStayHidden()).toBe(true) // run 3 sans badge : il peut être recommencé → le Daemon s'y perdrait
        setActiveWorld("live")
        expect([thiefHealsUsable(), thiefMinitelCalls(), thiefFreeFightsUsable(), thiefCatchCharges()]).toEqual([15, 10, 10, 2])
        expect(getThiefLoot().asleep).toBeNull()
        setActiveWorld("replay")
        expect(thiefPowersAsleep()).toBe(true)
        expect(thiefCatchCharges()).toBe(0)
        expect(getThiefLoot().asleep).toBe("replay")
    })
    it("Frénésie du Voleur : reçue au run 3, elle ATTEND ; elle démarre au premier pas de chasse hors run 3 (24 h, annoncée) ; un shiny capturé l'éteint", () => {
        setActiveWorld("run3")
        hydrate({ thief: thiefAt(8), badges: ["plante"] })
        const c = commitTheft(getPlayer().team[0].uid)!
        expect(c.gift).toMatchObject({ theftNo: 9, loot: "frenzy", frenzyUntil: 0, asleep: true })
        expect(getThief().lootFrenzy).toEqual({ until: 0, left: 1 })
        const NOW = Date.now()
        expect(thiefFrenzyChance(NOW)).toBeUndefined() // elle dort au run 3
        expect(thiefFrenzyActiveHere(NOW)).toBe(false)
        setActiveWorld("live")
        expect(thiefFrenzyChance(NOW)).toBe(0.5)
        expect(getThief().lootFrenzy).toEqual({ until: NOW + DAY, left: 1 })
        const start = consumeThiefFrenzyStartMessage()
        expect(start).toContain("FRÉNÉSIE DU VOLEUR commence"); expect(start).toContain(thiefFrenzyEndLabel(NOW + DAY))
        expect(consumeThiefFrenzyStartMessage()).toBeNull()
        expect(thiefFrenzyActiveHere(NOW)).toBe(true)
        setActiveWorld("run3")
        expect(recordThiefFrenzyCapture(NOW)).toBe(false) // un shiny du run 3 n'est pas le sien
        setActiveWorld("live")
        expect(recordThiefFrenzyCapture(NOW)).toBe(true)
        expect(getThief().lootFrenzy).toBeUndefined()
        expect(thiefFrenzyChance(NOW)).toBeUndefined()
        // Fenêtre passée : plus d'effet, rien à capturer.
        hydrate({ thief: thiefAt(9, { lootFrenzy: { until: NOW - 1, left: 1 } }) })
        expect(thiefFrenzyChance(NOW)).toBeUndefined(); expect(recordThiefFrenzyCapture(NOW)).toBe(false)
    })
    it("l'annonce du lancement de la frénésie ne s'égare jamais dans un autre profil, au run 3 ni en rejeu", () => {
        hydrate({ thief: thiefAt(9, { lootFrenzy: { until: 0, left: 1 } }) })
        expect(thiefFrenzyChance(Date.now())).toBe(0.5) // lancée (pas de combat dans la foulée)
        hydrate({ thief: null }) // un autre profil
        expect(consumeThiefFrenzyStartMessage()).toBeNull()
        hydrate({ thief: thiefAt(9, { lootFrenzy: { until: 0, left: 1 } }) })
        thiefFrenzyChance(Date.now())
        setActiveWorld("replay")
        expect(consumeThiefFrenzyStartMessage()).toBeNull()
    })
    it("fête du Nexus : coupée côté serveur tant que la frénésie du Voleur COURT, pas quand elle attend ni au run 3 ; côté client aussi", () => {
        const NOW = 1_800_000_000_000
        const fz = (until: number, left: number, activeWorld = "live") => ({ activeWorld, thief: { thefts: 9, lootFrenzy: { until, left } } })
        expect(shinyFeteSuppressed(fz(NOW + 1000, 1), NOW)).toBe(true)
        expect(shinyFeteSuppressed(fz(0, 1), NOW)).toBe(false) // en attente
        expect(shinyFeteSuppressed(fz(NOW + 1000, 0), NOW)).toBe(false)
        expect(shinyFeteSuppressed(fz(NOW - 1, 1), NOW)).toBe(false)
        expect(shinyFeteSuppressed(fz(NOW + 1000, 1, "run3"), NOW)).toBe(false) // elle dort : un shiny naturel garde sa fête
        expect(shinyFeteSuppressed({ activeWorld: "run3", shinyFrenzy: { until: NOW + 1000, left: 1 } }, NOW)).toBe(true) // Jacanon : inchangé
        const client = read("src/lib/gamebook/yellow/shinyGift.ts")
        expect(client.indexOf("if (thiefFrenzyActiveHere()) return")).toBeGreaterThan(0)
        expect(client.indexOf("if (thiefFrenzyActiveHere()) return")).toBeLessThan(client.indexOf("fetch("))
    })
})

describe("Voleur à 9 vols — cachettes sur la carte", () => {
    it("une cachette tirée pour un profil ne réapparaît jamais chez un autre (tirage du moment seulement)", () => {
        hydrate({ thief: pendingTheft(4) }) // profil A : Cendreville + Ville Jaune
        vi.spyOn(Math, "random").mockReturnValue(0.99) // dernière case du tirage → la Ville Jaune
        useGameStore.getState().setMap("yellow_entrance", 18, 18)
        const a = activeNpcs().find((n) => n.id === THIEF_NPC_ID)
        expect(a?.mapId).toBe("yellow_entrance")
        hydrate({ thief: pendingTheft(1) }) // profil B : 1er vol, Cendreville seule
        useGameStore.getState().setMap("yellow_entrance", 18, 18)
        expect(activeNpcs().some((n) => n.id === THIEF_NPC_ID && n.mapId === "yellow_entrance")).toBe(false)
        hydrate({ thief: { ...pendingTheft(1), thefts: 0 } }) // save abîmée (compteur à 0) : il reste trouvable à Cendreville
        useGameStore.getState().setMap("yellow_cendreville", 37, 18)
        expect(activeNpcs().some((n) => n.id === THIEF_NPC_ID && n.mapId === "yellow_cendreville")).toBe(true)
    })
})

describe("Voleur à 9 vols — sauvegarde", () => {
    it("parse : 9 vols au plus, chaque charge bornée par son butin, frénésie EN ATTENTE gardée, valeurs absurdes écartées", () => {
        const p = parseSave({ ...emptySave(), thief: { thefts: 9, lastTheftDay: "2026-10-31", lootCatches: 2, lootHeals: 999, lootMinitel: -3, lootFreeFights: Number.NaN, lootFrenzy: { until: 0, left: 1 } } }).thief
        expect(p).toEqual({ thefts: 9, lastTheftDay: "2026-10-31", stolen: null, snapshot: [], stolenAt: "", stolenWorld: "", lootCatches: 2, lootHeals: 15, lootFrenzy: { until: 0, left: 1 } })
        expect(parseSave({ ...emptySave(), thief: { thefts: 9, lastTheftDay: "x", lootFrenzy: { until: 5, left: 0 } } }).thief?.lootFrenzy).toBeUndefined()
        expect(parseSave({ ...emptySave(), thief: { thefts: 9, lastTheftDay: "x", lootFrenzy: { until: -5, left: 1 } } }).thief?.lootFrenzy).toBeUndefined()
        expect(parseSave({ ...emptySave(), thief: { thefts: 9, lastTheftDay: "x", lootMinitel: 10, lootFreeFights: 10 } }).thief).toMatchObject({ lootMinitel: 10, lootFreeFights: 10 })
    })
    it("vieil onglet (sans « thief9 ») : le serveur garde le compteur et les butins stockés du MÊME profil ; le Daemon volé vient de la save reçue", () => {
        const t = team3()
        const old = stateAfterTheft(thiefAt(2), t, t[1].uid, "live", { now: new Date(2026, 9, 29, 10) })!.state // ce que l'onglet d'avant envoie : 3 vols
        const save = parseSave({ ...emptySave(), team: [t[0], t[2]], thief: old, ngplusWorld: { ...emptySave(), thief: old } })
        const stored = { team: [t[0], t[2]], thief: { thefts: 6, lastTheftDay: "2026-10-31", lootCatches: 1, lootHeals: 15 } }
        expect(keepThiefFromStored(stored, save)).toBe(true)
        expect(save.thief).toMatchObject({ thefts: 6, lastTheftDay: "2026-10-31", lootCatches: 1, lootHeals: 15 })
        expect(save.thief?.stolen?.uid).toBe(t[1].uid) // avec l'équipe envoyée : jamais de doublon
        expect(save.ngplusWorld?.thief).toEqual(save.thief)
        // Un AUTRE profil (aucun Daemon en commun : vieil onglet qui a changé de profil) : rien n'est greffé.
        const t2 = team3()
        const old2 = stateAfterTheft(thiefAt(2), t2, t2[1].uid, "live", { now: new Date(2026, 9, 29, 10) })!.state
        const other = parseSave({ ...emptySave(), team: [t2[0], t2[2]], thief: old2 })
        expect(keepThiefFromStored(stored, other)).toBe(false)
        expect(other.thief?.thefts).toBe(3); expect(other.thief?.lootCatches).toBeUndefined()
        // Rien qu'un vieil onglet puisse perdre (3 vols au plus, aucun butin) : la save reçue passe telle quelle.
        const plain = parseSave({ ...emptySave(), thief: old })
        expect(keepThiefFromStored({ thief: { thefts: 3, lastTheftDay: "2026-10-28" } }, plain)).toBe(false)
        expect(plain.thief?.thefts).toBe(3)
        expect(keepThiefFromStored(null, plain)).toBe(false)
        expect(read("src/lib/gamebook/yellow/store/saveManager.ts")).toContain("const SAVE_CAPS = [\"pcBoxes\", \"thief9\"]")
        // Le Daemon que garde le Voleur compte parmi les Daemons de la save : le perdre (ou le lui rendre) grave une copie de sécurité.
        const route = read("src/app/api/gamebook/yellow/save/route.ts")
        expect(route).toContain("const kept = prevStolen && prevStolen === thiefStolenUid(nextFlags) ? prevStolen : null")
        expect(route).toContain("for (const uid of before) if (!after.has(uid) && uid !== kept) return true")
    })
})

describe("Voleur à 9 vols — les pouvoirs en combat", () => {
    const striker = () => createMonInstance("couperin", 45, { moveIds: ["draco_charge"] })
    it("⚔️ coups gratuits : attaques à 0⚡ (annoncé), décompté en fin de combat seulement si une attaque est partie ; jamais au run 3, en Zone de Combat ni à l'Autel", () => {
        const me = striker()
        hydrate({ team: [me], thief: thiefAt(8, { lootFreeFights: 2 }), reps: 200 })
        startWildBattle([me], [createMonInstance("plumiot", 5)], 11)
        expect(getSnapshot().battle?.thiefFree).toBe(true)
        expect(evText()).toContain("COUPS GRATUITS")
        expect(moveCostForDisplay(0)).toBe(0)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getSnapshot().battle?.phase).toBe("ended")
        expect(getPlayer().reps).toBe(200); expect(getBattleEnergy().spent).toBe(0)
        expect(getThief().lootFreeFights).toBe(1)
        // Fuir avant d'attaquer ne coûte rien.
        startWildBattle([getPlayer().team[0]], [createMonInstance("plumiot", 5)], 12, { fleeChance: 100 })
        submitPlayerAction({ kind: "run" })
        expect(getSnapshot().battle?.phase).toBe("ended")
        expect(getThief().lootFreeFights).toBe(1)
        // Zone de Combat et épreuve de l'Autel : jamais offert.
        startTrainerBattle([getPlayer().team[0]], [createMonInstance("plumiot", 5)], 13, { trainerId: "frontier:TOWER" })
        expect(getSnapshot().battle?.thiefFree).toBeFalsy()
        startFusionTrialBattle([getPlayer().team[0]], [createMonInstance("plumiot", 5)], 13)
        expect(getSnapshot().battle?.thiefFree).toBeFalsy()
        // Run 3 : le pouvoir dort, l'attaque coûte.
        setActiveWorld("run3")
        startWildBattle([getPlayer().team[0]], [createMonInstance("plumiot", 5)], 14)
        expect(getSnapshot().battle?.thiefFree).toBeFalsy()
        expect(moveCostForDisplay(0)).toBeGreaterThan(0)
    })
    it("⚔️ duel-reflet offert : le vainqueur ne paie rien, mais le reflet reçoit le double de ce que les attaques AURAIENT coûté", () => {
        const me = striker()
        hydrate({ team: [me], thief: thiefAt(8, { lootFreeFights: 1 }), reps: 200 })
        startTrainerBattle([me], [createMonInstance("plumiot", 5)], 21, { trainerId: "duel:quelqu_un" })
        expect(moveCostForDisplay(0)).toBe(0) // offert
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        const d = getSnapshot().duelResult!
        expect(d.won).toBe(true)
        expect(d.energySpent).toBe(0)
        expect(d.giftBasis).toBeGreaterThan(0)
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("const giftBasis = duelResult.giftBasis ?? duelResult.energySpent")
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("offered: giftBasis > duelResult.energySpent")
        const line = duelWinLines("Bob", { refund: 0, ctDropped: false, energyToOpp: 480, ballLabel: "une Nexus-Ball", offered: true }, true).join(" ")
        expect(line).toContain("ce que tes attaques auraient coûté (combat offert par le Voleur) : 480⚡"); expect(line).not.toMatch(MUSCU)
    })
    it("🩹 pansements : soin après un combat sauvage GAGNÉ, compté au journal du combat (jamais une fenêtre à part) ; rien à soigner → rien d'usé ; le vœu de Gass passe avant", () => {
        const me = striker(); me.currentHp = 10
        hydrate({ team: [me], thief: thiefAt(6, { lootHeals: 2 }) })
        startWildBattle([me], [createMonInstance("plumiot", 5)], 11)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getSnapshot().battle?.outcome).toBe("win")
        expect(getPlayer().team[0].currentHp).toBe(maxHp(getPlayer().team[0]))
        expect(getThief().lootHeals).toBe(1)
        expect(evText()).toContain("pansements du Voleur soignent tes Daemons encore debout")
        expect(getSnapshot().rematchReward).toBeNull() // aucune fenêtre d'après-combat qui écraserait une autre
        expect(healStandingTeam()).toBe(false) // équipe au complet : le soin ne sert à rien (et ne serait pas décompté)
        // Gass (vœu entier) : son soin passe, la charge du Voleur reste.
        const g = striker(); g.currentHp = 10
        hydrate({ team: [g], thief: thiefAt(6, { lootHeals: 2 }), badges: [], defeatedTrainers: [WILD_HEAL_MARKER] })
        startWildBattle([g], [createMonInstance("plumiot", 5)], 11)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getPlayer().team[0].currentHp).toBe(maxHp(getPlayer().team[0]))
        expect(getThief().lootHeals).toBe(2)
    })
    it("🎯 captures garanties : après celles du génie, message et compte du Voleur, une charge par capture réussie ; jamais gâchées (Master-Éclair, fusion, unique)", () => {
        const me = striker()
        hydrate({ team: [me], items: { poke_ball: 3, master_ball: 1 }, thief: thiefAt(5, { lootCatches: 2 }), badges: [], defeatedTrainers: [`${GENIE_CATCH_PREFIX}1`] })
        startWildBattle([me], [createMonInstance("megalithe", 60)], 3)
        submitPlayerAction({ kind: "ball", itemId: "poke_ball" })
        expect(getSnapshot().battle?.outcome).toBe("caught")
        expect(evText()).toContain("🧞 Le génie guide ta Ball") // le génie d'abord
        expect(genieCatchCharges()).toBe(0); expect(getThief().lootCatches).toBe(2)
        startWildBattle([getPlayer().team[0]], [createMonInstance("megalithe", 60)], 4)
        submitPlayerAction({ kind: "ball", itemId: "poke_ball" })
        expect(getSnapshot().battle?.outcome).toBe("caught")
        expect(evText()).toContain("🥷 Le Voleur guide ta Ball"); expect(evText()).toContain(thiefCatchUsedLine(1))
        expect(getThief().lootCatches).toBe(1)
        startWildBattle([getPlayer().team[0]], [createMonInstance("megalithe", 60)], 5)
        submitPlayerAction({ kind: "ball", itemId: "master_ball" })
        expect(getSnapshot().battle?.outcome).toBe("caught")
        expect(getThief().lootCatches).toBe(1) // la Master-Éclair n'en avait pas besoin
        // Règle pure : la garantie ne change rien sur une fusion, avec une Fusio-Ball, sur un unique déjà possédé, avec une Master-Éclair.
        const wild = (m: MonInstance) => createBattle([createMonInstance("rochison", 30)], [m], { isWild: true, seed: 1 })
        expect(catchGuaranteeDecisive(wild(createMonInstance("megalithe", 60)), "poke_ball")).toBe(true)
        expect(catchGuaranteeDecisive(wild(createMonInstance("mottelave", 30)), "poke_ball")).toBe(false)
        expect(catchGuaranteeDecisive(wild(createMonInstance("mottelave", 30)), "fusio_ball")).toBe(false)
        expect(catchGuaranteeDecisive(wild(createMonInstance("megalithe", 60)), "master_ball")).toBe(false)
        expect(catchGuaranteeDecisive(wild(Object.assign(createMonInstance("megalithe", 60), { captureBlockedOwned: true })), "poke_ball")).toBe(false)
    })
    it("📟 MINITEL du Voleur : appels restants affichés, compte au journal à l'arrivée du renfort, décompté en fin de combat ; ni au run 3, ni à l'Autel ; Task1 illimité", () => {
        const weak = createMonInstance("plumiot", 3)
        hydrate({ team: [weak], pc: [createMonInstance("rochison", 40)], thief: thiefAt(7, { lootMinitel: 2 }) })
        startWildBattle([weak], [createMonInstance("couperin", 60)], 5, { fleeChance: 100 })
        expect(getMinitelState()).toMatchObject({ unlocked: true, canArm: true, calls: 2 })
        expect(armMinitel()).toContain("Appel passé")
        for (let i = 0; i < 12 && !getSnapshot().battle?.minitelUsed && getSnapshot().battle?.phase !== "ended"; i++) submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getSnapshot().battle?.minitelUsed).toBe(true)
        expect(evText()).toContain(thiefMinitelUsedLine(1)) // le compte, dans le combat, à l'arrivée du renfort
        expect(getThief().lootMinitel).toBe(2) // décompté en FIN de combat (un rechargement reprend le combat, pas le compteur)
        submitPlayerAction({ kind: "run" })
        expect(getSnapshot().battle?.phase).toBe("ended")
        expect(getThief().lootMinitel).toBe(1)
        expect(getSnapshot().rematchReward).toBeNull()
        // Épreuve de fusion de l'Autel (bac à sable) : pas d'appel du Voleur.
        startFusionTrialBattle([weak], [createMonInstance("couperin", 60)], 6)
        expect(getMinitelState()).toMatchObject({ canArm: false, calls: 0 })
        expect(armMinitel()).toBeNull()
        setActiveWorld("run3")
        hydrate({ team: [weak], pc: [createMonInstance("rochison", 40)], thief: thiefAt(7, { lootMinitel: 2 }), badges: ["plante"] })
        startWildBattle([weak], [createMonInstance("couperin", 60)], 5)
        expect(getMinitelState()).toMatchObject({ unlocked: false, canArm: false, calls: 0 }) // il dort au run 3
        setActiveWorld("live")
        hydrate({ team: [weak], pc: [createMonInstance("rochison", 40)], thief: thiefAt(7, { lootMinitel: 2 }), badges: [], defeatedTrainers: [MINITEL_UNLOCK_MARKER] })
        startWildBattle([weak], [createMonInstance("couperin", 60)], 5)
        expect(getMinitelState()).toMatchObject({ unlocked: true, calls: null }) // Task1 : illimité, rien à décompter
    })
})

describe("Voleur à 9 vols — textes (tout est expliqué, rien pour la muscu)", () => {
    it("chaque mot explique son butin ; la cachette n'est plus nommée à partir du 3e vol ; vocabulaire neutre partout", () => {
        const notes = [
            ...[1, 2, 3].map((n) => thiefStoleLines("Rochison", { theftNo: n, surin: "mon" })),
            thiefStoleLines("X", { theftNo: 4, loot: "bonbons" }), thiefStoleLines("X", { theftNo: 5, loot: "catches" }),
            thiefStoleLines("X", { theftNo: 6, loot: "heals" }), thiefStoleLines("X", { theftNo: 6, loot: "pates", swappedFor: "heals" }),
            thiefStoleLines("X", { theftNo: 7, loot: "minitel" }), thiefStoleLines("X", { theftNo: 7, loot: "pates", swappedFor: "minitel" }),
            thiefStoleLines("X", { theftNo: 8, loot: "freeFights", asleep: true }),
            thiefStoleLines("X", { theftNo: 9, loot: "frenzy", frenzyUntil: Date.UTC(2026, 10, 1, 17, 5) }), thiefStoleLines("X", { theftNo: 9, loot: "frenzy", frenzyUntil: 0, asleep: true }),
        ].map((l) => l.join(" "))
        const extra = [
            ...thiefHomeLines("X", "anecdote", { comeback: true }), ...[3, 6, 9].flatMap((n) => thiefWinLines(n, "X", "team")),
            ...thiefLootRows({ catches: 2, heals: 15, minitel: 10, freeFights: 10, frenzyUntil: Date.now() + DAY, frenzyPending: false, asleep: null }).flatMap((r) => [r.name, r.count, r.how]),
            ...thiefLootRows({ catches: 0, heals: 0, minitel: 0, freeFights: 0, frenzyUntil: null, frenzyPending: true, asleep: "run3" }).flatMap((r) => [r.count, r.how]),
            ...thiefLootRows({ catches: 0, heals: 0, minitel: 0, freeFights: 0, frenzyUntil: Date.now() + DAY, frenzyPending: false, asleep: "run3" }).flatMap((r) => [r.count, r.how]),
            thiefLootAsleepNote("run3"), thiefLootAsleepNote("replay"), thiefFreeFightStartLine(10), thiefHealUsedLine(14), thiefHealUsedLine(0), thiefMinitelUsedLine(9),
            thiefCatchUsedLine(1), thiefCatchUsedLine(0), THIEF_FRENZY_CAUGHT_LINE,
            ...Object.values(THIEF_LOOT_HOWTO).flatMap((h) => [h.name, h.how]),
        ].join(" ")
        expect([...notes, extra].join(" ")).not.toMatch(MUSCU)
        expect([...notes, extra].join(" ")).not.toMatch(/l'eau/) // pas de frénésie en surfant : on ne la promet pas
        notes.forEach((n, i) => expect(n, `mot ${i}`).toContain(i < 2 ? "fouille Cendreville" : "Pas un mot sur sa cachette"))
        expect(notes[3]).toContain("BONS BONBONS EV"); expect(notes[3]).toContain("Mode d'emploi"); expect(notes[3]).toContain("J'avais dit que je raccrochais")
        expect(notes[4]).toContain("DEUX CAPTURES GARANTIES"); expect(notes[4]).toContain("run 3 compris")
        expect(notes[5]).toContain("QUINZE SOINS"); expect(notes[6]).toContain("PÂTES DE LUXE DU VOLEUR"); expect(notes[6]).toContain("RANG D")
        expect(notes[7]).toContain("DIX APPELS"); expect(notes[8]).toContain("ton MINITEL à toi")
        expect(notes[9]).toContain("0⚡"); expect(notes[9]).toContain("dès que ton run 3 sera terminé"); expect(notes[9]).toContain("Autel")
        expect(notes[10]).toContain("FRÉNÉSIE DU VOLEUR"); expect(notes[10]).toContain(thiefFrenzyEndLabel(Date.UTC(2026, 10, 1, 17, 5)))
        expect(notes[11]).toContain("une fois ton run 3 terminé")
        expect(thiefLootRows({ catches: 0, heals: 0, minitel: 0, freeFights: 0, frenzyUntil: Date.now() + DAY, frenzyPending: false, asleep: "run3" })[0].count).toBe("sans effet ici")
        expect(thiefFrenzyEndLabel(new Date(2026, 10, 1, 18, 5).getTime())).toBe("dimanche 1er novembre à 18h05")
        expect(thiefHomeLines("X", "a", { comeback: true })[1]).toContain("Un voleur qui tient parole, ça n'existe pas")
        // Son retour vaut aussi quand il ne vole pas (un seul Daemon, rien de tentant) : jamais d'adieux ignorés.
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("lines: [...(th.thefts === THIEF_FAKE_FAREWELL ? THIEF_COMEBACK_LINES : []), ...THIEF_LONELY_LINES]")
        expect(gs).toContain("lines: [...(th.thefts === THIEF_FAKE_FAREWELL ? THIEF_COMEBACK_LINES : []), ...THIEF_NOTHING_TEMPTING_LINES]")
        expect([...notes].join(" ")).toContain("ni sur l'île Émeraude")
    })
})
