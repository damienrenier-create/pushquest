"use client"

// Nexus Jaune Éclair — fiche d'une espèce. Lecture pure de SPECIES + MOVES :
// stats de base (barres), défenses (table des types), lignée évolutive, learnset.
// Style natif GBC (cohérent avec /pokedex et /dex).

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SPECIES, isDexHidden, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { usePlayer, useActiveWorld, galijahCountdown } from "@/lib/gamebook/yellow/store/playerStore"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { growthLabel } from "@/lib/gamebook/yellow/data/growthCurve"
import { MOVES } from "@/lib/gamebook/yellow/data/moves"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import { AUTEL_VISITED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import { isFusionChampion } from "@/lib/gamebook/yellow/data/fusionLeague"
import {
    TYPE_COLORS, STAT_ORDER, STAT_LABEL, baseStatTotal, statColor,
    buildEvolutionChain, computeTypeDefenses, type TypeMatch,
    galijahCounterStyle, megamonarxHint,
} from "../dexShared"
import TypeChip, { typeChartHref } from "../TypeChip"

const STAT_BAR_MAX = 160

function Sprite({ src, name, size }: { src: string; name: string; size: number }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ width: size, height: size, ...spriteBox }}>
            {err ? <span style={{ fontSize: size * 0.4, fontWeight: 900 }}>{name[0]}</span> : (
                <img src={src} alt={name} onError={() => setErr(true)}
                    style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            )}
        </div>
    )
}

function MatchRow({ title, matches, onPick }: { title: string; matches: TypeMatch[]; onPick: (t: TypeMatch["type"]) => void }) {
    if (matches.length === 0) return null
    return (
        <div style={S.matchBlock}>
            <div style={S.matchTitle}>{title}</div>
            <div style={S.matchChips}>
                {matches.map((m) => (
                    <span
                        key={m.type}
                        role="button"
                        tabIndex={0}
                        title={`Voir ${m.type} dans la table des types`}
                        onClick={() => onPick(m.type)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(m.type) } }}
                        style={{ ...S.matchChip, background: TYPE_COLORS[m.type], cursor: "pointer" }}
                    >
                        {m.type} <b>×{m.mult}</b>
                    </span>
                ))}
            </div>
        </div>
    )
}

