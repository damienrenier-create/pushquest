// src/lib/gamebook/yellow/frontier/frontierBoard.ts
//
// ZONE DE COMBAT — STATS PARTAGÉES de la TOUR et de l'USINE (demande Sartay 19/10/2026 : « les mêmes stats que le
// Maître du Dôme, les meilleurs niveaux atteints par les différents joueurs — ça donnerait envie d'aller battre les
// autres ! »). Module PUR : règles affichées (construites sur les VRAIES constantes du moteur, pour ne jamais dériver),
// assainissement de l'équipe gravée avec un record, lecture d'un record gravé, tri du classement. Utilisé par la route
// frontier (serveur) et par les onglets Règles / Stats (client).

import { BOSS_EVERY, DEFAULT_TEAM_SIZE, JC_PER_WIN, JC_BOSS_MULT, type LevelRule } from "./engine"
import { DEFAULT_POOL_SIZE, MAX_SHARED_WEAKNESS } from "./factory"

/** Série qui sacre CHAMPION de la Tour ou de l'Usine (palier DAN_4, « équivalent Dôme ») → CT du Maître, une fois. */
export const FRONTIER_CHAMPION_STREAK = 46
/** Taille maximale du classement affiché. */
export const FRONTIER_BOARD_MAX = 30

const JC_LINE = `${JC_PER_WIN.L50} en Niv 50, ${JC_PER_WIN.ADAPT} en Adaptatif, ${JC_PER_WIN.L100} en Niv 100 ; un Cerveau en vaut ×${JC_BOSS_MULT}`

/** Règles de la TOUR DE COMBAT (onglet 📜 Règles). */
export const TOWER_RULES: readonly string[] = [
    `Série d'endurance avec TON équipe, contre des équipes de ${DEFAULT_TEAM_SIZE} Daemons : tiens le plus loin possible.`,
    "Trois modes : Niv 50, Niv 100, ou Adaptatif (au niveau de ton meilleur Daemon).",
    `Soin seulement au début de chaque bloc de ${BOSS_EVERY} combats (combats 1, ${BOSS_EVERY + 1}, ${2 * BOSS_EVERY + 1}…) : tes PV se gardent d'un combat à l'autre.`,
    `Un Cerveau (boss) tous les ${BOSS_EVERY} combats, avec l'IA la plus maligne.`,
    `Jetons de Combat par victoire : ${JC_LINE}.`,
    "Chaque victoire te rend une part de l'énergie dépensée (de 10 % à 100 %).",
    "Entre deux combats, tu continues ou tu t'arrêtes. Tes jetons restent acquis, même après une défaite.",
    "Une défaite clôt la série : ton record, c'est ton nombre de victoires d'affilée.",
    `${FRONTIER_CHAMPION_STREAK} victoires d'affilée : sacre de CHAMPION DE LA TOUR et une CT du Maître, une seule fois.`,
]

/** Règles de l'USINE DE COMBAT (onglet 📜 Règles). */
export const FACTORY_RULES: readonly string[] = [
    `Tu ne joues pas ton équipe, tu en loues une : choisis ${DEFAULT_TEAM_SIZE} Daemons parmi ${DEFAULT_POOL_SIZE} prêtés (jamais plus de ${MAX_SHARED_WEAKNESS} avec la même faiblesse).`,
    "Trois modes : Niv 50, Niv 100, ou Adaptatif.",
    `Un Cerveau (boss) tous les ${BOSS_EVERY} combats, avec l'IA la plus maligne.`,
    `Jetons de Combat par victoire : ${JC_LINE}.`,
    "Après chaque Cerveau battu : une CT au choix parmi les attaques de l'équipe vaincue (hors CT que tu as déjà).",
    "Chaque victoire te rend une part de l'énergie dépensée (de 10 % à 100 %).",
    "Une défaite clôt la série : ton record, c'est ton nombre de victoires d'affilée. Tes jetons restent acquis.",
    `${FRONTIER_CHAMPION_STREAK} victoires d'affilée : sacre de CHAMPION DE L'USINE et une CT du Maître, une seule fois.`,
]

