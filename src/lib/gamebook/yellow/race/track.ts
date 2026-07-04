// src/lib/gamebook/yellow/race/track.ts
//
// Nexus — Pokémon Kart : CIRCUITS (boucle de waypoints = ligne centrale + largeur du bitume). PUR.
// Le hors-piste ralentit (cf. kart.stepKart offTrack). Les waypoints servent AUSSI de ligne de course
// pour l'IA. Circuits d'inspiration « Route Nord » / « Cendreville » (formes maison, pas les tiles réelles).

export interface Vec { x: number; y: number }

export interface Track {
    id: string
    name: string
    waypoints: Vec[]   // boucle FERMÉE (le dernier se relie au premier). waypoints[0] = ligne d'arrivée.
    width: number      // demi-largeur du bitume (au-delà = hors-piste)
    laps: number
}

/** Distance d'un point au segment [a,b]. */
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
    const abx = b.x - a.x, aby = b.y - a.y
    const len2 = abx * abx + aby * aby || 1
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
    t = Math.max(0, Math.min(1, t))
    const dx = p.x - (a.x + t * abx), dy = p.y - (a.y + t * aby)
    return Math.hypot(dx, dy)
}

/** Distance minimale à la LIGNE CENTRALE (polyligne fermée). */
export function trackDistance(track: Track, x: number, y: number): number {
    const w = track.waypoints
    let best = Infinity
    for (let i = 0; i < w.length; i++) {
        const d = distToSegment({ x, y }, w[i], w[(i + 1) % w.length])
        if (d < best) best = d
    }
    return best
}

export function isOffTrack(track: Track, x: number, y: number): boolean {
    return trackDistance(track, x, y) > track.width
}

/** Cap (radians) du segment waypoint[i] → waypoint[i+1] (utile pour orienter les pilotes au départ). */
export function segmentHeading(track: Track, i: number): number {
    const a = track.waypoints[i], b = track.waypoints[(i + 1) % track.waypoints.length]
    return Math.atan2(b.y - a.y, b.x - a.x)
}

/** Génère une boucle « stade » (2 demi-cercles + lignes droites), avec quelques waypoints. */
function ovalLoop(cx: number, cy: number, rx: number, ry: number, n: number, rot = 0): Vec[] {
    const pts: Vec[] = []
    for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2
        pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
    }
    return pts
}

export const TRACKS: Track[] = [
    // Circuit « Route Nord » : grande boucle rapide et large (peu de virages serrés).
    {
        id: "route_nord",
        name: "Circuit de la Route Nord",
        width: 90,
        laps: 3,
        waypoints: [
            { x: 0, y: 0 }, { x: 400, y: -40 }, { x: 800, y: 40 }, { x: 1100, y: 260 },
            { x: 1150, y: 620 }, { x: 950, y: 900 }, { x: 560, y: 980 }, { x: 180, y: 880 },
            { x: -60, y: 600 }, { x: -120, y: 280 },
        ],
    },
    // Circuit « Cendreville » : boucle urbaine plus serrée et technique (virages marqués).
    {
        id: "cendreville",
        name: "Circuit de Cendreville",
        width: 64,
        laps: 3,
        waypoints: [
            { x: 0, y: 0 }, { x: 320, y: 20 }, { x: 520, y: -180 }, { x: 760, y: -120 },
            { x: 820, y: 180 }, { x: 1040, y: 320 }, { x: 900, y: 600 }, { x: 560, y: 560 },
            { x: 460, y: 320 }, { x: 200, y: 420 }, { x: 40, y: 260 }, { x: -140, y: 120 },
        ],
    },
    // Petit anneau d'essai (tests).
    { id: "test_ring", name: "Anneau d'essai", width: 80, laps: 2, waypoints: ovalLoop(0, 0, 500, 300, 12) },
]

export function getTrack(id: string): Track {
    return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}