export default function DexDetailClient({ id }: { id: string }) {
    const router = useRouter()
    const dex = usePokedex()
    const player = usePlayer()
    const aw = useActiveWorld() // hook (avant tout early-return) ; le dex est tiéré par run
    const isRun2 = aw === "ngplus", isRun3 = aw === "run3"
    useEffect(() => { void loadYellowSave() }, []) // hydrate le Pokédex (accès direct par URL) ; défaut = masqué
    const sp = SPECIES[id]
    if (!sp) return null
    // VERROU : une espèce runTwoOnly non capturée, OU une création post-Ligue tant qu'on n'est pas Champion,
    // reste MASQUÉE même par accès URL direct (/dex/merorem, /dex/mouflorage) → pas de spoiler de son
    // existence/stats/learnset avant de l'avoir débloquée.
    // Verrous alignés sur isDexHidden : post-run 3 (run3Used) débloque TOUT ; « vu » débloque le run-3 (némésis
    // affronté). Sinon on ne se révèle qu'en capturant / dans le bon run (pas de spoiler par accès URL direct).
    const runThreeLocked = sp.runThreeOnly && !isRun3 && !player.run3Used && !dex.caught.includes(id) && !dex.seen.includes(id)
    const runTwoLocked = sp.runTwoOnly && !isRun2 && !isRun3 && !player.run3Used && !dex.caught.includes(id)
    const postLeagueLocked = sp.postLeague && !player.isChampion && !isRun2 && !isRun3 && !player.run3Used && !dex.caught.includes(id)
    // LÉGENDAIRE ULTRA-SECRET (MégamonarX/Galijah) : fiche SCELLÉE tant que non CAPTURÉ — même par accès URL direct,
    // même post-run 3 (secret préservé en fin de jeu). Seule la capture réelle la révèle.
    const ultraSecretLocked = DEX_ULTRA_SECRET.has(id) && !dex.caught.includes(id)
    if (runThreeLocked || runTwoLocked || postLeagueLocked || ultraSecretLocked) {
        // Ultra-secret : on montre l'OMBRE NOIRE (silhouette) + un indice à paliers (MégamonarX) ou le décompte (Galijah).
        const reachedFusion = player.defeatedTrainers.includes(AUTEL_VISITED_MARKER)
        const wonFusion = isFusionChampion((m) => player.defeatedTrainers.includes(m))
        const mHint = ultraSecretLocked && id === "megamonarx" ? megamonarxHint(reachedFusion, wonFusion) : null
        const gRem = ultraSecretLocked && id === "galijah" ? galijahCountdown(dex.caught.length) : null
        return (
            <div style={S.root}>
                <div style={{ ...S.wrap, textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>
                        {ultraSecretLocked
                            ? <img src={sp.sprite} alt="?" style={{ width: 140, height: 140, objectFit: "contain", imageRendering: "pixelated", filter: "brightness(0)" }} />
                            : "❓"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>DAEMON INCONNU</div>
                    {gRem !== null && <div style={{ ...galijahCounterStyle(gRem), marginBottom: 8 }}>{gRem}</div>}
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 20, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                        {ultraSecretLocked
                            ? (mHint ?? (gRem !== null ? "Un décompte énigmatique s'égrène… plus il approche de zéro, plus l'heure est proche." : "Un secret rôde derrière ce numéro… il ne se révélera qu'à celui qui le fera sien."))
                            : postLeagueLocked ? "Cette entrée ne se révélera qu'une fois la Ligue vaincue." : "Cette entrée reste scellée… tu la débloqueras en la rencontrant."}
                    </div>
                    <button onClick={() => router.push("/gamebook/yellow/dex")} style={S.back}>← Retour au Dex</button>
                </div>
            </div>
        )
    }

    const bst = baseStatTotal(sp.baseStats)
    const defenses = computeTypeDefenses(sp.types)
    const chain = buildEvolutionChain(id)
    const learnset = [...sp.learnset].sort((a, b) => a.level - b.level)
    const goType = (t: Parameters<typeof typeChartHref>[0]) => router.push(typeChartHref(t))

    return (
        <div style={S.root}>
            <div style={S.wrap}>
                <button onClick={() => router.push("/gamebook/yellow/dex")} style={S.back}>← Dex</button>

                {/* En-tête */}
                <div style={S.head}>
                    <Sprite src={sp.sprite} name={sp.name} size={120} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.no}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                        <h1 style={S.name}>{sp.name.toUpperCase()}</h1>
                        <div style={S.chipRow}>{sp.types.map((t) => <TypeChip key={t} type={t} big />)}</div>
                        {sp.role && <div style={S.role}>{sp.role}</div>}
                    </div>
                </div>

                <p style={S.desc}>{sp.description}</p>

                {/* Méta */}
                <div style={S.metaRow}>
                    <div style={S.metaCell}><span style={S.metaLbl}>Rareté</span><span style={S.metaVal}>{sp.rarity}</span></div>
                    <div style={S.metaCell}><span style={S.metaLbl}>Capture</span><span style={S.metaVal}>{sp.catchRate}</span></div>
                    <div style={S.metaCell}><span style={S.metaLbl}>Exp. base</span><span style={S.metaVal}>{sp.baseExp}</span></div>
                    <div style={S.metaCell}><span style={S.metaLbl}>Courbe</span><span style={S.metaVal}>{growthLabel(sp.id)}</span></div>
                </div>

                {/* Stats de base */}
                <div style={S.panel}>
                    <div style={S.panelTitle}>STATS DE BASE</div>
                    {STAT_ORDER.map((k) => {
                        const v = sp.baseStats[k]
                        return (
                            <div key={k} style={S.statRow}>
                                <span style={S.statLbl}>{STAT_LABEL[k]}</span>
                                <span style={S.statVal}>{v}</span>
                                <div style={S.statTrack}>
                                    <div style={{ ...S.statFill, width: `${Math.min(100, (v / STAT_BAR_MAX) * 100)}%`, background: statColor(v) }} />
                                </div>
                            </div>
                        )
                    })}
                    <div style={S.statRow}>
                        <span style={{ ...S.statLbl, fontWeight: 900 }}>TOT</span>
                        <span style={{ ...S.statVal, fontWeight: 900 }}>{bst}</span>
                        <div style={S.statTrack} />
                    </div>
                </div>

                {/* Défenses (table des types) */}
                <div style={S.panel}>
                    <div style={S.panelTitle}>EFFICACITÉ DES TYPES</div>
                    <MatchRow title="Faible contre" matches={defenses.weak} onPick={goType} />
                    <MatchRow title="Résiste à" matches={defenses.resist} onPick={goType} />
                    <MatchRow title="Immunisé contre" matches={defenses.immune} onPick={goType} />
                    {defenses.weak.length === 0 && defenses.resist.length === 0 && defenses.immune.length === 0 && (
                        <div style={S.muted}>Aucune interaction particulière.</div>
                    )}
                </div>

                {/* Lignée évolutive */}
                {chain.length > 1 && (
                    <div style={S.panel}>
                        <div style={S.panelTitle}>ÉVOLUTION</div>
                        <div style={S.evoRow}>
                            {chain.map((stage, i) => {
                                // Un stade VOISIN encore scellé (runTwoOnly/postLeague non débloqué) reste « ??? » :
                                // pas de spoiler de son nom/sprite même si on possède un autre stade de la lignée.
                                const sealed = isDexHidden(SPECIES[stage.id], dex.caught, player.isChampion, isRun2, isRun3, player.run3Used, dex.seen)
                                return (
                                    <div key={stage.id} style={S.evoItem}>
                                        {i > 0 && (
                                            <div style={S.evoArrow}>
                                                <span style={S.evoArrowTxt}>▶</span>
                                                <span style={S.evoCond}>{stage.methodLabel}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => { if (!sealed) router.push(`/gamebook/yellow/dex/${stage.id}`) }}
                                            disabled={sealed}
                                            style={{ ...S.evoBtn, ...(stage.id === id ? S.evoBtnActive : {}) }}
                                        >
                                            {sealed
                                                ? <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, opacity: 0.75 }}>❓</div>
                                                : <Sprite src={stage.sprite} name={stage.name} size={56} />}
                                            <span style={S.evoName}>{sealed ? "???" : stage.name}</span>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Learnset */}
                <div style={S.panel}>
                    <div style={S.panelTitle}>CAPACITÉS (PAR NIVEAU)</div>
                    <div style={S.moveHead}>
                        <span style={S.colLv}>Niv</span>
                        <span style={S.colName}>Capacité</span>
                        <span style={S.colType}>Type</span>
                        <span style={S.colNum}>Pui</span>
                        <span style={S.colNum}>Préc</span>
                    </div>
                    {learnset.map((entry, i) => {
                        const mv = MOVES[entry.moveId]
                        if (!mv) return null
                        const cat = moveCategory(mv.type)
                        return (
                            <div key={`${entry.moveId}-${i}`} style={S.moveRow}>
                                <span style={S.colLv}>{entry.level}</span>
                                <span style={S.colName}>
                                    {mv.name}
                                    <span style={S.cat}>{mv.power > 0 ? (cat === "PHYSICAL" ? "Phys" : "Spé") : "Stat"}</span>
                                </span>
                                <span style={S.colType}><TypeChip type={mv.type} /></span>
                                <span style={S.colNum}>{mv.power > 0 ? mv.power : "—"}</span>
                                <span style={S.colNum}>{mv.accuracy > 0 ? mv.accuracy : "—"}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const spriteBox: React.CSSProperties = {
    background: "#fff", border: "2px solid #1c1408", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#1a1a1a", color: "#f8f8e8", fontFamily: "'Courier New', monospace", padding: 16 },
    wrap: { maxWidth: 560, margin: "0 auto" },
    back: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "5px 12px", color: "#c8c8c8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 12 },

    head: { display: "flex", gap: 14, alignItems: "center", marginBottom: 10 },
    no: { fontSize: 11, fontWeight: 700, opacity: 0.6 },
    name: { fontSize: 22, fontWeight: 900, letterSpacing: 2, margin: "2px 0 6px" },
    chipRow: { display: "flex", gap: 6, flexWrap: "wrap" },
    role: { fontSize: 10, opacity: 0.65, marginTop: 6, fontStyle: "italic" },
    desc: { fontSize: 12, lineHeight: 1.5, opacity: 0.85, marginBottom: 14, background: "#262626", border: "1px solid #000", borderRadius: 8, padding: "10px 12px" },

    metaRow: { display: "flex", gap: 8, marginBottom: 14 },
    metaCell: { flex: 1, background: "#262626", border: "1px solid #000", borderRadius: 8, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 3, alignItems: "center" },
    metaLbl: { fontSize: 8, opacity: 0.55, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" },
    metaVal: { fontSize: 11, fontWeight: 900 },

    panel: { background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 10, padding: "12px 14px", marginBottom: 14 },
    panelTitle: { fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 10, opacity: 0.8 },

    statRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
    statLbl: { fontSize: 10, fontWeight: 700, width: 30 },
    statVal: { fontSize: 11, fontWeight: 700, width: 30, textAlign: "right" },
    statTrack: { flex: 1, height: 10, background: "#d8d4b8", borderRadius: 5, overflow: "hidden", border: "1px solid #1c1408" },
    statFill: { height: "100%", transition: "width 0.4s" },

    matchBlock: { marginBottom: 8 },
    matchTitle: { fontSize: 9, fontWeight: 700, opacity: 0.65, marginBottom: 4, letterSpacing: 0.5 },
    matchChips: { display: "flex", flexWrap: "wrap", gap: 4 },
    matchChip: { fontSize: 9, fontWeight: 700, color: "#fff", padding: "3px 7px", borderRadius: 4, letterSpacing: 0.3, textShadow: "0 1px 1px rgba(0,0,0,0.4)" },
    muted: { fontSize: 10, opacity: 0.6, fontStyle: "italic" },

    evoRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 },
    evoItem: { display: "flex", alignItems: "center", gap: 4 },
    evoArrow: { display: "flex", flexDirection: "column", alignItems: "center", padding: "0 2px" },
    evoArrowTxt: { fontSize: 14, fontWeight: 900, opacity: 0.7 },
    evoCond: { fontSize: 8, fontWeight: 700, opacity: 0.7, whiteSpace: "nowrap" },
    evoBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "2px solid transparent", borderRadius: 10, padding: 6, cursor: "pointer", fontFamily: "'Courier New', monospace" },
    evoBtnActive: { border: "2px solid #f5a000", background: "#fff4d6" },
    evoName: { fontSize: 9, fontWeight: 900, letterSpacing: 0.5, color: "#1c1408" },

    chip: { fontSize: 8, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5, textShadow: "0 1px 1px rgba(0,0,0,0.4)", display: "inline-block" },
    chipBig: { fontSize: 11, padding: "4px 10px", borderRadius: 5 },

    moveHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 8, fontWeight: 700, opacity: 0.55, letterSpacing: 0.5, textTransform: "uppercase", paddingBottom: 6, borderBottom: "1px solid #c8c4a8", marginBottom: 4 },
    moveRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "5px 0", borderBottom: "1px solid #ece8cc" },
    colLv: { width: 26, textAlign: "center", fontWeight: 700, flexShrink: 0 },
    colName: { flex: 1, minWidth: 0, fontWeight: 700, display: "flex", flexDirection: "column" },
    colType: { width: 64, flexShrink: 0 },
    colNum: { width: 34, textAlign: "center", flexShrink: 0 },
    cat: { fontSize: 8, opacity: 0.55, fontWeight: 700 },
}
