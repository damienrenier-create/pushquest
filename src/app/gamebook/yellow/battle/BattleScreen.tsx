"use client"

// Nexus Jaune Éclair — écran de combat (UI minimale, style Game Boy).
// Le moteur résout un tour COMPLET et produit une file d'événements ordonnée
// (messages, variations de PV, K.O., changements…). Cet écran REJOUE cette file
// pas à pas : un message attend un tap ; un changement de PV s'anime (la barre
// descend + le Daemon touché tremble) puis on enchaîne. Ainsi les attaques
// paraissent bien séquentielles (jamais simultanées). Aucune règle recalculée ici.

import { useEffect, useRef, useState } from "react"
import { useBattle, submitPlayerAction, endBattle, getBattleEnergy, setBattleInputHandler, type BattleInput } from "@/lib/gamebook/yellow/store/battleStore"
import { speciesOf, maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { BattleMon } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import { ITEMS } from "@/lib/gamebook/yellow/data/items"
import AttackFx from "./AttackFx"
import EncounterTransition from "./EncounterTransition"
import VictoryCelebration from "./VictoryCelebration"
import PvpRecap from "./PvpRecap"
import { pickAttackFx, type AttackFxSpec } from "@/lib/gamebook/yellow/data/attackAnims"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { TYPE_COLORS } from "../dex/dexShared"
import { moveCostReps, STRUGGLE_INDEX } from "@/lib/gamebook/yellow/data/combatCostConfig"

type Menu = "root" | "moves" | "switch" | "bag" | "confirmRun"

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
    POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte", ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon",
}

