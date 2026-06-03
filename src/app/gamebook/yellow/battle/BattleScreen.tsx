"use client"

// Nexus Jaune Éclair — écran de combat (UI minimale).
// Lit l'état via le store (useBattle), rejoue la file de messages tour par tour,
// et déclenche les actions. AUCUNE règle de jeu recalculée ici : tout vient du moteur.

import { useEffect, useState } from "react"
import { useBattle, submitPlayerAction, endBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { speciesOf, maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { BattleMon } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"

type Menu = "root" | "moves" | "switch"

export default function BattleScreen() {
    const battle = useBattle()
    const [cursor, setCursor] = useState(0)
    const [menu, setMenu] = useState<Menu>("root")

    // Nouveau tour résolu → on rejoue la file depuis le début + reset menu.
    useEffect(() => {
        setCursor(0)
        setMenu("root")
    }, [battle])

    if (!battle) return null

    const messages = battle.events.filter((e) => e.kind === "message") as { kind: "message"; text: string }[]
    const playingDone = cursor >= messages.length
    const currentMsg = messages[cursor]?.text ?? ""

    const player = battle.player.team[battle.player.activeIndex]
    const enemy = battle.enemy.team[battle.enemy.activeIndex]

    const isEnded = battle.phase === "ended"
    const needSwitch = battle.forcedSwitch === "player"
    const canShowMenu = playingDone && !isEnded && !needSwitch

    // --- handlers ---
    const advance = () => { if (!playingDone) setCursor((c) => c + 1) }
    const useMove = (i: number) => { submitPlayerAction({ kind: "move", moveIndex: i }); setMenu("root") }
    const doSwitch = (i: number) => { submitPlayerAction({ kind: "switch", teamIndex: i }); setMenu("root") }
    const run = () => submitPlayerAction({ kind: "run" })

    return (
        <div style={S.root} onClick={!playingDone ? advance : undefined}>
            {/* ===== Scène ===== */}
            <div style={S.scene}>
                <div style={S.enemyRow}>
                    <MonInfo mon={enemy} />
                    <MonSprite mon={enemy} facing="front" />
                </div>
                <div style={S.playerRow}>
                    <MonSprite mon={player} facing="back" />
                    <MonInfo mon={player} self />
                </div>
            </div>

            {/* ===== Boîte du bas ===== */}
            <div style={S.bottom}>
                {!playingDone ? (
                    <div style={S.msgBox}>
                        <p style={S.msgText}>{currentMsg}</p>
                        <span style={S.next}>▶</span>
                    </div>
                ) : isEnded ? (
                    <EndBox outcome={battle.outcome} />
                ) : needSwitch ? (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} forced />
                ) : menu === "root" ? (
                    <div style={S.menuGrid}>
                        <button style={S.btn} onClick={() => setMenu("moves")}>ATTAQUE</button>
                        <button style={S.btnDim} disabled>SAC</button>
                        <button style={S.btn} onClick={() => setMenu("switch")}>DAEMON</button>
                        <button style={battle.isWild ? S.btn : S.btnDim} disabled={!battle.isWild} onClick={battle.isWild ? run : undefined}>FUITE</button>
                    </div>
                ) : menu === "moves" ? (
                    <MoveMenu mon={player} onPick={useMove} onBack={() => setMenu("root")} />
                ) : (
                    <SwitchMenu team={battle.player.team} activeIndex={battle.player.activeIndex} onPick={doSwitch} onBack={() => setMenu("root")} />
                )}
            </div>
        </div>
    )
}

// ============================================================
// Sous-composants
// ============================================================

function MonInfo({ mon, self }: { mon: BattleMon; self?: boolean }) {
    const max = maxHpOf(mon)
    const pct = Math.max(0, Math.min(100, (mon.currentHp / max) * 100))
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
            {self && <div style={S.hpNum}>{mon.currentHp}/{max}</div>}
            {mon.status !== "NONE" && <span style={S.statusTag}>{mon.status}</span>}
        </div>
    )
}

function MonSprite({ mon, facing }: { mon: BattleMon; facing: "front" | "back" }) {
    // Placeholder : pastille colorée + initiale (les vrais sprites arriveront dans public/).
    const sp = speciesOf(mon)
    return (
        <div style={{ ...S.sprite, opacity: mon.currentHp > 0 ? 1 : 0.25, transform: facing === "back" ? "scaleX(-1)" : "none" }}>
            <span style={S.spriteGlyph}>{sp.name[0]}</span>
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