/** Daemon d'une équipe gravée avec un record (sous-ensemble sûr d'un ChampionMon). */
export interface FrontierBoardMon { speciesId: string; level: number; shiny?: boolean; nickname?: string; moves?: string[] }
/** Record gravé (JSON dans FrontierProfile.towerTeam / factoryTeam). */
export interface EngravedRecord { streak: number; levelRule?: LevelRule; team: FrontierBoardMon[]; at?: string }
/** Ligne du classement renvoyée au client. */
export interface FrontierBoardEntry { nickname: string; best: number; me: boolean; team?: FrontierBoardMon[]; levelRule?: LevelRule; at?: string }

const LEVEL_RULES: readonly string[] = ["L50", "L100", "ADAPT"]
export const LEVEL_RULE_LABEL: Record<LevelRule, string> = { L50: "Niv 50", L100: "Niv 100", ADAPT: "Adaptatif" }

/** Assainit une équipe envoyée par le client : ≤ 6 Daemons, id d'espèce borné, niveau 1-100, surnom/attaques tronqués. */
export function sanitizeFrontierTeam(raw: unknown): FrontierBoardMon[] {
    if (!Array.isArray(raw)) return []
    const out: FrontierBoardMon[] = []
    for (const m of raw.slice(0, 6)) {
        if (!m || typeof m !== "object") continue
        const o = m as Record<string, unknown>
        if (typeof o.speciesId !== "string" || !o.speciesId || o.speciesId.length > 64) continue
        const mon: FrontierBoardMon = { speciesId: o.speciesId, level: Math.max(1, Math.min(100, Math.floor(Number(o.level) || 1))) }
        if (o.shiny === true) mon.shiny = true
        if (typeof o.nickname === "string" && o.nickname.trim()) mon.nickname = o.nickname.trim().slice(0, 20)
        if (Array.isArray(o.moves)) {
            const moves = o.moves.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 4).map((x) => x.slice(0, 40))
            if (moves.length) mon.moves = moves
        }
        out.push(mon)
    }
    return out
}

/** Normalise un mode de niveau (inconnu → undefined). */
export function sanitizeLevelRule(raw: unknown): LevelRule | undefined {
    return typeof raw === "string" && LEVEL_RULES.includes(raw) ? (raw as LevelRule) : undefined
}

/** Lit un record gravé (texte JSON de la base). Illisible → null, jamais d'exception. */
export function parseEngraved(raw: unknown): EngravedRecord | null {
    if (typeof raw !== "string" || !raw) return null
    try {
        const j = JSON.parse(raw) as Record<string, unknown>
        const streak = Math.max(0, Math.floor(Number(j.streak) || 0))
        const team = sanitizeFrontierTeam(j.team)
        if (!streak || !team.length) return null
        return { streak, team, levelRule: sanitizeLevelRule(j.levelRule), at: typeof j.at === "string" ? j.at : undefined }
    } catch { return null }
}

/** Construit le classement d'une salle : meilleurs records d'abord (> 0), équipe jointe UNIQUEMENT si elle a été gravée
 *  avec CE record (un record antérieur à la gravure n'a pas d'équipe), « me » pour le joueur qui regarde. */
export function buildFrontierBoard(
    rows: readonly { userId: string; best: number; engraved?: string | null }[],
    nicknameOf: (userId: string) => string | undefined,
    meId: string,
    max = FRONTIER_BOARD_MAX,
): FrontierBoardEntry[] {
    return rows
        .filter((r) => r.best > 0)
        .sort((a, b) => b.best - a.best)
        .slice(0, max)
        .map((r) => {
            const rec = parseEngraved(r.engraved)
            const withTeam = rec && rec.streak === r.best ? rec : null
            return {
                nickname: nicknameOf(r.userId) ?? "?",
                best: r.best,
                me: r.userId === meId,
                ...(withTeam ? { team: withTeam.team, levelRule: withTeam.levelRule, at: withTeam.at } : {}),
            }
        })
}
