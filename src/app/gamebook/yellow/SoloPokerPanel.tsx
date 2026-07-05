"use client"

// Nexus — Poker : PREMIÈRE PARTIE (tuto SOLO vs 3 bots, 100 % LOCAL, house-funded).
// Composant ISOLÉ (n'affecte pas la table multijoueur). La maison AVANCE 100 ⚡ (crédit) : le joueur les
// joue, et rembourse l'avance s'il repart avec un gros tapis (>200 → 100, >500 → 200). Risque nul : les
// reps ne sont jamais débités. Rythme lenteur/suspense : les bots jouent UN PAR UN (botTurn) avec leurs
// paroles. La VUE DE TABLE (felt, cartes qui flippent, jetons, glow) est partagée avec la table multi.

import { useEffect, useRef, useState } from "react"
import { usePlayer, creditReps, markPokerFirstGameDone } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useLocalPoker } from "@/lib/gamebook/yellow/multiplayer/useLocalPoker"
import { FIRST_GAME_GIFT } from "@/lib/gamebook/yellow/poker/soloSession"
import { PokerTableView, POKER_CSS } from "./PokerTableView"

const BOT_THINK_MS = 1150   // tempo entre chaque action de bot (suspense)
const NEXT_HAND_MS = 5200   // pause pour savourer le résultat avant la main suivante

