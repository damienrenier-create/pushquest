// src/lib/gamebook/yellow/frontier/dome.ts
//
// ZONE DE COMBAT — DÔME : tournoi à ÉLIMINATION (bracket de 8), PUR & déterministe.
// Le joueur fait 3 matchs (quart → demi → finale). Les autres matchs (IA vs IA) sont
// résolus par heuristique seedée (puissance d'équipe + avantage de type + aléa pour upsets).
// Aucune dépendance save/UI : un état + le résultat du match du joueur → nouvel état.

import { Rng } from "../battle/rng"
import { typeMultiplier } from "../battle/typeChart"
import { SPECIES } from "../data/species"
import { speciesAtLevel } from "../data/ace"
import { bstOf, generateFrontierTeam, allFrontierForms, frontierEligible, bstBandForStreak, weakTypesOf, type OpponentSpec } from "./engine"
import { DOME_TRAINERS } from "./domeTrainers"
import type { DomeTrainer } from "./domeTypes"
import { DAN_POOL, type DanTeam } from "./danTeams"
import type { PokeType } from "../battle/types"

export const DOME_SIZE = 8
export const DOME_ROUNDS = 3 // 8 → 4 → 2 → 1
export const DOME_TEAM_SIZE = 6 // Daemons par équipe dans le Dôme (6v6 — cf. design du Dôme)

const HOLO_NAMES = ["Spectre A", "Spectre B", "Spectre C", "Spectre D", "Spectre E", "Spectre F", "Spectre G"]

export interface DomeEntrant {
    id: number; name: string; team: OpponentSpec[]; isPlayer: boolean
    /** Identité du dresseur (pool des 30) pour l'UI (épithète, taunt) ; absent = joueur / fallback. */
    trainerId?: string; epithet?: string; taunt?: string
}
export interface DomeState {
    level: number
    round: number            // 0 = quart, 1 = demi, 2 = finale
    entrants: DomeEntrant[]   // les 8 participants (index = id)
    alive: number[]           // ids encore en lice, en ORDRE de bracket (paires consécutives)
    playerId: number
    status: "active" | "won" | "eliminated"
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i);[a[i], a[j]] = [a[j], a[i]] }
    return a
}

export interface CreateDomeOpts {
    level: number; streak: number; playerTeam: OpponentSpec[]; size?: number
    /** VOIE DU MAÎTRE : si défini, les adversaires sont des ÉQUIPES DÉSIGNÉES (pool des 12) au lieu du procédural,
     *  avec la proportion de shiny du grade (none/half/full). undefined = tiers normaux Bronze→Maître. */
    danShiny?: "none" | "half" | "full"
}

/** Traduit une équipe désignée en OpponentSpec[] : moveset + objet imposés, niveau du dan, shiny selon le grade
 *  (half = la 1re moitié de l'équipe ; full = toute l'équipe). L'EV/Saiyan est appliqué EN AVAL (buildFrontierEnemies). */
export function danTeamToSpecs(team: DanTeam, level: number, shinyMode: "none" | "half" | "full"): OpponentSpec[] {
    const shinyCount = shinyMode === "full" ? team.mons.length : shinyMode === "half" ? Math.ceil(team.mons.length / 2) : 0
    return team.mons.map((m, i) => ({ speciesId: m.speciesId, level, moveIds: [...m.moveIds], heldItemId: m.heldItemId, shiny: i < shinyCount }))
}

const typesOfSp = (id: string): string[] => (SPECIES[id] as unknown as { types?: string[] })?.types ?? []

/** Équipe « anti-joueur » (Guigui/Light/Mools) : choisit des Daemons qui FRAPPENT les faiblesses de l'équipe
 *  du joueur (weakTypesOf) et RÉSISTENT à ses types offensifs. Formes terminales, dans la bande de BST. Ignore
 *  le thème (le but est de contrer). L'écart static/adaptive se joue au PILOTAGE d'IA, pas à la construction. */
