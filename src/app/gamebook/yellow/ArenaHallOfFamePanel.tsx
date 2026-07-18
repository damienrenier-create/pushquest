"use client"

// Hall of Fame PAR ARÈNE — consultable par tous depuis le menu START.
// Onglets des 5 arènes ; pour chacune, qui l'a conquise (du plus récent au plus ancien) avec
// quelle équipe (gelée au moment de la victoire du badge). Lecture seule, données serveur.

import { useEffect, useMemo, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { startHofBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { useActiveWorld, usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import type { ChampionMon } from "@/lib/gamebook/yellow/storage/save"

interface Entry { nickname: string; badgeId: string; wonAt: string; team: ChampionMon[] }

type ArenaMeta = { id: string; nom: string; boss: string; emoji: string; color: string }
const ARENAS: ArenaMeta[] = [
    { id: "plante", nom: "Bosquet Sacré", boss: "Druide Sylvain", emoji: "🌿", color: "#3aa54a" },
    { id: "roche", nom: "Caverne Minière", boss: "Maître Granit", emoji: "🪨", color: "#b08d57" },
    { id: "feu", nom: "La Caldeira", boss: "Pyra", emoji: "🔥", color: "#e0502a" },
    { id: "elec", nom: "Tour Hertz", boss: "Volta", emoji: "⚡", color: "#f6c640" },
    { id: "eau", nom: "Sanctuaire des Marées", boss: "Ondine", emoji: "💧", color: "#3a8ee0" },
]
// RUN 2 (NG+) : les arènes gardent leur DOYEN mais changent de TYPE (cf. ngplusArenas.ts) → emoji/nom/couleur
// alignés sur le NOUVEAU type (Vol / Psy / Cabinet éclectique / Bestioles&Spectres / Gauntlet des finals),
// pas sur le type d'origine. Slots (id) inchangés : plante→Vol, roche→Psy, feu→Cabinet, elec→Bestioles, eau→Gauntlet.
const ARENAS_RUN2: ArenaMeta[] = [
    { id: "plante", nom: "Arène Vol", boss: "Druide Sylvain", emoji: "🕊️", color: "#8fb8e0" },
    { id: "roche", nom: "Arène Psy", boss: "Maître Granit", emoji: "🔮", color: "#e070b0" },
    { id: "feu", nom: "Cabinet Inédit", boss: "Pyra", emoji: "🎭", color: "#d59030" },
    { id: "elec", nom: "Bestioles & Spectres", boss: "Volta", emoji: "🕸️", color: "#93b025" },
    { id: "eau", nom: "Gauntlet des Finals", boss: "Ondine", emoji: "🏆", color: "#8fb0c8" },
]
// RUN 3 : les arènes sont re-typées aux GARDIENS (aperçu de la Ligue) → emojis + noms + couleurs adaptés.
const ARENAS_RUN3: ArenaMeta[] = [
    { id: "plante", nom: "Arène Glace", boss: "Champion figé", emoji: "❄️", color: "#7fd4ff" },
    { id: "roche", nom: "Arène Combat", boss: "Champion figé", emoji: "🥊", color: "#e08030" },
    { id: "feu", nom: "Arène Spectre", boss: "Champion figé", emoji: "👻", color: "#a060d0" },
    { id: "elec", nom: "Arène Dragon", boss: "Champion figé", emoji: "🐉", color: "#5a6fe0" },
    { id: "eau", nom: "Arène Prisme", boss: "Champion figé", emoji: "🌈", color: "#40c0a0" },
]
// Runs disponibles au toggle (le VIEWER ne voit que les runs qu'il a atteints — anti-spoiler).
const WORLD_META: { id: "live" | "ngplus" | "run3"; label: string }[] = [
    { id: "live", label: "RUN 1" }, { id: "ngplus", label: "RUN 2" }, { id: "run3", label: "RUN 3" },
]
const WORLD_PREFIX: Record<string, string> = { live: "", ngplus: "ngplus:", run3: "run3:" }

const STAT_ROWS: { key: keyof ChampionMon["stats"]; label: string }[] = [
    { key: "hp", label: "PV" }, { key: "atk", label: "ATQ" }, { key: "def", label: "DÉF" },
    { key: "spe", label: "VIT" }, { key: "spc", label: "SPÉ" },
]

export default function ArenaHallOfFamePanel({ close, onFight }: { close: () => void; onFight?: () => void }) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [entries, setEntries] = useState<Entry[]>([])
    const [tab, setTab] = useState<string>("plante")
    const [openMon, setOpenMon] = useState<ChampionMon | null>(null)
    const [notice, setNotice] = useState<string>("")

    // Affronter l'équipe figée d'un champion (combat amical, sans sac, IA maligne). Ferme le Hall si OK.
    const fight = (label: string, team: ChampionMon[]) => {
        if (startHofBattle(label, team)) (onFight ?? close)()
        else setNotice("Soigne ton équipe (au moins 1 Daemon debout) avant d'affronter un champion !")
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/arena-champions")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                setEntries((j?.champions ?? []) as Entry[])
                setState("ok")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [])

    // Le HoF d'arène est PARTAGÉ, mais les arènes des RUN 2/3 sont re-typées → badges préfixés "ngplus:"/"run3:".
    // Un TOGGLE laisse choisir le run à consulter, MAIS uniquement parmi les runs que le spectateur a ATTEINTS
    // (anti-spoiler : un joueur run 1 ne voit jamais les arènes run 2/3). Défaut = son run courant.
    const activeWorld = useActiveWorld()
    const player = usePlayer()
    const [viewWorld, setViewWorld] = useState<"live" | "ngplus" | "run3">(activeWorld === "replay" ? "live" : activeWorld)
    const arenaList = viewWorld === "run3" ? ARENAS_RUN3 : viewWorld === "ngplus" ? ARENAS_RUN2 : ARENAS
    // Runs visibles au toggle : run 1 toujours ; run 2/3 si DÉJÀ LANCÉS (flags permanents ngplusUsed/run3Used) —
    // et PAS hasNgPlusWorld/hasRun3World, qui deviennent faux après la méga-fusion de fin de run 3 (mondes effacés)
    // → un joueur ayant BOUCLÉ les 3 runs garde bien l'accès aux 3 toggles. Anti-spoiler : un run-1 pur a ces flags faux.
    const availWorlds = WORLD_META.filter((w) => w.id === "live" || (w.id === "ngplus" && player.ngplusUsed) || (w.id === "run3" && player.run3Used))
    const byBadge = useMemo(() => {
        const m: Record<string, Entry[]> = {}
        const prefix = WORLD_PREFIX[viewWorld]
        for (const e of entries) {
            // Match strict du préfixe du run choisi (run 1 = aucun préfixe ngplus:/run3:).
            const isThisRun = prefix ? e.badgeId.startsWith(prefix) : (!e.badgeId.startsWith("ngplus:") && !e.badgeId.startsWith("run3:"))
            if (!isThisRun) continue
            const base = prefix ? e.badgeId.slice(prefix.length) : e.badgeId
            ;(m[base] ??= []).push(e)
        }
        return m
    }, [entries, viewWorld])

    // À l'arrivée des données OU au changement de run, ouvre la 1re arène qui a des champions.
    useEffect(() => {
        if (state !== "ok") return
        const first = arenaList.find((a) => (byBadge[a.id]?.length ?? 0) > 0)
        setTab((first ?? arenaList[0]).id)
    }, [state, byBadge, viewWorld]) // eslint-disable-line react-hooks/exhaustive-deps

    const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) } catch { return "" } }
    const arena = arenaList.find((a) => a.id === tab) ?? arenaList[0]
    const list = byBadge[tab] ?? []
    const worldLabel = WORLD_META.find((w) => w.id === viewWorld)?.label ?? "RUN 1"

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>⚔️ HALL OF FAME DES ARÈNES · {worldLabel}</div>

                {/* Toggle de RUN (seulement les runs atteints par le spectateur) */}
                {availWorlds.length > 1 && (
                    <div style={runToggleRow}>
                        {availWorlds.map((w) => (
                            <button key={w.id} onClick={() => setViewWorld(w.id)}
                                style={{ ...runToggleBtn, borderColor: viewWorld === w.id ? "#ffd54a" : "rgba(255,255,255,0.15)", background: viewWorld === w.id ? "#ffd54a" : "rgba(255,255,255,0.06)", color: viewWorld === w.id ? "#11121a" : "#fff" }}>
                                {w.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Onglets des 5 arènes */}
                <div style={tabsRow}>
                    {arenaList.map((a) => {
                        const n = byBadge[a.id]?.length ?? 0
                        const active = a.id === tab
                        return (
                            <button key={a.id} onClick={() => setTab(a.id)} title={`${a.nom} — ${a.boss}`}
                                style={{ ...tabBtn, borderColor: active ? a.color : "rgba(255,255,255,0.15)", background: active ? a.color : "rgba(255,255,255,0.06)", color: active ? "#11121a" : "#fff" }}>
                                <span style={{ fontSize: 16 }}>{a.emoji}</span>
                                <span style={tabCount}>{n}</span>
                            </button>
                        )
                    })}
                </div>

                <div style={arenaHead}>
                    <span style={{ ...arenaName, color: arena.color }}>{arena.emoji} {arena.nom}</span>
                    <span style={arenaBoss}>Doyen : {arena.boss}</span>
                </div>

                {state === "loading" && <div style={muted}>Chargement…</div>}
                {state === "error" && <div style={muted}>Hall of Fame indisponible (hors-ligne ?).</div>}
                {state === "ok" && list.length === 0 && (
                    <div style={muted}>Personne n&apos;a encore conquis cette arène.<br />Sois le premier à décrocher ce badge ! {arena.emoji}</div>
                )}

                <div style={scroll}>
                    {list.map((c, ci) => (
                        <div key={ci} style={champCard}>
                            <div style={champHead}>
                                <span style={{ ...champName, color: arena.color }}>{arena.emoji} {c.nickname}</span>
                                <span style={champDate}>{fmtDate(c.wonAt)}</span>
                            </div>
                            <div style={teamRow}>
                                {c.team.map((m, mi) => {
                                    const sp = getSpecies(m.speciesId)
                                    return (
                                        <button key={mi} style={monCard} onClick={() => setOpenMon(m)} title="Voir la fiche">
                                            {sp?.sprite ? <img src={sp.sprite} alt={sp.name} style={monImg} /> : <div style={{ fontSize: 24 }}>❓</div>}
                                            <div style={monName}>{m.shiny ? "✨" : ""}{m.nickname ?? sp?.name ?? m.speciesId}</div>
                                            <div style={monLvl}>N.{m.level}</div>
                                        </button>
                                    )
                                })}
                            </div>
                            <button style={{ ...fightBtn, borderColor: arena.color, color: arena.color }} onClick={() => fight(`${arena.nom} · ${c.nickname}`, c.team)}>
                                ⚔️ Affronter l&apos;équipe de {c.nickname}
                            </button>
                        </div>
                    ))}
                </div>
                {notice && <div style={noticeStyle} onClick={() => setNotice("")}>{notice}</div>}

                <button style={closeBtn} onClick={close}>← FERMER</button>
            </div>

            {openMon && (() => {
                const sp = getSpecies(openMon.speciesId)
                return (
                    <div style={detailOverlay} onClick={(e) => { e.stopPropagation(); setOpenMon(null) }}>
                        <div style={detailBox} onClick={(e) => e.stopPropagation()}>
                            <div style={detailHead}>
                                {sp?.sprite ? <img src={sp.sprite} alt={sp.name} style={detailImg} /> : <div style={{ fontSize: 48 }}>❓</div>}
                                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                    <div style={detailName}>{openMon.shiny ? "✨ " : ""}{openMon.nickname ?? sp?.name ?? openMon.speciesId}</div>
                                    {openMon.nickname && sp?.name && openMon.nickname !== sp.name && <div style={detailSpecies}>{sp.name}</div>}
                                    <div style={detailLvl}>Niveau {openMon.level}</div>
                                    <div style={detailTypes}>{(sp?.types ?? []).join(" · ")}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                                {STAT_ROWS.map((r) => (
                                    <div key={r.key} style={statRow}>
                                        <span style={statLabel}>{r.label}</span>
                                        <span style={statVal}>{openMon.stats[r.key]}</span>
                                        <span style={statBarBg}><span style={{ ...statBarFill, width: `${Math.min(100, (openMon.stats[r.key] / 350) * 100)}%` }} /></span>
                                    </div>
                                ))}
                            </div>
                            <div style={movesWrap}>
                                {openMon.moves.map((mv, i) => <span key={i} style={moveChip}>{mv}</span>)}
                            </div>
                            <button style={closeBtn} onClick={() => setOpenMon(null)}>← Retour</button>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.82)", fontFamily: "inherit" }
const box: React.CSSProperties = { width: "min(460px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#171430", border: "2px solid #ffd54a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(255,213,74,.25)" }
const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#ffd54a", textAlign: "center", letterSpacing: 1, marginBottom: 10 }
const runToggleRow: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 10, justifyContent: "center" }
const runToggleBtn: React.CSSProperties = { flex: 1, maxWidth: 110, padding: "5px 0", border: "1.5px solid", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }
const tabsRow: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 10 }
const tabBtn: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, border: "2px solid", borderRadius: 8, padding: "6px 0", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }
const tabCount: React.CSSProperties = { fontSize: 9, opacity: 0.85 }
const arenaHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }
const arenaName: React.CSSProperties = { fontSize: 14, fontWeight: 800 }
const arenaBoss: React.CSSProperties = { fontSize: 10, opacity: 0.7 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.7, textAlign: "center", padding: "16px 4px", lineHeight: 1.6 }
const scroll: React.CSSProperties = { overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }
const champCard: React.CSSProperties = { background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 10 }
const champHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }
const champName: React.CSSProperties = { fontSize: 14, fontWeight: 800 }
const champDate: React.CSSProperties = { fontSize: 10, opacity: 0.6 }
const teamRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }
const monCard: React.CSSProperties = { width: 58, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 2px", cursor: "pointer", color: "#fff", fontFamily: "inherit" }
const monImg: React.CSSProperties = { width: 44, height: 44, objectFit: "contain", imageRendering: "pixelated" }
const monName: React.CSSProperties = { fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const monLvl: React.CSSProperties = { fontSize: 8, opacity: 0.7 }
const fightBtn: React.CSSProperties = { marginTop: 8, width: "100%", padding: "8px 0", fontFamily: "inherit", fontSize: 12, fontWeight: 800, background: "rgba(255,255,255,0.05)", border: "1.5px solid", borderRadius: 8, cursor: "pointer" }
const noticeStyle: React.CSSProperties = { marginTop: 10, padding: "8px 10px", fontSize: 11.5, textAlign: "center", color: "#ffd54a", background: "rgba(255,213,74,0.1)", border: "1px dashed #ffd54a", borderRadius: 8, cursor: "pointer", lineHeight: 1.5 }
const closeBtn: React.CSSProperties = { marginTop: 12, padding: "10px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
const detailOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9250, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.7)" }
const detailBox: React.CSSProperties = { width: "min(360px, 92vw)", background: "#1b1838", border: "1px solid rgba(255,213,74,0.4)", borderRadius: 12, padding: 14, color: "#fff" }
const detailHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }
const detailImg: React.CSSProperties = { width: 88, height: 88, objectFit: "contain", imageRendering: "pixelated" }
const detailName: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#ffd54a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const detailSpecies: React.CSSProperties = { fontSize: 11, opacity: 0.7 }
const detailLvl: React.CSSProperties = { fontSize: 12, marginTop: 2 }
const detailTypes: React.CSSProperties = { fontSize: 11, opacity: 0.8, marginTop: 2 }
const statRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 }
const statLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, width: 28, textAlign: "left", opacity: 0.8 }
const statVal: React.CSSProperties = { fontSize: 11, fontWeight: 700, width: 30, textAlign: "right" }
const statBarBg: React.CSSProperties = { flex: 1, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }
const statBarFill: React.CSSProperties = { display: "block", height: "100%", borderRadius: 4, background: "#ffd54a" }
const movesWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 4 }
const moveChip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "4px 8px", background: "rgba(126,224,255,0.14)", border: "1px solid rgba(126,224,255,0.3)", borderRadius: 999 }
