import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { YELLOW_MAPS } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { TRAINER_SIGHTS, sightTiles } from "./trainerSight"
import { createMonInstance } from "../battle/factory"
import { createBattle, resolveTurn, type BattleState } from "../battle/engine"
import { fullStats } from "../battle/stats"
import { getSpecies } from "./species"
import { bestCounter, baseSpeciesOf, speciesAtLevel } from "./ace"
import { HELD_ITEMS, HELD_ITEM_LIST, isHeldItem, heldEffect, THIEF_ITEM_ID } from "./heldItems"
import { emptySave, parseSave } from "../storage/save"
import type { MonInstance } from "../battle/types"
import {
    hydratePlayer, getPlayer, getThief, commitTheft, recoverStolen, setActiveWorld, startReplayWorld, clearThiefForReset,
    thiefProtectedUids, thiefVictimsNow,
} from "../store/playerStore"
import {
    THIEF_NPC_ID, THIEF_MAP_ID, THIEF_HOME, THIEF_HIDEOUT_POOLS, THIEF_SPRITE, THIEF_MAX_THEFTS, THIEF_LUXE_GIFT, THIEF_LUXE_ITEM_ID, THIEF_BALL_GIFT_ID,
    THIEF_STRANGER_NAME, THIEF_NOTHING_TEMPTING_LINES, type ThiefState, type ThiefSpot,
    emptyThiefState, thiefDayKey, thiefCanStealToday, thiefGone, thiefEligibleVictims, stateAfterTheft, buildThiefTeam, nextThiefSpot, thiefHideoutPool, pickThiefVictim,
    thiefHomeLines, thiefStoleLines, thiefFoundLines, thiefWinLines, thiefAnecdote, thiefMonName, THIEF_ALREADY_TODAY_LINES, THIEF_LONELY_LINES,
} from "./thief"

// LE VOLEUR de Cendreville (demande Sartay du 27/10/2026) + le Surin du Voleur + la mise en garde Pâte de Luxe / Tiramisu.
// Après deux revues adversariales : rejeu du run 1 qui effaçait le vol, retour « tel quel », Surin au début du combat seulement
// et jamais en PvP, uids protégés, cachette toujours différente (tirée à Cendreville seulement), save immédiate du vol, victime
// stable dans la journée, NÉMÉSIS = contres de l'équipe au moment du vol (+ le volé en personne), cadeaux remis LORS DU VOL,
// défaite sans XP gardée, jamais de récupération dans une bulle de rejeu.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const DAEMO_SPOTS = [[26, 15], [8, 17], [17, 29], [36, 4], [22, 2], [7, 8], [30, 29]]
const hasMsg = (st: BattleState, sub: string) => st.events.some((e) => e.kind === "message" && e.text.includes(sub))
const MUSCU = /pompes|quota|sueur|\breps\b/i
const maxHp = (m: MonInstance) => fullStats(m, getSpecies(m.speciesId)!).hp
const sum = (r?: Partial<Record<string, number>>) => Object.values(r ?? {}).reduce((a: number, v) => a + (v ?? 0), 0)
const team3 = () => [createMonInstance("rochison", 40), createMonInstance("plumiot", 12), createMonInstance("gouttiny", 20)]
const stolenState = (stolen: MonInstance, snapshot: MonInstance[], thefts = 1): ThiefState =>
    ({ thefts, lastTheftDay: "2026-10-26", stolen, snapshot, stolenAt: "2026-10-26T20:00:00.000Z", stolenWorld: "live" })
const counterOf = (speciesId: string, level: number) => speciesAtLevel(baseSpeciesOf(bestCounter([...getSpecies(speciesId)!.types])), level)

