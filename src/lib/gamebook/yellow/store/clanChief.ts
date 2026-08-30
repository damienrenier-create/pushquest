// src/lib/gamebook/yellow/store/clanChief.ts
//
// Interaction avec les 3 CHEFS DE CLAN (Chapelle de Nouillon). Le pacte est IRRÉVERSIBLE par run.
// pressA → offre / visite / jalons / refus / jalousie ; la CONFIRMATION du pacte (don du Daemon niv 5)
// se fait à la fermeture du dialogue via executeClanJoin(). Cf. data/clans.ts + project chapelle.

import {
    CLANS, clanOfChief, clanRelation, clanTrainDailyMarker, CLAN_JOIN_MIN_BADGES, CLAN_CT_LEVEL,
    CLAN_TRANSCENDANCE_LEVEL, TRANSCENDANCE_CT_ID, type ClanKey,
} from "../data/clans"
import { getSpecies } from "../data/species"
import type { PokeType } from "../battle/types"
import { createMonInstance } from "../battle/factory"
import {
    getPlayer, getClan, joinClan, clanDaemonLevel, clanDaemonSpeciesId, isClanCtGiven, markClanCtGiven,
    isClanTransGiven, markClanTransGiven, rivalClanSignatureInTeam, claimClanVisitToday,
    grantReps, addItem, grantCt, logEnergyIncome, addCaught, markCaughtThisRun, TEAM_MAX, isTrainerDefeated, getActiveWorld,
} from "./playerStore"
import { markCaught } from "./pokedexStore"
import { persistYellowSave } from "./saveManager"
import { postClanHallEntry } from "./clanHof"

/** Résultat d'un press-A sur un chef : lignes de dialogue + intention en attente (scellée/annulée à la fermeture). */
export interface ClanChiefResult { lines: string[]; pendingJoin?: ClanKey; pendingTrain?: ClanKey }

/** Libellé FR du type d'un clan (seuls VOL/COMBAT/ROCHE servent ici). */
const CLAN_TYPE_FR: Partial<Record<PokeType, string>> = { VOL: "Vol", COMBAT: "Combat", ROCHE: "Roche" }

/** Un Daemon de ce type figure-t-il dans l'ÉQUIPE ACTIVE ? (gate d'entraînement rival, type ≠ signature). */
function activeTeamHasType(type: PokeType): boolean {
    return getPlayer().team.some((m) => getSpecies(m.speciesId)?.types.includes(type) === true)
}

const CLAN_STARTER_LEVEL = 5
const CLAN_VISIT_BALL_ID = "poke_ball" // Nexus Ball (récompense visite quand le niveau = dizaine)

