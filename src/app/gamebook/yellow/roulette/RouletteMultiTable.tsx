"use client"

// Nexus — Roulette EU MULTIJOUEUR (Phase 4). Table PARTAGÉE, serveur autoritatif :
//   - une MANCHE commune avec timer (fenêtre de mise) ; tout le monde mise en même temps
//   - on VOIT les mises des autres en direct ; le serveur tire UN numéro (RNG secret serveur)
//   - TOUT LE MONDE voit le MÊME résultat ; chacun est payé selon ses mises
// Transport : polling /state (source de vérité) + Pusher (accélérateur best-effort).
// Énergie : custody CÔTÉ CLIENT — débit à la validation (serveur accepté), crédit du gain à la
// résolution via une réconciliation IDEMPOTENTE par manche (markRouletteClaimed) robuste au refresh.

import { useCallback, useEffect, useRef, useState } from "react"
import { usePlayer, spendReps, grantReps, markRouletteClaimed, peekRouletteLuck, decrementRouletteLuck } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { colorOf } from "@/lib/gamebook/yellow/roulette/wheel"
import { type Bet, PAYOUT, straight, dozen, column, red, black, even, odd, low, high } from "@/lib/gamebook/yellow/roulette/bets"
import RouletteWheel from "./RouletteWheel"

const CHANNEL = "gamebook-yellow_roulette"
const POLL_MS = 1500
// Mises rapides (toutes ≤ 50). La mise fine se règle au stepper −/+ (1 à 50).
const CHIPS = [1, 5, 10, 25, 50] as const
const STAKE_MIN = 1
const STAKE_MAX = 50

