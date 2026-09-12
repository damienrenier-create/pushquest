import { describe, it, expect } from "vitest"
import { PLATINE_ACE_PAIRS, buildPlatineAceTeam, disposeFusionLeagueTeam } from "./fusionLeague"
import { getSpecies } from "./species"
import { getMove } from "./moves"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'ÉQUIPE D'ACE AU PALIER TRÔNE — CE QUI NE DOIT PAS DÉRIVER
//
// Décision Sartay, prise après l'avoir vu jouer : au platine, ACE NE SE MET PAS EN PLACE, IL FRAPPE.
// Plus de Focalisation ni de Danse-Lames (tours de mise en place), plus de Repos (soin qui fait traîner le
// combat), plus de Cage-Éclair (statut). Un boss qui passe son tour à se gonfler pendant qu'on le tape,
// c'est un boss qui déçoit — et c'est exactement ce qu'il faisait.
//
// Deux exceptions ASSUMÉES, parce qu'elles infligent des dégâts : Vampigraine (drain par tour, demandée
// explicitement) et Apothéose (CT universelle, sa réponse aux types SOL).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Attaques autorisées à ne pas avoir de puissance brute — elles font quand même des dégâts. */
const DRAIN_OK = new Set(["vampigraine"])
/** CT enseignables à n'importe qui : légales même hors learnset des parents. */
const UNIVERSAL_CT = new Set(["apotheose"])

/** Le moveset CURÉ d'une paire du trône. Il est optionnel dans le type (les paliers bas dérivent le leur),
 *  mais au platine il est TOUJOURS écrit à la main : son absence serait déjà un défaut. */
const movesOf = (p: { name: string; moves?: readonly string[] }): readonly string[] => {
    if (!p.moves?.length) throw new Error(`${p.name} n'a aucun moveset curé`)
    return p.moves
}

describe("ACE au palier trône — priorité aux dégâts", () => {
    it("aucun slot n'est une mise en place, un soin ou un statut pur", () => {
        const coupables: string[] = []
        for (const p of PLATINE_ACE_PAIRS) {
            for (const id of movesOf(p)) {
                const mv = getMove(id)
                expect(mv, `attaque inconnue : ${id}`).toBeTruthy()
                if (mv!.power > 0 || DRAIN_OK.has(id)) continue
                coupables.push(`${p.name}/${mv!.name}`)
            }
        }
        expect(coupables, `slots sans dégâts : ${coupables.join(", ")}`).toEqual([])
    })

    it("nommément : plus de Focalisation, Danse-Lames, Repos ni Cage-Éclair", () => {
        const bannies = ["focalisation", "danse_lames", "repos", "cage_eclair"]
        for (const p of PLATINE_ACE_PAIRS) {
            for (const b of bannies) {
                expect(movesOf(p).includes(b), `${p.name} a repris ${b}`).toBe(false)
            }
        }
    })

    it("chaque chimère a bien QUATRE attaques, sans doublon", () => {
        for (const p of PLATINE_ACE_PAIRS) {
            expect(movesOf(p), p.name).toHaveLength(4)
            expect(new Set(movesOf(p)).size, `${p.name} a un doublon`).toBe(4)
        }
    })

    it("aucune attaque plaquée : tout est légal chez un parent (ou CT universelle)", () => {
        const illegales: string[] = []
        for (const p of PLATINE_ACE_PAIRS) {
            const pool = new Set<string>()
            for (const id of [p.a, p.b]) for (const l of getSpecies(id)?.learnset ?? []) pool.add(l.moveId)
            for (const m of movesOf(p)) if (!pool.has(m) && !UNIVERSAL_CT.has(m)) illegales.push(`${p.name}/${m}`)
        }
        expect(illegales, `hors learnset : ${illegales.join(", ")}`).toEqual([])
    })

    it("chaque chimère frappe au moins une fois en STAB", () => {
        const team = buildPlatineAceTeam()
        try {
            for (const f of team) {
                const types = f.result.types
                const ov = (f.instance.moveTypeOverride ?? {}) as Record<string, string>
                const aStab = f.instance.moves.some((sl) => {
                    const mv = getMove(sl.moveId)
                    if (!mv) return false
                    // Apothéose prend TOUJOURS un type du porteur : STAB par construction.
                    if (mv.effect?.adaptiveStab) return true
                    return types.includes((ov[sl.moveId] ?? mv.type) as never)
                })
                expect(aStab, `${getSpecies(f.speciesId)?.name} n'a aucun STAB`).toBe(true)
            }
        } finally { disposeFusionLeagueTeam(team) }
    })
})
