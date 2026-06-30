"use client"

// Nexus — Roulette EU MULTIJOUEUR (Phase 4). Table PARTAGÉE, serveur autoritatif :
//   - une MANCHE commune avec timer (fenêtre de mise) ; tout le monde mise en même temps
//   - on VOIT les mises des autres en direct ; le serveur tire UN numéro (RNG secret serveur)
//   - TOUT LE MONDE voit le MÊME résultat ; chacun est payé selon ses mises
// Transport : polling /state (source de vérité) + Pusher (accélérateur best-effort).
// Énergie : custody CÔTÉ CLIENT — débit à la validation (serveur accepté), crédit du gain à la
// résolution via une réconciliation IDEMPOTENTE par manche (markRouletteClaimed) robuste au refresh.

import { useCallback, useEffect, useRef, useState } from "react"
import { usePlayer, grantReps, markRouletteClaimed, peekRouletteLuck, decrementRouletteLuck, fundRouletteBet, addCasinoWon, convertAllTicketsToCredit } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { colorOf } from "@/lib/gamebook/yellow/roulette/wheel"
import { type Bet, PAYOUT, betWins, straight, dozen, column, red, black, even, odd, low, high, minStakeForType, OUTSIDE_MIN_BET } from "@/lib/gamebook/yellow/roulette/bets"
import RouletteWheel from "./RouletteWheel"

const CHANNEL = "gamebook-yellow_roulette"
const POLL_MS = 1500
// Mises rapides (toutes ≤ 50). La mise fine se règle au stepper −/+ (1 à 50).
const CHIPS = [1, 5, 10, 25, 50] as const
const STAKE_MIN = 1
const STAKE_MAX = 50

// mm:ss pour le compte à rebours de la manche (10 min → "9:32").
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

interface PlayerBets { userId: string; nickname: string; staked: number; bets: Bet[]; net: number | null; ready: boolean }
interface RoundResult { roundId: string; winningNumber: number; winningColor: string; closedAt: number; players: Array<{ userId: string; nickname: string; staked: number; net: number }> }
interface StatePayload {
    round: { id: string; status: string; startedAt: number; closesAt: number; serverNow: number; winningNumber: number | null; winningColor: string | null }
    bets: PlayerBets[]
    recentResults: RoundResult[]
}

// Disposition standard du tapis : 3 rangées (haut 3,6,…36 / milieu 2,5,…35 / bas 1,4,…34).
const GRID_ROWS: number[][] = [
    Array.from({ length: 12 }, (_, c) => 3 * c + 3),
    Array.from({ length: 12 }, (_, c) => 3 * c + 2),
    Array.from({ length: 12 }, (_, c) => 3 * c + 1),
]

// UNE COULEUR PAR JOUEUR (jetons sur le tapis). MOI = vert signature ; les autres piochent dans la palette
// dans l'ordre de la table (stable sur la manche). Le contraste texte (clair/sombre) suit la couleur.
const ME_COLOR = "#28d07a"
const PLAYER_PALETTE = ["#e0c020", "#3a9ae0", "#e0683a", "#b06ae0", "#e03a8a", "#3ad0d0", "#a0d020"]
function darkText(hex: string): boolean { // texte foncé sur jeton clair (jaune/vert), clair sinon
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    return r * 0.299 + g * 0.587 + b * 0.114 > 150
}
// Couleur STABLE par joueur (hash du userId → palette). MOI = vert signature.
function colorForUser(userId: string, myUserId: string): string {
    if (userId === myUserId) return ME_COLOR
    let h = 0
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
    return PLAYER_PALETTE[h % PLAYER_PALETTE.length]
}
// Jeton à afficher sur une case (issu du snapshot de la manche en résolution).
interface ChipView { key: string; color: string; value: number; won: boolean; mine: boolean }
// Numéro misé à surligner sur la ROUE : couleur (du parieur), `mine`, et `payout` = MEILLEUR multiplicateur
// d'un pari qui le couvre (35 plein … 1 chance simple) → pilote l'INTENSITÉ du surlignage (gros gain = vif).
type NumberMark = { mine: boolean; color: string; payout: number }
// Snapshot des mises d'une manche en cours de résolution (figé à l'arrêt des mises).
interface BetsSnap { roundId: string; winning: number; chipsByZone: Record<string, ChipView[]>; marks: Record<number, NumberMark> }
type SettlePhase = "" | "lose" | "win" | "coins"

// Numéros COUVERTS par les mises (pour les surligner sur la roue). Priorité : MES mises d'abord (toujours
// visibles), puis — à statut égal — le plus gros payout (le numéro qui peut rapporter le plus l'emporte).
function buildMarks(players: { userId: string; bets: Bet[] }[], myUserId: string): Record<number, NumberMark> {
    const marks: Record<number, NumberMark> = {}
    for (const p of players) {
        const mine = p.userId === myUserId
        const color = colorForUser(p.userId, myUserId)
        for (const b of p.bets) {
            const pay = PAYOUT[b.type]
            for (const n of b.numbers) {
                const ex = marks[n]
                if (!ex || (mine && !ex.mine) || (mine === ex.mine && pay > ex.payout)) marks[n] = { mine, color, payout: pay }
            }
        }
    }
    return marks
}