describe("Voleur — cases, planche, objet", () => {
    it("chez lui (37,18) et ses 19 cachettes (5 cartes) sont praticables, hors sorties/PNJ/regards/spots ; (26,11) est un mur → (25,11)", () => {
        const cendre = YELLOW_MAPS[THIEF_MAP_ID]
        expect(cendre.tiles[THIEF_HOME.y][THIEF_HOME.x]).toBe("path")
        expect(cendre.tiles[11][26]).toBe("tree")
        const all = THIEF_HIDEOUT_POOLS.flatMap((p) => p.spots.map(([x, y]) => ({ mapId: p.mapId, x, y })))
        expect(all).toHaveLength(19)
        expect(new Set(all.map((s) => `${s.mapId}:${s.x},${s.y}`)).size).toBe(19)
        for (const s of [{ mapId: THIEF_MAP_ID, x: THIEF_HOME.x, y: THIEF_HOME.y }, ...all]) {
            const m = YELLOW_MAPS[s.mapId], k = `${s.mapId} ${s.x},${s.y}`
            expect(m, k).toBeTruthy()
            expect(s.x >= 0 && s.y >= 0 && s.x < m.width && s.y < m.height, k).toBe(true)
            expect(isBlockingTile(m.tiles[s.y][s.x]), k).toBe(false)
            expect((m.exits ?? []).some((e) => e.x === s.x && e.y === s.y), k).toBe(false)
            expect(YELLOW_NPCS.some((n) => n.mapId === s.mapId && n.initialX === s.x && n.initialY === s.y), k).toBe(false)
            const blocked = (x: number, y: number) => { const t = m.tiles[y]?.[x]; return !t || isBlockingTile(t) }
            for (const sp of TRAINER_SIGHTS.filter((t) => t.mapId === s.mapId)) {
                expect(sightTiles(sp, blocked).some((t) => t.x === s.x && t.y === s.y), `${k} dans le regard de ${sp.trainerId}`).toBe(false)
            }
            if (s.mapId === THIEF_MAP_ID) expect(DAEMO_SPOTS.some(([sx, sy]) => sx === s.x && sy === s.y), k).toBe(false)
        }
        // Les cachettes validées par Sartay (page de choix du 31/10/2026 : « toutes gardées », paliers « dès la fuite du 3e et du 6e vol »).
        expect(THIEF_HIDEOUT_POOLS.map((p) => [p.mapId, p.fromThefts, p.spots])).toEqual([
            ["yellow_cendreville", 1, [[37, 27], [6, 32], [25, 11]]],
            ["yellow_entrance", 3, [[7, 29], [14, 33], [41, 31], [38, 4]]],
            ["yellow_grotte_gelee", 6, [[6, 6], [15, 4], [22, 15], [6, 28]]],
            ["yellow_plage", 6, [[13, 12], [17, 30], [6, 34], [7, 26]]],
            ["yellow_hautes_herbes", 6, [[5, 2], [10, 2], [2, 6], [13, 6]]],
        ])
        expect(fs.existsSync(path.join(process.cwd(), "public", THIEF_SPRITE))).toBe(true)
        expect(THIEF_NPC_ID).toBe("y_voleur")
    })
    it("paliers : Cendreville seule aux vols 1-2 ; + Ville Jaune dès la fuite du 3e ; + Gelée, Plage, plaine dès celle du 6e (badges du monde actif)", () => {
        const maps = (thefts: number, badges: string[]) => [...new Set(thiefHideoutPool(thefts, badges).map((s) => s.mapId))]
        const all6 = ["plante", "roche", "feu", "ancre", "elec", "eau"]
        expect(maps(1, all6)).toEqual(["yellow_cendreville"]); expect(maps(2, all6)).toEqual(["yellow_cendreville"])
        expect(maps(3, all6)).toEqual(["yellow_cendreville", "yellow_entrance"]); expect(maps(5, all6)).toEqual(["yellow_cendreville", "yellow_entrance"])
        expect(maps(6, all6)).toEqual(["yellow_cendreville", "yellow_entrance", "yellow_grotte_gelee", "yellow_plage", "yellow_hautes_herbes"])
        expect(thiefHideoutPool(9, all6)).toHaveLength(19)
        expect(maps(7, ["plante", "roche", "feu"])).toEqual(["yellow_cendreville", "yellow_entrance", "yellow_grotte_gelee", "yellow_plage"]) // sans badge Éclair : pas la plaine
        expect(maps(7, ["plante"])).toEqual(["yellow_cendreville", "yellow_entrance"]) // nouveau run : Gelée et Plage hors d'atteinte
        expect(thiefHideoutPool(0, all6)).toEqual([])
    })
    it("Surin du Voleur : objet tenu connu (survit à parseMon), effet de début de combat, jamais à l'étal, hérité par une fusion", () => {
        expect(isHeldItem(THIEF_ITEM_ID)).toBe(true)
        expect(HELD_ITEMS[THIEF_ITEM_ID].entryStab).toBe(true)
        expect(HELD_ITEMS[THIEF_ITEM_ID].description).toContain("envoyé en premier")
        expect(HELD_ITEM_LIST.some((i) => i.id === THIEF_ITEM_ID)).toBe(false)
        const s = parseSave({ ...emptySave(), team: [{ ...createMonInstance("rochison", 30), heldItem: THIEF_ITEM_ID }] })
        expect(s.team[0].heldItem).toBe(THIEF_ITEM_ID)
        expect(heldEffect({ speciesId: "rochison", heldItem: "grelot_coque", heldItem2: THIEF_ITEM_ID })?.entryStab).toBe(true)
        expect(heldEffect({ speciesId: "rochison", heldItem: "grelot_coque" })?.entryStab).toBeFalsy()
    })
})