function buildCounterTeam(rng: Rng, playerTeam: OpponentSpec[], level: number, size: number, streak: number): OpponentSpec[] {
    const [lo, hi] = bstBandForStreak(streak)
    // Menace : combien de Daemons du joueur chaque type frappe en super-efficace.
    const threat = new Map<string, number>()
    for (const pm of playerTeam) for (const wt of weakTypesOf(pm.speciesId)) threat.set(wt, (threat.get(wt) ?? 0) + 1)
    const playerAtkTypes = [...new Set(playerTeam.flatMap((pm) => typesOfSp(pm.speciesId)))]
    const resistsPlayer = (id: string): number => {
        let r = 0
        const dt = typesOfSp(id)
        for (const at of playerAtkTypes) { let m = 1; for (const d of dt) m *= typeMultiplier(at as PokeType, d as PokeType); if (m < 1) r++ }
        return r
    }
    // Score de contre : frappe leurs faiblesses (offensif) ×2 + résiste à leurs attaques.
    const counterScore = (id: string) => typesOfSp(id).reduce((s, ty) => s + (threat.get(ty) ?? 0), 0) * 2 + resistsPlayer(id)
    // allFrontierForms filtré `terminal` (comme generateDomeTrainerTeam) → inclut les évolutions par PIERRE
    // (pyropanthe…, absentes de formsAtLevel) ; assume des finales fortes même sous leur palier de niveau naturel
    // (contre-équipe = finales, borné par la bande de BST). Divergence VOULUE avec les vagues génériques.
    const terminal = (id: string) => speciesAtLevel(id, level) === id
    let pool = allFrontierForms().filter((id) => terminal(id) && frontierEligible(id, streak) && bstOf(id) >= lo - 40 && bstOf(id) <= hi + 40)
    if (pool.length < size) pool = allFrontierForms().filter((id) => terminal(id) && frontierEligible(id, streak))
    // Tri par score de contre décroissant + petit bruit seedé (ne pas être 100 % optimal/prévisible).
    const ids = pool
        .map((id) => ({ id, s: counterScore(id) + rng.int(0, 2) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, size)
        .map((x) => x.id)
    return ids.map((speciesId) => ({ speciesId, level }))
}

/** Génère l'équipe d'un dresseur du Dôme : formes FINALES au niveau, de son THÈME (hors excludeTypes), dans la
 *  bande de BST de la série, avec ses membres GARANTIS (includeSpecies) + son ACE en dernier — s'ils rentrent
 *  dans la bande (le bypass total « scriptedAce » + le gating par tier viendront en Phase 2, pour éviter les pics
 *  avant le gating). Fallback générique si pas de thème (counterPlayer/oddball) ou pool trop maigre. */
export function generateDomeTrainerTeam(rng: Rng, t: DomeTrainer, level: number, size: number, streak: number, playerTeam?: OpponentSpec[]): OpponentSpec[] {
    // Dresseurs « anti-joueur » (counterPlayer : Guigui/Light/Mools) : équipe construite CONTRE la team du joueur (si connue).
    if (t.constraint.kind === "counterPlayer" && playerTeam && playerTeam.length > 0) return buildCounterTeam(rng, playerTeam, level, size, streak)
    const [lo, hi] = bstBandForStreak(streak)
    const inBand = (id: string) => { const b = bstOf(id); return b >= lo - 40 && b <= hi + 40 }
    const inTheme = (id: string) => t.themeTypes.length === 0 || typesOfSp(id).some((ty) => (t.themeTypes as string[]).includes(ty))
    const banned = (id: string) => (t.excludeTypes ?? []).some((ex) => typesOfSp(id).includes(ex))
    const terminal = (id: string) => speciesAtLevel(id, level) === id
    // « non-banni » = INVARIANT DUR (ex. Géraldine JAMAIS de Feu) ; le THÈME est préféré mais relâché si trop maigre.
    // allFrontierForms (toutes les espèces) filtré `terminal` → inclut les variantes de Panthéon (pyropanthe…,
    // évolutions par pierre absentes de formsAtLevel) tout en excluant les stades de base qui évolueraient au niveau.
    const notBanned = (id: string) => terminal(id) && frontierEligible(id, streak) && !banned(id)
    const themed = allFrontierForms().filter((id) => notBanned(id) && inTheme(id))
    const anyOk = allFrontierForms().filter(notBanned)
    let pool = themed.filter(inBand)                                       // idéal : thème + bande
    if (pool.length < size) pool = themed                                  // thème hors bande
    if (pool.length < size) pool = anyOk.filter(inBand)                    // hors thème mais non-banni + bande
    if (pool.length < size) pool = anyOk                                   // non-banni (exclude toujours respecté)
    if (pool.length < size) return generateFrontierTeam(rng, { streak, level, size }) // ultime (ne devrait jamais arriver)

    // Membres GARANTIS (includeSpecies + ace signature) : forcés par IDENTITÉ (l'espèce existe & n'est pas d'un
    // type banni) — ils CONTOURNENT frontierEligible/la bande (scriptedAce). Sinon les aces `exclusive` (orcaline,
    // sylvebarbe, goshendofy, tonytony…) disparaîtraient de l'équipe. L'ace part en DERNIER ; son slot est réservé
    // AVANT troncature → il n'est jamais coupé, même si des membres garantis saturent l'équipe.
    const forcedExists = (id: string) => !!SPECIES[id] && !banned(id)
    const wanted = [...new Set([...(t.includeSpecies ?? []), t.aceSpecies])].filter(forcedExists)
    const ace = forcedExists(t.aceSpecies) ? t.aceSpecies : null
    const forcedNonAce = wanted.filter((id) => id !== ace)
    const fillers = shuffle(rng, pool.filter((id) => !wanted.includes(id)))
    const body = [...forcedNonAce, ...fillers].slice(0, size - (ace ? 1 : 0))
    const ids = ace ? [...body, ace] : body
    return ids.map((speciesId) => ({ speciesId, level }))
}

/** Surnom d'affichage d'une équipe désignée : le « … » de son identité, sinon le libellé d'archétype. */
function danNickname(dt: DanTeam): string {
    const m = dt.identity.match(/«\s*(.+?)\s*»/)
    return `Maître ${m ? m[1] : dt.archetype.replace(/^T\d+\s*/, "")}`
}

/** Crée un bracket : le joueur (id 0) + (size-1) IA, placés en ordre de bracket aléatoire (seedé). VOIE DU MAÎTRE
 *  (opts.danShiny) : les adversaires sont des ÉQUIPES DÉSIGNÉES (pool des 12) ; sinon procédural (pool des 30). */
export function createDome(rng: Rng, opts: CreateDomeOpts): DomeState {
    const size = opts.size ?? DOME_SIZE
    const entrants: DomeEntrant[] = [{ id: 0, name: "Toi", team: opts.playerTeam, isPlayer: true }]
    if (opts.danShiny !== undefined) {
        // DAN : (size-1) équipes désignées DISTINCTES tirées du pool des 12 (seedé), shiny selon le grade.
        const picks = shuffle(rng, [...DAN_POOL]).slice(0, size - 1)
        for (let i = 1; i < size; i++) {
            const dt = picks[(i - 1) % picks.length]
            entrants.push({
                id: i, isPlayer: false,
                name: danNickname(dt), epithet: dt.archetype.replace(/^T\d+\s*/, ""),
                team: danTeamToSpecs(dt, opts.level, opts.danShiny),
            })
        }
    } else {
        // 7 dresseurs DISTINCTS tirés du pool des 30 (équipes générées selon leur persona).
        const roster = shuffle(rng, DOME_TRAINERS).slice(0, size - 1)
        for (let i = 1; i < size; i++) {
            const t = roster[i - 1]
            entrants.push({
                id: i, isPlayer: false,
                name: t?.name ?? HOLO_NAMES[(i - 1) % HOLO_NAMES.length],
                trainerId: t?.id, epithet: t?.epithet, taunt: t?.taunt,
                team: t
                    ? generateDomeTrainerTeam(rng, t, opts.level, DOME_TEAM_SIZE, opts.streak, opts.playerTeam)
                    : generateFrontierTeam(rng, { streak: opts.streak, level: opts.level, size: DOME_TEAM_SIZE }),
            })
        }
    }
    const alive = shuffle(rng, entrants.map((e) => e.id)) // placement de bracket seedé
    return { level: opts.level, round: 0, entrants, alive, playerId: 0, status: "active" }
}

function teamPower(e: DomeEntrant): number {
    return e.team.reduce((s, m) => s + bstOf(m.speciesId), 0)
}
function typesOf(id: string): string[] { return (SPECIES[id] as any)?.types ?? [] }
/** Avantage offensif moyen de `att` contre `def` (meilleur multiplicateur d'un STAB par mon). */
function edge(att: DomeEntrant, def: DomeEntrant): number {
    let tot = 0, n = 0
    for (const m of att.team) for (const at of typesOf(m.speciesId)) {
        let best = 0
        for (const dm of def.team) { let mult = 1; for (const dt of typesOf(dm.speciesId)) mult *= typeMultiplier(at as any, dt as any); best = Math.max(best, mult) }
        tot += best; n++
    }
    return n ? tot / n : 1
}
/** Résout un match IA vs IA (déterministe) : vrai si A gagne. Puissance + avantage de type + aléa (upsets). */
export function aiMatchAWins(rng: Rng, a: DomeEntrant, b: DomeEntrant): boolean {
    const sa = teamPower(a) + 40 * edge(a, b) + rng.int(0, 50)
    const sb = teamPower(b) + 40 * edge(b, a) + rng.int(0, 50)
    return sa >= sb
}

/** L'adversaire du joueur pour le round courant (sa paire dans le bracket). */
export function playerOpponent(s: DomeState): DomeEntrant | null {
    const idx = s.alive.indexOf(s.playerId)
    if (idx < 0) return null
    const partnerId = idx % 2 === 0 ? s.alive[idx + 1] : s.alive[idx - 1]
    return partnerId == null ? null : s.entrants[partnerId]
}

/** Avance le bracket d'un round : on connaît le résultat du match du JOUEUR ; les autres sont résolus par IA. */
export function advanceDome(s: DomeState, rng: Rng, playerWon: boolean): DomeState {
    if (s.status !== "active") return s
    const winners: number[] = []
    for (let i = 0; i < s.alive.length; i += 2) {
        const aId = s.alive[i], bId = s.alive[i + 1]
        if (bId == null) { winners.push(aId); continue } // bye (taille impaire)
        let winId: number
        if (aId === s.playerId || bId === s.playerId) {
            const oppId = aId === s.playerId ? bId : aId
            winId = playerWon ? s.playerId : oppId
        } else {
            winId = aiMatchAWins(rng, s.entrants[aId], s.entrants[bId]) ? aId : bId
        }
        winners.push(winId)
    }
    const playerAlive = winners.includes(s.playerId)
    const status: DomeState["status"] = !playerAlive ? "eliminated" : winners.length === 1 ? "won" : "active"
    return { ...s, alive: winners, round: s.round + 1, status }
}

/** Choix du leader IA face à l'équipe visible du joueur (pick : meilleure menace de type). */
export function aiLeadIndex(aiTeam: OpponentSpec[], playerTeam: OpponentSpec[]): number {
    let bestIdx = 0, bestScore = -Infinity
    for (let i = 0; i < aiTeam.length; i++) {
        let score = 0
        for (const at of typesOf(aiTeam[i].speciesId)) for (const pm of playerTeam) {
            let mult = 1; for (const dt of typesOf(pm.speciesId)) mult *= typeMultiplier(at as any, dt as any); score += mult
        }
        if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    return bestIdx
}