// Agrège les mises de plusieurs joueurs en jetons-par-case (un jeton par joueur ayant misé sur la case).
// `winning` = numéro sorti (null pendant la prise de mises → aucun gagnant marqué).
function buildChipsByZone(players: { userId: string; bets: Bet[] }[], winning: number | null, myUserId: string): Record<string, ChipView[]> {
    const map: Record<string, ChipView[]> = {}
    for (const p of players) {
        const color = colorForUser(p.userId, myUserId)
        const mine = p.userId === myUserId
        for (const b of p.bets) {
            (map[b.zoneId] ??= []).push({ key: `${p.userId}:${b.zoneId}`, color, value: b.chips, won: winning != null && betWins(b, winning), mine })
        }
    }
    return map
}

export default function RouletteMultiTable({ myUserId, onClose }: { myUserId: string; onClose: () => void }) {
    const player = usePlayer()
    const [state, setState] = useState<StatePayload | null>(null)
    const [chip, setChip] = useState<number>(5)
    const [pending, setPending] = useState<Record<string, Bet>>({})
    const [validatedRound, setValidatedRound] = useState<string | null>(null)
    const [reveal, setReveal] = useState<{ winning: number; color: string; net: number } | null>(null)
    const [spin, setSpin] = useState<{ key: string; winning: number; color: string; net: number | null } | null>(null)
    const [flash, setFlash] = useState<string>("")
    const [now, setNow] = useState<number>(Date.now())
    const [busy, setBusy] = useState(false)
    const [launching, setLaunching] = useState(false) // "Lancer la balle" (solo) en cours

    const offsetRef = useRef(0)          // serverNow - Date.now() (anti dérive d'horloge)
    const prevRoundRef = useRef<string>("")
    const lastSpunRef = useRef<string>("") // dernière manche déjà animée sur la roue
    const wheelInitRef = useRef(false)     // 1er applyState : on affiche le dernier résultat SANS l'animer
    const launchRef = useRef<HTMLButtonElement>(null) // bouton "Lancer la balle" → scroll auto à l'apparition
    // CRÉDIT DIFFÉRÉ : gain de la manche EN COURS D'ANIMATION, payé SEULEMENT quand la bille s'arrête
    // (onDone) — surtout PAS quand le résultat serveur arrive (sinon l'énergie tombe avant la fin du tour).
    const pendingCreditRef = useRef<{ roundId: string; staked: number; net: number; solo: boolean } | null>(null)

    // SÉQUENCE DE RÉSOLUTION (après l'arrêt de la bille) : on garde les jetons de la manche à l'écran, on
    // efface les perdants un par un, on fait clignoter les gagnants, pluie de pièces, PUIS on crédite.
    const [betsSnap, setBetsSnap] = useState<BetsSnap | null>(null) // mises figées de la manche en résolution
    const betsSnapRef = useRef<BetsSnap | null>(null) // miroir (lu par la séquence de résolution sans dépendances)
    const [settlePhase, setSettlePhase] = useState<SettlePhase>("") // "" pendant le spin, puis lose→win→coins
    const [hiddenChips, setHiddenChips] = useState<Set<string>>(new Set()) // jetons perdants déjà retirés
    const [coinFx, setCoinFx] = useState<{ count: number; big: boolean }>({ count: 0, big: false }) // ampleur de la pluie de pièces (∝ ratio gain/mise)
    const liveBetsRef = useRef<{ roundId: string; bets: PlayerBets[] }>({ roundId: "", bets: [] }) // dernières mises de la manche OUVERTE (pour figer le snapshot)
    const settleTimersRef = useRef<number[]>([]) // timers de la séquence (nettoyés au démontage / nouveau spin)
    const clearSettleTimers = () => { settleTimersRef.current.forEach((id) => clearTimeout(id)); settleTimersRef.current = [] }

    // Horloge locale (countdown fluide).
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

    // Crédite (UNE fois) le gain en attente. Appelé à l'arrêt de la bille (onDone) ET au démontage (si on
    // ferme la table en plein spin → on ne perd pas le gain). markRouletteClaimed garantit l'idempotence.
    const creditPending = useCallback(() => {
        const pc = pendingCreditRef.current
        pendingCreditRef.current = null
        if (!pc || !markRouletteClaimed(pc.roundId)) return
        const ret = pc.staked + pc.net // mise remboursée + gain net (net<0 = perte déjà actée au débit)
        if (ret > 0) grantReps(ret)
        if (pc.net > 0) addCasinoWon(pc.net) // 🥚 le gain net fait progresser la quête Tonytony (compte tenu par le croupier)
        if (pc.solo && pc.net > 0) decrementRouletteLuck(pc.net) // chance potion (secret) : récup jusqu'au prix payé
        persistYellowSave()
    }, [])
    // Démontage (fermeture de la table) : on coupe la séquence en cours et on crédite un éventuel gain en
    // attente (markRouletteClaimed garantit qu'on ne le verse pas deux fois) → jamais de perte.
    useEffect(() => () => { clearSettleTimers(); creditPending() }, [creditPending])

    // SÉQUENCE DE RÉSOLUTION (déclenchée à l'arrêt de la bille). Les jetons restent à l'écran, puis :
    //   1) les PERDANTS s'effacent un par un (on voit clairement les mises perdues) ;
    //   2) les GAGNANTS clignotent en surbrillance ;
    //   3) une pluie de PIÈCES tombe (si j'ai gagné) ;
    //   4) SEULEMENT ALORS on crédite le gain (creditPending) et on dévoile le résultat.
    const startSettlement = useCallback((spinInfo: { winning: number; color: string; net: number | null }) => {
        clearSettleTimers()
        const finish = () => {
            creditPending() // ⚡ l'énergie n'arrive qu'ICI, tout à la fin (jamais avant)
            if (spinInfo.net != null) setReveal({ winning: spinInfo.winning, color: spinInfo.color, net: spinInfo.net })
            betsSnapRef.current = null; setBetsSnap(null); setSettlePhase(""); setHiddenChips(new Set())
        }
        const snap = betsSnapRef.current
        if (!snap) { finish(); return } // pas de jetons à animer (chargement statique) → crédit direct
        const losers: string[] = []
        let anyWinner = false
        for (const chips of Object.values(snap.chipsByZone)) for (const c of chips) { if (c.won) anyWinner = true; else losers.push(c.key) }
        setSettlePhase("lose")
        let acc = 0
        for (const key of losers) { acc += 150; settleTimersRef.current.push(window.setTimeout(() => setHiddenChips((s) => { const n = new Set(s); n.add(key); return n }), acc)) }
        acc += 250
        settleTimersRef.current.push(window.setTimeout(() => setSettlePhase("win"), acc)) // gagnants en surbrillance
        acc += anyWinner ? 1000 : 250
        if ((spinInfo.net ?? 0) > 0) {
            // SPECTACLE ∝ RATIO gain/mise : un plein (×35) déclenche une avalanche longue ; une chance simple (×1), une poignée.
            const staked = pendingCreditRef.current?.staked ?? 0
            const ratio = staked > 0 ? (spinInfo.net as number) / staked : 1
            const count = Math.max(10, Math.min(80, Math.round(8 + ratio * 1.9)))
            const big = ratio >= 10
            const coinsDur = Math.max(1400, Math.min(3400, Math.round(900 + ratio * 60)))
            settleTimersRef.current.push(window.setTimeout(() => { setCoinFx({ count, big }); setSettlePhase("coins") }, acc))
            acc += coinsDur
        }
        settleTimersRef.current.push(window.setTimeout(finish, acc))
    }, [creditPending])

    const applyState = useCallback((data: StatePayload) => {
        offsetRef.current = data.round.serverNow - Date.now()
        setState(data)

        // Nouvelle manche → on libère la composition de mises.
        if (data.round.id !== prevRoundRef.current) {
            prevRoundRef.current = data.round.id
            setPending({})
            // déjà misé sur cette manche (ex. après refresh) ? → on verrouille.
            const mine = data.bets.find((b) => b.userId === myUserId)
            setValidatedRound(mine ? data.round.id : null)
        }

        // Quelle manche DÉMARRE une animation ce cycle ? (nouvelle manche résolue, hors 1er chargement statique)
        const latest = data.recentResults[0]
        const startingSpin = latest && wheelInitRef.current && latest.roundId !== lastSpunRef.current ? latest.roundId : null
        // Manche dont le crédit est DIFFÉRÉ jusqu'à l'arrêt de la bille (celle qui démarre OU qui anime déjà).
        const deferId = startingSpin ?? pendingCreditRef.current?.roundId ?? null

        // SNAPSHOT des mises de la manche qui démarre son tour : on prend les dernières mises connues quand
        // elle était OUVERTE (liveBetsRef), pour garder les jetons (moi + autres) à l'écran pendant le spin.
        const snapSource: PlayerBets[] = startingSpin
            ? (liveBetsRef.current.roundId === startingSpin ? liveBetsRef.current.bets
                : data.round.id === startingSpin ? data.bets : [])
            : []

        // Réconciliation des GAINS : crédite chaque manche résolue où j'ai misé, UNE fois — SAUF la manche
        // en cours d'animation (créditée seulement à l'arrêt de la bille, cf. creditPending/onDone). Sans ce
        // saut, l'énergie tomberait DÈS l'arrivée du résultat serveur, avant la fin du tour (le bug signalé).
        for (const r of data.recentResults) {
            const mine = r.players.find((p) => p.userId === myUserId)
            if (!mine) continue
            if (r.roundId === deferId) continue // ⏳ crédit différé → onDone
            if (markRouletteClaimed(r.roundId)) {
                const ret = mine.staked + mine.net      // mise remboursée + gain net (net<0 = perte déjà actée au débit)
                if (ret > 0) grantReps(ret)
                // CHANCE potion (secret) : si SEUL sur la manche et gain net, on récupère jusqu'au prix payé.
                if (r.players.length === 1 && mine.net > 0) decrementRouletteLuck(mine.net)
                persistYellowSave()
            }
        }

        // ROUE ANIMÉE : au TOUT 1er applyState on affiche le dernier résultat SANS l'animer (spinKey "") ;
        // ensuite CHAQUE nouvelle manche résolue déclenche un vrai tour — y compris le tout 1er résultat d'une
        // table vierge (ex. mon propre "Lancer la balle"). Numéro = seed serveur ; gain crédité à l'arrêt.
        if (!wheelInitRef.current) {
            wheelInitRef.current = true
            if (latest) {
                lastSpunRef.current = latest.roundId
                setSpin({ key: "", winning: latest.winningNumber, color: latest.winningColor, net: null })
            }
        } else if (startingSpin) {
            lastSpunRef.current = startingSpin
            const mine = latest!.players.find((p) => p.userId === myUserId)
            // Mémorise le gain à payer À L'ARRÊT de la bille (jamais maintenant).
            pendingCreditRef.current = mine ? { roundId: startingSpin, staked: mine.staked, net: mine.net, solo: latest!.players.length === 1 } : null
            setSpin({ key: startingSpin, winning: latest!.winningNumber, color: latest!.winningColor, net: mine ? mine.net : null })
            // Fige les jetons de la manche (où + combien chacun a misé) pour les afficher pendant le spin,
            // puis la séquence de résolution (perdants effacés → gagnants en surbrillance → pièces → crédit).
            clearSettleTimers(); setHiddenChips(new Set()); setSettlePhase("")
            const snap: BetsSnap = { roundId: startingSpin, winning: latest!.winningNumber, chipsByZone: buildChipsByZone(snapSource, latest!.winningNumber, myUserId), marks: buildMarks(snapSource, myUserId) }
            betsSnapRef.current = snap; setBetsSnap(snap)
        }

        // Mémorise les mises de la manche OUVERTE courante (source du prochain snapshot). Placé en fin :
        // le snapshot ci-dessus a déjà lu la valeur de la manche PRÉCÉDENTE.
        liveBetsRef.current = { roundId: data.round.id, bets: data.bets }
    }, [myUserId])

    const refetch = useCallback(async () => {
        try {
            const res = await fetch("/api/gamebook/yellow/roulette/state", { cache: "no-store" })
            if (!res.ok) return
            applyState((await res.json()) as StatePayload)
        } catch { /* réseau : on réessaiera au prochain tick */ }
    }, [applyState])

    // Polling + Pusher (refetch instantané sur event).
    useEffect(() => {
        refetch()
        const t = setInterval(refetch, POLL_MS)
        let unbind = () => {}
        if (PUSHER_CLIENT_ENABLED) {
            const client = getPusherClient()
            if (client) {
                const ch = client.subscribe(CHANNEL)
                const onAny = () => refetch()
                ch.bind("bet:placed", onAny); ch.bind("round:closed", onAny); ch.bind("round:open", onAny)
                unbind = () => { ch.unbind("bet:placed", onAny); ch.unbind("round:closed", onAny); ch.unbind("round:open", onAny) }
            }
        }
        return () => { clearInterval(t); unbind() }
    }, [refetch])

    const round = state?.round
    const remaining = round ? Math.max(0, Math.round((round.closesAt - (now + offsetRef.current)) / 1000)) : 0
    const open = !!round && round.status === "OPEN" && remaining > 0
    const locked = !!round && validatedRound === round.id
    const pendingList = Object.values(pending)
    const pendingTotal = pendingList.reduce((a, b) => a + b.chips, 0)

    // Jetons affichés sur le tapis : pendant le spin/résolution = snapshot figé (moi + autres, gagnants marqués) ;
    // pendant la prise de mises = mises EN DIRECT (les autres + mes jetons en cours) → on voit où & combien.
    const displayChips: Record<string, ChipView[]> = betsSnap
        ? betsSnap.chipsByZone
        : buildChipsByZone(
            [
                ...(state?.bets ?? []).filter((b) => b.userId !== myUserId && b.staked > 0).map((b) => ({ userId: b.userId, bets: b.bets })),
                { userId: myUserId, bets: pendingList },
            ],
            null, myUserId,
        )

    const addBet = (make: (chips: number) => Bet) => {
        if (!open || locked) return
        const b = make(chip)
        setPending((p) => {
            const ex = p[b.zoneId]
            return { ...p, [b.zoneId]: { ...b, chips: (ex?.chips ?? 0) + chip } }
        })
    }
    const clearPending = () => setPending({})

    const credit = player.labDefi.rouletteCredit
    // TICKETS TROUVÉS (jetons au sol, cadeaux de boss…) : convertibles en CRÉDIT divisible, jouable ici à la
    // vraie table (case par case). Chaque ticket apporte sa valeur de mise (10/20/30/50).
    const tickets = player.labDefi.grantedTickets
    const ticketTotal = tickets.reduce((a, b) => a + b, 0)
    const convertTickets = () => {
        const got = convertAllTicketsToCredit()
        if (got > 0) { persistYellowSave(); setFlash(`🎟️ ${tickets.length} ticket${tickets.length > 1 ? "s" : ""} convertis → +${got} ⚡ de crédit !`) }
    }
    const validate = async () => {
        if (!round || !open || locked || pendingTotal <= 0 || busy) return
        if (credit + player.reps < pendingTotal) { setFlash("Pas assez d'énergie."); return }
        // MINIMUM DE TABLE par case (style vrai casino) : 5 sur les chances extérieures, 1 sur les pleins.
        const below = pendingList.find((b) => b.chips < minStakeForType(b.type))
        if (below) { setFlash(`Mise mini sur cette case : ${minStakeForType(below.type)} ⚡ (chances extérieures = ${OUTSIDE_MIN_BET}).`); return }
        setBusy(true)
        try {
            // Jeton de chance (potion barman) : transmis UNIQUEMENT si le joueur est SEUL à parier sur la
            // manche (aucun autre parieur). Le serveur ne truque (plafonné) que dans ce cas — sinon manche juste.
            const soloSoFar = (state?.bets ?? []).every((b) => b.userId === myUserId)
            const luck = soloSoFar ? peekRouletteLuck() : null
            const res = await fetch("/api/gamebook/yellow/roulette/bet", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roundId: round.id, bets: pendingList, luck }),
            })
            if (res.ok) {
                // débit APRÈS acceptation serveur : crédit roulette OFFERT d'abord, puis reps. Si le solde a
                // chuté entre-temps (re-vérifié au débit), on n'enregistre PAS la mise comme validée.
                if (!fundRouletteBet(pendingTotal)) { setFlash("Fonds insuffisants au moment du débit — réessaie."); return }
                persistYellowSave()
                setValidatedRound(round.id)
                setFlash(`Mise validée : ${pendingTotal} ⚡`)
                refetch()
            } else {
                const j = await res.json().catch(() => ({}))
                setFlash(j.error === "round_closed" ? "Trop tard — rien ne va plus !" : j.error === "below_min" ? `Mise trop faible sur une case (chances extérieures : ${OUTSIDE_MIN_BET} ⚡ mini).` : "Mise refusée.")
            }
        } catch { setFlash("Réseau indisponible.") } finally { setBusy(false) }
    }

    // Mises agrégées par joueur (affichage social) + état "prêt".
    const others = (state?.bets ?? []).filter((b) => b.staked > 0)
    const myLocked = state?.bets.find((b) => b.userId === myUserId)
    const totalBettors = others.length
    const readyCount = others.filter((b) => b.ready).length
    const isSolo = totalBettors === 1 && others[0]?.userId === myUserId
    const iAmReady = !!myLocked?.ready
    // Bouton "Lancer la balle / Je suis prêt" : visible quand j'ai misé, la manche est ouverte, et je ne
    // me suis pas encore déclaré prêt. En multi : quand TOUS appuient, la roue part (sinon le timer 10 min).
    const canLaunch = !!round && locked && open && totalBettors >= 1 && !iAmReady
    const waitingOthers = !!round && locked && open && iAmReady && readyCount < totalBettors

    // La grande roue pousse le bouton sous le bord visible → on le ramène dans la vue dès qu'il apparaît.
    useEffect(() => { if (canLaunch) launchRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [canLaunch])

    // "Lancer la balle" : je me déclare prêt. Le serveur résout dès que TOUS les parieurs sont prêts.
    const launchBall = async () => {
        if (!round || !canLaunch || launching) return
        setLaunching(true)
        setFlash(isSolo ? "🎙️ Faites vos jeux… rien ne va plus !" : "🎙️ Tu es prêt — on attend les autres…")
        try {
            const res = await fetch("/api/gamebook/yellow/roulette/resolve", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roundId: round.id }),
            })
            const j = await res.json().catch(() => ({}))
            if (res.ok) {
                if (j.resolved) setFlash("🎙️ Rien ne va plus !")
                else setFlash(`En attente des autres joueurs… (${j.ready ?? readyCount}/${j.total ?? totalBettors} prêts)`)
                await refetch() // résolu → la roue tourne (applyState) ; sinon met à jour les "prêts"
            } else {
                setFlash(j.error === "already_resolved" ? "Déjà tiré !" : j.error === "no_bet" ? "Mise d'abord !" : "Lancement impossible.")
                refetch()
            }
        } catch { setFlash("Réseau indisponible.") } finally { setLaunching(false) }
    }

    return (
        <div style={S.overlay}>
            <div style={S.box}>
                <style>{"@keyframes rlBlink{0%,100%{box-shadow:0 0 0 2px #fff,0 0 10px 2px #ffd54a;transform:scale(1.18)}50%{box-shadow:0 0 0 1px #fff;transform:scale(1)}}@keyframes rlCoin{0%{transform:translateY(-30px) rotate(0deg);opacity:0}12%{opacity:1}100%{transform:translateY(520px) rotate(220deg);opacity:.15}}"}</style>
                {settlePhase === "coins" && <CoinRain count={coinFx.count} big={coinFx.big} />}
                <div style={S.head}>
                    <div style={S.title}>🎡 Roulette — Table multijoueur <span style={S.beta}>BÊTA</span></div>
                    <button style={S.x} onClick={onClose}>✕</button>
                </div>

                {/* Bandeau manche + timer */}
                <div style={S.bar}>
                    <span>⚡ {player.reps}/{player.repsCap}{credit > 0 ? <span style={{ color: "#ffd54a", fontWeight: 800 }}> · 🎁 {credit} crédit</span> : null}</span>
                    <span style={{ fontWeight: 800, color: open ? "#7ce0a0" : "#e0a020" }}>
                        {round ? (open ? `Mises ouvertes — ${fmtTime(remaining)}` : "Tirage…") : "Connexion…"}
                    </span>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>#{round ? round.id.slice(-5) : "—"}</span>
                </div>

                {/* Tickets trouvés → crédit jouable ici (les jetons du sol / cadeaux de boss s'engagent à la vraie table) */}
                {tickets.length > 0 && (
                    <button style={S.convertTickets} onClick={convertTickets}>
                        🎟️ Convertir mes {tickets.length} ticket{tickets.length > 1 ? "s" : ""} → <b>+{ticketTotal} ⚡</b> de crédit
                    </button>
                )}

                {/* Roue animée (dopamine) — tourne à chaque manche résolue, se pose sur le numéro serveur.
                    À l'arrêt (onDone), on dévoile mon gain/perte si j'ai misé sur cette manche. */}
                {spin && (
                    <RouletteWheel
                        winning={spin.winning}
                        spinKey={spin.key}
                        marks={betsSnap?.marks}
                        onDone={() => startSettlement({ winning: spin.winning, color: spin.color, net: spin.net })}
                    />
                )}

                {/* Révélation de MON résultat (gain/perte), affichée une fois la bille posée */}
                {reveal && (
                    <div style={{ ...S.reveal, background: reveal.color === "red" ? "#7a1414" : reveal.color === "black" ? "#1a1a1a" : "#0e5a2a" }}>
                        🎯 {reveal.winning} ({reveal.color === "red" ? "rouge" : reveal.color === "black" ? "noir" : "vert"}) —{" "}
                        {reveal.net > 0 ? <b style={{ color: "#7ce0a0" }}>+{reveal.net} ⚡ gagné !</b>
                            : reveal.net < 0 ? <b style={{ color: "#f0a0a0" }}>{reveal.net} ⚡</b>
                            : <b>aucun gain</b>}
                    </div>
                )}

                {/* Tapis : 0 + grille 3×12 */}
                <div style={S.tapis}>
                    <button style={{ ...S.cell, ...S.zero, ...chipStyle(pending, "straight:0") }} disabled={!open || locked} onClick={() => addBet((c) => straight(0, c))}>0<ZoneChips chips={displayChips["straight:0"]} hidden={hiddenChips} phase={settlePhase} /></button>
                    <div style={S.grid}>
                        {GRID_ROWS.map((row, ri) => (
                            <div key={ri} style={S.gridRow}>
                                {row.map((n) => {
                                    const col = colorOf(n)
                                    return (
                                        <button key={n} disabled={!open || locked} onClick={() => addBet((c) => straight(n, c))}
                                            style={{ ...S.cell, background: col === "red" ? "#9c2a2a" : "#222", ...chipStyle(pending, `straight:${n}`) }}>
                                            {n}<ZoneChips chips={displayChips[`straight:${n}`]} hidden={hiddenChips} phase={settlePhase} />
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Paris extérieurs */}
                <div style={S.outRow}>
                    {([["1-12", () => dozen(1, chip), "dozen:1"], ["13-24", () => dozen(2, chip), "dozen:2"], ["25-36", () => dozen(3, chip), "dozen:3"]] as const).map(([lab, mk, zid]) => (
                        <button key={zid} style={{ ...S.out, ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}<ZoneChips chips={displayChips[zid]} hidden={hiddenChips} phase={settlePhase} /></button>
                    ))}
                </div>
                <div style={S.outRow}>
                    {([["C1", () => column(1, chip), "column:1"], ["C2", () => column(2, chip), "column:2"], ["C3", () => column(3, chip), "column:3"]] as const).map(([lab, mk, zid]) => (
                        <button key={zid} style={{ ...S.out, ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}<ZoneChips chips={displayChips[zid]} hidden={hiddenChips} phase={settlePhase} /></button>
                    ))}
                </div>
                <div style={S.outRow}>
                    {([["1-18", () => low(chip), "low"], ["Pair", () => even(chip), "even"], ["Rouge", () => red(chip), "red"], ["Noir", () => black(chip), "black"], ["Impair", () => odd(chip), "odd"], ["19-36", () => high(chip), "high"]] as const).map(([lab, mk, zid]) => (
                        <button key={zid} style={{ ...S.out, fontSize: 10, ...(zid === "red" ? { background: "#9c2a2a" } : zid === "black" ? { background: "#111" } : {}), ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}<ZoneChips chips={displayChips[zid]} hidden={hiddenChips} phase={settlePhase} /></button>
                    ))}
                </div>

                {/* Sélecteur de MISE (1→50) : stepper fin + jetons rapides */}
                <div style={S.stakeRow}>
                    <span style={S.stakeLabel}>Mise</span>
                    <button style={S.step} disabled={chip <= STAKE_MIN} onClick={() => setChip((c) => Math.max(STAKE_MIN, c - 1))}>−</button>
                    <span style={S.stakeVal}>{chip} ⚡</span>
                    <button style={S.step} disabled={chip >= STAKE_MAX} onClick={() => setChip((c) => Math.min(STAKE_MAX, c + 1))}>+</button>
                    <div style={{ flex: 1 }} />
                    {CHIPS.map((c) => (
                        <button key={c} onClick={() => setChip(c)} style={{ ...S.chip, ...(chip === c ? S.chipOn : {}) }}>{c}</button>
                    ))}
                </div>
                <div style={S.hintLine}>👉 Clique une case pour y poser {chip} ⚡ · re-clique pour empiler · plusieurs cases à la fois · chances extérieures (rouge/noir, pair, douzaine…) = {OUTSIDE_MIN_BET} ⚡ mini.</div>

                {/* Actions */}
                <div style={S.chipsRow}>
                    <div style={{ flex: 1 }} />
                    {!locked && <button style={S.ghost} disabled={pendingTotal <= 0} onClick={clearPending}>Effacer</button>}
                    {locked
                        ? <span style={S.lockTag}>✓ Misé : {myLocked?.staked ?? 0} ⚡</span>
                        : <button style={{ ...S.primary, opacity: open && pendingTotal > 0 && !busy ? 1 : 0.4 }} disabled={!open || pendingTotal <= 0 || busy} onClick={validate}>Miser {pendingTotal > 0 ? `${pendingTotal} ⚡` : ""}</button>}
                </div>

                {/* "Lancer la balle" : solo = tirage immédiat ; multi = je me déclare prêt, ça part quand TOUS le sont.
                    Tant qu'on n'a pas misé, un INDICE explique que le bouton apparaîtra ici après la mise. */}
                {canLaunch ? (
                    <button ref={launchRef} style={{ ...S.launch, opacity: launching ? 0.5 : 1 }} disabled={launching} onClick={launchBall}>
                        🎲 {launching ? "…" : isSolo ? "Lancer la balle !" : `Je suis prêt ! (${readyCount}/${totalBettors})`}
                    </button>
                ) : waitingOthers ? (
                    <div style={S.waiting}>⏳ Prêt — en attente des autres joueurs… <b>{readyCount}/{totalBettors}</b></div>
                ) : open && !locked ? (
                    <div style={S.launchHint}>🎲 Mise sur le tapis puis « Miser » — le bouton <b>Lancer la balle</b> apparaîtra ici.</div>
                ) : null}
                {flash && <div style={S.flash}>{flash}</div>}

                {/* Mises des autres joueurs (en direct) + qui est prêt */}
                <div style={S.others}>
                    <div style={S.othersTitle}>Mises de la table ({others.length}){totalBettors > 0 ? ` · ${readyCount}/${totalBettors} prêts` : ""}</div>
                    {others.length === 0 && <div style={S.muted}>Personne n'a encore misé sur cette manche.</div>}
                    {others.map((b) => (
                        <div key={b.userId} style={S.otherRow}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: b.userId === myUserId ? "#7ce0a0" : "#cfe0f0" }}>
                                <span style={{ ...S.legendDot, background: colorForUser(b.userId, myUserId) }} />
                                {b.ready ? "✅ " : ""}{b.nickname}{b.userId === myUserId ? " (toi)" : ""}
                            </span>
                            <span>{b.staked} ⚡ · {b.bets.length} pari{b.bets.length > 1 ? "s" : ""}</span>
                        </div>
                    ))}
                </div>

                <div style={S.foot}>Le serveur tire le numéro (RNG secret) — tout le monde voit le même résultat. Dès que TOUS les parieurs appuient sur « Lancer la balle », la roue part (sinon au bout de 10 min). Paye selon la roulette européenne (plein 35:1, …).</div>
            </div>
        </div>
    )
}

function chipStyle(pending: Record<string, Bet>, zoneId: string): React.CSSProperties {
    return pending[zoneId] ? { outline: "2px solid #e0c020", outlineOffset: -2 } : {}
}
// Jetons posés sur une case : un pastille par joueur (sa COULEUR + la VALEUR misée). Pendant la résolution,
// les perdants sont déjà retirés (hidden) et les gagnants clignotent (phase win/coins).
function ZoneChips({ chips, hidden, phase }: { chips?: ChipView[]; hidden: Set<string>; phase: SettlePhase }) {
    if (!chips || chips.length === 0) return null
    const vis = chips.filter((c) => !hidden.has(c.key))
    if (vis.length === 0) return null
    const lit = phase === "win" || phase === "coins"
    return (
        <span style={S.chipStack}>
            {vis.slice(0, 4).map((c) => (
                <span key={c.key} style={{ ...S.tableChip, background: c.color, color: darkText(c.color) ? "#1a1400" : "#fff", ...(c.mine ? S.tableChipMine : {}), ...(lit && c.won ? S.tableChipWin : {}) }}>{c.value}</span>
            ))}
            {vis.length > 4 && <span style={S.tableChipMore}>+{vis.length - 4}</span>}
        </span>
    )
}
// Pluie de pièces (récompense) : nombre/taille/durée ∝ ratio gain/mise (gros ratio = avalanche de 💰).
function CoinRain({ count, big }: { count: number; big: boolean }) {
    return (
        <div style={S.coinRain}>
            {Array.from({ length: Math.max(1, count) }, (_, i) => (
                <span key={i} style={{
                    ...S.coin,
                    left: `${(i * 37 + 5) % 100}%`,
                    fontSize: (big ? 26 : 19) + (i % 3) * 3,
                    animationDelay: `${(i % 8) * 70}ms`,
                    animationDuration: `${(0.9 + (i % 5) * 0.12).toFixed(2)}s`,
                }}>{big && i % 4 === 0 ? "💰" : "🪙"}</span>
            ))}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9500, background: "rgba(4,8,6,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontFamily: "'Courier New', monospace", color: "#eef" },
    box: { position: "relative", width: "min(440px, 98vw)", maxHeight: "96vh", overflowY: "auto", background: "#0c1410", border: "2px solid #1c3a28", borderRadius: 14, padding: 12 },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    title: { fontSize: 14, fontWeight: 800 },
    beta: { fontSize: 8, background: "#e0c020", color: "#1a1400", borderRadius: 4, padding: "1px 5px", verticalAlign: "middle" },
    x: { background: "transparent", color: "#9fd", border: "1px solid #2f5a40", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontFamily: "inherit" },
    bar: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, background: "#0e1c14", borderRadius: 8, padding: "7px 10px", marginBottom: 8 },
    reveal: { textAlign: "center", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 8 },
    tapis: { display: "flex", gap: 4, marginBottom: 6 },
    zero: { width: 30, minHeight: "auto", background: "#0e5a2a", writingMode: "vertical-rl", textOrientation: "mixed" },
    grid: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
    gridRow: { display: "flex", gap: 3 },
    cell: { position: "relative", flex: 1, minWidth: 0, color: "#fff", border: "1px solid #000", borderRadius: 4, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    outRow: { display: "flex", gap: 4, marginBottom: 4 },
    out: { position: "relative", flex: 1, background: "#15301f", color: "#cfe0d6", border: "1px solid #2f5a40", borderRadius: 6, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    chipsRow: { display: "flex", alignItems: "center", gap: 5, marginTop: 8, flexWrap: "wrap" },
    chip: { width: 38, height: 34, borderRadius: "50%", border: "2px solid #2f5a40", background: "#15301f", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    chipOn: { background: "#e0c020", color: "#1a1400", borderColor: "#e0c020" },
    stakeRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
    stakeLabel: { fontSize: 11, fontWeight: 700, color: "#9fd", opacity: 0.85 },
    step: { width: 34, height: 34, borderRadius: 8, border: "2px solid #2f5a40", background: "#15301f", color: "#fff", fontWeight: 800, fontSize: 18, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 },
    stakeVal: { minWidth: 52, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#e0c020" },
    hintLine: { marginTop: 5, fontSize: 10, opacity: 0.6, lineHeight: 1.4 },
    launch: { width: "100%", marginTop: 8, padding: "11px 0", background: "#e0502a", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 0 14px rgba(224,80,42,.4)" },
    waiting: { width: "100%", marginTop: 8, padding: "10px 0", textAlign: "center", background: "rgba(224,200,32,0.12)", border: "1px dashed #e0c020", borderRadius: 9, fontWeight: 700, fontSize: 12.5, color: "#e0c020" },
    launchHint: { width: "100%", marginTop: 8, padding: "9px 10px", textAlign: "center", background: "rgba(224,80,42,0.10)", border: "1px dashed #e0502a", borderRadius: 9, fontSize: 11.5, color: "#f0a890", lineHeight: 1.4 },
    ghost: { background: "transparent", color: "#9fd", border: "1px solid #2f5a40", borderRadius: 8, padding: "8px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
    primary: { background: "#e0c020", color: "#1a1400", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
    lockTag: { background: "#15301f", color: "#7ce0a0", border: "1px solid #2f5a40", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700 },
    flash: { marginTop: 6, textAlign: "center", fontSize: 11, color: "#e0c020" },
    others: { marginTop: 10, background: "#0e1c14", borderRadius: 8, padding: "8px 10px" },
    othersTitle: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#7aa890", marginBottom: 5 },
    otherRow: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid #15301f" },
    muted: { fontSize: 11, opacity: 0.55 },
    badge: { position: "absolute", top: -6, right: -6, background: "#e0c020", color: "#1a1400", borderRadius: 9, minWidth: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" },
    foot: { marginTop: 8, fontSize: 9, opacity: 0.5, lineHeight: 1.4 },
    // Jetons sur le tapis (un par joueur : sa couleur + sa mise).
    chipStack: { position: "absolute", left: 0, right: 0, bottom: 1, display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap", pointerEvents: "none" },
    tableChip: { minWidth: 12, height: 13, borderRadius: 7, fontSize: 8, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 2px", border: "1px solid rgba(0,0,0,0.45)", lineHeight: 1 },
    tableChipMine: { outline: "1.5px solid #fff", outlineOffset: -1 },
    tableChipWin: { animation: "rlBlink 0.5s steps(1,end) infinite", zIndex: 2 },
    tableChipMore: { fontSize: 8, fontWeight: 800, color: "#fff", lineHeight: 1, alignSelf: "center" },
    legendDot: { width: 9, height: 9, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.4)", flexShrink: 0 },
    convertTickets: { width: "100%", marginBottom: 8, padding: "9px 10px", background: "rgba(255,213,74,0.12)", border: "1px dashed #ffd54a", borderRadius: 9, color: "#ffd54a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    // Pluie de pièces (récompense, étape finale).
    coinRain: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 50 },
    coin: { position: "absolute", top: -30, fontSize: 22, animation: "rlCoin 1.05s linear forwards" },
}
