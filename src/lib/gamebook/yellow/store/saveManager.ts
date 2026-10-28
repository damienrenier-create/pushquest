// src/lib/gamebook/yellow/store/saveManager.ts
//
// Nexus Jaune Éclair — pont entre les stores (joueur + Pokédex) et l'API de save.
// Charge au démarrage, puis auto-sauvegarde (débouncé) à chaque changement.

import { setGeniePaid, setNemesisSeals, syncSealsToWorld, isNemesisSeal, removeGeniePaid, addGeniePaid, isGeniePaid, pruneGenieInFlight, reapplyGenieWishes, setWorldMayBeDiscardedCheck, CASINO_RESTRICTED_MARKER, CASINO_UNCAPPED_MARKER, markGenieArcSeen, restoreDurableWishState, isDurableWishMarker, GENIE_CATCH_PREFIX, ABUNDANCE_CURSE_MARKER, type DurableWishState, genieCatchCharges, setGenieCatchCharges, setOtherWorldMarkerCheck, getPlayer, hydratePlayer, subscribePlayer, setWildCtx, creditDailyReps, bankReps, creditReps, logEnergyIncome, restoreRepsState, claimWelcomeGift, claimSpagGift, applySaiyanResults, resetForIntro, clearThiefForReset, reregisterCustomDaemons, getActiveWorld, setActiveWorld, startNgPlusWorld, startRun3World, raiseRepsCap, grantReps, addItem, setBerrySecretKnown, setCollectionneurDexGiven, setBadgeRepsClaimed, seedSeenThisRun, ensureModeStartGrant, startReplayWorld, getReplayRun, getReplayReturn, setReplayContext, clearReplayContext, getGameMode, reconcileCrossRunItems, fixNgplusFusioBalls, openPlatineIfOrCleared, applyExternalEffects } from "./playerStore"
import { getPokedex, hydratePokedex, subscribePokedex } from "./pokedexStore"
import { getSpecies, SPECIES } from "../data/species"
import { parseSave, emptySave, type YellowSave, type ChampionMon, SAVE_VERSION, ENERGY_LOG_MAX, MSG_LOG_MAX } from "../storage/save"
import type { StoredCustomDaemon } from "../create/customSpecies"
import type { MonInstance } from "../battle/types"
import type { BadgeId } from "../data/cts"
import { saiyanPointsForLevels, type SaiyanWindow } from "../data/saiyanConfig"
import { giftNoteLines } from "../data/energyGiftNote"
import { migrateBoatBadge, withImpliedAncre } from "../data/boatArena"
import { BADGE_REPS_CAP_BONUS } from "../data/badges"
import { NEMESIS_ARMED_MARKER, NEMESIS_DONE_MARKER } from "../data/nemesisChallenge"
import { isGeniePaidMarker, genieExtMarker, genieGrantMarker, GENIE_TRAINER_ID, LAMP_RUBBED_MARKER, LAMP_ITEM_ID } from "../data/genieLamp"

/** Énergie de départ d'un New Game+ (crédit + plafond). */
export const NGPLUS_START_ENERGY = 10000
/** RUN 3 (concours) — énergie de DÉPART (500) + plafond = le MAX atteignable de la nouvelle échelle de recharge
 *  (les arènes RECHARGENT jusqu'à 500/600/700/800/1000, jamais au-dessus → le plafond utile est 1000). */
export const RUN3_START_ENERGY = 500
export const RUN3_ENERGY_CAP = 1000

let loaded = false
let autosaveInit = false
let timer: ReturnType<typeof setTimeout> | null = null
// Neutralise l'autosave débouncé pendant une opération volontaire multi-étapes (reset) qui a des `await` :
// sinon un emit() synchrone arme un timer 800ms qui peut POSTer l'état intermédiaire pendant un fetch → 409/resync.
let suppressAutosave = false

// Mondes (jusqu'à 3 : run 1 = live, run 2 = ngplus, run 3 = concours) — le monde ACTIF vit dans les stores
// (playerStore + pokedexStore). Les mondes INACTIFS sont STASHÉS ici, sérialisés (YellowSave), et réassemblés
// dans snapshot() sans jamais écraser l'actif. Le slot du monde actif vaut null (il vit dans les stores).
// `ngplusOldTeam` = ancienne équipe figée (adversaire du combat de fin de Ligue NG+), globale aux mondes.
let liveStash: YellowSave | null = null      // run 1, stashé quand actif ≠ live
let ngplusStash: YellowSave | null = null    // run 2, stashé quand actif ≠ ngplus (null si jamais lancé)
let run3Stash: YellowSave | null = null      // run 3, stashé quand actif ≠ run3 (null si jamais lancé)
/** Marqueur posé dans un monde STASHÉ (run 1 / run 2 / run 3 non actifs — dont le vrai monde pendant une bulle de rejeu).
 *  Branché dans playerStore pour les vœux du génie : un vœu déjà payé dans un autre monde ne se repaie pas (20/10/2026). */
export function markerInOtherWorld(marker: string): boolean {
    // + les PROFILS inactifs (même compte, donc même joueur : un vœu se paie une fois par COMPTE). Ils sont gardés
    //   OPAQUES (non normalisés) → gardes Array.isArray ; chacun porte son run 1 à plat + ses mondes imbriqués.
    const has = (w: unknown) => { const dt = (w as { defeatedTrainers?: unknown } | null | undefined)?.defeatedTrainers; return Array.isArray(dt) && dt.includes(marker) }
    if ([liveStash, ngplusStash, run3Stash].some(has)) return true
    return altProfilesStash.some((p) => { const q = p as unknown as Record<string, unknown>; return has(q) || has(q?.ngplusWorld) || has(q?.run3World) || has(q?.replayWorld) })
}
setOtherWorldMarkerCheck(markerInOtherWorld)
// RUN 2 encore abandonnable : un vœu NEUF, un lot d'effets ou un cadeau d'énergie y attendent (payés là, ils disparaîtraient
//   avec le monde jeté). canAbandonNgplus est lu à l'appel (déclaré plus bas).
setWorldMayBeDiscardedCheck(() => canAbandonNgplus())
/** 🧞 VŒUX PAYÉS — registre GLOBAL au compte reconstitué depuis une save : son champ geniePaid + les marqueurs genie_fx* de
 *  TOUS ses mondes (run 1 à plat, run 2, run 3, bulle) et de ses profils inactifs. Les saves d'avant le registre (28/10/2026)
 *  sont ainsi rétro-remplies : aucun vœu déjà versé n'est repayé. */
export function geniePaidOfSave(save: YellowSave): string[] {
    const out = new Set<string>()
    const scan = (w: unknown, depth: number) => {
        if (!w || typeof w !== "object" || depth > 3) return
        const o = w as Record<string, unknown>
        for (const k of ["geniePaid", "defeatedTrainers"]) {
            const a = o[k]
            if (Array.isArray(a)) for (const m of a) if (typeof m === "string" && isGeniePaidMarker(m)) out.add(m)
        }
        for (const k of ["ngplusWorld", "run3World", "replayWorld"]) scan(o[k], depth + 1)
        if (Array.isArray(o.altProfiles)) for (const p of o.altProfiles) scan(p, depth + 1)
    }
    scan(save, 0)
    return [...out]
}
/** ⛓️ SCEAUX du compte depuis une save : son registre `nemesisSeals` s'il existe (source de vérité : une revanche y a pu lever un
 *  sceau encore présent dans un vieux monde) ; sinon (save d'avant le registre) l'union des `_blocked` de tous ses mondes et
 *  profils — un profil inactif apporte son propre registre s'il en a un. */
export function nemesisSealsOfSave(save: YellowSave): string[] {
    if (Array.isArray(save.nemesisSeals)) return save.nemesisSeals.filter((m) => typeof m === "string" && isNemesisSeal(m))
    // Save d'avant le registre : une REVANCHE déjà armée et pas encore jouée (défi armé sans essai) a levé le sceau dans SON
    //   monde ; les autres en gardent la copie de l'ancien essai → ne pas la ressusciter par l'union.
    let revanchePending = false
    eachWorldOfSave(save, (w) => { const dt = markersOf(w); if (dt.includes(NEMESIS_ARMED_MARKER) && !dt.includes(NEMESIS_DONE_MARKER)) revanchePending = true })
    if (revanchePending) return []
    const out = new Set<string>()
    eachWorldOfSave(save, (w) => {
        const reg = w.nemesisSeals
        const src = Array.isArray(reg) ? reg : markersOf(w)
        for (const m of src) if (typeof m === "string" && isNemesisSeal(m)) out.add(m)
    })
    return [...out]
}
/** Parcourt une save ENTIÈRE : son monde à plat, ses mondes imbriqués (run 2, run 3, bulle) et ses profils inactifs. */
function eachWorldOfSave(save: unknown, visit: (w: Record<string, unknown>) => void): void {
    const walk = (w: unknown, depth: number) => {
        if (!w || typeof w !== "object" || depth > 3) return
        const o = w as Record<string, unknown>
        visit(o)
        for (const k of ["ngplusWorld", "run3World", "replayWorld"]) walk(o[k], depth + 1)
        if (Array.isArray(o.altProfiles)) for (const p of o.altProfiles) walk(p, depth + 1)
    }
    walk(save, 0)
}
const markersOf = (w: Record<string, unknown>): string[] => Array.isArray(w.defeatedTrainers) ? w.defeatedTrainers.filter((m): m is string => typeof m === "string") : []
/** 🧞 COLPORTEUR DU GÉNIE déjà rencontré, n'importe où sur le compte (drapeau, colporteur battu, lampe frottée) : l'embuscade
 *  ne se rejoue ni dans un nouveau run, ni dans un rejeu, ni dans un nouveau profil. Avant le 28/10/2026, le drapeau était lu
 *  dans le monde seul : une save d'avant le drapeau (colporteur battu, drapeau absent) rouvrait l'embuscade dans tout monde neuf. */
export function genieArcSeenOfSave(save: YellowSave): boolean {
    let seen = false
    eachWorldOfSave(save, (w) => { if (w.genieArcSeen === true || markersOf(w).some((m) => m === GENIE_TRAINER_ID || m === LAMP_RUBBED_MARKER)) seen = true })
    return seen
}

/** 🧞 VŒUX QUI DURENT (Sartay 28/10/2026 : « … sauf évidemment si c'est un vœu qui dure dans le temps ») : leur état (charges,
 *  durée) vit dans UN monde. Un monde neuf (run 2, run 3, bulle de rejeu) n'en reçoit pas de copie : le vœu y est en PAUSE et
 *  reprend au retour, sans charge consommée deux fois. Fusion, abandon du run 2 et remise à zéro le CONSERVENT : on complète
 *  `into` avec l'état de `from` là où `into` n'en a pas (jamais d'écrasement, jamais de somme). */
export function withDurableWishesFrom(into: YellowSave, from: YellowSave | null | undefined): YellowSave {
    if (!from) return into
    const out: YellowSave = { ...into }
    if (!out.evResetCharges && from.evResetCharges) out.evResetCharges = from.evResetCharges
    if (!out.shinyWish && from.shinyWish) out.shinyWish = from.shinyWish
    if (!out.dexWish && from.dexWish) out.dexWish = from.dexWish
    // Fenêtres DATÉES : une fenêtre échue compte comme absente (sinon elle masquerait celle qui court encore).
    const now = Date.now()
    if (!(out.shinyFrenzy && out.shinyFrenzy.until > now) && from.shinyFrenzy && from.shinyFrenzy.until > now) out.shinyFrenzy = from.shinyFrenzy
    if (!(out.shopSurtax && out.shopSurtax.until > now) && from.shopSurtax && from.shopSurtax.until > now) out.shopSurtax = from.shopSurtax
    if (!out.forcedEncounter && isWishEncounter(from.forcedEncounter)) out.forcedEncounter = from.forcedEncounter
    if (!out.ballLockRemaining && from.ballLockRemaining) out.ballLockRemaining = from.ballLockRemaining
    if (!out.curseAbundanceStart && from.curseAbundanceStart) {
        out.curseAbundanceStart = from.curseAbundanceStart; out.curseFreeItemsTaken = from.curseFreeItemsTaken; out.curseFreeItemDate = from.curseFreeItemDate
    }
    const dt = out.defeatedTrainers ?? [], fromDt = from.defeatedTrainers ?? []
    const add: string[] = []
    if (!dt.some((m) => m.startsWith(GENIE_CATCH_PREFIX))) { const c = fromDt.find((m) => m.startsWith(GENIE_CATCH_PREFIX)); if (c) add.push(c) }
    // Revanche armée et pas encore jouée dans `into` : l'ancien essai (DONE, acompte) de `from` ne doit pas la consommer.
    const pendingRevanche = dt.includes(NEMESIS_ARMED_MARKER) && !dt.includes(NEMESIS_DONE_MARKER)
    for (const m of fromDt) if (!m.startsWith(GENIE_CATCH_PREFIX) && isDurableWishMarker(m) && !dt.includes(m) && !add.includes(m)
        && !(pendingRevanche && (m === NEMESIS_DONE_MARKER || m.startsWith("nemesis_acompte_")))) add.push(m) // malédiction, casino, défi némésis
    if (add.length) out.defeatedTrainers = casinoLiftWins([...dt, ...add])
    if (!out.genieArcSeen && from.genieArcSeen) out.genieArcSeen = true // colporteur rencontré : vaut pour tout le compte
    return out
}
/** Rencontre imposée PAR UN VŒU (ou le dex wish) : la rencontre Galijah, propre à une partie (≥ 200 espèces), n'en est pas une. */
function isWishEncounter(enc: string | undefined): enc is string { return !!enc && !enc.includes('"galijah"') }
const durableWishStateOf = (w: YellowSave): DurableWishState => ({
    evResetCharges: w.evResetCharges, shinyWish: w.shinyWish, dexWish: w.dexWish, shinyFrenzy: w.shinyFrenzy, shopSurtax: w.shopSurtax,
    forcedEncounter: isWishEncounter(w.forcedEncounter) ? w.forcedEncounter : undefined, curseAbundanceStart: w.curseAbundanceStart, curseFreeItemsTaken: w.curseFreeItemsTaken,
    curseFreeItemDate: w.curseFreeItemDate, ballLockRemaining: w.ballLockRemaining, markers: (w.defeatedTrainers ?? []).filter(isDurableWishMarker),
})
/** Fusion : marqueurs du monde absorbé, SAUF l'ancien essai du défi némésis (DONE, acomptes) quand le monde gagnant porte une
 *  REVANCHE armée et pas encore jouée — sinon la fusion la consommerait sans combat (revue du 28/10/2026). */
