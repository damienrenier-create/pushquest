"use client"

// src/app/gamebook/BattleModal.tsx
//
// v4.0 Phase 2.C — Modal de combat (Pokémon Gen 1-like).
//
// Reçoit un BattleState initial (depuis /api/gamebook/daemon/battle/start).
// Pour chaque action utilisateur (attaque / fuite), POST sur
// /api/gamebook/daemon/battle/action et applique le nouveau state.
//
// Quand le state passe en phase="ended", affiche un écran résultat + FERMER.

import { useEffect, useState } from "react"
import type { BattleState, PlayerAction } from "@/lib/gamebook/battleState"
import { getAttack } from "@/lib/gamebook/attacks"
import { effectiveEnergyCost } from "@/lib/gamebook/combat"

interface Props {
    initialState: BattleState
    onClose: () => void
    /** Notifie le parent quand la battle est terminée (pour recharger l'énergie etc). */
    onEnded?: (state: BattleState, meta: ActionMeta | null) => void
}

interface ActionMeta {
    xpEarned: number
    energySpent: number
    leveledUp: boolean
    newCombatLevel: number
    nextLevelXp: number
}

type MenuMode = "actions" | "attacks" | "switch" | "bag"

interface TeamMember {
    id: string
    name: string
    slotIndex: number
    unlocked: boolean
    currentHp: number
    maxHp: number
    type: string
    combatLevel: number
}

interface UsableItem {
    itemKey: string
    name: string
    emoji: string
    effect: string
    amount: number
    quantity: number
}

