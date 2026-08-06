"use client"

// BLACKJACK (21) — joué aux PC du casino (haut-gauche). Solo vs croupier, custody CÔTÉ CLIENT : on mise
// des reps (10-50), on crédite le gain au règlement. Le gain NET cumulé alimente la progression VIP
// (→ future CT signature). Moteur pur dans casino/blackjack.ts.

import { useEffect, useRef, useState } from "react"
import { usePlayer, spendCasinoBet, settleBlackjack, claimBlackjackCt, getActiveWorld, blackjackNgplusPickPending, blackjackNgplusChoices, claimBlackjackCtNgplus } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { BLACKJACK_CT_TARGET, BLACKJACK_CT_NGPLUS_TARGET } from "@/lib/gamebook/yellow/data/labDefis"
import { getCt } from "@/lib/gamebook/yellow/data/cts"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { deal, hit, stand, double, canDouble, handValue, freshShoe, type BJState, type Card } from "@/lib/gamebook/yellow/casino/blackjack"

const BET_MIN = 10, BET_MAX = 50
const RANK_FR = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"]
const SUIT = ["♠", "♥", "♦", "♣"]
const isRed = (s: number) => s === 1 || s === 2

function CardView({ c, hidden }: { c?: Card; hidden?: boolean }) {
    if (hidden || !c) return <div style={{ ...cardBox, ...cardBack }}>🂠</div>
    return <div style={{ ...cardBox, color: isRed(c.suit) ? "#c0392b" : "#1a1a2e" }}><span>{RANK_FR[c.rank]}</span><span style={{ fontSize: 16 }}>{SUIT[c.suit]}</span></div>
}

// Rythme de distribution (croupier qui pose les cartes une à une).
const DEAL_GAP = 480   // ms entre deux cartes posées
const HOLE_GAP = 640   // ms avant de retourner la carte cachée du croupier (suspense)
const END_PAUSE = 360  // ms après la dernière carte avant d'annoncer le résultat
type RevealStep = { fn: () => void; delay: number }