function secondaryMarkersFor(primary: YellowSave, secondary: YellowSave): string[] {
    const pdt = primary.defeatedTrainers ?? []
    if (!(pdt.includes(NEMESIS_ARMED_MARKER) && !pdt.includes(NEMESIS_DONE_MARKER))) return secondary.defeatedTrainers ?? []
    return (secondary.defeatedTrainers ?? []).filter((m) => m !== NEMESIS_DONE_MARKER && !m.startsWith("nemesis_acompte_"))
}
/** Plafond casino : une LEVÉE posée dans l'un des mondes l'emporte sur le plafond venu de l'autre (union des marqueurs). */
const casinoLiftWins = (dt: string[]): string[] => dt.includes(CASINO_UNCAPPED_MARKER) ? dt.filter((m) => m !== CASINO_RESTRICTED_MARKER) : dt
/** Un seul compteur de captures garanties (genie_catch_<n>) après une union de marqueurs : le premier (monde gagnant). */
const oneCatchMarker = (dt: string[]): string[] => { let seen = false; return dt.filter((m) => !m.startsWith(GENIE_CATCH_PREFIX) || (seen ? false : (seen = true))) }
// MULTI-PROFILS : profils COMPLETS inactifs (chacun un YellowSave à part entière). Le profil ACTIF vit dans les
// stores + les 3 slots ci-dessus ; les AUTRES profils sont stashés ici, OPAQUES, réémis tels quels par snapshot.
let altProfilesStash: YellowSave[] = []
let ngplusOldTeam: ChampionMon[] | null = null

/** Un monde « nu » (sans méta multi-mondes), prêt à être stashé ou imbriqué. */
function liveWorldOf(save: YellowSave): YellowSave {
    return { ...save, activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null, run3World: null, replayWorld: null, replayRun: null, replayReturn: null }
}

/** Hydrate les stores (joueur + Pokédex) depuis UN monde. `customDaemons` est GLOBAL (partagé entre les
 *  2 mondes) → toujours fourni depuis le haut niveau de la save. */
function hydrateFromWorld(w: YellowSave, customDaemons: StoredCustomDaemon[], fixedCapWorld = false, thief?: import("../data/thief").ThiefState | null): void {
    // ⚓ REPRISE « arène 4 = le bateau » (21/10/2026) : un monde qui a déjà dépassé ce point (badge Électrik/Eau) reçoit le
    //   badge ANCRE (+ le plafond d'un badge, sauf monde à plafond FIXE = run 3) ; tout l'équipage déjà battu → badge +
    //   CLÉ. Idempotent (badge déjà là → rien), re-persisté au prochain save. Cf. data/boatArena.migrateBoatBadge.
    const boat = migrateBoatBadge(w, fixedCapWorld ? 0 : BADGE_REPS_CAP_BONUS)
    if (boat.changed) w = { ...w, badges: boat.badges, items: boat.items, repsCap: boat.repsCap, ananasLastBadgeCount: boat.ananasLastBadgeCount }
    // 🥷 VOLEUR : état GLOBAL au profil → fourni explicitement (chargement/profil), sinon on GARDE celui des stores (une
    //   bascule de monde ne doit jamais relire la copie PÉRIMÉE d'un stash : le vol a pu avoir lieu dans l'autre monde).
    hydratePlayer({ thief: thief !== undefined ? thief : (getPlayer().thief ?? null), team: w.team, pc: w.pc, items: w.items, reps: w.reps, repsCap: w.repsCap, creditedThrough: w.creditedThrough, pastaBoughtToday: w.pastaBoughtToday, casinoSpentToday: w.casinoSpentToday, pastaDayBonus: w.pastaDayBonus, defeatedTrainers: w.defeatedTrainers, rematchedTrainers: w.rematchedTrainers, badges: w.badges as BadgeId[], introSeen: w.introSeen, sbireDefeatsToday: w.sbireDefeatsToday, champBattlesToday: w.champBattlesToday, consultsToday: w.consultsToday, archivisteMatchesToday: w.archivisteMatchesToday, archivisteWinsToday: w.archivisteWinsToday, badgeRepsClaimed: w.badgeRepsClaimed, badgeRepsToday: w.badgeRepsToday, comparisonConsultsToday: w.comparisonConsultsToday, sageSaiyanPointsToday: w.sageSaiyanPointsToday, ananasLastBadgeCount: w.ananasLastBadgeCount, ananasDate: w.ananasDate, ananasPeakLevel: w.ananasPeakLevel, capturesToday: w.capturesToday, sbireWinsTotal: w.sbireWinsTotal, pvpStats: w.pvpStats, domeStats: w.domeStats, towerStats: w.towerStats, factoryStats: w.factoryStats, domeTierRecord: w.domeTierRecord, stats: w.stats, acePeakLevel: w.acePeakLevel, aceBox: w.aceBox, aceTeamSizePeak: w.aceTeamSizePeak, aceWins: w.aceWins, aceDefeatedDate: w.aceDefeatedDate, duelWins: w.duelWins, ownedCts: w.ownedCts, boughtCts: w.boughtCts, gekrocResolved: w.gekrocResolved, hhSpectresShown: w.hhSpectresShown, hhCollectorWins: w.hhCollectorWins, isChampion: w.isChampion, leagueSixShiny: w.leagueSixShiny, mirrorWinHigherLevel: w.mirrorWinHigherLevel, berrySecretKnown: w.berrySecretKnown, berryHarvestDay: w.berryHarvestDay, berryHarvestPicked: w.berryHarvestPicked, sylvebarbeAwake: w.sylvebarbeAwake, caveTradeDone: w.caveTradeDone, goshHintHeard: w.goshHintHeard, orcalineWins: w.orcalineWins, orcalineDate: w.orcalineDate, chenGiftClaims: w.chenGiftClaims, funDefis: w.funDefis, achTrack: w.achTrack, pnj5Wins: w.pnj5Wins, ngplusBattles: w.ngplusBattles, repsBankedTotal: w.repsBankedTotal, welcomeGift: w.welcomeGift, pokerFirstGameDone: w.pokerFirstGameDone, pokerBossStacks: w.pokerBossStacks, pokerCashCap: w.pokerCashCap, pokerCashDate: w.pokerCashDate, casinoNetToday: w.casinoNetToday, casinoNetDate: w.casinoNetDate, spagGift: w.spagGift, pastaGodGift: w.pastaGodGift, labDefi: w.labDefi, ngplusStartedAt: w.ngplusStartedAt, playtimeMs: w.playtimeMs, leaguePotions: w.leaguePotions, ngplusUsed: w.ngplusUsed, run3Used: w.run3Used, ngplusMaitreBeaten: w.ngplusMaitreBeaten, run3StarterBase: w.run3StarterBase, ngplusStarterBase: w.ngplusStarterBase, genieArcSeen: w.genieArcSeen, nemesisSeals: getPlayer().nemesisSeals, genesisMode: w.genesisMode, run3Defeated: w.run3Defeated, run3EnergyByArena: w.run3EnergyByArena, caughtThisRun: w.caughtThisRun, seenThisRun: w.seenThisRun, fichesUnlockedThisRun: w.fichesUnlockedThisRun, collectionneurDexGiven: w.collectionneurDexGiven, fusionRoster: w.fusionRoster, fusionNames: w.fusionNames, fusionMoveOrders: w.fusionMoveOrders, fusionTypeChoices: w.fusionTypeChoices, fusionHistory: w.fusionHistory, energyLog: w.energyLog, messageLog: w.messageLog, run3LavapetitSeen: w.run3LavapetitSeen, run3LavapetitCaught: w.run3LavapetitCaught, mimimoyReturned: w.mimimoyReturned, mimimoyAppearances: w.mimimoyAppearances, ballLockRemaining: w.ballLockRemaining, evResetCharges: w.evResetCharges, shinyWish: w.shinyWish, dexWish: w.dexWish, galijahDaily: w.galijahDaily, shinyFrenzy: w.shinyFrenzy, shopSurtax: w.shopSurtax, luxeOutcomeQueue: w.luxeOutcomeQueue, bertieOutcomeQueue: w.bertieOutcomeQueue, forcedEncounter: w.forcedEncounter, fusionLeagueCarry: w.fusionLeagueCarry, curseAbundanceStart: w.curseAbundanceStart, curseFreeItemsTaken: w.curseFreeItemsTaken, curseFreeItemDate: w.curseFreeItemDate, potionBuysToday: w.potionBuysToday, jcEnergyBuysToday: w.jcEnergyBuysToday, casinoCapToday: w.casinoCapToday, fusionLeagueDefeats: w.fusionLeagueDefeats, grotteShopBuys: w.grotteShopBuys, chosenAvatar: w.chosenAvatar, clan: w.clan, clanDaemonUid: w.clanDaemonUid, clanCtGiven: w.clanCtGiven, clanTransGiven: w.clanTransGiven, clanVisitDate: w.clanVisitDate, clanTrainByClan: w.clanTrainByClan, craftedItems: w.craftedItems, craftsUsed: w.craftsUsed, craftReady: w.craftReady, megaInLigue: w.megaInLigue, fusionLeagueTryDate: w.fusionLeagueTryDate, fusionChampionRoster: w.fusionChampionRoster, fusionChampionAvatar: w.fusionChampionAvatar, domeChampionships: w.domeChampionships, customDaemons })
    syncSealsToWorld() // ⛓️ sceaux du COMPTE → ce monde (bascule, sortie de bulle, abandon, fusion) : un monde stashé n'en garde pas de périmé
    // POKÉDEX : PAS hydraté ici — il est GLOBAL/cumulatif (persiste d'un run à l'autre) → hydraté UNE SEULE FOIS
    // au chargement (applyServerSave, union de tous les mondes) et jamais réinitialisé par une bascule de monde.
}

/** Hydrate les stores depuis une save serveur (multi-mondes). Réutilisé au chargement ET quand le serveur
 *  REFUSE un écrasement destructif (409) → on resynchronise sur la vraie save au lieu de l'écraser.
 *  Choisit le monde ACTIF (live/ngplus), stashe l'INACTIF, et rend le tout sérialisable sans perte. */
