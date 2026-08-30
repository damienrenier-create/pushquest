"use client"

// Hall of Fame PARTAGÉ — consultable par tous les joueurs depuis le menu START.
// Liste les champions de la Ligue (du plus récent au plus ancien), avec l'équipe gelée
// au sacre (sprite + niveau + stats + moveset). Lecture seule, données serveur.

import { useEffect, useMemo, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { startHofBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { useActiveWorld, usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { CLANS, CLAN_KEYS } from "@/lib/gamebook/yellow/data/clans"
import type { ClanHallMember } from "@/lib/gamebook/yellow/store/clanHof"
import { useFusionSprite } from "./useFusionSprite"
import type { ChampionMon, FusionChampionMon } from "@/lib/gamebook/yellow/storage/save"

// Un sprite figé « missingno » (combo non-officiel dont le sprite généré n'était pas chargé au sacre) → à ne pas afficher.
const isMissingNoSprite = (s?: string) => !s || s.includes("missingno")
// Sprite d'une fusion de champion : RE-résout le sprite généré (Blob) via les espèces parentes (aId/bId) au lieu de
//   garder le MissingNo figé ; repli = sprite stocké (s'il n'est pas MissingNo), sinon la mascotte 🧬.
function FusionSprite({ m, style, fallback }: { m: FusionChampionMon; style: React.CSSProperties; fallback: number }) {
    const { url } = useFusionSprite(m.aId, m.bId)
    const src = url ?? (isMissingNoSprite(m.sprite) ? null : m.sprite)
    return src ? <img src={src} alt={m.name} style={style} /> : <div style={{ fontSize: fallback }}>🧬</div>
}
interface ChampionEntry { nickname: string; wonAt: string; team: ChampionMon[]; world?: string }
interface FusionChampionEntry { nickname: string; wonAt: string; team: FusionChampionMon[]; tier: string }
const TIER_META: Record<string, { label: string; color: string }> = {
    bronze: { label: "BRONZE", color: "#cd7f32" }, argent: { label: "ARGENT", color: "#c0c6cf" }, or: { label: "OR", color: "#ffd54a" },
}

// Runs visibles au toggle : le spectateur ne voit QUE les runs qu'il a atteints (anti-spoiler).
const WORLD_META: { id: "live" | "ngplus" | "run3"; label: string }[] = [
    { id: "live", label: "RUN 1" }, { id: "ngplus", label: "RUN 2" }, { id: "run3", label: "RUN 3" },
]

const STAT_ROWS: { key: keyof ChampionMon["stats"]; label: string }[] = [
    { key: "hp", label: "PV" }, { key: "atk", label: "ATQ" }, { key: "def", label: "DÉF" },
    { key: "spe", label: "VIT" }, { key: "spc", label: "SPÉ" },
]

export default function HallOfFameViewer({ close, onFight }: { close: () => void; onFight?: () => void }) {
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [champions, setChampions] = useState<ChampionEntry[]>([])
    const [fusionChamps, setFusionChamps] = useState<FusionChampionEntry[]>([])
    const [clanMembers, setClanMembers] = useState<ClanHallMember[]>([])
    const [openMon, setOpenMon] = useState<ChampionMon | null>(null)
    const [openFusion, setOpenFusion] = useState<FusionChampionMon | null>(null)
    const [notice, setNotice] = useState<string>("")
    const activeWorld = useActiveWorld()
    const player = usePlayer()
    const fusionUnlocked = player.defeatedTrainers.includes("autel_visited") // arrivé au Dôme Fusion → onglet FUSION
    const [viewWorld, setViewWorld] = useState<"live" | "ngplus" | "run3" | "fusion" | "clans">(activeWorld === "replay" ? "live" : activeWorld)
    // Runs visibles au toggle : flags PERMANENTS ngplusUsed/run3Used (survivent à la méga-fusion de fin de run 3),
    // et PAS hasNgPlusWorld/hasRun3World (faux après fusion) → un joueur ayant bouclé les 3 runs garde l'accès.
    const availWorlds = WORLD_META.filter((w) => w.id === "live" || (w.id === "ngplus" && player.ngplusUsed) || (w.id === "run3" && player.run3Used))
    // Ne montre que les champions du run choisi (les vieilles lignes sans `world` = run 1).
    const shown = useMemo(() => champions.filter((c) => (c.world ?? "live") === viewWorld), [champions, viewWorld])
    const worldLabel = viewWorld === "fusion" ? "FUSION" : viewWorld === "clans" ? "CLANS" : (WORLD_META.find((w) => w.id === viewWorld)?.label ?? "RUN 1")

    // Affronter l'équipe figée d'un Champion (combat amical, sans sac, IA maligne). Ferme le Hall si OK.
    const fight = (label: string, team: ChampionMon[]) => {
        if (startHofBattle(label, team)) (onFight ?? close)()
        else setNotice("Soigne ton équipe (au moins 1 Daemon debout) avant d'affronter un Champion !")
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/hall-of-fame")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                const list = (j?.champions ?? []) as ChampionEntry[]
                setChampions(list)
                setState("ok")
            } catch {
                if (!cancelled) setState("error")
            }
            // Palmarès de la Ligue de Fusion (onglet FUSION, réservé aux joueurs arrivés au Dôme). Best-effort.
            if (fusionUnlocked) {
                try {
                    const rf = await fetch("/api/gamebook/yellow/fusion-hall-of-fame")
                    const jf = rf.ok ? await rf.json() : null
                    if (!cancelled) setFusionChamps((jf?.champions ?? []) as FusionChampionEntry[])
                } catch { /* silencieux */ }
            }
            // PANTHÉON DES CLANS (onglet CLANS, toujours dispo) : membres gravés des 3 clans. Best-effort.
            try {
                const rcl = await fetch("/api/gamebook/yellow/clan-hall-of-fame")
                const jcl = rcl.ok ? await rcl.json() : null
                if (!cancelled) setClanMembers((jcl?.members ?? []) as ClanHallMember[])
            } catch { /* silencieux */ }
        })()
        return () => { cancelled = true }
    }, [fusionUnlocked])

    const fmtDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) }
        catch { return "" }
    }

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>🏛️ HALL OF FAME · {worldLabel}</div>

                {/* Toggle de RUN (runs atteints) + onglet FUSION (Dôme de la Fusion) + onglet CLANS (toujours dispo) */}
                <div style={runToggleRow}>
                    {availWorlds.map((w) => (
                        <button key={w.id} onClick={() => setViewWorld(w.id)}
                            style={{ ...runToggleBtn, borderColor: viewWorld === w.id ? "#ffd54a" : "rgba(255,255,255,0.15)", background: viewWorld === w.id ? "#ffd54a" : "rgba(255,255,255,0.06)", color: viewWorld === w.id ? "#11121a" : "#fff" }}>
                            {w.label}
                        </button>
                    ))}
                    {fusionUnlocked && (
                        <button onClick={() => setViewWorld("fusion")}
                            style={{ ...runToggleBtn, borderColor: viewWorld === "fusion" ? "#c79cff" : "rgba(255,255,255,0.15)", background: viewWorld === "fusion" ? "#8a5ae0" : "rgba(255,255,255,0.06)", color: "#fff" }}>
                            🧬 FUSION
                        </button>
                    )}
                    <button onClick={() => setViewWorld("clans")}
                        style={{ ...runToggleBtn, borderColor: viewWorld === "clans" ? "#7be0a0" : "rgba(255,255,255,0.15)", background: viewWorld === "clans" ? "#2f8f5a" : "rgba(255,255,255,0.06)", color: "#fff" }}>
                        🛡️ CLANS
                    </button>
                </div>

                {state === "loading" && <div style={muted}>Chargement…</div>}
                {state === "error" && <div style={muted}>Hall of Fame indisponible (hors-ligne ?).</div>}
                {viewWorld === "clans" ? (
                    <div style={scroll}>
                        {CLAN_KEYS.map((k) => {
                            const meta = CLANS[k]
                            const roster = clanMembers.filter((m) => m.clan === k) // déjà trié par niveau (serveur)
                            return (
                                <div key={k} style={champCard}>
                                    <div style={champHead}>
                                        <span style={{ ...champName, color: "#7be0a0" }}>{meta.emoji} {meta.name.toUpperCase()}</span>
                                        <span style={champDate}>{roster.length} serment{roster.length > 1 ? "s" : ""}</span>
                                    </div>
                                    {roster.length === 0 ? (
                                        <div style={{ ...muted, padding: "6px 0" }}>Aucun serment gravé pour l&apos;instant.</div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            {roster.map((m, mi) => {
                                                const sp = getSpecies(m.speciesId)
                                                return (
                                                    <div key={mi} style={clanRow}>
                                                        <span style={clanRank}>{mi + 1}</span>
                                                        {sp?.sprite ? <img src={sp.sprite} alt={sp.name} style={clanRowImg} /> : <span style={{ fontSize: 18 }}>{meta.emoji}</span>}
                                                        <span style={clanRowName}>{m.transcended ? "🌟 " : ""}{m.nickname}</span>
                                                        <span style={clanRowLvl}>N.{m.level}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        <div style={{ ...muted, fontSize: 10.5, padding: "4px 4px 0" }}>🌟 = Transcendance atteinte (niv 80). Les noms restent gravés d&apos;un run à l&apos;autre.</div>
                    </div>
                ) : viewWorld === "fusion" ? (
                    <div style={scroll}>
                        {fusionChamps.length === 0 && (
                            <div style={muted}>Aucun sacre de fusion pour l&apos;instant.<br />Bats le Dieu Spaghetti à l&apos;Autel pour graver ton équipe ! 🧬</div>
                        )}
                        {fusionChamps.map((c, ci) => {
                            const tm = TIER_META[c.tier]
                            return (
                                <div key={ci} style={champCard}>
                                    <div style={champHead}>
                                        <span style={{ ...champName, color: "#c79cff" }}>🧬 {c.nickname}</span>
                                        {tm && <span style={{ fontSize: 9, fontWeight: 800, color: "#11121a", background: tm.color, borderRadius: 999, padding: "1px 8px" }}>{tm.label}</span>}
                                        <span style={champDate}>{fmtDate(c.wonAt)}</span>
                                    </div>
                                    <div style={teamRow}>
                                        {c.team.map((m, mi) => (
                                            <button key={mi} style={monCard} onClick={() => setOpenFusion(m)} title="Voir la fiche">
                                                <FusionSprite m={m} style={monImg} fallback={24} />
                                                <div style={monName}>{m.name}</div>
                                                <div style={monLvl}>N.{m.level}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <>
                        {state === "ok" && shown.length === 0 && (
                            <div style={muted}>Aucun champion {worldLabel} pour l&apos;instant.<br />Sois le premier à terrasser LE MAÎTRE ! 👑</div>
                        )}
                        <div style={scroll}>
                            {shown.map((c, ci) => (
                                <div key={ci} style={champCard}>
                                    <div style={champHead}>
                                        <span style={champName}>👑 {c.nickname}</span>
                                        <span style={champDate}>{fmtDate(c.wonAt)}</span>
                                    </div>
                                    <div style={teamRow}>
                                        {c.team.map((m, mi) => {
                                            const sp = getSpecies(m.speciesId)
                                            return (
                                                <button key={mi} style={monCard} onClick={() => setOpenMon(m)} title="Voir la fiche">
                                                    {sp?.sprite
                                                        ? <img src={sp.sprite} alt={sp.name} style={monImg} />
                                                        : <div style={{ fontSize: 24 }}>❓</div>}
                                                    <div style={monName}>{m.shiny ? "✨" : ""}{m.nickname ?? sp?.name ?? m.speciesId}</div>
                                                    <div style={monLvl}>N.{m.level}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <button style={fightBtn} onClick={() => fight(`Champion · ${c.nickname}`, c.team)}>
                                        ⚔️ Affronter l&apos;équipe de {c.nickname}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {notice && <div style={noticeStyle} onClick={() => setNotice("")}>{notice}</div>}

                <button style={closeBtn} onClick={close}>← FERMER</button>
            </div>

            {/* Fiche détaillée d'un Daemon de champion (stats + moveset). */}
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

            {/* Fiche détaillée d'une CHIMÈRE de champion (nom/sprite/stats stockés — pas de speciesId résolvable). */}
            {openFusion && (
                <div style={detailOverlay} onClick={(e) => { e.stopPropagation(); setOpenFusion(null) }}>
                    <div style={detailBox} onClick={(e) => e.stopPropagation()}>
                        <div style={detailHead}>
                            <FusionSprite m={openFusion} style={detailImg} fallback={48} />
                            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                <div style={detailName}>{openFusion.name}</div>
                                <div style={detailLvl}>Niveau {openFusion.level}</div>
                                <div style={detailTypes}>{openFusion.types.join(" · ")}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                            {STAT_ROWS.map((r) => (
                                <div key={r.key} style={statRow}>
                                    <span style={statLabel}>{r.label}</span>
                                    <span style={statVal}>{openFusion.stats[r.key]}</span>
                                    <span style={statBarBg}><span style={{ ...statBarFill, width: `${Math.min(100, (openFusion.stats[r.key] / 350) * 100)}%` }} /></span>
                                </div>
                            ))}
                        </div>
                        <div style={movesWrap}>
                            {openFusion.moves.map((mv, i) => <span key={i} style={moveChip}>{mv}</span>)}
                        </div>
                        <button style={closeBtn} onClick={() => setOpenFusion(null)}>← Retour</button>
                    </div>
                </div>
            )}
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.82)", fontFamily: "inherit" }
const box: React.CSSProperties = { width: "min(440px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#171430", border: "2px solid #ffd54a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(255,213,74,.25)" }
const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#ffd54a", textAlign: "center", letterSpacing: 1, marginBottom: 10 }
const runToggleRow: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 10, justifyContent: "center" }
const runToggleBtn: React.CSSProperties = { flex: 1, maxWidth: 110, padding: "5px 0", border: "1.5px solid", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.7, textAlign: "center", padding: "16px 4px", lineHeight: 1.6 }
const scroll: React.CSSProperties = { overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }
const champCard: React.CSSProperties = { background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 10 }
const champHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }
const champName: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "#ffd54a" }
const champDate: React.CSSProperties = { fontSize: 10, opacity: 0.6 }
const teamRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }
const monCard: React.CSSProperties = { width: 58, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 2px", cursor: "pointer", color: "#fff", fontFamily: "inherit" }
const monImg: React.CSSProperties = { width: 44, height: 44, objectFit: "contain", imageRendering: "pixelated" }
const monName: React.CSSProperties = { fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const monLvl: React.CSSProperties = { fontSize: 8, opacity: 0.7 }
const clanRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 8px" }
const clanRank: React.CSSProperties = { fontSize: 11, fontWeight: 800, width: 16, textAlign: "center", opacity: 0.55 }
const clanRowImg: React.CSSProperties = { width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }
const clanRowName: React.CSSProperties = { flex: 1, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const clanRowLvl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "#7be0a0" }
const fightBtn: React.CSSProperties = { marginTop: 8, width: "100%", padding: "8px 0", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#ffd54a", background: "rgba(255,255,255,0.05)", border: "1.5px solid #ffd54a", borderRadius: 8, cursor: "pointer" }
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
