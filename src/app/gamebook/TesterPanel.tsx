// src/app/gamebook/TesterPanel.tsx
//
// Panneau testeur "God Mode" overlay du Nexus.
// Visible UNIQUEMENT si le compte a isTester === true (vérifié côté serveur
// par les routes /api/admin/tester/*).
//
// 7 onglets : Ressources / Temps / Flags / Téléport / Combat / Snapshots / Logs
//
// Raccourcis clavier (actifs seulement si le panneau peut être affiché) :
//   T : toggle panneau
//   L : onglet Logs
//   F : onglet Flags
//   E : +50 énergie
//   R : reset combat
//   G : onglet Téléport

"use client"

import { useState, useEffect, useCallback } from "react"

type Tab = "ressources" | "exos" | "temps" | "flags" | "teleport" | "combat" | "snapshots" | "logs"

interface TesterPanelProps {
    isTester: boolean
    /** Callback déclenché après une action serveur, pour que le MapClient re-fetch /state. */
    onAfterAction?: () => void
}

interface StatusData {
    today: string
    position: { mapId: string; posX: number; posY: number; direction: string }
    energy: { todayReps: number; energySpentToday: number; bonusSurplus: number; available: number }
    daemons: Array<{
        id: string
        slotIndex: number
        name: string
        type: string
        combatLevel: number
        currentHp: number
        happiness: number
        activeBattle: unknown
        pendingStatPoints: number
    }>
    gamebookFrozenUntil: string | null
}

interface FlagItem {
    name: string
    zone: string
    value: boolean
}

interface MapItem {
    id: string
    name: string
    width: number
    height: number
}

