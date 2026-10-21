import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    BOAT_BADGE, BOAT_TRAINER_IDS, BOAT_BOSS_IDS, ARENA_KEY_ITEM_ID, KEY_GUARD_TRAINER_ID, KEY_GUARD_SPRITE,
    isBoatTrainer, boatArenaCleared, keyGuardActive, withImpliedAncre, migrateBoatBadge, nextArenaHint, gymBadgeCount,
} from "./boatArena"
import { getSpecies } from "./species"
import { run3MaxScore, run3EnergyMaxScore } from "./run3Score"
import { ALL_BADGE_IDS, BADGE_REPS_CAP_BONUS } from "./badges"
import { getTrainer, TRAINERS } from "./trainers"
import { getItem } from "./items"
import { SIGHT_RUN_TEAMS } from "./sightRunTeams"
import { NGPLUS_ARENA_TEAMS, RUN3_ARENA_TEAMS } from "./ngplusArenas"
import { run3ArenaBossTeam } from "./run3Bosses"
import { arenaInfo, run3ArenaInfo, FULL_BADGE_ORDER, arenaGate } from "./arenaInfos"
import { wildLevelCap } from "./encounters"
import { speciesAtLevel } from "./ace"

// ARÈNE 4 = LE BATEAU (décision Sartay du 21/10/2026 : « forcer les gens à voyager »). Ordre : Plante → Roche → Feu →
// BATEAU (badge ANCRE) → Électrik → Eau. Tout l'équipage battu → badge + CLÉ ; le GARDIEN DES CLÉS garde l'Électrik.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("arène 4 = le bateau — badge ANCRE", () => {
    it("6 badges dans l'ordre de jeu, le bateau en 4e (Ligue, Panthéon des arènes)", () => {
        expect(ALL_BADGE_IDS).toEqual(["plante", "roche", "feu", "ancre", "elec", "eau"])
        expect(FULL_BADGE_ORDER).toEqual([...ALL_BADGE_IDS])
        expect(arenaGate("ancre", ["plante", "roche", "feu"])).toBe("next")
        expect(arenaGate("elec", ["plante", "roche", "feu"])).toBe("reachable")
    })
    it("le badge tombe quand les 4 matelots ET les 2 boss sont battus — pas avant", () => {
        expect(BOAT_TRAINER_IDS).toHaveLength(6)
        for (const id of BOAT_TRAINER_IDS) { expect(isBoatTrainer(id)).toBe(true); expect(getTrainer(id), id).toBeTruthy() }
        expect(isBoatTrainer("y_frere_frisquet")).toBe(false)
        const beaten = new Set(BOAT_TRAINER_IDS.slice(0, 5))
        expect(boatArenaCleared((id) => beaten.has(id))).toBe(false)       // il manque un boss
        beaten.add(BOAT_TRAINER_IDS[5])
        expect(boatArenaCleared((id) => beaten.has(id))).toBe(true)
        // Aucun dresseur du bateau ne porte le badge : sinon battre UN boss suffirait (attribution générique).
        for (const id of BOAT_TRAINER_IDS) expect(getTrainer(id)?.badge).toBeUndefined()
    })
    it("battleStore : badge + clé à l'équipage complet, clé reprise par le gardien vaincu, palier du run 3", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("isBoatTrainer(storeState.trainer.trainerId) && boatArenaCleared(isTrainerDefeated) && awardBadge(BOAT_BADGE)")
        expect(bs).toContain("addItem(ARENA_KEY_ITEM_ID, 1)")
        expect(bs).toContain("storeState.trainer.trainerId === KEY_GUARD_TRAINER_ID) consumeItem(ARENA_KEY_ITEM_ID)")
        expect(bs).toContain("badgeAwarded === BOAT_BADGE ? RUN3_BOAT_ENERGY")
    })
    it("run 3 : le bateau ne compte PAS au score (classement comparable avec ceux qui ont déjà fini le concours)", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).not.toContain("boatBossSlot")
        expect(bs).toContain("if (r3 || isLeague) {")
        expect(run3MaxScore()).toBe(2257) // = le score de Franss et de Jacanon (21/10/2026)
        expect(run3EnergyMaxScore()).toBe(10_000)
    })
    it("la CLÉ est un objet clé, et ne passe pas d'un run à l'autre", () => {
        expect(getItem(ARENA_KEY_ITEM_ID)?.category).toBe("MISC")
        expect(read("src/lib/gamebook/yellow/store/playerStore.ts")).not.toMatch(/CROSS_RUN_KEY_ITEMS[^\n]*cle_arene/)
    })
})

