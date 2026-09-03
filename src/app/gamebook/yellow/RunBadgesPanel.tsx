"use client"

// VITRINE DES BADGES (run 1 — Découverte). Lecture seule : lit la save COURANTE (stores) → evaluateBadges.
// Dévoilement progressif : OBJECTIF grisé si non-gagné ; SECRET caché tant que non "révélé" (rencontre).
// Accessible dès le run 1 (contrairement au leaderboard, gaté post-run-1).

import { useEffect, useState } from "react"
import { getPlayer, getGameMode, getActiveWorld } from "@/lib/gamebook/yellow/store/playerStore"
import { getPokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { BADGES, TIER_EMOJI, TIER_POINTS, TIER_EMOJI_FUN, TIER_POINTS_FUN, MEDAL_EMOJI, evaluateBadges, badgeInputFromSave, funTierOf, type BadgeTier, type TierFun } from "@/lib/gamebook/yellow/data/run1Badges"
import { evaluateRun2Badges, RUN2_BADGE_REPS } from "@/lib/gamebook/yellow/data/run2Badges"

const CAT_LABEL: Record<string, string> = {
    progression: "⚔️ Progression", collection: "📖 Collection", exploration: "🗺️ Exploration", fusion: "🧬 Fusion",
    social: "🤝 Social & échanges", special: "✨ Rencontres & secrets", rencontres: "✨ Rencontres", shiny: "🌟 Shiny", dome: "🏛️ Dôme",
}
const TIER_COLOR: Record<BadgeTier, string> = { bronze: "#cd8a4a", silver: "#c3cbdc", gold: "#ffd24a", diamond: "#4fd6d0", legend: "#b78bff" }
const TIER_COLOR_FUN: Record<TierFun, string> = { s1: "#a8862f", s2: "#c39a34", s3: "#dcae3c", s4: "#efc247", s5: "#ffd54a", d1: "#57c9d6", d2: "#7bb0ff", d3: "#c9a0ff" }
const MEDAL_LABEL: Record<"or" | "argent" | "bronze", string> = { or: "1ᵉʳ fun · ×1,6", argent: "2ᵉ · ×1,4", bronze: "3ᵉ · ×1,2" }
const CAT_ORDER = ["progression", "collection", "exploration", "fusion", "social", "special", "rencontres", "shiny", "dome"]

export default function RunBadgesPanel({ close }: { close: () => void }) {
    // Assemble le BadgeInput depuis les stores client (pokédex GLOBAL = captures cumulées).
    const p = getPlayer()
    const dex = getPokedex()
    const fun = getGameMode() === "fun" // barème 8 paliers + médailles au lieu du barème 5-tiers
    const isRun2 = getActiveWorld() === "ngplus" // Remix → échelle des hauts faits RUN 2

    // MODE FUN — médailles de rapidité (GET best-effort) : badgeId → or/argent/bronze. RUN 1 UNIQUEMENT (le run 2 se
    //   classe à la performance /1000 + reps, pas aux médailles) → on ne fetch même pas en Remix.
    const [medals, setMedals] = useState<Record<string, "or" | "argent" | "bronze">>({})
    useEffect(() => {
        if (!fun || isRun2) return
        let cancelled = false
        fetch("/api/gamebook/yellow/fun-badges").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j?.ok) setMedals(j.medals ?? {}) }).catch(() => {})
        return () => { cancelled = true }
    }, [fun, isRun2])

    // ── Lignes normalisées (mêmes cartes pour run 1 « Découverte » et run 2 « Remix ») ──
    interface Row { id: string; label: string; cat: string; emoji: string; color: string; points: number; earned: boolean; revealed: boolean; todo: boolean }
    let title: string, footNote: string, unit: string
    let earnedCount: number, totalCount: number, totalPoints: number, maxPoints: number
    let rows: Row[]

    if (isRun2) {
        // RUN 2 « Remix » : chaque haut fait CRÉDITE des reps (⚡) en mode fun (les points ne servent qu'au prestige des
        //   non-funs). Barème fun 8 paliers, photo de save scopée au monde Remix (caughtThisRun).
        const r2 = evaluateRun2Badges(badgeInputFromSave({ ...(p as object), pokedex: { caught: dex.caught, seen: dex.seen } } as Parameters<typeof badgeInputFromSave>[0], p.caughtThisRun, "fun"))
        const valOf = (id: string, pts: number) => (fun ? (RUN2_BADGE_REPS[id] ?? 0) : pts) // fun → reps ; non-fun → points
        rows = r2.badges.map((st) => ({ id: st.id, label: st.label, cat: st.cat, emoji: st.emoji, color: TIER_COLOR_FUN[st.funTier], points: valOf(st.id, st.points), earned: st.earned, revealed: fun ? true : st.revealed, todo: st.todo }))
        const earnable = r2.badges.filter((b) => !b.todo) // les `todo` (Phase 2) n'entrent pas dans le dénominateur
        title = "🎖️ Trophées — Remix (Run 2)"
        earnedCount = r2.earnedCount
        totalCount = earnable.length
        totalPoints = rows.filter((r) => r.earned).reduce((s, r) => s + r.points, 0)
        maxPoints = earnable.reduce((s, b) => s + (fun ? (RUN2_BADGE_REPS[b.id] ?? 0) : TIER_POINTS_FUN[b.funTier]), 0)
        unit = fun ? "⚡" : "pts"
        footNote = fun
            ? "🍝 Chaque haut fait du Remix te verse de l'énergie (⚡), sans plafond, au fil de tes connexions — un Remix complet = 15 320⚡. ⏳ = bientôt disponible."
            : "Hauts faits du Remix (Run 2). ⏳ = bientôt disponible."
    } else {
        const input = badgeInputFromSave({ ...(p as object), pokedex: { caught: dex.caught, seen: dex.seen } } as Parameters<typeof badgeInputFromSave>[0], undefined, fun ? "fun" : undefined)
        const result = evaluateBadges(input)
        const byId = new Map(result.badges.map((b) => [b.id, b]))
        rows = BADGES.map((b) => {
            const st = byId.get(b.id)!
            return { id: b.id, label: b.label, cat: b.cat, emoji: fun ? TIER_EMOJI_FUN[funTierOf(b.id)] : TIER_EMOJI[b.tier], color: fun ? TIER_COLOR_FUN[funTierOf(b.id)] : TIER_COLOR[b.tier], points: st.points, earned: st.earned, revealed: fun ? true : st.revealed, todo: false }
        })
        title = "🎖️ Trophées — Découverte"
        earnedCount = result.earnedCount
        totalPoints = result.totalPoints
        // En fun, le total ne compte QUE les hauts faits run 1 (pré-Sylvebarbe) ; sinon le barème 5-tiers complet.
        maxPoints = fun
            ? BADGES.reduce((s, b) => s + (byId.get(b.id)?.isRun1 ? TIER_POINTS_FUN[funTierOf(b.id)] : 0), 0)
            : BADGES.reduce((s, b) => s + TIER_POINTS[b.tier], 0)
        totalCount = fun ? BADGES.reduce((n, b) => n + (byId.get(b.id)?.isRun1 ? 1 : 0), 0) : BADGES.length
        unit = "pts"
        footNote = fun
            ? "Tous les hauts faits sont affichés : ils te servent de guide. En gris = pas encore obtenus, colorés = décrochés."
            : "Les badges secrets 🔒 apparaissent en gris dès que tu croises le contenu, puis se colorent une fois obtenus."
    }

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <div style={S.title}>{title}</div>
                        <div style={S.sub}>{earnedCount} / {totalCount} badges · <b style={{ color: "#ffd24a" }}>{totalPoints.toLocaleString("fr-FR")}</b> / {maxPoints.toLocaleString("fr-FR")} {unit}{fun && !isRun2 ? " (fun)" : ""}</div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                <div style={S.scroll}>
                    {CAT_ORDER.map((cat) => {
                        // n'affiche la catégorie que si au moins 1 badge est révélé (secrets non découverts → catégorie cachée)
                        const visible = rows.filter((r) => r.cat === cat && r.revealed)
                        if (visible.length === 0) return null
                        return (
                            <div key={cat} style={{ marginBottom: 18 }}>
                                <div style={S.catTitle}>{CAT_LABEL[cat] ?? cat}</div>
                                <div style={S.grid}>
                                    {visible.map((r) => {
                                        const earned = r.earned
                                        const medal = fun && earned && !isRun2 ? medals[r.id] : undefined // médaille de rapidité (fun, run 1 only)
                                        return (
                                            <div key={r.id} style={{ ...S.badge, ...(earned ? { borderColor: r.color, background: "rgba(255,255,255,.05)" } : S.badgeLocked) }} title={`${r.emoji} ${r.points} ${unit}${r.todo ? " · à venir" : ""}${medal ? ` · ${MEDAL_EMOJI[medal]} ${MEDAL_LABEL[medal]}` : ""}`}>
                                                <div style={{ ...S.badgeIcon, filter: earned ? "none" : "grayscale(1) opacity(.45)" }}>{r.emoji}</div>
                                                <div style={{ ...S.badgeLabel, color: earned ? "#e8ecf6" : "#6b7690" }}>{r.label}</div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: "auto" }}>
                                                    <span style={{ ...S.badgePts, marginTop: 0, color: earned ? r.color : "#4a5470" }}>{r.todo ? "⏳" : `${earned ? "+" : ""}${r.points}${isRun2 ? unit : ""}`}</span>
                                                    {medal && <span title={MEDAL_LABEL[medal]} style={{ fontSize: 13, lineHeight: 1 }}>{MEDAL_EMOJI[medal]}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                    <div style={S.foot}>{footNote}</div>
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, background: "rgba(6,9,16,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 },
    panel: { width: "min(560px,96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#141b2b", border: "1px solid #2a3550", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#e8ecf6", fontFamily: "system-ui,sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2a3550" },
    title: { fontSize: 18, fontWeight: 800 },
    sub: { fontSize: 12.5, color: "#95a1bd", marginTop: 3 },
    close: { background: "#20293e", border: "1px solid #2a3550", color: "#c3cbdc", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontSize: 15 },
    scroll: { overflowY: "auto", padding: "14px 18px 4px" },
    catTitle: { fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase", color: "#95a1bd", margin: "4px 0 9px", fontWeight: 700 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 },
    badge: { border: "1px solid #2a3550", borderRadius: 11, padding: "10px 11px", display: "flex", flexDirection: "column", gap: 3, minHeight: 78 },
    badgeLocked: { background: "rgba(255,255,255,.015)", borderColor: "#232c42" },
    badgeIcon: { fontSize: 22, lineHeight: 1 },
    badgeLabel: { fontSize: 12, lineHeight: 1.25, fontWeight: 600 },
    badgePts: { fontSize: 11, fontFamily: "ui-monospace,monospace", fontWeight: 700, marginTop: "auto" },
    foot: { fontSize: 11.5, color: "#6b7690", padding: "8px 2px 12px", lineHeight: 1.5 },
}
