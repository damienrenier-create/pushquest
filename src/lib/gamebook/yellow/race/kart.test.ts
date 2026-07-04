import { describe, it, expect } from "vitest"
import { deriveKartStats, newKart, stepKart, type KartInput, type KartStats } from "./kart"

const IDLE: KartInput = { throttle: false, brake: false, steer: 0, nitro: false }
const stats: KartStats = deriveKartStats({ hp: 90, atk: 90, def: 90, spe: 90, spc: 90 })
const drive = (k: ReturnType<typeof newKart>, s: KartStats, input: Partial<KartInput>, secs: number) => {
    const dt = 1 / 60
    for (let i = 0; i < Math.round(secs / dt); i++) stepKart(k, s, { ...IDLE, ...input }, dt)
}

describe("deriveKartStats — normalisation", () => {
    it("borne dans [0.45, 1] et reflète le profil (Vitesse → topSpeed)", () => {
        const fast = deriveKartStats({ hp: 40, atk: 40, def: 40, spe: 140, spc: 40 })
        expect(fast.topSpeed).toBeCloseTo(1, 2)
        expect(fast.grip).toBeGreaterThanOrEqual(0.45)
        expect(fast.grip).toBeLessThan(fast.topSpeed) // Force faible < Vitesse forte
    })
})

describe("stepKart — physique", () => {
    it("accélère puis plafonne à la vitesse de pointe", () => {
        const k = newKart(0, 0, 0)
        drive(k, stats, { throttle: true }, 6)
        expect(k.speed).toBeGreaterThan(150)
        const max = 180 + 140 * stats.topSpeed
        expect(k.speed).toBeLessThanOrEqual(max + 0.5)
    })

    it("freiner ralentit ; la roue libre ralentit aussi (moins)", () => {
        const k = newKart(0, 0, 0)
        drive(k, stats, { throttle: true }, 4)
        const v0 = k.speed
        drive(k, stats, { brake: true }, 0.3)
        const vBrake = k.speed
        expect(vBrake).toBeLessThan(v0)
        const k2 = newKart(0, 0, 0); drive(k2, stats, { throttle: true }, 4)
        const v0b = k2.speed
        drive(k2, stats, {}, 0.3) // roue libre
        expect(k2.speed).toBeLessThan(v0b)
        expect(k2.speed).toBeGreaterThan(vBrake) // le frein est plus fort que le frottement
    })

    it("braquer change le cap (une fois lancé)", () => {
        const k = newKart(0, 0, 0)
        drive(k, stats, { throttle: true }, 2)
        const h0 = k.heading
        drive(k, stats, { throttle: true, steer: 1 }, 0.5)
        expect(k.heading).not.toBeCloseTo(h0, 3)
    })

    it("nitro : consomme la jauge et pousse plus vite ; recharge au repos", () => {
        const k = newKart(0, 0, 0)
        drive(k, stats, { throttle: true, nitro: true }, 1)
        expect(k.nitroGauge).toBeLessThan(1)              // consommée
        const kNo = newKart(0, 0, 0); drive(kNo, stats, { throttle: true }, 1)
        expect(k.speed).toBeGreaterThan(kNo.speed)        // le boost pousse plus fort
        const before = k.nitroGauge
        drive(k, stats, { throttle: true }, 1)            // sans nitro → recharge
        expect(k.nitroGauge).toBeGreaterThan(before)
    })

    it("hors-piste : vitesse plafonnée bas", () => {
        const k = newKart(0, 0, 0)
        const dt = 1 / 60
        for (let i = 0; i < 300; i++) stepKart(k, stats, { ...IDLE, throttle: true }, dt, true) // offTrack
        expect(k.speed).toBeLessThanOrEqual(90.5)
    })
})
