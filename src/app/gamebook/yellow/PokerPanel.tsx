"use client"

// Nexus — Poker Texas Hold'em MULTIJOUEUR (casino). Table partagée temps réel (hook useCasinoPoker).
// Mise en reps : buy-in débité à l'assise, tapis recrédité au départ (v1 client, groupe de confiance).
// ⚠️ À TESTER EN LIVE à plusieurs (le réseau/UI ne se valident qu'avec de vrais joueurs connectés).

import { useEffect, useMemo, useRef, useState } from "react"
import { usePlayer, spendReps, grantReps } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useCasinoPoker } from "@/lib/gamebook/yellow/multiplayer/useCasinoPoker"
import { SUIT_SYMBOL, type Card } from "@/lib/gamebook/yellow/poker/cards"
import { CATEGORY_LABEL, evaluateBest } from "@/lib/gamebook/yellow/poker/handEval"

const RANK: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }
const rk = (r: number) => RANK[r] ?? String(r)
const DEFAULT_BUYIN = 500

function CardView({ c, hidden }: { c?: Card; hidden?: boolean }) {
    if (hidden || !c) return <div style={{ ...cardBox, background: "#33405e", color: "#7a8bb0" }}>🂠</div>
    const red = c.suit === 1 || c.suit === 2
    return <div style={{ ...cardBox, color: red ? "#c0392b" : "#1a1a2e" }}><span>{rk(c.rank)}</span><span>{SUIT_SYMBOL[c.suit]}</span></div>
}

