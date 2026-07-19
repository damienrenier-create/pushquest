"use client"

// LEADERBOARD des scores de RUN (concours) — consultable depuis le menu START par les joueurs ayant fini le
// run 1 (>=5 badges). Deux classements distincts (unités différentes) : RUN 2 (NOTE GLOBALE /1000 = 3 facteurs de
// PERFORMANCE : % victoire, Pokédex, niveaux) et RUN 3 (Σ des niveaux des Daemons vaincus). Lecture seule.

import { useEffect, useState } from "react"
import { type ScoreFactor } from "@/lib/gamebook/yellow/score/runScore"

interface ScoreRow { nickname: string; score: number; wonAt: string | null; factors?: ScoreFactor[] | null; live?: boolean; leagueReps?: number }
type TabId = "run1" | "run3" | "run3energy" | "run2" | "league" | "duels"
type Data = { gated?: boolean; run1: ScoreRow[]; run2: ScoreRow[]; run3: ScoreRow[]; run3energy: ScoreRow[]; duels: { nickname: string; wins: number }[] }

const RUN_META: { id: TabId; label: string; unit: string; hint: string }[] = [
    { id: "run1", label: "🥇 RUN 1", unit: "pts", hint: "DÉCOUVERTE : Σ des points de BADGES (hauts faits) débloqués au run 1. Le + haut gagne. Consulte tes badges dans « 🎖️ TROPHÉES »." },
    { id: "run3", label: "🏆 RUN 3", unit: "pts", hint: "CONQUÉRANT : Σ des niveaux des Daemons ennemis vaincus (boss + Ligue). Le + haut gagne." },
    { id: "run3energy", label: "🔋 SURVIE", unit: "⚡", hint: "SURVIVANT (run 3) : Σ de l'énergie restante relevée juste après le KO du chef de chaque arène/Ligue. Conserver son énergie = monter — l'OPPOSÉ du score RUN 3 (niveaux vaincus)." },
    { id: "run2", label: "🏅 RUN 2", unit: "/1000", hint: "Note /1000 de PERFORMANCE : % victoire (×500), Pokédex (×400) & niveaux d'équipe (×100). L'énergie et les pas ne comptent plus. Joueurs ENCORE en run 2 = score live (maj à chaque connexion) ; joueurs ayant TERMINÉ = score final figé. Clique une entrée pour le détail des axes." },
    { id: "league", label: "⚡ LIGUE", unit: "reps", hint: "L'ÉCONOME DE LA LIGUE : le moins de reps dépensés en combats DEPUIS ton 1er pas dans la Ligue gagne (moins = mieux). Non classé tant que tu n'y es pas entré." },
    { id: "duels", label: "⚔️ DUELS", unit: "reflets", hint: "LE DUELLISTE : nombre de reflets d'autres joueurs battus (cumulé sur tous tes runs). Le + haut gagne." },
]