export function applyServerSave(save: YellowSave): void {
    // Monde actif = drapeau serveur, DÉGRADÉ en "live" si le monde cible est absent/corrompu (anti-écran noir).
    // REJEU : "replay" seulement si la bulle existe (sinon dégradé "live" → jamais d'écran noir mid-rejeu corrompu).
    const aw: "live" | "ngplus" | "run3" | "replay" =
        save.activeWorld === "ngplus" && save.ngplusWorld ? "ngplus"
        : save.activeWorld === "run3" && save.run3World ? "run3"
        : save.activeWorld === "replay" && save.replayWorld ? "replay"
        : "live"
    ngplusOldTeam = save.ngplusOldTeam ?? null
    altProfilesStash = Array.isArray(save.altProfiles) ? save.altProfiles : [] // profils inactifs (opaques) — restaurés tels quels au snapshot
    // Stashe les mondes NON actifs (le slot du monde actif reste null → il vit dans les stores). Pendant un REJEU,
    // les 3 mondes réels sont TOUS stashés (la bulle est active) ; les champs plats = TOUJOURS le run 1 (garde-fou).
    liveStash = aw === "live" ? null : liveWorldOf(save)
    ngplusStash = aw === "ngplus" ? null : (save.ngplusWorld ?? null)
    run3Stash = aw === "run3" ? null : (save.run3World ?? null)
    // REJEU : restaure le contexte (quel run rejoué / où revenir), sinon efface tout contexte de rejeu.
    if (aw === "replay") setReplayContext(save.replayRun ?? "run1", save.replayReturn ?? "live")
    else clearReplayContext()
    const activeData = aw === "ngplus" ? save.ngplusWorld! : aw === "run3" ? save.run3World! : aw === "replay" ? save.replayWorld! : liveWorldOf(save)
    // RATTRAPAGE CROSS-RUN : les objets-clés « à vie » (lampe/canne) gagnés dans un AUTRE monde mais perdus à la
    //   transition (saves antérieures au report cross-run) → re-déposés dans le monde ACTIF à CHAQUE chargement.
    //   Additif/idempotent, et re-persisté au prochain save → répare rétroactivement (ex. Zyran passé en run 3 sans lampe).
    const crossRunWorlds = [liveWorldOf(save), save.ngplusWorld, save.run3World, save.replayWorld]
        .filter((w): w is YellowSave => !!w).map((w) => w.items ?? {})
    activeData.items = reconcileCrossRunItems(activeData.items ?? {}, crossRunWorlds)
    // CORRECTIF run 2 : les Fusio-Balls du kit de départ fun (inutiles hors fusion) → Nexus-Balls, au chargement du
    //   monde ngplus (un patch serveur serait clobberé par l'autosave client). Idempotent, re-persisté au prochain save.
    if (aw === "ngplus") activeData.items = fixNgplusFusioBalls(activeData.items ?? {})
    // PALIER PLATINE : quiconque a déjà bouclé l'OR voit la porte du trône s'ouvrir, sans refaire la Ligue.
    activeData.defeatedTrainers = openPlatineIfOrCleared(activeData.defeatedTrainers ?? [])
    // 🧞 COLPORTEUR déjà rencontré sur le compte : le drapeau vaut pour TOUS les mondes (stashes compris → une bascule ne le perd
    //   pas), et un monde ou un profil sans lampe la reçoit (sans elle, impossible de trancher un futur tour de vœux).
    const arcSeen = genieArcSeenOfSave(save)
    if (arcSeen) {
        if (liveStash) liveStash = { ...liveStash, genieArcSeen: true }
        if (ngplusStash) ngplusStash = { ...ngplusStash, genieArcSeen: true }
        if (run3Stash) run3Stash = { ...run3Stash, genieArcSeen: true }
        if (!((activeData.items ?? {})[LAMP_ITEM_ID] > 0)) activeData.items = { ...(activeData.items ?? {}), [LAMP_ITEM_ID]: 1 }
    }
    // Run 3 (et son rejeu) : plafond d'énergie FIXE (paliers d'arène) → la reprise du badge ANCRE n'y ajoute pas de plafond.
    hydrateFromWorld(activeData, save.customDaemons, aw === "run3" || (aw === "replay" && save.replayRun === "run3"), save.thief ?? null) // customDaemons + thief GLOBAUX (haut niveau)
    setGeniePaid(geniePaidOfSave(save)) // 🧞 vœux payés : GLOBAL, depuis la save seule (jamais la mémoire : un 409 ne doit rien « payer » de fantôme)
    setNemesisSeals(nemesisSealsOfSave(save)) // ⛓️ sceaux du défi némésis : GLOBAL au compte, appliqués au monde actif
    if (arcSeen) markGenieArcSeen() // 🧞 colporteur déjà rencontré sur le compte → l'embuscade ne se rejoue nulle part
    // POKÉDEX GLOBAL/cumulatif : UNION des pokédex de TOUS les mondes (dont la bulle) → aucune capture perdue.
    const pdxWorlds = [liveWorldOf(save), save.ngplusWorld, save.run3World, save.replayWorld].filter((w): w is YellowSave => !!w)
    // RÉCONCILIATION Pokédex ← Daemons POSSÉDÉS : un Daemon DONNÉ (starter, échange) ne passe pas par la capture
    //   sauvage → il n'entrait JAMAIS dans caught[] (bug historique : Gavillus starter run 2 possédé mais absent du dex).
    //   On ré-dérive donc le dex depuis team+pc de TOUS les mondes, borné aux VRAIES espèces numérotées : getSpecies
    //   résout les alias canon (custom canonisé → espèce réelle) et SPECIES[] exclut custom/fusions/Ukognofy → n'enfle
    //   PAS le compteur Galijah (150 espèces). Purement ADDITIF (union, jamais de retrait) → rétroactif + save-safe.
    const ownedCanon = [...new Set(
        pdxWorlds.flatMap((w) => [...(w.team ?? []), ...(w.pc ?? [])])
            .map((m) => getSpecies(m.speciesId)?.id)
            .filter((id): id is string => !!id && !!SPECIES[id]),
    )]
    // STARTERS ÉVOLUÉS (rétroactif) : un starter run 2/run 3 est un Daemon DONNÉ jamais capturé ; une fois évolué,
    //   sa BASE n'est plus « possédée » (ownedCanon ne voit que la forme évoluée) → elle manquait au dex (ex. elefer
    //   starter run 3 devenu barrisfer : elefer absent). On ré-injecte les bases starter MÉMORISÉES (précis, jamais
    //   du wild évolué → pas de faux positif). Additif + rétroactif → répare les saves existantes.
    const starterBases = pdxWorlds
        .flatMap((w) => [w.run3StarterBase, w.ngplusStarterBase])
        .map((id) => (id ? getSpecies(id)?.id : undefined))
        .filter((id): id is string => !!id && !!SPECIES[id])
    // LOCALISATION « premium » (additif) : UNION des zones croisées + 1re capture LA PLUS ANCIENNE, sur tous les mondes.
    const mergedSeenAt: Record<string, string[]> = {}
    for (const w of pdxWorlds) {
        const sa = w.pokedex?.seenAt
        if (!sa) continue
        for (const [id, zones] of Object.entries(sa)) {
            const set = new Set(mergedSeenAt[id] ?? [])
            for (const z of zones) if (z) set.add(z)
            mergedSeenAt[id] = [...set]
        }
    }
    const mergedFirstCatch: Record<string, { mapId: string; at: string }> = {}
    const considerFirst = (id: string | undefined, mapId: string | undefined, at: string | undefined) => {
        if (!id || !mapId) return
        const atv = at ?? ""
        const cur = mergedFirstCatch[id]
        // garde la date la PLUS ANCIENNE (YYYY-MM-DD comparable ; "" = inconnue → ne remplace jamais une vraie date).
        if (!cur) mergedFirstCatch[id] = { mapId, at: atv }
        else if (atv && (!cur.at || atv < cur.at)) mergedFirstCatch[id] = { mapId, at: atv }
    }
    for (const w of pdxWorlds) { const fc = w.pokedex?.firstCatch; if (fc) for (const [id, e] of Object.entries(fc)) considerFirst(id, e?.mapId, e?.at) }
    // RÉTRO-REMPLISSAGE (saves d'avant la feature) : dérive la 1re capture depuis les Daemons POSSÉDÉS (capturedMapId/at).
    for (const w of pdxWorlds) for (const m of [...(w.team ?? []), ...(w.pc ?? [])]) considerFirst(getSpecies(m.speciesId)?.id, m.capturedMapId, m.capturedAt)
    hydratePokedex({
        seen: [...new Set([...pdxWorlds.flatMap((w) => w.pokedex?.seen ?? []), ...ownedCanon, ...starterBases])],
        caught: [...new Set([...pdxWorlds.flatMap((w) => w.pokedex?.caught ?? []), ...ownedCanon, ...starterBases])],
        seenAt: mergedSeenAt,
        firstCatch: mergedFirstCatch,
    })
    // BAIES : le secret des baies est GLOBAL (connaissance acquise « une fois pour toutes ») → OR sur tous les
    // mondes. Appris en run 1/2 → reste connu en run 2/3. snapshot() le réécrit ensuite dans tous les mondes.
    if (pdxWorlds.some((w) => w.berrySecretKnown)) setBerrySecretKnown()
    if (pdxWorlds.some((w) => w.collectionneurDexGiven)) setCollectionneurDexGiven()
    setBadgeRepsClaimed(pdxWorlds.flatMap((w) => w.badgeRepsClaimed ?? [])) // HAUTS FAITS : union globale des trophées déjà payés (jamais re-payés)
    // L'ARCHIVISTE — MIGRATION (one-time) : si le monde ACTIF n'a pas encore de LIGNES (ancien save), on les SEED
    //   depuis tout ce qui a déjà été vu/possédé (seen∪owned) → aucune perte de progression. Idempotent (no-op si déjà rempli).
    seedSeenThisRun([...new Set([...getPokedex().seen, ...ownedCanon])])
    setActiveWorld(aw)
    reregisterCustomDaemons() // Phase 2 : rend les Daemons custom résolvables en combat (getSpecies) dès le chargement
}

/** Accès (lecture) pour les fonctions NG+ / run 3. */
export function getInactiveWorld(): YellowSave | null { return ngplusStash }
export function getNgplusOldTeam(): ChampionMon[] | null { return ngplusOldTeam }
/** Un monde NG+ (run 2) existe-t-il (actif ou stashé) ? → pilote l'affichage « bascule / reprendre » du menu. */
export function hasNgPlusWorld(): boolean { return getActiveWorld() === "ngplus" || ngplusStash !== null }
/** Un monde RUN 3 existe-t-il (actif ou stashé) ? */
export function hasRun3World(): boolean { return getActiveWorld() === "run3" || run3Stash !== null }

/** CADEAU d'énergie (vœu génie / admin) : ne se crédite QU'EN live/ngplus. run3 = énergie source-unique (interdit) ;
 *  replay = bulle jetable (gaspillage). Ailleurs on laisse le cadeau EN ATTENTE côté serveur (pas de consommation).
 *  Pur → testable. */
export function shouldCreditEnergyGrant(pending: number | undefined, activeWorld: string): boolean {
    return (pending ?? 0) > 0 && (activeWorld === "live" || activeWorld === "ngplus")
}

// ═══════ 🍝 LE PETIT MOT DU DIEU SPAGHETTI (accompagne un cadeau d'énergie) ═══════
// Rempli au chargement depuis le ctx serveur, AFFICHÉ par le client tout à la fin de sa séquence de démarrage (pour
// ne couper la parole à personne). On garde le texte BRUT en plus des répliques : c'est lui qu'on renvoie au serveur
// pour le compare-and-swap, jamais la version découpée/nettoyée — sinon le CAS ne matcherait plus et le mot
// ressortirait à chaque chargement.
let pendingGiftNote: { raw: string; lines: string[] } = { raw: "", lines: [] }

/** Le mot en attente d'affichage (sans le consommer — le client décide s'il peut parler maintenant). */
export function peekEnergyGiftNote(): { raw: string; lines: string[] } { return pendingGiftNote }

/** Oublie le mot en mémoire (après affichage). N'enlève RIEN côté serveur : cf. consumeEnergyGiftNoteOnServer. */
export function clearEnergyGiftNote(): void { pendingGiftNote = { raw: "", lines: [] } }

/** Acquitte le mot côté serveur — à n'appeler QU'APRÈS l'avoir réellement mis à l'écran. Échec réseau → le mot reste
 *  en attente et revient au prochain chargement : un cadeau ne se perd pas. */
export async function consumeEnergyGiftNoteOnServer(raw: string): Promise<void> {
    if (!raw) return
    try {
        await fetch("/api/gamebook/yellow/energy-grant", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: raw }),
        })
    } catch { /* ratée : mot NON effacé → re-proposé au prochain chargement */ }
}

/** 🥇 « 1er du groupe » : revendique (idempotent, fire-and-forget) les FAITS phares accomplis dans le monde ACTIF.
 *  Le serveur ne grave que le PREMIER joueur (featId @unique). Se relance à chaque chargement, sans effet si déjà
 *  revendiqué. Non bloquant : les erreurs réseau sont ignorées (réessai au prochain chargement). */
async function claimFirstFeats(): Promise<void> {
    const p = getPlayer()
    const dt = p.defeatedTrainers ?? []
    const feats: string[] = []
    if (p.isChampion) feats.push("champion")
    if (dt.includes("fusleague_bronze") || dt.includes("fusleague_argent") || dt.includes("fusleague_or")) feats.push("fusion_champion")
    if (dt.includes("ukognofy_caught")) feats.push("catch_ukognofy")
    if (dt.includes("dome_master_ct")) feats.push("dome_master")   // 1er à décrocher la CT du Maître au Dôme
    if (dt.includes("tour_master_ct")) feats.push("tour_master")   // …à la Tour
    if (dt.includes("usine_master_ct")) feats.push("usine_master") // …à l'Usine
    for (const featId of feats) {
        try {
            await fetch("/api/gamebook/yellow/feat-first", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featId }),
            })
        } catch { /* neutre : réessai au prochain chargement */ }
    }
}

/** Charge la sauvegarde serveur → hydrate les stores. À appeler au mount. */
let loadInFlight: Promise<void> | null = null
/** Chargement initial. Deux appels CONCURRENTS (ex. rechargement en Ligue de Fusion : deux effets de montage) partagent la MÊME
 *  promesse — avant le 28/10/2026, le 2e passait la garde `loaded` (posée seulement après le GET) et créditait une 2e fois le
 *  cadeau d'énergie et les effets en attente. */