export default function BlackjackPanel({ close }: { close: () => void }) {
    const player = usePlayer()
    const [bet, setBet] = useState(10)
    const [game, setGame] = useState<BJState | null>(null)
    const [msg, setMsg] = useState("")
    const [busy, setBusy] = useState(false)
    const [ctWon, setCtWon] = useState<string | null>(null) // nom de la CT si on vient de la débloquer
    // Affichage PROGRESSIF (le croupier pose les cartes une à une) : nb de cartes visibles + carte cachée retournée.
    const [shownP, setShownP] = useState(0)
    const [shownD, setShownD] = useState(0)
    const [holeUp, setHoleUp] = useState(false)
    const [dealing, setDealing] = useState(false) // animation en cours → actions verrouillées
    const shoeRef = useRef<Card[]>([])
    const settledRef = useRef(false) // la main courante a-t-elle déjà été réglée ? (anti double-crédit double-clic)
    // Miroirs synchrones (les closures des timers + buildSteps lisent l'état courant sans attendre le re-render).
    const shownPRef = useRef(0), shownDRef = useRef(0), holeUpRef = useRef(false)
    const gameRef = useRef<BJState | null>(null)
    const timersRef = useRef<number[]>([])

    const won = player.labDefi.blackjackWon
    const ctClaimed = player.labDefi.blackjackCtClaimed
    const ngplus = getActiveWorld() === "ngplus" // RUN 2 : récompense UNIQUE = 1 CT du magasin au choix
    const ngplusRewardTaken = player.labDefi.blackjackNgplusPicks >= 1 // récompense unique déjà réclamée ?
    // Liste de choix (dérivée en direct de l'état) : affichée dès que la récompense unique est disponible.
    const ngplusPickList = ngplus && blackjackNgplusPickPending() ? blackjackNgplusChoices() : null
    const inHand = !!game && game.phase === "player" && !dealing // on ne peut agir qu'une fois les cartes posées

    const resultLine = (s: BJState) =>
        s.outcome === "blackjack" ? `🂡 BLACKJACK ! +${s.net} ⚡ (payé 3:2)`
        : s.outcome === "win" ? `✅ Gagné ! +${s.net} ⚡`
        : s.outcome === "push" ? "🤝 Égalité — mise rendue."
        : `❌ Perdu (${s.bet} ⚡).`

    // Setters ref+state synchronisés (le ref alimente buildSteps, le state déclenche le rendu).
    const setP = (n: number) => { shownPRef.current = n; setShownP(n) }
    const setD = (n: number) => { shownDRef.current = n; setShownD(n) }
    const setHole = (v: boolean) => { holeUpRef.current = v; setHoleUp(v) }
    const clearTimers = () => { timersRef.current.forEach((id) => clearTimeout(id)); timersRef.current = [] }

    // Crédite le gain UNE fois (mise déjà débitée), au moment où le résultat est révélé (jamais avant).
    const settleNow = (s: BJState) => {
        if (settledRef.current) return
        settledRef.current = true
        settleBlackjack(s.payout, s.net)
        // RUN 1 : palier 1000 ⚡ → CT « Apothéose » (one-shot). RUN 2 : la récompense unique (1 CT du magasin)
        // est dérivée en direct dans le rendu (ngplusPickList) dès que le seuil de 500 ⚡ est franchi.
        if (getActiveWorld() !== "ngplus") {
            const ctName = claimBlackjackCt()
            if (ctName) setCtWon(ctName)
        }
        persistYellowSave(); setMsg(resultLine(s))
    }

    // RUN 2 : le joueur réclame sa récompense UNIQUE = la CT du magasin choisie. Après ça, plus aucun lot.
    const pickCt = (id: string) => {
        const name = claimBlackjackCtNgplus(id)
        persistYellowSave()
        if (name) setCtWon(name)
    }

    // Construit la séquence de révélations (du visible actuel vers l'état cible).
    const buildSteps = (cur: { p: number; d: number; hole: boolean }, tgt: { p: number; d: number; hole: boolean }): RevealStep[] => {
        const steps: RevealStep[] = []
        if (cur.p === 0 && cur.d === 0) {
            // Distribution initiale : on alterne joueur / croupier (J, C, J, C…).
            const rounds = Math.max(tgt.p, tgt.d)
            for (let i = 0; i < rounds; i++) {
                if (i < tgt.p) { const n = i + 1; steps.push({ fn: () => setP(n), delay: DEAL_GAP }) }
                if (i < tgt.d) { const n = i + 1; steps.push({ fn: () => setD(n), delay: DEAL_GAP }) }
            }
            if (tgt.hole && !cur.hole) steps.push({ fn: () => setHole(true), delay: HOLE_GAP }) // blackjack naturel → on retourne tout de suite
        } else {
            // Coups suivants : d'abord la/les carte(s) joueur (tirer/doubler), puis on retourne la cachée, puis le croupier pioche.
            for (let p = cur.p + 1; p <= tgt.p; p++) { const n = p; steps.push({ fn: () => setP(n), delay: DEAL_GAP }) }
            if (tgt.hole && !cur.hole) steps.push({ fn: () => setHole(true), delay: HOLE_GAP })
            for (let d = cur.d + 1; d <= tgt.d; d++) { const n = d; steps.push({ fn: () => setD(n), delay: DEAL_GAP }) }
        }
        return steps
    }

    // Joue la séquence avec des délais cumulés, puis exécute onDone.
    const runSteps = (steps: RevealStep[], onDone: () => void) => {
        clearTimers()
        let acc = 0
        for (const st of steps) { acc += st.delay; timersRef.current.push(window.setTimeout(st.fn, acc)) }
        timersRef.current.push(window.setTimeout(onDone, acc + END_PAUSE))
    }

    const apply = (ns: BJState) => {
        gameRef.current = ns
        setGame(ns); shoeRef.current = ns.deck
        const cur = { p: shownPRef.current, d: shownDRef.current, hole: holeUpRef.current }
        const tgt = { p: ns.player.length, d: ns.dealer.length, hole: ns.phase === "done" }
        const steps = buildSteps(cur, tgt)
        if (steps.length === 0) { if (ns.phase === "done") settleNow(ns); return }
        setDealing(true)
        runSteps(steps, () => { setDealing(false); if (ns.phase === "done") settleNow(ns) })
    }

    const startDeal = () => {
        if (inHand || dealing || busy) return
        if (player.reps < bet) { setMsg("Pas assez d'énergie pour cette mise."); return }
        setBusy(true)
        const paid = spendCasinoBet(bet) // VŒU DU GÉNIE : applique le cap casino (10/mise + 200/jour) si actif
        if (!paid.ok) { setBusy(false); setMsg(paid.reason ?? "Pas assez d'énergie."); return }
        const shoe = shoeRef.current.length < 24 ? freshShoe(Math.random) : shoeRef.current // re-mélange si sabot bas
        persistYellowSave() // débit de la mise persisté
        setMsg(""); setCtWon(null) // nettoie la bannière de déblocage CT de la main précédente
        settledRef.current = false // nouvelle main → règlement réarmé
        clearTimers(); setP(0); setD(0); setHole(false) // réinitialise l'affichage progressif
        apply(deal(shoe, bet))
        setBusy(false)
    }

    const onHit = () => { if (inHand && !dealing) apply(hit(game!)) }
    const onStand = () => { if (inHand && !dealing) apply(stand(game!)) }
    const onDouble = () => {
        if (!inHand || dealing || !canDouble(game!)) return
        if (player.reps < game!.bet) { setMsg("Pas assez d'énergie pour doubler."); return }
        const paidDouble = spendCasinoBet(game!.bet) // VŒU DU GÉNIE : le double compte aussi dans le cap casino
        if (!paidDouble.ok) { setMsg(paidDouble.reason ?? "Pas assez d'énergie."); return }
        persistYellowSave()
        apply(double(game!))
    }

    // Sécurité : si on quitte la table pendant l'animation d'une main réglée, on crédite quand même (jamais de gain perdu).
    useEffect(() => () => {
        clearTimers()
        const g = gameRef.current
        if (g && g.phase === "done" && !settledRef.current) {
            settledRef.current = true
            settleBlackjack(g.payout, g.net); claimBlackjackCt(); persistYellowSave()
        }
    }, [])

    // Valeurs AFFICHÉES = uniquement les cartes face visible déjà posées (la cachée ne compte pas tant qu'elle n'est pas retournée).
    const shownDealerCards = game ? game.dealer.slice(0, shownD) : []
    const dealerFaceUp = holeUp ? shownDealerCards : shownDealerCards.filter((_, i) => i !== 1)
    const dealerVal = handValue(dealerFaceUp)
    const dealerHidden = !holeUp && shownD >= 2 // une carte cachée reste à révéler
    const playerVal = game ? handValue(game.player.slice(0, shownP)) : 0

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <style>{"@keyframes bjDeal{from{opacity:0;transform:translateY(-16px) scale(.9)}to{opacity:1;transform:none}}"}</style>
                <div style={head}><span style={title}>🃏 BLACKJACK</span><span style={energy}>⚡ {player.reps}/{player.repsCap}</span></div>

                {/* TABLE */}
                <div style={felt}>
                    <div style={rowLbl}>Croupier {game && shownD > 0 && <b>· {dealerVal}{dealerHidden ? "+" : ""}</b>}</div>
                    <div style={handRow}>
                        {game ? game.dealer.slice(0, shownD).map((c, i) => <CardView key={i} c={c} hidden={i === 1 && !holeUp} />)
                            : <><CardView /><CardView /></>}
                    </div>
                    <div style={{ ...rowLbl, marginTop: 12 }}>Toi {game && shownP > 0 && <b>· {playerVal}</b>}</div>
                    <div style={handRow}>
                        {game ? game.player.slice(0, shownP).map((c, i) => <CardView key={i} c={c} />) : <><CardView /><CardView /></>}
                    </div>
                </div>

                {msg && <div style={msgS}>{msg}</div>}

                {/* CONTRÔLES */}
                {dealing ? (
                    <div style={actRow}><button style={{ ...actBtn, ...disBtn }} disabled>🃏 Le croupier distribue…</button></div>
                ) : !inHand ? (
                    <>
                        <div style={betRow}>
                            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Mise</span>
                            <button style={step} disabled={bet <= BET_MIN} onClick={() => setBet((b) => Math.max(BET_MIN, b - 5))}>−</button>
                            <span style={betVal}>{bet} ⚡</span>
                            <button style={step} disabled={bet >= BET_MAX} onClick={() => setBet((b) => Math.min(BET_MAX, b + 5))}>+</button>
                            <div style={{ flex: 1 }} />
                            <button style={{ ...dealBtn, opacity: player.reps >= bet && !busy ? 1 : 0.4 }} disabled={player.reps < bet || busy} onClick={startDeal}>
                                {game ? "🔄 Rejouer" : "🂠 Distribuer"}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={actRow}>
                        <button style={actBtn} onClick={onHit}>🂠 Tirer</button>
                        <button style={actBtn} onClick={onStand}>✋ Rester</button>
                        <button style={{ ...actBtn, ...(canDouble(game!) && player.reps >= game!.bet ? {} : disBtn) }} disabled={!canDouble(game!) || player.reps < game!.bet} onClick={onDouble}>✕2 Doubler</button>
                    </div>
                )}

                {ctWon && (
                    <div style={ctBanner} onClick={() => setCtWon(null)}>
                        🏆 <b>CT « {ctWon} » DÉBLOQUÉE !</b><br />
                        <span style={{ fontSize: 11, opacity: 0.9 }}>{ngplus ? "Ta récompense unique du run 2 — enseigne-la via l'écran des CT." : "Attaque ULTIME adaptative (type de ton Daemon + meilleure stat offensive, STAB garanti). Enseigne-la via la CT52."}</span>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>(toucher pour fermer)</div>
                    </div>
                )}

                {/* RUN 2 : récompense UNIQUE — dès 1000 ⚡ nets, le joueur choisit UNE CT au choix (une seule fois). */}
                {ngplusPickList && ngplusPickList.length > 0 && (
                    <div style={ctBanner}>
                        🎁 <b>Récompense unique — choisis N'IMPORTE QUELLE CT :</b>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginTop: 6, maxHeight: 176, overflowY: "auto" }}>
                            {ngplusPickList.map((id) => { const mv = getMove(getCt(id)?.moveId ?? ""); return (
                                <button key={id} onClick={() => pickCt(id)}
                                    style={{ background: "#ffd54a", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 11, cursor: "pointer" }}>{mv?.name ?? id}</button>
                            ) })}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 5 }}>(⚠️ un seul choix pour tout le run 2 — ensuite le blackjack ne donne plus de lot)</div>
                    </div>
                )}

                <div style={vip}>
                    🏅 <b>Progression VIP</b> — gains nets cumulés : <b style={{ color: "#ffd54a" }}>{won} ⚡</b>
                    {ngplus
                        ? (ngplusRewardTaken
                            ? <span style={{ color: "#9ff0b8" }}> · récompense unique (1 CT au choix) obtenue ✓</span>
                            : won >= BLACKJACK_CT_NGPLUS_TARGET
                                ? <span style={{ color: "#ffd54a" }}> · 🎁 récompense unique DISPO : choisis 1 CT ci-dessus</span>
                                : <span> · <b>{Math.min(won, BLACKJACK_CT_NGPLUS_TARGET)}/{BLACKJACK_CT_NGPLUS_TARGET} ⚡</b> → 1 CT au choix (unique) 🔒</span>)
                        : ctClaimed
                            ? <span style={{ color: "#9ff0b8" }}> · CT « Apothéose » obtenue ✓</span>
                            : <span> · palier <b>{Math.min(won, BLACKJACK_CT_TARGET)}/{BLACKJACK_CT_TARGET} ⚡</b> → CT unique « Apothéose » 🔒</span>}
                </div>
                <div style={rulesS}>Le croupier tire jusqu'à 16, reste à 17. Blackjack payé 3:2. Égalité = mise rendue.</div>
                <button style={closeBtn} onClick={close}>← Quitter la table</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.85)", fontFamily: "'Courier New', monospace" }