describe("le GARDIEN DES CLÉS (porte du GYM → arène 5, Électrik)", () => {
    it("présent entre le badge Feu et le badge Électrik, tant qu'il n'est pas battu", () => {
        expect(keyGuardActive(["plante", "roche"], false)).toBe(false)
        expect(keyGuardActive(["plante", "roche", "feu"], false)).toBe(true)
        expect(keyGuardActive(["plante", "roche", "feu", "ancre"], false)).toBe(true)
        expect(keyGuardActive(["plante", "roche", "feu", "ancre"], true)).toBe(false)  // battu → porte ouverte
        expect(keyGuardActive(["plante", "roche", "feu", "elec"], false)).toBe(false)  // déjà passé (ancienne partie)
        expect(keyGuardActive(["plante", "roche", "feu", "eau"], false)).toBe(false)   // idem (cas limite : Eau sans Électrik)
    })
    it("des espèces qu'AUCUN autre dresseur n'utilise, sans rien dévoiler au Dex (Batchu au run 1, 4 inédites aux runs 2/3)", () => {
        const others = new Set<string>()
        const add = (team?: readonly { speciesId: string }[]) => (team ?? []).forEach((m) => others.add(m.speciesId))
        for (const t of TRAINERS) if (t.id !== KEY_GUARD_TRAINER_ID) { add(t.team); add(t.rematch?.team) }
        for (const team of [...Object.values(NGPLUS_ARENA_TEAMS), ...Object.values(RUN3_ARENA_TEAMS)]) add(team)
        for (const w of ["ngplus", "run3"] as const) for (const [id, team] of Object.entries(SIGHT_RUN_TEAMS[w])) if (id !== KEY_GUARD_TRAINER_ID) add(team)
        const run1 = getTrainer(KEY_GUARD_TRAINER_ID)!.team.map((m) => m.speciesId)
        expect(run1).toContain("batchu")
        expect(others.has("batchu")).toBe(false)
        for (const id of run1) { const s = getSpecies(id)!; expect(s.runTwoOnly || s.runThreeOnly || s.postLeague, id).toBeFalsy() }
        for (const w of ["ngplus", "run3"] as const) {
            for (const m of SIGHT_RUN_TEAMS[w][KEY_GUARD_TRAINER_ID]) {
                expect(others.has(m.speciesId), `${w} ${m.speciesId}`).toBe(false)
                expect(getSpecies(m.speciesId)?.runThreeOnly, m.speciesId).toBeFalsy() // visibles dès le run 2
            }
        }
    })
    it("dresseur hors carte, équipe au niveau du champion du bateau de chaque run", () => {
        const g = getTrainer(KEY_GUARD_TRAINER_ID)!
        expect(g.mapId.startsWith("__")).toBe(true)
        const maxLv = (team: { level: number }[]) => Math.max(...team.map((m) => m.level))
        expect(maxLv(g.team)).toBe(maxLv(getTrainer(BOAT_BOSS_IDS[0])!.team))
        for (const w of ["ngplus", "run3"] as const) {
            expect(maxLv(SIGHT_RUN_TEAMS[w][KEY_GUARD_TRAINER_ID])).toBe(maxLv(SIGHT_RUN_TEAMS[w][BOAT_BOSS_IDS[0]]))
            for (const m of SIGHT_RUN_TEAMS[w][KEY_GUARD_TRAINER_ID]) expect(speciesAtLevel(m.speciesId, m.level), m.speciesId).toBe(m.speciesId)
        }
        expect(fs.existsSync(path.join(process.cwd(), "public", KEY_GUARD_SPRITE))).toBe(true)
    })
    it("gameStore : PNJ devant le GYM, porte verrouillée, combat lancé seulement avec le badge ANCRE", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("if (keyGuardActive(getPlayerSave().badges, isTrainerDefeated(KEY_GUARD_TRAINER_ID))) {")
        expect(gs).toContain("targetMapId === \"yellow_arena_elec\" && keyGuardActive(")
        expect(gs).toContain("pendingTrainerId: KEY_GUARD_TRAINER_ID")
        expect(gs).toContain("ALL_BADGE_IDS.every((b) => withImpliedAncre(badges).includes(b))") // Ligue : 6 badges
    })
})