export function loadYellowSave(): Promise<void> {
    if (loadInFlight) return loadInFlight
    if (loaded) return Promise.resolve()
    loadInFlight = loadYellowSaveOnce().finally(() => { loadInFlight = null })
    return loadInFlight
}
async function loadYellowSaveOnce(): Promise<void> {
    if (loaded) return // idempotent : déjà chargé (ex. on arrive sur la page Pokédex en nav interne) → on garde l'état mémoire À JOUR au lieu de réécraser avec la DB (qui peut être en retard du débounce).
    try {
        const r = await fetch("/api/gamebook/yellow/save")
        if (!r.ok) { loaded = true; return }
        const j = await r.json()
        const save = parseSave(j?.save)
        applyServerSave(save)
        claimWelcomeGift() // cadeau de bienvenue : +100 énergie, une seule fois (à l'arrivée)
        claimSpagGift()    // cadeau du DIEU SPAG : +150 énergie, une seule fois (message toasté côté UI)
    } catch {
        /* hors-ligne : on garde l'état mémoire */
    } finally {
        loaded = true
    }
    // Stats d'effort du jour + portefeuille reps (crédités) — best-effort, non bloquant.
    try {
        const r = await fetch("/api/gamebook/yellow/player-stats")
        if (r.ok) {
            const j = await r.json()
            if (j?.ctx) setWildCtx(j.ctx)
            if (typeof j?.today === "string") creditDailyReps(j.today) // tick quotidien (resets)
            // Reps INSTANTANÉES : banque le delta (aujourd'hui en direct + jours non joués).
            if (typeof j?.repsTotalToDate === "number" && typeof j?.repsThroughYesterday === "number") {
                bankReps(j.repsTotalToDate, j.repsThroughYesterday, typeof j?.today === "string" ? j.today : undefined)
            }
            // CADEAU D'ÉNERGIE EN ATTENTE (vœu génie / admin) — canal serveur→client anti-écrasement : le montant vit
            //   dans FrontierProfile (hors save → jamais clobberé). ORDRE ANTI-PERTE : on (1) crédite en mémoire, (2)
            //   PERSISTE et n'avance QUE si la persistance est confirmée, (3) consomme le cadeau côté serveur EN DERNIER.
            //   Ainsi le crédit est déjà sauvé avant la consommation → même si la réponse de consommation se perd, aucune
            //   perte. Si la persistance échoue, on RESTAURE l'état reps+cap (restoreRepsState) et on NE consomme PAS → le cadeau
            //   reste en attente serveur, re-crédité au prochain chargement. Uniquement en LIVE/NG+ (run3 = source
            //   unique ; replay = bulle jetable).
            const grantAmt = Math.max(0, Math.floor(j?.ctx?.energyGrantPending ?? 0))
            // 🧞 EMPREINTES « EN VOL » : seules comptent celles des cadeaux ENCORE proposés par le serveur. Les autres ont été
            //   acquittés (ou consommés par un autre onglet) : les garder avalerait un futur cadeau identique (28/10/2026).
            {
                const pendingFx = typeof j?.ctx?.pendingEffects === "string" ? j.ctx.pendingEffects : ""
                pruneGenieInFlight([...(pendingFx ? [genieExtMarker(pendingFx)] : []), ...(grantAmt > 0 ? [genieGrantMarker(grantAmt)] : [])])
            }
            // 🍝 LE PETIT MOT qui accompagne le don. Mis en file ICI, affiché par le client en fin de démarrage.
            //   INDÉPENDANT du montant, volontairement : si un don a déjà été crédité par un build antérieur (montant
            //   retombé à 0), le mot est toujours là et sortira quand même. Un monde run3/replay ne l'efface pas non
            //   plus — le client ne l'acquitte qu'après l'avoir affiché, donc il attendra le retour en live.
            { const raw = typeof j?.ctx?.energyGrantNote === "string" ? j.ctx.energyGrantNote : ""
              pendingGiftNote = { raw, lines: giftNoteLines(raw) } }
            // 🧞 EFFETS MACHINE EN ATTENTE (canal générique : un cadeau de vœu SANS slot de vœu, ex. Jacanon). Même
            //   ordre anti-perte que le don d'énergie : on APPLIQUE, on PERSISTE, puis seulement on ACQUITTE (CAS sur
            //   le texte exact). Un effet inconnu du build → rien d'appliqué, non acquitté → retenté après déploiement. Un lot
            //   déjà appliqué (empreinte au registre des vœux payés) est seulement ré-acquitté, jamais reversé (28/10/2026).
            //   Jamais en run 3 (énergie source unique, fenêtre de shiny hors sujet).
            {
                const rawFx = typeof j?.ctx?.pendingEffects === "string" ? j.ctx.pendingEffects : ""
                // Seulement dans un VRAI monde (run 1 / run 2) : appliqués dans une bulle de rejeu, ils seraient acquittés
                //   puis PERDUS avec la bulle (seuls les Daemons choisis en reviennent). En run 3 / rejeu → ils attendent.
                //   Run 2 encore abandonnable (premiers combats) : ils attendent aussi — appliqués puis jetés avec le monde, ils
                //   seraient acquittés et perdus (28/10/2026).
                if (rawFx && !canAbandonNgplus() && (getActiveWorld() === "live" || getActiveWorld() === "ngplus") && applyExternalEffects(rawFx)) {
                    const savedFx = await persistNow()
                    if (savedFx) {
                        try {
                            const ack = await fetch("/api/gamebook/yellow/energy-grant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ effects: rawFx }) })
                            // ACQUITTÉ : l'empreinte n'a plus d'objet → un futur lot au texte identique sera versé normalement.
                            const aj = ack.ok ? await ack.json().catch(() => null) : null
                            if (aj?.effectsConsumed) { removeGeniePaid(genieExtMarker(rawFx)); await persistNow() }
                        } catch { /* non acquitté → ré-acquitté au prochain chargement, sans être réappliqué (registre) */ }
                    }
                }
            }
            if (shouldCreditEnergyGrant(grantAmt, getActiveWorld()) && !canAbandonNgplus()) { // run 2 encore abandonnable : le cadeau attend (sinon perdu avec le monde)
                const gMark = genieGrantMarker(grantAmt)
                // Consommation en DERNIER (CAS sur le montant côté serveur → n'efface pas un cadeau plus récent). Acquitté →
                //   l'empreinte n'a plus d'objet (retrait persisté tout de suite) ; acquittement perdu → elle reste, et le
                //   chargement suivant ré-acquitte SANS recréditer (avant le 28/10/2026 : crédité une 2e fois).
                const ackGrant = async (amount: number): Promise<void> => {
                    try {
                        const ack = await fetch("/api/gamebook/yellow/energy-grant", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ amount }),
                        })
                        const aj = ack.ok ? await ack.json().catch(() => null) : null
                        if (aj?.consumed) { removeGeniePaid(gMark); await persistNow() }
                    } catch { /* acquittement perdu : ré-acquitté au prochain chargement, sans recrédit */ }
                }
                if (isGeniePaid(gMark)) {
                    await ackGrant(grantAmt) // DÉJÀ CRÉDITÉ (acquittement perdu, ou 2e onglet sur une save déjà créditée)
                } else {
                    const pBefore = getPlayer()
                    const prevReps = pBefore.reps, prevCap = pBefore.repsCap // capturé AVANT crédit → rollback exact (reps+cap)
                    const credited = creditReps(grantAmt) // live/ngplus garanti → renvoie grantAmt
                    if (credited > 0) {
                        logEnergyIncome("✨ Cadeau d'énergie", credited) // JOURNAL : vœu du génie / synergie / admin (persisté avec le crédit)
                        addGeniePaid(gMark) // empreinte persistée AVEC le crédit
                        const saved = await persistNow() // persistance CONFIRMÉE avant toute consommation
                        if (saved) {
                            await ackGrant(credited)
                        } else {
                            restoreRepsState(prevReps, prevCap) // persistance ratée → rollback EXACT (reps + cap) pour ne pas figer un crédit non consommé
                            removeGeniePaid(gMark)
                        }
                    }
                }
            }
        }
    } catch { /* neutre si indisponible */ }
    // Convertit d'éventuels niveaux Saiyan en attente (gagnés hors-ligne au combat précédent).
    await processSaiyanPoints()
    // Persiste l'état chargé — surtout les cadeaux one-shot crédités ci-dessus (welcomeGift/spagGift)
    // → le flag est sauvé même si le joueur ne fait rien d'autre ensuite (anti double-don).
    persistYellowSave()
    void claimFirstFeats() // 🥇 « 1er du groupe » : revendique les faits phares accomplis (idempotent, non bloquant)
}

/** Sérialise le MONDE ACTIF (celui des stores) en YellowSave « nue » (méta NG+ aux défauts). */
function activeWorldSave(): YellowSave {
    const p = getPlayer()
    const d = getPokedex()
    return { version: SAVE_VERSION, team: p.team, pc: p.pc, items: p.items, reps: p.reps, repsCap: p.repsCap, creditedThrough: p.creditedThrough, pastaBoughtToday: p.pastaBoughtToday, casinoSpentToday: p.casinoSpentToday, pastaDayBonus: p.pastaDayBonus, domeChampionships: p.domeChampionships, pokedex: { seen: d.seen, caught: d.caught, seenAt: d.seenAt, firstCatch: d.firstCatch }, defeatedTrainers: p.defeatedTrainers, rematchedTrainers: p.rematchedTrainers, badges: p.badges, introSeen: p.introSeen, sbireDefeatsToday: p.sbireDefeatsToday, champBattlesToday: p.champBattlesToday ?? 0, consultsToday: p.consultsToday ?? 0, archivisteMatchesToday: p.archivisteMatchesToday ?? 0, archivisteWinsToday: p.archivisteWinsToday ?? 0, badgeRepsClaimed: p.badgeRepsClaimed ?? [], badgeRepsToday: p.badgeRepsToday ?? 0, comparisonConsultsToday: p.comparisonConsultsToday ?? 0, sageSaiyanPointsToday: p.sageSaiyanPointsToday ?? 0, ananasLastBadgeCount: p.ananasLastBadgeCount ?? 0, ananasDate: p.ananasDate ?? "", ananasPeakLevel: p.ananasPeakLevel ?? 0, capturesToday: p.capturesToday ?? 0, sbireWinsTotal: p.sbireWinsTotal, pvpStats: p.pvpStats, domeStats: p.domeStats, towerStats: p.towerStats, factoryStats: p.factoryStats, domeTierRecord: p.domeTierRecord ?? {}, stats: p.stats, acePeakLevel: p.acePeakLevel, aceBox: p.aceBox, aceTeamSizePeak: p.aceTeamSizePeak, aceWins: p.aceWins, aceDefeatedDate: p.aceDefeatedDate, duelWins: p.duelWins, ownedCts: p.ownedCts, boughtCts: p.boughtCts, gekrocResolved: p.gekrocResolved, hhSpectresShown: p.hhSpectresShown, hhCollectorWins: p.hhCollectorWins, isChampion: p.isChampion, leagueSixShiny: p.leagueSixShiny, mirrorWinHigherLevel: p.mirrorWinHigherLevel, berrySecretKnown: p.berrySecretKnown, berryHarvestDay: p.berryHarvestDay, berryHarvestPicked: p.berryHarvestPicked, sylvebarbeAwake: p.sylvebarbeAwake, caveTradeDone: p.caveTradeDone, goshHintHeard: p.goshHintHeard, orcalineWins: p.orcalineWins, orcalineDate: p.orcalineDate, chenGiftClaims: p.chenGiftClaims, funDefis: p.funDefis, achTrack: p.achTrack, pnj5Wins: p.pnj5Wins, ngplusBattles: p.ngplusBattles, moveReminderUses: p.moveReminderUses, repsBankedTotal: p.repsBankedTotal, welcomeGift: p.welcomeGift, pokerFirstGameDone: p.pokerFirstGameDone, pokerBossStacks: p.pokerBossStacks, pokerCashCap: p.pokerCashCap, pokerCashDate: p.pokerCashDate, casinoNetToday: p.casinoNetToday ?? 0, casinoNetDate: p.casinoNetDate ?? "", spagGift: p.spagGift, pastaGodGift: p.pastaGodGift, labDefi: p.labDefi, customDaemons: p.customDaemons ?? [], ngplusStartedAt: p.ngplusStartedAt, playtimeMs: p.playtimeMs, leaguePotions: p.leaguePotions, ngplusUsed: p.ngplusUsed, run3Used: p.run3Used, ngplusMaitreBeaten: p.ngplusMaitreBeaten, run3StarterBase: p.run3StarterBase, ngplusStarterBase: p.ngplusStarterBase, genieArcSeen: p.genieArcSeen, geniePaid: p.geniePaid ?? [], genesisMode: p.genesisMode, run3Defeated: p.run3Defeated, run3EnergyByArena: p.run3EnergyByArena, caughtThisRun: p.caughtThisRun, seenThisRun: p.seenThisRun, fichesUnlockedThisRun: p.fichesUnlockedThisRun, collectionneurDexGiven: p.collectionneurDexGiven, fusionRoster: p.fusionRoster, fusionNames: p.fusionNames, fusionMoveOrders: p.fusionMoveOrders, fusionTypeChoices: p.fusionTypeChoices, fusionHistory: p.fusionHistory, energyLog: p.energyLog, messageLog: p.messageLog, run3LavapetitSeen: p.run3LavapetitSeen, run3LavapetitCaught: p.run3LavapetitCaught, mimimoyReturned: p.mimimoyReturned, mimimoyAppearances: p.mimimoyAppearances, ballLockRemaining: p.ballLockRemaining, evResetCharges: p.evResetCharges, shinyWish: p.shinyWish, dexWish: p.dexWish, galijahDaily: p.galijahDaily, shinyFrenzy: p.shinyFrenzy, shopSurtax: p.shopSurtax, luxeOutcomeQueue: p.luxeOutcomeQueue, bertieOutcomeQueue: p.bertieOutcomeQueue, forcedEncounter: p.forcedEncounter, fusionLeagueCarry: p.fusionLeagueCarry, curseAbundanceStart: p.curseAbundanceStart, curseFreeItemsTaken: p.curseFreeItemsTaken, curseFreeItemDate: p.curseFreeItemDate, potionBuysToday: p.potionBuysToday, jcEnergyBuysToday: p.jcEnergyBuysToday, casinoCapToday: p.casinoCapToday, fusionLeagueDefeats: p.fusionLeagueDefeats, grotteShopBuys: p.grotteShopBuys, chosenAvatar: p.chosenAvatar, clan: p.clan, clanDaemonUid: p.clanDaemonUid, clanCtGiven: p.clanCtGiven, clanTransGiven: p.clanTransGiven, clanVisitDate: p.clanVisitDate, clanTrainByClan: p.clanTrainByClan, craftedItems: p.craftedItems, craftsUsed: p.craftsUsed, craftReady: p.craftReady, megaInLigue: p.megaInLigue, fusionLeagueTryDate: p.fusionLeagueTryDate, fusionChampionRoster: p.fusionChampionRoster, fusionChampionAvatar: p.fusionChampionAvatar, thief: p.thief ?? null, activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null, run3World: null, replayWorld: null, replayRun: null, replayReturn: null }
}

