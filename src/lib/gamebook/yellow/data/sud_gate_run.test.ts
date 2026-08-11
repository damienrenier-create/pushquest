import { describe, it, expect } from "vitest"
import { sudGateBlockedByRun, inSylvebarbeBlock, SYLVEBARBE_BLOCK } from "./sylvebarbeBlock"

// GATE DE RUN : la Zone de Combat / Ligue de Fusion (passage sud) = post-game ouvert aux CHAMPIONS. En NG+ (run 2),
// concours (run 3) ou rejeu, le Dieu Spaghetti barre le sud TANT QU'on n'a pas re-battu la Ligue de cette run
// (champion de CE monde). Une fois champion de la run → passage autorisé. En LIVE → gate inactif (logique Sylvebarbe).
const IN = { x: SYLVEBARBE_BLOCK.x0, y: SYLVEBARBE_BLOCK.y0 } // une case du rectangle sud
const OUT = { x: 10, y: 10 }

describe("sudGateBlockedByRun — endgame ouvert aux champions de la run en cours", () => {
    it("case témoin bien DANS le rectangle sud", () => {
        expect(inSylvebarbeBlock(IN.x, IN.y)).toBe(true)
        expect(inSylvebarbeBlock(OUT.x, OUT.y)).toBe(false)
    })
    it("BARRE le sud en run 2 / run 3 / rejeu tant qu'on n'est PAS champion de cette run", () => {
        for (const w of ["ngplus", "run3", "replay"]) {
            expect(sudGateBlockedByRun(w, false, IN.x, IN.y)).toBe(true)
        }
    })
    it("LAISSE PASSER une fois CHAMPION de la run en cours (Ligue re-battue)", () => {
        for (const w of ["ngplus", "run3", "replay"]) {
            expect(sudGateBlockedByRun(w, true, IN.x, IN.y)).toBe(false)
        }
    })
    it("N'AFFECTE PAS le monde LIVE (le sud y reste régi par Sylvebarbe)", () => {
        expect(sudGateBlockedByRun("live", false, IN.x, IN.y)).toBe(false)
    })
    it("ne barre QUE le rectangle sud (ailleurs, aucun effet)", () => {
        expect(sudGateBlockedByRun("ngplus", false, OUT.x, OUT.y)).toBe(false)
    })
})
