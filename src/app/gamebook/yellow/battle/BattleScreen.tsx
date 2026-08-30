"use client"

// Nexus Jaune Éclair — écran de combat (UI minimale, style Game Boy).
// Le moteur résout un tour COMPLET et produit une file d'événements ordonnée
// (messages, variations de PV, K.O., changements…). Cet écran REJOUE cette file
// pas à pas : un message attend un tap ; un changement de PV s'anime (la barre
// descend + le Daemon touché tremble) puis on enchaîne. Ainsi les attaques
// paraissent bien séquentielles (jamais simultanées). Aucune règle recalculée ici.

import { useEffect, useRef, useState } from "react"
import { useBattle, submitPlayerAction, endBattle, getBattleEnergy, setBattleInputHandler, resolveBattleLearn, type BattleInput } from "@/lib/gamebook/yellow/store/battleStore"
import { speciesOf, maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { isDamaging, type BattleMon, type MoveData } from "@/lib/gamebook/yellow/battle/types"
import { moveCategory, resolveAdaptiveStab } from "@/lib/gamebook/yellow/battle/typeChart"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import MoveCompare from "../MoveCompare"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import { ITEMS } from "@/lib/gamebook/yellow/data/items"
import AttackFx from "./AttackFx"
import EncounterTransition from "./EncounterTransition"
import VictoryCelebration from "./VictoryCelebration"
import PvpRecap from "./PvpRecap"
import { pickAttackFx, type AttackFxSpec } from "@/lib/gamebook/yellow/data/attackAnims"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { MISSINGNO_SPRITE } from "@/lib/gamebook/yellow/data/fusionSprite"
import { ChimeraPlaceholder } from "../ChimeraPlaceholder"
import { useFusionSprite } from "../useFusionSprite"
import { usePlayer, getGameMode } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { TYPE_COLORS } from "../dex/dexShared"
import { attackCost, effectiveQuota, playerAttackQuota, STRUGGLE_INDEX } from "@/lib/gamebook/yellow/data/combatCostConfig"

type Menu = "root" | "moves" | "switch" | "bag" | "confirmRun" | "reviveTarget" | "itemTarget"

interface DispHp { p: number; pMax: number; e: number; eMax: number }

/** Dernier message affiché à (ou avant) l'index courant, pour garder le texte
 *  visible pendant qu'un changement de PV s'anime. */
function lastMessageAt(events: readonly { kind: string; text?: string }[], step: number): string {
    for (let i = Math.min(step, events.length - 1); i >= 0; i--) {
        const e = events[i]
        if (e.kind === "message") return e.text ?? ""
    }
    return ""
}

// Nom FR du type, affiché en clair à DROITE de chaque attaque dans le menu (plus lisible que l'emoji).
const TYPE_FR: Record<string, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace", COMBAT: "Combat",
    POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte", ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée",
}

