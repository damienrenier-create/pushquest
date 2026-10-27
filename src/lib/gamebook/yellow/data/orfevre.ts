// src/lib/gamebook/yellow/data/orfevre.ts
//
// L'ORFÈVRE — le DRESSEUR DE SHINY du Sanctuaire d'Ukognofy (décision Sartay du 26/10/2026).
// Une fois UKOGNOFY CAPTURÉ, sa chambre reste atteignable par le MÊME rituel (nuit, Daemon niv 100, fusion sauvage vue,
// Repousse…), et À SA PLACE (7,7) se tient l'Orfèvre : 6 Daemons CHROMATIQUES niveau 100 aux rôles complémentaires.
//   • 1 combat par JOUR (gagné ou perdu — marqueur quotidien posé au LANCEMENT, comme l'Échangeur) ;
//   • chaque VICTOIRE rapporte une SHINY BALL, 6 au maximum (une défaite ne consomme rien) ; après la 6e il salue ;
//   • compteurs = marqueurs defeatedTrainers (per-monde, comme Ukognofy lui-même).
// La SHINY BALL (items.ts SHINY_BALL_ID) : capture un cran au-dessus de l'Hyper Nexus-Ball + (bonus 6, PAS infaillible),
//   le Daemon capturé devient CHROMATIQUE (IV parfaits + flag shiny) et elle fait office de FUSIO-BALL (engine.performCapture).
//   Un shiny FORGÉ ne déclenche ni la fête shiny ni la prime de parrainage (battleStore, flag shinyBallCapture).
// Câblé via : gameStore.activeNpcs (remplace le PNJ Ukognofy dès ukognofy_caught) · gameStore.pressA (pendingOrfevre →
//   tryLaunchOrfevre) · battleStore.finishBattle (victoire → marqueur orfevre_win_N + Shiny Ball) · npc_orfevre_gen3.png.

import { createMonInstance } from "../battle/factory"
import type { MonInstance, StatKey } from "../battle/types"

export { SHINY_BALL_ID } from "./items"

export const ORFEVRE_NPC_ID = "y_orfevre"
export const ORFEVRE_TRAINER_ID = "y_orfevre"
export const ORFEVRE_NAME = "L'ORFÈVRE"
/** Planche Gen 3 (19×4, 760×160) fournie par Sartay le 26/10/2026 — rendue par MapView via npc.gen3. */
export const ORFEVRE_SPRITE = "/yellow/sprites/npc_orfevre_gen3.png"
export const ORFEVRE_LEVEL = 100
/** Nombre maximal de Shiny Balls remises (= victoires récompensées). */
export const ORFEVRE_MAX_BALLS = 6
/** Marqueurs de victoire récompensée : orfevre_win_1 … orfevre_win_6 (per-monde). */
export const ORFEVRE_WIN_PREFIX = "orfevre_win_"
/** Préfixe du cap JOURNALIER (1 combat/jour, gagné ou perdu) — borné via setDailyMarker. */
export const ORFEVRE_DAY_PREFIX = "orfevre_day_"

