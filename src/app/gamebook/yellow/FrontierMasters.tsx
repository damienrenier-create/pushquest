"use client"

// ZONE DE COMBAT — onglets 🎟️ Jouer / 📜 Règles / 📊 Stats de la TOUR et de l'USINE, sur le modèle du Maître du Dôme
// (demande Sartay 19/10/2026). Les Stats montrent le record du joueur et LES MAÎTRES de la salle : le meilleur record de
// chaque joueur, avec l'équipe gravée au moment du record. Données serveur : GET /api/gamebook/yellow/frontier?board=1.

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { FRONTIER_CHAMPION_STREAK, LEVEL_RULE_LABEL, type FrontierBoardEntry } from "@/lib/gamebook/yellow/frontier/frontierBoard"
import { fetchFrontierBoard, type FrontierBoard } from "@/lib/gamebook/yellow/frontier/frontierApi"

export type FrontierTab = "jouer" | "regles" | "stats"

export function FrontierTabs({ tab, onTab, accent }: { tab: FrontierTab; onTab: (t: FrontierTab) => void; accent: string }) {
    const tabs: [FrontierTab, string][] = [["jouer", "🎟️ Jouer"], ["regles", "📜 Règles"], ["stats", "📊 Stats"]]
    return (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {tabs.map(([k, lbl]) => (
                <button key={k} onClick={() => onTab(k)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, background: tab === k ? accent : "#332e4a", color: tab === k ? "#1a1a22" : "#fff" }}>{lbl}</button>
            ))}
        </div>
    )
}

export function FrontierRulesView({ lines }: { lines: readonly string[] }) {
    return (
        <div style={{ textAlign: "left", fontSize: 11, lineHeight: 1.55, opacity: 0.92 }}>
            {lines.map((l, i) => <p key={i} style={{ margin: "0 0 6px" }}>▸ {l}</p>)}
        </div>
    )
}

const MEDAL = ["🥇", "🥈", "🥉"]

function BoardRow({ e, i, accent }: { e: FrontierBoardEntry; i: number; accent: string }) {
    return (
        <div style={{ background: e.me ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.05)", border: e.me ? `1px solid ${accent}` : "1px solid transparent", borderRadius: 8, padding: "6px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{MEDAL[i] ?? `${i + 1}.`} {e.nickname}{e.me ? " (toi)" : ""}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#11121a", background: accent, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>{e.best} victoire{e.best > 1 ? "s" : ""}{e.best >= FRONTIER_CHAMPION_STREAK ? " 👑" : ""}</span>
            </div>
            {e.team && e.team.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4 }}>
                    {e.team.map((m, mi) => {
                        const sp = getSpecies(m.speciesId)
                        const label = `${m.nickname ?? sp?.name ?? m.speciesId} · N.${m.level}${m.shiny ? " ✨" : ""}${m.moves?.length ? ` · ${m.moves.join(", ")}` : ""}`
                        return sp?.sprite
                            ? <img key={mi} src={sp.sprite} alt={sp.name} title={label} style={{ width: 30, height: 30, objectFit: "contain", imageRendering: "pixelated" }} />
                            : <span key={mi} style={{ fontSize: 18 }} title={label}>❓</span>
                    })}
                    {e.levelRule && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{LEVEL_RULE_LABEL[e.levelRule]}</span>}
                </div>
            ) : (
                <div style={{ fontSize: 9.5, opacity: 0.55, marginTop: 3 }}>Équipe pas encore gravée : elle le sera au prochain record.</div>
            )}
        </div>
    )
}

export function FrontierStatsView({ facility, best, accent }: { facility: "tour" | "usine"; best: number; accent: string }) {
    const [board, setBoard] = useState<FrontierBoard | null>(null)
    useEffect(() => {
        let cancelled = false
        void fetchFrontierBoard().then((b) => { if (!cancelled) setBoard(b) })
        return () => { cancelled = true }
    }, [])
    const list = board ? (facility === "tour" ? board.tower : board.factory) : null
    const left = Math.max(0, FRONTIER_CHAMPION_STREAK - best)
    const title = facility === "tour" ? "🏯 Les maîtres de la Tour" : "🏭 Les maîtres de l'Usine"
    return (
        <div style={{ textAlign: "left", fontSize: 11.5, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 800, color: accent, marginBottom: 2 }}>🏅 Ton record</div>
            <div style={{ marginBottom: 10 }}>
                {best} victoire{best > 1 ? "s" : ""} d&apos;affilée · {left === 0 ? <b>👑 Champion</b> : <>encore <b>{left}</b> pour le sacre de Champion</>}
            </div>
            <div style={{ fontWeight: 800, color: accent, marginBottom: 5 }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "42dvh", overflowY: "auto" }}>
                {list === null
                    ? <div style={{ fontSize: 10, opacity: 0.6 }}>Chargement des records…</div>
                    : list.length === 0
                        ? <div style={{ fontSize: 10, opacity: 0.6 }}>Aucun record pour l&apos;instant : sois le premier !</div>
                        : list.map((e, i) => <BoardRow key={`${e.nickname}-${i}`} e={e} i={i} accent={accent} />)}
            </div>
        </div>
    )
}