/** Réaction du chef `npcId` quand le joueur lui parle (null = pas un chef de clan). */
export function clanChiefPressA(npcId: string, today: string): ClanChiefResult | null {
    const clan = clanOfChief(npcId)
    if (!clan) return null
    const c = CLANS[clan]
    const mine = getClan()

    // (a) MEMBRE de CE clan → jalousie, sinon jalons (50/80) + visite quotidienne.
    if (mine === clan) {
        const rival = rivalClanSignatureInTeam()
        if (rival) return { lines: [
            `${c.emoji} Un fauve du ${CLANS[rival].name} rôde dans ta meute ?! Tant qu'il y sera, tu n'auras RIEN de moi.`,
            "Range ce traître au PC, puis reviens la tête haute.",
        ] }
        const lvl = clanDaemonLevel()
        const lines: string[] = []
        // Transcendance (niv 80) — priorité (1× par run).
        if (lvl >= CLAN_TRANSCENDANCE_LEVEL && !isClanTransGiven() && grantCt(TRANSCENDANCE_CT_ID)) {
            markClanTransGiven()
            lines.push("Tu as mené ton disciple à la TRANSCENDANCE (niv 80). Reçois la CT ULTIME — un présent qui ne se donne qu'une fois.")
        }
        // CT du clan (niv 50).
        if (lvl >= CLAN_CT_LEVEL && !isClanCtGiven() && grantCt(c.ctId)) {
            markClanCtGiven()
            lines.push(`Niveau 50 franchi ! Reçois la CT secrète du ${c.name} — elle comble ce qui manquait à ton type.`)
        }
        // Visite quotidienne : énergie = niveau du Daemon-clan (+ Nexus Ball si niveau = dizaine).
        if (claimClanVisitToday(today) && lvl > 0) {
            const added = grantReps(lvl)
            if (added > 0) logEnergyIncome(`${c.emoji} ${c.name}`, added)
            let extra = ""
            if (lvl % 10 === 0) { addItem(CLAN_VISIT_BALL_ID, 1); extra = " + une Nexus Ball 🎁" }
            lines.push(`Fidèle parmi les fidèles. Pour ton dévouement du jour : ${added} ⚡${extra}.`)
        }
        if (lines.length === 0) lines.push(
            `${c.emoji} Le ${c.name} veille sur toi. Fais grandir ton disciple : niv 50 → ma CT, niv 80 → la Transcendance.`,
        )
        // ENTRAÎNEMENT du clan (×2 XP, 1×/jour). Le combat se lance à la fermeture du dialogue (pendingTrain).
        let pendingTrain: ClanKey | undefined
        if (isTrainerDefeated(clanTrainDailyMarker(clan, today))) {
            lines.push("Tu as déjà saigné pour moi aujourd'hui. Repose ta meute — reviens demain.")
        } else {
            lines.push("Prêt à suer ? Un round contre MA garde et tu repars avec le DOUBLE d'XP. (Presse pour lancer, ou recule.)")
            pendingTrain = clan
        }
        // PANTHÉON DES CLANS : grave/actualise le pic du Daemon-clan (persistant cross-run). Best-effort, jamais en rejeu.
        if (getActiveWorld() !== "replay" && clanDaemonLevel() > 0) {
            postClanHallEntry({ clan, level: clanDaemonLevel(), speciesId: clanDaemonSpeciesId(), transcended: isClanTransGiven() })
        }
        persistYellowSave()
        return { lines, pendingTrain }
    }

    // (b) MEMBRE d'un AUTRE clan → ENTRAÎNEMENT RIVAL (×3 coût / ×3 XP, 1×/jour), gate par le TRIANGLE.
    if (mine) {
        const rel = clanRelation(mine, clan) // "prey" = je le domine (faible) | "predator" = il me domine (fort)
        const label = CLAN_TYPE_FR[c.type] ?? c.type
        const has = activeTeamHasType(c.type)
        // Gate faible : je possède déjà leur type → rien à apprendre. Gate fort : aucun de leur type → suicide.
        if (rel === "prey" && has) return { lines: [
            `${c.emoji} Tu trimballes déjà un Daemon ${label} dans ta meute ? Mes avortons n'ont rien à t'apprendre. Ouste.`,
        ] }
        if (rel === "predator" && !has) return { lines: [
            `${c.emoji} M'affronter sans un seul Daemon ${label} pour encaisser ? Du suicide. Reviens équipé, gamin.`,
        ] }
        if (isTrainerDefeated(clanTrainDailyMarker(clan, today))) return { lines: [
            `${c.emoji} Une séance par jour, pas plus. Ta carcasse a assez trinqué chez nous. Demain.`,
        ] }
        return {
            pendingTrain: clan,
            lines: [
                `${c.emoji} Le ${CLANS[mine].name} t'envoie te frotter aux miens ? Soit — mais un intrus paie le prix fort.`,
                "Chaque coup te coûtera le TRIPLE d'énergie… et te rapportera le TRIPLE d'XP. (Presse pour encaisser, ou recule.)",
            ],
        }
    }

    // (c) AUCUN clan → gate arène 1, place libre, puis offre du pacte.
    if (getPlayer().badges.length < CLAN_JOIN_MIN_BADGES) return { lines: [
        `${c.emoji} Prêter serment ? Pas si vite. Reviens quand tu auras décroché ton PREMIER badge d'arène.`,
    ] }
    if (getPlayer().team.length >= TEAM_MAX) return { lines: [
        `${c.emoji} Mon disciple n'a pas de place dans une meute pleine. Libère un slot d'équipe, puis reviens sceller le pacte.`,
    ] }
    return {
        pendingJoin: clan,
        lines: [
            `${c.emoji} Tu veux rejoindre le ${c.name} ?`,
            "C'est un PACTE DE SANG, IRRÉVERSIBLE ce run : plus jamais tu ne pourras servir un autre clan. En retour, l'un des miens entre dans ta meute, et je te guide (CT au niv 50, Transcendance au niv 80).",
            "Presse pour SCELLER le pacte… ou recule.",
        ],
    }
}

/** CONFIRMATION du pacte (fermeture du dialogue) : don du Daemon-clan niv 5 + serment gravé. */
export function executeClanJoin(clan: ClanKey): string[] {
    const c = CLANS[clan]
    if (getClan()) return ["Un serment déjà scellé ne se reprend pas."] // garde-fou double
    if (getPlayer().team.length >= TEAM_MAX) return ["Ta meute est pleine — libère une place d'abord, puis reviens."]
    const mon = createMonInstance(c.starterId, CLAN_STARTER_LEVEL, { owned: true })
    addCaught(mon)
    markCaught(c.starterId); markCaughtThisRun(c.starterId)
    joinClan(clan, mon.uid)
    persistYellowSave()
    // PANTHÉON DES CLANS : grave immédiatement le nouveau membre (niv 5). Best-effort, jamais en rejeu.
    if (getActiveWorld() !== "replay") postClanHallEntry({ clan, level: CLAN_STARTER_LEVEL, speciesId: c.starterId, transcended: false })
    const name = getSpecies(c.starterId)?.name ?? "ton disciple"
    return [
        `${c.emoji} Le pacte est scellé de ton sang. Ton nom rejoint le Panthéon du ${c.name}.`,
        `Voici ${name}, niveau ${CLAN_STARTER_LEVEL}. Fais-le grandir : il ne se trouve nulle part ailleurs.`,
        "Sers-moi avec loyauté — jamais un fauve rival dans ta meute.",
    ]
}