describe("indication de la prochaine arène (« forcer les gens à voyager »)", () => {
    it("chaque badge dit où est la suivante — après l'arène 1 : la MÊME porte du GYM", () => {
        for (const b of ALL_BADGE_IDS) expect(nextArenaHint(b), b).toBeTruthy()
        expect(nextArenaHint("plante")).toContain("MÊME porte")
        expect(nextArenaHint("feu")).toContain("BATEAU")
        expect(nextArenaHint("ancre")).toContain("CLÉ")
        expect(nextArenaHint("eau")).toContain("SIX badges")
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("const hint = nextArenaHint(badgeAwarded)")
    })
    it("la fenêtre du badge n'est plus écrasée par le discours du boss (run 2, bateau, discours de victoire)", () => {
        const c = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(c).toContain("if (rematchReward) setDeferredBadgeLines(lines)")
        expect(c).toContain("if (battle || evolutions.length > 0 || rematchReward || dialogue) return")
    })
})

describe("paliers calibrés sur 5 arènes : le badge du bateau ne les avance pas", () => {
    it("gymBadgeCount ignore l'ANCRE (panthères d'ACE, coût des attaques en fun, Archiviste)", () => {
        expect(gymBadgeCount(["plante", "roche", "feu"])).toBe(3)
        expect(gymBadgeCount(["plante", "roche", "feu", "ancre"])).toBe(3)
        expect(gymBadgeCount(["plante", "roche", "feu", "ancre", "elec"])).toBe(4)
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("badgeCount: gymBadgeCount(getPlayerSave().badges)")
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("playerAttackQuota(gymBadgeCount(getPlayer().badges))")
    })
})

describe("reprise des parties d'avant le bateau", () => {
    it("badge Électrik ou Eau déjà gagné → ANCRE offerte (avant « elec »), + le plafond d'un badge", () => {
        const r = migrateBoatBadge({ badges: ["plante", "roche", "feu", "elec"], repsCap: 2000 }, BADGE_REPS_CAP_BONUS)
        expect(r.changed).toBe(true)
        expect(r.badges).toEqual(["plante", "roche", "feu", "ancre", "elec"]) // le dernier gagné reste en dernier
        expect(r.repsCap).toBe(2000 + BADGE_REPS_CAP_BONUS)
        expect(r.items[ARENA_KEY_ITEM_ID]).toBeUndefined() // la porte ne lui est plus fermée : pas de clé
    })
    it("le badge offert ne rouvre pas un combat ANANAS déjà joué (un combat encore dû reste dû)", () => {
        const done = migrateBoatBadge({ badges: ["plante", "roche", "feu", "elec"], ananasLastBadgeCount: 4 }, BADGE_REPS_CAP_BONUS)
        expect(done.ananasLastBadgeCount).toBe(5) // = badges.length après reprise → pas de combat gratuit
        const due = migrateBoatBadge({ badges: ["plante", "roche", "feu", "elec"], ananasLastBadgeCount: 3 }, BADGE_REPS_CAP_BONUS)
        expect(due.ananasLastBadgeCount).toBe(3)  // l'Ananas du badge Électrik reste à jouer
        const crew = migrateBoatBadge({ badges: ["plante", "roche", "feu"], defeatedTrainers: [...BOAT_TRAINER_IDS], ananasLastBadgeCount: 3 }, BADGE_REPS_CAP_BONUS)
        expect(crew.ananasLastBadgeCount).toBe(3) // badge vraiment mérité → son Ananas s'ouvre normalement
        expect(read("src/lib/gamebook/yellow/store/saveManager.ts")).toContain("ananasLastBadgeCount: boat.ananasLastBadgeCount")
    })
    it("run 3 : badge offert mais plafond inchangé (paliers fixes)", () => {
        expect(migrateBoatBadge({ badges: ["plante", "roche", "feu", "elec", "eau"], repsCap: 1000 }, 0).repsCap).toBe(1000)
    })
    it("tout l'équipage déjà battu (sans Électrik) → badge + CLÉ", () => {
        const r = migrateBoatBadge({ badges: ["plante", "roche", "feu"], defeatedTrainers: [...BOAT_TRAINER_IDS], repsCap: 1500 }, BADGE_REPS_CAP_BONUS)
        expect(r.badges).toEqual(["plante", "roche", "feu", "ancre"])
        expect(r.items[ARENA_KEY_ITEM_ID]).toBe(1)
    })
    it("idempotente, et rien à faire pour qui n'a pas dépassé le Feu", () => {
        const once = migrateBoatBadge({ badges: ["plante", "roche", "feu", "elec"], repsCap: 2000 }, BADGE_REPS_CAP_BONUS)
        const twice = migrateBoatBadge({ badges: once.badges, repsCap: once.repsCap }, BADGE_REPS_CAP_BONUS)
        expect(twice.changed).toBe(false)
        expect(twice.repsCap).toBe(once.repsCap)
        expect(migrateBoatBadge({ badges: ["plante", "roche", "feu"], defeatedTrainers: ["y_aqua_n1"] }, 250).changed).toBe(false)
    })
    it("lectures serveur de saves pas encore reprises : l'ANCRE est implicite", () => {
        expect(withImpliedAncre(["plante", "roche", "feu", "elec", "eau"])).toEqual(["plante", "roche", "feu", "ancre", "elec", "eau"])
        expect(withImpliedAncre(["plante", "roche", "feu"])).toEqual(["plante", "roche", "feu"])
        expect(read("src/lib/gamebook/yellow/store/saveManager.ts")).toContain("migrateBoatBadge(w, fixedCapWorld ? 0 : BADGE_REPS_CAP_BONUS)")
    })
})

