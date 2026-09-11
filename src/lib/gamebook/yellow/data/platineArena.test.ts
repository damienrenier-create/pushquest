import { describe, it, expect } from "vitest"
import {
    PLATINE_ROOM_CAP, championTeamBst, rankPlatineChampions, dedupeChampionsByUser,
    buildPlatineRoomTeam, disposePlatineRoom, buildPlatineCorridor, type PlatineChampion,
} from "./platineArena"
import { getSpecies } from "./species"
import type { FusionChampionMon } from "../storage/save"

// PALIER PLATINE — les salles sont les SACRES OR d'autres joueurs, rejoués depuis la photo gravée au serveur.
// Rien n'est recalculé : stats figées, attaques re-résolues par nom, espèce éphémère enregistrée puis détruite.

const mon = (name: string, bstEach: number, over: Partial<FusionChampionMon> = {}): FusionChampionMon => ({
    name, sprite: "/x.png", types: ["TENEBRES", "PSY"], level: 100,
    stats: { hp: bstEach, atk: bstEach, def: bstEach, spe: bstEach, spc: bstEach },
    moves: ["Lance-Flammes", "Vague Mentale"], aId: "tenebrir", bId: "jerbiwat", ...over,
})
const champ = (nickname: string, bstEach: number, wonAt = "2026-09-01T00:00:00.000Z", userId = nickname): PlatineChampion =>
    ({ userId, nickname, wonAt, team: [mon("A", bstEach), mon("B", bstEach)] })

describe("platineArena — puissance & sélection des salles", () => {
    it("la puissance d'une équipe = SOMME des BST de ses chimères", () => {
        expect(championTeamBst([mon("A", 100), mon("B", 200)])).toBe(100 * 5 + 200 * 5)
        expect(championTeamBst([])).toBe(0)
    })

    it("les salles sont classées par PUISSANCE décroissante", () => {
        const out = rankPlatineChampions([champ("faible", 100), champ("fort", 300), champ("moyen", 200)])
        expect(out.map((c) => c.nickname)).toEqual(["fort", "moyen", "faible"])
    })

    it("le couloir est PLAFONNÉ : au-delà, seules les plus fortes restent", () => {
        const many = Array.from({ length: 15 }, (_, i) => champ(`j${i}`, 100 + i))
        const out = rankPlatineChampions(many)
        expect(out).toHaveLength(PLATINE_ROOM_CAP)
        expect(out[0].nickname).toBe("j14")                    // la plus forte ouvre le classement
        expect(out.some((c) => c.nickname === "j0")).toBe(false) // la plus faible est écartée
    })

    it("à puissance ÉGALE, le sacre le plus ANCIEN passe devant (il l'a fait en premier)", () => {
        const out = rankPlatineChampions([
            champ("tardif", 200, "2026-09-10T00:00:00.000Z"),
            champ("pionnier", 200, "2026-08-01T00:00:00.000Z"),
        ])
        expect(out.map((c) => c.nickname)).toEqual(["pionnier", "tardif"])
    })

    it("une équipe VIDE (payload illisible) n'ouvre pas de salle", () => {
        const vide: PlatineChampion = { userId: "x", nickname: "vide", wonAt: "2026-09-01T00:00:00.000Z", team: [] }
        expect(rankPlatineChampions([vide, champ("ok", 100)]).map((c) => c.nickname)).toEqual(["ok"])
    })

    it("un même joueur ne tient qu'UNE salle par palier : on garde son sacre le plus puissant", () => {
        const out = dedupeChampionsByUser([champ("Mools", 100, "2026-09-01T00:00:00.000Z", "u1"), champ("Mools", 400, "2026-09-09T00:00:00.000Z", "u1")])
        expect(out).toHaveLength(1)
        expect(championTeamBst(out[0].team)).toBe(400 * 5 * 2)
    })
})