/** RÉASSEMBLE les 3 mondes → une save unique. Les champs PLATS = monde LIVE/run 1 (TOUJOURS, garde-fou
 *  anti-wipe). `ngplusWorld` = run 2 imbriqué, `run3World` = run 3 imbriqué. `customDaemons` global partout. */
export function snapshot(): YellowSave {
    const active = activeWorldSave()
    const cds = getPlayer().customDaemons ?? []
    const thiefGlobal = getPlayer().thief ?? null // 🥷 VOLEUR : état GLOBAL au profil → écrit au haut niveau ET dans chaque monde
    const pdx = getPokedex() // POKÉDEX GLOBAL/cumulatif : le MÊME set est écrit dans TOUS les mondes (jamais divergent)
    const berryKnown = getPlayer().berrySecretKnown // BAIES : secret GLOBAL — une fois appris, écrit dans TOUS les mondes
    const givenGlobal = getPlayer().collectionneurDexGiven // L'ARCHIVISTE : dex offert = GLOBAL → répliqué dans tous les mondes
    const claimedGlobal = getPlayer().badgeRepsClaimed ?? [] // HAUTS FAITS : trophées payés = GLOBAL → répliqués partout (jamais re-payés)
    const paidGlobal = getPlayer().geniePaid ?? [] // 🧞 VŒUX PAYÉS : GLOBAL au compte → écrit au haut niveau ET dans chaque monde
    const sealsGlobal = getPlayer().nemesisSeals // ⛓️ SCEAUX : GLOBAL au compte → chaque monde écrit EXACTEMENT ces sceaux
    const withSeals = (dt: string[]): string[] => sealsGlobal ? [...dt.filter((m) => !isNemesisSeal(m)), ...sealsGlobal] : dt
    // ARTISANE : compteur À VIE + forge prête = GLOBAUX → même valeur écrite dans TOUS les mondes (comme customDaemons),
    // sinon le plafond se réinitialiserait à chaque bascule de run. (craftedItems reste PER-MONDE : lié aux uid du run.)
    const craftsUsed = getPlayer().craftsUsed
    const craftReady = getPlayer().craftReady
    const aw = getActiveWorld()
    // Chaque monde : actif = les stores, sinon son stash. Normalisé (méta multi-mondes nettoyée, customDaemons + pokédex + baies globaux).
    const arcGlobal = getPlayer().genieArcSeen === true // 🧞 colporteur rencontré : GLOBAL au compte → recopié dans chaque monde
    const norm = (w: YellowSave | null): YellowSave | null =>
        w ? { ...w, thief: thiefGlobal, geniePaid: [...paidGlobal], nemesisSeals: sealsGlobal ? [...sealsGlobal] : undefined, defeatedTrainers: withSeals(w.defeatedTrainers ?? []), genieArcSeen: (w.genieArcSeen || arcGlobal) ? true : undefined, pokedex: { seen: [...pdx.seen], caught: [...pdx.caught], seenAt: pdx.seenAt, firstCatch: pdx.firstCatch }, berrySecretKnown: w.berrySecretKnown || berryKnown, collectionneurDexGiven: w.collectionneurDexGiven || givenGlobal, badgeRepsClaimed: [...new Set([...(w.badgeRepsClaimed ?? []), ...claimedGlobal])], customDaemons: cds, craftsUsed, craftReady, activeWorld: "live" as const, ngplusWorld: null, ngplusOldTeam: null, run3World: null, replayWorld: null, replayRun: null, replayReturn: null, altProfiles: undefined } : null
    // REJEU : la bulle est ACTIVE (dans les stores) → les 3 mondes réels viennent TOUS de leurs stashes.
    const live = aw === "live" ? active : (liveStash ?? emptySave())
    const ngplus = aw === "ngplus" ? active : ngplusStash
    const run3 = aw === "run3" ? active : run3Stash
    const replay = aw === "replay" ? active : null // la bulle n'existe QUE pendant un rejeu
    const flat = norm(live)! // run 1 = champs plats de haut niveau (garde-fou), TOUJOURS — même pendant un rejeu (= liveStash)
    return { ...flat, customDaemons: cds, geniePaid: [...paidGlobal], nemesisSeals: sealsGlobal ? [...sealsGlobal] : undefined, thief: thiefGlobal, activeWorld: aw, ngplusWorld: norm(ngplus), ngplusOldTeam, run3World: norm(run3), replayWorld: norm(replay), replayRun: getReplayRun(), replayReturn: getReplayReturn(), altProfiles: altProfilesStash.length ? altProfilesStash : undefined }
}

/** Sauvegarde débouncée (ne fait rien tant que la save initiale n'est pas chargée).
 *  Si le serveur REFUSE l'écriture (409 : un autosave vierge allait écraser un compte avancé), on
 *  RESYNCHRONISE les stores sur la vraie save renvoyée → le joueur récupère son compte, rien n'est perdu. */
export function persistYellowSave(): void {
    if (!loaded || suppressAutosave) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        fetch("/api/gamebook/yellow/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot() }),
        }).then(async (r) => {
            if (r.status === 409) {
                try { const j = await r.json(); if (j?.save) applyServerSave(parseSave(j.save)) } catch { /* ignore */ }
                console.warn("[yellow] Écrasement vierge REFUSÉ par le serveur → save réelle rechargée (compte protégé).")
            }
        }).catch(() => { /* silencieux */ })
    }, 800)
}

/** Sauvegarde INTENTIONNELLE immédiate (reset volontaire) : contourne le garde-fou (intentionalReset) et
 *  n'est PAS débouncée → elle passe avant tout autosave concurrent. */
async function persistIntentionalReset(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null }
    try {
        await fetch("/api/gamebook/yellow/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot(), intentionalReset: true }),
        })
    } catch { /* hors-ligne : réessai au prochain autosave */ }
}

/** Sauvegarde IMMÉDIATE (non débouncée) : annule l'autosave en attente et POSTe tout de suite. Utilisée par
 *  les transitions NG+ (démarrage / bascule de monde) pour éviter qu'un autosave concurrent parte AVANT. Le
 *  garde-fou anti-wipe reste actif (les champs plats = monde LIVE inchangés → jamais de fausse régression). */
async function persistNow(): Promise<boolean> {
    if (!loaded) return false
    // 🧞 Monde NEUF (run 2, run 3, rejeu, remise à zéro, profil…) : ses perks de vœux permanents sont posés AVANT d'écrire (tout le
    //   reste est déjà payé → rien ne se repaie). Sans changement, aucun effet. Avant : absents jusqu'au rechargement suivant.
    reapplyGenieWishes()
    if (timer) { clearTimeout(timer); timer = null }
    try {
        const r = await fetch("/api/gamebook/yellow/save", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot() }),
        })
        if (r.status === 409) { try { const j = await r.json(); if (j?.save) applyServerSave(parseSave(j.save)) } catch { /* ignore */ } ; return false }
        return r.ok // true = la save a bien été écrite côté serveur (utilisé par le canal energyGrant pour ne consommer qu'après persistance confirmée)
    } catch { return false /* hors-ligne : réessai au prochain autosave */ }
}

/** Sauvegarde IMMÉDIATE exportée (POST tout de suite, non débouncé). À utiliser pour les événements CRITIQUES
 *  où le débounce de 800 ms de persistYellowSave() perdrait la progression si le joueur quitte l'app juste après
 *  (ex. TITRE remporté au Dôme : domeChampionships++ doit atteindre le serveur immédiatement). */
export async function persistYellowSaveNow(): Promise<void> { await persistNow() }

/**
 * NEW GAME+ — démarre un 2e run : le monde LIVE courant est STASHÉ (intact + rejouable via switchWorld),
 * l'équipe championne est FIGÉE (adversaire de fin de Ligue NG+), et un monde NG+ frais démarre avec le
 * Daemon custom `starter` en équipe + 10000⚡. Réservé aux champions, hors NG+. Retourne false sinon.
 */
export async function startNewGamePlus(starter: MonInstance, oldTeamFrozen: ChampionMon[]): Promise<boolean> {
    if (getActiveWorld() !== "live") return false // déjà en NG+
    if (!getPlayer().isChampion) return false      // réservé aux champions
    if (getPlayer().ngplusUsed) return false       // run 2 DÉJÀ accompli (fusionné) → non rejouable sauf reset du run 1
    // 1) Stash le monde LIVE courant (run 1) → rejouable via switchWorld.
    liveStash = liveWorldOf(activeWorldSave())
    // 2) Fige l'ancienne équipe (adversaire du combat de fin de Ligue NG+).
    ngplusOldTeam = oldTeamFrozen.length ? oldTeamFrozen : null
    // 3) Monde NG+ frais dans les stores (starter custom, isChampion=false, customDaemons préservés).
    startNgPlusWorld(starter)
    // POKÉDEX conservé (cumulatif) : les captures du run 1 restent — on ne réinitialise PLUS le pokédex au NG+.
    setActiveWorld("ngplus")
    // 4) DON de départ du run 2. MODE FUN (choix Sartay) : 1000⚡ (plafond de base 1000) + 10 NEXUS-BALLS pour capturer
    //    (les Fusio-Balls ne prennent QUE les fusions → inutiles pour attraper les Daemons sauvages du run 2). NON-FUN :
    //    NGPLUS_START_ENERGY (10000⚡) + plafond aligné (raiseRepsCap AVANT grantReps → pas de rabotage).
    if (getGameMode() === "fun") {
        grantReps(1000)          // reps → 1000 (repsCap de base = 1000, pas de raise)
        addItem("poke_ball", 10) // 10 Nexus-Ball de départ (capture normale)
    } else {
        raiseRepsCap(NGPLUS_START_ENERGY - 1000) // cap 1000 → 10000
        grantReps(NGPLUS_START_ENERGY)           // reps → 10000
    }
    // NB : la DAEMONFLÛTE n'est PLUS donnée au départ du run 2. Elle se MÉRITE : le Prof. CHEN la remet quand on
    //   redevient Champion (Ligue run 2 finie, isChampion=true) → Sylvebarbe / Zone de Combat gagnés, pas offerts.
    // 5) Flush immédiat (top-level = monde LIVE inchangé → garde-fou OK).
    await persistNow()
    return true
}

/** NG+ — bascule entre le monde LIVE et le monde NG+ (les deux persistés, aucun perdu). false si l'autre
 *  monde n'existe pas ou si on est déjà dessus. */
export async function switchWorld(target: "live" | "ngplus"): Promise<boolean> {
    const cur = getActiveWorld()
    if (target === cur) return false
    if (cur !== "live" && cur !== "ngplus") return false // pas de bascule depuis le run 3 (concours engagé)
    const targetSave = target === "live" ? liveStash : ngplusStash
    if (!targetSave) return false // le monde cible n'existe pas
    const cds = getPlayer().customDaemons ?? []
    // Le monde qu'on QUITTE est stashé (run 3 éventuel reste intact dans run3Stash) ; on dé-stashe la cible.
    if (cur === "live") liveStash = activeWorldSave(); else ngplusStash = activeWorldSave()
    if (target === "live") liveStash = null; else ngplusStash = null
    hydrateFromWorld(targetSave, cds) // customDaemons GLOBAL, préservé
    setActiveWorld(target)
    reregisterCustomDaemons()
    await persistNow()
    return true
}

/** NG+ — fenêtre d'ABANDON : nb de combats max après le lancement du NG+ pour aller rendre le starter à CHEN. */
export const NGPLUS_ABANDON_LIMIT = 15
/** Combats restants avant d'être ENGAGÉ (0 hors NG+). */
export function ngplusBattlesLeft(): number {
    if (getActiveWorld() !== "ngplus") return 0
    return Math.max(0, NGPLUS_ABANDON_LIMIT - getPlayer().ngplusBattles)
}
/** L'abandon du NG+ est-il encore possible (en NG+ ET dans la fenêtre des 15 combats) ? */
export function canAbandonNgplus(): boolean {
    return getActiveWorld() === "ngplus" && getPlayer().ngplusBattles <= NGPLUS_ABANDON_LIMIT
}

