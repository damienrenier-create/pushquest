"use client"

// Nexus — Poker CASH QUOTIDIEN vs les boss (SOLO, VRAIES reps). Table à 6 (toi + 5 boss). Chaque boss a un
// tapis du jour : capé sur ton buy-in de 1re partie, mais il GARDE ses gains. Un boss ruiné (tapis 0) part
// et revient demain. Aucune triche — vrai cash game. Jouable tant qu'il reste des boss non ruinés.

import { useEffect, useRef, useState } from "react"
import { usePlayer, spendReps, creditReps, beginPokerCashGame, savePokerBossStacks, casinoBetAllowed } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useCashPoker } from "@/lib/gamebook/yellow/multiplayer/useCashPoker"
import { PokerTableView, POKER_CSS } from "./PokerTableView"

const BOT_THINK_MS = 1150
const NEXT_HAND_MS = 5000
const MIN_BUYIN = 20
const DEFAULT_BUYIN = 40
const todayKey = () => new Date().toISOString().slice(0, 10)

export default function DailyPokerPanel({ onDone, myUserId }: { onDone: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, joinCash, act, botTurn, nextHand, leaveCash, bossBustNote, bossesLeft } = useCashPoker(myUserId, "Toi")
    const [phase, setPhase] = useState<"intro" | "play" | "done">("intro")
    const [buyin, setBuyin] = useState(DEFAULT_BUYIN)
    const [raiseTo, setRaiseTo] = useState(0)
    const [say, setSay] = useState<{ seat: number; text: string; n: number } | null>(null)
    const [result, setResult] = useState<{ tapis: number; net: number } | null>(null)
    const spentRef = useRef(0)
    const cashingRef = useRef(false)
    const nextTimer = useRef<number | null>(null)
    const sayNonce = useRef(0)

    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const myTurn = !!(table && me && !me.folded && !me.allIn && table.toAct === mySeatIdx)
    const toCall = table && me ? Math.max(0, table.currentBet - me.betThisRound) : 0
    const canCheck = toCall === 0
    const minRaiseTo = table ? table.currentBet + table.minRaise : 0
    const maxRaiseTo = me ? me.betThisRound + me.stack : 0
    const handDone = table?.phase === "handComplete"
    const dayOver = phase === "play" && !!table && bossesLeft === 0 // tous les boss ruinés
    const meRuined = phase === "play" && !!me && me.stack <= 0 && !dayOver // toi ruiné (boss encore là)
    // On n'encaisse qu'ENTRE les mains (main finie / journée finie) : sinon les jetons déjà dans le pot ne
    // seraient pas comptés dans les tapis-du-jour des boss (perte conservatrice + faux « boss ruiné »).
    const canCashOut = handDone || dayOver

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // TEMPO — au tour d'un BOSS (main live), il joue UNE action après un délai.
    useEffect(() => {
        if (phase !== "play" || !table) return
        const live = table.phase === "preflop" || table.phase === "flop" || table.phase === "turn" || table.phase === "river"
        if (!live || table.toAct < 0) return
        const actor = table.seats[table.toAct]
        if (!actor || !actor.bot) return
        const timer = window.setTimeout(() => { const r = botTurn(); if (r) { sayNonce.current += 1; setSay({ ...r, n: sayNonce.current }) } }, BOT_THINK_MS)
        return () => window.clearTimeout(timer)
    }, [table?.toAct, table?.handId, table?.phase, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante (sauf si le joueur est ruiné, ou tous les boss ruinés → on encaisse).
    useEffect(() => {
        if (phase !== "play" || !table || dayOver) return
        const meNow = table.seats.find((s) => s.id === myUserId)
        if (meNow && meNow.stack <= 0) return
        if (table.phase === "handComplete") {
            if (nextTimer.current) return
            nextTimer.current = window.setTimeout(() => { nextTimer.current = null; setSay(null); nextHand() }, NEXT_HAND_MS)
        }
        return () => { if (nextTimer.current) { window.clearTimeout(nextTimer.current); nextTimer.current = null } }
    }, [table?.phase, table?.handId, phase, dayOver]) // eslint-disable-line react-hooks/exhaustive-deps

    function start() {
        const bi = Math.max(MIN_BUYIN, Math.min(player.reps, Math.floor(buyin) || MIN_BUYIN))
        if (player.reps < bi) return
        if (!casinoBetAllowed(bi).ok) return // VŒU DU GÉNIE : buy-in (≥ 20) au-dessus du cap casino 10/mise → interdit
        spentRef.current = bi // buy-in au RISQUE (pas encore débité — réglé en NET à la sortie → un refresh n'engage rien)
        const { cap, bossStacks } = beginPokerCashGame(todayKey(), bi)
        persistYellowSave() // verrouille le cap/jour du cash même si la session est ensuite abandonnée
        joinCash(bi, cap, bossStacks)
        setPhase("play")
    }
    function playerAct(move: Parameters<typeof act>[0], text: string) {
        sayNonce.current += 1; setSay({ seat: mySeatIdx, text, n: sayNonce.current })
        act(move)
    }
    function cashOut() {
        if (cashingRef.current) return
        cashingRef.current = true
        const { playerTapis, bossStacks } = leaveCash()
        // Règlement du NET (buy-in jamais débité à l'assise) : on crédite le gain, ou on débite la perte.
        const net = playerTapis - spentRef.current
        if (net > 0) creditReps(net)          // crédit INTÉGRAL (jamais tronqué par le cap)
        else if (net < 0) spendReps(-net)     // perte réelle (≤ buy-in ≤ tes reps → toujours possible)
        savePokerBossStacks(bossStacks)
        persistYellowSave()
        setResult({ tapis: playerTapis, net })
        setPhase("done")
    }

    return (
        <div style={overlay}>
            <style>{POKER_CSS}</style>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — cash du jour vs les boss</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Blindes 1/2</span>
                </div>

                {phase === "intro" && (
                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <p style={{ margin: "4px 0" }}>Table à <b>6</b> : toi + <b>5 boss</b> de la Ligue et des arènes. <b>Vraies reps</b> — tu gagnes et tu perds pour de vrai.</p>
                        <ul style={{ margin: "6px 0", paddingLeft: 18, opacity: 0.9 }}>
                            <li>Chaque boss démarre avec un tapis <b>= ton buy-in</b> (jamais plus que toi), mais <b>garde ses gains</b> d'une partie à l'autre.</li>
                            <li>Un boss que tu <b>ruines</b> (tapis 0) <b>quitte la table</b> et ne revient que <b>demain</b>.</li>
                            <li>Tu peux <b>encaisser</b> ton tapis et partir quand tu veux.</li>
                        </ul>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                            <span style={{ fontSize: 12 }}>Reps : <b>{player.reps} ⚡</b> · Buy-in :</span>
                            <input type="number" min={MIN_BUYIN} max={player.reps} value={buyin} onChange={(e) => setBuyin(Number(e.target.value))} style={inp} />
                        </div>
                        <button style={{ ...bigBtn, background: "#4cd964", color: "#0a2a12", width: "100%" }} disabled={player.reps < Math.max(MIN_BUYIN, buyin)} onClick={start}>
                            S'asseoir ({Math.max(MIN_BUYIN, Math.min(player.reps, buyin || 0))} ⚡)
                        </button>
                        {player.reps < Math.max(MIN_BUYIN, buyin) && <div style={{ fontSize: 10.5, color: "#e0a0a0", textAlign: "center", marginTop: 4 }}>Pas assez de reps (min {MIN_BUYIN} ⚡).</div>}
                        <button style={{ ...btn, background: "#334", width: "100%", marginTop: 6 }} onClick={onDone}>Fermer</button>
                    </div>
                )}

                {phase === "play" && (
                    <>
                        {bossBustNote && <div key={bossBustNote} style={{ ...bustBanner, animation: "pkPop 0.5s ease-out" }}>{bossBustNote}</div>}
                        <PokerTableView table={table} myUserId={myUserId} say={say} />

                        {dayOver ? (
                            <div style={{ ...bustBanner, background: "#2a3d1e" }}>🏆 Tu as ruiné tous les boss du jour ! Encaisse — ils reviennent demain.</div>
                        ) : meRuined ? (
                            <div style={{ ...bustBanner, background: "#3a1e1e" }}>💥 Tu es ruiné — encaisse pour régler tes pertes (attends la fin de la main).</div>
                        ) : handDone ? (
                            <div style={{ textAlign: "center", fontSize: 11, opacity: 0.65, marginBottom: 4 }}>main suivante…</div>
                        ) : null}

                        {myTurn && !dayOver ? (
                            <div style={controls}>
                                <button style={{ ...bigBtn, background: "#e0574c" }} onClick={() => playerAct({ kind: "fold" }, "je me couche")}>Se coucher</button>
                                {canCheck
                                    ? <button style={{ ...bigBtn, background: "#5b8fe0" }} onClick={() => playerAct({ kind: "check" }, "check")}>Check</button>
                                    : <button style={{ ...bigBtn, background: "#5b8fe0" }} onClick={() => playerAct({ kind: "call" }, "je suis")}>Suivre {Math.min(toCall, me?.stack ?? 0)}</button>}
                                <button style={{ ...bigBtn, background: "#b07be0" }} onClick={() => playerAct({ kind: "allin" }, "TAPIS !")}>Tapis ({me?.stack ?? 0})</button>
                                {maxRaiseTo > minRaiseTo && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", marginTop: 2 }}>
                                        <input type="range" min={minRaiseTo} max={maxRaiseTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} style={{ flex: 1, maxWidth: 150 }} />
                                        <button style={{ ...bigBtn, background: "#ffd54a", color: "#1a1a22" }} onClick={() => playerAct({ kind: "raise", to: raiseTo }, `relance à ${raiseTo}`)}>Relancer à {raiseTo}</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ ...controls, opacity: 0.9, fontSize: 12, minHeight: 36, alignItems: "center" }}>
                                {dayOver || meRuined || handDone ? "" : "⏳ les boss réfléchissent…"}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                            <button style={{ ...btn, background: canCashOut ? "#4cd964" : "#334", color: canCashOut ? "#0a2a12" : "#889" }} disabled={!canCashOut} onClick={cashOut}
                                title={canCashOut ? "" : "Attends la fin de la main pour encaisser"}>
                                Encaisser et partir ({me?.stack ?? 0} ⚡)
                            </button>
                        </div>
                    </>
                )}

                {phase === "done" && result && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
                        <div style={{ fontSize: 38, margin: "6px 0", animation: "pkPop 0.6s ease-out" }}>{result.net > 0 ? "🤑" : result.net < 0 ? "😬" : "😐"}</div>
                        <p style={{ margin: "4px 0" }}>Tu quittes la table avec <b>{result.tapis} ⚡</b>.</p>
                        <div style={{ ...bustBanner, background: result.net >= 0 ? "#1e3a24" : "#3a1e1e" }}>
                            {result.net >= 0 ? `💰 Bénéfice du jour : +${result.net} ⚡` : `📉 Perte : ${result.net} ⚡`}
                        </div>
                        <p style={{ fontSize: 11, opacity: 0.75, margin: "6px 0" }}>Les boss ruinés reviennent demain, plus remontés que jamais.</p>
                        <button style={{ ...bigBtn, background: "#4cd964", color: "#0a2a12", width: "100%" }} onClick={onDone}>Terminer</button>
                    </div>
                )}
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 400, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", justifyContent: "center", padding: "6px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }
const bigBtn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 11, padding: "12px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", minWidth: 84, boxShadow: "0 2px 5px #0005" }
const inp: React.CSSProperties = { width: 72, padding: "7px 6px", borderRadius: 6, border: "1px solid #445", background: "#0e1119", color: "#fff", fontSize: 13 }
const bustBanner: React.CSSProperties = { borderRadius: 9, padding: "7px 10px", fontSize: 12.5, textAlign: "center", margin: "2px 0 8px", background: "#3a1e2e", fontWeight: 700 }
