"use client"

// PROFIL « hauts faits » d'un AUTRE joueur, ouvert depuis le CLASSEMENT (ligne cliquable). Fetch serveur
// (/api/gamebook/yellow/player-badges?userId=). ANTI-SPOILER : n'affiche que les hauts faits NON-SECRETS
// (grille par catégorie, gagné/verrouillé) + un AGRÉGAT des secrets (« 🔒 X / Y hauts faits secrets », sans
// les nommer). Lecture seule. Pour SON PROPRE profil, préférer RunBadgesPanel (vue complète avec secrets révélés).

import { useEffect, useState } from "react"
import { BADGES, TIER_EMOJI, TIER_POINTS, type BadgeTier } from "@/lib/gamebook/yellow/data/run1Badges"

const CAT_LABEL: Record<string, string> = {
    progression: "⚔️ Progression", collection: "📖 Collection", social: "🤝 Social & échanges", shiny: "🌟 Shiny",
}
const TIER_COLOR: Record<BadgeTier, string> = { bronze: "#cd8a4a", silver: "#c3cbdc", gold: "#ffd24a", diamond: "#4fd6d0", legend: "#b78bff" }
// Ordre d'affichage des catégories NON-SECRÈTES (special/dome sont 100% secrètes → jamais nommées ici).
const CAT_ORDER = ["progression", "collection", "social", "shiny"]

interface Data {
    nickname: string
    earnedIds: string[]
    secretEarned: number
    secretTotal: number
    totalPoints: number
    earnedCount: number
    maxPoints: number
}

export default function PlayerBadgesModal({ userId, nickname, close }: { userId: string; nickname: string; close: () => void }) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [data, setData] = useState<Data | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch(`/api/gamebook/yellow/player-badges?userId=${encodeURIComponent(userId)}`)
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                if (j?.ok) { setData(j as Data); setState("ok") } else setState("error")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [userId])

    const earned = new Set(data?.earnedIds ?? [])

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <div style={S.title}>🎖️ {data?.nickname ?? nickname}</div>
                        <div style={S.sub}>
                            {data
                                ? <>{data.earnedCount} / {BADGES.length} hauts faits · <b style={{ color: "#ffd24a" }}>{data.totalPoints}</b> / {data.maxPoints} pts</>
                                : "Hauts faits du joueur"}
                        </div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                <div style={S.scroll}>
                    {state === "loading" && <div style={S.muted}>Chargement du profil…</div>}
                    {state === "error" && <div style={S.muted}>Profil indisponible (hors-ligne ?).</div>}
                    {state === "ok" && data && (
                        <>
                            {CAT_ORDER.map((cat) => {
                                const defs = BADGES.filter((b) => b.cat === cat && !b.secret)
                                if (defs.length === 0) return null
                                return (
                                    <div key={cat} style={{ marginBottom: 16 }}>
                                        <div style={S.catTitle}>{CAT_LABEL[cat] ?? cat}</div>
                                        <div style={S.grid}>
                                            {defs.map((d) => {
                                                const got = earned.has(d.id)
                                                return (
                                                    <div key={d.id} style={{ ...S.badge, ...(got ? { borderColor: TIER_COLOR[d.tier], background: "rgba(255,255,255,.05)" } : S.badgeLocked) }} title={`${TIER_EMOJI[d.tier]} ${TIER_POINTS[d.tier]} pts`}>
                                                        <div style={{ ...S.badgeIcon, filter: got ? "none" : "grayscale(1) opacity(.4)" }}>{TIER_EMOJI[d.tier]}</div>
                                                        <div style={{ ...S.badgeLabel, color: got ? "#e8ecf6" : "#6b7690" }}>{d.label}</div>
                                                        <div style={{ ...S.badgePts, color: got ? TIER_COLOR[d.tier] : "#4a5470" }}>{got ? `+${TIER_POINTS[d.tier]}` : `${TIER_POINTS[d.tier]}`}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                            {/* Agrégat anti-spoiler : les hauts faits SECRETS gagnés, comptés SANS être nommés. */}
                            <div style={{ marginBottom: 6 }}>
                                <div style={S.catTitle}>🔒 Secrets</div>
                                <div style={S.secretCard}>
                                    <span style={{ fontSize: 22 }}>🔒</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{data.secretEarned} / {data.secretTotal} hauts faits secrets</div>
                                        <div style={{ fontSize: 10.5, color: "#95a1bd", marginTop: 2 }}>Découvre-les toi-même — leurs noms restent cachés pour ne rien te spoiler.</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, background: "rgba(6,9,16,.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9300, padding: 12 },
    panel: { width: "min(560px,96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#141b2b", border: "1px solid #2a3550", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#e8ecf6", fontFamily: "system-ui,sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2a3550" },
    title: { fontSize: 18, fontWeight: 800 },
    sub: { fontSize: 12.5, color: "#95a1bd", marginTop: 3 },
    close: { background: "#20293e", border: "1px solid #2a3550", color: "#c3cbdc", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontSize: 15 },
    scroll: { overflowY: "auto", padding: "14px 18px 12px" },
    muted: { fontSize: 12.5, color: "#95a1bd", textAlign: "center", padding: "24px 8px", lineHeight: 1.6 },
    catTitle: { fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase", color: "#95a1bd", margin: "4px 0 9px", fontWeight: 700 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 },
    badge: { border: "1px solid #2a3550", borderRadius: 11, padding: "10px 11px", display: "flex", flexDirection: "column", gap: 3, minHeight: 78 },
    badgeLocked: { background: "rgba(255,255,255,.015)", borderColor: "#232c42" },
    badgeIcon: { fontSize: 22, lineHeight: 1 },
    badgeLabel: { fontSize: 12, lineHeight: 1.25, fontWeight: 600 },
    badgePts: { fontSize: 11, fontFamily: "ui-monospace,monospace", fontWeight: 700, marginTop: "auto" },
    secretCard: { display: "flex", alignItems: "center", gap: 12, border: "1px dashed #3a4560", borderRadius: 11, padding: "12px 14px", background: "rgba(255,255,255,.02)" },
}
