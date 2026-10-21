// src/lib/gamebook/yellow/data/townSpots.ts
//
// PNJ « BALADEURS » de la VILLE JAUNE (Vieux Sage, Fashion Victim) : sur quelles cases peuvent-ils apparaître SANS
// RIEN BLOQUER ? Signalement de DaKumba (21/10/2026) : la Fashion Victim, tirée au hasard devant la porte du GYM,
// « bloquait l'arène ». Règles :
//   • jamais SUR une porte ni sur les 8 cases autour : dans Pokémon on entre par le bas, un PNJ devant la porte = une
//     porte fermée aux yeux du joueur (même si le moteur accepte une entrée par le côté) ;
//   • jamais au bord de la carte (c'est là qu'on arrive des autres cartes) ;
//   • jamais sur un PASSAGE OBLIGÉ : point d'articulation du graphe des cases marchables, calculé en comptant comme
//     des murs les cases déjà occupées (`occupied` : PNJ fixes, gardien des clés, baladeur déjà posé) → ni un PNJ seul,
//     ni deux PNJ ensemble ne peuvent couper la ville en deux.
// Module PUR (données + algorithme) — testé dans townSpots.test.ts.

export interface TownBuilding { x: number; y: number; w: number; h: number; doorX: number; doorY: number; doorW?: number }
export interface TownMap<T extends string = string> { width: number; height: number; tiles: readonly (readonly T[])[]; buildings?: readonly TownBuilding[] }
export type Tile = readonly [number, number]

const key = (x: number, y: number) => `${x},${y}`

/** Cases-portes de la carte (une porte peut faire 2 cases de large). */
export function townDoors<T extends string>(m: TownMap<T>): [number, number][] {
    return (m.buildings ?? []).flatMap((b) => Array.from({ length: b.doorW ?? 1 }, (_, i) => [b.x + b.doorX + i, b.y + b.doorY] as [number, number]))
}

/** Une case est-elle marchable (hors murs de bâtiment, porte comprise) ? */
export function townWalkable<T extends string>(m: TownMap<T>, isBlocking: (tile: T) => boolean): (x: number, y: number) => boolean {
    const inBuildingWall = (x: number, y: number) => (m.buildings ?? []).some((b) => {
        if (!(x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return false
        const dw = b.doorW ?? 1
        return !(x >= b.x + b.doorX && x < b.x + b.doorX + dw && y === b.y + b.doorY) // dans le bâtiment mais pas sur la porte
    })
    return (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && !isBlocking(m.tiles[y][x]) && !inBuildingWall(x, y)
}

/** Cases atteignables depuis `start` (marchables, hors cases `blocked`). */
export function townReach<T extends string>(m: TownMap<T>, isBlocking: (tile: T) => boolean, start: Tile, blocked: ReadonlySet<string>): [number, number][] {
    const walk = townWalkable(m, isBlocking)
    const seen = new Set<string>(); const stack: [number, number][] = [[start[0], start[1]]]; const reach: [number, number][] = []
    while (stack.length) {
        const [x, y] = stack.pop()!; const k = key(x, y)
        if (seen.has(k)) continue
        seen.add(k)
        if (!walk(x, y) || blocked.has(k)) continue
        reach.push([x, y])
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    return reach
}

/** Points d'articulation (Tarjan, itératif) du graphe 4-connexe formé par `cells`. */
function articulationPoints(cells: readonly (readonly [number, number])[]): Set<string> {
    const inSet = new Set(cells.map(([x, y]) => key(x, y)))
    const nb = (k: string) => { const [x, y] = k.split(",").map(Number); return [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)].filter((q) => inSet.has(q)) }
    const disc = new Map<string, number>(), low = new Map<string, number>(), art = new Set<string>()
    let t = 0
    for (const [sx, sy] of cells) {
        const root = key(sx, sy)
        if (disc.has(root)) continue
        disc.set(root, t); low.set(root, t); t++
        const st: { v: string; p: string | null; it: string[]; i: number; kids: number }[] = [{ v: root, p: null, it: nb(root), i: 0, kids: 0 }]
        while (st.length) {
            const f = st[st.length - 1]
            if (f.i < f.it.length) {
                const w = f.it[f.i++]
                if (!disc.has(w)) { disc.set(w, t); low.set(w, t); t++; f.kids++; st.push({ v: w, p: f.v, it: nb(w), i: 0, kids: 0 }) }
                else if (w !== f.p) low.set(f.v, Math.min(low.get(f.v)!, disc.get(w)!))
            } else {
                st.pop()
                const parent = st[st.length - 1]
                if (parent) {
                    low.set(parent.v, Math.min(low.get(parent.v)!, low.get(f.v)!))
                    if (parent.p !== null && low.get(f.v)! >= disc.get(parent.v)!) art.add(parent.v)
                } else if (f.kids > 1) art.add(f.v)
            }
        }
    }
    return art
}

/** Cases où poser un PNJ baladeur sans rien bloquer (cf. en-tête). `occupied` = cases déjà prises (PNJ fixes, gardien,
 *  autre baladeur), comptées comme des murs. Jamais vide : repli sur les cases atteignables hors portes. */
export function safeWanderSpots<T extends string>(m: TownMap<T>, isBlocking: (tile: T) => boolean, start: Tile, occupied: readonly Tile[]): [number, number][] {
    const blocked = new Set(occupied.map(([x, y]) => key(x, y)))
    const reach = townReach(m, isBlocking, start, blocked)
    const art = articulationPoints(reach)
    const doors = townDoors(m)
    const nearDoor = (x: number, y: number) => doors.some(([dx, dy]) => Math.abs(dx - x) <= 1 && Math.abs(dy - y) <= 1)
    const nearEdge = (x: number, y: number) => x <= 1 || y <= 1 || x >= m.width - 2 || y >= m.height - 2
    // La case de DÉPART du calcul reste toujours libre (point de repère des parcours ci-dessus et des suivants).
    const isStart = (x: number, y: number) => x === start[0] && y === start[1]
    const spots = reach.filter(([x, y]) => (m.tiles[y][x] as string) !== "grassTall" && !nearDoor(x, y) && !nearEdge(x, y) && !art.has(key(x, y)) && !isStart(x, y))
    if (spots.length) return spots
    const fallback = reach.filter(([x, y]) => !doors.some(([dx, dy]) => dx === x && dy === y))
    return fallback.length ? fallback : [[start[0], start[1]]]
}
