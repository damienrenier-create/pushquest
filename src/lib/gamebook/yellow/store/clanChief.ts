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

/** VOIX de chaque chef pour son PITCH « meute pleine » : geste, âme du clan, bénéfice du starter, piques anti-rivaux
 *  (keyées par le clan visé — chaque chef ne disse QUE sa proie + son prédateur, jamais son propre clan). */
const CLAN_FLAVOR: Record<ClanKey, { gesture: string; identity: string; withStarter: string; disses: Record<ClanKey, string> }> = {
    air: {
        gesture: "une brise fait tournoyer sa cape sans qu'il ne bouge",
        identity: "Le clan de l'AIR ne se laisse jamais toucher : vitesse et esquive, frapper le premier puis s'évaporer.",
        withStarter: "il fendra les cieux et prendra de vitesse tout ce qui rampe.",
        disses: { air: "", combat: "les brutes du Combat cognent fort, mais s'effondrent au premier revers — tu les balaieras du ciel", roche: "la Roche est solide, soit… mais lourde et prévisible : on tournoie autour d'elle jusqu'à l'épuisement" },
    },
    combat: {
        gesture: "il fait craquer ses phalanges une à une",
        identity: "Le clan du COMBAT frappe comme la foudre : puissance titanesque, aucun quartier. Qui recule est déjà à terre.",
        withStarter: "il défoncera les murs les plus épais d'un seul coup.",
        disses: { combat: "", roche: "la Roche se croit inébranlable ? Un bon crochet et le menhir se fissure", air: "les fuyards de l'Air voltigent joliment — jusqu'à ce qu'un poing les cloue au sol" },
    },
    roche: {
        gesture: "il reste immobile comme un menhir planté depuis mille ans",
        identity: "Le clan de la ROCHE ne plie JAMAIS : patience et endurance, encaisser chaque coup et user l'adversaire jusqu'à la poussière.",
        withStarter: "il tiendra debout là où tous les autres tombent.",
        disses: { roche: "", air: "les courants d'air de l'Air t'amusent ? Ils se brisent contre nos falaises", combat: "le Combat s'épuise en rage ; nous, on attend, immobiles, qu'ils s'écroulent" },
    },
}

/** CORPS du pitch d'un chef (≠ ligne générique) : petite analyse d'équipe + argument pro-clan + piques contre les
 *  DEUX rivaux (proie + prédateur, triangle). Propre à chaque chef. Complété par une CLÔTURE selon le contexte. */
function clanPitchBody(clan: ClanKey): string[] {
    const c = CLANS[clan]
    const f = CLAN_FLAVOR[clan]
    const team = getPlayer().team
    const avg = team.length ? Math.round(team.reduce((s, m) => s + m.level, 0) / team.length) : 0
    const myFr = CLAN_TYPE_FR[c.type] ?? c.type
    const starter = getSpecies(c.starterId)?.name ?? "l'un des miens"
    const analysis = activeTeamHasType(c.type)
        ? `${c.emoji} *${f.gesture}.* Ta meute (niveau moyen ~${avg}) porte déjà du ${myFr} — le sang du ${c.name} coule en toi, je le sens.`
        : `${c.emoji} *${f.gesture}.* Laisse-moi jauger ta meute… niveau moyen ~${avg}, et pas la moindre once de ${myFr}. Une lacune béante — que MOI seul peux combler.`
    return [
        analysis,
        `${f.identity} Prête-moi serment et ${starter} entrera dans tes rangs : ${f.withStarter}`,
        `Et surtout, ne va pas t'égarer chez les rivaux : ${f.disses[c.prey]}. Quant au ${CLANS[c.predator].name} ? ${f.disses[c.predator]}.`,
    ]
}

/** MEUTE PLEINE : pitch + encouragement à libérer une place (pas de signature possible). */
function teamFullPitch(clan: ClanKey): string[] {
    const c = CLANS[clan]
    return [...clanPitchBody(clan), `Mais ta meute DÉBORDE — je ne peux rien t'offrir tant qu'elle est pleine. Libère une place, puis reviens sceller le pacte : le ${c.name} n'oublie pas ceux qui hésitent.`]
}

/** OFFRE du pacte : pitch + explication du PACTE DE SANG + demande de CONFIRMATION explicite (A signe / B recule). */
function clanOfferPitch(clan: ClanKey): string[] {
    const c = CLANS[clan]
    return [
        ...clanPitchBody(clan),
        `Alors, tu es prêt à rejoindre le ${c.name} ? C'est un PACTE DE SANG, IRRÉVERSIBLE ce run : plus JAMAIS tu ne pourras servir un autre clan. En échange, l'un des miens entre dans ta meute, et je te guide — CT du clan au niveau 50, Transcendance au niveau 80.`,
        `⚔️ CONFIRMES-TU ? Presse [A] pour SIGNER DE TON SANG — c'est définitif — ou [B] pour reculer encore.`,
    ]
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
    if (getPlayer().team.length >= TEAM_MAX) return { lines: teamFullPitch(clan) }
    return { pendingJoin: clan, lines: clanOfferPitch(clan) }
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
