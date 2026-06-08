"use client"

// Nexus Jaune Éclair — REGISTRE DES DRESSEURS (bibliothèque du Centre Daemon).
// Liste tous les joueurs Yellow (invités inclus) : équipe + Pokédex + badges + PvP
// + ACE, triable. Tap sur une carte → fiche détaillée de l'équipe (lecture seule).

import { useEffect, useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

interface RegistryMon { speciesId: string; level: number; nickname: string | null }
interface RegistryPlayer {
    userId: string
    nickname: string
    isGuest: boolean
    team: RegistryMon[]
    dexCaught: number
    badges: string[]
    pvp: { wins: number; losses: number }
    aceWins: number
    favoriteDaemon: string | null
    favoriteMove: string | null
}

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"
const BADGE_ICON: Record<string, string> = { plante: "🌿", roche: "🪨", eau: "💧", feu: "🔥", elec: "⚡", glace: "❄️" }

type SortKey = "dex" | "badges" | "pvp" | "ace"
const SORTS: { key: SortKey; label: string }[] = [
    { key: "dex", label: "📕 Pokédex" },
    { key: "badges", label: "🎖️ Badges" },
    { key: "pvp", label: "⚔️ PvP" },
    { key: "ace", label: "🐆 ACE" },
]
function sortVal(p: RegistryPlayer, k: SortKey): number {
    if (k === "dex") return p.dexCaught
    if (k === "badges") return p.badges.length
    if (k === "pvp") return p.pvp.wins
    return p.aceWins
}

function MonSprite({ id, level, size = 36 }: { id: string; level?: number; size?: number }) {
    const sp = getSpecies(id)
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {sp?.sprite
                ? <img src={sp.sprite} alt={sp.name} style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }} />
                : <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.6 }}>❔</div>}
            {level != null && <span style={{ fontSize: 9, color: INK, opacity: 0.7 }}>N.{level}</span>}
        </div>
    )
}

export default function LibraryPanel() {
    const open = useGameStore((s) => s.libraryOpen)
    const close = useGameStore((s) => s.closeLibrary)
    const [players, setPlayers] = useState<RegistryPlayer[] | null>(null)
    const [dexTotal, setDexTotal] = useState(97)
    const [me, setMe] = useState("")
    const [err, setErr] = useState(false)
    const [sort, setSort] = useState<SortKey>("dex")
    const [selected, setSelected] = useState<RegistryPlayer | null>(null)

    useEffect(() => {
        if (!open) { setSelected(null); return }
        let cancel = false
        setPlayers(null); setErr(false)
        fetch("/api/gamebook/yellow/registry")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
            .then((j) => { if (!cancel) { setPlayers(j.players ?? []); setDexTotal(j.dexTotal ?? 97); setMe(j.me ?? "") } })
            .catch(() => { if (!cancel) setErr(true) })
        return () => { cancel = true }
    }, [open])

    if (!open) return null
    const sorted = players ? [...players].sort((a, b) => sortVal(b, sort) - sortVal(a, sort)) : []

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>📚 REGISTRE DES DRESSEURS <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>Nexus Jaune Éclair</span></div>

                <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: `2px solid ${DARK}`, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: INK, opacity: 0.7 }}>Trier :</span>
                    {SORTS.map((s) => (
                        <button key={s.key} onClick={() => setSort(s.key)} style={{ ...chip, ...(sort === s.key ? chipOn : {}) }}>{s.label}</button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                    {players === null && !err && <div style={muted}>Chargement…</div>}
                    {err && <div style={muted}>Registre indisponible (réessaie plus tard).</div>}
                    {players && sorted.length === 0 && <div style={muted}>Aucun dresseur inscrit pour l'instant.</div>}
                    {sorted.map((p, i) => (
                        <button key={p.userId} onClick={() => setSelected(p)} style={{ ...card, ...(p.userId === me ? cardMe : {}) }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 900, color: INK, width: 20, textAlign: "center" }}>{i + 1}</span>
                                <MonSprite id={p.team[0]?.speciesId ?? ""} size={38} />
                                <div style={{ flex: 1, textAlign: "left" }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>
                                        {p.nickname}
                                        {p.userId === me && <span style={{ fontSize: 9, color: "#1b7a1b" }}> (toi)</span>}
                                        {p.isGuest && <span style={{ fontSize: 9, color: "#a06030" }}> · invité</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: INK, opacity: 0.85 }}>
                                        📕 {p.dexCaught}/{dexTotal} · {p.badges.map((b) => BADGE_ICON[b] ?? "🎖️").join("") || "—"} · ⚔️ {p.pvp.wins}-{p.pvp.losses} · 🐆 {p.aceWins}
                                    </div>
                                </div>
                                <span style={{ fontSize: 14, color: INK, opacity: 0.4 }}>›</span>
                            </div>
                        </button>
                    ))}
                </div>

                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>

            {selected && (() => {
                const fav = selected.favoriteDaemon ? getSpecies(selected.favoriteDaemon) : null
                return (
                    <div onClick={() => setSelected(null)} style={{ ...overlay, zIndex: 62 }}>
                        <div onClick={(e) => e.stopPropagation()} style={box}>
                            <div style={header}>{selected.nickname}{selected.isGuest ? " · invité" : ""}</div>
                            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                                <div style={{ fontSize: 12, color: INK, lineHeight: 1.6, marginBottom: 10 }}>
                                    📕 Pokédex <b>{selected.dexCaught}/{dexTotal}</b> · 🎖️ {selected.badges.map((b) => BADGE_ICON[b] ?? b).join(" ") || "aucun badge"}<br />
                                    ⚔️ PvP <b>{selected.pvp.wins}V</b> / {selected.pvp.losses}D · 🐆 <b>{selected.aceWins}</b> victoire(s) sur ACE
                                    {fav && <><br />⭐ Daemon fétiche : <b>{fav.name}</b></>}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: INK, marginBottom: 6 }}>ÉQUIPE ({selected.team.length})</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {selected.team.map((m, i) => {
                                        const sp = getSpecies(m.speciesId)
                                        return (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "4px 8px" }}>
                                                <MonSprite id={m.speciesId} size={42} />
                                                <div style={{ textAlign: "left" }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{m.nickname || sp?.name || m.speciesId} <span style={{ opacity: 0.7, fontWeight: 400 }}>N.{m.level}</span></div>
                                                    <div style={{ fontSize: 10, color: INK, opacity: 0.6 }}>{sp?.types.join(" / ") ?? ""}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} style={closeBtn}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const muted: React.CSSProperties = { fontSize: 12, color: INK, opacity: 0.6, textAlign: "center", padding: 20 }
const card: React.CSSProperties = { display: "block", width: "100%", background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: 8, marginBottom: 8, cursor: "pointer", fontFamily: "inherit" }
const cardMe: React.CSSProperties = { border: "2px solid #1b7a1b", background: "#eefbe8" }
const chip: React.CSSProperties = { background: "#fff", border: `2px solid ${DARK}`, borderRadius: 14, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: INK, cursor: "pointer", fontFamily: "inherit" }
const chipOn: React.CSSProperties = { background: INK, color: CREAM, border: `2px solid ${INK}` }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