interface PlayerBets { userId: string; nickname: string; staked: number; bets: Bet[]; net: number | null }
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

    // Horloge locale (countdown fluide).
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

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

        // Réconciliation des GAINS : crédite chaque manche résolue où j'ai misé, UNE fois.
        for (const r of data.recentResults) {
            const mine = r.players.find((p) => p.userId === myUserId)
            if (!mine) continue
            if (markRouletteClaimed(r.roundId)) {
                const ret = mine.staked + mine.net      // mise remboursée + gain net (net<0 = perte déjà actée au débit)
                if (ret > 0) grantReps(ret)
                // CHANCE potion (secret) : si SEUL sur la manche et gain net, on récupère jusqu'au prix payé.
                if (r.players.length === 1 && mine.net > 0) decrementRouletteLuck(mine.net)
                persistYellowSave()
            }
        }

        // ROUE ANIMÉE : on fait tourner la roue pour la DERNIÈRE manche résolue (résultat partagé). Au TOUT
        // 1er applyState on affiche le dernier résultat SANS l'animer (spinKey "" = pas de tour pour un
        // résultat déjà ancien) ; ensuite CHAQUE nouvelle manche résolue déclenche un vrai tour — y compris
        // le tout 1er résultat d'une table vierge (ex. mon propre "Lancer la balle"). Numéro = seed serveur.
        const latest = data.recentResults[0]
        if (!wheelInitRef.current) {
            wheelInitRef.current = true
            if (latest) {
                lastSpunRef.current = latest.roundId
                setSpin({ key: "", winning: latest.winningNumber, color: latest.winningColor, net: null })
            }
        } else if (latest && latest.roundId !== lastSpunRef.current) {
            lastSpunRef.current = latest.roundId
            const mine = latest.players.find((p) => p.userId === myUserId)
            setSpin({ key: latest.roundId, winning: latest.winningNumber, color: latest.winningColor, net: mine ? mine.net : null })
        }
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

    const addBet = (make: (chips: number) => Bet) => {
        if (!open || locked) return
        const b = make(chip)
        setPending((p) => {
            const ex = p[b.zoneId]
            return { ...p, [b.zoneId]: { ...b, chips: (ex?.chips ?? 0) + chip } }
        })
    }
    const clearPending = () => setPending({})

    const validate = async () => {
        if (!round || !open || locked || pendingTotal <= 0 || busy) return
        if (player.reps < pendingTotal) { setFlash("Pas assez d'énergie."); return }
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
                spendReps(pendingTotal)         // débit SEULEMENT après acceptation serveur
                persistYellowSave()
                setValidatedRound(round.id)
                setFlash(`Mise validée : ${pendingTotal} ⚡`)
                refetch()
            } else {
                const j = await res.json().catch(() => ({}))
                setFlash(j.error === "round_closed" ? "Trop tard, manche fermée !" : "Mise refusée.")
            }
        } catch { setFlash("Réseau indisponible.") } finally { setBusy(false) }
    }

    // Mises agrégées par joueur (affichage social).
    const others = (state?.bets ?? []).filter((b) => b.staked > 0)
    const myLocked = state?.bets.find((b) => b.userId === myUserId)
    // SOLO : je suis le SEUL parieur de la manche (mise déjà validée) → je peux lancer la balle tout de
    // suite, sans attendre le timer. Le serveur re-vérifie la soloïté avant de résoudre.
    const soloLaunch = !!round && locked && others.length === 1 && others[0].userId === myUserId

    // "Lancer la balle" : déclenche la résolution serveur MAINTENANT (le serveur tire via son seed secret).
    const launchBall = async () => {
        if (!round || !soloLaunch || launching) return
        setLaunching(true)
        setFlash("🎙️ Faites vos jeux… rien ne va plus !")
        try {
            const res = await fetch("/api/gamebook/yellow/roulette/resolve", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roundId: round.id }),
            })
            if (res.ok) {
                await refetch() // la manche résolue arrive → la roue tourne (applyState) + crédit idempotent
            } else {
                const j = await res.json().catch(() => ({}))
                setFlash(j.error === "not_solo" ? "Un autre joueur a misé — on attend le tirage !" : j.error === "already_resolved" ? "Déjà tiré !" : "Lancement impossible.")
                refetch()
            }
        } catch { setFlash("Réseau indisponible.") } finally { setLaunching(false) }
    }

    return (
        <div style={S.overlay}>
            <div style={S.box}>
                <div style={S.head}>
                    <div style={S.title}>🎡 Roulette — Table multijoueur <span style={S.beta}>BÊTA</span></div>
                    <button style={S.x} onClick={onClose}>✕</button>
                </div>

                {/* Bandeau manche + timer */}
                <div style={S.bar}>
                    <span>⚡ {player.reps}/{player.repsCap}</span>
                    <span style={{ fontWeight: 800, color: open ? "#7ce0a0" : "#e0a020" }}>
                        {round ? (open ? `Mises ouvertes — ${remaining}s` : "Tirage…") : "Connexion…"}
                    </span>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>#{round ? round.id.slice(-5) : "—"}</span>
                </div>

                {/* Roue animée (dopamine) — tourne à chaque manche résolue, se pose sur le numéro serveur.
                    À l'arrêt (onDone), on dévoile mon gain/perte si j'ai misé sur cette manche. */}
                {spin && (
                    <RouletteWheel
                        winning={spin.winning}
                        spinKey={spin.key}
                        onDone={() => { if (spin.net != null) setReveal({ winning: spin.winning, color: spin.color, net: spin.net }) }}
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
                    <button style={{ ...S.cell, ...S.zero, ...chipStyle(pending, "straight:0") }} disabled={!open || locked} onClick={() => addBet((c) => straight(0, c))}>0{chipBadge(pending, "straight:0")}</button>
                    <div style={S.grid}>
                        {GRID_ROWS.map((row, ri) => (
                            <div key={ri} style={S.gridRow}>
                                {row.map((n) => {
                                    const col = colorOf(n)
                                    return (
                                        <button key={n} disabled={!open || locked} onClick={() => addBet((c) => straight(n, c))}
                                            style={{ ...S.cell, background: col === "red" ? "#9c2a2a" : "#222", ...chipStyle(pending, `straight:${n}`) }}>
                                            {n}{chipBadge(pending, `straight:${n}`)}
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
                        <button key={zid} style={{ ...S.out, ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}{chipBadge(pending, zid)}</button>
                    ))}
                </div>
                <div style={S.outRow}>
                    {([["C1", () => column(1, chip), "column:1"], ["C2", () => column(2, chip), "column:2"], ["C3", () => column(3, chip), "column:3"]] as const).map(([lab, mk, zid]) => (
                        <button key={zid} style={{ ...S.out, ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}{chipBadge(pending, zid)}</button>
                    ))}
                </div>
                <div style={S.outRow}>
                    {([["1-18", () => low(chip), "low"], ["Pair", () => even(chip), "even"], ["Rouge", () => red(chip), "red"], ["Noir", () => black(chip), "black"], ["Impair", () => odd(chip), "odd"], ["19-36", () => high(chip), "high"]] as const).map(([lab, mk, zid]) => (
                        <button key={zid} style={{ ...S.out, fontSize: 10, ...(zid === "red" ? { background: "#9c2a2a" } : zid === "black" ? { background: "#111" } : {}), ...chipStyle(pending, zid) }} disabled={!open || locked} onClick={() => addBet(mk)}>{lab}{chipBadge(pending, zid)}</button>
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
                <div style={S.hintLine}>👉 Clique une case pour y poser {chip} ⚡ · re-clique pour empiler · mise sur plusieurs cases à la fois.</div>

                {/* Actions */}
                <div style={S.chipsRow}>
                    <div style={{ flex: 1 }} />
                    {!locked && <button style={S.ghost} disabled={pendingTotal <= 0} onClick={clearPending}>Effacer</button>}
                    {locked
                        ? <span style={S.lockTag}>✓ Misé : {myLocked?.staked ?? 0} ⚡</span>
                        : <button style={{ ...S.primary, opacity: open && pendingTotal > 0 && !busy ? 1 : 0.4 }} disabled={!open || pendingTotal <= 0 || busy} onClick={validate}>Miser {pendingTotal > 0 ? `${pendingTotal} ⚡` : ""}</button>}
                </div>

                {/* SOLO : seul parieur → lancer la balle tout de suite (sans attendre le timer) */}
                {soloLaunch && open && (
                    <button style={{ ...S.launch, opacity: launching ? 0.5 : 1 }} disabled={launching} onClick={launchBall}>
                        🎲 {launching ? "La bille roule…" : "Lancer la balle !"}
                    </button>
                )}
                {flash && <div style={S.flash}>{flash}</div>}

                {/* Mises des autres joueurs (en direct) */}
                <div style={S.others}>
                    <div style={S.othersTitle}>Mises de la table ({others.length})</div>
                    {others.length === 0 && <div style={S.muted}>Personne n'a encore misé sur cette manche.</div>}
                    {others.map((b) => (
                        <div key={b.userId} style={S.otherRow}>
                            <span style={{ fontWeight: 700, color: b.userId === myUserId ? "#7ce0a0" : "#cfe0f0" }}>{b.nickname}{b.userId === myUserId ? " (toi)" : ""}</span>
                            <span>{b.staked} ⚡ · {b.bets.length} pari{b.bets.length > 1 ? "s" : ""}</span>
                        </div>
                    ))}
                </div>

                <div style={S.foot}>Le serveur tire le numéro (RNG secret) — tout le monde voit le même résultat. Paye selon la roulette européenne (plein 35:1, …). L'énergie misée est débitée à la validation et le gain crédité au tirage.</div>
            </div>
        </div>
    )
}

function chipStyle(pending: Record<string, Bet>, zoneId: string): React.CSSProperties {
    return pending[zoneId] ? { outline: "2px solid #e0c020", outlineOffset: -2 } : {}
}
function chipBadge(pending: Record<string, Bet>, zoneId: string) {
    const b = pending[zoneId]
    if (!b) return null
    return <span style={S.badge}>{b.chips}</span>
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9500, background: "rgba(4,8,6,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontFamily: "'Courier New', monospace", color: "#eef" },
    box: { width: "min(440px, 98vw)", maxHeight: "96vh", overflowY: "auto", background: "#0c1410", border: "2px solid #1c3a28", borderRadius: 14, padding: 12 },
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
}

void PAYOUT
