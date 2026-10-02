import { describe, it, expect } from "vitest"
import { battleResumeDecision } from "./battleResumePolicy"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// PORTE DE SORTIE D'UN COMBAT
//
// Deux exigences qui tirent en sens opposé, et qu'il faut tenir ensemble :
//   (1) un RECHARGEMENT ne doit pas valoir une fuite gratuite (sauter un boss avec son équipe intacte) ;
//   (2) un joueur ENFERMÉ dans un combat ni gagnable ni fuyable doit avoir une sortie (Kingme, 02/10).
// Le départage vient du témoin de sessionStorage : présent = même session (F5), absent = appli fermée.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("reprendre ou lâcher le combat trouvé au chargement", () => {
    it("rien à reprendre → on ne fait rien", () => {
        expect(battleResumeDecision(false, true)).toBe("none")
        expect(battleResumeDecision(false, false)).toBe("none")
    })

    it("⚠️ F5 (même session) → on REPREND : pas de fuite gratuite au boss", () => {
        expect(battleResumeDecision(true, true)).toBe("resume")
    })

    it("⚠️ appli fermée puis rouverte → on LÂCHE : le joueur n'est jamais enfermé", () => {
        expect(battleResumeDecision(true, false)).toBe("release")
    })

    it("les deux gestes mènent à des issues DIFFÉRENTES — c'est tout l'intérêt du témoin", () => {
        expect(battleResumeDecision(true, true)).not.toBe(battleResumeDecision(true, false))
    })
})
