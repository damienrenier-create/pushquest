import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { PLATINE_HOLDER_ROOM_LINES, PLATINE_JUST_CROWNED_LINES, PLATINE_SELF_THRONE_INTRO, PLATINE_DEFEAT_LINES, platineDefeatBaseLines } from "../data/platineLore"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LA SALLE DU TRÔNE RECONNAÎT SON MAÎTRE (19/10/2026). Mools, premier Maître Ultime, a bouclé le couloir et trouvé une
// « salle vide » : le vaincu lui disait « va-t'en », la porte de droite poussait l'étape au-delà du couloir, et la chaise
// répondait « La salle est vide ». Garde-fous structurels sur les trois branches corrigées + l'écran de défaite.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("textes", () => {
    it("le détenteur apprend son titre ET où le consulter", () => {
        const all = PLATINE_HOLDER_ROOM_LINES.join(" ")
        expect(all).toContain("MAÎTRE ULTIME DU NEXUS")
        expect(all).toContain("Palmarès"); expect(all).toContain("Empereurs")
        expect(PLATINE_JUST_CROWNED_LINES.join(" ")).toContain("porte de droite")
        expect(PLATINE_SELF_THRONE_INTRO).toContain("{days}")
    })
})

describe("gameStore — branche y_fusion_platine", () => {
    const src = read("src/lib/gamebook/yellow/store/gameStore.ts")
    const branch = src.slice(src.indexOf('trainerId === "y_fusion_platine"'), src.indexOf('trainerId === "y_fusion_miroir"'))
    it("⚠️ dernier adversaire à terre → lignes de sacre (plus de « va-t'en » sans condition)", () => {
        expect(branch).toContain("isPlatineFinalStep()")
        expect(branch).toContain("PLATINE_JUST_CROWNED_LINES")
    })
    it("⚠️ couloir terminé → la salle appartient au Maître, AVANT le repli « La salle est vide »", () => {
        const cleared = branch.indexOf("isPlatineCorridorCleared()")
        const empty = branch.indexOf("La salle est vide")
        expect(cleared).toBeGreaterThan(0)
        expect(cleared).toBeLessThan(empty)
        expect(branch).toContain("PLATINE_HOLDER_ROOM_LINES")
    })
    it("⚠️ le tenant devant sa propre chaise reçoit l'intro « c'est TOI »", () => {
        expect(src).toContain("PLATINE_SELF_THRONE_INTRO.replace(\"{days}\"")
    })
})

describe("battleStore — écran de défaite du couloir", () => {
    const src = read("src/lib/gamebook/yellow/store/battleStore.ts")
    it("⚠️ nomme le tenant (platineFoeName) et porte l'épilogue (platineDefeatLines), puis les consomme", () => {
        const i = src.indexOf("const fusionDefeat = ")
        const block = src.slice(i, i + 1200)
        expect(block).toContain("platineFoeName")
        expect(block).toContain("epilogue: isPlatineRoom && platineDefeatLines")
        expect(block).toContain("platineFoeName = null; platineDefeatLines = null")
    })
})

describe("route platine-throne + Palmarès", () => {
    it("⚠️ la route borne via le module pur et garde le règne du tenant", () => {
        const route = read("src/app/api/gamebook/yellow/platine-throne/route.ts")
        expect(route).toContain("sanitizeThroneTeam, reclaimThrone")
        expect(route).not.toContain("function sanitizeThroneTeam(")
        expect(route).toContain("reclaimThrone(prev, team, avatar, new Date(), isTenant)")
    })
    it("⚠️ le classement des Empereurs affiche le titre renvoyé par la route", () => {
        expect(read("src/app/gamebook/yellow/RunScoreboardPanel.tsx")).toContain("e.title")
    })
})

describe("défaite dans le couloir : le texte dit la vérité du point", () => {
    it("tenant tiers → il marque ; trône vacant → personne ; le Maître chez lui → rien", () => {
        expect(platineDefeatBaseLines("holder", "moi")).toEqual(PLATINE_DEFEAT_LINES)
        expect(platineDefeatBaseLines(null, "moi").join(" ")).toContain("Personne ne marque")
        expect(platineDefeatBaseLines("moi", "moi").join(" ")).toContain("ton règne continue")
        expect(platineDefeatBaseLines("holder", null)).toEqual(PLATINE_DEFEAT_LINES) // identité inconnue → cas général
        expect(platineDefeatBaseLines(undefined, "moi")).toEqual(PLATINE_DEFEAT_LINES) // couloir pas chargé → tenant inconnu → cas général
    })
})

describe("relecture du 19/10 (garde-fous structurels)", () => {
    const game = read("src/lib/gamebook/yellow/store/gameStore.ts")
    const battle = read("src/lib/gamebook/yellow/store/battleStore.ts")
    it("⚠️ couloir pas chargé : on attend, on ne jette pas le gauntlet (soin gratuit)", () => {
        const branch = game.slice(game.indexOf('trainerId === "y_fusion_platine"'), game.indexOf('trainerId === "y_fusion_miroir"'))
        expect(branch.indexOf("isPlatineCorridorLoaded()")).toBeGreaterThan(0)
        expect(branch.indexOf("isPlatineCorridorLoaded()")).toBeLessThan(branch.indexOf("disposeFusionGauntlet()"))
    })
    it("⚠️ identité = session, jamais team[].currentOwnerId (faux après un Troc)", () => {
        expect(game).toContain("getCurrentPlayerId() || null")
        expect(battle).toContain("getCurrentPlayerId() || null")
        expect(game).not.toContain("team.map((m) => m.currentOwnerId)")
        expect(battle).not.toContain("team.map((m) => m.currentOwnerId)")
    })
    it("⚠️ la victoire réécrit le carry ; les photos gèlent les objets HÉRITÉS ; les salles OR sont assainies à la lecture", () => {
        const i = battle.indexOf("markPlatineOpponentBeaten()")
        expect(battle.slice(i, i + 600)).toContain("setFusionLeagueCarry(j)")
        expect(battle.split("f.result.heldItems.length ? [...f.result.heldItems]").length - 1).toBe(2)
        expect(read("src/app/api/gamebook/yellow/platine-throne/route.ts")).toContain("team: sanitizeThroneTeam(team)")
        expect(read("src/app/gamebook/yellow/FusionDetailView.tsx")).toContain("speciesId: sp!.id")
    })
})

describe("relecture du 19/10 (2e passe)", () => {
    it("⚠️ trône pas chargé : sortie AVANT toute reconstruction d'équipe dans launchFusionLeague", () => {
        const g = read("src/lib/gamebook/yellow/store/gameStore.ts")
        const fn = g.slice(g.indexOf("function launchFusionLeague("))
        const guard = fn.indexOf("trainerId === \"y_fusion_platine\" && !isPlatineCorridorLoaded()")
        expect(guard).toBeGreaterThan(0)
        expect(guard).toBeLessThan(fn.indexOf("let playerFusions = getGauntletTeam()"))
    })
    it("⚠️ sacres OR : bornés à l'écriture et réservés à qui a l'argent (tous mondes)", () => {
        const hof = read("src/app/api/gamebook/yellow/fusion-hall-of-fame/route.ts")
        expect(hof).toContain("const team = sanitizeThroneTeam(body.team)")
        expect(hof).toContain("saveHasMarker(prog?.flags, \"fusleague_argent\", { includeReplay: true })")
        expect(read("src/app/api/gamebook/yellow/platine-throne/route.ts")).toContain("saveHasMarker(prog?.flags, PLATINE_OPEN_MARKER)")
    })
})
