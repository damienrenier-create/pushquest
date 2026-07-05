"use client"

// Nexus — Poker : PREMIÈRE PARTIE (tuto SOLO vs 3 bots, 100 % LOCAL, house-funded).
// Composant ISOLÉ (n'affecte pas la table multijoueur). La maison AVANCE 100 ⚡ (crédit) : le joueur les
// joue, et rembourse l'avance s'il repart avec un gros tapis (>200 → 100, >500 → 200). Risque nul : les
// reps ne sont jamais débités, il ne fait qu'encaisser. Rythme lenteur/suspense : les bots jouent UN PAR
// UN (botTurn), avec leurs paroles ; cartes qui flippent, jetons, glow de victoire.

import { useEffect, useMemo, useRef, useState } from "react"
import { usePlayer, grantReps, markPokerFirstGameDone } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { useLocalPoker } from "@/lib/gamebook/yellow/multiplayer/useLocalPoker"
import { FIRST_GAME_GIFT } from "@/lib/gamebook/yellow/poker/soloSession"
import { SUIT_SYMBOL, type Card } from "@/lib/gamebook/yellow/poker/cards"
import { CATEGORY_LABEL, evaluateBest } from "@/lib/gamebook/yellow/poker/handEval"

const RANK: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }
const rk = (r: number) => RANK[r] ?? String(r)
const BOT_THINK_MS = 1150   // tempo entre chaque action de bot (suspense)
const NEXT_HAND_MS = 5200   // pause pour savourer le résultat avant la main suivante

const CSS = `
@keyframes pkFlip { from { transform: rotateY(90deg) scale(0.9); opacity: 0 } to { transform: rotateY(0) scale(1); opacity: 1 } }
@keyframes pkChip { from { transform: scale(0) translateY(8px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }
@keyframes pkPot { 0%,100% { transform: scale(1) } 50% { transform: scale(1.14) } }
@keyframes pkSay { from { transform: translateY(6px) scale(0.8); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes pkWin { 0%,100% { box-shadow: 0 0 0 rgba(255,213,74,0) } 50% { box-shadow: 0 0 18px 4px rgba(255,213,74,0.85) } }
@keyframes pkPop { 0% { transform: scale(0.4); opacity: 0 } 45% { transform: scale(1.18); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
`

function CardView({ c, hidden, delay = 0 }: { c?: Card; hidden?: boolean; delay?: number }) {
    if (hidden || !c) return <div style={{ ...cardBox, background: "#2b3550", color: "#66789e", border: "1px solid #1b2236" }}>🂠</div>
    const red = c.suit === 1 || c.suit === 2
    return (
        <div style={{ ...cardBox, color: red ? "#c0392b" : "#141a2e", animation: `pkFlip 0.42s ease-out ${delay}s both` }}>
            <span>{rk(c.rank)}</span><span style={{ fontSize: 15 }}>{SUIT_SYMBOL[c.suit]}</span>
        </div>
    )
}

