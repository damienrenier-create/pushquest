import { describe, it, expect } from "vitest"
import { buildPlatineRoomTeam, disposePlatineRoom } from "./platineArena"
import type { PlatineChampion } from "./platineArena"
import type { FusionChampionMon } from "../storage/save"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// UNE SALLE DE CHAMPION EST PRÉSENTÉE COMME « SON ÉQUIPE EXACTE, FIGÉE LE JOUR DE SON SACRE ».
//
// Elle ne l'était pas. La photo gravait le nom des attaques, mais ni leur TYPE RÉELLEMENT JOUÉ, ni les
// objets tenus, ni les couleurs. Une fusion à type forcé y rejouait donc son coup signature au type
// d'origine et sans STAB — un Cendrecerf plaçait 197 au lieu de 1180 sur une cible PSY/SPECTRE — et les
// six chimères combattaient les mains vides (ni Restes, ni Baie Phénix, ni pièce de l'Artisane).
//
// Deux sources, dans cet ordre : le champ gravé au sacre, sinon une DÉDUCTION depuis la paire de parents.
// La déduction n'est pas un luxe : les sacres OR déjà en base n'ont pas le champ, et ce sont eux qui
// peuplent le couloir aujourd'hui.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const cendrecerf = (extra: Partial<FusionChampionMon> = {}): FusionChampionMon => ({
    name: "Cendrecerf", sprite: "/x.png", types: ["TENEBRES"], level: 100,
    stats: { hp: 500, atk: 300, def: 300, spe: 400, spc: 756 },
    moves: ["Lance-Soleil", "Lance-Flammes", "Spores Dodo", "Vampigraine"],
    aId: "sylvapuce", bId: "pyrokoss", ...extra,
})
const room = (team: FusionChampionMon[]): PlatineChampion =>
    ({ userId: "u-jac", nickname: "Jacanon", wonAt: "2026-09-08T00:00:00.000Z", team })

/** Monte la salle, lit ce qu'on veut, puis démonte les espèces éphémères (sinon elles polluent le registre). */
function withRoom<T>(team: FusionChampionMon[], key: string, fn: (inst: any) => T): T {
    const built = buildPlatineRoomTeam(room(team), key)
    try { return fn(built.team[0].instance) } finally { disposePlatineRoom(built.speciesIds) }
}

describe("salles de champions — la photo est rejouée fidèlement", () => {
    it("un sacre GRAVÉ avec ses types rejoue exactement ces types", () => {
        const ov = withRoom([cendrecerf({ moveTypes: { "Lance-Soleil": "TENEBRES", "Vampigraine": "TENEBRES" } })], "grave",
            (i) => i.moveTypeOverride)
        expect(ov).toEqual({ lance_soleil: "TENEBRES", vampigraine: "TENEBRES" })
    })

    it("un sacre D'AVANT le champ est rattrapé par déduction depuis les parents", () => {
        // C'est le cas des sacres OR deja en base : sans ce rattrapage, ils rejoueraient au mauvais type.
        const ov = withRoom([cendrecerf()], "ancien", (i) => i.moveTypeOverride)
        expect(ov.lance_soleil).toBe("TENEBRES") // la 1re attaque offensive est transmutée
        expect(ov.vampigraine).toBe("TENEBRES")  // l'attaque SIGNATURE est recolorée
        expect(ov.lance_flammes).toBeUndefined() // …et on ne transmute pas tout le moveset
    })

    it("une fusion SANS type forcé ne se voit inventer aucun type", () => {
        const ov = withRoom([cendrecerf({
            name: "Magnicogne", types: ["METAL", "COMBAT"], aId: "magnetor", bId: "lievrocogne",
            moves: ["Séisme", "Danse-Lames"],
        })], "neutre", (i) => i.moveTypeOverride)
        expect(ov).toBeUndefined()
    })

    it("sans parents gravés (photo très ancienne), on ne devine rien plutôt que de deviner faux", () => {
        const ov = withRoom([cendrecerf({ aId: undefined, bId: undefined })], "sansparents", (i) => i.moveTypeOverride)
        expect(ov).toBeUndefined()
    })

    it("les objets tenus et les couleurs reviennent aussi", () => {
        const i = withRoom([cendrecerf({ items: ["restes", "baie_phenix"], shiny: true })], "objets", (x) => x)
        expect(i.heldItem).toBe("restes")
        expect(i.heldItem2).toBe("baie_phenix")
        expect(i.shiny).toBe(true)
    })

    it("une photo sans objet ne fabrique pas d'objet, et une non-dorée reste terne", () => {
        const i = withRoom([cendrecerf()], "nu", (x) => x)
        expect(i.heldItem).toBeUndefined()
        expect(i.heldItem2).toBeUndefined()
        expect(i.shiny).toBeFalsy()
    })

    it("un nom d'attaque gravé mais inconnu ne casse rien (le moveset a pu bouger depuis le sacre)", () => {
        const ov = withRoom([cendrecerf({ moveTypes: { "Attaque Disparue": "FEE" } })], "inconnu", (i) => i.moveTypeOverride)
        // Rien à mapper depuis le champ gravé → on retombe sur la déduction, pas sur du vide.
        expect(ov.lance_soleil).toBe("TENEBRES")
    })
})