export default function TesterPanel({ isTester, onAfterAction }: TesterPanelProps) {
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<Tab>("ressources")
    const [status, setStatus] = useState<StatusData | null>(null)
    const [flags, setFlags] = useState<FlagItem[]>([])
    const [flagFilterZone, setFlagFilterZone] = useState<string>("all")
    const [flagSearch, setFlagSearch] = useState<string>("")
    const [maps, setMaps] = useState<MapItem[]>([])
    const [teleportInput, setTeleportInput] = useState<{ mapId: string; posX: string; posY: string; direction: string }>({
        mapId: "bourgpates", posX: "7", posY: "12", direction: "down",
    })
    const [logsXp, setLogsXp] = useState<unknown[]>([])
    const [logsCoin, setLogsCoin] = useState<unknown[]>([])
    const [snapshotJson, setSnapshotJson] = useState<string>("")
    const [busy, setBusy] = useState<boolean>(false)
    const [lastMessage, setLastMessage] = useState<string>("")

    const flash = useCallback((msg: string) => {
        setLastMessage(msg)
        setTimeout(() => setLastMessage((m) => (m === msg ? "" : m)), 3000)
    }, [])

    const refreshStatus = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/tester/status", { cache: "no-store" })
            const j = await r.json()
            if (j?.ok) setStatus(j as StatusData)
        } catch (e) {
            console.error("[tester] status fetch failed", e)
        }
    }, [])

    const refreshFlags = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/tester/flag", { cache: "no-store" })
            const j = await r.json()
            if (j?.ok && Array.isArray(j.flags)) setFlags(j.flags)
        } catch (e) {
            console.error("[tester] flags fetch failed", e)
        }
    }, [])

    const refreshMaps = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/tester/teleport", { cache: "no-store" })
            const j = await r.json()
            if (j?.ok && Array.isArray(j.maps)) setMaps(j.maps)
        } catch (e) {
            console.error("[tester] maps fetch failed", e)
        }
    }, [])

    const refreshLogs = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/tester/logs", { cache: "no-store" })
            const j = await r.json()
            if (j?.ok) {
                setLogsXp(j.xpAdjustments ?? [])
                setLogsCoin(j.coinAdjustments ?? [])
            }
        } catch (e) {
            console.error("[tester] logs fetch failed", e)
        }
    }, [])

    // Refresh status à l'ouverture
    useEffect(() => {
        if (open && isTester) {
            void refreshStatus()
        }
    }, [open, isTester, refreshStatus])

    // Refresh selon l'onglet
    useEffect(() => {
        if (!open || !isTester) return
        if (tab === "flags") void refreshFlags()
        if (tab === "teleport") void refreshMaps()
        if (tab === "logs") void refreshLogs()
    }, [tab, open, isTester, refreshFlags, refreshMaps, refreshLogs])

    // Raccourcis clavier
    useEffect(() => {
        if (!isTester) return
        const handler = (e: KeyboardEvent) => {
            // Ignorer si l'utilisateur tape dans un input
            const target = e.target as HTMLElement
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return
            }
            const k = e.key.toLowerCase()
            if (k === "t") { e.preventDefault(); setOpen((v) => !v) }
            else if (open) {
                if (k === "l") { e.preventDefault(); setTab("logs") }
                else if (k === "f") { e.preventDefault(); setTab("flags") }
                else if (k === "g") { e.preventDefault(); setTab("teleport") }
                else if (k === "e") { e.preventDefault(); void energyDelta(50) }
                else if (k === "r") { e.preventDefault(); void resetBattle() }
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTester, open])

    // ─── Actions ───
    const addExercise = async (exercise: string, reps: number) => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/exercise", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ exercise, reps }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(`+${reps} ${exercise} encodé`)
                await refreshStatus()
                onAfterAction?.()
            } else {
                flash(`Erreur : ${j?.reason ?? "?"}`)
            }
        } catch (e) {
            flash(`Erreur réseau : ${(e as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    const validateDefi = async (defiIndex: number) => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/validate-defi", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ defiIndex }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(j.message ?? `Défi #${defiIndex} validé`)
                onAfterAction?.()
            } else {
                flash(`Erreur : ${j?.reason ?? "?"}`)
            }
        } catch (e) {
            flash(`Erreur réseau : ${(e as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    const energyDelta = async (delta: number) => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/energy", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ delta }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(`Énergie ${delta > 0 ? "+" : ""}${delta} → bonusSurplus=${j.bonusSurplus}`)
                await refreshStatus()
                onAfterAction?.()
            } else {
                flash(`Erreur : ${j?.reason ?? "?"}`)
            }
        } catch (e) {
            flash(`Erreur réseau : ${(e as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    const energyReset = async () => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/energy", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reset: true }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash("Énergie reset à 0 / 0")
                await refreshStatus()
                onAfterAction?.()
            }
        } finally {
            setBusy(false)
        }
    }

    const skipToMidnight = async () => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/time", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ skipToMidnight: true }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash("Champs daily reset (skipToMidnight) — re-fetch ton /state pour voir l'effet")
                await refreshStatus()
                onAfterAction?.()
            }
        } finally {
            setBusy(false)
        }
    }

    const toggleFlag = async (flagName: string, current: boolean) => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/flag", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ flagName, value: !current }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(`Flag ${flagName} → ${!current}`)
                await refreshFlags()
                onAfterAction?.()
            }
        } finally {
            setBusy(false)
        }
    }

    const teleport = async () => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/teleport", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mapId: teleportInput.mapId,
                    posX: Number(teleportInput.posX),
                    posY: Number(teleportInput.posY),
                    direction: teleportInput.direction,
                }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(`Téléporté en ${j.mapId} (${j.posX},${j.posY})`)
                await refreshStatus()
                onAfterAction?.()
            } else {
                flash(`Erreur téléport : ${j?.reason ?? "?"}`)
            }
        } finally {
            setBusy(false)
        }
    }

    const resetBattle = async () => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/reset-battle", { method: "POST" })
            const j = await r.json()
            if (j?.ok) {
                flash(`Combats reset (${j.daemonsAffected} Daemons)`)
                await refreshStatus()
                onAfterAction?.()
            }
        } finally {
            setBusy(false)
        }
    }

    const resetArc = async (arc: string) => {
        if (busy) return
        if (!confirm(`Reset l'arc "${arc}" ? Les flags de cet arc seront remis à false.`)) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/reset-arc", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ arc }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash(`Arc "${arc}" reset (${j.fieldsReset?.length ?? 0} flags)`)
                await refreshFlags()
                onAfterAction?.()
            }
        } finally {
            setBusy(false)
        }
    }

    const resetFull = async () => {
        if (busy) return
        if (!confirm("⚠️ RESET COMPLET du compte tester — toutes les progressions perdues. Confirmer ?")) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/reset-full", { method: "POST" })
            const j = await r.json()
            if (j?.ok) {
                flash("Compte tester wipé. Recharge la page (F5).")
            }
        } finally {
            setBusy(false)
        }
    }

    const snapshotTake = async () => {
        if (busy) return
        setBusy(true)
        try {
            const r = await fetch("/api/admin/tester/snapshot", { cache: "no-store" })
            const j = await r.json()
            if (j?.ok && j.snapshot) {
                const text = JSON.stringify(j.snapshot, null, 2)
                setSnapshotJson(text)
                localStorage.setItem("tester_snapshot", text)
                flash("Snapshot capturé (en mémoire + localStorage)")
            }
        } finally {
            setBusy(false)
        }
    }

    const snapshotRestore = async () => {
        if (busy) return
        if (!confirm("Restaurer le snapshot ? L'état actuel sera écrasé.")) return
        setBusy(true)
        try {
            const text = snapshotJson || localStorage.getItem("tester_snapshot") || ""
            if (!text) { flash("Aucun snapshot en mémoire"); return }
            const snap = JSON.parse(text)
            const r = await fetch("/api/admin/tester/snapshot", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ snapshot: snap }),
            })
            const j = await r.json()
            if (j?.ok) {
                flash("Snapshot restauré")
                await refreshStatus()
                onAfterAction?.()
            }
        } catch (e) {
            flash(`Erreur restore : ${(e as Error).message}`)
        } finally {
            setBusy(false)
        }
    }

    // Ne rien rendre si pas tester
    if (!isTester) return null

    // Bouton flottant
    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                title="Panneau testeur (T)"
                style={floatingBtnStyle}
            >🧪</button>
        )
    }

    // ─── Filtre flags ───
    const visibleFlags = flags.filter((f) => {
        if (flagFilterZone !== "all" && f.zone !== flagFilterZone) return false
        if (flagSearch && !f.name.toLowerCase().includes(flagSearch.toLowerCase())) return false
        return true
    })
    const zonesUnique = Array.from(new Set(flags.map((f) => f.zone))).sort()

    // ─── Render ───
    return (
        <div style={overlayStyle}>
            <div style={panelStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <span style={{ fontWeight: 700 }}>🧪 Panneau Testeur (T pour fermer)</span>
                    <button onClick={() => setOpen(false)} style={closeBtnStyle}>✕</button>
                </div>

                {/* Status synthétique */}
                {status && (
                    <div style={statusBarStyle}>
                        <div>📍 {status.position.mapId} ({status.position.posX},{status.position.posY}) {status.position.direction}</div>
                        <div>⚡ Énergie: <strong>{status.energy.available}</strong> (reps du jour: {status.energy.todayReps}, dépensé: {status.energy.energySpentToday}, bonus: {status.energy.bonusSurplus})</div>
                        <div>📅 {status.today}</div>
                    </div>
                )}

                {/* Tabs */}
                <div style={tabsStyle}>
                    {(["ressources", "exos", "temps", "flags", "teleport", "combat", "snapshots", "logs"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{ ...tabBtnStyle, ...(tab === t ? tabBtnActiveStyle : {}) }}
                        >{t}</button>
                    ))}
                </div>

                {/* Body */}
                <div style={bodyStyle}>
                    {tab === "ressources" && (
                        <div>
                            <h3>Énergie (bonusSurplus)</h3>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {[-100, -50, -10, +10, +50, +100, +500].map((d) => (
                                    <button key={d} onClick={() => energyDelta(d)} disabled={busy} style={actionBtnStyle}>
                                        {d > 0 ? "+" : ""}{d}
                                    </button>
                                ))}
                                <button onClick={energyReset} disabled={busy} style={dangerBtnStyle}>Reset (0/0)</button>
                            </div>
                            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                                Note : delta agit sur bonusSurplus. Le compte tester est traité comme un joueur normal — les contraintes énergie s'appliquent normalement.
                            </p>
                        </div>
                    )}

                    {tab === "exos" && (
                        <div>
                            <h3>Exercices (vrai ExerciseSet, compte dans tes reps du jour)</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                {([
                                    ["PUSHUP", 10], ["PUSHUP", 50], ["PUSHUP", 100], ["PUSHUP", 200],
                                    ["SQUAT", 10], ["SQUAT", 50], ["SQUAT", 100], ["SQUAT", 300],
                                    ["PLANK", 30], ["PLANK", 60], ["PLANK", 180],
                                    ["PULLUP", 5], ["PULLUP", 10], ["PULLUP", 30],
                                    ["CARDIO", 10], ["CARDIO", 30],
                                ] as Array<[string, number]>).map(([ex, r], i) => (
                                    <button key={`${ex}-${r}-${i}`} onClick={() => addExercise(ex, r)} disabled={busy} style={actionBtnStyle}>
                                        +{r} {ex === "PLANK" ? `${ex} (s)` : ex}
                                    </button>
                                ))}
                            </div>
                            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                                ⚠️ Plank = secondes. Crée un vrai ExerciseSet daté d'aujourd'hui — compte dans le scoring PushQuest ET dans l'énergie Nexus.
                            </p>
                            <div style={{ marginTop: 14, borderTop: "1px solid #555", paddingTop: 10 }}>
                                <h4>Valider défi animal (1 clic, sans encoder)</h4>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {[
                                        { i: 0, label: "VISIT" },
                                        { i: 1, label: "DRINK" },
                                        { i: 2, label: "PATES" },
                                        { i: 3, label: "MATIN+AM" },
                                        { i: 4, label: "GAINAGE 180s" },
                                        { i: 5, label: "200 PUSHUP" },
                                        { i: 6, label: "300 SQUAT" },
                                    ].map((d) => (
                                        <button key={d.i} onClick={() => validateDefi(d.i)} disabled={busy} style={{ ...actionBtnStyle, fontSize: 10 }}>
                                            #{d.i} {d.label}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                                    Bypass — set défi à true sans contrainte. Utile pour valider le défi MATIN+AM sans attendre l'après-midi.
                                </p>
                            </div>
                        </div>
                    )}

                    {tab === "temps" && (
                        <div>
                            <h3>Temps</h3>
                            <button onClick={skipToMidnight} disabled={busy} style={actionBtnStyle}>
                                ⏰ Simuler passage à minuit
                            </button>
                            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                                Force tous les champs *Date à un jour antérieur. Le prochain GET /state déclenchera les resets daily naturels (energySpentToday, casinoBetsToday, cooldowns, etc.).
                            </p>
                            <p style={{ fontSize: 11, opacity: 0.7 }}>
                                Pour reproduire le bug bonus minuit : (1) gagne +100 reps via un PNJ, (2) clique "Simuler passage à minuit", (3) vérifie que bonusSurplus est toujours là dans le HUD.
                            </p>
                        </div>
                    )}

                    {tab === "flags" && (
                        <div>
                            <h3>Flags ({visibleFlags.length})</h3>
                            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                                <select value={flagFilterZone} onChange={(e) => setFlagFilterZone(e.target.value)} style={inputStyle}>
                                    <option value="all">Toutes zones</option>
                                    {zonesUnique.map((z) => <option key={z} value={z}>{z}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={flagSearch}
                                    onChange={(e) => setFlagSearch(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ maxHeight: 280, overflowY: "auto" }}>
                                {visibleFlags.map((f) => (
                                    <div key={f.name} style={flagRowStyle}>
                                        <span style={{ flex: 1 }}>
                                            <code>{f.name}</code> <span style={{ fontSize: 10, opacity: 0.6 }}>[{f.zone}]</span>
                                        </span>
                                        <button
                                            onClick={() => toggleFlag(f.name, f.value)}
                                            disabled={busy}
                                            style={{ ...toggleBtnStyle, background: f.value ? "#2d6a4f" : "#7c2d2d" }}
                                        >{f.value ? "TRUE" : "false"}</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 12, borderTop: "1px solid #555", paddingTop: 8 }}>
                                <h4>Reset par arc</h4>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {["intro", "bourg", "tour", "macaron", "muscuville", "vegas", "pastagone", "casino"].map((arc) => (
                                        <button key={arc} onClick={() => resetArc(arc)} disabled={busy} style={actionBtnStyle}>
                                            {arc}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === "teleport" && (
                        <div>
                            <h3>Téléportation</h3>
                            <div style={{ display: "grid", gap: 4 }}>
                                <label>mapId :</label>
                                <select
                                    value={teleportInput.mapId}
                                    onChange={(e) => setTeleportInput({ ...teleportInput, mapId: e.target.value })}
                                    style={inputStyle}
                                >
                                    {maps.map((m) => (
                                        <option key={m.id} value={m.id}>{m.id} — {m.name} ({m.width}x{m.height})</option>
                                    ))}
                                </select>
                                <label>posX :</label>
                                <input type="number" value={teleportInput.posX} onChange={(e) => setTeleportInput({ ...teleportInput, posX: e.target.value })} style={inputStyle} />
                                <label>posY :</label>
                                <input type="number" value={teleportInput.posY} onChange={(e) => setTeleportInput({ ...teleportInput, posY: e.target.value })} style={inputStyle} />
                                <label>direction :</label>
                                <select
                                    value={teleportInput.direction}
                                    onChange={(e) => setTeleportInput({ ...teleportInput, direction: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="up">up</option>
                                    <option value="down">down</option>
                                    <option value="left">left</option>
                                    <option value="right">right</option>
                                </select>
                                <button onClick={teleport} disabled={busy} style={actionBtnStyle}>Téléporter</button>
                            </div>
                        </div>
                    )}

                    {tab === "combat" && (
                        <div>
                            <h3>Combat</h3>
                            <button onClick={resetBattle} disabled={busy} style={actionBtnStyle}>
                                🥊 Forcer fin de combat (tous Daemons)
                            </button>
                            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                                Set Daemon.activeBattle = null. Utile si un combat zombie bloque la suite.
                            </p>
                            {status?.daemons && status.daemons.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <h4>Daemons</h4>
                                    {status.daemons.map((d) => (
                                        <div key={d.id} style={{ fontSize: 12, padding: 4, borderBottom: "1px solid #444" }}>
                                            slot {d.slotIndex} — <strong>{d.name}</strong> [{d.type}] L{d.combatLevel} HP {d.currentHp} 😊 {d.happiness}
                                            {d.activeBattle ? " ⚔️ EN COMBAT" : ""} pts: {d.pendingStatPoints}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "snapshots" && (
                        <div>
                            <h3>Snapshots</h3>
                            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                <button onClick={snapshotTake} disabled={busy} style={actionBtnStyle}>📸 Capturer</button>
                                <button onClick={snapshotRestore} disabled={busy} style={dangerBtnStyle}>♻️ Restaurer</button>
                                <button onClick={resetFull} disabled={busy} style={dangerBtnStyle}>🗑️ Reset complet</button>
                            </div>
                            <textarea
                                value={snapshotJson}
                                onChange={(e) => setSnapshotJson(e.target.value)}
                                placeholder="(snapshot JSON ici après capture)"
                                style={{ ...inputStyle, width: "100%", height: 200, fontFamily: "monospace", fontSize: 10 }}
                            />
                        </div>
                    )}

                    {tab === "logs" && (
                        <div>
                            <h3>Logs (50 derniers XpAdjustment + 50 CoinAdjustment)</h3>
                            <button onClick={refreshLogs} disabled={busy} style={actionBtnStyle}>🔄 Refresh</button>
                            <h4 style={{ marginTop: 12 }}>XP</h4>
                            <div style={{ maxHeight: 180, overflowY: "auto", fontFamily: "monospace", fontSize: 11 }}>
                                {logsXp.map((l: unknown, i: number) => {
                                    const x = l as { date: string; amount: number; reason: string }
                                    return <div key={i}>[{x.date}] {x.amount > 0 ? "+" : ""}{x.amount} XP — {x.reason}</div>
                                })}
                            </div>
                            <h4 style={{ marginTop: 12 }}>Coin</h4>
                            <div style={{ maxHeight: 120, overflowY: "auto", fontFamily: "monospace", fontSize: 11 }}>
                                {logsCoin.map((l: unknown, i: number) => {
                                    const c = l as { date: string; amount: number; reason: string }
                                    return <div key={i}>[{c.date}] {c.amount > 0 ? "+" : ""}{c.amount} coin — {c.reason}</div>
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer message */}
                {lastMessage && (
                    <div style={messageStyle}>{lastMessage}</div>
                )}
                <div style={shortcutsStyle}>
                    Raccourcis : T (toggle), L (logs), F (flags), G (téléport), E (+50 énergie), R (reset combat)
                </div>
            </div>
        </div>
    )
}

// ─── Styles inline ───
const floatingBtnStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#1f2937",
    color: "white",
    border: "2px solid #fbbf24",
    fontSize: 20,
    cursor: "pointer",
    zIndex: 9998,
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 12,
    pointerEvents: "none",
}

const panelStyle: React.CSSProperties = {
    width: 480,
    maxHeight: "92vh",
    background: "#0f172a",
    color: "#e2e8f0",
    border: "2px solid #fbbf24",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    fontSize: 13,
    pointerEvents: "auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
}

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderBottom: "1px solid #334155",
}

const closeBtnStyle: React.CSSProperties = {
    background: "transparent",
    color: "#e2e8f0",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
}

const statusBarStyle: React.CSSProperties = {
    padding: 8,
    fontSize: 11,
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    display: "grid",
    gap: 2,
}

const tabsStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    borderBottom: "1px solid #334155",
}

const tabBtnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 60,
    padding: "6px 4px",
    background: "#1e293b",
    color: "#94a3b8",
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    borderRight: "1px solid #334155",
}

const tabBtnActiveStyle: React.CSSProperties = {
    background: "#0f172a",
    color: "#fbbf24",
    fontWeight: 600,
}

const bodyStyle: React.CSSProperties = {
    padding: 10,
    overflowY: "auto",
    flex: 1,
}

const actionBtnStyle: React.CSSProperties = {
    padding: "5px 10px",
    background: "#374151",
    color: "white",
    border: "1px solid #4b5563",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
}

const dangerBtnStyle: React.CSSProperties = {
    ...actionBtnStyle,
    background: "#7c2d2d",
    border: "1px solid #b91c1c",
}

const toggleBtnStyle: React.CSSProperties = {
    padding: "2px 8px",
    color: "white",
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 600,
    minWidth: 60,
}

const flagRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "3px 4px",
    fontSize: 11,
    borderBottom: "1px solid #1e293b",
}

const inputStyle: React.CSSProperties = {
    padding: "4px 6px",
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: 4,
    fontSize: 12,
}

const messageStyle: React.CSSProperties = {
    padding: 6,
    background: "#1e3a5f",
    color: "#bfdbfe",
    fontSize: 11,
    borderTop: "1px solid #334155",
}

const shortcutsStyle: React.CSSProperties = {
    padding: 6,
    background: "#1e293b",
    color: "#64748b",
    fontSize: 10,
    borderTop: "1px solid #334155",
    fontStyle: "italic",
}
