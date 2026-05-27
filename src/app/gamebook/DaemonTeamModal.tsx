"use client"

// src/app/gamebook/DaemonTeamModal.tsx
//
// v4.0 Phase 1.D — Modal de l'équipe Daemon (jusqu'à 6 slots).
// Affiche la liste des Daemons + permet de visualiser stats + actions de base.
// Cohabite avec la TamagotchiModal (qui reste accessible via V3T).

import { useEffect, useState } from "react"

interface DaemonStats {
    force: number
    vitesse: number
    defense: number
    intelligence: number
    endurance: number
}

interface DaemonView {
    id: string
    slotIndex: number
    name: string
    speciesLevel: number
    type: string
    morphology: string
    combatLevel: number
    combatXp: number
    xpToNextLevel: number
    xpProgressPct: number
    stats: DaemonStats
    effectiveStats: DaemonStats
    currentHp: number
    maxHp: number
    happiness: number
    happinessMultiplier: number
    critRate: number
    attacksEquipped: string[]
    recovered: boolean
    inBag: boolean
    origin: string
    // v4.0 Phase 1.D.bis — gate sérum
    unlocked: boolean
    unlockedAt: string | null
}

interface Props {
    onClose: () => void
    /** v4.0 Phase 1.D.bis Option B — true si le user est créateur (isSystem).
     *  Active le bouton 💉 DEBUG "force-unlock sérum" sur les Daemons verrouillés. */
    isCreator?: boolean
}

interface ApplicableItem {
    itemKey: string
    name: string
    emoji: string
    kind: "evolve" | "boost"
    detail: string  // ex: "→ Type Feu" ou "+5 FORCE"
}