export default function BattleScreen() {
    const battle = useBattle()
    const [step, setStep] = useState(0)
    const [menu, setMenu] = useState<Menu>("root")
    const [disp, setDisp] = useState<DispHp | null>(null)
    // Index du Daemon AFFICHÉ par côté pendant le playback (suit les switchIn) → on ne
    // montre pas le Daemon suivant avant son annonce / on garde le bon sprite & barre.
    const [dispIdx, setDispIdx] = useState<{ p: number; e: number } | null>(null)
    const [shakeP, setShakeP] = useState(0)
    const [shakeE, setShakeE] = useState(0)
    const [ball, setBall] = useState<{ phase: "throw" | "shake" | "result" | "miss"; shakes: number; caught: boolean } | null>(null)
    const [cursor, setCursor] = useState(0)
    const [atkFx, setAtkFx] = useState<{ spec: AttackFxSpec; side: "player" | "enemy"; key: number } | null>(null)
    const atkKeyRef = useRef(0)
    const lastMoveSlotRef = useRef(0) // #3 : mémorise la dernière attaque choisie (rouvre dessus)
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
    const sendOutName = battle.enemySendOut ? displayName(battle.enemy.team[battle.enemySendOut.teamIndex]) : ""

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
    const throwBall = (itemId: string) => tryAct(() => { submitPlayerAction({ kind: "ball", itemId }); setMenu("root") })
    const doItem = (itemId: string) => tryAct(() => { submitPlayerAction({ kind: "item", itemId }); setMenu("root") })
    const run = () => tryAct(() => submitPlayerAction({ kind: "run" }))

    // Pendant le playback (animations de coups), on suit `disp` pour animer les barres.
    // Dès que le tour est résolu (playbackDone), on affiche TOUJOURS l'état réel et
    // frais des Daemon → plus jamais de PV/jauge "figés" sur une ancienne valeur.
    const pHp = playbackDone ? player.currentHp : (disp?.p ?? player.currentHp)
    const pMax = playbackDone ? maxHpOf(player) : (disp?.pMax ?? maxHpOf(player))
    const eHp = playbackDone ? enemy.currentHp : (disp?.e ?? enemy.currentHp)
    const eMax = playbackDone ? maxHpOf(enemy) : (disp?.eMax ?? maxHpOf(enemy))

    // L'ennemi est "aspiré" par la ball (lancer/secousses, et capture réussie).
    const enemyHiddenByBall = !!ball && (ball.phase === "throw" || ball.phase === "shake" || (ball.phase === "result" && ball.caught))

    // Énergie = LE MÊME portefeuille de reps que la jauge GameBoy (X/repsCap).
    // (Le cap d'énergie PAR COMBAT reste géré côté store et affiché dans le menu Attaque.)
    const reps = repsWallet.reps
    const repsCap = repsWallet.repsCap
    const walletPct = Math.max(0, Math.min(100, (reps / Math.max(1, repsCap)) * 100))

    // ===== Options du menu courant (liste unifiée pilotable au curseur) =====
    const energy = getBattleEnergy()
    const remainingEnergy = Math.max(0, energy.cap - energy.spent)
    const items = repsWallet.items
    type Opt = { label: React.ReactNode; onSelect: () => void; disabled?: boolean; right?: string; moveSlot?: number }
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
            // En PvP (v1) : ni SAC ni FUITE (move/switch only ; quitter = abandon).
            if (!battle.pvp) options.push({ label: "🎒 SAC", onSelect: () => setMenu("bag") })
            options.push({ label: "🐾 DAEMON", onSelect: () => setMenu("switch") })
            if (!battle.pvp) {
                // FUITE → écran de confirmation (évite la fuite accidentelle).
                options.push({ label: "🏃 FUITE", onSelect: () => setMenu("confirmRun"), disabled: !battle.isWild })
            }
        } else if (menu === "moves") {
            const costs = player.moves.map((s) => moveCostReps(getMove(s.moveId)?.power ?? 0, player.level))
            // PvP (user vs user) = énergie ILLIMITÉE pendant le combat : aucune attaque grisée
            // (la déduction de reps est déjà sautée côté store pour le PvP).
            const canUse = (c: number) => battle.pvp || (c <= reps && c <= remainingEnergy)
            // À court d'énergie → Charge Désespérée EN PREMIER (ergonomie : plus en 5e position).
            if (!costs.some(canUse)) options.push({ label: "💥 Charge Désespérée (gratuit)", onSelect: doStruggle })
            player.moves.forEach((slot, i) => {
                const mv = getMove(slot.moveId)
                options.push({
                    label: `${mv?.name ?? slot.moveId}${battle.pvp ? "" : `  ⚡${costs[i]}`}`,
                    right: TYPE_FR[mv?.type ?? ""] ?? "",
                    onSelect: () => doMove(i), disabled: !canUse(costs[i]), moveSlot: i,
                })
            })
            options.push({ label: "← RETOUR", onSelect: () => setMenu("root") })
            canBack = true
        } else if (menu === "bag") {
            const owned = (id: string) => (items[id] ?? 0) > 0
            // Soins de PV (désactivés à PV pleins)
            Object.values(ITEMS).filter((it) => it.category === "HEAL" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => doItem(it.id), disabled: player.currentHp >= maxHpOf(player) }))
            // Anti-statut (désactivés si aucun statut)
            Object.values(ITEMS).filter((it) => it.category === "STATUS_HEAL" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => doItem(it.id), disabled: player.status === "NONE" }))
            // Objets X (boost de stat)
            Object.values(ITEMS).filter((it) => it.category === "BOOST" && owned(it.id))
                .forEach((it) => options.push({ label: `${it.name} ×${items[it.id]}`, onSelect: () => doItem(it.id) }))
            if (battle.isWild) Object.values(ITEMS).filter((it) => it.category === "BALL" && owned(it.id))
                .forEach((b) => options.push({ label: `${b.name} ×${items[b.id]}`, onSelect: () => throwBall(b.id) }))
            options.push({ label: "← RETOUR", onSelect: () => setMenu("root") })
            canBack = true
        } else if (menu === "confirmRun") {
            // "Annuler" en premier → le curseur démarre dessus (défaut sûr : un
            // appui A réflexe annule la fuite au lieu de la confirmer).
            options.push({ label: "← Annuler", onSelect: () => setMenu("root") })
            options.push({ label: "🏃 Confirmer la fuite", onSelect: run })
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
        if (!playbackDone) { if (a === "a" || a === "b") advance(); return }
        if (a === "up" || a === "left") stepCursor(-1)
        else if (a === "down" || a === "right") stepCursor(1)
        else if (a === "a") { const o = options[cursor]; if (o && !o.disabled) o.onSelect() }
        else if (a === "b" && canBack) setMenu("root")
    }

    return (
        <div style={S.root} onClick={waitingForTap ? advance : undefined}>
            {/* ===== Bandeau énergie (= portefeuille de reps, identique à la coque) ===== */}
            <div style={S.energyBar}>
                <span style={{ fontSize: 13 }}>⚡</span>
                <div style={S.energyTrack}><div style={{ ...S.energyFill, width: `${walletPct}%` }} /></div>
                <span style={S.energyTxt}>{reps}/{repsCap}</span>
            </div>

            {/* ===== Scène ===== */}
            <div style={S.scene}>
                {/* Sauvage : 1 seul ennemi → le pip d'équipe est inutile. On affiche plutôt le statut
                    Pokédex : pokéball ROUGE = espèce déjà capturée, pokéball grisée = encore à attraper. */}
                {battle.isWild
                    ? <WildDexPip caught={dex.caught.includes(enemy.speciesId)} />
                    : <TeamPips team={battle.enemy.team} activeIdx={eIdx} activeHp={eHp} align="left" />}
                <div style={S.enemyRow}>
                    {/* key sur l'uid : au changement de Daemon (switchIn), la barre se REMONTE
                        nette au lieu d'animer 0%→100% (le "flash plein" perçu à chaque K.O.). */}
                    <MonInfo key={enemy.uid} mon={enemy} hp={eHp} max={eMax} />
                    <div style={S.enemySpot}>
                        {!enemyHiddenByBall && <MonSprite mon={enemy} facing="front" alive={eHp > 0} hitKey={shakeE} />}
                        {ball && <BallAnim phase={ball.phase} shakes={ball.shakes} caught={ball.caught} />}
                    </div>
                </div>
                <div style={S.playerRow}>
                    {/* victory : halo doré pulsé sur le gagnant en PvP, visible le temps du fondu du recap. */}
                    <MonSprite mon={player} facing="back" alive={pHp > 0} hitKey={shakeP} victory={playbackDone && playerWon && battle.pvp} />
                    <MonInfo key={player.uid} mon={player} self hp={pHp} max={pMax} />
                </div>
                <TeamPips team={battle.player.team} activeIdx={pIdx} activeHp={pHp} align="right" />
                {atkFx && <AttackFx key={atkFx.key} spec={atkFx.spec} attackerSide={atkFx.side} onDone={() => setAtkFx(null)} />}
                {/* Transition pré-combat : RENDUE DANS la scène (overflow:hidden) → elle fait
                    pile la taille du cadre de combat, plus le plein écran. */}
                <EncounterTransition />
                {/* PvP : recap "commentateur" RICHE pour les DEUX joueurs (gagnant ET perdant, version
                    adaptée). Hors PvP : célébration GOAT/FLOP UNIQUEMENT contre les Dresseurs ; en combat
                    SAUVAGE (KO sauvage, capture, fuite) → fin sobre, juste le message + QUITTER. */}
                {playbackDone && (battle.pvp
                    ? (isEnded && <PvpRecap won={playerWon} playerTeam={battle.player.team} enemyTeam={battle.enemy.team} onClose={() => endBattle()} />)
                    : (playerWon && !battle.isWild && <VictoryCelebration team={battle.player.team} />))}
            </div>

            {/* ===== Boîte du bas : message OU liste d'options (curseur D-pad/A/B + tactile) ===== */}
            <div style={S.bottom}>
                {!playbackDone ? (
                    <div style={S.msgBox} onClick={advance}>
                        <p style={S.msgText}>{shownMsg}</p>
                        {waitingForTap && <span style={S.next}>▶</span>}
                    </div>
                ) : (
                    <>
                        {/* Ligne d'info : TOUJOURS rendue (hauteur réservée) → les
                            options gardent exactement le même Y d'un menu à l'autre. */}
                        <div style={S.menuHint}>
                            {isEnded ? (
                                <span>{battle.outcome === "win" ? "Tu remportes le combat !" : battle.outcome === "lose" ? "Tous tes Daemons sont K.O…" : battle.outcome === "run" ? "Tu as pris la fuite." : battle.outcome === "enemyfled" ? "Le Daemon a pris la fuite !" : battle.outcome === "caught" ? "Daemon capturé !" : "Fin du combat."}</span>
                            ) : needSwitch ? (
                                <span>Choisis un Daemon !</span>
                            ) : awaitSendOut ? (
                                <span>{menu === "switch" ? "Choisis un Daemon !" : `L'adversaire envoie ${sendOutName} !`}</span>
                            ) : menu === "confirmRun" ? (
                                <span>Fuir le combat ? (B = annuler)</span>
                            ) : menu === "moves" ? (
                                battle.pvp
                                    ? <><span>⚡ ∞ — combat amical</span><span></span></>
                                    : <><span>⚡ {remainingEnergy}/{energy.cap} ce combat</span><span>💪 {reps}</span></>
                            ) : <span>&nbsp;</span>}
                        </div>
                        <div style={S.optList}>
                            {options.map((o, i) => (
                                <button
                                    key={i}
                                    style={{ ...(o.disabled ? S.btnDim : S.btn), ...(i === cursor ? S.btnFocus : null) }}
                                    disabled={o.disabled}
                                    onClick={() => { setCursor(i); if (!o.disabled) o.onSelect() }}
                                >
                                    <span style={{ opacity: i === cursor ? 1 : 0, flexShrink: 0 }}>▶ </span>
                                    <span style={{ flex: 1, textAlign: "left" }}>{o.label}</span>
                                    {o.right ? <span style={{ opacity: 0.5, fontWeight: 600, fontSize: 11, marginLeft: 8, flexShrink: 0 }}>{o.right}</span> : null}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
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

// ============================================================
// Sous-composants
// ============================================================

function MonInfo({ mon, self, hp, max }: { mon: BattleMon; self?: boolean; hp: number; max: number }) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100))
    const col = pct > 50 ? "#48c048" : pct > 20 ? "#f0c040" : "#e04040"
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
            <div style={S.hpRow}>
                <span style={S.hpLabel}>PV</span>
                <div style={S.hpTrack}><div style={{ ...S.hpFill, width: `${pct}%`, background: col }} /></div>
            </div>
            {/* Chiffre des PV ENTRE la barre de PV et la barre d'XP (lisibilité). */}
            {self && <div style={S.hpNum}>{Math.max(0, Math.round(hp))}/{max}</div>}
            {/* Mini barre d'XP (joueur uniquement) → on voit si le Daemon est proche du niveau suivant. */}
            {self && (() => {
                const cur = expForLevel(mon.level), nxt = expForLevel(mon.level + 1)
                // plancher du niveau : un Daemon créé/capturé à exp=0 montre 0% (et non une barre faussée).
                const eff = Math.max(mon.exp ?? cur, cur)
                const xpPct = nxt > cur ? Math.max(0, Math.min(100, ((eff - cur) / (nxt - cur)) * 100)) : 0
                return (
                    <div style={S.xpRow}>
                        <span style={S.xpLabel}>XP</span>
                        <div style={S.xpTrack}><div style={{ ...S.xpFill, width: `${xpPct}%` }} /></div>
                    </div>
                )
            })()}
            {hp > 0 && mon.status !== "NONE" && <span style={S.statusTag}>{mon.status}</span>}
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

// Indicateur Pokédex en combat SAUVAGE : pokéball ROUGE = espèce déjà capturée,
// pokéball grisée/transparente = pas encore attrapée (remplace le pip d'équipe à 1, inutile).
function WildDexPip({ caught }: { caught: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 6px", minHeight: 16 }}
            title={caught ? "Espèce déjà capturée" : "Espèce pas encore capturée"}>
            <div style={{
                position: "relative", width: 15, height: 15, borderRadius: "50%",
                border: "2px solid #1c1408", overflow: "hidden", background: "#f5f5f5",
                opacity: caught ? 1 : 0.45, filter: caught ? "none" : "grayscale(1)",
                boxShadow: caught ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
            }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: caught ? "linear-gradient(#e8503a,#c8301a)" : "#9a9a9a" }} />
                <div style={{ position: "absolute", top: "calc(50% - 1px)", left: 0, right: 0, height: 2, background: "#1c1408" }} />
                <div style={{ position: "absolute", top: "calc(50% - 3px)", left: "calc(50% - 3px)", width: 6, height: 6, borderRadius: "50%", background: "#f8f8e8", border: "1px solid #1c1408" }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: caught ? "#1c1408" : "#3a8ee0", opacity: 0.85 }}>
                {caught ? "CAPTURÉ" : "NOUVEAU !"}
            </span>
        </div>
    )
}

function MonSprite({ mon, facing, alive, hitKey, victory }: { mon: BattleMon; facing: "front" | "back"; alive: boolean; hitKey: number; victory?: boolean }) {
    // Sprite PNG (public/) avec repli sur l'initiale si le fichier manque.
    // `key={hitKey}` force un remount à chaque coup encaissé → l'animation de tremblement rejoue.
    const sp = speciesOf(mon)
    const [err, setErr] = useState(false)
    return (
        // Wrapper keyé sur l'uid : remonte à chaque ENTRÉE de Daemon (combat/switch)
        // → joue l'anim "monEnter" (chute + rebond). Le shake reste sur le div interne.
        <div key={mon.uid} style={{ animation: "monEnter 0.42s cubic-bezier(.17,.67,.33,.99)" }}>
            <div
                key={hitKey}
                style={{
                    ...(err ? S.sprite : S.spriteBox),
                    position: "relative",
                    opacity: alive ? 1 : 0.25,
                    transform: facing === "back" ? "scaleX(-1)" : "none",
                    // Victoire : halo doré pulsé (PRIME sur le shake) ; ne pulse QUE le filtre → préserve le scaleX du dos.
                    animation: victory ? "victoryPulse 1.2s ease-in-out infinite" : hitKey > 0 ? "hitShake 0.3s ease-in-out" : "none",
                }}
            >
                {err
                    ? <span style={S.spriteGlyph}>{sp.name[0]}</span>
                    : <img src={sp.sprite} alt={sp.name} onError={() => setErr(true)}
                        style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", ...(mon.shiny ? { filter: "saturate(1.7) hue-rotate(35deg) drop-shadow(0 0 5px gold)" } : {}) }} />}
                {/* CHROMATIQUE (shiny) : ✨ scintillantes par-dessus le sprite (le filtre recolore l'image). */}
                {mon.shiny && !err && <span style={{ position: "absolute", top: -2, right: 0, fontSize: 18, animation: "victoryPulse 1.3s ease-in-out infinite", pointerEvents: "none" }}>✨</span>}
            </div>
        </div>
    )
}


// ============================================================
// Styles (GBC-ish, inline pour rester autonome)
// ============================================================

// Nexus-Ball animée : lancer (arc) → secousses (×N) → clic (capturé) ou éclatement (raté).
// "miss" = lancer COMPLÈTEMENT raté : la ball part de travers, frôle la cible et sort de l'écran.
function BallAnim({ phase, shakes, caught }: { phase: "throw" | "shake" | "result" | "miss"; shakes: number; caught: boolean }) {
    const anim = phase === "throw" ? "ballThrow 0.6s ease-out forwards"
        : phase === "shake" ? `ballShake 0.42s ease-in-out ${Math.max(0, shakes)}`
            : phase === "miss" ? "ballMiss 0.9s ease-in forwards"
                : caught ? "ballCaught 0.8s ease-out forwards"
                    : "ballEscape 0.6s ease-out forwards"
    return (
        <div style={{ ...S.ball, animation: anim }}>
            <div style={S.ballTop} />
            <div style={S.ballBand} />
            <div style={S.ballBtn} />
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { width: "100%", maxWidth: 460, margin: "0 auto", fontFamily: "'Courier New', monospace", color: "#1c1408", userSelect: "none" },
    scene: { background: "linear-gradient(#9bd0e0 0%, #c8e89c 60%, #a8d878 100%)", border: "3px solid #1c1408", borderRadius: 6, padding: 14, display: "flex", flexDirection: "column", gap: 18, minHeight: 240, position: "relative", overflow: "hidden" },
    enemyRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    playerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    energyBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#1c1408", border: "2px solid #1c1408", borderRadius: 8, padding: "5px 10px" },
    energyTrack: { flex: 1, height: 12, background: "#3a2c18", borderRadius: 6, overflow: "hidden", border: "1px solid #000" },
    energyFill: { height: "100%", background: "linear-gradient(90deg,#ffe24a,#ff9500)", transition: "width 0.3s ease" },
    energyTxt: { fontSize: 11, fontWeight: 700, color: "#f5d020", minWidth: 92, textAlign: "right" },
    enemySpot: { position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" },
    ball: { position: "absolute", width: 38, height: 38, borderRadius: "50%", background: "#f5f5f5", border: "2px solid #1c1408", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" },
    ballTop: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(#e8503a,#c8301a)" },
    ballBand: { position: "absolute", top: "calc(50% - 2px)", left: 0, right: 0, height: 4, background: "#1c1408" },
    ballBtn: { position: "absolute", top: "calc(50% - 5px)", left: "calc(50% - 5px)", width: 10, height: 10, borderRadius: "50%", background: "#f8f8e8", border: "2px solid #1c1408" },
    info: { background: "#f8f8e8", border: "2px solid #1c1408", borderRadius: 6, padding: "6px 10px", minWidth: 160 },
    infoTop: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 700 },
    monName: { letterSpacing: 1 },
    monLvl: { opacity: 0.8 },
    typeRow: { display: "flex", gap: 4, marginTop: 3 },
    typeChip: { fontSize: 8, fontWeight: 700, color: "#fff", padding: "1px 5px", borderRadius: 3, letterSpacing: 0.5, textShadow: "0 1px 1px rgba(0,0,0,0.45)" },
    hpRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
    hpLabel: { fontSize: 9, fontWeight: 700, color: "#c89000" },
    hpTrack: { flex: 1, height: 7, background: "#404040", borderRadius: 4, overflow: "hidden", border: "1px solid #1c1408" },
    hpFill: { height: "100%", transition: "width 0.4s ease" },
    hpNum: { textAlign: "right", fontSize: 10, fontWeight: 700, marginTop: 2 },
    xpRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 2 },
    xpLabel: { fontSize: 8, fontWeight: 700, color: "#5a9fe0" },
    xpTrack: { flex: 1, height: 4, background: "#404040", borderRadius: 3, overflow: "hidden", border: "1px solid #1c1408" },
    xpFill: { height: "100%", background: "#4a9fe0", transition: "width 0.4s ease" },
    statusTag: { display: "inline-block", marginTop: 3, fontSize: 8, fontWeight: 700, background: "#8868c0", color: "#fff", padding: "1px 5px", borderRadius: 3, letterSpacing: 1 },
    sprite: { width: 72, height: 72, borderRadius: "50%", background: "#ffffff80", border: "3px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center" },
    spriteBox: { width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" },
    spriteGlyph: { fontSize: 34, fontWeight: 900 },
    // Hauteur réservée pour 4 options + la ligne d'info → la zone du bas ne change
    // pas de taille selon le menu (pas de "saut" des options entre écrans).
    bottom: { marginTop: 8, minHeight: 248 },
    msgBox: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: 14, minHeight: 72, display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", position: "relative" },
    msgText: { fontSize: 14, lineHeight: 1.5, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 12, animation: "none" },
    menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    optList: { display: "flex", flexDirection: "column", gap: 6 },
    menuHint: { display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 18, fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4, color: "#1c1408" },
    btn: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: "11px 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1c1408", textAlign: "left", display: "flex", alignItems: "center" },
    btnDim: { background: "#d8d8c8", border: "3px solid #888", borderRadius: 6, padding: "11px 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#888", textAlign: "left", display: "flex", alignItems: "center" },
    btnFocus: { background: "#f5d020", borderColor: "#1c1408", boxShadow: "0 0 0 2px #f5d020" },
    pp: { float: "right", fontSize: 10, opacity: 0.7 },
}
