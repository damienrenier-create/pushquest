// PUR CALCUL (aucune base) — table de capture de Goshendofy avec la VRAIE formule du jeu.
//   npx tsx scripts/_gosh-capture-table.mts
import { captureValue, hpCeiling } from "../src/lib/gamebook/yellow/battle/capture"
import { CAPTURE_CALIBRATION, CAPTURE_ESCALATION_PER_ATTEMPT } from "../src/lib/gamebook/yellow/data/captureConfig"
import type { MajorStatus } from "../src/lib/gamebook/yellow/battle/types"

const CATCH_RATE = 8       // Goshendofy (assoupli)
const CAPTURE_MULT = 0.8   // entrée légendaire (assouplie)
const LEVEL = 50
const MIN_BALL_BONUS = 5   // ricochet si en dessous
const MAXHP = 200          // arbitraire : seul le ratio compte (hpFactor/ceiling)

const BALLS: Record<string, number> = { "Hyper Nexus-Ball +": 5, "Super Méga Nexus-Ball": 6 }
const STATUSES: Array<[string, MajorStatus]> = [
    ["SANS statut", "NONE"],
    ["Paralysie / Brûlure / Poison", "PARALYSIS"],
    ["Sommeil / Gel", "SLEEP"],
]
const HPS = [1.0, 0.5, 0.3, 0.2, 0.1]
const THROWS = 10

// proba d'UN lancer, N = nb d'échecs déjà encaissés (escalade).
function throwProba(ballBonus: number, ballName: string, status: MajorStatus, hpFrac: number, n: number): number {
    const currentHp = Math.max(1, Math.round(hpFrac * MAXHP))
    const isSuperMega = ballName.startsWith("Super Méga")
    // Verrou de Ball : bonus < 5 → ricochet (0%). (Non utilisé ici : on ne teste que 5 et 6.)
    if (ballBonus < MIN_BALL_BONUS) return 0
    // Super Méga Nexus-Ball : capture GARANTIE de Goshendofy sous 50% PV (shunte tout).
    if (isSuperMega && currentHp < MAXHP * 0.5) return 1
    // Verrou de statut : sans statut majeur → Ball déviée (0%). (La garantie Super Méga ci-dessus l'a déjà court-circuité.)
    if (status === "NONE") return 0
    const extraBonus = 1 /*captureModifier*/ * CAPTURE_MULT * (1 + CAPTURE_ESCALATION_PER_ATTEMPT * n)
    const A = captureValue({ catchRate: CATCH_RATE, currentHp, maxHp: MAXHP, status, ballBonus, level: LEVEL, extraBonus })
    return Math.max(0, Math.min(hpCeiling(currentHp, MAXHP), A / CAPTURE_CALIBRATION))
}

// chances CUMULÉES d'avoir capturé au bout de 1..THROWS lancers (l'escalade monte à chaque échec).
function cumulative(ballBonus: number, ballName: string, status: MajorStatus, hpFrac: number): number[] {
    const out: number[] = []
    let failProduct = 1
    for (let i = 0; i < THROWS; i++) {
        const p = throwProba(ballBonus, ballName, status, hpFrac, i)
        failProduct *= (1 - p)
        out.push(1 - failProduct)
    }
    return out
}

const pct = (x: number) => (x >= 0.9995 ? "100%" : `${(x * 100).toFixed(1)}%`)

for (const [ballName, ballBonus] of Object.entries(BALLS)) {
    for (const [statusLabel, status] of STATUSES) {
        console.log(`\n### ${ballName} — ${statusLabel}`)
        console.log(`PV\\lancers | ${Array.from({ length: THROWS }, (_, i) => i + 1).join(" | ")}`)
        for (const hp of HPS) {
            const row = cumulative(ballBonus, ballName, status, hp).map(pct)
            console.log(`${Math.round(hp * 100)}% PV | ${row.join(" | ")}`)
        }
    }
}