describe("Voleur — état global (vol, instantané, cadeau du vol)", () => {
    it("jamais le dernier Daemon, ni un Daemon sur l'étal, ni un uid protégé ; un vol fige l'équipe entière et retire la cible", () => {
        expect(thiefEligibleVictims([createMonInstance("rochison", 5)])).toEqual([])
        const t = team3(); t[1] = { ...t[1], tradeState: "listed" }
        expect(thiefEligibleVictims(t).map((m) => m.uid)).toEqual([t[0].uid, t[2].uid])
        expect(thiefEligibleVictims(t, new Set([t[0].uid])).map((m) => m.uid)).toEqual([t[2].uid])
        expect(stateAfterTheft(null, t, t[1].uid, "live")).toBeNull() // posé sur l'étal → refus
        expect(stateAfterTheft(null, t, t[0].uid, "live", { protectedUids: new Set([t[0].uid]) })).toBeNull() // protégé → refus
        const r = stateAfterTheft(null, t, t[2].uid, "live", { now: new Date(2026, 9, 27, 23, 50) })!
        expect(r.stolen.uid).toBe(t[2].uid)
        expect(r.remaining.map((m) => m.uid)).toEqual([t[0].uid, t[1].uid])
        expect(r.state.thefts).toBe(1); expect(r.state.lastTheftDay).toBe("2026-10-27"); expect(r.state.stolenWorld).toBe("live")
        expect(r.state.snapshot.map((m) => m.uid)).toEqual(t.map((m) => m.uid)) // l'équipe ENTIÈRE, volé compris
        expect(thiefCanStealToday(r.state, "2026-10-27")).toBe(false)
        expect(stateAfterTheft(r.state, r.remaining, t[0].uid, "live")).toBeNull() // vol déjà en cours
        expect(thiefCanStealToday(emptyThiefState(), thiefDayKey())).toBe(true)
        expect(thiefDayKey(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05")
    })
    it("1er vol : le Surin est glissé au Daemon volé (aussi dans l'instantané) ; son ancien objet est rendu ; objet inconnu → Surin au sac", () => {
        const a = createMonInstance("rochison", 40)
        const b = { ...createMonInstance("plumiot", 12), heldItem: "baie_soin" }
        const r = stateAfterTheft(null, [a, b], b.uid, "live")!
        expect(r.gift).toEqual({ theftNo: 1, surin: "mon", returnedItem: "baie_soin" })
        expect(r.stolen.heldItem).toBe(THIEF_ITEM_ID)
        expect(r.state.snapshot.find((m) => m.uid === b.uid)?.heldItem).toBe(THIEF_ITEM_ID)
        const odd = { ...createMonInstance("gouttiny", 20), heldItem: "objet_inconnu" }
        const r2 = stateAfterTheft(null, [a, odd], odd.uid, "live")!
        expect(r2.gift.surin).toBe("bag"); expect(r2.stolen.heldItem).toBe("objet_inconnu")
        const r3 = stateAfterTheft({ ...emptyThiefState(), thefts: 1 }, [a, b], b.uid, "live")!
        expect(r3.gift).toEqual({ theftNo: 2 }); expect(r3.stolen.heldItem).toBe("baie_soin") // pas de Surin hors du 1er vol
    })
    it("la victime du jour est STABLE (même jour, même n° de vol → même cible, quel que soit l'ordre de l'équipe)", () => {
        const t = [...team3(), createMonInstance("plumiot", 30), createMonInstance("rochison", 7)]
        const v1 = pickThiefVictim(t, "2026-10-27", 0)
        expect(pickThiefVictim([...t].reverse(), "2026-10-27", 0).uid).toBe(v1.uid)
        expect(t.some((m) => m.uid === v1.uid)).toBe(true)
        const picks = new Set(Array.from({ length: 20 }, (_, d) => pickThiefVictim(t, `2026-11-${String(d + 1).padStart(2, "0")}`, 0).uid))
        expect(picks.size).toBeGreaterThan(1) // ça varie bien d'un jour à l'autre
    })
    it("NÉMÉSIS : le contre de chaque Daemon au même niveau, mêmes IV, même entraînement ; le volé combat en personne", () => {
        const a = { ...createMonInstance("rochison", 40), ev: { atk: 120, def: 80 }, allocated: { atk: 12, def: 8 } }
        a.ivs = { hp: 3, atk: 9, def: 12, spe: 5, spc: 7 }
        const b = createMonInstance("plumiot", 12)
        const c = createMonInstance("gouttiny", 20)
        const r = stateAfterTheft(null, [a, b, c], b.uid, "ngplus")!
        const foes = buildThiefTeam(r.state)
        expect(foes).toHaveLength(3)
        expect(foes[0].speciesId).toBe(counterOf("rochison", 40)); expect(foes[0].level).toBe(40)
        expect(foes[0].ivs).toEqual(a.ivs)
        expect(sum(foes[0].ev)).toBe(200); expect(sum(foes[0].allocated)).toBe(20)
        expect(foes[1].speciesId).toBe("plumiot"); expect(foes[1].heldItem).toBe(THIEF_ITEM_ID) // le volé EN PERSONNE, avec le Surin
        expect(foes[2].speciesId).toBe(counterOf("gouttiny", 20)); expect(foes[2].level).toBe(20)
        expect(foes.every((f) => f.uid.startsWith("thief-") && !f.owned && f.currentHp === maxHp(f) && f.status === "NONE")).toBe(true)
        expect(new Set([...foes.map((f) => f.uid), a.uid, b.uid, c.uid]).size).toBe(6)
        expect(buildThiefTeam({ ...r.state, snapshot: [] }).map((f) => f.speciesId)).toEqual(["plumiot"]) // repli : le volé seul
        expect(thiefGone({ ...emptyThiefState(), thefts: THIEF_MAX_THEFTS })).toBe(true)
        expect(thiefGone({ ...emptyThiefState(), thefts: THIEF_MAX_THEFTS, stolen: a })).toBe(false)
    })
    it("cachette : toujours DIFFÉRENTE de la précédente, sur n'importe quelle carte du tirage ; au premier tirage, n'importe laquelle", () => {
        const key = (s: ThiefSpot | null) => (s ? `${s.mapId}:${s.x},${s.y}` : "∅")
        for (const thefts of [1, 4, 9]) {
            const pool = thiefHideoutPool(thefts, ["plante", "roche", "feu", "ancre", "elec", "eau"])
            for (const prev of pool) {
                const seen = new Set<string>()
                for (let i = 0; i < 200; i++) { const s = nextThiefSpot(pool, prev, i / 200); expect(key(s)).not.toBe(key(prev)); seen.add(key(s)) }
                expect(seen.size).toBe(pool.length - 1)
            }
            expect(new Set(Array.from({ length: 400 }, (_, i) => key(nextThiefSpot(pool, null, i / 400)))).size).toBe(pool.length)
        }
        expect(nextThiefSpot([], null, 0.5)).toBeNull()
        const one = { mapId: THIEF_MAP_ID, x: 37, y: 27 }
        expect(nextThiefSpot([one], one, 0.5)).toEqual(one) // une seule cachette : il y retourne
    })
})

describe("Voleur — playerStore (vol, cadeaux au vol, récupération TELLE QUELLE, protections, rejeu)", () => {
    it("les 3 premiers vols : cadeau remis AU VOL (Surin, 3 Pâtes, Hyper +), retour tel quel à chaque victoire ; au 3e, il ne disparaît plus", () => {
        setActiveWorld("live")
        const t = team3()
        hydratePlayer({ team: t, pc: [], items: {}, thief: null, clanDaemonUid: undefined, craftedItems: [] })
        let c = commitTheft(t[1].uid)!
        expect(c.stolen.uid).toBe(t[1].uid); expect(c.gift.theftNo).toBe(1); expect(c.stolen.heldItem).toBe(THIEF_ITEM_ID)
        expect(getPlayer().team.map((m) => m.uid)).toEqual([t[0].uid, t[2].uid])
        let r = recoverStolen()!
        expect(r.theftNo).toBe(1); expect(r.placed).toBe("team"); expect(r.mon.heldItem).toBe(THIEF_ITEM_ID)
        expect(getThief().stolen).toBeNull(); expect(getThief().thefts).toBe(1)
        expect(recoverStolen()).toBeNull() // rien à rendre
        c = commitTheft(t[0].uid)!
        expect(c.gift.theftNo).toBe(2); expect(getPlayer().items[THIEF_LUXE_ITEM_ID]).toBe(THIEF_LUXE_GIFT) // dès le vol
        recoverStolen()
        c = commitTheft(t[2].uid)!
        expect(c.gift.theftNo).toBe(3); expect(getPlayer().items[THIEF_BALL_GIFT_ID]).toBe(1) // dès le vol
        expect(thiefGone(getThief())).toBe(false) // le 3e larcin court encore
        r = recoverStolen()!
        expect(r.theftNo).toBe(3); expect(thiefGone(getThief())).toBe(false) // de faux adieux : il revient (9 vols depuis le 31/10/2026)
        expect(getPlayer().team).toHaveLength(3)
    })
    it("1er vol : l'ancien objet tenu du volé retombe au sac ; objet inconnu → le Surin va au sac", () => {
        const a = createMonInstance("rochison", 40)
        const withBerry = { ...createMonInstance("plumiot", 12), heldItem: "baie_soin" }
        hydratePlayer({ team: [a, withBerry], pc: [], items: {}, thief: null, craftedItems: [] })
        expect(commitTheft(withBerry.uid)?.gift.returnedItem).toBe("baie_soin")
        expect(getPlayer().items["baie_soin"]).toBe(1)
        const odd = { ...createMonInstance("gouttiny", 20), heldItem: "objet_inconnu" }
        hydratePlayer({ team: [a, odd], pc: [], items: {}, thief: null, craftedItems: [] })
        expect(commitTheft(odd.uid)?.gift.surin).toBe("bag")
        expect(getPlayer().items[THIEF_ITEM_ID]).toBe(1)
        expect(recoverStolen()?.mon.heldItem).toBe("objet_inconnu")
    })
    it("retour TEL QUEL (aucune métadonnée de capture ni règle d'EV ajoutée) ; équipe pleine → boîte PC, soigné ; uid déjà pris → re-tagué", () => {
        const six = Array.from({ length: 6 }, (_, i) => createMonInstance("rochison", 10 + i))
        const old: MonInstance = { ...createMonInstance("plumiot", 55), currentHp: 3, evCurveV2: undefined, evCapBoost: undefined, capturedAt: undefined, capturedMapId: undefined, capturedLevel: undefined }
        hydratePlayer({ team: six, pc: [], items: {}, thief: stolenState(old, [...six.slice(0, 5), old], 2), craftedItems: [] })
        const r = recoverStolen()!
        expect(r.placed).toBe("pc"); expect(r.theftNo).toBe(2)
        const back = getPlayer().pc.find((m) => m.uid === old.uid)!
        expect(back.evCurveV2).toBeUndefined(); expect(back.evCapBoost).toBeUndefined()
        expect(back.capturedAt).toBeUndefined(); expect(back.capturedMapId).toBeUndefined(); expect(back.capturedLevel).toBeUndefined()
        expect(back.currentHp).toBe(maxHp(back)) // soigné à l'entrée au PC
        expect(getPlayer().team).toHaveLength(6)
        const twin = createMonInstance("gouttiny", 20)
        hydratePlayer({ team: [twin, createMonInstance("rochison", 9)], pc: [], items: {}, thief: stolenState({ ...twin }, [twin]), craftedItems: [] })
        expect(recoverStolen()!.mon.uid).toBe(`ret-${twin.uid}`)
        expect(new Set(getPlayer().team.map((m) => m.uid)).size).toBe(getPlayer().team.length)
    })
    it("uids protégés : jamais le disciple de clan ni un Daemon lié à une pièce de l'Artisane", () => {
        const t = [...team3(), createMonInstance("plumiot", 30)]
        hydratePlayer({
            team: t, pc: [], items: {}, thief: null, clanDaemonUid: t[0].uid,
            craftedItems: [{ id: "sig_0_test", name: "Test", stat: "atk", pct: 10, precision: 50, boundUid: t[1].uid, boundName: "x", boundSpeciesId: t[1].speciesId, equipped: true }],
        })
        expect([...thiefProtectedUids()].sort()).toEqual([t[0].uid, t[1].uid].sort())
        expect(thiefVictimsNow().map((m) => m.uid)).toEqual([t[2].uid, t[3].uid])
        expect(commitTheft(t[0].uid)).toBeNull(); expect(commitTheft(t[1].uid)).toBeNull()
        expect(getPlayer().team).toHaveLength(4); expect(getThief().stolen).toBeNull()
    })
    it("REJEU du run 1 (et boucle endgame) : le vol en cours SURVIT ; seul le reset volontaire l'efface", () => {
        const t = team3()
        hydratePlayer({ team: t, pc: [], items: {}, thief: null, clanDaemonUid: undefined, craftedItems: [] })
        expect(commitTheft(t[2].uid)).not.toBeNull()
        startReplayWorld("run1", null)
        expect(getPlayer().team).toHaveLength(0)
        expect(getThief().stolen?.uid).toBe(t[2].uid); expect(getThief().thefts).toBe(1)
        clearThiefForReset()
        expect(getThief()).toEqual(emptyThiefState())
    })
    it("save : l'état global survit au parse serveur (Daemon volé + instantané), corrompu → aucun vol en cours", () => {
        const t = team3()
        const r = stateAfterTheft(null, t, t[1].uid, "run3")!
        const s = parseSave({ ...emptySave(), thief: r.state })
        expect(s.thief?.thefts).toBe(1); expect(s.thief?.stolen?.uid).toBe(t[1].uid); expect(s.thief?.stolen?.heldItem).toBe(THIEF_ITEM_ID)
        expect(s.thief?.snapshot).toHaveLength(3); expect(s.thief?.stolenWorld).toBe("run3"); expect(s.thief?.lastTheftDay).toBe(r.state.lastTheftDay)
        expect(parseSave({ ...emptySave(), thief: { thefts: 12, stolen: "nope", snapshot: 3 } }).thief).toEqual({ thefts: 9, lastTheftDay: "", stolen: null, snapshot: [], stolenAt: "", stolenWorld: "" })
        expect(parseSave({ ...emptySave(), thief: null }).thief).toBeNull()
        expect(parseSave(emptySave()).thief).toBeNull()
    })
})

describe("Surin du Voleur — moteur : au début du combat seulement, plancher 1 PV, jamais en PvP", () => {
    it("envoi initial : −niveau PV au vis-à-vis, jamais K.O. ; sans objet : rien", () => {
        const lead = { ...createMonInstance("rochison", 50), heldItem: THIEF_ITEM_ID }
        const big = createMonInstance("megalithe", 60)
        const s1 = createBattle([lead], [big], { isWild: true, seed: 1 })
        expect(s1.enemy.team[0].currentHp).toBe(big.currentHp - 50)
        expect(hasMsg(s1, "Surin du Voleur")).toBe(true)
        const s2 = createBattle([lead], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        expect(s2.enemy.team[0].currentHp).toBe(1)
        const s3 = createBattle([createMonInstance("rochison", 50)], [createMonInstance("megalithe", 60)], { isWild: true, seed: 1 })
        expect(s3.enemy.team[0].currentHp).toBe(createMonInstance("megalithe", 60).currentHp)
        expect(hasMsg(s3, "Surin")).toBe(false)
    })
    it("un porteur qui ENTRE en cours de combat n'entaille pas (pas d'allers-retours à PV gratuits)", () => {
        const a = createMonInstance("rochison", 50)
        const b = { ...createMonInstance("plumiot", 40), heldItem: THIEF_ITEM_ID }
        const s0 = createBattle([a, b], [createMonInstance("megalithe", 60)], { isWild: true, seed: 3 })
        expect(hasMsg(resolveTurn(s0, { kind: "switch", teamIndex: 1 }), "Surin")).toBe(false)
    })
    it("PvP : aucune entaille (les objets tenus y sont retirés après createBattle)", () => {
        const lead = { ...createMonInstance("rochison", 50), heldItem: THIEF_ITEM_ID }
        const foe = createMonInstance("megalithe", 60)
        const s = createBattle([lead], [foe], { isWild: false, seed: 1, pvp: true })
        expect(s.enemy.team[0].currentHp).toBe(foe.currentHp)
        expect(hasMsg(s, "Surin")).toBe(false)
    })
})

describe("Voleur — dialogues et câblage", () => {
    it("textes : anecdote du dex, « miiiignon », mot du voleur selon le vol ; vocabulaire neutre ; pas de faute d'accord", () => {
        const all = [...thiefHomeLines("Rochison", thiefAnecdote("rochison")), ...thiefFoundLines("Rochison"), ...THIEF_ALREADY_TODAY_LINES, ...THIEF_LONELY_LINES, ...THIEF_NOTHING_TEMPTING_LINES,
            ...thiefStoleLines("Rochison", { theftNo: 1, surin: "mon" }), ...thiefStoleLines("Rochison", { theftNo: 1, surin: "bag" }), ...thiefStoleLines("Rochison", { theftNo: 2 }), ...thiefStoleLines("Rochison", { theftNo: 3 }),
            ...thiefWinLines(1, "Rochison", "team"), ...thiefWinLines(2, "Rochison", "pc"), ...thiefWinLines(3, "Rochison", "team")].join(" ")
        expect(all).not.toMatch(MUSCU)
        expect(all).not.toContain("sac paraît plus léger")
        expect(thiefFoundLines("Rochison")[0]).toContain("Ah ! Tu m'as trouvé, zut. Je voulais garder ton Rochison pour moi. Il est trop miiiignon.")
        const s1 = thiefStoleLines("X", { theftNo: 1, surin: "mon", returnedItem: "baie_soin" }).join(" ")
        expect(s1).toContain("Ce type était un VOLEUR"); expect(s1).toContain("Je lui ai glissé mon SURIN"); expect(s1).toContain("envoyé en premier")
        expect(s1).toContain("L'objet qu'il tenait, Baie de Soin, est retombé dans ton sac.")
        expect(thiefStoleLines("X", { theftNo: 1, surin: "bag" }).join(" ")).toContain("glissé mon SURIN dans ton sac")
        const s2 = thiefStoleLines("X", { theftNo: 2 }).join(" ")
        expect(s2).toContain("encore frappé"); expect(s2).not.toContain("Ce type était"); expect(s2).toContain("TROIS PÂTES DE LUXE"); expect(s2).toContain("DÉFINITIF")
        expect(s2).not.toMatch(/tiramisu/i) // le Tiramisu ne s'obtient pas en jeu (Sartay, 27/10/2026) : jamais promis comme rattrapage
        expect(thiefStoleLines("X", { theftNo: 3 }).join(" ")).toContain("HYPER NEXUS-BALL +")
        expect(thiefWinLines(2, "X", "pc").join(" ")).toContain("boîte PC")
        expect(thiefWinLines(3, "X", "team").join(" ")).toContain("tu ne me reverras plus") // de FAUX adieux (il revient au 4e vol)
        expect(thiefWinLines(9, "X", "team").join(" ")).toContain("je raccroche pour de vrai")
        expect(thiefWinLines(6, "X", "team").join(" ")).toContain("Six fois")
        expect(thiefWinLines(4, "X", "team").join(" ")).toContain("On se reverra")
        expect(thiefMonName({ nickname: "Caillou", speciesId: "rochison" })).toBe("Caillou")
        expect(THIEF_STRANGER_NAME).toBe("INCONNU")
    })
    it("câblage : PNJ chez lui / caché, vol à la fermeture (save immédiate), combat, récupération, save globale, mises en garde", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("pendingThiefSteal: true"); expect(gs).toContain("pendingThiefFight: true")
        expect(gs).toContain("const theft = uid ? commitTheft(uid) : null")
        expect(gs).toContain("void persistYellowSaveNow() // save IMMÉDIATE")
        expect(gs).toContain("const victims = thiefVictimsNow()")
        expect(gs).toContain("const victim = pickThiefVictim(victims, thiefDayKey(), th.thefts)")
        // Cachette re-tirée à CHAQUE ENTRÉE sur une carte du tirage (Sartay, 31/10/2026 : « retirée à chaque entrée »), clé = la carte.
        expect(gs).toContain("const pool = thiefMustStayHidden() ? [] : thiefHideoutPool(Math.max(1, th.thefts), getPlayerSave().badges)")
        expect(gs).toContain("if (curMap !== thiefDrawMap && pool.some((s) => s.mapId === curMap)) { thiefSpot = nextThiefSpot(pool, thiefLastSpot, Math.random()); thiefLastSpot = thiefSpot; thiefDrawMap = curMap }")
        expect(gs).toContain("if (spot && pool.some((s) => s.mapId === spot.mapId && s.x === spot.x && s.y === spot.y)) {") // jamais une cachette d'un autre tirage
        expect(gs).toContain("id: THIEF_NPC_ID, name: THIEF_NAME, mapId: spot.mapId")
        expect(gs).toContain("startTrainerBattle(team, buildThiefTeam(th), seed, { trainerId: THIEF_TRAINER_ID, reward: 0, aiLevel: \"hof\" })")
        expect((gs.match(/thiefDrawMap = ""/g) ?? []).length).toBeGreaterThanOrEqual(4)
        expect(gs).not.toContain("thiefSpotIdx")
        // Les baladeurs de la Ville Jaune (Sage, Fashion Victim) ne se posent jamais sur une cachette ni sur une case d'où on lui parle.
        expect(gs).toContain("const occupied = [[KEY_GUARD_POS.x, KEY_GUARD_POS.y] as const, ...fixedNpcs, ...thiefSpots, ...extraOccupied]")
        expect(gs).toContain(".filter(([x, y]) => !thiefSpots.some(([tx, ty]) => Math.abs(tx - x) + Math.abs(ty - y) <= 1))")
        expect(gs).toContain("{ comeback: th.thefts === THIEF_FAKE_FAREWELL }")
        expect(gs).toContain("} else if (!thiefGone(th) && !(th.thefts === THIEF_FAKE_FAREWELL && th.lastTheftDay === thiefDayKey())) {") // le jour des faux adieux, il n'est pas chez lui
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("const r = getActiveWorld() === \"replay\" ? null : recoverStolen()")
        expect(bs).toContain("const isThiefLoss = storeState.trainer?.trainerId === THIEF_TRAINER_ID && b.outcome !== \"win\"")
        expect(bs).toContain("if (!isFactory && !isRun2GhostLoss && !isThiefLoss) setTeam(")
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("thief: thiefGlobal, activeWorld: aw"); expect(sm).toContain("save.thief ?? null"); expect(sm).toContain("thief: p.thief ?? null")
        expect(sm).toMatch(/resetForIntro\(\)\r?\n\s+clearThiefForReset\(\)/)
        expect(read("src/lib/gamebook/yellow/storage/save.ts")).toContain("thief: parseThief(o.thief)")
        expect(read("src/app/api/gamebook/yellow/save/route.ts")).toContain("if (existing?.flags && !body.intentionalReset && !(Array.isArray(body.caps) && body.caps.includes(\"thief9\"))) keepThiefFromStored(existing.flags, save)")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("st = { thief: st.thief ?? null, team: [], pc: []")
        expect((ps.match(/st = \{ thief: st\.thief \?\? null, team: \[/g) ?? []).length).toBe(3)
        expect(ps).not.toMatch(/const placed = addCaught\(mon\)/)
        const eng = read("src/lib/gamebook/yellow/battle/engine.ts")
        expect((eng.match(/applyEntryStab\(state, /g) ?? []).length).toBe(2) // createBattle seulement
        expect(eng).toContain("if (!opts.pvp) {")
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("setLuxeConfirm({ uid: m.uid, name: displayName(m), mode: \"luxe\", item: luxeItem })")
        expect(ydc).toContain("const r = useLuxePasta(uid, item ?? PATE_LUXE_ITEM_ID)")
        expect(ydc).toContain("Cette Pâte de Luxe DU VOLEUR RE-TIRE tout le génome") // mise en garde avec les vraies chances
        expect(ydc).toContain("setLuxeConfirm({ uid: m.uid, name: displayName(m), mode: \"reroll\" })")
        expect(ydc).toContain("JE CROQUE, J'ASSUME"); expect(ydc).toContain("JE RELANCE, J'ASSUME")
        expect(ydc.indexOf("{!battle && luxeConfirm && (")).toBeGreaterThan(ydc.indexOf("{!battle && tiramisuPick && ("))
        expect(ydc).not.toContain("Irréversible, c'est un pari !\n                        </div>\n                        {[...player.team, ...player.pc].map((m) => (") // texte Pâte de Luxe corrigé
        expect(ydc).toContain("Un seul essai par Daemon, et c'est irréversible : c'est un pari !")
        // Le Tiramisu n'est disponible nulle part en jeu (Sartay, 27/10/2026) : aucun texte ne doit le promettre comme rattrapage.
        for (const s of ["passe par un Tiramisu", "Utilise un Tiramisu", "seul un Tiramisu", "seul un TIRAMISU", "que seul un Tiramisu"]) expect(ydc, s).not.toContain(s)
    })
})
