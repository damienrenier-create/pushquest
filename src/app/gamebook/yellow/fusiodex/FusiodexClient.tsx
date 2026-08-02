"use client"

// Nexus Jaune Éclair — écran FUSIODEX. Trois pages : ① règles exhaustives de la fusion, ② fusions OFFICIELLES
// aperçues (à sprite), ③ fusions que le joueur a CRÉÉES (roster d'Autel). Débloqué à la 1re arrivée au Dôme
// Fusion (marker autel_visited). ⚠️ ANTI-SPOILER : gate stricte + une officielle NON aperçue ne révèle RIEN.

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePlayer, setFusionRoster } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { loadYellowSave, persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { officialFusions, officialFusionProgress, historyFusions, FUSION_RULES, AUTEL_VISITED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"
import { MISSINGNO_SPRITE } from "@/lib/gamebook/yellow/data/fusionSprite"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ChimeraPlaceholder } from "../ChimeraPlaceholder"
import { useFusionSprite } from "../useFusionSprite"
import { FusionDetailView } from "../FusionDetailView"
import type { FusionStats } from "@/lib/gamebook/yellow/data/fusionSpecies"

type Tab = "rules" | "official" | "mine"
const STAT_LABELS = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]] as const

// TRI de « Mes fusions » : ordre d'ajout, alphabétique, type, BST, ou n'importe quelle stat.
//   (Pas de « niveau » : le journal enregistre une PAIRE d'espèces — une recette — pas une instance à un niveau.)
const STAT_KEYS = ["hp", "atk", "def", "spe", "spc"] as const
type SortKey = "recent" | "name" | "type" | "bst" | (typeof STAT_KEYS)[number]
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "recent", label: "Récent" }, { key: "name", label: "A-Z" }, { key: "type", label: "Type" }, { key: "bst", label: "BST" },
    { key: "hp", label: "PV" }, { key: "atk", label: "Atq" }, { key: "def", label: "Déf" }, { key: "spe", label: "Vit" }, { key: "spc", label: "Spé" },
]

// Couleurs par type (chips), cohérentes avec l'identité Pokémon-like du jeu.
const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const typeColor = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"

function TypeChips({ types }: { types: string[] }) {
    return (
        <div style={S.chips}>
            {types.map((t) => (
                <span key={t} style={{ ...S.chip, background: typeColor(t) }}>{t}</span>
            ))}
        </div>
    )
}