/** NG+ — ABANDON (via le Prof. CHEN, ≤ NGPLUS_ABANDON_LIMIT combats) : le monde NG+ est SUPPRIMÉ (starter +
 *  10000⚡ perdus À JAMAIS), la partie de champion est restaurée, et CHEN te remet la FLÛTE (accès Sylvebarbe
 *  → Zone de Combat). Retour au monde unique. false si hors NG+ ou fenêtre dépassée (engagé). */
export async function abandonNewGamePlus(): Promise<boolean> {
    if (!canAbandonNgplus()) return false
    const live = liveStash
    if (!live) return false
    // Le monde NG+ actif est JETÉ (pas stashé) → supprimé. On restaure la partie de champion (run 1).
    liveStash = null
    ngplusStash = null
    ngplusOldTeam = null
    // 🧞 Un VŒU QUI DURE reçu pendant le run 2 (charges, durée) revient au run 1 au lieu de disparaître avec le monde jeté.
    hydrateFromWorld(withDurableWishesFrom(live, activeWorldSave()), live.customDaemons ?? [])
    setActiveWorld("live")
    reregisterCustomDaemons()
    addItem("daemonflute", 1) // récompense CHEN : la flûte (jamais donnée jusque-là) → Sylvebarbe/Zone de Combat
    await persistNow()
    return true
}

const uniq = (arr: string[]): string[] => [...new Set(arr)]
/** Somme deux compteurs {clé→nombre} (fusion des historiques d'usage PvP). */
const mergeCounts = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => {
    const m: Record<string, number> = { ...a }
    for (const [k, v] of Object.entries(b)) m[k] = (m[k] ?? 0) + v
    return m
}

/** FUSION de 2 mondes → un seul. `primary` = monde NG+ (timeline gagnante, garde TOUTE sa progression) ;
 *  `secondary` = monde d'origine (ses Daemons — équipe + PC — sont RÉCUPÉRÉS dans le PC fusionné). Pokédex/
 *  badges/CT en union, objets sommés, plafond d'énergie au max. Résultat = un monde LIVE unique (méta NG+ nettoyée). */
export function mergeWorlds(primary: YellowSave, secondary: YellowSave, tag = "fus"): YellowSave {
    // Récupère TOUS les Daemons du monde d'origine (équipe + PC) dans le PC fusionné. Le préfixe `tag` est DISTINCT
    // par appel (fusion 3-voies = 2 merges) → deux ensembles absorbés n'entrent jamais dans le même espace d'uid.
    const reclaimed: MonInstance[] = [...secondary.team, ...secondary.pc].map((m, i) => ({ ...m, uid: `${tag}${i}-${m.uid}` }))
    const items: Record<string, number> = { ...primary.items }
    for (const [k, v] of Object.entries(secondary.items)) items[k] = (items[k] ?? 0) + v
    // QUÊTE DU CASINO (pilier Tonytony) : le monde fusionné REDEVIENT "live" → son pilier redevient TONYTONY.
    // On restaure donc l'état de la quête Tonytony du monde d'origine (secondary). Le MEROREM gagné en NG+ reste
    // en équipe/PC (fusionné), mais ses flags NG+ (posés sur `tonytonyClaimed`/`tonytonyShiny`, partagés) ne
    // doivent PAS bloquer la quête Tonytony du monde live — sinon un joueur qui a pris Merorem sans jamais
    // prendre Tonytony resterait verrouillé hors de Tonytony à jamais après la fusion.
    const liveCasino = secondary.labDefi ?? primary.labDefi
    const merged: YellowSave = {
        ...primary,
        pc: [...primary.pc, ...reclaimed],
        pokedex: {
            seen: uniq([...primary.pokedex.seen, ...secondary.pokedex.seen]),
            caught: uniq([...primary.pokedex.caught, ...secondary.pokedex.caught]),
        },
        items,
        repsCap: Math.max(primary.repsCap, secondary.repsCap),
        repsBankedTotal: Math.max(primary.repsBankedTotal, secondary.repsBankedTotal),
        domeChampionships: Math.max(primary.domeChampionships, secondary.domeChampionships), // titres du Dôme = GLOBAL (max, ne régresse jamais)
        domeTierRecord: (() => { // bilan par tier = MAX par tier (les malus anti-farm ne régressent pas au changement d'appareil)
            const out: Record<string, { wins: number; losses: number }> = { ...(primary.domeTierRecord ?? {}) }
            for (const [k, v] of Object.entries(secondary.domeTierRecord ?? {})) {
                const cur = out[k] ?? { wins: 0, losses: 0 }
                out[k] = { wins: Math.max(cur.wins, v.wins), losses: Math.max(cur.losses, v.losses) }
            }
            return out
        })(),
        badges: uniq([...primary.badges, ...secondary.badges]),
        ownedCts: uniq([...primary.ownedCts, ...secondary.ownedCts]),
        boughtCts: uniq([...primary.boughtCts, ...secondary.boughtCts]),
        labDefi: { ...primary.labDefi, casinoTotalWon: liveCasino.casinoTotalWon, tonytonyClaimed: liveCasino.tonytonyClaimed, tonytonyShiny: liveCasino.tonytonyShiny,
            // One-shots du labo (cinématiques/cadeaux vus une seule fois) : OR — sinon le monde primary NEUF (run3)
            //   les remettrait à false → cadeaux/cinématiques re-réclamables après la fusion.
            casinoFirstBetDone: primary.labDefi.casinoFirstBetDone || secondary.labDefi.casinoFirstBetDone,
            spagRouletteSeen: primary.labDefi.spagRouletteSeen || secondary.labDefi.spagRouletteSeen,
            spagWelcomeGift: primary.labDefi.spagWelcomeGift || secondary.labDefi.spagWelcomeGift,
            spagStepGiftClaimed: primary.labDefi.spagStepGiftClaimed || secondary.labDefi.spagStepGiftClaimed,
            geneIntroSeen: primary.labDefi.geneIntroSeen || secondary.labDefi.geneIntroSeen,
            squat150Done: primary.labDefi.squat150Done || secondary.labDefi.squat150Done },
        funDefis: primary.funDefis,
        // Réputation PvP + compteurs sbire/duel : per-monde, mais primary (run3) est NEUF → sans fusion la
        //   réputation du run 1 serait effacée. On somme les compteurs / union des historiques.
        pvpStats: {
            wins: primary.pvpStats.wins + secondary.pvpStats.wins,
            losses: primary.pvpStats.losses + secondary.pvpStats.losses,
            forfeits: primary.pvpStats.forfeits + secondary.pvpStats.forfeits,
            daemonUse: mergeCounts(primary.pvpStats.daemonUse, secondary.pvpStats.daemonUse),
            moveUse: mergeCounts(primary.pvpStats.moveUse, secondary.pvpStats.moveUse),
            dmgByDaemon: mergeCounts(primary.pvpStats.dmgByDaemon ?? {}, secondary.pvpStats.dmgByDaemon ?? {}),
        },
        domeStats: { // DÔME UNIQUEMENT : somme des compteurs / union des historiques (comme pvpStats)
            wins: (primary.domeStats?.wins ?? 0) + (secondary.domeStats?.wins ?? 0),
            losses: (primary.domeStats?.losses ?? 0) + (secondary.domeStats?.losses ?? 0),
            daemonUse: mergeCounts(primary.domeStats?.daemonUse ?? {}, secondary.domeStats?.daemonUse ?? {}),
            moveUse: mergeCounts(primary.domeStats?.moveUse ?? {}, secondary.domeStats?.moveUse ?? {}),
        },
        towerStats: { // TOUR : somme des compteurs (comme domeStats)
            wins: (primary.towerStats?.wins ?? 0) + (secondary.towerStats?.wins ?? 0),
            losses: (primary.towerStats?.losses ?? 0) + (secondary.towerStats?.losses ?? 0),
            daemonUse: mergeCounts(primary.towerStats?.daemonUse ?? {}, secondary.towerStats?.daemonUse ?? {}),
            moveUse: mergeCounts(primary.towerStats?.moveUse ?? {}, secondary.towerStats?.moveUse ?? {}),
        },
        factoryStats: { // USINE : somme des compteurs (comme domeStats)
            wins: (primary.factoryStats?.wins ?? 0) + (secondary.factoryStats?.wins ?? 0),
            losses: (primary.factoryStats?.losses ?? 0) + (secondary.factoryStats?.losses ?? 0),
            daemonUse: mergeCounts(primary.factoryStats?.daemonUse ?? {}, secondary.factoryStats?.daemonUse ?? {}),
            moveUse: mergeCounts(primary.factoryStats?.moveUse ?? {}, secondary.factoryStats?.moveUse ?? {}),
        },
        sbireWinsTotal: Math.max(primary.sbireWinsTotal, secondary.sbireWinsTotal),
        duelWins: { ...secondary.duelWins, ...primary.duelWins },
        // BAIES (post-Ligue) : la CONNAISSANCE du secret est monotone → union des 2 timelines (jamais perdue à
        // la fusion, ex. secret appris via l'assistant en run 1). L'état de récolte du JOUR repart à zéro (le
        // monde fusionné redémarre un cycle quotidien neuf).
        berrySecretKnown: primary.berrySecretKnown || secondary.berrySecretKnown,
        // L'ARCHIVISTE : dex offert = GLOBAL monotone → OR des 2 timelines. Les LIGNES vues (per-monde) sont UNIES
        //   pour ne RIEN perdre à la fusion ; les fiches débloquées idem (elles restent consultables).
        collectionneurDexGiven: primary.collectionneurDexGiven || secondary.collectionneurDexGiven,
        seenThisRun: uniq([...(primary.seenThisRun ?? []), ...(secondary.seenThisRun ?? [])]),
        fichesUnlockedThisRun: uniq([...(primary.fichesUnlockedThisRun ?? []), ...(secondary.fichesUnlockedThisRun ?? [])]),
        badgeRepsClaimed: uniq([...(primary.badgeRepsClaimed ?? []), ...(secondary.badgeRepsClaimed ?? [])]), // HAUTS FAITS : payés = union (jamais re-payés)
        geniePaid: uniq([...(primary.geniePaid ?? []), ...(secondary.geniePaid ?? [])]), // 🧞 VŒUX PAYÉS : union (jamais repayés)
        badgeRepsToday: 0, // compteur quotidien → repart à zéro dans le monde fusionné
        berryHarvestDay: "",
        berryHarvestPicked: [],
        // Score/captures « du run » : le run est TERMINÉ → repartent à zéro dans le monde fusionné.
        run3Defeated: [],
        run3EnergyByArena: {},
        caughtThisRun: [],
        fusionRoster: primary.fusionRoster, // les uids du PRIMARY survivent à la fusion (seul secondary est re-tagué) → roster préservé
        // FUSIODEX — historique = journal PERMANENT (speciesId, stables) → UNION dédupliquée des 2 mondes, bornée
        //   aux 200 PLUS RÉCENTES (même politique que recordFusionCreated/parseSave → pas de troncature incohérente).
        fusionHistory: [...secondary.fusionHistory, ...primary.fusionHistory].filter((p, i, arr) => arr.findIndex((q) => q.a === p.a && q.b === p.b) === i).slice(-200),
        // JOURNAL D'ÉNERGIE — simple concat chronologique (secondary puis primary), borné aux plus récentes (pas de dédup : c'est un flux).
        energyLog: [...(secondary.energyLog ?? []), ...(primary.energyLog ?? [])].slice(-ENERGY_LOG_MAX),
        // JOURNAL DES MESSAGES — même politique (concat chronologique borné).
        messageLog: [...(secondary.messageLog ?? []), ...(primary.messageLog ?? [])].slice(-MSG_LOG_MAX),
        run3LavapetitSeen: false,
        run3LavapetitCaught: false,
        // MIMIMOY (roaming live) : la CONNAISSANCE/progression est monotone → préservée depuis la timeline qui la
        // porte (run 1 = secondary), jamais perdue à la fusion.
        mimimoyReturned: primary.mimimoyReturned || secondary.mimimoyReturned,
        mimimoyAppearances: Math.max(primary.mimimoyAppearances, secondary.mimimoyAppearances),
        ballLockRemaining: Math.max(primary.ballLockRemaining, secondary.ballLockRemaining), // vœu génie = contrat LIVE, on garde le verrou le plus élevé
        // 🧞 Pâtes de Luxe / de Bertie : les sacs sont SOMMÉS → les issues garanties des deux mondes aussi (avant, celles du monde
        //   absorbé — dont le shiny parfait promis par un vœu — disparaissaient à la fusion).
        luxeOutcomeQueue: [...(primary.luxeOutcomeQueue ?? []), ...(secondary.luxeOutcomeQueue ?? [])].slice(0, 100),
        bertieOutcomeQueue: [...(primary.bertieOutcomeQueue ?? []), ...(secondary.bertieOutcomeQueue ?? [])].slice(0, 100),
        // FLAGS ONE-TIME MONOTONES : union/OR — sinon ils prennent la valeur (neuve, vide) du monde primary et
        //   RÉSOLVENT ces « uniques » à la fusion : Gékroc réapparaîtrait (duplication d'un unique), Sylvebarbe
        //   re-bloquerait la sortie sud (Zone de Combat re-verrouillée), les dresseurs battus au run 1 mais pas
        //   au run 3 redeviendraient affrontables (re-farm d'énergie/XP), etc.
        gekrocResolved: primary.gekrocResolved || secondary.gekrocResolved,
        sylvebarbeAwake: primary.sylvebarbeAwake || secondary.sylvebarbeAwake,
        goshHintHeard: primary.goshHintHeard || secondary.goshHintHeard,
        // caveTradeDone : sémantique PAR MONDE (run 1 = limaroche→belunode ; run 3 = ruffiant→marmoterre). Après
        //   fusion on est en LIVE → on conserve le statut du troc LIVE = secondary (run 1 dans le merge final).
        caveTradeDone: secondary.caveTradeDone,
        defeatedTrainers: casinoLiftWins(oneCatchMarker(uniq([...primary.defeatedTrainers, ...secondaryMarkersFor(primary, secondary)]))),
        rematchedTrainers: uniq([...primary.rematchedTrainers, ...secondary.rematchedTrainers]),
        hhSpectresShown: uniq([...primary.hhSpectresShown, ...secondary.hhSpectresShown]),
        hhCollectorWins: Math.max(primary.hhCollectorWins, secondary.hhCollectorWins),
        orcalineWins: Math.max(primary.orcalineWins, secondary.orcalineWins),
        chenGiftClaims: Math.max(primary.chenGiftClaims, secondary.chenGiftClaims),
        pnj5Wins: Math.max(primary.pnj5Wins, secondary.pnj5Wins),
        // ACE : cliquet + milestone conservés au plus haut (le Panthéon gagné est déjà dans le PC fusionné ; on
        //   ne perd pas le compteur de victoires ni le pic de niveau/taille).
        aceWins: Math.max(primary.aceWins, secondary.aceWins),
        acePeakLevel: Math.max(primary.acePeakLevel, secondary.acePeakLevel),
        aceTeamSizePeak: Math.max(primary.aceTeamSizePeak, secondary.aceTeamSizePeak),
        aceBox: { ...secondary.aceBox, ...primary.aceBox },
        isChampion: true,
        // BADGES run 1 (succès one-time) : préservés en OR — sinon le monde primary NEUF (run3) les remettrait à false.
        leagueSixShiny: primary.leagueSixShiny || secondary.leagueSixShiny,
        mirrorWinHigherLevel: primary.mirrorWinHigherLevel || secondary.mirrorWinHigherLevel,
        ngplusBattles: 0, // compteur d'engagement sans objet après fusion
        // Métriques de score du run 2 : remises à ZÉRO à la fusion (le monde redevient "live" → plus de run 2 en cours).
        ngplusStartedAt: undefined, playtimeMs: 0, leaguePotions: 0,
        // Collapse en UN seul monde (les 2 sous-mondes disparaissent).
        activeWorld: "live",
        ngplusWorld: null,
        ngplusOldTeam: null,
        run3World: null,
    }
    // 🧞 VŒUX QUI DURENT du monde absorbé (en pause pendant le run 2 / le run 3) : repris s'ils manquent au monde gagnant —
    //   avant, charges EV, dex wish, shiny éphémères, surtaxe, malédiction… disparaissaient à la fusion.
    return withDurableWishesFrom(merged, secondary)
}