export default function SoloPokerPanel({ onDone, myUserId }: { onDone: () => void; myUserId: string }) {
    const player = usePlayer()
    const { table, join, act, nextHand, leave, firstHandDone, settleInfo, botTurn } = useLocalPoker(myUserId, "Toi")
    const [raiseTo, setRaiseTo] = useState(0)
    const [phase, setPhase] = useState<"intro" | "play" | "done">("intro")
    const [say, setSay] = useState<{ seat: number; text: string; n: number } | null>(null) // dernière parole (bot ou joueur)
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
    const winnerIdxs = useMemo(() => (handDone && table ? [...new Set(table.results.flatMap((p) => p.winners))] : []), [handDone, table])
    const iWon = winnerIdxs.includes(mySeatIdx)

    useEffect(() => { setRaiseTo(Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo || minRaiseTo))) }, [minRaiseTo, maxRaiseTo]) // eslint-disable-line react-hooks/exhaustive-deps

    // TEMPO — quand c'est au tour d'un BOT (main live), il joue UNE action après un délai (suspense).
    useEffect(() => {
        if (phase !== "play" || !table) return
        const live = table.phase === "preflop" || table.phase === "flop" || table.phase === "turn" || table.phase === "river"
        if (!live || table.toAct < 0) return
        const actor = table.seats[table.toAct]
        if (!actor || !actor.bot) return // au tour du joueur → on attend son clic
        const timer = window.setTimeout(() => {
            const r = botTurn()
            if (r) { sayNonce.current += 1; setSay({ ...r, n: sayNonce.current }) }
        }, BOT_THINK_MS)
        return () => window.clearTimeout(timer)
    }, [table?.toAct, table?.handId, table?.phase, phase]) // eslint-disable-line react-hooks/exhaustive-deps

    // Relance auto de la main suivante après une pause (sauf si le joueur a fait tapis → il encaisse).
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

    const myHandLabel = useMemo(() => {
        if (!me?.hole || me.hole.length < 2 || !table) return null
        const all = [...me.hole, ...table.community]
        if (all.length < 5) return null
        return CATEGORY_LABEL[evaluateBest(all).category]
    }, [me?.hole, table?.community]) // eslint-disable-line react-hooks/exhaustive-deps

    async function start() { await join(FIRST_GAME_GIFT); setPhase("play") }
    function playerAct(move: Parameters<typeof act>[0], text: string) {
        sayNonce.current += 1; setSay({ seat: mySeatIdx, text, n: sayNonce.current })
        void act(move)
    }
    async function cashOut() {
        if (cashingRef.current) return
        cashingRef.current = true
        const kept = await leave()
        if (kept > 0) grantReps(kept)
        markPokerFirstGameDone()
        persistYellowSave()
        setPhase("done")
    }

    return (
        <div style={overlay}>
            <style>{CSS}</style>
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
                        {/* TABLE (feutre vert) : pot + board */}
                        <div style={felt}>
                            <div style={potWrap}>
                                <span key={table?.pot ?? 0} style={{ ...potChip, animation: "pkPot 0.5s ease-out" }}>POT&nbsp;<b>{table?.pot ?? 0}</b>&nbsp;⚡</span>
                            </div>
                            <div style={{ display: "flex", gap: 5, justifyContent: "center", minHeight: 48 }}>
                                {[0, 1, 2, 3, 4].map((i) => {
                                    const c = table?.community[i]
                                    return c ? <CardView key={`${c.rank}-${c.suit}`} c={c} delay={0.07 * i} /> : <CardView key={`b${i}`} hidden />
                                })}
                            </div>
                            <div style={{ textAlign: "center", fontSize: 11, opacity: 0.85, marginTop: 6, minHeight: 15 }}>
                                {table ? phaseLabel(table.phase) : "…"}{myHandLabel ? ` · ta main : ${myHandLabel}` : ""}
                            </div>
                        </div>

                        {/* Sièges */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, margin: "8px 0" }}>
                            {(table?.seats ?? []).map((s, i) => {
                                const mine = s.id === myUserId
                                const turn = table && table.toAct === i && !handDone
                                const isWinner = winnerIdxs.includes(i)
                                return (
                                    <div key={s.id} style={{
                                        ...seatBox, position: "relative",
                                        border: isWinner ? "2px solid #ffd54a" : turn ? "2px solid #ffe98a" : "1px solid #ffffff22",
                                        opacity: s.folded ? 0.4 : 1,
                                        animation: isWinner ? "pkWin 1s ease-in-out infinite" : undefined,
                                    }}>
                                        {say && say.seat === i && (
                                            <div key={say.n} style={sayBubble}>{say.text}</div>
                                        )}
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                                            <span>{i === table?.button ? "🔘 " : ""}{s.name}{s.bot ? " 🤖" : ""}{mine ? " (toi)" : ""}</span>
                                            <span style={{ color: "#ffd54a" }}>{s.stack} ⚡</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4, minHeight: 44 }}>
                                            {s.hole && s.hole.length ? s.hole.map((c, k) => <CardView key={`${table?.handId}-${k}`} c={c} delay={0.08 * k} />)
                                                : Array.from({ length: s.holeCount }).map((_, k) => <CardView key={k} hidden />)}
                                            <span style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                                {s.betThisRound > 0 && <span key={s.betThisRound} style={{ ...betChip, animation: "pkChip 0.35s ease-out" }}>🪙 {s.betThisRound}</span>}
                                                <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, color: s.allIn ? "#b07be0" : s.folded ? "#889" : "#cfd" }}>
                                                    {s.allIn ? "ALL-IN" : s.folded ? "couché" : ""}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Résultat de main */}
                        {handDone && winnerIdxs.length > 0 && (
                            <div style={{ ...banner, background: iWon ? "#2a3d1e" : "#241c2e", animation: "pkPop 0.5s ease-out" }}>
                                {iWon ? "🎉 " : ""}<b>{winnerIdxs.map((wi) => table!.seats[wi]?.name).filter(Boolean).join(", ")}</b> {winnerIdxs.length > 1 ? "se partagent" : "remporte"} le pot ! <span style={{ opacity: 0.65, fontSize: 11 }}>(main suivante…)</span>
                            </div>
                        )}

                        {/* Actions (GROS boutons) */}
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
                        <div style={{ ...banner, background: "#1c2231", textAlign: "left", fontSize: 12 }}>
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

function phaseLabel(p: string): string {
    return ({ preflop: "Pré-flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Abattage", handComplete: "Fin de main" } as Record<string, string>)[p] ?? p
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }
const panel: React.CSSProperties = { background: "#141822", color: "#fff", borderRadius: 14, padding: 14, width: 400, maxWidth: "95vw", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 10px 40px #000a" }
const felt: React.CSSProperties = { background: "radial-gradient(circle at 50% 35%, #1f7a3f, #124b27)", border: "3px solid #6b3f1e", borderRadius: 14, padding: "10px 10px 8px", boxShadow: "inset 0 0 24px #0a2e18, 0 2px 6px #0006", marginBottom: 4 }
const potWrap: React.CSSProperties = { display: "flex", justifyContent: "center", marginBottom: 8 }
const potChip: React.CSSProperties = { display: "inline-block", background: "#0e2a18", border: "2px solid #ffd54a88", color: "#ffe98a", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 800, letterSpacing: 0.4 }
const cardBox: React.CSSProperties = { width: 32, height: 44, borderRadius: 6, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, lineHeight: 1, boxShadow: "0 1px 3px #0006" }
const seatBox: React.CSSProperties = { background: "#1c2231", borderRadius: 9, padding: "6px 8px" }
const sayBubble: React.CSSProperties = { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#fff", color: "#1a1a2e", fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap", boxShadow: "0 2px 6px #0007", zIndex: 3, animation: "pkSay 0.25s ease-out" }
const betChip: React.CSSProperties = { background: "#3a2d0e", border: "1px solid #ffd54a66", color: "#ffe98a", borderRadius: 10, padding: "1px 6px", fontSize: 10.5, fontWeight: 800 }
const controls: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", justifyContent: "center", padding: "6px 0" }
const btn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }
const bigBtn: React.CSSProperties = { color: "#fff", border: "none", borderRadius: 11, padding: "12px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", minWidth: 84, boxShadow: "0 2px 5px #0005" }
const banner: React.CSSProperties = { borderRadius: 9, padding: "7px 10px", fontSize: 12.5, textAlign: "center", margin: "2px 0 8px" }