function FusionSprite({ src, ring = "#6a5a8a", size = 66 }: { src?: string; ring?: string; size?: number }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ ...S.frame, width: size, height: size, boxShadow: `0 0 0 2px ${ring}55, 0 0 14px ${ring}55`, borderColor: ring }}>
            {!src || err
                ? <span style={{ fontSize: size * 0.42, opacity: 0.75 }}>🧬</span>
                : <img src={src} alt="" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

// Vignette d'une fusion CRÉÉE sans sprite officiel : affiche le sprite GÉNÉRÉ (cache serveur) s'il est prêt,
// sinon le placeholder Chimère. Lecture seule (trigger:false) : la Fusiodex ne DÉCLENCHE pas de génération
// (anti-spoiler) — le sprite a été généré à l'Autel au moment de la création.
function FusionThumb({ aId, bId, types, aSprite, bSprite, ring, size = 66 }: {
    aId: string; bId: string; types: string[]; aSprite?: string; bSprite?: string; ring?: string; size?: number
}) {
    const { url } = useFusionSprite(aId, bId)
    if (url) return <FusionSprite src={url} ring={ring} size={size} />
    return <ChimeraPlaceholder aSprite={aSprite} bSprite={bSprite} types={types} size={size} />
}

function StatBars({ stats }: { stats: FusionStats }) {
    const CAP = 180
    return (
        <div style={S.statGrid}>
            {STAT_LABELS.map(([k, lbl]) => {
                const v = stats[k] ?? 0
                const pct = Math.max(4, Math.min(100, (v / CAP) * 100))
                const col = v >= 130 ? "#7ee0a0" : v >= 90 ? "#e6d36a" : "#c79cff"
                return (
                    <div key={k} style={S.statLine}>
                        <span style={S.statLbl}>{lbl}</span>
                        <span style={S.statVal}>{v}</span>
                        <span style={S.statTrack}><span style={{ ...S.statFill, width: `${pct}%`, background: col }} /></span>
                    </div>
                )
            })}
        </div>
    )
}

export default function FusiodexClient() {
    const router = useRouter()
    const player = usePlayer()
    const dex = usePokedex()
    const [tab, setTab] = useState<Tab>("rules")
    useEffect(() => { void loadYellowSave() }, [])

    const unlocked = player.defeatedTrainers.includes(AUTEL_VISITED_MARKER)
    const official = officialFusions(dex.seen)
    const prog = officialFusionProgress(dex.seen)

    // MES FUSIONS : journal permanent ; on enrichit chaque entrée avec son sprite + nom OFFICIELS si la paire de
    //   parents matche une fusion connue (sinon sprite MissingNo + nom mot-valise). La clé = "aId|bId".
    const created = useMemo(() => historyFusions(player.fusionHistory).map((f) => {
        const [aId, bId] = f.key.split("|")
        const off = officialFusionForParents(aId, bId)
        // Sprites parents → placeholder Chimère (ou sprite généré) quand la paire n'a pas de sprite officiel dédié.
        return { ...f, aId, bId, sprite: off?.sprite ?? MISSINGNO_SPRITE, official: !!off?.sprite, aSprite: getSpecies(aId)?.sprite, bSprite: getSpecies(bId)?.sprite, displayName: off?.name ?? f.name }
    }), [player.fusionHistory])

    // TRI de « Mes fusions » (défaut : plus récentes d'abord). Clic sur le tri actif = inverse le sens.
    const [sortKey, setSortKey] = useState<SortKey>("recent")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const setSort = (k: SortKey) => {
        if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        else { setSortKey(k); setSortDir(k === "name" || k === "type" ? "asc" : "desc") } // A-Z/type montent, le reste descend
    }
    const sortedCreated = useMemo(() => {
        const arr = [...created]
        if (sortKey !== "recent") {
            arr.sort((a, b) => {
                if (sortKey === "name") return a.displayName.localeCompare(b.displayName, "fr")
                if (sortKey === "type") return (a.types[0] ?? "~~").localeCompare(b.types[0] ?? "~~", "fr") || a.displayName.localeCompare(b.displayName, "fr")
                if (sortKey === "bst") return a.bst - b.bst
                return (a.stats[sortKey] ?? 0) - (b.stats[sortKey] ?? 0)
            })
        }
        return sortDir === "desc" ? arr.reverse() : arr
    }, [created, sortKey, sortDir])

    // ÉQUIPER une fusion pour la Ligue : l'historique ne mémorise que les ESPÈCES → on retrouve 2 Daemons possédés
    //   de ces espèces (le + haut niveau dispo, non déjà engagés, instances distinctes) et on les ajoute au roster.
    const [equipMsg, setEquipMsg] = useState<{ ok: boolean; text: string } | null>(null)
    const [detail, setDetail] = useState<{ aId: string; bId: string } | null>(null) // fiche détail plein écran (clic sur une fusion)
    const equipForLeague = (aId: string, bId: string, name: string) => {
        const roster = player.fusionRoster
        if (roster.length >= 6) { setEquipMsg({ ok: false, text: "Équipe de fusion pleine (6 max) — retire-en une à l'Atelier." }); return }
        const box = [...player.team, ...player.pc]
        const byUid = (uid: string) => box.find((m) => m.uid === uid)
        const committed = new Set(roster.flatMap((p) => [p.a, p.b]))
        if (roster.some((p) => byUid(p.a)?.speciesId === aId && byUid(p.b)?.speciesId === bId)) {
            setEquipMsg({ ok: false, text: `${name} est déjà dans ton équipe de Ligue.` }); return
        }
        const pick = (spId: string, exclude?: string) => box
            .filter((m) => m.speciesId === spId && !committed.has(m.uid) && m.uid !== exclude)
            .sort((x, y) => y.level - x.level)[0] // le + haut niveau dispo
        const a = pick(aId)
        const b = pick(bId, a?.uid)
        if (!a || !b) { setEquipMsg({ ok: false, text: "Pas assez de Daemons dispo de ces espèces (déjà engagés ou relâchés ?)." }); return }
        setFusionRoster([...roster, { a: a.uid, b: b.uid }])
        persistYellowSave()
        setEquipMsg({ ok: true, text: `✓ ${name} équipée pour la Ligue ! (${roster.length + 1}/6)` })
    }

    return (
        <div style={S.root}>
            <div style={S.aurora} aria-hidden />
            <div style={S.wrap}>
                <div style={S.header}>
                    <button onClick={() => router.back()} style={S.back}>← Retour</button>
                    <div style={S.titleRow}>
                        <span style={S.titleIcon}>🧬</span>
                        <h1 style={S.title}>FUSIODEX</h1>
                    </div>
                    {unlocked && (
                        <div style={S.tabs}>
                            <button style={{ ...S.tab, ...(tab === "rules" ? S.tabOn : {}) }} onClick={() => setTab("rules")}>📜 Règles</button>
                            <button style={{ ...S.tab, ...(tab === "official" ? S.tabOn : {}) }} onClick={() => setTab("official")}>✨ Officielles <span style={S.badge}>{prog.seen}/{prog.total}</span></button>
                            <button style={{ ...S.tab, ...(tab === "mine" ? S.tabOn : {}) }} onClick={() => setTab("mine")}>🛠️ Mes fusions <span style={S.badge}>{created.length}</span></button>
                        </div>
                    )}
                </div>

                {!unlocked ? (
                    <div style={S.locked}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
                        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1, marginBottom: 8, color: "#d9b8ff" }}>FUSIODEX VERROUILLÉ</div>
                        <div style={{ fontSize: 12.5, opacity: 0.82, lineHeight: 1.55 }}>Le savoir de la fusion ne se révèle qu&apos;au <b>DÔME DE LA FUSION</b>. Rends-toi à l&apos;Autel de la Chimère, et le Dieu Spaghetti t&apos;ouvrira ces pages.</div>
                    </div>
                ) : tab === "rules" ? (
                    <div style={S.list}>
                        {FUSION_RULES.map((line, i) => (
                            i === 0
                                ? <div key={i} style={S.rulesTitle}>{line}</div>
                                : <div key={i} style={S.rulesLine}><span style={S.rulesDot}>◆</span><span>{line}</span></div>
                        ))}
                    </div>
                ) : tab === "official" ? (
                    <div style={S.list}>
                        <div style={S.progWrap}>
                            <div style={S.progHead}><span>Chimères stabilisées observées</span><b style={{ color: "#d9b8ff" }}>{prog.seen} / {prog.total}</b></div>
                            <div style={S.progTrack}><span style={{ ...S.progFill, width: `${prog.total ? (prog.seen / prog.total) * 100 : 0}%` }} /></div>
                        </div>
                        <div style={S.hint}>Une entrée reste masquée tant que tu ne l&apos;as pas <b>APERÇUE</b> dans la nature.</div>
                        {official.map((f) => {
                            const ring = f.seen && f.types[0] ? typeColor(f.types[0]) : "#4a3a6a"
                            return (
                                <div key={f.id} style={{ ...S.card, borderLeftColor: ring, opacity: f.seen ? 1 : 0.62 }}>
                                    <div style={S.no}>N°{String(f.dexNo).padStart(3, "0")}</div>
                                    {f.seen
                                        ? <FusionSprite src={f.sprite} ring={ring} />
                                        : <div style={{ ...S.frame, width: 66, height: 66, borderColor: "#4a3a6a" }}><span style={{ fontSize: 30, opacity: 0.6 }}>?</span></div>}
                                    <div style={S.body}>
                                        <div style={S.name}>{f.seen ? f.name.toUpperCase() : "? ? ?"}</div>
                                        {f.seen
                                            ? <TypeChips types={f.types} />
                                            : <div style={S.desc}>Chimère non observée</div>}
                                        {f.seen && f.description && <div style={S.desc}>« {f.description} »</div>}
                                        {!f.seen && <div style={S.descMuted}>Croise-la dans la Grotte du Nexus pour révéler son identité.</div>}
                                    </div>
                                    <div style={S.tag}>{f.seen ? "👁" : "🔒"}</div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={S.list}>
                        <div style={S.hint}>Le <b>journal</b> de toutes les chimères assemblées à l&apos;Autel — conservé à jamais. Le bouton <b>⚔️ Équiper</b> la charge dans ton équipe de Ligue (retrouve 2 Daemons possédés de ces espèces).</div>
                        {equipMsg && <div style={{ ...S.equipMsg, background: equipMsg.ok ? "rgba(46,160,90,0.16)" : "rgba(200,60,60,0.14)", borderColor: equipMsg.ok ? "#2ea05a" : "#c83c3c", color: equipMsg.ok ? "#8ff0b5" : "#ffb0b0" }}>{equipMsg.text}</div>}
                        {created.length > 1 && (
                            <div style={S.sortBar}>
                                <span style={S.sortLabel}>Trier</span>
                                {SORT_OPTIONS.map((s) => (
                                    <button key={s.key} style={{ ...S.sortBtn, ...(sortKey === s.key ? S.sortBtnOn : {}) }} onClick={() => setSort(s.key)}>
                                        {s.label}{sortKey === s.key ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                                    </button>
                                ))}
                            </div>
                        )}
                        {created.length === 0 ? (
                            <div style={S.locked}>
                                <div style={{ fontSize: 38, marginBottom: 10 }}>🛠️</div>
                                <div style={{ fontSize: 12.5, opacity: 0.85, lineHeight: 1.55 }}>Tu n&apos;as pas encore assemblé de fusion. Dépose deux Daemons sur l&apos;Autel de la Chimère pour créer ta première chimère de combat !</div>
                            </div>
                        ) : sortedCreated.map((f) => {
                            const ring = f.bst > 0 && f.types[0] ? typeColor(f.types[0]) : "#4a3a6a"
                            return (
                                <div key={f.key} onClick={() => f.bst > 0 && setDetail({ aId: f.aId, bId: f.bId })} title={f.bst > 0 ? "Voir la fiche" : undefined} style={{ ...S.card, borderLeftColor: ring, cursor: f.bst > 0 ? "pointer" : "default" }}>
                                    {f.official || f.bst === 0
                                        ? <FusionSprite src={f.sprite} ring={ring} />
                                        : <FusionThumb aId={f.aId} bId={f.bId} types={f.types} aSprite={f.aSprite} bSprite={f.bSprite} ring={ring} size={66} />}
                                    <div style={S.body}>
                                        <div style={S.name}>{f.displayName.toUpperCase()}</div>
                                        {f.bst > 0 ? (
                                            <>
                                                <div style={S.parentLine}>{f.parents[0]} <span style={{ opacity: 0.5 }}>✦</span> {f.parents[1]} · <b style={{ color: "#d9b8ff" }}>Total {f.bst}</b></div>
                                                <TypeChips types={f.types} />
                                                <StatBars stats={f.stats} />
                                                <button style={S.equipBtn} onClick={(e) => { e.stopPropagation(); equipForLeague(f.aId, f.bId, f.displayName) }}>⚔️ Équiper pour la Ligue</button>
                                            </>
                                        ) : (
                                            <div style={S.descMuted}>{f.parents[0]} × {f.parents[1]} — chimère archivée</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            {detail && <FusionDetailView aId={detail.aId} bId={detail.bId} onClose={() => setDetail(null)} />}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { position: "relative", minHeight: "100dvh", background: "#0f0b18", color: "#f3ecff", fontFamily: "'Courier New', monospace", overflow: "hidden" },
    aurora: { position: "absolute", inset: 0, background: "radial-gradient(900px 460px at 50% -8%, #3a2668 0%, #1c1430 42%, #0f0b18 78%)", pointerEvents: "none" },
    wrap: { position: "relative", padding: "18px 16px 40px" },
    header: { maxWidth: 580, margin: "0 auto 14px" },
    back: { background: "rgba(30,22,48,0.7)", border: "1px solid #6a5a8a", borderRadius: 7, padding: "5px 12px", color: "#c9b8e8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 12 },
    titleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    titleIcon: { fontSize: 26, filter: "drop-shadow(0 0 8px #b98aff88)" },
    title: { fontSize: 22, fontWeight: 900, letterSpacing: 4, margin: 0, color: "#e6d2ff", textShadow: "0 0 14px #9a5aff66" },
    tabs: { display: "flex", gap: 7, flexWrap: "wrap" },
    tab: { flex: 1, minWidth: 100, background: "rgba(36,29,56,0.8)", border: "1px solid #4a3a6a", borderRadius: 9, padding: "8px 6px", color: "#b8a8d8", fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .12s" },
    tabOn: { background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", borderColor: "#c79cff", color: "#fff", boxShadow: "0 2px 12px #7a4ad066" },
    badge: { display: "inline-block", background: "rgba(0,0,0,0.32)", borderRadius: 8, padding: "0 6px", marginLeft: 3, fontSize: 10 },
    list: { maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 9 },
    hint: { fontSize: 11, opacity: 0.72, fontStyle: "italic", lineHeight: 1.45, padding: "0 2px 2px" },
    progWrap: { background: "rgba(32,26,48,0.7)", border: "1px solid #3a2e56", borderRadius: 10, padding: "9px 12px" },
    progHead: { display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 6, opacity: 0.9 },
    progTrack: { height: 7, background: "#120f1c", borderRadius: 5, overflow: "hidden" },
    progFill: { display: "block", height: "100%", background: "linear-gradient(90deg,#8a5ae0,#c79cff)", borderRadius: 5, transition: "width .3s" },
    locked: { maxWidth: 460, margin: "44px auto", textAlign: "center", background: "rgba(32,26,48,0.8)", border: "2px solid #4a3a6a", borderRadius: 14, padding: "30px 22px", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" },
    rulesTitle: { fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "#e6d2ff", textAlign: "center", padding: "4px 0 8px", textShadow: "0 0 10px #9a5aff55" },
    rulesLine: { display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, background: "rgba(32,26,48,0.7)", border: "1px solid #3a2e56", borderLeft: "3px solid #8a5ae0", borderRadius: 9, padding: "10px 13px" },
    rulesDot: { color: "#b98aff", fontSize: 10, marginTop: 3, flexShrink: 0 },
    card: { display: "flex", alignItems: "center", gap: 13, background: "rgba(36,29,56,0.72)", border: "1px solid #4a3a6a", borderLeft: "4px solid #6a5a8a", borderRadius: 11, padding: "10px 13px", width: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" },
    no: { fontSize: 10, fontWeight: 700, opacity: 0.55, width: 40, flexShrink: 0 },
    frame: { borderRadius: 14, background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", border: "2px solid #6a5a8a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", color: "#b8a8d8" },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: 900, letterSpacing: 1, color: "#f6efff" },
    chips: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 },
    chip: { fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: "#161018", padding: "2px 8px", borderRadius: 999, textShadow: "0 1px 0 rgba(255,255,255,0.25)" },
    parentLine: { fontSize: 10.5, opacity: 0.82, marginTop: 3 },
    desc: { fontSize: 10.5, opacity: 0.75, marginTop: 3, fontStyle: "italic" },
    descMuted: { fontSize: 10, opacity: 0.55, marginTop: 3, fontStyle: "italic" },
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", marginTop: 7 },
    statLine: { display: "flex", alignItems: "center", gap: 5, fontSize: 9.5 },
    statLbl: { width: 22, opacity: 0.7, fontWeight: 700 },
    statVal: { width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.9 },
    statTrack: { flex: 1, height: 5, background: "#120f1c", borderRadius: 4, overflow: "hidden" },
    statFill: { display: "block", height: "100%", borderRadius: 4 },
    tag: { fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 },
    sortBar: { display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", background: "rgba(32,26,48,0.6)", border: "1px solid #3a2e56", borderRadius: 10, padding: "7px 9px" },
    sortLabel: { fontSize: 10, fontWeight: 800, letterSpacing: 1, opacity: 0.65, marginRight: 2, textTransform: "uppercase" },
    sortBtn: { background: "rgba(36,29,56,0.9)", border: "1px solid #4a3a6a", borderRadius: 999, padding: "3px 9px", color: "#b8a8d8", fontFamily: "'Courier New', monospace", fontSize: 10.5, fontWeight: 700, cursor: "pointer", transition: "all .1s" },
    sortBtnOn: { background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", borderColor: "#c79cff", color: "#fff", boxShadow: "0 2px 8px #7a4ad055" },
    equipBtn: { marginTop: 7, width: "100%", background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", border: "1px solid #c79cff", borderRadius: 8, color: "#fff", fontFamily: "'Courier New', monospace", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, padding: "6px", cursor: "pointer" },
    equipMsg: { border: "1px solid", borderRadius: 8, padding: "7px 11px", fontSize: 11.5, fontWeight: 700, lineHeight: 1.4, margin: "2px 0 4px" },
}