/** NG+ — VICTOIRE au combat de fin de Ligue → FUSION COMPLÈTE des 2 mondes en un seul (le NG+ absorbe la
 *  partie d'origine : équipe NG+ conservée, tous les anciens Daemons versés au PC, Pokédex/badges/CT/objets
 *  fusionnés). Backup de l'état pré-fusion (2 mondes) dans history AVANT d'écrire → réversible. */
export async function completeNewGamePlus(): Promise<void> {
    if (getActiveWorld() !== "ngplus") return
    const secondary = liveStash // run 1
    const primary = activeWorldSave() // run 2 (timeline gagnante)
    const merged = secondary
        ? mergeWorlds(primary, secondary)
        : { ...primary, activeWorld: "live" as const, ngplusWorld: null, ngplusOldTeam: null, run3World: null }
    // 1) Applique la fusion côté client (immédiat, l'UI voit le monde fusionné).
    liveStash = null
    ngplusStash = null
    run3Stash = null
    ngplusOldTeam = null
    // suppressAutosave : hydrateFromWorld arme l'autosave débouncé qui pourrait écraser la save PRÉ-fusion avant
    //   le backup. On le désarme pendant l'opération (comme completeRun3).
    suppressAutosave = true
    if (timer) { clearTimeout(timer); timer = null }
    hydrateFromWorld(merged, merged.customDaemons ?? [])
    setActiveWorld("live")
    reregisterCustomDaemons()
    // 2) Backup de l'état PRÉ-fusion (le serveur a encore les 2 mondes) → réversible, façon récup save.
    try { await fetch("/api/gamebook/yellow/save/backup", { method: "POST" }) } catch { /* best-effort */ }
    // 3) Écrit la save fusionnée (flush immédiat).
    await persistNow()
    suppressAutosave = false
}

/**
 * RUN 3 (concours) — démarre le 3e run DEPUIS le run 2 : le monde run 2 courant est STASHÉ (le run 1 l'est déjà),
 * et un monde run 3 frais démarre avec le Daemon custom `starter` en équipe + 500⚡ (offerts par le Dieu
 * Spaghetti). Réservé au Champion du run 2, une seule fois (run3Used). Les 3 mondes coexistent jusqu'à la
 * fusion finale (completeRun3). Retourne false sinon.
 */
export async function startRun3(starter: MonInstance): Promise<boolean> {
    if (getActiveWorld() !== "ngplus") return false // le run 3 se lance depuis le run 2
    if (!getPlayer().isChampion) return false        // il faut avoir (re)battu la Ligue en run 2
    if (getPlayer().run3Used) return false            // run 3 déjà lancé (one-shot)
    // 1) Stash le run 2 courant (le run 1 est déjà dans liveStash).
    ngplusStash = liveWorldOf(activeWorldSave())
    // 🧞 Captures garanties restantes (le seul effet de vœu admis au concours) : elles PASSENT au run 3, comme au nouveau
    //   départ (restartRun3), et quittent le run 2 — sinon la fusion finale les rendrait une 2e fois une fois épuisées au run 3.
    const catchLeft = genieCatchCharges()
    if (catchLeft > 0) ngplusStash = { ...ngplusStash, defeatedTrainers: ngplusStash.defeatedTrainers.filter((m) => !m.startsWith(GENIE_CATCH_PREFIX)) }
    // 2) Monde run 3 frais dans les stores (starter, run3Used=true, customDaemons préservés).
    startRun3World(starter)
    if (catchLeft > 0) setGenieCatchCharges(catchLeft)
    // Baies : le joueur connaît déjà le secret des baies (appris en run 1/2) → récolte dispo dès le run 3.
    // Ressource NON-énergie précieuse dans un run privé de casino/tickets (soin/boost gratuits au combat).
    setBerrySecretKnown()
    // POKÉDEX conservé (cumulatif) : les captures run 1+2 restent — pas de reset au lancement du run 3.
    setActiveWorld("run3")
    run3Stash = null
    // 3) Énergie de départ : 500 (unique source). Le plafond reste 1000 (le max de l'échelle de recharge d'arène) —
    //    raiseRepsCap(0) = no-op, le repsCap de base (1000) suffit puisque les arènes rechargent JUSQU'À 1000 max.
    raiseRepsCap(RUN3_ENERGY_CAP - 1000)  // = raiseRepsCap(0) : cap reste 1000
    grantReps(RUN3_START_ENERGY, true)    // reps → 500 (force : seule source autorisée avec les recharges d'arène)
    // 4) Flush immédiat (les champs plats = run 1 inchangés → garde-fou OK).
    await persistNow()
    return true
}

/** NOUVEAU DÉPART du run 3 (décision Sartay du 26/10/2026, pour Kingme : 63 ⚡, aucun badge → concours perdu d'avance).
 *  Depuis le run 3 ACTIF et SANS badge uniquement : le monde run 3 repart de zéro (nouveau starter, 500 ⚡, sac
 *  cross-run reporté), les runs 1 et 2 gelés et le Pokédex global ne bougent pas. Un run 3 déjà entamé (badge) ne se
 *  recommence pas : ce serait effacer un score. */
export async function restartRun3(starter: MonInstance): Promise<boolean> {
    if (getActiveWorld() !== "run3") return false
    if (getPlayer().badges.length > 0) return false
    const catchLeft = genieCatchCharges() // 🧞 captures garanties (vœu) : le compteur suit le joueur dans son nouveau départ
    startRun3World(starter)
    setBerrySecretKnown()
    if (catchLeft > 0) setGenieCatchCharges(catchLeft)
    grantReps(RUN3_START_ENERGY, true)
    await persistNow()
    return true
}

/** REJEU (« run bis ») — lance un rejeu ISOLÉ du run `run` dans une bulle JETABLE. Le monde réel actif est stashé
 *  et reste INTACT ; on joue un run frais dans les stores (activeWorld="replay"). run2/run3 exigent un `starter`
 *  (Daemon custom) ; run1 démarre sur l'intro. Pokédex GLOBAL conservé. false si déjà en rejeu / starter manquant.
 *  Aucune fusion : sortir du rejeu = exitReplay (jette la bulle, restaure le réel). Ne consomme PAS ngplusUsed/run3Used. */
export async function startReplay(run: "run1" | "run2" | "run3", starter: MonInstance | null = null): Promise<boolean> {
    const cur = getActiveWorld()
    if (cur === "replay") return false // déjà en rejeu
    // run1 : énergie = vrais reps → on REPORTE le pool d'énergie COURANT du joueur dans la bulle (capté AVANT le reset).
    const carryReps = run === "run1" ? getPlayer().reps : 0
    // 1) Stash le monde réel ACTIF dans son slot canonique (les 2 autres réels sont déjà stashés).
    const activeNude = activeWorldSave()
    if (cur === "live") liveStash = liveWorldOf(activeNude)
    else if (cur === "ngplus") ngplusStash = activeNude
    else run3Stash = activeNude
    // 2) Amorce la bulle : run frais dans les stores. run1 = intro ; run2/run3 = starter requis.
    if (!startReplayWorld(run, starter)) {
        // starter manquant → on ANNULE le stash pour ne rien altérer.
        if (cur === "live") liveStash = null
        else if (cur === "ngplus") ngplusStash = null
        else run3Stash = null
        return false
    }
    setReplayContext(run, cur)
    setActiveWorld("replay")
    reregisterCustomDaemons() // rend les Daemons custom résolvables en combat dans la bulle de rejeu (aligne les 6 chemins d'hydratation)
    // 3) Énergie de départ selon le run rejoué (mêmes réglages que les vrais starts ; runMode() applique les règles).
    if (run === "run2") { if (getGameMode() === "fun") { grantReps(1000); addItem("poke_ball", 10) } else { raiseRepsCap(NGPLUS_START_ENERGY - 1000); grantReps(NGPLUS_START_ENERGY) } } // REJEU run 2 = même don que le NG+ initial : fun 1000⚡+10 Nexus-Balls, non-fun 10000⚡
    else if (run === "run3") { raiseRepsCap(RUN3_ENERGY_CAP - 1000); grantReps(RUN3_START_ENERGY, true) }   // run 3 = 500 (source unique)
    else { // run1 : reporte l'énergie réelle (relève le cap au besoin) + cadeaux de bienvenue → jouable dès le départ (sinon 0⚡).
        if (carryReps > 1000) raiseRepsCap(carryReps - 1000)
        claimWelcomeGift(); claimSpagGift() // +100 / +150 (une fois par monde : la bulle est neuve)
        if (carryReps > 0) grantReps(carryReps)
    }
    // 4) Flush immédiat (les champs plats = run 1 réel inchangés → garde-fou anti-wipe OK).
    await persistNow()
    return true
}

/** REJEU — SORT de la bulle : on la JETTE et on restaure le monde réel (`replayReturn`) INTACT depuis son stash.
 *  Les captures faites pendant le rejeu RESTENT (Pokédex global). No-op hors rejeu. */
export async function exitReplay(): Promise<void> {
    if (getActiveWorld() !== "replay") return
    const replayRun = getReplayRun() // AVANT clearReplayContext (qui l'efface)
    const ret = getReplayReturn() ?? "live"
    const stash = ret === "ngplus" ? ngplusStash : ret === "run3" ? run3Stash : liveStash
    let world = stash ?? liveStash ?? emptySave() // défensif : jamais d'écran noir
    // ADDITIF (rejeu RUN 2 UNIQUEMENT) : les Daemons de la bulle (équipe + PC : starter monté + captures) REJOIGNENT
    //   le PC du monde de retour, uid taggés anti-collision. NON-destructif : on n'AJOUTE qu'au PC — rien du monde
    //   réel n'est retiré. Le Pokédex est déjà global (captures conservées). Les rejeux run1/run3 restent JETÉS (isolés).
    if (replayRun === "run2") {
        const bubble = activeWorldSave()
        const add = [...bubble.team, ...bubble.pc].map((m, i) => ({ ...m, uid: `rpl2-${i}-${m.uid}` }))
        if (add.length) world = { ...world, pc: [...world.pc, ...add] }
    }
    clearReplayContext()
    // suppressAutosave : hydrateFromWorld émet et armerait l'autosave débouncé qui pourrait POSTer un état
    //   intermédiaire → on désarme le temps de restaurer + flusher.
    suppressAutosave = true
    if (timer) { clearTimeout(timer); timer = null }
    hydrateFromWorld(world, getPlayer().customDaemons ?? world.customDaemons ?? [], ret === "run3") // retour en run 3 : plafond fixe (reprise du bateau sans bonus)
    reregisterCustomDaemons() // rend les Daemons custom résolvables en combat après restauration (aligne les 6 chemins d'hydratation)
    setActiveWorld(ret)
    // Le monde restauré vit désormais dans les stores → son slot stash redevient null.
    if (ret === "live") liveStash = null
    else if (ret === "ngplus") ngplusStash = null
    else run3Stash = null
    suppressAutosave = false
    await persistNow()
}