const box: React.CSSProperties = { width: "min(420px,96vw)", background: "#15241a", border: "2px solid #2f7a4a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(47,122,74,.35)" }
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }
const title: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#9ff0b8" }
const energy: React.CSSProperties = { fontSize: 12, color: "#ffd54a", fontWeight: 700 }
const felt: React.CSSProperties = { background: "radial-gradient(circle at 50% 30%, #1d5a38, #103021)", border: "1px solid #2f7a4a", borderRadius: 10, padding: "12px 14px", minHeight: 190 }
const rowLbl: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#bfe8cf", marginBottom: 4 }
const handRow: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 64 }
const cardBox: React.CSSProperties = { width: 46, height: 62, borderRadius: 6, background: "#f6f3ea", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, boxShadow: "0 2px 4px rgba(0,0,0,.4)", animation: "bjDeal 260ms ease-out" }
const cardBack: React.CSSProperties = { background: "linear-gradient(135deg,#7a1f3a,#3a0f1d)", color: "#e0a0b0", fontSize: 26 }
const msgS: React.CSSProperties = { marginTop: 10, textAlign: "center", fontSize: 14, fontWeight: 800, color: "#ffd54a" }
const betRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginTop: 12 }
const step: React.CSSProperties = { width: 34, height: 34, borderRadius: 8, border: "2px solid #2f7a4a", background: "#163d28", color: "#fff", fontWeight: 800, fontSize: 18, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }
const betVal: React.CSSProperties = { minWidth: 56, textAlign: "center", fontSize: 16, fontWeight: 800, color: "#ffd54a" }
const dealBtn: React.CSSProperties = { padding: "10px 18px", background: "#e0c020", color: "#1a1400", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
const actRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 12 }
const actBtn: React.CSSProperties = { flex: 1, padding: "11px 0", background: "#2f7a4a", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
const disBtn: React.CSSProperties = { opacity: 0.4, cursor: "default" }
const vip: React.CSSProperties = { marginTop: 12, fontSize: 11.5, lineHeight: 1.5, background: "rgba(255,213,74,0.1)", border: "1px dashed #ffd54a", borderRadius: 8, padding: "8px 10px", color: "#f3e0a0" }
const ctBanner: React.CSSProperties = { marginTop: 12, fontSize: 14, lineHeight: 1.5, textAlign: "center", background: "linear-gradient(135deg,#3a2a00,#6a4f00)", border: "2px solid #ffd54a", borderRadius: 10, padding: "12px 12px", color: "#fff3c4", boxShadow: "0 0 22px rgba(255,213,74,.45)", cursor: "pointer" }
const rulesS: React.CSSProperties = { marginTop: 8, fontSize: 10, opacity: 0.6, lineHeight: 1.4, textAlign: "center" }
const closeBtn: React.CSSProperties = { marginTop: 12, width: "100%", padding: "9px 0", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