export default function SoloPokerPanel({ onDone, myUserId }: { onDone: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, join, act, nextHand, leave, firstHandDone, settleInfo, botTurn } = useLocalPoker(myUserId, "Toi")
    const [raiseTo, setRaiseTo] = useState(0)
    const [phase, setPhase] = useState<"intro" | "play" | "done">("intro")
    const [say, setSay] = useState<{ seat: number; text: string; n: number } | null>(null)
    const nextTimer = useRef<number | null>(null)
    const cashingRef = useRef(false)
    const sayNonce = useRef(0)

    const me = table?.seats.find((s) => s.id === myUserId) ?? null
    const mySeatIdx = table ? table.seats.findIndex((s) => s.id === myUserId) : -1
    const myTurn = !!(table && me && !me.folded && !me.allIn && table.toAct === mySeatIdx)
    const toCall = table && me ? Math.max(0, table.currentBet - me.betThisRound) : 0
    const canCheck = toCall === 0
    const minRaiseTo = table ? table.currentBet + table.minRaise : 0
    const maxRaiseTo = me ? me.betThisRound + me.stack : 0
    const handDone = table?.phase === "handComplete"

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // TEMPO — au tour d'un BOT (main live), il joue UNE action après un délai (suspense).
    useEffect(() => {
        if (phase !== "play" || !table) return
        const live = table.phase === "preflop" || table.phase === "flop" || table.phase === "turn" || table.phase === "river"
        if (!live || table.toAct < 0) return
        const actor = table.seats[table.toAct]
        if (!actor || !actor.bot) return
        const timer = window.setTimeout(() => {
            const r = botTurn()
            if (r) { sayNonce.current += 1; setSay({ ...r, n: sayNonce.current }) }
        }, BOT_THINK_MS)
        return () => window.clearTimeout(timer)
    }, [table?.toAct, table?.handId, table?.phase, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante après une pause (sauf si le joueur a fait tapis).
    useEffect(() => {
        if (phase !== "play" || !table) return
        const meNow = table.seats.find((s) => s.id === myUserId)
        if (meNow && meNow.stack <= 0) return
        if (table.phase === "handComplete") {
            if (nextTimer.current) return
            nextTimer.current = window.setTimeout(() => { nextTimer.current = null; setSay(null); void nextHand() }, NEXT_HAND_MS)
        }
        return () => { if (nextTimer.current) { window.clearTimeout(nextTimer.current); nextTimer.current = null } }
    }, [table?.phase, table?.handId, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    async function start() { await join(FIRST_GAME_GIFT); setPhase("play") }
    function playerAct(move: Parameters<typeof act>[0], text: string) {
        sayNonce.current += 1; setSay({ seat: mySeatIdx, text, n: sayNonce.current })
        void act(move)
    }
    async function cashOut() {
        if (cashingRef.current) return
        cashingRef.current = true
        const kept = await leave()
        if (kept > 0) creditReps(kept) // crédit INTÉGRAL : « encaisse tout » respecté (jamais rogné par le cap)
        markPokerFirstGameDone()
        persistYellowSave()
        setPhase("done")
    }

    return (
        <div style={overlay}>
            <style>{POKER_CSS}</style>
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b>🃏 Poker — ta première partie</b>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Blindes 1/2 · avance de la maison</span>
                </div>

                {phase === "intro" && (
                    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <p style={{ margin: "4px 0" }}>Pour t'initier, la maison t'<b>avance {FIRST_GAME_GIFT} ⚡</b> — un crédit pour jouer, en solo contre 3 adversaires. Tu es <b>obligé de les jouer</b> (au moins une main).</p>
                        <ul style={{ margin: "6px 0", paddingLeft: 18, opacity: 0.9 }}>
                            <li>C'est un <b>crédit</b> : si tu repars avec un gros tapis, tu rembourses l'avance — <b>100 ⚡</b> au-dessus de 200, <b>200 ⚡</b> (avec intérêts) au-dessus de 500.</li>
                            <li><b>Risque nul</b> : ce sont les jetons de la maison. Tu ne peux <b>rien perdre</b> de tes reps — tu ne fais qu'<b>encaisser</b> tes gains.</li>
                        </ul>
                        <button style={{ ...bigBtn, background: "#4cd964", color: "#0a2a12", width: "100%", marginTop: 6 }} onClick={start}>Recevoir {FIRST_GAME_GIFT} ⚡ et jouer</button>
                        <button style={{ ...btn, background: "#334", width: "100%", marginTop: 6 }} onClick={onDone}>Plus tard</button>
                    </div>
                )}

                {phase === "play" && (
                    <>
                        <PokerTableView table={table} myUserId={myUserId} say={say} />

                        {handDone && <div style={{ textAlign: "center", fontSize: 11, opacity: 0.65, marginBottom: 4 }}>main suivante…</div>}

                        {myTurn ? (
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
                            <div style={{ ...controls, opacity: 0.9, fontSize: 12, minHeight: 40, alignItems: "center" }}>
                                {handDone ? "" : "⏳ les adversaires réfléchissent…"}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                            {firstHandDone ? (
                                <button style={{ ...btn, background: "#4cd964", color: "#0a2a12" }} onClick={cashOut}>
                                    Encaisser et partir ({me?.stack ?? 0} ⚡ de tapis)
                                </button>
                            ) : (
                                <button style={{ ...btn, background: "#334", color: "#aab" }} onClick={onDone} title="Tu dois jouer au moins une main pour encaisser">
                                    Abandonner (aucun gain)
                                </button>
                            )}
                        </div>
                    </>
                )}

                {phase === "done" && settleInfo && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
                        <div style={{ fontSize: 38, margin: "6px 0", animation: "pkPop 0.6s ease-out" }}>{settleInfo.kept > 0 ? "🎉" : "🫥"}</div>
                        <p style={{ margin: "4px 0" }}>Fin de ta première partie !</p>
                        <div style={{ ...localBanner, background: "#1c2231", textAlign: "left" }}>
                            {settleInfo.repay > 0 && <div>🏦 Tu rembourses l'avance de la maison : <b>−{settleInfo.repay} ⚡</b></div>}
                            <div style={{ marginTop: 4, color: "#4cd964" }}>💰 Tu encaisses : <b>+{settleInfo.kept} ⚡</b></div>
                        </div>
                        <p style={{ fontSize: 11, opacity: 0.75, margin: "6px 0" }}>Les prochaines parties se jouent à la vraie table, avec tes potes — 100 % aléatoire.</p>
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
const localBanner: React.CSSProperties = { borderRadius: 9, padding: "7px 10px", fontSize: 12, margin: "2px 0 8px" }