export default function RunScoreboardPanel({ close }: { close: () => void }) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [data, setData] = useState<Data>({ run1: [], run2: [], run3: [], run3energy: [], duels: [] })
    const [tab, setTab] = useState<TabId>("run3")
    const [expanded, setExpanded] = useState<number | null>(null) // RUN 2 : entrée dépliée (détail des 3 axes de performance)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/run-scores")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                setData({ gated: j?.gated, run1: j?.run1 ?? [], run2: j?.run2 ?? [], run3: j?.run3 ?? [], run3energy: j?.run3energy ?? [], duels: j?.duels ?? [] })
                setState("ok")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [])

    const meta = RUN_META.find((m) => m.id === tab)!
    // ⚡ LIGUE : dérivé des entrées run 2 → seulement ceux qui ont dépensé des reps en Ligue (>0 = entré),
    //   score = reps Ligue, trié ASCENDANT (le plus économe en tête = 🥇).
    const leagueList: ScoreRow[] = data.run2
        .filter((r) => (r.leagueReps ?? 0) > 0)
        .map((r) => ({ ...r, score: r.leagueReps ?? 0 }))
        .sort((a, b) => a.score - b.score)
    // ⚔️ DUELS : reflets battus (cumul), déjà trié desc côté serveur → ScoreRow (score = victoires).
    const duelsList: ScoreRow[] = data.duels.map((d) => ({ nickname: d.nickname, score: d.wins, wonAt: null }))
    const list = tab === "run1" ? data.run1 : tab === "run3" ? data.run3 : tab === "run3energy" ? data.run3energy : tab === "league" ? leagueList : tab === "duels" ? duelsList : data.run2
    const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`)

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>📊 CLASSEMENT DES CONCOURS</div>

                <div style={tabsRow}>
                    {RUN_META.map((m) => (
                        <button key={m.id} onClick={() => { setTab(m.id); setExpanded(null) }}
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
                    tab === "league"
                        ? <div style={muted}>Personne n&apos;a encore livré de combat en Ligue (run 2).<br />Le plus économe en reps prendra la tête ! ⚡</div>
                        : tab === "duels"
                        ? <div style={muted}>Personne n&apos;a encore battu de reflet.<br />Va défier les doubles de tes potes (Viridian / arène eau) ! ⚔️</div>
                        : <div style={muted}>Aucun score {meta.label} pour l&apos;instant.<br />Sois le premier à finir ce concours ! {tab === "run3" ? "🏆" : "🏅"}</div>
                )}

                {state === "ok" && !data.gated && list.length > 0 && (
                    <div style={scroll}>
                        {list.map((r, i) => {
                            const canExpand = (tab === "run2" || tab === "run1") && Array.isArray(r.factors) && r.factors!.length > 0
                            const open = expanded === i
                            return (
                                <div key={i}>
                                    <div style={{ ...row, background: i < 3 ? "rgba(255,213,74,0.10)" : "rgba(255,255,255,0.05)", cursor: canExpand ? "pointer" : "default" }}
                                        onClick={() => { if (canExpand) setExpanded(open ? null : i) }}>
                                        <span style={rank}>{medal(i)}</span>
                                        <span style={name}>{r.nickname}</span>
                                        {r.live !== undefined && (
                                            <span title={r.live ? "score en direct (joueur encore dans le run)" : "score figé (run terminé)"}
                                                style={{ fontSize: 8.5, opacity: 0.7, marginRight: 2, whiteSpace: "nowrap" }}>{r.live ? "🟢 live" : "⚪ figé"}</span>
                                        )}
                                        <span style={score}>{r.score.toLocaleString("fr-FR")} <span style={unit}>{meta.unit}</span></span>
                                        {canExpand && <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 2 }}>{open ? "▾" : "▸"}</span>}
                                    </div>
                                    {canExpand && open && (
                                        <div style={factorsBox}>
                                            <div style={{ fontSize: 8.5, opacity: 0.6, lineHeight: 1.4, marginBottom: 2 }}>Critères pondérés (poids après « / »), additionnés → note /1000.</div>
                                            {/* On masque les axes PÉRIMÉS (frugality/steps) d'un score figé posté sous l'ancienne formule. */}
                                            {r.factors!.filter((f) => f.key !== "frugality" && f.key !== "steps").map((f) => (
                                                f.max <= 0 ? (
                                                    // Ligne INFO (hors note /1000) — ex. « 🏆 Reps en Ligue » : valeur brute, pas de barre.
                                                    <div key={f.key} style={{ fontSize: 10.5, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: 0.9, borderTop: "1px dashed rgba(255,255,255,0.14)", paddingTop: 4, marginTop: 1 }}>
                                                        <span>{f.label}</span>
                                                        <span style={{ opacity: 0.9, fontVariantNumeric: "tabular-nums" }}><b>{(f.points ?? 0).toLocaleString("fr-FR")}</b> <span style={{ fontSize: 8.5, opacity: 0.6 }}>reps</span></span>
                                                    </div>
                                                ) : (
                                                    <div key={f.key} style={{ fontSize: 10.5 }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{f.label}</span>
                                                            <span style={{ opacity: 0.85 }}><b>{f.points}</b> / {f.max}</span>
                                                        </div>
                                                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden", margin: "2px 0 1px" }}>
                                                            <div style={{ width: `${Math.round((f.ratio ?? 0) * 100)}%`, height: "100%", background: "#ffe36b" }} />
                                                        </div>
                                                        <div style={{ fontSize: 8.5, opacity: 0.55 }}>{f.detail}</div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
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
const factorsBox: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, margin: "1px 0 5px", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }
const rank: React.CSSProperties = { fontSize: 14, fontWeight: 800, width: 30, textAlign: "center" }
const name: React.CSSProperties = { flex: 1, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const score: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "#ffe36b", fontVariantNumeric: "tabular-nums" }
const unit: React.CSSProperties = { fontSize: 10, opacity: 0.7, fontWeight: 600 }
const closeBtn: React.CSSProperties = { marginTop: 12, padding: "10px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