export default function BattleScreen() {
    const battle = useBattle()
    const [step, setStep] = useState(0)
    const [menu, setMenu] = useState<Menu>("root")
    const [reviveItemId, setReviveItemId] = useState<string | null>(null) // RAPPEL : objet en attente d'une cible K.O.
    const [itemTargetId, setItemTargetId] = useState<string | null>(null) // SOIN/ANTI-STATUT : objet en attente d'une cible (actif OU banc)
    const [lastBallId, setLastBallId] = useState("") // dernière Ball lancée → couleur de l'anim (Fusio-Ball = dorée)
    const [disp, setDisp] = useState<DispHp | null>(null)
    // STATUT AFFICHÉ par côté, SYNCHRONISÉ sur le playback (comme `disp` pour les PV) → un statut infligé ce tour
    // n'apparaît qu'au moment où l'event `status` est rejoué (APRÈS l'anim d'attaque), jamais avant. Anti-spoiler.
    const [dispStatus, setDispStatus] = useState<{ p: string; e: string } | null>(null)
    // Index du Daemon AFFICHÉ par côté pendant le playback (suit les switchIn) → on ne
    // montre pas le Daemon suivant avant son annonce / on garde le bon sprite & barre.
    const [dispIdx, setDispIdx] = useState<{ p: number; e: number } | null>(null)
    const [shakeP, setShakeP] = useState(0)
    const [shakeE, setShakeE] = useState(0)
    const [ball, setBall] = useState<{ phase: "throw" | "shake" | "result" | "miss"; shakes: number; caught: boolean } | null>(null)
    const [cursor, setCursor] = useState(0)
    const selRowRef = useRef<HTMLButtonElement | null>(null) // option focalisée → maintenue visible (scroll auto)
    const [atkFx, setAtkFx] = useState<{ spec: AttackFxSpec; side: "player" | "enemy"; key: number } | null>(null)
    const atkKeyRef = useRef(0)
    const lastMoveSlotRef = useRef(0) // #3 : mémorise la dernière attaque choisie (rouvre dessus)
    // #7 — APPRENTISSAGE EN COMBAT : attaques « plus tard » mises en veille pour CE combat (uid:moveId),
    // + tick local pour forcer un re-render après mutation EN PLACE du Daemon (sans nouveau ref battle).
    const learnSnooze = useRef<Set<string>>(new Set())
    const [, setLearnTick] = useState(0)
    // #7 — À CHAQUE NOUVEAU combat : on met en veille les attaques DÉJÀ en attente (débloquées lors d'un combat
    // PRÉCÉDENT, gérées post-combat/fiche) → l'overlay d'apprentissage en combat ne s'ouvre QUE pour une attaque
    // débloquée DANS ce combat. Fini le prompt intempestif à chaque rencontre.
    const hadBattle = useRef(false)
    useEffect(() => {
        if (battle && !hadBattle.current) {
            const s = new Set<string>()
            for (const m of battle.player.team) for (const id of m.pendingMoves ?? []) s.add(`${m.uid}:${id}`)
            learnSnooze.current = s
        }
        hadBattle.current = !!battle
    }, [battle])
    const repsWallet = usePlayer()
    const dex = usePokedex() // statut Pokédex (caught) → indicateur en combat sauvage
    const lastBattle = useRef(battle)
    const inputRef = useRef<(a: BattleInput) => void>(() => { })
    // Anti double-action : on ne résout qu'UNE action par état de combat. Clé sur
    // l'identité de `battle` → auto-réparant (un nouveau tour rend `battle` différent
    // et débloque l'action suivante). Empêche le freeze par double-tap rapide.
    const actedRef = useRef<typeof battle>(null)

    // Initialise les PV affichés au tout début du combat (ils sont ensuite
    // CONSERVÉS d'un tour à l'autre → pas de saut visuel entre les tours).
    useEffect(() => {
        if (battle && disp === null) {
            const p = battle.player.team[battle.player.activeIndex]
            const e = battle.enemy.team[battle.enemy.activeIndex]
            setDisp({ p: p.currentHp, pMax: maxHpOf(p), e: e.currentHp, eMax: maxHpOf(e) })
            setDispStatus({ p: p.status, e: e.status })
            setDispIdx({ p: battle.player.activeIndex, e: battle.enemy.activeIndex })
        }
    }, [battle, disp])

    // Lecture de la file : reset au nouveau tour, sinon traite l'événement courant.
    useEffect(() => {
        if (!battle) return
        // Nouveau tour résolu → on repart au début de la file.
        if (lastBattle.current !== battle) {
            lastBattle.current = battle
            setMenu("root")
            setBall(null)
            // Si step != 0 : on remet à 0 et le re-render traitera events[0].
            // Si step EST déjà 0 : surtout PAS de return (setStep(0) serait un no-op
            // → aucun re-render → file jamais traitée = blocage). On tombe dans le
            // traitement de events[0] ci-dessous.
            if (step !== 0) { setStep(0); return }
        }
        const ev = battle.events[step]
        if (!ev) return                      // file terminée → menu/fin
        if (ev.kind === "message") return    // on attend un tap du joueur

        // Événement non-textuel : on l'applique puis on enchaîne automatiquement.
        let delay = 140
        if (ev.kind === "ball") {
            if (ev.action === "throw") { setBall({ phase: "throw", shakes: 0, caught: false }); delay = 620 }
            else if (ev.action === "shake") { setBall({ phase: "shake", shakes: ev.shakes ?? 0, caught: false }); delay = Math.max(500, (ev.shakes ?? 0) * 460 + 360) }
            else if (ev.action === "miss") { setBall({ phase: "miss", shakes: 0, caught: false }); delay = 950 } // lancer raté : la ball part de travers et sort de l'écran
            else { setBall({ phase: "result", shakes: 0, caught: !!ev.caught }); delay = 850 }
        } else if (ev.kind === "hp") {
            // Déclenche le tremblement AVANT setDisp (jamais de setState imbriqué).
            if (ev.side === "player") { if (ev.hp < (disp?.p ?? Infinity)) setShakeP((k) => k + 1) }
            else { if (ev.hp < (disp?.e ?? Infinity)) setShakeE((k) => k + 1) }
            setDisp((d) => {
                if (!d) return d
                const next = { ...d }
                if (ev.side === "player") { next.p = ev.hp; next.pMax = ev.max }
                else { next.e = ev.hp; next.eMax = ev.max }
                return next
            })
            // La barre met 0,4s à se vider (transition CSS). On attend qu'elle soit
            // terminée avant d'enchaîner (faint/K.O. ou coup suivant) → l'ordre perçu
            // est bien : coup → perte de PV → annonce du K.O. (marge pour bien voir).
            delay = 600
        } else if (ev.kind === "faint") {
            delay = 340
        } else if (ev.kind === "switchIn") {
            // Le Daemon entrant devient l'affiché (sprite + barre) — pas avant.
            const m = battle[ev.side].team[ev.teamIndex]
            setDispIdx((d) => (d ? (ev.side === "player" ? { ...d, p: ev.teamIndex } : { ...d, e: ev.teamIndex }) : d))
            setDisp((d) => {
                if (!d) return d
                if (ev.side === "player") return { ...d, p: m.currentHp, pMax: maxHpOf(m) }
                return { ...d, e: m.currentHp, eMax: maxHpOf(m) }
            })
            setDispStatus((d) => (d ? (ev.side === "player" ? { ...d, p: m.status } : { ...d, e: m.status }) : d)) // le Daemon entrant apporte SON statut
        } else if (ev.kind === "status") {
            // STATUT infligé (poison/sommeil/brûlure/gel/para) : on l'AFFICHE seulement MAINTENANT — le moteur pousse
            //   cet event APRÈS l'anim d'attaque, donc le badge n'apparaît jamais avant le coup. Fin du spoiler.
            setDispStatus((d) => (d ? (ev.side === "player" ? { ...d, p: ev.status } : { ...d, e: ev.status }) : d))
        } else if (ev.kind === "move") {
            // Anim d'attaque (catégorie déduite du moveId) : on LAISSE le temps de la voir
            // avant d'enchaîner sur les dégâts.
            atkKeyRef.current += 1
            setAtkFx({ spec: pickAttackFx(ev.moveId), side: ev.side, key: atkKeyRef.current })
            delay = 360
        }
        const t = setTimeout(() => setStep((s) => s + 1), delay)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [battle, step])

    // Enregistre le pont d'entrée (boutons coque → menu de combat) le temps du combat.
    useEffect(() => {
        setBattleInputHandler((a) => inputRef.current(a))
        return () => setBattleInputHandler(null)
    }, [])
    // Remet le curseur en haut quand on change de menu ou de tour — SAUF le menu d'attaque,
    // qui se rouvre sur la DERNIÈRE attaque utilisée (#3 : moins de re-navigation au combat).
    useEffect(() => {
        if (menu === "moves") {
            const onSlot = options.findIndex((o) => o.moveSlot === lastMoveSlotRef.current && !o.disabled)
            const firstOk = options.findIndex((o) => !o.disabled)
            setCursor(onSlot >= 0 ? onSlot : firstOk >= 0 ? firstOk : 0)
        } else if (menu === "switch" || (playbackDone && needSwitch)) {
            // Listes d'équipe (switch volontaire, switch forcé, ou fenêtre d'envoi adverse) :
            // l'index 0 est souvent grisé (Daemon actif / K.O.) → on démarre sur la 1re option
            // valide pour qu'un appui A réflexe sélectionne un Daemon jouable (cf. menu "moves").
            const firstOk = options.findIndex((o) => !o.disabled)
            setCursor(firstOk >= 0 ? firstOk : 0)
        } else {
            setCursor(0)
        }
        // options dépend de menu/step → on garde ces deps (ajouter `options` relancerait à chaque rendu).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menu, step])
    // Garde l'option sélectionnée VISIBLE dans les listes scrollables (Attaques, Sac…) quand on
    // navigue à la flèche → jamais d'élément sélectionné hors cadre.
    useEffect(() => { selRowRef.current?.scrollIntoView({ block: "nearest" }) }, [cursor, menu, step])

    // Anti-bug "sprite d'un Daemon K.O. qui revient" (combats multi-Daemon, ex. ACE) :
    // dès que le playback d'un tour est terminé, on resynchronise les index AFFICHÉS sur
    // les actifs RÉELS. Sinon un dispIdx périmé (ex. resté sur la panthère tombée) refait
    // surface au début du tour suivant, le temps du playback.
    useEffect(() => {
        if (!battle || step < battle.events.length) return
        setDispIdx((d) => (d && (d.p !== battle.player.activeIndex || d.e !== battle.enemy.activeIndex)
            ? { ...d, p: battle.player.activeIndex, e: battle.enemy.activeIndex } : d))
    }, [battle, step])

    if (!battle) return null

    const events = battle.events
    // ⚠️ Tant que le nouveau tour n'a pas été pris en charge par la file (lastBattle pas
    // encore à jour), `step` est PÉRIMÉ (celui du tour précédent) → on ne doit PAS se fier
    // à playbackDone (sinon la barre lit l'HP FINAL et "saute" le temps d'1 frame). On reste
    // sur `disp` (l'HP animé) jusqu'à ce que la file reparte du bon pied.
    const stepIsStale = lastBattle.current !== battle
    const playbackDone = !stepIsStale && step >= events.length
    const waitingForTap = !playbackDone && events[step]?.kind === "message"
    const shownMsg = lastMessageAt(events, step)

    // Pendant le playback : on affiche le Daemon suivi par dispIdx (suit les switchIn),
    // pas l'index final → le Daemon suivant n'apparaît qu'à son annonce.
    const pIdx = playbackDone ? battle.player.activeIndex : (dispIdx?.p ?? battle.player.activeIndex)
    const eIdx = playbackDone ? battle.enemy.activeIndex : (dispIdx?.e ?? battle.enemy.activeIndex)
    const player = battle.player.team[pIdx]
    const enemy = battle.enemy.team[eIdx]

    const isEnded = battle.phase === "ended"
    // Victoire = combat fini ET il me reste au moins un Daemon debout (mon camp canonique
    // après swap éventuel) → déclenche la célébration (confettis + débrief GOAT/FLOP).
    const playerWon = isEnded && battle.player.team.some((m) => m.currentHp > 0)
    const needSwitch = battle.forcedSwitch === "player"
    // FENÊTRE D'ENVOI ADVERSE (combat de Dresseur — flow Game Boy) : le KO + l'annonce du prochain
    // Daemon adverse ont été joués ; on attend la DÉCISION du joueur (RESTER / CHANGER) avant que
    // l'ennemi n'entre. (Double KO : le changement forcé du joueur prime → pas de fenêtre optionnelle.)
    const awaitSendOut = !!battle.enemySendOut && !needSwitch && !isEnded
    const sendOutMon = battle.enemySendOut ? battle.enemy.team[battle.enemySendOut.teamIndex] : null
    const sendOutName = sendOutMon ? displayName(sendOutMon) : ""
    // #4 — Types annoncés dans le bandeau (en plus des chips de la fiche) pour décider rester/changer.
    const sendOutTypes = sendOutMon ? speciesOf(sendOutMon).types.map((t) => TYPE_FR[t] ?? t).join(" / ") : ""

    // --- handlers ---
    // tryAct : n'exécute l'action que si on n'a pas déjà agi pour CET état de combat
    // (garde anti double-soumission → anti-freeze). Les transitions de menu pures
    // (ATTAQUE→moves, etc.) ne passent PAS par là.
    const tryAct = (fn: () => void) => {
        if (actedRef.current === battle) return
        actedRef.current = battle
        fn()
    }
    const advance = () => { if (waitingForTap) setStep((s) => s + 1) }
    const doMove = (i: number) => tryAct(() => { lastMoveSlotRef.current = i; submitPlayerAction({ kind: "move", moveIndex: i }); setMenu("root") })
    const doStruggle = () => tryAct(() => { submitPlayerAction({ kind: "move", moveIndex: STRUGGLE_INDEX }); setMenu("root") })
    const doSwitch = (i: number) => tryAct(() => { submitPlayerAction({ kind: "switch", teamIndex: i }); setMenu("root") })
    // Fenêtre d'envoi adverse : GARDER son Daemon (l'ennemi annoncé entre ensuite, sans coup offert).
    const doStay = () => tryAct(() => { submitPlayerAction({ kind: "stay" }); setMenu("root") })
    const throwBall = (itemId: string) => tryAct(() => { setLastBallId(itemId); submitPlayerAction({ kind: "ball", itemId }); setMenu("root") })
    const doItem = (itemId: string, targetIndex?: number) => tryAct(() => { submitPlayerAction({ kind: "item", itemId, targetIndex }); setItemTargetId(null); setMenu("root") })
    const doRevive = (itemId: string, targetIndex: number) => tryAct(() => { submitPlayerAction({ kind: "item", itemId, targetIndex }); setReviveItemId(null); setMenu("root") })
    const run = () => tryAct(() => submitPlayerAction({ kind: "run" }))

    // Pendant le playback (animations de coups), on suit `disp` pour animer les barres.
    // Dès que le tour est résolu (playbackDone), on affiche TOUJOURS l'état réel et
    // frais des Daemon → plus jamais de PV/jauge "figés" sur une ancienne valeur.
    const pHp = playbackDone ? player.currentHp : (disp?.p ?? player.currentHp)
    const pMax = playbackDone ? maxHpOf(player) : (disp?.pMax ?? maxHpOf(player))
    const eHp = playbackDone ? enemy.currentHp : (disp?.e ?? enemy.currentHp)
    const eMax = playbackDone ? maxHpOf(enemy) : (disp?.eMax ?? maxHpOf(enemy))
    // STATUT affiché : suit le playback (comme les PV) → un statut n'apparaît qu'à son event `status` (après l'attaque).
    const pStatus = playbackDone ? player.status : (dispStatus?.p ?? player.status)
    const eStatus = playbackDone ? enemy.status : (dispStatus?.e ?? enemy.status)

    // #4 — FENÊTRE D'ENVOI : une fois le playback fini (décision rester/changer), on PRÉVISUALISE
    // le prochain Daemon adverse (sprite + PV pleins + fiche/chips de type) au lieu du K.O. qui
    // vient de tomber. Le Daemon n'entre VRAIMENT (switchIn) qu'après le choix du joueur.
    const sendOutIdx = playbackDone && awaitSendOut && battle.enemySendOut ? battle.enemySendOut.teamIndex : null
    const previewEnemy = sendOutIdx != null ? battle.enemy.team[sendOutIdx] : null
    const showEnemy = previewEnemy ?? enemy
    const showEIdx = sendOutIdx ?? eIdx
    const showEHp = previewEnemy ? previewEnemy.currentHp : eHp
    const showEMax = previewEnemy ? maxHpOf(previewEnemy) : eMax
    const showEStatus = previewEnemy ? previewEnemy.status : eStatus

    // #7 — APPRENTISSAGE EN COMBAT : à la reprise de la main (menu normal, hors PvP), si l'actif a
    // débloqué une attaque ce tour mais a 4 slots pleins, on propose de l'apprendre MAINTENANT
    // (utilisable tout de suite) — sinon « plus tard » (mise en veille → prompt post-combat habituel).
    const learnMoveId = (playbackDone && !isEnded && !needSwitch && !awaitSendOut && !battle.pvp && menu === "root")
        ? (player.pendingMoves ?? []).find((id) => !learnSnooze.current.has(`${player.uid}:${id}`))
        : undefined
    const learnLater = () => { if (learnMoveId) { learnSnooze.current.add(`${player.uid}:${learnMoveId}`); setLearnTick((t) => t + 1) } }
    const learnForget = (slot: number | null) => { if (learnMoveId) { resolveBattleLearn(player.uid, learnMoveId, slot); setLearnTick((t) => t + 1) } }

    // L'ennemi est "aspiré" par la ball (lancer/secousses, et capture réussie).
    const enemyHiddenByBall = !!ball && (ball.phase === "throw" || ball.phase === "shake" || (ball.phase === "result" && ball.caught))

    // Énergie = LE MÊME portefeuille de reps que la jauge GameBoy (affichée SOUS l'écran
    // par la coque). Le cap d'énergie PAR COMBAT est affiché dans le menu Attaque.
    const reps = repsWallet.reps

    // ===== Options du menu courant (liste unifiée pilotable au curseur) =====
    const energy = getBattleEnergy()
    const remainingEnergy = Math.max(0, energy.cap - energy.spent)
    const items = repsWallet.items
    type Opt = { label: React.ReactNode; onSelect: () => void; disabled?: boolean; right?: string; moveSlot?: number; detail?: string }
    const options: Opt[] = []
    let canBack = false
    if (playbackDone && isEnded) {
        options.push({ label: "QUITTER ▶", onSelect: () => endBattle() })
    } else if (playbackDone && needSwitch) {
        battle.player.team.forEach((m, i) => options.push({
            label: `${displayName(m)} N.${m.level} — ${m.currentHp <= 0 ? "K.O." : m.currentHp + "/" + maxHpOf(m) + " PV"}`,
            onSelect: () => doSwitch(i), disabled: m.currentHp <= 0 || i === battle.player.activeIndex,
        }))
    } else if (playbackDone && awaitSendOut) {
        // FENÊTRE D'ENVOI ADVERSE (flow Game Boy). Deux temps : la décision (rester/changer),
        // puis — si « changer » — la liste d'équipe. Le Daemon adverse n'entre qu'APRÈS le choix.
        if (menu === "switch") {
            battle.player.team.forEach((m, i) => options.push({
                label: `${displayName(m)} N.${m.level} — ${m.currentHp <= 0 ? "K.O." : m.currentHp + "/" + maxHpOf(m) + " PV"}`,
                onSelect: () => doSwitch(i), disabled: m.currentHp <= 0 || i === battle.player.activeIndex,
            }))
            options.push({ label: "← RETOUR", onSelect: () => setMenu("root") })
            canBack = true
        } else {
            // « Rester » en premier → curseur dessus par défaut (tap réflexe = rester, sans jamais
            // escamoter la fenêtre de choix).
            options.push({ label: "✋ Rester en jeu", onSelect: () => doStay() })
            options.push({ label: "🔄 Changer de Daemon", onSelect: () => setMenu("switch") })
        }
    } else if (playbackDone) {
        if (menu === "root") {
            options.push({ label: "⚔️ ATTAQUE", onSelect: () => setMenu("moves") })
            // DAEMON juste sous ATTAQUE (action SANS coût) → un appui « bas » réflexe tombe sur du sûr,
            // plus sur le SAC (évite de lancer une Ball payante par mégarde en spammant le bouton).
            options.push({ label: "🐾 DAEMON", onSelect: () => setMenu("switch") })
            // En PvP (v1) : ni SAC ni FUITE. En série Frontier (noItems) : pas de SAC non plus (« pas de potion »).
            if (!battle.pvp && !battle.noItems) options.push({ label: "🎒 SAC", onSelect: () => setMenu("bag") })
            if (!battle.pvp) {
                // FUITE → écran de confirmation (évite la fuite accidentelle).
                options.push({ label: "🏃 FUITE", onSelect: () => setMenu("confirmRun"), disabled: !battle.isWild })
            }
        } else if (menu === "moves") {
            const meHpFrac = player.currentHp / Math.max(1, maxHpOf(player)) // Patience : coût dynamique ∝ PV manquants (miroir EXACT du store)
            // FUN : coût piloté par les BADGES (pas les reps du jour) — miroir EXACT du store (moveCostRepsForAction).
            const costQuota = getGameMode() === "fun" ? playerAttackQuota(repsWallet.badges.length) : effectiveQuota(repsWallet.wildCtx?.quota)
            const costs = player.moves.map((s) => attackCost(getMove(s.moveId), player.level, costQuota, meHpFrac))
            // PvP (user vs user) = énergie ILLIMITÉE pendant le combat : aucune attaque grisée
            // (la déduction de reps est déjà sautée côté store pour le PvP).
            const canUse = (c: number) => battle.pvp || (c <= reps && c <= remainingEnergy)
            // À court d'énergie → Charge Désespérée EN PREMIER (ergonomie : plus en 5e position).
            if (!costs.some(canUse)) options.push({ label: "💥 Charge Désespérée (gratuit)", onSelect: doStruggle, detail: "Charge de secours — n'utilise aucune énergie, mais le lanceur subit un léger contrecoup." })
            player.moves.forEach((slot, i) => {
                const mv = getMove(slot.moveId)
                options.push({
                    label: `${mv?.name ?? slot.moveId}${battle.pvp ? "" : `  ⚡${costs[i]}`}`,
                    onSelect: () => doMove(i), disabled: !canUse(costs[i]), moveSlot: i,
                })
            })
            options.push({ label: "RETOUR", onSelect: () => setMenu("root"), detail: "Revenir au menu de combat sans attaquer." })
            canBack = true
        } else if (menu === "bag") {
            const owned = (id: string) => (items[id] ?? 0) > 0
            // Soins de PV → choisir la cible (actif OU banc). Grisé si AUCUN Daemon vivant n'est blessé.
            Object.values(ITEMS).filter((it) => it.category === "HEAL" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => { setItemTargetId(it.id); setMenu("itemTarget") }, disabled: !battle.player.team.some((m) => m.currentHp > 0 && m.currentHp < maxHpOf(m)) }))
            // Anti-statut → choisir la cible (actif OU banc). Grisé si aucun Daemon vivant n'a de statut.
            Object.values(ITEMS).filter((it) => it.category === "STATUS_HEAL" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => { setItemTargetId(it.id); setMenu("itemTarget") }, disabled: !battle.player.team.some((m) => m.currentHp > 0 && m.status !== "NONE") }))
            // Objets X (boost de stat) → CIBLABLES : choisir l'actif OU un Daemon du banc (le pré-booster avant de
            //   le switcher, il entrera boosté). Grisé seulement si toute l'équipe est K.O. (garde-fou).
            Object.values(ITEMS).filter((it) => it.category === "BOOST" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => { setItemTargetId(it.id); setMenu("itemTarget") }, disabled: !battle.player.team.some((m) => m.currentHp > 0) }))
            // Rappel (revive) → choisir un Daemon K.O. à ranimer (désactivé si aucun K.O. dans l'équipe)
            Object.values(ITEMS).filter((it) => it.category === "REVIVE" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => { setReviveItemId(it.id); setMenu("reviveTarget") }, disabled: !battle.player.team.some((m) => m.currentHp <= 0) }))
            // VŒU DU GÉNIE : Balls verrouillées tant que le quota d'⚡ n'est pas dépensé (grisage ; backstop autoritatif côté store).
            const ballLocked = repsWallet.ballLockRemaining > 0
            if (battle.isWild) Object.values(ITEMS).filter((it) => it.category === "BALL" && owned(it.id))
                .forEach((b) => options.push({ label: `${b.name} ×${items[b.id]}`, onSelect: () => throwBall(b.id), disabled: ballLocked, detail: ballLocked ? `Verrouillé par le génie : dépense encore ${repsWallet.ballLockRemaining}⚡.` : undefined }))
            options.push({ label: "RETOUR", onSelect: () => setMenu("root") })
            canBack = true
        } else if (menu === "confirmRun") {
            // "Annuler" en premier → le curseur démarre dessus (défaut sûr : un
            // appui A réflexe annule la fuite au lieu de la confirmer).
            options.push({ label: "❌ Annuler", onSelect: () => setMenu("root") })
            options.push({ label: "🏃 Confirmer la fuite", onSelect: run })
            canBack = true
        } else if (menu === "reviveTarget") {
            // RAPPEL : choisir un Daemon K.O. à ranimer (les VIVANTS sont grisés).
            battle.player.team.forEach((m, i) => options.push({
                label: `${displayName(m)} N.${m.level} — ${m.currentHp <= 0 ? "K.O." : m.currentHp + "/" + maxHpOf(m) + " PV"}`,
                onSelect: () => { if (reviveItemId) doRevive(reviveItemId, i) }, disabled: m.currentHp > 0,
            }))
            options.push({ label: "← RETOUR", onSelect: () => { setReviveItemId(null); setMenu("bag") } })
            canBack = true
        } else if (menu === "itemTarget") {
            // SOIN / ANTI-STATUT / OBJET X : choisir le Daemon (actif OU banc). Grisé si le membre ne peut pas en profiter.
            const ti = itemTargetId ? ITEMS[itemTargetId] : null
            const cantBenefit = (m: (typeof battle.player.team)[number]) => {
                if (m.currentHp <= 0) return true // K.O. → aucun objet ciblable ne s'applique (il faut un Rappel)
                if (ti?.category === "BOOST") return false // objet X : pré-boostable sur n'importe quel Daemon vivant (même à plein PV)
                if (ti?.category === "STATUS_HEAL") return m.status === "NONE" // anti-statut : inutile sans statut
                return m.currentHp >= maxHpOf(m) // soin de PV : inutile à plein PV
            }
            battle.player.team.forEach((m, i) => options.push({
                label: `${displayName(m)} N.${m.level} — ${m.currentHp <= 0 ? "K.O." : m.currentHp + "/" + maxHpOf(m) + " PV"}${m.status !== "NONE" ? ` (${m.status})` : ""}`,
                onSelect: () => { if (itemTargetId) doItem(itemTargetId, i) }, disabled: cantBenefit(m),
            }))
            options.push({ label: "← RETOUR", onSelect: () => { setItemTargetId(null); setMenu("bag") } })
            canBack = true
        } else {
            battle.player.team.forEach((m, i) => options.push({
                label: `${displayName(m)} N.${m.level} — ${m.currentHp <= 0 ? "K.O." : m.currentHp + "/" + maxHpOf(m) + " PV"}`,
                onSelect: () => doSwitch(i), disabled: m.currentHp <= 0 || i === battle.player.activeIndex,
            }))
            options.push({ label: "← RETOUR", onSelect: () => setMenu("root") })
            canBack = true
        }
    }

    const stepCursor = (d: number) => {
        if (!options.length) return
        let i = cursor
        for (let k = 0; k < options.length; k++) {
            i = (i + d + options.length) % options.length
            if (!options[i].disabled) break
        }
        setCursor(i)
    }
    // Pont d'entrée : la coque GameBoy pousse ses appuis ici pendant le combat.
    // (Pattern "latest ref" : on garde le handler à jour ; appelé via le wrapper enregistré.)
    // eslint-disable-next-line
    inputRef.current = (a: BattleInput) => {
        if (learnMoveId) return // #7 : overlay d'apprentissage ouvert → on neutralise le D-pad (choix tactile)
        if (!playbackDone) { if (a === "a" || a === "b") advance(); return }
        if (a === "up" || a === "left") stepCursor(-1)
        else if (a === "down" || a === "right") stepCursor(1)
        else if (a === "a") { const o = options[cursor]; if (o && !o.disabled) o.onSelect() }
        else if (a === "b" && canBack) setMenu("root")
    }

    // Option rendue en LIGNE (menu Commandes, Attaque, Sac, Rester/Changer) — curseur ▶ + libellé + type à droite.
    const renderRow = (o: Opt, i: number) => (
        <button
            key={i}
            ref={i === cursor ? selRowRef : undefined}
            disabled={o.disabled}
            style={{ ...(o.disabled ? S.rowDim : S.row), ...(i === cursor ? S.rowFocus : null) }}
            onClick={(e) => { e.stopPropagation(); setCursor(i); if (!o.disabled) o.onSelect() }}
        >
            <span style={{ opacity: i === cursor ? 1 : 0, flexShrink: 0 }}>▶</span>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
            {o.right ? <span style={S.rowRight}>{o.right}</span> : null}
        </button>
    )
    return (
        <div style={S.root} onClick={waitingForTap ? advance : undefined}>
            {/* ===== Champ de bataille (diagonale Gen 1/2 : ennemi haut-gauche, joueur bas-droite) ===== */}
            <div style={S.field}>
                {/* Ennemi : fiche + pips/pokéball Pokédex, ancrés en haut-gauche. */}
                <div style={S.enemySide}>
                    {battle.isWild
                        ? <WildDexPip caught={dex.caught.includes(showEnemy.speciesId)} />
                        : <TeamPips team={battle.enemy.team} activeIdx={showEIdx} activeHp={showEHp} align="left" />}
                    {/* key sur l'uid : au switchIn, la barre se REMONTE nette (pas de flash 0→100%).
                        #4 : pendant la fenêtre d'envoi, on montre le PROCHAIN Daemon (showEnemy). */}
                    <MonInfo key={showEnemy.uid} mon={showEnemy} hp={showEHp} max={showEMax} status={showEStatus} />
                </div>
                <div style={S.enemySpot}>
                    {!enemyHiddenByBall && <MonSprite mon={showEnemy} facing="front" alive={showEHp > 0} hitKey={shakeE} />}
                    {ball && <BallAnim phase={ball.phase} shakes={ball.shakes} caught={ball.caught} topGradient={ballGradient(lastBallId)} />}
                </div>
                {/* Joueur : sprite de dos en bas-gauche, fiche + pips en bas-droite. */}
                <div style={S.playerSpot}>
                    <MonSprite mon={player} facing="back" alive={pHp > 0} hitKey={shakeP} victory={playbackDone && playerWon && battle.pvp} />
                </div>
                <div style={S.playerSide}>
                    <MonInfo key={player.uid} mon={player} self hp={pHp} max={pMax} status={pStatus} />
                    {!battle.isWild && <TeamPips team={battle.player.team} activeIdx={pIdx} activeHp={pHp} align="right" />}
                </div>
                {atkFx && <AttackFx key={atkFx.key} spec={atkFx.spec} attackerSide={atkFx.side} onDone={() => setAtkFx(null)} />}
                <EncounterTransition />
            </div>

            {/* ===== Boîte de dialogue / commandes — RENDUE DANS l'écran (à la Game Boy) ===== */}
            <div style={S.dialog}>
                {(() => {
                    // Message en cours de lecture (coups, annonces) : pleine largeur + ▶ pour avancer.
                    if (!playbackDone) {
                        return (
                            <div style={S.msgBox} onClick={advance}>
                                <p style={S.msgText}>{shownMsg}</p>
                                {waitingForTap && <span style={S.next}>▶</span>}
                            </div>
                        )
                    }
                    // Fin de combat : message + QUITTER.
                    if (isEnded) {
                        const txt = battle.outcome === "win" ? "Tu remportes le combat !" : battle.outcome === "lose" ? "Tous tes Daemons sont K.O…" : battle.outcome === "run" ? "Tu as pris la fuite." : battle.outcome === "enemyfled" ? "Le Daemon a pris la fuite !" : battle.outcome === "caught" ? "Daemon capturé !" : "Fin du combat."
                        return (
                            <>
                                <div style={S.msgBox}><p style={S.msgText}>{txt}</p></div>
                                <div style={S.cmdBox}>{options.map((o, i) => renderRow(o, i))}</div>
                            </>
                        )
                    }
                    // Sélection d'attaque : liste à GAUCHE + fiche détaillée de l'attaque à DROITE.
                    if (menu === "moves") {
                        const sel = options[cursor]
                        const selMv = sel?.moveSlot != null ? getMove(player.moves[sel.moveSlot]?.moveId ?? "") : undefined
                        return (
                            <>
                                <div style={S.listBox}>{options.map((o, i) => renderRow(o, i))}</div>
                                <div style={S.detailBox}>
                                    {selMv ? <MoveDetails mv={selMv} mon={player} /> : <div style={S.detailHint}>{sel?.detail ?? ""}</div>}
                                </div>
                            </>
                        )
                    }
                    // Sac : liste d'objets, pleine largeur.
                    if (menu === "bag") {
                        return <div style={S.listBoxWide}>{options.map((o, i) => renderRow(o, i))}</div>
                    }
                    // RAPPEL : choix du Daemon K.O. à ranimer, liste pleine largeur (comme le sac).
                    if (menu === "reviveTarget") {
                        return <div style={S.listBoxWide}>{options.map((o, i) => renderRow(o, i))}</div>
                    }
                    // Confirmation de fuite : message + OUI / NON.
                    if (menu === "confirmRun") {
                        return (
                            <>
                                <div style={S.msgBox}><p style={S.msgText}>Fuir le combat ?</p></div>
                                <div style={S.cmdBox}>{options.map((o, i) => renderRow(o, i))}</div>
                            </>
                        )
                    }
                    // Fenêtre d'envoi adverse (Dresseur) : message + RESTER / CHANGER.
                    if (awaitSendOut && menu !== "switch") {
                        return (
                            <>
                                <div style={S.msgBox}><p style={S.msgText}>L&apos;adversaire envoie {sendOutName} !{sendOutTypes ? ` [${sendOutTypes}]` : ""}</p></div>
                                <div style={S.cmdBoxTall}>{options.map((o, i) => renderRow(o, i))}</div>
                            </>
                        )
                    }
                    // Menu racine : « Que doit faire X ? » + commandes 2×2 (ATTAQUE / DAEMON / SAC / FUITE).
                    return (
                        <>
                            <div style={S.msgBox}><p style={S.msgText}>Que doit faire<br />{displayName(player).toUpperCase()} ?</p></div>
                            <div style={S.cmdBox}>{options.map((o, i) => renderRow(o, i))}</div>
                        </>
                    )
                })()}
            </div>

            {/* ===== Écran d'équipe plein cadre (changement de Daemon, façon Gen 1/2) ===== */}
            {playbackDone && (menu === "switch" || needSwitch) && (
                <PartyScreen
                    team={battle.player.team}
                    options={options}
                    cursor={cursor}
                    onPick={(i) => { setCursor(i); const o = options[i]; if (o && !o.disabled) o.onSelect() }}
                />
            )}

            {/* PvP : recap "commentateur" pour les DEUX joueurs. Hors PvP : célébration GOAT/FLOP
                contre les Dresseurs seulement (combat sauvage → fin sobre). Overlay plein écran. */}
            {playbackDone && (battle.pvp
                ? (isEnded && <PvpRecap won={playerWon} playerTeam={battle.player.team} enemyTeam={battle.enemy.team} onClose={() => endBattle()} />)
                : (playerWon && !battle.isWild && <VictoryCelebration team={battle.player.team} />))}

            {/* #7 — APPRENTISSAGE EN COMBAT (slots pleins) : tableau comparatif détaillé + choisir / différer. */}
            {learnMoveId && (
                <div style={LRN.overlay} onClick={(e) => e.stopPropagation()}>
                    <div style={LRN.box}>
                        <MoveCompare mon={player} newMoveId={learnMoveId} onForget={(i) => learnForget(i)} onGiveUp={() => learnForget(null)} onLater={learnLater} />
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes bobNext {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(2px); }
                }
                @keyframes hitShake {
                    0% { transform: translateX(0); }
                    15% { transform: translateX(-6px); }
                    30% { transform: translateX(5px); }
                    45% { transform: translateX(-4px); }
                    60% { transform: translateX(3px); }
                    75% { transform: translateX(-2px); }
                    100% { transform: translateX(0); }
                }
                @keyframes monEnter {
                    0% { transform: translateY(-44px) scale(0.7); opacity: 0; }
                    55% { opacity: 1; }
                    78% { transform: translateY(5px) scale(1.06); }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes victoryPulse {
                    0%, 100% { filter: drop-shadow(0 0 5px #f5d020) drop-shadow(0 0 11px #ffd54a88); }
                    50% { filter: drop-shadow(0 0 11px #fff3a0) drop-shadow(0 0 22px #ffd54a); }
                }
                @keyframes ballThrow {
                    0% { transform: translate(-150px, -70px) scale(0.5) rotate(-200deg); opacity: 0; }
                    30% { opacity: 1; }
                    100% { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes ballShake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-18deg) translateX(-3px); }
                    75% { transform: rotate(18deg) translateX(3px); }
                }
                @keyframes ballCaught {
                    0% { transform: scale(1); filter: none; }
                    30% { transform: translateY(-6px) scale(1.05); }
                    55% { transform: translateY(0) scale(1); }
                    60% { filter: brightness(2.2) drop-shadow(0 0 10px #f5d020); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                @keyframes ballEscape {
                    0% { transform: scale(1); opacity: 1; filter: brightness(1); }
                    40% { transform: scale(1.5); opacity: 1; filter: brightness(2.5); }
                    100% { transform: scale(1.9); opacity: 0; }
                }
                /* Lancer COMPLÈTEMENT raté : la ball arrive d'en bas, FRÔLE la cible, rebondit
                   de travers et fuse hors de l'écran par le coin haut-droit (overflow:hidden la
                   coupe au bord → effet "sortie de l'écran"). Théâtral, en ~0,9 s. */
                @keyframes ballMiss {
                    0%   { transform: translate(-150px, 12px) scale(0.5) rotate(0deg); opacity: 0; }
                    18%  { transform: translate(-58px, -8px) scale(1) rotate(200deg); opacity: 1; }
                    42%  { transform: translate(-12px, -40px) scale(1) rotate(420deg); opacity: 1; }
                    56%  { transform: translate(22px, -18px) scale(0.95) rotate(560deg); opacity: 1; }
                    100% { transform: translate(250px, -180px) scale(0.5) rotate(1140deg); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

// #7 — styles de l'overlay d'apprentissage en combat (alignés sur MoveLearnScreen post-combat).
const LRN: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9100, background: "rgba(8,6,16,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, fontFamily: "'Courier New', monospace", color: "#f8f8e8" },
    box: { width: "min(380px, 96vw)", maxHeight: "90dvh", overflowY: "auto", background: "rgba(20,16,40,0.97)", border: "3px solid #f5d020", borderRadius: 14, padding: "16px 14px", textAlign: "center" },
    title: { fontSize: 15, fontWeight: 800, marginBottom: 4 },
    sub: { fontSize: 11, opacity: 0.8, marginBottom: 6 },
    list: { display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" },
    moveBtn: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", fontFamily: "inherit", fontSize: 12, color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" },
    meta: { fontSize: 10, opacity: 0.6 },
    primary: { width: "100%", marginTop: 8, padding: "10px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#1a1400", background: "#f5d020", border: "none", borderRadius: 8, cursor: "pointer" },
    giveUp: { width: "100%", marginTop: 4, padding: "9px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#1a1400", background: "#f5d020", border: "none", borderRadius: 8, cursor: "pointer" },
    later: { width: "100%", marginTop: 8, padding: "8px", fontFamily: "inherit", fontSize: 11, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" },
}

// ============================================================
// Sous-composants
// ============================================================

function MonInfo({ mon, self, hp, max, status }: { mon: BattleMon; self?: boolean; hp: number; max: number; status: string }) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100))
    const col = pct > 50 ? "#48c048" : pct > 20 ? "#f0c040" : "#e04040"
    // #6 — petite LUEUR discrète de la barre d'XP quand CE Daemon passe un niveau (event moins anodin).
    const prevRef = useRef<{ uid: string; level: number }>({ uid: mon.uid, level: mon.level })
    const [xpGlow, setXpGlow] = useState(false)
    useEffect(() => {
        const p = prevRef.current
        prevRef.current = { uid: mon.uid, level: mon.level }
        if (self && p.uid === mon.uid && mon.level > p.level) {
            // setState DIFFÉRÉ (hors corps synchrone de l'effet → évite la règle set-state-in-effect).
            const on = setTimeout(() => setXpGlow(true), 0)
            const off = setTimeout(() => setXpGlow(false), 850)
            return () => { clearTimeout(on); clearTimeout(off) }
        }
    }, [mon.uid, mon.level, self])
    return (
        <div style={{ ...S.info, alignSelf: self ? "flex-end" : "flex-start" }}>
            <div style={S.infoTop}>
                <span style={S.monName}>{displayName(mon).toUpperCase()}</span>
                <span style={S.monLvl}>N.{mon.level}</span>
            </div>
            {/* Type(s) du Daemon, juste sous le nom (aide stratégique en combat). */}
            <div style={S.typeRow}>
                {speciesOf(mon).types.map((t) => (
                    <span key={t} style={{ ...S.typeChip, background: TYPE_COLORS[t] }}>{TYPE_FR[t] ?? t}</span>
                ))}
            </div>
            {/* Chiffre des PV AU-DESSUS de la barre, aligné à droite → la barre garde toute sa largeur. */}
            {self && <div style={S.hpNumRow}><span style={S.hpNum}>{Math.max(0, Math.round(hp))}/{max} PV</span></div>}
            <div style={S.hpRow}>
                <span style={S.hpLabel}>PV</span>
                <div style={S.hpTrack}><div style={{ ...S.hpFill, width: `${pct}%`, background: col }} /></div>
            </div>
            {/* Mini barre d'XP (joueur uniquement) → on voit si le Daemon est proche du niveau suivant. */}
            {self && (() => {
                const cur = expForLevel(mon.level, mon.speciesId), nxt = expForLevel(mon.level + 1, mon.speciesId)
                // plancher du niveau : un Daemon créé/capturé à exp=0 montre 0% (et non une barre faussée).
                const eff = Math.max(mon.exp ?? cur, cur)
                const xpPct = nxt > cur ? Math.max(0, Math.min(100, ((eff - cur) / (nxt - cur)) * 100)) : 0
                return (
                    <div style={S.xpRow}>
                        <span style={S.xpLabel}>XP</span>
                        <div style={S.xpTrack}><div style={{ ...S.xpFill, width: `${xpPct}%`, ...(xpGlow ? { background: "#ffd54a", boxShadow: "0 0 6px #ffd54a" } : {}) }} /></div>
                    </div>
                )
            })()}
            {hp > 0 && status !== "NONE" && <span style={S.statusTag}>{status}</span>}
        </div>
    )
}

// Barre des 6 Daemons d'une équipe (style "pokéballs") : vivant = bille rouge/crème,
// K.O. = grisé + ✕, statut = ambre. Lecture seule de l'état de combat (zéro moteur).
// Le Daemon ACTIF utilise activeHp (synchro avec sa barre animée).
function TeamPips({ team, activeIdx, activeHp, align }: { team: BattleMon[]; activeIdx: number; activeHp: number; align: "left" | "right" }) {
    return (
        <div style={{ display: "flex", gap: 5, justifyContent: align === "left" ? "flex-start" : "flex-end", padding: "0 6px", minHeight: 16 }}>
            {team.map((m, i) => {
                const hp = i === activeIdx ? activeHp : m.currentHp
                const ko = hp <= 0
                const sick = !!m.status && m.status !== "NONE"
                return (
                    <span
                        key={m.uid}
                        title={`${displayName(m)} — ${ko ? "K.O." : `${Math.max(0, Math.ceil(hp))} PV`}`}
                        style={{
                            width: 14, height: 14, borderRadius: "50%", border: "2px solid #1c1408",
                            background: ko ? "#9a9a9a" : sick ? "#e0b020" : "linear-gradient(#e23c2a 0 50%, #f4ecd4 50% 100%)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 900, color: "#1c1408", lineHeight: 1,
                            boxShadow: ko ? "none" : "0 1px 2px rgba(0,0,0,0.35)",
                        }}
                    >{ko ? "✕" : ""}</span>
                )
            })}
        </div>
    )
}

// Indicateur Pokédex en combat SAUVAGE : pip ROUGE/crème = espèce déjà capturée,
// pip grisé = pas encore attrapée. Réutilise le rendu des pips d'équipe (TeamPips).
function WildDexPip({ caught }: { caught: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 6px", minHeight: 16 }}
            title={caught ? "Espèce déjà capturée" : "Espèce pas encore capturée"}>
            <span style={{
                width: 14, height: 14, borderRadius: "50%", border: "2px solid #1c1408",
                background: caught ? "linear-gradient(#e23c2a 0 50%, #f4ecd4 50% 100%)" : "#9a9a9a",
                opacity: caught ? 1 : 0.45,
                boxShadow: caught ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                flexShrink: 0,
            }} />
            <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: 0.5, color: caught ? "#1c1408" : "#3a8ee0", opacity: 0.85 }}>
                {caught ? "CAPTURÉ" : "NOUVEAU !"}
            </span>
        </div>
    )
}

function MonSprite({ mon, facing, alive, hitKey, victory }: { mon: BattleMon; facing: "front" | "back"; alive: boolean; hitKey: number; victory?: boolean }) {
    // Sprite PNG (public/) avec repli sur l'initiale si le fichier manque.
    // `key={hitKey}` force un remount à chaque coup encaissé → l'animation de tremblement rejoue.
    const sp = speciesOf(mon)
    const [realErr, setRealErr] = useState(false)
    const [genErr, setGenErr] = useState(false)
    // FUSION : résout le sprite GÉNÉRÉ À L'AFFICHAGE (même si buildFusion a figé MissingNo car la génération
    //   n'était pas prête au moment de bâtir l'équipe). Pour un non-fusion, fusionParents=undefined → hook inerte.
    const fusionGen = useFusionSprite(sp.fusionParents?.[0], sp.fusionParents?.[1])
    const realSrc = sp.sprite && sp.sprite !== MISSINGNO_SPRITE && !realErr ? sp.sprite : null
    const genSrc = !realSrc && sp.fusionParents && fusionGen.url && !genErr ? fusionGen.url : null
    const imgSrc = realSrc ?? genSrc
    // Repli : placeholder Chimère (moitié-moitié des 2 parents) si aucune image ; sinon glyphe (custom « mystère »).
    const chimera = !imgSrc && sp.fusionParents
        ? { a: getSpecies(sp.fusionParents[0])?.sprite, b: getSpecies(sp.fusionParents[1])?.sprite }
        : null
    const glyph = !imgSrc && !chimera
    return (
        // Wrapper keyé sur l'uid : remonte à chaque ENTRÉE de Daemon (combat/switch)
        // → joue l'anim "monEnter" (chute + rebond). Le shake reste sur le div interne.
        <div key={mon.uid} style={{ animation: "monEnter 0.42s cubic-bezier(.17,.67,.33,.99)" }}>
            <div
                key={hitKey}
                style={{
                    ...(glyph ? S.sprite : S.spriteBox),
                    position: "relative",
                    opacity: alive ? 1 : 0.25,
                    transform: facing === "back" ? "scaleX(-1)" : "none",
                    // Victoire : halo doré pulsé (PRIME sur le shake) ; ne pulse QUE le filtre → préserve le scaleX du dos.
                    animation: victory ? "victoryPulse 1.2s ease-in-out infinite" : hitKey > 0 ? "hitShake 0.3s ease-in-out" : "none",
                }}
            >
                {imgSrc
                    ? <img src={imgSrc} alt={sp.name} onError={() => (realSrc ? setRealErr(true) : setGenErr(true))}
                        style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", ...(mon.shiny ? { filter: SHINY_FILTER } : {}) }} />
                    : chimera
                        ? <ChimeraPlaceholder aSprite={chimera.a} bSprite={chimera.b} types={sp.types} size={76} />
                        : <span style={S.spriteGlyph}>{sp.name[0]}</span>}
                {/* CHROMATIQUE (shiny) : halo doré (SHINY_FILTER, sans recolorer) + ✨ scintillantes (2, décalées). */}
                {mon.shiny && imgSrc && <span style={{ position: "absolute", top: -2, right: 0, fontSize: 18, animation: "victoryPulse 1.3s ease-in-out infinite", pointerEvents: "none" }}>✨</span>}
                {mon.shiny && imgSrc && <span style={{ position: "absolute", bottom: 2, left: 0, fontSize: 12, animation: "victoryPulse 1.6s ease-in-out 0.4s infinite", pointerEvents: "none" }}>✨</span>}
            </div>
        </div>
    )
}


// Libellés FR courts pour la fiche d'attaque.
const STATUS_FR: Record<string, string> = { BURN: "Brûlure", PARALYSIS: "Paralysie", POISON: "Poison", TOXIC: "Poison grave", SLEEP: "Sommeil", FREEZE: "Gel" }
const VOLATILE_FR: Record<string, string> = { SEEDED: "Vampigraine", CONFUSION: "Confusion" }
const STAGE_FR: Record<string, string> = { atk: "ATQ", def: "DÉF", spe: "VIT", spc: "SPÉ", acc: "Préc.", eva: "Esq." }

// Résumé EN UNE LIGNE de l'effet d'une attaque (le plus saillant) — null si rien de notable.
function moveEffectTag(mv: MoveData): string | null {
    const e = mv.effect
    if (!e) return null
    if (e.adaptiveStab) return "STAB adaptatif : type & catégorie calés sur ce Daemon (sa meilleure stat)"
    if (e.recoilPct) return `Recul : ${e.recoilPct}% des dégâts subis`
    if (e.drainPct) return `Vol de PV : ${e.drainPct}%`
    if (e.healPct) return `Soigne ${e.healPct}% des PV`
    if (e.fixedDamage) return `Inflige ${e.fixedDamage} PV fixes`
    if (e.multiHit) { const [a, b] = e.multiHit; return a === b ? `Frappe ${a}×` : `Frappe ${a} à ${b}×` }
    if (e.inflictStatus) { const s = STATUS_FR[e.inflictStatus] ?? e.inflictStatus; return e.chance && e.chance < 100 ? `${s} (${e.chance}%)` : s }
    if (e.inflictVolatile) return VOLATILE_FR[e.inflictVolatile] ?? null
    if (e.flinch) return e.chance ? `Peut apeurer (${e.chance}%)` : "Peut apeurer"
    if (e.statChanges?.length) {
        const c = e.statChanges[0]
        const sign = c.stages > 0 ? `+${c.stages}` : `${c.stages}`
        const base = `${sign} ${STAGE_FR[c.stat] ?? c.stat}${c.target === "self" ? "" : " adv."}`
        // FIABILITÉ : sur un coup OFFENSIF (puissance > 0), le changement est un effet SECONDAIRE (chance = e.chance ?? 100)
        //   → on précise « (10%) » ou « (à coup sûr) ». Sur un move de STATUT pur, il est toujours garanti (c'est son but).
        return mv.power > 0 ? `${base}${e.chance && e.chance < 100 ? ` (${e.chance}%)` : " (à coup sûr)"}` : base
    }
    if (e.highCrit) return "Taux de critique élevé"
    if (e.twoTurn || e.dig || e.fly) return "Charge sur 2 tours"
    if (e.sureHit) return "Ne rate jamais"
    return null
}

// Fiche détaillée d'une attaque (panneau de droite du menu Attaque) — façon « carte » du jeu :
// type + catégorie, puissance / précision / PP, puis l'effet et un texte de saveur.
function MoveDetails({ mv, mon }: { mv: MoveData; mon: BattleMon }) {
    // STAB ADAPTATIF (Apothéose) : type & catégorie EFFECTIFS calculés sur le Daemon porteur (et non le
    // NORMAL/PHYS figé du move stocké) → l'affichage colle à ce que le combat fera vraiment.
    const adaptive = !!mv.effect?.adaptiveStab && mv.power > 0
    let dispType = mv.type
    let isPhys = (mv.category ?? moveCategory(mv.type)) === "PHYSICAL"
    if (adaptive) {
        const fs = fullStats(mon, speciesOf(mon))
        const r = resolveAdaptiveStab(speciesOf(mon).types, fs.atk, fs.spc)
        dispType = r.type; isPhys = r.isPhysical
    }
    // Badge catégorie IDENTIQUE à la fiche d'équipe (PHYS rouge / SPÉ bleu / STATUT violet).
    const cat = mv.power <= 0 ? { label: "STATUT", color: "#8868c0" }
        : isPhys ? { label: "PHYS", color: "#c0532a" }
            : { label: "SPÉ", color: "#3a7ae0" }
    const tag = moveEffectTag(mv)
    return (
        <>
            <div style={S.detailName}>{mv.name}</div>
            <div style={S.detailMeta}>
                <span style={{ ...S.typeChip, background: TYPE_COLORS[dispType] }}>{mv.displayType ?? TYPE_FR[dispType] ?? dispType}</span>
                <span style={{ ...S.typeChip, background: cat.color }}>{cat.label}</span>
                {adaptive && <span style={{ ...S.typeChip, background: "#7a5cc0" }}>ADAPT.</span>}
            </div>
            <div style={S.detailStats}>
                <span>{isDamaging(mv) ? `⚡ Puiss. ${mv.power}` : "Statut"}</span>
                {mv.accuracy > 0 ? <span>🎯 {mv.accuracy}%</span> : <span>🎯 ∞</span>}
            </div>
            {tag && <div style={S.detailEffect}>{tag}</div>}
        </>
    )
}

// Petit sprite statique pour la liste d'équipe (sans anim, repli sur l'initiale). Résout AUSSI le sprite GÉNÉRÉ d'une
//   fusion (comme MonSprite) : sans ça, un fusionné dont le sprite maison n'est pas figé affiche MissingNo au switch.
function PartySprite({ mon }: { mon: BattleMon }) {
    const sp = speciesOf(mon)
    const [realErr, setRealErr] = useState(false)
    const [genErr, setGenErr] = useState(false)
    const fusionGen = useFusionSprite(sp.fusionParents?.[0], sp.fusionParents?.[1])
    const realSrc = sp.sprite && sp.sprite !== MISSINGNO_SPRITE && !realErr ? sp.sprite : null
    const genSrc = !realSrc && sp.fusionParents && fusionGen.url && !genErr ? fusionGen.url : null
    const src = realSrc ?? genSrc
    return (
        <div style={S.partySprite}>
            {!src
                ? <span style={{ fontSize: 16, fontWeight: 900 }}>{sp.name[0]}</span>
                : <img src={src} alt="" onError={() => (realSrc ? setRealErr(true) : setGenErr(true))} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

// Écran d'équipe plein cadre (façon Gen 1/2) : sprite + nom + niveau + barre de PV par Daemon.
// Piloté par le même curseur/`options` que le reste du combat (D-pad/A/B + tactile).
function PartyScreen({ team, options, cursor, onPick }: {
    team: BattleMon[]
    options: { onSelect: () => void; disabled?: boolean }[]
    cursor: number
    onPick: (i: number) => void
}) {
    const hasCancel = options.length > team.length // un « RETOUR » suit la liste
    // Garde l'option sélectionnée VISIBLE quand on navigue à la flèche (liste scrollable).
    const selRef = useRef<HTMLButtonElement | null>(null)
    useEffect(() => { selRef.current?.scrollIntoView({ block: "nearest" }) }, [cursor])
    return (
        <div style={S.partyOverlay} onClick={(e) => e.stopPropagation()}>
            <div style={S.partyList}>
                {team.map((m, i) => {
                    const o = options[i]
                    const ko = m.currentHp <= 0
                    const max = maxHpOf(m)
                    const pct = Math.max(0, Math.min(100, (m.currentHp / max) * 100))
                    const col = pct > 50 ? "#48c048" : pct > 20 ? "#f0c040" : "#e04040"
                    return (
                        <button
                            key={m.uid}
                            ref={i === cursor ? selRef : undefined}
                            disabled={o?.disabled}
                            style={{ ...(o?.disabled ? S.partyRowDim : S.partyRow), ...(i === cursor ? S.partyRowFocus : null) }}
                            onClick={() => onPick(i)}
                        >
                            <span style={{ opacity: i === cursor ? 1 : 0, flexShrink: 0 }}>▶</span>
                            <PartySprite mon={m} />
                            <span style={S.partyName}>{displayName(m).toUpperCase()}</span>
                            {/* Type(s) : utile surtout pour les Daemons FUSIONNÉS, dont on ne connaît pas le typage par cœur. */}
                            <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                {speciesOf(m).types.map((t) => (
                                    <span key={t} style={{ ...S.typeChip, background: TYPE_COLORS[t] }}>{TYPE_FR[t] ?? t}</span>
                                ))}
                            </span>
                            <span style={S.partyLvl}>N.{m.level}</span>
                            <div style={S.partyHpWrap}>
                                <div style={S.partyHpTrack}><div style={{ ...S.partyHpFill, width: `${pct}%`, background: col }} /></div>
                                <span style={S.partyHpNum}>{ko ? "K.O." : `${Math.max(0, Math.ceil(m.currentHp))}/${max}`}</span>
                            </div>
                        </button>
                    )
                })}
                {hasCancel && (
                    <button
                        ref={cursor === team.length ? selRef : undefined}
                        style={{ ...S.partyRow, ...(cursor === team.length ? S.partyRowFocus : null) }}
                        onClick={() => onPick(team.length)}
                    >
                        <span style={{ opacity: cursor === team.length ? 1 : 0, flexShrink: 0 }}>▶</span>
                        <span style={S.partyName}>RETOUR</span>
                    </button>
                )}
            </div>
        </div>
    )
}

// ============================================================
// Styles (GBC-ish, inline pour rester autonome)
// ============================================================

// Nexus-Ball animée : lancer (arc) → secousses (×N) → clic (capturé) ou éclatement (raté).
// "miss" = lancer COMPLÈTEMENT raté : la ball part de travers, frôle la cible et sort de l'écran.
/** Couleur (dégradé du haut) de la Ball lancée, par PALIER — comme les vraies Poké/Super/Hyper Balls. */
function ballGradient(id: string): string {
    if (id === "fusio_ball") return "linear-gradient(#f5d24a,#d4a017)"            // Fusio-Ball : doré
    if (id === "master_ball") return "linear-gradient(#d24ab0,#a01a80)"          // Master-Éclair : magenta
    if (id === "super_mega_nexus_ball") return "linear-gradient(#9a5ae0,#6a2ac0)" // Super Méga : violet
    if (id.startsWith("hyper_ball")) return "linear-gradient(#f2c020,#c89800)"    // Hyper : jaune (Ultra-Ball)
    if (id.startsWith("super_ball")) return "linear-gradient(#4a90d5,#2a6ab0)"    // Super : bleu (Great-Ball)
    return "linear-gradient(#e8503a,#c8301a)"                                     // Nexus (poke_ball…) : rouge, défaut
}

function BallAnim({ phase, shakes, caught, topGradient }: { phase: "throw" | "shake" | "result" | "miss"; shakes: number; caught: boolean; topGradient?: string }) {
    const anim = phase === "throw" ? "ballThrow 0.6s ease-out forwards"
        : phase === "shake" ? `ballShake 0.42s ease-in-out ${Math.max(0, shakes)}`
            : phase === "miss" ? "ballMiss 0.9s ease-in forwards"
                : caught ? "ballCaught 0.8s ease-out forwards"
                    : "ballEscape 0.6s ease-out forwards"
    return (
        <div style={{ ...S.ball, animation: anim }}>
            {/* FUSIO-BALL = dorée (au lieu de rouge). Bas blanc inchangé. */}
            <div style={topGradient ? { ...S.ballTop, background: topGradient } : S.ballTop} />
            <div style={S.ballBand} />
            <div style={S.ballBtn} />
        </div>
    )
}

const BORDER = "2px solid #1c1408"
const PAPER = "#f8f8e8"

const S: Record<string, React.CSSProperties> = {
    // Remplit l'écran de la coque Game Boy (parent : position relative, overflow hidden, ratio 3:2).
    root: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: PAPER, fontFamily: "'Courier New', monospace", color: "#1c1408", userSelect: "none", overflow: "hidden" },

    // ===== Champ de bataille (60 % du haut) — diagonale Gen 1/2 en positionnement absolu =====
    field: { position: "relative", flex: 1, minHeight: 0, overflow: "hidden", background: "linear-gradient(#bfe6ef 0%, #dff0d8 58%, #cfe8b0 100%)" },
    enemySide: { position: "absolute", top: 6, left: 6, maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 },
    enemySpot: { position: "absolute", top: 2, right: 8, width: 78, height: 78, display: "flex", alignItems: "center", justifyContent: "center" },
    playerSpot: { position: "absolute", left: 6, bottom: 0, width: 84, height: 84, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    playerSide: { position: "absolute", right: 6, bottom: 6, maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },

    // ===== Boîte de dialogue / commandes (40 % du bas) =====
    dialog: { flexShrink: 0, height: "41%", minHeight: 96, display: "flex", gap: 5, padding: 5, boxSizing: "border-box", borderTop: BORDER, background: PAPER },
    msgBox: { flex: 1, minWidth: 0, background: PAPER, border: BORDER, borderRadius: 4, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", cursor: "pointer" },
    msgText: { fontSize: 13, lineHeight: 1.4, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 4, right: 8, fontSize: 12, animation: "bobNext 0.8s ease-in-out infinite" },

    // Boîte de commandes — options EMPILÉES (ATTAQUE / DAEMON / SAC / FUITE ; OUI / NON ; QUITTER).
    // Même structure/hauteur que la liste d'attaques → pas de débordement vertical de l'écran.
    cmdBox: { flexShrink: 0, width: "46%", maxWidth: 210, background: PAPER, border: BORDER, borderRadius: 4, padding: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0, overflowY: "auto" },
    cmdBoxTall: { flexShrink: 0, width: "48%", maxWidth: 220, background: PAPER, border: BORDER, borderRadius: 4, padding: "6px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 },

    // Liste d'attaques (gauche) + fiche détaillée de l'attaque sélectionnée (droite).
    listBox: { flex: 1, minWidth: 0, background: PAPER, border: BORDER, borderRadius: 4, padding: "4px 0 0 0", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" },
    detailBox: { flexShrink: 0, width: "38%", maxWidth: 175, background: PAPER, border: BORDER, borderRadius: 4, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" },
    detailName: { fontSize: 12, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.15 },
    detailMeta: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" },
    detailStats: { display: "flex", flexWrap: "wrap", gap: "1px 8px", fontSize: 10, fontWeight: 700, marginTop: 1 },
    detailEffect: { fontSize: 9, fontWeight: 700, color: "#b5532a" },
    detailHint: { fontSize: 10, fontWeight: 600, opacity: 0.55, margin: "auto", textAlign: "center" },
    listBoxWide: { flex: 1, minWidth: 0, background: PAPER, border: BORDER, borderRadius: 4, padding: "5px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" },
    row: { display: "flex", alignItems: "center", gap: 4, width: "100%", background: "transparent", border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#1c1408", cursor: "pointer", padding: "3px 4px", textAlign: "left" },
    rowDim: { display: "flex", alignItems: "center", gap: 4, width: "100%", background: "transparent", border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#b0b0a0", padding: "3px 4px", textAlign: "left" },
    rowFocus: { background: "#f5d020" },
    rowRight: { marginLeft: 8, flexShrink: 0, fontSize: 10, fontWeight: 600, opacity: 0.55 },

    // ===== Fiches de Daemon (compactes, façon "bracket" GB) =====
    info: { background: PAPER, border: "2px solid #1c1408", borderRadius: 4, padding: "3px 7px", minWidth: 0 },
    infoTop: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 800 },
    monName: { letterSpacing: 0.5, whiteSpace: "nowrap" },
    monLvl: { opacity: 0.8, fontSize: 10 },
    typeRow: { display: "flex", gap: 3, marginTop: 2 },
    typeChip: { fontSize: 7, fontWeight: 700, color: "#fff", padding: "1px 4px", borderRadius: 2, letterSpacing: 0.3, textShadow: "0 1px 1px rgba(0,0,0,0.45)" },
    // Chiffre des PV AU-DESSUS de la barre (aligné à droite) → la barre garde toute sa largeur.
    hpNumRow: { display: "flex", justifyContent: "flex-end", marginTop: 3, lineHeight: 1 },
    hpRow: { display: "flex", alignItems: "center", gap: 5, marginTop: 3 },
    hpLabel: { fontSize: 8, fontWeight: 800, color: "#c89000" },
    hpTrack: { width: 84, height: 6, background: "#404040", borderRadius: 3, overflow: "hidden", border: "1px solid #1c1408" },
    hpFill: { height: "100%", transition: "width 0.4s ease" },
    hpNum: { fontSize: 8, fontWeight: 700, minWidth: 42, textAlign: "right" },
    xpRow: { display: "flex", alignItems: "center", gap: 5, marginTop: 2 },
    xpLabel: { fontSize: 7, fontWeight: 700, color: "#5a9fe0" },
    xpTrack: { width: 84, height: 3, background: "#404040", borderRadius: 2, overflow: "hidden", border: "1px solid #1c1408" },
    xpFill: { height: "100%", background: "#4a9fe0", transition: "width 0.4s ease, background 0.5s ease, box-shadow 0.5s ease" },
    statusTag: { display: "inline-block", marginTop: 2, fontSize: 7, fontWeight: 700, background: "#8868c0", color: "#fff", padding: "1px 5px", borderRadius: 3, letterSpacing: 1 },

    // Sprites
    sprite: { width: 64, height: 64, borderRadius: "50%", background: "#ffffff80", border: "3px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center" },
    spriteBox: { width: 76, height: 76, display: "flex", alignItems: "center", justifyContent: "center" },
    spriteGlyph: { fontSize: 30, fontWeight: 900 },

    // Pokéball animée (capture)
    ball: { position: "absolute", width: 34, height: 34, borderRadius: "50%", background: "#f5f5f5", border: "2px solid #1c1408", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" },
    ballTop: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(#e8503a,#c8301a)" },
    ballBand: { position: "absolute", top: "calc(50% - 2px)", left: 0, right: 0, height: 4, background: "#1c1408" },
    ballBtn: { position: "absolute", top: "calc(50% - 5px)", left: "calc(50% - 5px)", width: 10, height: 10, borderRadius: "50%", background: PAPER, border: "2px solid #1c1408" },

    // ===== Écran d'équipe plein cadre (changement de Daemon) =====
    partyOverlay: { position: "absolute", inset: 0, zIndex: 50, background: PAPER, display: "flex", flexDirection: "column", fontFamily: "'Courier New', monospace", color: "#1c1408" },
    partyList: { flex: 1, minHeight: 0, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 3 },
    partyRow: { display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 6px", background: "#fff", border: "2px solid #1c1408", borderRadius: 4, fontFamily: "inherit", color: "#1c1408", textAlign: "left", cursor: "pointer" },
    partyRowDim: { display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 6px", background: "#eceadd", border: "2px solid #b0b0a0", borderRadius: 4, fontFamily: "inherit", color: "#9a9a88", textAlign: "left", cursor: "default", opacity: 0.85 },
    partyRowFocus: { background: "#f5d020" },
    partySprite: { width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    partyName: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    partyLvl: { fontSize: 10, fontWeight: 700, opacity: 0.8, flexShrink: 0 },
    partyHpWrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, width: 104, flexShrink: 0 },
    partyHpTrack: { width: "100%", height: 6, background: "#404040", borderRadius: 3, overflow: "hidden", border: "1px solid #1c1408" },
    partyHpFill: { height: "100%", transition: "width 0.3s ease" },
    partyHpNum: { fontSize: 9, fontWeight: 700 },
}