/** Jour civil LOCAL (le sanctuaire ne s'ouvre que de 21h à 3h : minuit local sépare bien deux soirées). */
export function orfevreDayMarker(now = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${ORFEVRE_DAY_PREFIX}${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Victoires déjà récompensées (0..6). */
export function orfevreWinCount(isDefeated: (m: string) => boolean): number {
    let n = 0
    for (let i = 1; i <= ORFEVRE_MAX_BALLS; i++) if (isDefeated(ORFEVRE_WIN_PREFIX + i)) n++
    return n
}
/** Prochain marqueur de victoire à poser, ou null si les 6 Shiny Balls sont déjà remises. */
export function nextOrfevreWinMarker(isDefeated: (m: string) => boolean): string | null {
    for (let i = 1; i <= ORFEVRE_MAX_BALLS; i++) if (!isDefeated(ORFEVRE_WIN_PREFIX + i)) return ORFEVRE_WIN_PREFIX + i
    return null
}
/** Les 6 Shiny Balls ont été remises → plus de combat, juste un salut. */
export function orfevreDone(isDefeated: (m: string) => boolean): boolean {
    return orfevreWinCount(isDefeated) >= ORFEVRE_MAX_BALLS
}

// ── Team : 6 CHROMATIQUES niveau 100, rôles variés, EV 252/252 sur 2 stats + Saiyan 60/40 (comme l'Échangeur). ──
export interface OrfevreTeamSpec { speciesId: string; ev: [StatKey, StatKey]; role: string }
export const ORFEVRE_TEAM: readonly OrfevreTeamSpec[] = [
    { speciesId: "ombrapanthe", ev: ["atk", "spe"], role: "éclaireur spectral rapide (SPECTRE)" },
    { speciesId: "jerbiwat", ev: ["spc", "spe"], role: "canon spécial (PSY/ÉLEC)" },
    { speciesId: "dracarlin", ev: ["atk", "spe"], role: "balayeur physique (FEU/DRAGON)" },
    { speciesId: "druidours", ev: ["atk", "hp"], role: "cogneur encaisseur (COMBAT/PLANTE)" },
    { speciesId: "orcaline", ev: ["spc", "hp"], role: "artilleuse massive (GLACE/EAU)" },
    { speciesId: "megalithe", ev: ["hp", "def"], role: "mur de ROCHE" },
]

/** L'équipe de l'Orfèvre : shiny (IV parfaits + flag), niv 100, EV maxées sur 2 stats, Saiyan 60/40. */
export function buildOrfevreTeam(): MonInstance[] {
    const level = ORFEVRE_LEVEL
    const primary = Math.round(level * 0.6)
    const secondary = level - primary
    return ORFEVRE_TEAM.map((t) => {
        const [s1, s2] = t.ev
        const ev: Partial<Record<StatKey, number>> = { [s1]: 252, [s2]: 252 }
        const allocated: Partial<Record<StatKey, number>> = { [s1]: primary, [s2]: secondary }
        return createMonInstance(t.speciesId, level, { owned: false, shiny: true, ev, allocated })
    })
}

// ── Dialogues ──
/** À l'arrivée dans le sanctuaire quand Ukognofy est capturé (une ligne, pas de combat auto). */
export const ORFEVRE_ARRIVAL_LINES = [
    "*Le sanctuaire est calme. Au centre, là où UKOGNOFY se tenait, quelqu'un t'attend…*",
]
export const ORFEVRE_INTRO_LINES = [
    "*Là où trônait UKOGNOFY, un dresseur polit une Ball nacrée à la lueur des flammes féeriques.*",
    "« Tu as dompté le mythe des mythes… alors tu es digne de voir MON œuvre : six Daemons CHROMATIQUES, forgés au niveau 100. »",
    "« Bats-les, et je te confierai une SHINY BALL : ce qu'elle capture devient chromatique à jamais. Une par victoire, six en tout. En garde ! »",
]
export const ORFEVRE_NO_TEAM_LINES = ["« Ton équipe est à terre. Reviens quand elle brillera à nouveau. »"]
export const ORFEVRE_ALREADY_TODAY_LINES = [
    "« Un seul duel par jour : mes chromatiques doivent se reposer. Reviens demain soir, le sanctuaire t'attendra. »",
]
export const ORFEVRE_DONE_LINES = [
    "« Six Shiny Balls… tu as vidé ma forge, dresseur. Va faire scintiller le Nexus ! »",
    "*L'Orfèvre retourne à son établi, un sourire aux lèvres.*",
]
/** Après une victoire récompensée. `given` = Shiny Balls remises AU TOTAL (celle-ci comprise). */
export function orfevreVictoryLines(given: number): string[] {
    return [
        "« Quel éclat ! Tu as fait pâlir mes chromatiques. »",
        `« Voici ta SHINY BALL (${given}/${ORFEVRE_MAX_BALLS}) : ce qu'elle capture devient chromatique à jamais — et elle accroche même les Daemons fusionnés. »`,
        given >= ORFEVRE_MAX_BALLS
            ? "« C'était la dernière de ma forge. Fais-en bon usage ! »"
            : "« Reviens demain soir : une autre t'attendra si tu l'emportes encore. »",
    ]
}