export default function DaemonTeamModal({ onClose, isCreator = false }: Props) {
    const [daemons, setDaemons] = useState<DaemonView[]>([])
    const [loading, setLoading] = useState(true)
    const [focused, setFocused] = useState<DaemonView | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [applicableItems, setApplicableItems] = useState<ApplicableItem[]>([])

    const refresh = async () => {
        try {
            const [listR, stateR, itemsModule] = await Promise.all([
                fetch("/api/gamebook/daemon/list", { cache: "no-store" }),
                fetch("/api/gamebook/state"),
                import("@/lib/gamebook/items"),
            ])
            if (listR.ok) {
                const data = await listR.json()
                setDaemons(data.daemons ?? [])
                if (focused) {
                    const updated = (data.daemons ?? []).find((d: DaemonView) => d.id === focused.id)
                    if (updated) setFocused(updated)
                }
            }
            if (stateR.ok) {
                const sj = await stateR.json()
                const inv = Array.isArray(sj.inventory) ? sj.inventory : []
                const items: ApplicableItem[] = []
                for (const entry of inv) {
                    const itemKey = entry.itemKey
                    if (!itemKey) continue
                    const def = itemsModule.getItem(itemKey)
                    if (!def) continue
                    if (def.capabilities.canEvolveType) {
                        items.push({
                            itemKey, name: def.name, emoji: def.emoji,
                            kind: "evolve",
                            detail: `→ Type ${def.capabilities.canEvolveType.newType}`,
                        })
                    } else if (def.capabilities.canPermanentStatBoost) {
                        const c = def.capabilities.canPermanentStatBoost
                        items.push({
                            itemKey, name: def.name, emoji: def.emoji,
                            kind: "boost",
                            detail: `+${c.amount} ${c.stat.toUpperCase()} permanent`,
                        })
                    }
                }
                setApplicableItems(items)
            }
        } catch { /* silent */ }
    }

    useEffect(() => {
        ; (async () => {
            await refresh()
            setLoading(false)
        })()
    }, [])

    const callAction = async (path: string, body: Record<string, unknown>) => {
        if (busy) return
        setBusy(true)
        setMessage(null)
        try {
            const res = await fetch(path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            setMessage(data.message ?? (data.ok ? "OK" : data.reason ?? "Erreur"))
            if (data.ok) await refresh()
        } catch {
            setMessage("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9000, padding: 16, fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #80a0d0", borderRadius: 6,
                    padding: 16, maxWidth: 420, width: "100%",
                    maxHeight: "92vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
                }}
            >
                {(() => {
                    const anyUnlocked = daemons.some((d) => d.unlocked)
                    return (
                        <>
                            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                                {anyUnlocked ? "👾 ÉQUIPE DAEMON" : "🐾 ANIMAUX"}
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12 }}>
                                {daemons.length} / 6 slots · Leader = slot 1
                                {!anyUnlocked && daemons.length > 0 && " · Sérum requis pour révéler les stats"}
                            </div>
                        </>
                    )
                })()}

                {loading && <div style={{ fontSize: 11, opacity: 0.7 }}>Chargement…</div>}

                {!loading && daemons.length === 0 && (
                    <div style={{ fontSize: 11, opacity: 0.7, padding: 12, background: "#222", border: "1px solid #444" }}>
                        Aucun Daemon dans ton équipe. Va voir V3T à Macaron'île pour adopter ton premier compagnon.
                    </div>
                )}

                {!focused && daemons.map((d) => (
                    <div
                        key={d.id}
                        onClick={() => setFocused(d)}
                        style={{
                            background: d.slotIndex === 1 ? "#2a3a4a" : "#222",
                            border: "1px solid " + (d.slotIndex === 1 ? "#80a0d0" : "#555"),
                            padding: 10, marginBottom: 8, borderRadius: 4,
                            cursor: "pointer",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 22 }}>{getEmojiForLevel(d.speciesLevel)}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: "bold" }}>
                                    {d.name} {d.slotIndex === 1 && <span style={{ fontSize: 9, color: "#ffd54f" }}>⭐ LEADER</span>}
                                    {!d.unlocked && <span style={{ fontSize: 9, color: "#80a0d0", marginLeft: 4 }}>🔒</span>}
                                </div>
                                {d.unlocked ? (
                                    <>
                                        <div style={{ fontSize: 9, opacity: 0.7 }}>
                                            Combat Lv {d.combatLevel} · {d.type} · {d.morphology}
                                        </div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                                            HP {d.currentHp}/{d.maxHp} · ♥ {d.happiness}/100 {d.inBag && " · 🎒 en sac"}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 9, opacity: 0.7 }}>
                                            Compagnon — sérum requis
                                        </div>
                                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                                            ♥ {d.happiness}/100 {d.inBag && " · 🎒 en sac"}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {focused && (
                    <div>
                        <button
                            onClick={() => { setFocused(null); setMessage(null) }}
                            style={{
                                background: "transparent", color: "#80a0d0", border: "1px solid #80a0d0",
                                padding: "4px 8px", fontSize: 10, fontFamily: "monospace",
                                cursor: "pointer", marginBottom: 10,
                            }}
                        >
                            ← Retour équipe
                        </button>

                        <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>
                                {getEmojiForLevel(focused.speciesLevel)} {focused.name}
                                {!focused.unlocked && <span style={{ fontSize: 10, color: "#80a0d0", marginLeft: 6 }}>🔒 verrouillé</span>}
                            </div>
                            {focused.unlocked ? (
                                <>
                                    <div style={{ fontSize: 10, opacity: 0.7 }}>
                                        {focused.type} · {focused.morphology} · Slot {focused.slotIndex} · Origin: {focused.origin}
                                    </div>
                                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                        Combat Lv {focused.combatLevel} · XP {focused.combatXp} / {focused.xpToNextLevel}
                                    </div>
                                    <div style={{
                                        background: "#111", height: 5, marginTop: 4, border: "1px solid #444", overflow: "hidden",
                                    }}>
                                        <div style={{
                                            width: `${focused.xpProgressPct}%`, height: "100%",
                                            background: "linear-gradient(90deg, #4080d8, #80a0d0)",
                                        }} />
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: 10, opacity: 0.7 }}>
                                    Slot {focused.slotIndex} · Compagnon non éveillé.<br />
                                    Le <em>Sérum de Poussière</em> révèlera son vrai potentiel.
                                </div>
                            )}
                        </div>

                        {focused.unlocked && (
                            <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>STATS (×{focused.happinessMultiplier.toFixed(2)} bonheur)</div>
                                <StatRow label="HP" cur={focused.currentHp} max={focused.maxHp} color="#c83838" />
                                <StatRow label="FORCE" cur={focused.effectiveStats.force} max={100} color="#d08030" />
                                <StatRow label="VITESSE" cur={focused.effectiveStats.vitesse} max={100} color="#80a0d0" />
                                <StatRow label="DÉFENSE" cur={focused.effectiveStats.defense} max={100} color="#a0a0a0" />
                                <StatRow label="INTEL" cur={focused.effectiveStats.intelligence} max={100} color="#a060d0" />
                                <StatRow label="ENDURANCE" cur={focused.effectiveStats.endurance} max={100} color="#80c060" />
                                <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                                    ♥ Bonheur {focused.happiness}/100 · 💥 Crit {(focused.critRate * 100).toFixed(0)}%
                                </div>
                            </div>
                        )}

                        {!focused.unlocked && (
                            <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>♥ BONHEUR</div>
                                <StatRow label="BONHEUR" cur={focused.happiness} max={100} color="#e060a0" />
                                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>
                                    Nourris-le et donne-lui à boire pour garder son bonheur élevé.
                                </div>
                            </div>
                        )}

                        {focused.unlocked && (
                            <div style={{ background: "#2a2a2a", border: "1px solid #555", padding: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>ATTAQUES ÉQUIPÉES ({focused.attacksEquipped.length}/4)</div>
                                {focused.attacksEquipped.length === 0 ? (
                                    <div style={{ fontSize: 9, opacity: 0.6 }}>Aucune attaque apprise.</div>
                                ) : (
                                    focused.attacksEquipped.map((a, i) => (
                                        <div key={i} style={{ fontSize: 10, padding: 2 }}>• {a}</div>
                                    ))
                                )}
                            </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            <ActionButton label="🍝 Nourrir" onClick={() => callAction("/api/gamebook/daemon/feed", { daemonId: focused.id })} busy={busy} />
                            <ActionButton label="💧 Boire" onClick={() => callAction("/api/gamebook/daemon/drink", { daemonId: focused.id })} busy={busy} />
                            <ActionButton label={focused.inBag ? "🐾 Sortir" : "🎒 Ranger"} onClick={() => callAction("/api/gamebook/daemon/in-bag", { daemonId: focused.id, inBag: !focused.inBag })} busy={busy} />
                        </div>

                        {/* v4.0 Phase 1.D.bis Option B — DEBUG créateur uniquement : force-unlock sérum
                            pour pouvoir tester les combats avant l'arc Pastagone. */}
                        {isCreator && !focused.unlocked && (
                            <ActionButton
                                label="💉 [CRÉATEUR] Inoculer Sérum"
                                fullWidth
                                onClick={() => callAction("/api/gamebook/daemon/use-serum", { daemonId: focused.id })}
                                busy={busy}
                            />
                        )}

                        {/* v4.0 — Pierres d'évolution + sérums boost permanent (Lee Scoresby + Serafina) */}
                        {focused.unlocked && applicableItems.length > 0 && (
                            <div style={{ background: "#2a2a2a", border: "1px solid #6080c0", padding: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6, color: "#80a0d0" }}>
                                    ✨ ITEMS APPLICABLES (depuis ton sac)
                                </div>
                                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 8 }}>
                                    Pierres d'évolution (changement de type) et sérums boost (stat +5 permanent).
                                </div>
                                {applicableItems.map((it) => (
                                    <button
                                        key={it.itemKey}
                                        onClick={() => callAction(
                                            it.kind === "evolve"
                                                ? "/api/gamebook/daemon/evolve"
                                                : "/api/gamebook/daemon/boost-stat",
                                            { daemonId: focused.id, itemKey: it.itemKey },
                                        )}
                                        disabled={busy}
                                        style={{
                                            display: "block", width: "100%",
                                            background: busy ? "#444" : "#3a3a5a",
                                            color: "#fff",
                                            border: "1px solid #80a0d0",
                                            padding: 6, marginBottom: 4, fontSize: 10,
                                            fontFamily: "monospace",
                                            cursor: busy ? "wait" : "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        <strong>{it.emoji} {it.name}</strong>
                                        <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.8 }}>{it.detail}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Réordonner — permet de set leader */}
                        {focused.slotIndex !== 1 && daemons.length > 1 && (
                            <ActionButton
                                label="⭐ Devenir LEADER (slot 1)"
                                fullWidth
                                onClick={async () => {
                                    const ids = [focused.id, ...daemons.filter((d) => d.id !== focused.id).map((d) => d.id)]
                                    await callAction("/api/gamebook/daemon/reorder", { newOrder: ids })
                                }}
                                busy={busy}
                            />
                        )}
                    </div>
                )}

                {message && (
                    <div style={{
                        marginTop: 10, padding: 8, background: "#222", border: "1px solid #555",
                        fontSize: 10, lineHeight: 1.5,
                    }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: "10px", fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    FERMER
                </button>
            </div>
        </div>
    )
}

function StatRow({ label, cur, max, color }: { label: string; cur: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0
    return (
        <div style={{ marginBottom: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                <span>{label}</span>
                <span>{cur} / {max}</span>
            </div>
            <div style={{ background: "#111", height: 4, border: "1px solid #333", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
            </div>
        </div>
    )
}

function ActionButton({ label, onClick, busy, fullWidth }: { label: string; onClick: () => void; busy: boolean; fullWidth?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={busy}
            style={{
                flex: fullWidth ? "1 1 100%" : "1 1 30%",
                background: busy ? "#444" : "#3a5a8a",
                color: "#fff", border: "1px solid #fff",
                padding: 8, fontSize: 10, fontWeight: "bold",
                cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
            }}
        >
            {label}
        </button>
    )
}

function getEmojiForLevel(level: number): string {
    // Emoji simplifié inspiré XP_ANIMALS. Lazy fallback.
    if (level <= 5) return "🦟"
    if (level <= 10) return "🐸"
    if (level <= 15) return "🐠"
    if (level <= 22) return "🦅"
    if (level <= 30) return "🦊"
    if (level <= 40) return "🐺"
    if (level <= 50) return "🐆"
    if (level <= 60) return "🦍"
    if (level <= 70) return "🐊"
    if (level <= 80) return "🐳"
    if (level <= 90) return "🐘"
    return "🐉"
}
