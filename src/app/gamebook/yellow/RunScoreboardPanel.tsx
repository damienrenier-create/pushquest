"use client"

// LEADERBOARD des scores de RUN (concours) — consultable depuis le menu START par les joueurs ayant fini le
// run 1 (>=5 badges). Deux classements distincts (unités différentes) : RUN 2 (énergie en réserve au sacre)
// et RUN 3 (Σ des niveaux des Daemons vaincus). Lecture seule, données serveur.

import { useEffect, useState } from "react"

interface ScoreRow { nickname: string; score: number; wonAt: string }
type Data = { gated?: boolean; run2: ScoreRow[]; run3: ScoreRow[] }

const RUN_META: { id: "run3" | "run2"; label: string; unit: string; hint: string }[] = [
    { id: "run3", label: "🏆 RUN 3", unit: "pts", hint: "Σ des niveaux des Daemons ennemis vaincus (boss + Ligue). Le + haut gagne." },
    { id: "run2", label: "⚡ RUN 2", unit: "⚡", hint: "Énergie en réserve au re-sacre du New Game+. Le + haut gagne." },
]

export default function RunScoreboardPanel({ close }: { close: () => void }) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [data, setData] = useState<Data>({ run2: [], run3: [] })
    const [tab, setTab] = useState<"run3" | "run2">("run3")

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/run-scores")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                setData({ gated: j?.gated, run2: j?.run2 ?? [], run3: j?.run3 ?? [] })
                setState("ok")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [])

    const meta = RUN_META.find((m) => m.id === tab)!
    const list = tab === "run3" ? data.run3 : data.run2
    const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`)

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>📊 CLASSEMENT DES CONCOURS</div>

                <div style={tabsRow}>
                    {RUN_META.map((m) => (
                        <button key={m.id} onClick={() => setTab(m.id)}
                            style={{ ...tabBtn, borderColor: tab === m.id ? "#ffd54a" : "rgba(255,255,255,0.15)", background: tab === m.id ? "#ffd54a" : "rgba(255,255,255,0.06)", color: tab === m.id ? "#11121a" : "#fff" }}>
                            {m.label}
                        </button>
                    ))}
                </div>

                <div style={hintStyle}>{meta.hint}</div>

                {state === "loading" && <div style={muted}>Chargement…</div>}
                {state === "error" && <div style={muted}>Classement indisponible (hors-ligne ?).</div>}
                {state === "ok" && data.gated && (
                    <div style={muted}>🔒 Le classement des concours se débloque quand tu as conquis les <b>5 arènes du run 1</b>.<br />Termine la Ligue pour y accéder !</div>
                )}
                {state === "ok" && !data.gated && list.length === 0 && (
                    <div style={muted}>Aucun score {meta.label} pour l&apos;instant.<br />Sois le premier à finir ce concours ! {tab === "run3" ? "🏆" : "⚡"}</div>
                )}

                {state === "ok" && !data.gated && list.length > 0 && (
                    <div style={scroll}>
                        {list.map((r, i) => (
                            <div key={i} style={{ ...row, background: i < 3 ? "rgba(255,213,74,0.10)" : "rgba(255,255,255,0.05)" }}>
                                <span style={rank}>{medal(i)}</span>
                                <span style={name}>{r.nickname}</span>
                                <span style={score}>{r.score.toLocaleString("fr-FR")} <span style={unit}>{meta.unit}</span></span>
                            </div>
                        ))}
                    </div>
                )}

                <button style={closeBtn} onClick={close}>← FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.82)", fontFamily: "inherit" }
const box: React.CSSProperties = { width: "min(420px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#171430", border: "2px solid #ffd54a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(255,213,74,.25)" }
const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#ffd54a", textAlign: "center", letterSpacing: 1, marginBottom: 10 }
const tabsRow: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 8 }
const tabBtn: React.CSSProperties = { flex: 1, padding: "7px 0", border: "1.5px solid", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12 }
const hintStyle: React.CSSProperties = { fontSize: 9.5, opacity: 0.65, textAlign: "center", lineHeight: 1.4, marginBottom: 10 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.75, textAlign: "center", padding: "16px 8px", lineHeight: 1.6 }
const scroll: React.CSSProperties = { overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "8px 10px" }
const rank: React.CSSProperties = { fontSize: 14, fontWeight: 800, width: 30, textAlign: "center" }
const name: React.CSSProperties = { flex: 1, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const score: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "#ffe36b", fontVariantNumeric: "tabular-nums" }
const unit: React.CSSProperties = { fontSize: 10, opacity: 0.7, fontWeight: 600 }
const closeBtn: React.CSSProperties = { marginTop: 12, padding: "10px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