export default function BattleModal({ initialState, onClose, onEnded }: Props) {
    const [state, setState] = useState<BattleState>(initialState)
    const [busy, setBusy] = useState(false)
    const [menu, setMenu] = useState<MenuMode>("actions")
    const [lastMeta, setLastMeta] = useState<ActionMeta | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [team, setTeam] = useState<TeamMember[]>([])
    const [usableItems, setUsableItems] = useState<UsableItem[]>([])

    useEffect(() => {
        if (state.phase === "ended" && onEnded) {
            onEnded(state, lastMeta)
        }
    }, [state.phase])

    // v4.0 Phase 2.D — Charge l'équipe Daemon une fois pour le menu switch.
    // v4.0 Phase 5.C — Charge les items utilisables (canUseInBattle) en parallèle.
    useEffect(() => {
        ; (async () => {
            try {
                const [listR, stateR, itemsModule] = await Promise.all([
                    fetch("/api/gamebook/daemon/list", { cache: "no-store" }),
                    fetch("/api/gamebook/state"),
                    import("@/lib/gamebook/items"),
                ])
                if (listR.ok) {
                    const j = await listR.json()
                    const members: TeamMember[] = (j.daemons ?? []).map((d: { id: string; name: string; slotIndex: number; unlocked: boolean; currentHp: number; maxHp: number; type: string; combatLevel: number }) => ({
                        id: d.id, name: d.name, slotIndex: d.slotIndex, unlocked: d.unlocked,
                        currentHp: d.currentHp, maxHp: d.maxHp, type: d.type, combatLevel: d.combatLevel,
                    }))
                    setTeam(members)
                }
                if (stateR.ok) {
                    const sj = await stateR.json()
                    const inv = Array.isArray(sj.inventory) ? sj.inventory : []
                    const usable: UsableItem[] = []
                    for (const entry of inv) {
                        const itemKey = entry.itemKey
                        if (!itemKey) continue
                        const def = itemsModule.getItem(itemKey)
                        const cap = def?.capabilities.canUseInBattle
                        if (!cap || !def) continue
                        const qty = entry.quantity ?? 1
                        if (qty <= 0) continue
                        usable.push({
                            itemKey,
                            name: def.name,
                            emoji: def.emoji,
                            effect: cap.effect,
                            amount: cap.amount,
                            quantity: qty,
                        })
                    }
                    setUsableItems(usable)
                }
            } catch { /* silent */ }
        })()
    }, [state.playerDaemonId, state.turn])

    const doAction = async (action: PlayerAction) => {
        if (busy || state.phase === "ended") return
        setBusy(true)
        setError(null)
        try {
            const res = await fetch("/api/gamebook/daemon/battle/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            })
            const data = await res.json()
            if (!res.ok || !data.ok) {
                setError(data.reason ?? "Action refusée.")
                setBusy(false)
                return
            }
            setState(data.state as BattleState)
            setLastMeta((data.meta ?? null) as ActionMeta | null)
            setMenu("actions")
        } catch {
            setError("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    // v4.0 Phase 5.C — Utilise un consommable en combat (coût : 1 tour, ennemi attaque)
    const useItemInBattle = async (itemKey: string) => {
        if (busy || state.phase === "ended") return
        setBusy(true); setError(null)
        try {
            const res = await fetch("/api/gamebook/daemon/battle/use-item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemKey }),
            })
            const data = await res.json()
            if (!res.ok || !data.ok) {
                setError(data.reason ?? "Item refusé.")
                setBusy(false)
                return
            }
            setState(data.state as BattleState)
            setMenu("actions")
        } catch {
            setError("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    const enemy = state.enemy
    const player = state.player
    const enemyHpPct = (enemy.currentHp / enemy.maxHp) * 100
    const playerHpPct = (player.currentHp / player.maxHp) * 100

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9500, padding: 16, fontFamily: "'Courier New', monospace",
            }}
        >
            <div
                style={{
                    background: "#000", color: "#fff",
                    border: "4px solid #80a0d0", borderRadius: 6,
                    padding: 12, maxWidth: 460, width: "100%",
                    maxHeight: "96vh", display: "flex", flexDirection: "column",
                }}
            >
                {/* Zone ennemi (en haut) */}
                <div style={{ background: "#1a2533", border: "1px solid #345", padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: "bold" }}>
                            {enemy.emoji ?? "👹"} {enemy.name}
                            <span style={{ fontSize: 9, marginLeft: 6, opacity: 0.7 }}>Lv {enemy.combatLevel}</span>
                            <span style={{ fontSize: 9, marginLeft: 6, color: typeColor(enemy.type) }}>[{enemy.type}]</span>
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.6 }}>{enemy.kind}</div>
                    </div>
                    <Bar pct={enemyHpPct} color="#c84848" />
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>HP {enemy.currentHp} / {enemy.maxHp}</div>
                </div>

                {/* Zone joueur (en bas) */}
                <div style={{ background: "#1a3a2a", border: "1px solid #4a6", padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: "bold" }}>
                            🐾 {player.name}
                            <span style={{ fontSize: 9, marginLeft: 6, opacity: 0.7 }}>Lv {player.combatLevel}</span>
                            <span style={{ fontSize: 9, marginLeft: 6, color: typeColor(player.type) }}>[{player.type}]</span>
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.7 }}>♥ {player.happiness}</div>
                    </div>
                    <Bar pct={playerHpPct} color="#48c848" />
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>HP {player.currentHp} / {player.maxHp}</div>
                </div>

                {/* Log */}
                <div style={{
                    background: "#111", border: "1px solid #333", padding: 8,
                    fontSize: 10, lineHeight: 1.5, marginBottom: 8,
                    minHeight: 80, maxHeight: 140, overflowY: "auto",
                }}>
                    {state.log.slice(-10).map((entry, i) => (
                        <div key={i} style={{ color: logColor(entry.kind), marginBottom: 2 }}>
                            {entry.text}
                        </div>
                    ))}
                </div>

                {/* Menu actions ou attaques */}
                {state.phase === "playerTurn" && menu === "actions" && (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <ActionBtn label="⚔️ ATTAQUE" onClick={() => setMenu("attacks")} busy={busy} />
                            <ActionBtn
                                label="🎒 SAC"
                                onClick={() => setMenu("bag")}
                                busy={busy}
                                disabled={usableItems.length === 0}
                            />
                            <ActionBtn
                                label="🔄 DAEMON"
                                onClick={() => setMenu("switch")}
                                busy={busy}
                                disabled={team.filter((t) => t.id !== state.playerDaemonId && t.unlocked && t.currentHp > 0).length === 0}
                            />
                            <ActionBtn
                                label="🏃 FUITE"
                                onClick={() => doAction({ kind: "flee" })}
                                busy={busy}
                                disabled={!state.fleeAllowed}
                            />
                        </div>
                        {/* Abandon : porte de sortie d'urgence (combats orphelins, boss coincés).
                            Toujours visible mais avec confirmation. Aucun XP donné, le Daemon garde son HP actuel. */}
                        <button
                            onClick={async () => {
                                if (busy) return
                                if (!confirm("Abandonner ce combat ? Aucun XP gagné, ton Daemon garde son HP actuel.")) return
                                setBusy(true)
                                try {
                                    await fetch("/api/gamebook/daemon/battle/forfeit", { method: "POST" })
                                    if (onEnded) onEnded({ ...state, phase: "ended" }, null)
                                    onClose()
                                } catch {
                                    setBusy(false)
                                }
                            }}
                            disabled={busy}
                            style={{
                                marginTop: 6,
                                width: "100%",
                                background: "transparent",
                                color: "#b07070",
                                border: "1px solid #804040",
                                padding: 4,
                                fontSize: 9,
                                fontFamily: "monospace",
                                cursor: busy ? "wait" : "pointer",
                                letterSpacing: 1,
                            }}
                        >
                            🚪 ABANDONNER (sans XP)
                        </button>
                    </>
                )}

                {state.phase === "playerTurn" && menu === "bag" && (
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>
                            Choisis un consommable. L'ennemi attaquera après.
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                            {usableItems.map((it) => (
                                <button
                                    key={it.itemKey}
                                    onClick={() => useItemInBattle(it.itemKey)}
                                    disabled={busy}
                                    style={{
                                        background: busy ? "#444" : "#3a5a4a",
                                        color: "#fff", border: "1px solid #80c060",
                                        padding: 8, fontSize: 10, fontWeight: "bold",
                                        cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
                                        textAlign: "left",
                                    }}
                                >
                                    <div>{it.emoji} {it.name}</div>
                                    <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>
                                        {effectLabel(it.effect, it.amount)} · ×{it.quantity}
                                    </div>
                                </button>
                            ))}
                            {usableItems.length === 0 && (
                                <div style={{ fontSize: 10, opacity: 0.7, gridColumn: "span 2", padding: 8 }}>
                                    Aucun consommable utilisable. Achète-en chez RIGATONI à la cuisine Pastagone.
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setMenu("actions")}
                            style={{
                                width: "100%", background: "transparent",
                                color: "#80a0d0", border: "1px solid #80a0d0",
                                padding: 6, fontSize: 10, fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            ← Retour menu
                        </button>
                    </div>
                )}

                {state.phase === "playerTurn" && menu === "switch" && (
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>
                            Choisis le Daemon qui prend le relais. L'ennemi attaquera gratuitement.
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                            {team.filter((t) => t.id !== state.playerDaemonId).map((t) => {
                                const ko = t.currentHp <= 0
                                const locked = !t.unlocked
                                const disabled = ko || locked || busy
                                return (
                                    <button
                                        key={t.id}
                                        disabled={disabled}
                                        onClick={() => doAction({ kind: "switch", daemonId: t.id })}
                                        style={{
                                            background: disabled ? "#333" : "#2a4a8a",
                                            color: disabled ? "#666" : "#fff",
                                            border: "1px solid " + (disabled ? "#555" : "#80a0d0"),
                                            padding: 8, fontSize: 10, fontWeight: "bold",
                                            cursor: disabled ? "not-allowed" : "pointer",
                                            fontFamily: "monospace", textAlign: "left",
                                        }}
                                    >
                                        <div>{t.name} (Slot {t.slotIndex})</div>
                                        <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>
                                            {locked
                                                ? "🔒 verrouillé"
                                                : ko
                                                    ? "💀 K.O."
                                                    : <>HP {t.currentHp}/{t.maxHp} · Lv{t.combatLevel} · <span style={{ color: typeColor(t.type) }}>[{t.type}]</span></>}
                                        </div>
                                    </button>
                                )
                            })}
                            {team.filter((t) => t.id !== state.playerDaemonId).length === 0 && (
                                <div style={{ fontSize: 10, opacity: 0.7, gridColumn: "span 2", padding: 8 }}>
                                    Pas d'autre Daemon dans l'équipe.
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setMenu("actions")}
                            style={{
                                width: "100%", background: "transparent",
                                color: "#80a0d0", border: "1px solid #80a0d0",
                                padding: 6, fontSize: 10, fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            ← Retour menu
                        </button>
                    </div>
                )}

                {state.phase === "playerTurn" && menu === "attacks" && (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                            {player.attacksEquipped.slice(0, 4).map((key) => {
                                const att = getAttack(key)
                                if (!att) return null
                                const cost = effectiveEnergyCost(att, player.intelligence)
                                return (
                                    <button
                                        key={key}
                                        disabled={busy}
                                        onClick={() => doAction({ kind: "attack", attackKey: key })}
                                        style={{
                                            background: busy ? "#444" : "#2a4a8a",
                                            color: "#fff", border: "1px solid #80a0d0",
                                            padding: 8, fontSize: 10, fontWeight: "bold",
                                            cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
                                            textAlign: "left",
                                        }}
                                    >
                                        <div>{att.name}</div>
                                        <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>
                                            <span style={{ color: typeColor(att.type) }}>[{att.type}]</span> ·
                                            {att.power > 0 ? ` ${att.power}p` : " status"} · {cost} reps
                                        </div>
                                    </button>
                                )
                            })}
                            {player.attacksEquipped.length === 0 && (
                                <div style={{ fontSize: 10, opacity: 0.7, gridColumn: "span 2", padding: 8 }}>
                                    Aucune attaque équipée. Utilise « Lutte ».
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setMenu("actions")}
                            style={{
                                width: "100%", background: "transparent",
                                color: "#80a0d0", border: "1px solid #80a0d0",
                                padding: 6, fontSize: 10, fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            ← Retour menu
                        </button>
                    </div>
                )}

                {state.phase === "ended" && (
                    <div style={{
                        background: "#222", border: "1px solid #555", padding: 10,
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>
                            {state.result === "victory" && "🏆 VICTOIRE"}
                            {state.result === "defeat" && "💀 DÉFAITE"}
                            {state.result === "fled" && "🏃 FUITE"}
                        </div>
                        {lastMeta && state.result === "victory" && (
                            <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 8 }}>
                                +{lastMeta.xpEarned} XP · −{lastMeta.energySpent} reps
                                {lastMeta.leveledUp && (
                                    <div style={{ marginTop: 4, color: "#ffd54f", fontWeight: "bold" }}>
                                        ⚡ Niveau {lastMeta.newCombatLevel} atteint !
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                width: "100%", background: "#80a0d0", color: "#000",
                                border: "none", padding: 10, fontSize: 12, fontWeight: "bold",
                                letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                            }}
                        >
                            FERMER
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{
                        marginTop: 8, padding: 6, background: "#502020",
                        border: "1px solid #c84848", fontSize: 10,
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================================
// Sous-composants
// ============================================================

function Bar({ pct, color }: { pct: number; color: string }) {
    return (
        <div style={{ background: "#111", height: 8, border: "1px solid #333", overflow: "hidden" }}>
            <div style={{
                width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%",
                background: color, transition: "width 0.4s",
            }} />
        </div>
    )
}

function ActionBtn({ label, onClick, busy, disabled }: { label: string; onClick: () => void; busy: boolean; disabled?: boolean }) {
    const off = busy || disabled
    return (
        <button
            onClick={onClick}
            disabled={off}
            style={{
                background: off ? "#333" : "#2a4a8a",
                color: off ? "#666" : "#fff", border: "1px solid " + (off ? "#555" : "#80a0d0"),
                padding: 10, fontSize: 11, fontWeight: "bold",
                cursor: off ? "not-allowed" : "pointer", fontFamily: "monospace",
            }}
        >
            {label}
        </button>
    )
}

function logColor(kind: string): string {
    switch (kind) {
        case "crit": return "#ffd54f"
        case "miss": return "#a0a0a0"
        case "faint": return "#c84848"
        case "victory": return "#80d080"
        case "defeat": return "#c84848"
        case "flee_success": case "flee_fail": return "#a0c0d0"
        case "type_label": return "#d0a0d0"
        case "damage": return "#e08060"
        case "attack": return "#e0e0e0"
        default: return "#c0c0c0"
    }
}

function effectLabel(effect: string, amount: number): string {
    switch (effect) {
        case "heal_hp": return `+${amount} HP`
        case "happiness_boost": return `+${amount} ♥`
        case "vitesse_buff_one_battle": return `+${amount} VIT (1 combat)`
        default: return effect
    }
}

function typeColor(type: string): string {
    switch (type) {
        case "Feu": return "#ff7e3e"
        case "Eau": return "#4fa0ff"
        case "Plante": return "#5fd060"
        case "Electrique": return "#ffd54f"
        case "Vol": return "#a0c8ff"
        case "Psy": return "#e060a0"
        case "Pate": return "#d4a060"
        case "Combat": return "#c0603e"
        case "Roche": return "#a08060"
        default: return "#c0c0c0"
    }
}