// ═══════════════ MULTI-PROFILS ═══════════════
// « Rejouer le RUN 1 » = démarrer un 2ᵉ PROFIL complet et frais qui COEXISTE avec l'ancien (jamais fusionné/supprimé).
// Le profil ACTIF vit dans les stores + les slots de monde ; les autres sont stashés (altProfilesStash), OPAQUES.
/** Plafond de profils INACTIFS (→ 4 profils au total). Borne la taille de la save (chaque profil = un save complet). */
export const MAX_ALT_PROFILES = 3

/** Résumé LÉGER d'un profil (pour le sélecteur — n'expose pas le save complet). */
export interface ProfileSummary { badges: number; isChampion: boolean; ngplusUsed: boolean; run3Used: boolean; dex: number; teamLead: string | null }
function summarize(s: YellowSave): ProfileSummary {
    return { badges: withImpliedAncre(s.badges ?? []).length, isChampion: !!s.isChampion, ngplusUsed: !!s.ngplusUsed, run3Used: !!s.run3Used, dex: s.pokedex?.caught?.length ?? 0, teamLead: s.team?.[0]?.speciesId ?? null }
}
/** Résumés des profils INACTIFS (pour le sélecteur). Vide s'il n'y a qu'un profil. */
export function getAltProfileSummaries(): ProfileSummary[] { return altProfilesStash.map(summarize) }
/** Nombre de profils au total (actif + inactifs). */
export function profileCount(): number { return 1 + altProfilesStash.length }

/** « Rejouer le RUN 1 » — démarre un PROFIL neuf (run 1 depuis l'intro : équipe/PC/Pokédex/customDaemons/progression
 *  À ZÉRO), en STASHANT le profil actif COMPLET dans altProfiles. NON-destructif (rien n'est perdu, tout coexiste).
 *  false si on est dans une bulle de rejeu ou si le plafond de profils est atteint. */
export async function startNewProfileFromRun1(): Promise<boolean> {
    if (getActiveWorld() === "replay") return false
    if (altProfilesStash.length >= MAX_ALT_PROFILES) return false
    const cur = snapshot()                                        // profil actif COMPLET (tous mondes + Pokédex + méta)
    const stashedCurrent: YellowSave = { ...cur, altProfiles: undefined } // un profil stashé ne re-porte pas les autres
    // ⛓️ Le registre des sceaux est celui du COMPTE : le profil neuf part du registre courant (pas de l'union des copies rangées).
    const fresh: YellowSave = { ...emptySave(), nemesisSeals: cur.nemesisSeals, altProfiles: [...(cur.altProfiles ?? []), stashedCurrent] }
    applyServerSave(fresh)                                        // hydrate stores + Pokédex VIDES ; l'actif devient inactif
    await persistNow()
    return true
}

/** MULTI-PROFILS — bascule sur le profil INACTIF `index` (le profil actif courant devient inactif à sa place).
 *  Tout est préservé (aucune fusion, aucune suppression). No-op si index invalide ou en rejeu-bulle. */
export async function switchProfile(index: number): Promise<boolean> {
    if (getActiveWorld() === "replay") return false
    const cur = snapshot()
    const others = cur.altProfiles ?? []
    if (index < 0 || index >= others.length) return false
    const target = parseSave(others[index])                      // re-valide le profil cible avant de l'activer
    const remaining = others.filter((_, i) => i !== index)
    const stashedCurrent: YellowSave = { ...cur, altProfiles: undefined }
    // ⛓️ Sceaux : le registre COURANT du compte suit dans le profil activé (sa copie rangée peut être périmée).
    const activated: YellowSave = { ...target, nemesisSeals: cur.nemesisSeals ?? target.nemesisSeals, altProfiles: [...remaining, stashedCurrent] }
    applyServerSave(activated)
    await persistNow()
    return true
}

/** MODE GENÈSE — démarre un PROFIL neuf « 6 Daemons craftés / zéro capture » : équipe = les créations (niv 5),
 *  customDaemons = leurs specs, genesisMode=true, intro SAUTÉE. Stashe le profil actif (comme startNewProfileFromRun1,
 *  NON-destructif). La Ball est verrouillée jusqu'à la Ligue de Fusion (genesisCaptureLocked) ; la FUSION reste OK. */
export async function startGenesisProfile(team: MonInstance[], customDaemons: StoredCustomDaemon[]): Promise<boolean> {
    if (getActiveWorld() === "replay" || team.length === 0) return false
    if (altProfilesStash.length >= MAX_ALT_PROFILES) return false
    const cur = snapshot()
    const stashedCurrent: YellowSave = { ...cur, altProfiles: undefined }
    const fresh: YellowSave = { ...emptySave(), team, customDaemons, introSeen: true, genesisMode: true, nemesisSeals: cur.nemesisSeals, altProfiles: [...(cur.altProfiles ?? []), stashedCurrent] }
    applyServerSave(fresh)
    reregisterCustomDaemons() // les 6 créations doivent être résolvables en combat (getSpecies) dès le départ
    await persistNow()
    return true
}

/** RUN 3 — FIN (0 énergie) → FUSION 3-VOIES : run 3 ⊕ run 2 ⊕ run 1 en un seul monde live. run 3 = timeline
 *  « gagnante » (garde son équipe active) ; run 2 puis run 1 sont absorbés (Daemons versés au PC, Pokédex/
 *  badges/CT/objets fusionnés). Backup pré-fusion → réversible. */
export async function completeRun3(): Promise<void> {
    if (getActiveWorld() !== "run3") return
    const run3 = activeWorldSave()
    // Fusion successive : run3 ⊕ run2, puis ⊕ run1 (mergeWorlds garde le primary comme timeline active). Tags
    //   d'uid DISTINCTS ("fusR2"/"fusR1") pour les deux mondes absorbés → zéro collision d'uid dans le PC fusionné.
    const step1 = ngplusStash ? mergeWorlds(run3, ngplusStash, "fusR2") : run3
    const mergedRaw = liveStash ? mergeWorlds(step1, liveStash, "fusR1") : step1
    const merged: YellowSave = { ...mergedRaw, activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null, run3World: null, replayWorld: null, replayRun: null, replayReturn: null, ngplusUsed: true, run3Used: true, ngplusMaitreBeaten: false, run3StarterBase: "" }
    liveStash = null
    ngplusStash = null
    run3Stash = null
    ngplusOldTeam = null
    // suppressAutosave : hydrateFromWorld émet et ARMERAIT l'autosave débouncé (800ms) qui pourrait écraser la
    //   save PRÉ-fusion AVANT que le backup ne la capture. On désarme pendant toute l'opération (backup + write).
    suppressAutosave = true
    if (timer) { clearTimeout(timer); timer = null }
    hydrateFromWorld(merged, merged.customDaemons ?? [])
    setActiveWorld("live")
    reregisterCustomDaemons()
    try { await fetch("/api/gamebook/yellow/save/backup", { method: "POST" }) } catch { /* best-effort */ }
    await persistNow()
    suppressAutosave = false
}

/**
 * SAIYAN — convertit les niveaux gagnés (pendingSaiyanLevels) en points de stats
 * selon la règle PushQuest (amende → 0 / quota dépassé chaque jour → 2 / sinon 1),
 * évaluée sur la fenêtre [dernier level-up → hier] de chaque Daemon.
 * Best-effort : si le serveur est injoignable, on laisse le compteur (réessai plus tard).
 */
export async function processSaiyanPoints(): Promise<void> {
    const p = getPlayer()
    const pending = [...p.team, ...p.pc].filter((m) => (m.pendingSaiyanLevels ?? 0) > 0)
    if (pending.length === 0) return
    const since = [...new Set(pending.map((m) => m.lastLevelUpAt).filter((d): d is string => !!d))]

    let windows: Record<string, SaiyanWindow> = {}
    let today = ""
    try {
        const r = await fetch("/api/gamebook/yellow/saiyan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ since }),
        })
        if (r.ok) { const j = await r.json(); windows = j.windows ?? {}; today = j.today ?? "" }
    } catch { /* hors-ligne : on réessaiera */ }
    if (!today) return // pas de date fiable → on garde les compteurs pour plus tard

    const fun = getGameMode() === "fun"
    const results = pending.map((m) => {
        // FUN : jamais de quota reps → fenêtre NEUTRE (ni amende ni quota) → saiyanPointsForLevels rend +1 FIXE/niveau.
        const w: SaiyanWindow = fun
            ? { hadFine: false, quotaDoubled: false }
            : ((m.lastLevelUpAt && windows[m.lastLevelUpAt]) || { hadFine: false, quotaDoubled: false })
        return { uid: m.uid, points: saiyanPointsForLevels(m.pendingSaiyanLevels ?? 0, w) }
    })
    applySaiyanResults(results, today)
    persistYellowSave()
}

/**
 * REMISE À ZÉRO COMPLÈTE du Chapitre 2 pour CE joueur uniquement :
 * vide l'équipe/PC/objets/reps/badges (resetForIntro) ET le Pokédex, puis écrase
 * la sauvegarde serveur. N'affecte que la ligne GamebookProgress "yellow" du joueur.
 */
export async function resetYellowChapter(): Promise<void> {
    // Neutralise l'autosave débouncé AVANT tout emit()/await : les resetForIntro/hydrate/claims ci-dessous
    // émettent → sans ce garde, un timer 800ms POSTerait l'état intermédiaire pendant le fetch player-stats
    // (409 → resync → reset raté silencieusement). On ne réécrit QUE via persistIntentionalReset (intentionnel).
    suppressAutosave = true
    if (timer) { clearTimeout(timer); timer = null }
    try {
        // SÉCURITÉ : on copie d'abord la save courante dans `history` (best-effort) → un reset reste
        // annulable. Si le backup échoue (hors-ligne), on n'empêche PAS le reset volontaire.
        try { await fetch("/api/gamebook/yellow/save/backup", { method: "POST" }) } catch { /* best-effort */ }
        // 🧞 VŒUX : la remise à zéro ne rejoue AUCUN vœu (registre geniePaid conservé par resetForIntro) et n'efface pas ceux
        //   qui durent : état du monde actif, complété par les mondes en pause (hors bulle de rejeu, qui n'en porte pas).
        let durable = getActiveWorld() === "replay" ? emptySave() : activeWorldSave()
        for (const w of [liveStash, ngplusStash, run3Stash]) durable = withDurableWishesFrom(durable, w)
        liveStash = null; ngplusStash = null; run3Stash = null; ngplusOldTeam = null // reset volontaire → efface AUSSI les mondes NG+/run 3
        resetForIntro()
        clearThiefForReset() // 🥷 reset VOLONTAIRE : le Voleur et son larcin repartent à zéro (resetForIntro, lui, conserve l'état)
        restoreDurableWishState(durableWishStateOf(durable)) // 🧞 les vœux qui durent continuent (ni perdus, ni rejoués)
        hydratePokedex({ seen: [], caught: [] })
        // ÉNERGIE « nouvelle partie » : on re-crédite comme un PREMIER chargement (resetForIntro a remis
        // welcomeGift/spagGift à false et repsBankedTotal à -1) → cadeaux de bienvenue + reps du jour.
        claimWelcomeGift() // +100 énergie
        claimSpagGift()    // +150 énergie
        try {
            const r = await fetch("/api/gamebook/yellow/player-stats")
            if (r.ok) {
                const j = await r.json()
                if (j?.ctx) setWildCtx(j.ctx)
                if (typeof j?.today === "string") creditDailyReps(j.today)
                if (typeof j?.repsTotalToDate === "number" && typeof j?.repsThroughYesterday === "number") {
                    bankReps(j.repsTotalToDate, j.repsThroughYesterday, typeof j?.today === "string" ? j.today : undefined) // recrédite les reps du jour
                }
            }
        } catch { /* hors-ligne : au moins les cadeaux de bienvenue sont crédités */ }
        // PARRAINAGE easy/debutant : nouvelle partie → recrédite le remplissage d'énergie de DÉPART (resetForIntro
        // a remis modeFillsUsed à 0). No-op en mode normal.
        ensureModeStartGrant()
        await persistIntentionalReset() // reset VOLONTAIRE → contourne le garde-fou anti-écrasement (le backup a déjà été fait)
    } finally {
        suppressAutosave = false // réarme l'autosave normal pour la nouvelle partie
    }
}

/** Branche l'auto-sauvegarde sur les deux stores (idempotent). */
export function initAutosave(): void {
    if (autosaveInit) return
    autosaveInit = true
    subscribePlayer(persistYellowSave)
    subscribePokedex(persistYellowSave)
}