export default function PokerPanel({ close, myUserId }: { close: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, busy, join, act, sit, nextHand, leave, refresh } = useCasinoPoker(true, myUserId)
    const [buyin, setBuyin] = useState(DEFAULT_BUYIN)
    const [raiseTo, setRaiseTo] = useState(0)
    const nextTimer = useRef<number | null>(null)

    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const myTurn = !!(table && me && !me.folded && !me.allIn && table.toAct === mySeatIdx)
    const toCall = table && me ? Math.max(0, table.currentBet - me.betThisRound) : 0
    const canCheck = toCall === 0
    const minRaiseTo = table ? table.currentBet + table.minRaise : 0
    const maxRaiseTo = me ? me.betThisRound + me.stack : 0

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante ~5 s après un abattage (idempotent : plusieurs clients = sans effet).
    useEffect(() => {
        if (!table) return
        if (table.phase === "handComplete") {
            if (nextTimer.current) return
            nextTimer.current = window.setTimeout(() => { nextTimer.current = null; void nextHand() }, 5000)
        }
        return () => { if (nextTimer.current) { window.clearTimeout(nextTimer.current); nextTimer.current = null } }
    }, [table?.phase, table?.handId]) // eslint-disable-line react-hooks/exhaustive-deps

    async function sitDown() {
        const bi = Math.max(100, Math.min(5000, Math.floor(buyin)))
        if (player.reps < bi) return
        spendReps(bi); persistYellowSave()
        const ok = await join(bi)
        if (!ok) { grantReps(bi); persistYellowSave() } // échec (table pleine) → remboursé
    }
    async function doLeave() {
        const refund = await leave()
        if (refund > 0) { grantReps(refund); persistYellowSave() }
    }

    // Meilleure main affichée (info locale, à partir de mes cartes + le board).
    const myHandLabel = useMemo(() => {
        if (!me?.hole || me.hole.length < 2 || !table) return null
        const all = [...me.hole, ...table.community]
        if (all.length < 5) return null
        return CATEGORY_LABEL[evaluateBest(all).category]
    }, [me?.hole, table?.community]) // eslint-disable-line react-hooks/exhaustive-deps

    const seatedCount = table?.seats.filter((s) => !s.sittingOut).length ?? 0

    return (
        <div style={overlay}>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — Texas Hold'em</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Blindes {table?.blinds.sb ?? 5}/{table?.blinds.bb ?? 10} · Pot {table?.pot ?? 0} ⚡</span>
                </div>

                {/* Board */}
                <div style={{ display: "flex", gap: 5, justifyContent: "center", margin: "10px 0", minHeight: 46 }}>
                    {[0, 1, 2, 3, 4].map((i) => <CardView key={i} c={table?.community[i]} hidden={!table?.community[i]} />)}
                </div>
                <div style={{ textAlign: "center", fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                    {table ? phaseLabel(table.phase) : "Chargement…"}
                    {myHandLabel ? ` · ta main : ${myHandLabel}` : ""}
                </div>

                {/* Sièges */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    {(table?.seats ?? []).map((s, i) => {
                        const mine = s.id === myUserId
                        const turn = table && table.toAct === i
                        return (
                            <div key={s.id} style={{ ...seatBox, border: turn ? "2px solid #ffd54a" : "1px solid #ffffff22", opacity: s.folded ? 0.45 : 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                                    <span>{i === table?.button ? "🔘 " : ""}{s.name}{mine ? " (toi)" : ""}</span>
                                    <span style={{ color: "#ffd54a" }}>{s.stack} ⚡</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                                    {s.hole && s.hole.length ? s.hole.map((c, k) => <CardView key={k} c={c} />)
                                        : Array.from({ length: s.holeCount }).map((_, k) => <CardView key={k} hidden />)}
                                    <span style={{ fontSize: 10, opacity: 0.75, marginLeft: "auto" }}>
                                        {s.sittingOut ? "assis" : s.allIn ? "ALL-IN" : s.folded ? "couché" : s.betThisRound > 0 ? `mise ${s.betThisRound}` : ""}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Résultats d'abattage */}
                {table?.phase === "handComplete" && table.results.length > 0 && (
                    <div style={{ ...banner, background: "#1e3a24" }}>
                        {table.results.flatMap((p) => p.winners).map((wi) => table.seats[wi]?.name).filter((n, i, a) => n && a.indexOf(n) === i).join(", ")} remporte(nt) le pot ! <span style={{ opacity: 0.7 }}>(nouvelle main dans 5 s)</span>
                    </div>
                )}

                {/* Contrôles */}
                {!me ? (
                    <div style={controls}>
                        <span style={{ fontSize: 12 }}>Reps : <b>{player.reps} ⚡</b></span>
                        <input type="number" min={100} max={5000} value={buyin} onChange={(e) => setBuyin(Number(e.target.value))} style={inp} />
                        <button style={{ ...btn, background: "#4cd964" }} disabled={busy || player.reps < buyin} onClick={sitDown}>S'asseoir ({buyin} ⚡)</button>
                    </div>
                ) : myTurn ? (
                    <div style={controls}>
                        <button style={{ ...btn, background: "#e0574c" }} disabled={busy} onClick={() => act({ kind: "fold" })}>Se coucher</button>
                        {canCheck
                            ? <button style={{ ...btn, background: "#6aa0ec" }} disabled={busy} onClick={() => act({ kind: "check" })}>Check</button>
                            : <button style={{ ...btn, background: "#6aa0ec" }} disabled={busy} onClick={() => act({ kind: "call" })}>Suivre ({Math.min(toCall, me.stack)})</button>}
                        {maxRaiseTo > minRaiseTo && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input type="range" min={minRaiseTo} max={maxRaiseTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} />
                                <button style={{ ...btn, background: "#ffd54a", color: "#1a1a22" }} disabled={busy} onClick={() => act({ kind: "raise", to: raiseTo })}>Relancer à {raiseTo}</button>
                            </span>
                        )}
                        <button style={{ ...btn, background: "#b07be0" }} disabled={busy} onClick={() => act({ kind: "allin" })}>Tapis ({me.stack})</button>
                    </div>
                ) : (
                    <div style={{ ...controls, opacity: 0.85 }}>
                        <span style={{ fontSize: 12 }}>{seatedCount < 2 ? "En attente d'un 2ᵉ joueur…" : table?.phase === "handComplete" ? "Main terminée." : "En attente des autres…"}</span>
                        <button style={{ ...btn, background: "#556" }} disabled={busy} onClick={() => sit(!me.wantsSitOut)}>{me.wantsSitOut ? "Revenir" : "Se mettre en pause"}</button>
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <button style={{ ...btn, background: "#334" }} onClick={() => void refresh()}>↻</button>
                    <button style={{ ...btn, background: "#334" }} onClick={doLeave} disabled={busy}>Quitter la table (récupère {me?.stack ?? 0} ⚡)</button>
                    <button style={{ ...btn, background: "#334" }} onClick={close}>Fermer</button>
                </div>
            </div>
        </div>
    )
}

function phaseLabel(p: string): string {
    return ({ preflop: "Pré-flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Abattage", handComplete: "Fin de main" } as Record<string, string>)[p] ?? p
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 380, maxWidth: "94vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const cardBox: React.CSSProperties = { width: 30, height: 42, borderRadius: 5, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, lineHeight: 1 }
const seatBox: React.CSSProperties = { background: "#1c2231", borderRadius: 8, padding: "5px 7px" }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center", padding: "8px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }
const inp: React.CSSProperties = { width: 70, padding: "5px 6px", borderRadius: 6, border: "1px solid #445", background: "#0e1119", color: "#fff", fontSize: 12 }
const banner: React.CSSProperties = { borderRadius: 8, padding: "6px 10px", fontSize: 12, textAlign: "center", marginBottom: 8 }
