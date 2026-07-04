// src/lib/gamebook/yellow/race/kart.ts
//
// Nexus — « Pokémon Kart » : PHYSIQUE d'un pilote (le Daemon choisi dirige un kart). PUR & déterministe.
// Stats du Daemon → stats de course NORMALISÉES (pas d'effet du niveau : un niv 5 vaut un niv 100 de la
// même espèce ; seul le PROFIL de stats compte, équilibré) :
//   Vitesse → vitesse de pointe · Force → adhérence · Défense → freinage · Spécial → contrôlabilité · PV → nitro.
// Touches : A = accélérer, B = freiner, Select = nitro.

export interface KartStats {
    topSpeed: number   // 0..1 (Vitesse)
    grip: number       // 0..1 (Force) — accélération + tenue en virage (moins de glisse)
    braking: number    // 0..1 (Défense) — puissance de freinage
    handling: number   // 0..1 (Spécial) — réactivité au braquage
    nitro: number      // 0..1 (PV) — capacité de la jauge de nitro
}

/** Normalise une stat de base (typiquement ~30..140) vers [0.45, 1.0] — équilibré, jamais injouable. */
function norm(v: number): number {
    return 0.45 + 0.55 * Math.max(0, Math.min(1, (v - 35) / 105))
}

/** Dérive les stats de course NORMALISÉES depuis les stats de base du Daemon. */
export function deriveKartStats(base: { hp: number; atk: number; def: number; spe: number; spc: number }): KartStats {
    return { topSpeed: norm(base.spe), grip: norm(base.atk), braking: norm(base.def), handling: norm(base.spc), nitro: norm(base.hp) }
}

export interface KartState {
    x: number
    y: number
    heading: number    // radians (direction du nez)
    speed: number      // vitesse scalaire courante (le long du heading)
    nitroGauge: number // 0..1 (réserve de nitro)
    boosting: boolean  // nitro actif ce tick (pour l'UI/son)
}

export interface KartInput {
    throttle: boolean  // A
    brake: boolean     // B
    steer: number      // -1 (gauche) .. +1 (droite)
    nitro: boolean     // Select
}

export function newKart(x: number, y: number, heading = 0): KartState {
    return { x, y, heading, speed: 0, nitroGauge: 1, boosting: false }
}

// Constantes de jeu (unités « monde »/seconde). Calibrées pour un feeling arcade.
const BASE_TOP = 180        // vitesse de pointe de base (avant modulation topSpeed)
const TOP_RANGE = 140       // topSpeed=1 ajoute jusqu'à +140
const ACCEL = 140           // accélération de base
const BRAKE = 320           // freinage de base
const COAST = 55            // frottement en roue libre
const TURN = 2.7            // vitesse de braquage de base (rad/s)
const NITRO_MULT = 1.45     // ×vitesse de pointe sous nitro
const NITRO_DRAIN = 0.55    // /s (jauge pleine → ~1.8 s de boost)
const NITRO_REGEN = 0.14    // /s (recharge lente)
const OFFTRACK_MAX = 90     // hors-piste : vitesse plafonnée (herbe collante)

/** Un pas de simulation (dt en secondes). Mute le kart en place. `offTrack` = hors du bitume (ralenti). */
export function stepKart(k: KartState, s: KartStats, input: KartInput, dt: number, offTrack = false): void {
    // Plafond de vitesse (modulé par topSpeed, boosté par le nitro si jauge dispo).
    const canBoost = input.nitro && k.nitroGauge > 0
    let maxSpeed = BASE_TOP + TOP_RANGE * s.topSpeed
    if (canBoost) maxSpeed *= NITRO_MULT
    if (offTrack) maxSpeed = Math.min(maxSpeed, OFFTRACK_MAX)
    k.boosting = canBoost

    // Accélération / frein / roue libre.
    if (input.throttle) k.speed += ACCEL * (0.55 + 0.45 * s.grip) * dt
    else if (input.brake) k.speed -= BRAKE * (0.4 + 0.6 * s.braking) * dt
    else k.speed -= COAST * dt
    // Nitro : petit coup de fouet supplémentaire tant que ça pousse.
    if (canBoost) k.speed += ACCEL * 0.9 * dt
    k.speed = Math.max(0, Math.min(maxSpeed, k.speed))

    // Braquage : d'autant plus mou qu'on est lent ; la GLISSE (perte de vitesse en virage) dépend de l'adhérence.
    if (Math.abs(input.steer) > 0.001 && k.speed > 4) {
        const speedFactor = Math.min(1, k.speed / 120)                 // on tourne mieux avec un peu de vitesse
        k.heading += input.steer * TURN * (0.5 + 0.5 * s.handling) * speedFactor * dt
        const slide = (1 - s.grip) * Math.abs(input.steer) * 0.9 * dt  // faible adhérence → on « chasse » et on perd de la vitesse
        k.speed *= 1 - Math.min(0.5, slide)
    }

    // Nitro : consommation / recharge.
    if (canBoost) k.nitroGauge = Math.max(0, k.nitroGauge - NITRO_DRAIN * dt)
    else k.nitroGauge = Math.min(1, k.nitroGauge + NITRO_REGEN * s.nitro * dt)

    // Déplacement.
    k.x += Math.cos(k.heading) * k.speed * dt
    k.y += Math.sin(k.heading) * k.speed * dt
}
