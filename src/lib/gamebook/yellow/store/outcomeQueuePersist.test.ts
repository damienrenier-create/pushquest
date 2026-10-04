import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LES FILES D'ISSUES PRÉ-TIRÉES DOIVENT SURVIVRE À UN RECHARGEMENT
//
// LE BUG (constaté le 04/10/2026 sur Zyran, et Task1 avant lui). Quand le génie offre un lot de Pâtes de Luxe,
// le jeu PRÉ-TIRE les issues pour garantir le lot : 1 parfait, 1 shiny parfait, 1 rang D, le reste à 50/50
// (grantLuxePastaBatch). Cette file était bien ÉCRITE dans la save… mais l'appel hydratePlayer qui recharge la
// save ne la relisait PAS. Résultat : à chaque rechargement de page, la file repartait vide, et le prochain
// autosave écrasait la file en base. Les garanties du cadeau — dont le shiny — s'évaporaient en silence.
// Même histoire pour bertieOutcomeQueue (Pâtes de Bertie Crochue).
//
// Ce test est structurel plutôt que fonctionnel : la panne ne vient pas d'une logique fausse mais d'un champ
// OUBLIÉ dans une longue liste d'arguments. C'est précisément ce qu'un test de comportement ne voit pas.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const SRC = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/store/saveManager.ts"), "utf8")

/** Les deux files pré-tirées offertes par le génie. */
const FILES = ["luxeOutcomeQueue", "bertieOutcomeQueue"] as const

describe("files d'issues pré-tirées — aller ET retour", () => {
    for (const champ of FILES) {
        it(`${champ} est ÉCRITE dans la save (store → save)`, () => {
            expect(SRC).toContain(`${champ}: p.${champ}`)
        })

        it(`⚠️ ${champ} est RELUE au chargement (save → store) — c'est ce qui manquait`, () => {
            expect(SRC).toContain(`${champ}: w.${champ}`)
        })
    }

    it("un champ écrit mais jamais relu serait un cadeau qui s'évapore : les deux sens, pour les deux files", () => {
        for (const champ of FILES) {
            const ecrit = SRC.includes(`${champ}: p.${champ}`)
            const relu = SRC.includes(`${champ}: w.${champ}`)
            expect(ecrit && relu, `${champ} : écrit=${ecrit} relu=${relu}`).toBe(true)
        }
    })
})