describe("platineArena — reconstruction d'une salle", () => {
    it("rejoue la PHOTO : stats figées, attaques résolues, espèce éphémère enregistrée puis détruite", () => {
        const c = champ("Jacanon", 150)
        const room = buildPlatineRoomTeam(c, "r1")
        expect(room.team).toHaveLength(2)
        const m0 = room.team[0]
        expect(m0.frozenStats).toEqual({ hp: 150, atk: 150, def: 150, spe: 150, spc: 150 }) // aucun recalcul
        expect(m0.currentHp).toBe(150)
        expect(m0.owned).toBe(false)
        expect(m0.moves.map((s) => s.moveId)).toEqual(["lance_flammes", "vague_mentale"]) // noms → ids
        const sp = getSpecies(room.speciesIds[0])!
        expect(sp.name).toBe("A")
        expect(sp.types).toEqual(["TENEBRES", "PSY"])
        expect(sp.fusionParents).toEqual(["tenebrir", "jerbiwat"]) // permet de re-résoudre le sprite généré
        disposePlatineRoom(room.speciesIds)
        expect(getSpecies(room.speciesIds[0])).toBeFalsy() // nettoyé
    })

    it("deux salles ne se marchent pas dessus (ids déterministes et distincts)", () => {
        const a = buildPlatineRoomTeam(champ("A", 100), "rA")
        const b = buildPlatineRoomTeam(champ("B", 100), "rB")
        expect(a.speciesIds.some((id) => b.speciesIds.includes(id))).toBe(false)
        disposePlatineRoom([...a.speciesIds, ...b.speciesIds])
    })

    it("payload abîmé : types inconnus → NORMAL, aucune attaque valide → Charge (jamais de Daemon muet)", () => {
        const casse: PlatineChampion = {
            userId: "x", nickname: "X", wonAt: "2026-09-01T00:00:00.000Z",
            team: [mon("Cassé", 100, { types: ["PLOP"], moves: ["Attaque Inventée"] })],
        }
        const room = buildPlatineRoomTeam(casse, "rc")
        expect(getSpecies(room.speciesIds[0])!.types).toEqual(["NORMAL"])
        expect(room.team[0].moves.map((s) => s.moveId)).toEqual(["charge"])
        disposePlatineRoom(room.speciesIds)
    })

    it("une équipe est bornée à 6 chimères", () => {
        const gros: PlatineChampion = { userId: "x", nickname: "X", wonAt: "2026-09-01T00:00:00.000Z", team: Array.from({ length: 9 }, (_, i) => mon(`M${i}`, 100)) }
        const room = buildPlatineRoomTeam(gros, "r6")
        expect(room.team).toHaveLength(6)
        disposePlatineRoom(room.speciesIds)
    })
})

describe("platineArena — le couloir complet", () => {
    it("SÉLECTIONNE par puissance, puis RANGE par ancienneté (les 2 consignes de Sartay)", () => {
        // 10 champions : seuls les 8 plus PUISSANTS entrent, mais on les affronte du plus ANCIEN au plus récent.
        const all = Array.from({ length: 10 }, (_, i) =>
            champ(`j${i}`, 100 + i, `2026-0${(i % 9) + 1}-01T00:00:00.000Z`, `u${i}`))
        const corridor = buildPlatineCorridor(all)
        expect(corridor).toHaveLength(PLATINE_ROOM_CAP)
        // les 2 plus faibles (j0, j1) sont écartés
        expect(corridor.some((c) => c.nickname === "j0" || c.nickname === "j1")).toBe(false)
        // et l ordre final est bien chronologique, pas par puissance
        const dates = corridor.map((c) => Date.parse(c.wonAt))
        expect(dates).toEqual([...dates].sort((a, b) => a - b))
    })

    it("cas réel : Jacanon (sacre plus ancien) ouvre, Mools (plus PUISSANT) suit", () => {
        const jac = champ("Jacanon", 150, "2026-09-08T22:04:00.000Z", "uJ")
        const moo = champ("Mools", 200, "2026-09-09T22:34:00.000Z", "uM")
        expect(buildPlatineCorridor([moo, jac]).map((c) => c.nickname)).toEqual(["Jacanon", "Mools"])
    })
})
