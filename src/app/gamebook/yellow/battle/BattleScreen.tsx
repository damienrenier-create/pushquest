"use client"

// Nexus Jaune Éclair — écran de combat (UI minimale, style Game Boy).
// Le moteur résout un tour COMPLET et produit une file d'événements ordonnée
// (messages, variations de PV, K.O., changements…). Cet écran REJOUE cette file
// pas à pas : un message attend un tap ; un changement de PV s'anime (la barre
// descend + le Daemon touché tremble) puis on enchaîne. Ainsi les attaques
// paraissent bien séquentielles (jamais simultanées). Aucune règle recalculée ici.

import { useEffect, useRef, useState } from "react"
import { useBattle, submitPlayerAction, endBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { speciesOf, maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { BattleMon } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { ITEMS } from "@/lib/gamebook/yellow/data/items"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"

type Menu = "root" | "moves" | "switch" | "ball"

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

export default function BattleScreen() {
    const battle = useBattle()
    const [step, setStep] = useState(0)
    const [menu, setMenu] = useState<Menu>("root")
    const [disp, setDisp] = useState<DispHp | null>(null)
    const [shakeP, setShakeP] = useState(0)
    const [shakeE, setShakeE] = useState(0)
    const lastBattle = useRef(battle)

    // Initialise les PV affichés au tout début du combat (ils sont ensuite
    // CONSERVÉS d'un tour à l'autre → pas de saut visuel entre les tours).
    useEffect(() => {
        if (battle && disp === null) {
            const p = battle.player.team[battle.player.activeIndex]
            const e = battle.enemy.team[battle.enemy.activeIndex]
            setDisp({ p: p.currentHp, pMax: maxHpOf(p), e: e.currentHp, eMax: maxHpOf(e) })
        }
    }, [battle, disp])

    // Lecture de la file : reset au nouveau tour, sinon traite l'événement courant.
    useEffect(() => {
        if (!battle) return
        // Nouveau tour résolu → on repart au début de la file (et on attend le re-render).
        if (lastBattle.current !== battle) {
            lastBattle.current = battle
            setStep(0)
            setMenu("root")
            return
        }
        const ev = battle.events[step]
        if (!ev) return                      // file terminée → menu/fin
        if (ev.kind === "message") return    // on attend un tap du joueur

        // Événement non-textuel : on l'applique puis on enchaîne automatiquement.
        let delay = 140
        if (ev.kind === "hp") {
            setDisp((d) => {
                if (!d) return d
                const next = { ...d }
                if (ev.side === "player") {
                    if (ev.hp < d.p) setShakeP((k) => k + 1)
                    next.p = ev.hp; next.pMax = ev.max
                } else {
                    if (ev.hp < d.e) setShakeE((k) => k + 1)
                    next.e = ev.hp; next.eMax = ev.max
                }
                return next
            })
            delay = 340
        } else if (ev.kind === "faint") {
            delay = 320
        }
        const t = setTimeout(() => setStep((s) => s + 1), delay)
        return () => clearTimeout(t)
    }, [battle, step])

    if (!battle) return null

    const events = battle.events
    const playbackDone = step >= events.length
    const waitingForTap = !playbackDone && events[step]?.kind === "message"
    const shownMsg = lastMessageAt(events, step)

    const player = battle.player.team[battle.player.activeIndex]
    const enemy = battle.enemy.team[battle.enemy.activeIndex]

    const isEnded = battle.phase === "ended"
    const needSwitch = battle.forcedSwitch === "player"

    // --- handlers ---
    const advance = () => { if (waitingForTap) setStep((s) => s + 1) }
    const useMove = (i: number) => { submitPlayerAction({ kind: "move", moveIndex: i }); setMenu("root") }
    const doSwitch = (i: number) => { submitPlayerAction({ kind: "switch", teamIndex: i }); setMenu("root") }
    const throwBall = (itemId: string) => { submitPlayerAction({ kind: "ball", itemId }); setMenu("root") }
    const run = () => submitPlayerAction({ kind: "run" })

    const pHp = disp?.p ?? player.currentHp
    const pMax = disp?.pMax ?? maxHpOf(player)
    const eHp = disp?.e ?? enemy.currentHp
    const eMax = disp?.eMax ?? maxHpOf(enemy)

    return (
        <div style={S.root} onClick={waitingForTap ? advance : undefined}>
            {/* ===== Scène ===== */}
            <div style={S.scene}>
                <div style={S.enemyRow}>
                    <MonInfo mon={enemy} hp={eHp} max={eMax} />
                    <MonSprite mon={enemy} facing="front" alive={eHp > 0} hitKey={shakeE} />
                </div>
                <div style={S.playerRow}>
                    <MonSprite mon={player} facing="back" alive={pHp > 0} hitKey={shakeP} />
                    <MonInfo mon={player} self hp={pHp} max={pMax} />
                </div>
            </div>

            {/* ===== Boîte du bas ===== */}
            <div style={S.bottom}>
                {!playbackDone ? (
                    <div style={S.msgBox}>
                        <p style={S.msgText}>{shownMsg}</p>
                        {waitingForTap && <span style={S.next}>▶</span>}
                    </div>
                ) : isEnded ? (
                    <EndBox outcome={battle.outcome} />
                ) : needSwitch ? (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} forced />
                ) : menu === "root" ? (
                    <div style={S.menuGrid}>
                        <button style={S.btn} onClick={() => setMenu("moves")}>ATTAQUE</button>
                        <button style={battle.isWild ? S.btn : S.btnDim} disabled={!battle.isWild} onClick={battle.isWild ? () => setMenu("ball") : undefined}>SAC</button>
                        <button style={S.btn} onClick={() => setMenu("switch")}>DAEMON</button>
                        <button style={battle.isWild ? S.btn : S.btnDim} disabled={!battle.isWild} onClick={battle.isWild ? run : undefined}>FUITE</button>
                    </div>
                ) : menu === "moves" ? (
                    <MoveMenu mon={player} onPick={useMove} onBack={() => setMenu("root")} />
                ) : menu === "ball" ? (
                    <BallMenu onPick={throwBall} onBack={() => setMenu("root")} />
                ) : (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} onBack={() => setMenu("root")} />
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
            <div style={S.hpRow}>
                <span style={S.hpLabel}>PV</span>
                <div style={S.hpTrack}><div style={{ ...S.hpFill, width: `${pct}%`, background: col }} /></div>
            </div>
            {self && <div style={S.hpNum}>{Math.max(0, Math.round(hp))}/{max}</div>}
            {hp > 0 && mon.status !== "NONE" && <span style={S.statusTag}>{mon.status}</span>}
        </div>
    )
}

function MonSprite({ mon, facing, alive, hitKey }: { mon: BattleMon; facing: "front" | "back"; alive: boolean; hitKey: number }) {
    // Sprite PNG (public/) avec repli sur l'initiale si le fichier manque.
    // `key={hitKey}` force un remount à chaque coup encaissé → l'animation de tremblement rejoue.
    const sp = speciesOf(mon)
    const [err, setErr] = useState(false)
    return (
        <div
            key={hitKey}
            style={{
                ...(err ? S.sprite : S.spriteBox),
                opacity: alive ? 1 : 0.25,
                transform: facing === "back" ? "scaleX(-1)" : "none",
                animation: hitKey > 0 ? "hitShake 0.3s ease-in-out" : "none",
            }}
        >
            {err
                ? <span style={S.spriteGlyph}>{sp.name[0]}</span>
                : <img src={sp.sprite} alt={sp.name} onError={() => setErr(true)}
                    style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

function MoveMenu({ mon, onPick, onBack }: { mon: BattleMon; onPick: (i: number) => void; onBack: () => void }) {
    return (
        <div style={S.menuGrid}>
            {mon.moves.map((slot, i) => {
                const m = getMove(slot.moveId)
                const dead = slot.pp <= 0
                return (
                    <button key={i} style={dead ? S.btnDim : S.btn} disabled={dead} onClick={() => onPick(i)}>
                        {m?.name ?? slot.moveId} <span style={S.pp}>{slot.pp}/{slot.ppMax}</span>
                    </button>
                )
            })}
            {Array.from({ length: Math.max(0, 4 - mon.moves.length) }).map((_, i) => <span key={`e${i}`} />)}
            <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>
        </div>
    )
}

function SwitchMenu({ team, activeIndex, onPick, onBack, forced }: {
    team: BattleMon[]; activeIndex: number; onPick: (i: number) => void; onBack?: () => void; forced?: boolean
}) {
    return (
        <div style={S.menuGrid}>
            {forced && <p style={{ ...S.msgText, gridColumn: "1 / -1" }}>Choisis un Daemon !</p>}
            {team.map((m, i) => {
                const ko = m.currentHp <= 0
                const cur = i === activeIndex
                const disabled = ko || cur
                return (
                    <button key={m.uid} style={disabled ? S.btnDim : S.btn} disabled={disabled} onClick={() => onPick(i)}>
                        {displayName(m)} {ko ? "(K.O.)" : `${m.currentHp}PV`}
                    </button>
                )
            })}
            {!forced && onBack && <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>}
        </div>
    )
}

function BallMenu({ onPick, onBack }: { onPick: (id: string) => void; onBack: () => void }) {
    const items = usePlayer().items
    const balls = Object.values(ITEMS).filter((it) => it.category === "BALL" && (items[it.id] ?? 0) > 0)
    return (
        <div style={S.menuGrid}>
            {balls.length === 0 && (
                <div style={{ gridColumn: "1 / -1", fontSize: 11, fontStyle: "italic", opacity: 0.7, padding: 4 }}>
                    Aucune Ball ! Va en acheter à la boutique.
                </div>
            )}
            {balls.map((b) => (
                <button key={b.id} style={S.btn} onClick={() => onPick(b.id)}>
                    {b.name} <span style={S.pp}>×{items[b.id]}</span>
                </button>
            ))}
            <button style={{ ...S.btnDim, gridColumn: "1 / -1" }} onClick={onBack}>← RETOUR</button>
        </div>
    )
}

function EndBox({ outcome }: { outcome: string | null }) {
    const txt = outcome === "win" ? "Tu remportes le combat !"
        : outcome === "lose" ? "Tous tes Daemons sont K.O…"
            : outcome === "run" ? "Tu as pris la fuite."
                : outcome === "caught" ? "Daemon capturé !"
                    : "Fin du combat."
    return (
        <div style={S.msgBox}>
            <p style={S.msgText}>{txt}</p>
            <button style={{ ...S.btn, marginTop: 8 }} onClick={() => endBattle()}>QUITTER</button>
        </div>
    )
}

// ============================================================
// Styles (GBC-ish, inline pour rester autonome)
// ============================================================

const S: Record<string, React.CSSProperties> = {
    root: { width: "100%", maxWidth: 460, margin: "0 auto", fontFamily: "'Courier New', monospace", color: "#1c1408", userSelect: "none" },
    scene: { background: "linear-gradient(#9bd0e0 0%, #c8e89c 60%, #a8d878 100%)", border: "3px solid #1c1408", borderRadius: 6, padding: 14, display: "flex", flexDirection: "column", gap: 18, minHeight: 240 },
    enemyRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    playerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    info: { background: "#f8f8e8", border: "2px solid #1c1408", borderRadius: 6, padding: "6px 10px", minWidth: 160 },
    infoTop: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 700 },
    monName: { letterSpacing: 1 },
    monLvl: { opacity: 0.8 },
    hpRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
    hpLabel: { fontSize: 9, fontWeight: 700, color: "#c89000" },
    hpTrack: { flex: 1, height: 7, background: "#404040", borderRadius: 4, overflow: "hidden", border: "1px solid #1c1408" },
    hpFill: { height: "100%", transition: "width 0.4s ease" },
    hpNum: { textAlign: "right", fontSize: 10, fontWeight: 700, marginTop: 2 },
    statusTag: { display: "inline-block", marginTop: 3, fontSize: 8, fontWeight: 700, background: "#8868c0", color: "#fff", padding: "1px 5px", borderRadius: 3, letterSpacing: 1 },
    sprite: { width: 72, height: 72, borderRadius: "50%", background: "#ffffff80", border: "3px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center" },
    spriteBox: { width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" },
    spriteGlyph: { fontSize: 34, fontWeight: 900 },
    bottom: { marginTop: 8, minHeight: 96 },
    msgBox: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: 14, minHeight: 72, display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", position: "relative" },
    msgText: { fontSize: 14, lineHeight: 1.5, fontWeight: 700, margin: 0 },
    next: { position: "absolute", bottom: 6, right: 12, fontSize: 12, animation: "none" },
    menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    btn: { background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 6, padding: "12px 10px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1c1408", textAlign: "left" },
    btnDim: { background: "#d8d8c8", border: "3px solid #888", borderRadius: 6, padding: "12px 10px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#888", textAlign: "left" },
    pp: { float: "right", fontSize: 10, opacity: 0.7 },
}
