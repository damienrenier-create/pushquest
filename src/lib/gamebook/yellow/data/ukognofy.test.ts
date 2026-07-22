import { describe, it, expect } from "vitest"
import { buildUkognofy, ukognofyFailCount, isUkognofyGone, nextUkognofyFailMarker, isUkognofyNight, UKOGNOFY_ID, UKOGNOFY_CAUGHT_MARKER, UKOGNOFY_FAIL_MARKERS, ukognofyRemainingTries, ukognofyWarnLines, UKOGNOFY_NPC_ID, UKOGNOFY_NPC_POS, UKOGNOFY_CHAMBER_MAP } from "./ukognofy"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { YELLOW_NPCS } from "../npcs"

describe("Ukognofy — légendaire (Goshendofy+Ukognos)", () => {
    it("buildUkognofy : espèce PERMANENTE ukognofy, DRAGON/FÉE niv 100, moveset d'ace", () => {
        const f = buildUkognofy()
        expect(f.speciesId).toBe(UKOGNOFY_ID) // espèce permanente (capture keepable), pas un id éphémère fusion_*
        const sp = getSpecies(f.speciesId)!
        expect(sp.name).toBe("Ukognofy")
        expect(sp.sprite).toBe("/yellow/sprites/dex/fusion/ukognofy.png") // sprite dédié, PAS MissingNo
        expect(sp.types.sort()).toEqual(["DRAGON", "FEE"])
        expect(sp.hiddenUntilCaught).toBe(true) // anti-spoiler
        expect(f.instance.level).toBe(100)
        expect(f.instance.moves).toHaveLength(4)
        for (const m of f.instance.moves) expect(getMove(m.moveId), m.moveId).toBeTruthy()
    })

    it("profil de FUSIONNÉ en combat : frozenStats (Spé scindée) → BST élevé pour le seuil de capture ~10%", () => {
        const f = buildUkognofy()
        expect(f.instance.frozenStats).toBeDefined()
        expect(f.instance.frozenSpd).toBe(290)            // Déf Spé séparée (mur)
        expect(f.instance.frozenStats!.spc).toBe(320)     // SpA (nuke)
        const fs = f.instance.frozenStats!
        const bst = fs.hp + fs.atk + fs.def + fs.spe + fs.spc + f.instance.frozenSpd!
        expect(bst).toBe(1710) // BST fusionné → seuil Fusio-Ball ~10% PV
    })

    it("isUkognofyNight : vrai entre 21h et 3h, faux sinon", () => {
        const at = (h: number) => isUkognofyNight(new Date(2026, 6, 22, h, 0, 0))
        expect(at(22)).toBe(true); expect(at(23)).toBe(true); expect(at(0)).toBe(true); expect(at(2)).toBe(true); expect(at(21)).toBe(true)
        expect(at(3)).toBe(false); expect(at(12)).toBe(false); expect(at(20)).toBe(false); expect(at(4)).toBe(false)
    })

    it("compteur d'échecs : disparaît après 3 rencontres sans capture", () => {
        const set = new Set<string>()
        const isDef = (m: string) => set.has(m)
        expect(isUkognofyGone(isDef)).toBe(false)
        // 3 échecs successifs → poser le prochain marker à chaque fois
        for (let i = 1; i <= 3; i++) {
            const next = nextUkognofyFailMarker(isDef)
            expect(next).toBe(UKOGNOFY_FAIL_MARKERS[i - 1])
            set.add(next!)
            expect(ukognofyFailCount(isDef)).toBe(i)
        }
        expect(nextUkognofyFailMarker(isDef)).toBeNull() // plus d'essai
        expect(isUkognofyGone(isDef)).toBe(true)         // disparu à jamais
    })

    it("capture → disparaît aussi (même sans 3 échecs)", () => {
        const set = new Set<string>([UKOGNOFY_CAUGHT_MARKER])
        expect(isUkognofyGone((m) => set.has(m))).toBe(true)
    })

    it("tentatives restantes : 3 → 2 → 1 → 0 au fil des échecs", () => {
        const set = new Set<string>()
        const isDef = (m: string) => set.has(m)
        expect(ukognofyRemainingTries(isDef)).toBe(3)
        set.add(UKOGNOFY_FAIL_MARKERS[0]); expect(ukognofyRemainingTries(isDef)).toBe(2)
        set.add(UKOGNOFY_FAIL_MARKERS[1]); expect(ukognofyRemainingTries(isDef)).toBe(1)
        set.add(UKOGNOFY_FAIL_MARKERS[2]); expect(ukognofyRemainingTries(isDef)).toBe(0)
    })

    it("avertissement 2ᵉ visite : accorde le pluriel et cite le nombre de tentatives", () => {
        expect(ukognofyWarnLines(2).some((l) => l.includes("2 tentatives"))).toBe(true)
        expect(ukognofyWarnLines(1).some((l) => l.includes("1 tentative") && !l.includes("1 tentatives"))).toBe(true)
        // le choix APPROCHER / RESSORTIR est explicite
        const warn = ukognofyWarnLines(2).join(" ")
        expect(warn.includes("APPROCHE") && warn.includes("RESSORS")).toBe(true)
    })

    it("PNJ de la chambre (bump-to-fight 2ᵉ visite) enregistré sur la map du sanctuaire", () => {
        const npc = YELLOW_NPCS.find((n) => n.id === UKOGNOFY_NPC_ID)
        expect(npc, "PNJ Ukognofy absent de YELLOW_NPCS").toBeTruthy()
        expect(npc!.mapId).toBe(UKOGNOFY_CHAMBER_MAP)
        expect(npc!.interaction).toBe("interactive")
        expect(npc!.initialX).toBe(UKOGNOFY_NPC_POS.x)
        expect(npc!.initialY).toBe(UKOGNOFY_NPC_POS.y)
    })
})