describe("courbe de niveaux : Gelée < arène 3 < Plage < bateau ≤ gardien < Électrik < Eau, dans les 3 runs", () => {
    const lv = (team?: { level: number }[]) => (team ?? []).map((m) => m.level)
    const onMap = (mapId: string) => TRAINERS.filter((t) => t.mapId === mapId)
    const teamOf = (id: string, w: "run1" | "ngplus" | "run3") => {
        const t = getTrainer(id)!
        if (w === "run1") return t.team
        if (w === "ngplus") return NGPLUS_ARENA_TEAMS[id] ?? SIGHT_RUN_TEAMS.ngplus[id] ?? t.team
        return RUN3_ARENA_TEAMS[id] ?? SIGHT_RUN_TEAMS.run3[id] ?? t.team
    }
    const zone = (mapId: string, w: "run1" | "ngplus" | "run3") => onMap(mapId).flatMap((t) => lv(teamOf(t.id, w)))
    for (const w of ["run1", "ngplus", "run3"] as const) {
        it(`${w}`, () => {
            const gelee = zone("yellow_grotte_gelee", w), plage = zone("yellow_plage", w), boat = zone("yellow_aqua_arena", w)
            const feuTop = w === "run3" ? Math.max(...lv(run3ArenaBossTeam("feu"))) : Math.max(...zone("yellow_arena_feu", w))
            const elecBossTop = w === "run3" ? Math.max(...lv(run3ArenaBossTeam("elec"))) : Math.max(...lv(teamOf("y_elecarena_boss", w)))
            const eauBossTop = w === "run3" ? Math.max(...lv(run3ArenaBossTeam("eau"))) : Math.max(...lv(teamOf("y_eauarena_boss", w)))
            const guardTop = Math.max(...lv(teamOf(KEY_GUARD_TRAINER_ID, w)))
            expect(Math.max(...gelee), "Gelée ≤ arène 3").toBeLessThanOrEqual(feuTop)
            expect(Math.min(...plage), "Plage ≥ arène 3").toBeGreaterThanOrEqual(feuTop)
            expect(Math.min(...boat), "bateau > Plage").toBeGreaterThan(Math.max(...plage))
            expect(guardTop, "gardien = champion du bateau").toBe(Math.max(...boat))
            expect(elecBossTop, "Électrik > bateau").toBeGreaterThan(Math.max(...boat))
            expect(eauBossTop, "Eau > Électrik").toBeGreaterThan(elecBossTop)
        })
    }
    it("plafond des sauvages : 40 avant le bateau, 45 avant l'Électrik", () => {
        expect(wildLevelCap(["plante", "roche", "feu"])).toBe(40)
        expect(wildLevelCap(["plante", "roche", "feu", "ancre"])).toBe(45)
    })
    it("les fiches d'arène connaissent le bateau (panneau, Ananas)", () => {
        expect(arenaInfo("ancre")?.bossName).toBe("CAPITAINE VAGUE")
        expect(arenaInfo("ancre", true)?.levelMax).toBe(Math.max(...lv(SIGHT_RUN_TEAMS.ngplus[BOAT_BOSS_IDS[0]]), ...BOAT_TRAINER_IDS.flatMap((id) => lv(SIGHT_RUN_TEAMS.ngplus[id]))))
        expect(run3ArenaInfo("ancre")?.order).toBe(4)
    })
})
