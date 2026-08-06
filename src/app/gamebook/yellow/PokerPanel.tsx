"use client"

// Nexus — Poker Texas Hold'em MULTIJOUEUR (casino). Table partagée temps réel (hook useCasinoPoker).
// Mise en reps : buy-in débité à l'assise, tapis recrédité au départ (v1 client, groupe de confiance).
// La VUE DE TABLE (felt, cartes qui flippent, jetons, glow) est partagée avec la 1re partie solo.
// ⚠️ À TESTER EN LIVE à plusieurs (le réseau/UI ne se valident qu'avec de vrais joueurs connectés).

import { useEffect, useRef, useState } from "react"
import { usePlayer, spendReps, grantReps, creditReps, casinoBetAllowed, recordCasinoSpend } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useCasinoPoker } from "@/lib/gamebook/yellow/multiplayer/useCasinoPoker"
import { PokerTableView, POKER_CSS } from "./PokerTableView"

const DEFAULT_BUYIN = 40 // 20 grosses blindes (BB=2) — micro-mise adaptée aux blindes 1/2
const MIN_BUYIN = 20

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
    const seatedCount = table?.seats.filter((s) => !s.sittingOut).length ?? 0

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
        const bi = Math.max(MIN_BUYIN, Math.min(5000, Math.floor(buyin)))
        if (player.reps < bi) return
        if (!casinoBetAllowed(bi).ok) return // VŒU DU GÉNIE : buy-in au-dessus du cap casino (10/mise, 200/jour) → interdit
        spendReps(bi); persistYellowSave()
        const ok = await join(bi)
        if (!ok) { grantReps(bi); persistYellowSave() } // échec (table pleine) → remboursé (rien enregistré au cap)
        else recordCasinoSpend(bi) // buy-in effectif → compte au plafond 200/jour du vœu

    }
    async function doLeave() {
        const refund = await leave()
        if (refund > 0) { creditReps(refund); persistYellowSave() } // crédit INTÉGRAL (jamais tronqué par le cap)
    }

    return (
        <div style={overlay}>
            <style>{POKER_CSS}</style>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — Texas Hold'em</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Blindes {table?.blinds.sb ?? 1}/{table?.blinds.bb ?? 2}</span>
                </div>

                <PokerTableView table={table} myUserId={myUserId} />

                {/* Contrôles */}
                {!me ? (
                    <div style={controls}>
                        <span style={{ fontSize: 12 }}>Reps : <b>{player.reps} ⚡</b></span>
                        <input type="number" min={MIN_BUYIN} max={5000} value={buyin} onChange={(e) => setBuyin(Number(e.target.value))} style={inp} />
                        <button style={{ ...bigBtn, background: "#4cd964", color: "#0a2a12" }} disabled={busy || player.reps < Math.max(MIN_BUYIN, buyin)} onClick={sitDown}>S'asseoir ({Math.max(MIN_BUYIN, buyin || 0)} ⚡)</button>
                        {player.reps < Math.max(MIN_BUYIN, buyin) && (
                            <span style={{ fontSize: 10.5, color: "#e0a0a0", width: "100%", textAlign: "center" }}>
                                Pas assez de reps (min {MIN_BUYIN} ⚡ · tu as {player.reps}).
                            </span>
                        )}
                    </div>
                ) : myTurn ? (
                    <div style={controls}>
                        <button style={{ ...bigBtn, background: "#e0574c" }} disabled={busy} onClick={() => act({ kind: "fold" })}>Se coucher</button>
                        {canCheck
                            ? <button style={{ ...bigBtn, background: "#5b8fe0" }} disabled={busy} onClick={() => act({ kind: "check" })}>Check</button>
                            : <button style={{ ...bigBtn, background: "#5b8fe0" }} disabled={busy} onClick={() => act({ kind: "call" })}>Suivre {Math.min(toCall, me.stack)}</button>}
                        <button style={{ ...bigBtn, background: "#b07be0" }} disabled={busy} onClick={() => act({ kind: "allin" })}>Tapis ({me.stack})</button>
                        {maxRaiseTo > minRaiseTo && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", marginTop: 2 }}>
                                <input type="range" min={minRaiseTo} max={maxRaiseTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} style={{ flex: 1, maxWidth: 150 }} />
                                <button style={{ ...bigBtn, background: "#ffd54a", color: "#1a1a22" }} disabled={busy} onClick={() => act({ kind: "raise", to: raiseTo })}>Relancer à {raiseTo}</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ ...controls, opacity: 0.9, fontSize: 12, minHeight: 38, alignItems: "center" }}>
                        <span>{seatedCount < 2 ? "⏳ en attente d'un 2ᵉ joueur…" : table?.phase === "handComplete" ? "main terminée." : "⏳ au tour des autres…"}</span>
                        <button style={{ ...btn, background: "#556" }} disabled={busy} onClick={() => sit(!me.wantsSitOut)}>{me.wantsSitOut ? "Revenir" : "Pause"}</button>
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 6 }}>
                    <button style={{ ...btn, background: "#334" }} onClick={() => void refresh()}>↻</button>
                    <button style={{ ...btn, background: "#334", flex: 1 }} onClick={doLeave} disabled={busy}>Quitter (récupère {me?.stack ?? 0} ⚡)</button>
                    <button style={{ ...btn, background: "#334" }} onClick={close}>Fermer</button>
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 400, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", justifyContent: "center", padding: "6px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "8px 11px", fontSize: 12, fontWeight: 800, cursor: "pointer" }
const bigBtn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 11, padding: "12px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", minWidth: 84, boxShadow: "0 2px 5px #0005" }
const inp: React.CSSProperties = { width: 70, padding: "7px 6px", borderRadius: 6, border: "1px solid #445", background: "#0e1119", color: "#fff", fontSize: 13 }
