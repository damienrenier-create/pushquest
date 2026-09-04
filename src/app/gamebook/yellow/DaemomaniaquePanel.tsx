"use client"

// DAEMOMANIAQUE — guide de capture (PNJ Cendreville, dès le RUN 1). Comportement PAR RUN (anti-spoiler) :
//  • RUN 1  : n'affiche/informe QUE les Daemons DÉJÀ VUS (+ Goshendofy) ; localisations run 1, zones endgame masquées
//             tant que pas Champion (pas de Grotte du Nexus/plaine).
//  • RUN FUSION (run 4) : live POST-Champion — même liste « déjà vus » mais zones endgame RÉVÉLÉES (plaine, Grotte du
//             Nexus, rattrapage inédits run 3). Étiqueté « Run Fusion » pour le distinguer clairement du run 1.
//  • RUN 2  : affiche TOUS les Daemons run 1+2 ; info UNIQUEMENT sur les vus (+ Ukognos) ; localisations run 2.
//  • RUN 3  : affiche/informe TOUS les Daemons du run 3 (sans filtre « vu »).
//  • POST-3 : demande d'abord DE QUEL RUN parler (1/2/3), puis tout révèle.
// Fusions/customs exclus (getSpecies null). Éco : 5 consultations gratuites/jour puis 50⚡ (consultDaemomaniaque).

import { useEffect, useMemo, useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer, useActiveWorld, consultDaemomaniaque, freeConsultsLeft, CONSULT_COST } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getSpecies, visibleDexSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { captureGuide, type CaptureGuide } from "@/lib/gamebook/yellow/data/encounters"
import { ECLAIREUR_PRECISION_MARKER } from "@/lib/gamebook/yellow/data/pnj7"
import type { SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import DaemomaniaqueCompare from "./DaemomaniaqueCompare"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"
type Mode = "run1" | "run2" | "run3" | "run4" | "post"

export default function DaemomaniaquePanel() {
    const open = useGameStore((s) => s.daemomaniaqueOpen)
    const close = useGameStore((s) => s.closeDaemomaniaque)
    const player = usePlayer()
    // ÉCLAIREUR (Grotte Puzzle) vaincu → localisations précises (coord d'échelle) au lieu du flou « Grotte B1F ».
    const eclaireurBeaten = player.defeatedTrainers.includes(ECLAIREUR_PRECISION_MARKER)
    const dex = usePokedex()
    const aw = useActiveWorld()
    const [q, setQ] = useState("")
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [sel, setSel] = useState<{ sp: SpeciesData; guide: CaptureGuide } | null>(null)
    const [revealed, setRevealed] = useState<Set<string>>(new Set())
    const [err, setErr] = useState<string | null>(null)
    const [selectedRun, setSelectedRun] = useState<number | null>(null) // mode POST : run choisi
    const [tab, setTab] = useState<"guide" | "compare">("guide")
    const [spendFx, setSpendFx] = useState(0) // ⚡ : incrémenté à CHAQUE consultation PAYANTE → rejoue l'animation « −50⚡ »

    useEffect(() => { if (open) { void loadYellowSave(); setSel(null); setSelectedRun(null); setErr(null); setQ(""); setTab("guide") } }, [open])

    // RUN FUSION (run 4) = live POST-Champion (avant run 3). Distinct du run 1 (pré-Champion) : mêmes cartes live mais
    //   la plaine + la Grotte du Nexus + le rattrapage inédits run 3 s'ouvrent → « pas tout à fait les mêmes Daemons ».
    const mode: Mode = aw === "ngplus" ? "run2" : aw === "run3" ? "run3" : player.run3Used ? "post" : player.isChampion ? "run4" : "run1"
    // POST : la comparaison veut un catalogue même sans run choisi → on prend le run 3 (dex complet) par défaut pour l'onglet Comparer.
    //   queryRun = run des DONNÉES passé à captureGuide (run 4 lit les pools run 1 + champion) ; displayRun = étiquette affichée.
    const queryRun = mode === "run2" ? 2 : mode === "run3" ? 3 : mode === "run4" ? 1 : mode === "post" ? (selectedRun ?? (tab === "compare" ? 3 : 1)) : 1
    const displayRun = mode === "run4" ? 4 : mode === "post" ? (selectedRun ?? queryRun) : queryRun
    const hideEndgame = queryRun === 1 && !player.isChampion
    const seenSet = useMemo(() => new Set([...dex.seen, ...dex.caught]), [dex.seen, dex.caught])
    const infoAllowed = (id: string) => mode !== "run2" || seenSet.has(id) || id === "ukognos"

    const rows = useMemo(() => {
        if (!open || (mode === "post" && selectedRun === null && tab !== "compare")) return [] as SpeciesData[]
        const real = (id: string) => { const sp = getSpecies(id); return sp && sp.dexNo < 500 ? sp : null } // exclut fusions (dexNo ≥ 500) et customs
        const caught = [...dex.caught], seen = [...dex.seen]
        let list: SpeciesData[]
        if (mode === "run1" || mode === "run4") {
            // Run 1 / Run Fusion : uniquement les Daemons DÉJÀ CROISÉS (anti-spoiler strict) + Goshendofy en teaser
            //   légendaire. En run 4 (Champion), captureGuide révèle en plus les zones endgame (hideEndgame=false).
            const ids = new Set<string>([...seenSet].filter((id) => real(id)))
            if (real("goshendofy")) ids.add("goshendofy")
            list = [...ids].map((id) => getSpecies(id)!).filter(Boolean)
        } else if (mode === "run2") {
            // Run 2 : dex tiéré run 1+2 (même masquage anti-spoiler que le Pokédex). Info gatée aux vus (infoAllowed).
            list = visibleDexSpecies(caught, player.isChampion, true, false, false, seen)
        } else if (mode === "run3") {
            list = visibleDexSpecies(caught, player.isChampion, false, true, false, seen)
        } else {
            // POST run 3 : catalogue 100% débloqué (dexFullUnlock) — la grille montre TOUT le dex, l'info est scopée au run choisi.
            list = visibleDexSpecies(caught, true, true, true, true, seen)
        }
        const uniq = new Set<string>()
        // ANTI-SPOILER : les LÉGENDAIRES ULTRA-SECRETS (MégamonarX/Galijah, obtention hors-normes) n'apparaissent JAMAIS
        //   dans le guide de capture tant qu'ils ne sont pas CAPTURÉS (sinon on spoile leur existence + méthode).
        list = list.filter((sp) => sp && sp.dexNo < 500 && !(DEX_ULTRA_SECRET.has(sp.id) && !caught.includes(sp.id)) && !uniq.has(sp.id) && uniq.add(sp.id))
        list.sort((a, b) => a.dexNo - b.dexNo)
        const needle = q.trim().toLowerCase()
        if (needle) list = list.filter((sp) => sp.name.toLowerCase().includes(needle))
        if (typeFilter) list = list.filter((sp) => sp.types.includes(typeFilter as SpeciesData["types"][number]))
        return list
    }, [open, mode, selectedRun, tab, queryRun, hideEndgame, q, typeFilter, seenSet, dex.caught, dex.seen, player.isChampion])

    if (!open) return null

    const pick = (sp: SpeciesData) => {
        setErr(null)
        if (!infoAllowed(sp.id)) { setErr("Le Daemomaniaque ne parle que des Daemons que tu as déjà croisés."); return }
        if (revealed.has(sp.id)) { setSel({ sp, guide: captureGuide(sp.id, queryRun, hideEndgame, player.isChampion, eclaireurBeaten) }); return }
        const r = consultDaemomaniaque()
        if (!r.ok) { setErr(`Pas assez d'énergie (${CONSULT_COST}⚡ requis pour une consultation).`); return }
        if (r.paid) setSpendFx((n) => n + 1) // consultation PAYANTE → on montre l'énergie qui part
        setRevealed((s) => new Set(s).add(sp.id))
        setSel({ sp, guide: captureGuide(sp.id, queryRun, hideEndgame, player.isChampion, eclaireurBeaten) })
    }

    const left = freeConsultsLeft()
    const allTypes = Object.keys(TYPE_COLOR)
    const runLabel = (r: number) => (r === 1 ? "Run 1" : r === 2 ? "Run 2" : r === 3 ? "Run 3" : "Run Fusion")
    const modeSub = mode === "post" ? (selectedRun ? `Infos ${runLabel(selectedRun)}` : "De quel run veux-tu parler ?")
        : mode === "run1" ? "Run 1 — Daemons déjà croisés" : mode === "run2" ? "Run 2 — run 1 + 2"
        : mode === "run4" ? "Run Fusion — ère post-Ligue (plaine, Grotte du Nexus…)" : "Run 3"

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.panel} onClick={(e) => e.stopPropagation()}>
                <style>{`
                    .daemo-spend { position: absolute; left: 50%; top: -3px; transform: translate(-50%, 4px);
                        color: #ff6b6b; font-weight: 700; font-size: 13px; white-space: nowrap; pointer-events: none;
                        text-shadow: 0 1px 3px rgba(0,0,0,.5); animation: daemoSpend 1s ease-out forwards; }
                    @keyframes daemoSpend { 0%{opacity:0; transform:translate(-50%,4px)} 15%{opacity:1} 100%{opacity:0; transform:translate(-50%,-24px)} }
                    @media (prefers-reduced-motion: reduce) { .daemo-spend { animation: daemoFade .9s ease-out forwards; } @keyframes daemoFade { 0%{opacity:1} 100%{opacity:0} } }
                `}</style>
                <div style={S.header}>
                    <img src="/yellow/sprites/npc/daemomaniaque.png" alt="" style={S.portrait} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div style={{ flex: 1 }}>
                        <div style={S.title}>👒 Le Daemomaniaque</div>
                        <div style={S.sub}>{modeSub} · {left > 0 ? `${left} gratuite${left > 1 ? "s" : ""}` : `${CONSULT_COST}⚡/consult`} · <span style={{ position: "relative", display: "inline-block" }}>⚡ {player.reps}{spendFx > 0 && <span key={spendFx} className="daemo-spend">−{CONSULT_COST}⚡</span>}</span></div>
                    </div>
                    <button style={S.close} onClick={close}>✕</button>
                </div>

                <div style={S.tabsRow}>
                    <button style={{ ...S.tabBtn, ...(tab === "guide" ? S.tabBtnOn : {}) }} onClick={() => setTab("guide")}>🗺️ Guide de capture</button>
                    <button style={{ ...S.tabBtn, ...(tab === "compare" ? S.tabBtnOn : {}) }} onClick={() => setTab("compare")}>⚖️ Comparer</button>
                </div>

                {tab === "compare" ? (
                    <DaemomaniaqueCompare rows={rows} tc={tc} />
                ) : mode === "post" && selectedRun === null ? (
                    // ── Sélecteur de run (post run 3) ──
                    <div style={{ ...S.scroll, textAlign: "center" }}>
                        <div style={{ ...S.line, fontStyle: "italic", marginBottom: 16 }}>« Tu as tout parcouru, voyageur. De quel run veux-tu que je te parle ? »</div>
                        {[1, 2, 3].map((r) => (
                            <button key={r} style={S.runBtn} onClick={() => { setSelectedRun(r); setErr(null) }}>🗺️ {runLabel(r)}</button>
                        ))}
                    </div>
                ) : sel ? (
                    // ── Fiche « où / quand / comment » ──
                    <div style={S.scroll}>
                        <button style={S.back} onClick={() => setSel(null)}>← Autre Daemon</button>
                        <div style={S.detailHead}>
                            <img src={sel.sp.sprite} alt={sel.sp.name} style={S.detailSprite} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                            <div>
                                <div style={S.detailName}>{sel.sp.name}</div>
                                <div style={S.chips}>{sel.sp.types.map((t) => <span key={t} style={{ ...S.chip, background: tc(t) }}>{t}</span>)}</div>
                            </div>
                        </div>
                        {sel.guide.where.length > 0 && (<>
                            <div style={S.section}>📍 OÙ &amp; QUAND ({runLabel(displayRun)})</div>
                            {sel.guide.where.map((w, i) => <div key={i} style={S.line}>{w}</div>)}
                        </>)}
                        {sel.guide.how.length > 0 && (<>
                            <div style={S.section}>🎯 COMMENT</div>
                            {sel.guide.how.map((h, i) => <div key={i} style={S.line}>• {h}</div>)}
                        </>)}
                        {sel.guide.note && <div style={S.note}>{sel.guide.note}</div>}
                    </div>
                ) : (
                    // ── Grille de sélection ──
                    <div style={S.scroll}>
                        {mode === "post" && <button style={{ ...S.back, marginBottom: 10 }} onClick={() => setSelectedRun(null)}>← Changer de run</button>}
                        <input style={S.search} placeholder="🔎 Chercher un Daemon…" value={q} onChange={(e) => setQ(e.target.value)} />
                        <div style={S.chipsRow}>
                            <button style={{ ...S.filterChip, ...(typeFilter === null ? S.filterOn : {}) }} onClick={() => setTypeFilter(null)}>TOUS</button>
                            {allTypes.map((t) => <button key={t} style={{ ...S.filterChip, borderColor: tc(t), ...(typeFilter === t ? { background: tc(t), color: "#161018" } : {}) }} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>{t}</button>)}
                        </div>
                        {err && <div style={S.err}>{err}</div>}
                        <div style={S.grid}>
                            {rows.map((sp) => {
                                const locked = !infoAllowed(sp.id)
                                return (
                                    <button key={sp.id} style={{ ...S.card, ...(locked ? S.cardLocked : {}) }} onClick={() => pick(sp)}>
                                        <img src={sp.sprite} alt={sp.name} style={{ ...S.cardSprite, ...(locked ? { filter: "grayscale(1) brightness(0.6)" } : {}) }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                                        <div style={S.cardName}>{locked ? "🔒 " : ""}{sp.name}</div>
                                        <div style={S.cardTypes}>{sp.types.map((t) => <span key={t} style={{ ...S.dot, background: tc(t) }} />)}</div>
                                    </button>
                                )
                            })}
                            {rows.length === 0 && <div style={S.muted}>Aucun Daemon à afficher{mode === "run1" || mode === "run4" ? " — croise-en d'abord dans les hautes herbes !" : "."}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, background: "rgba(6,9,16,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12, fontFamily: "system-ui,sans-serif" },
    panel: { width: "min(600px,97vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "radial-gradient(720px 340px at 50% -6%, #2a2440 0%, #171226 60%, #12101c 100%)", border: "1px solid #e0a020", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.5)", color: "#efe6ff" },
    header: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #3a3350" },
    portrait: { width: 46, height: 54, objectFit: "contain", imageRendering: "pixelated" },
    title: { fontSize: 17, fontWeight: 900, color: "#ffd76a" },
    sub: { fontSize: 12, color: "#b7a9cf", marginTop: 2 },
    close: { background: "#20293e", border: "1px solid #3a3350", color: "#c3cbdc", width: 34, height: 34, borderRadius: 9, cursor: "pointer", fontSize: 15 },
    tabsRow: { display: "flex", gap: 6, padding: "10px 16px 0" },
    tabBtn: { flex: 1, background: "rgba(30,22,48,0.6)", border: "1px solid #4a4468", borderRadius: 9, color: "#c9b8e8", fontSize: 12, fontWeight: 800, padding: "7px 8px", cursor: "pointer" },
    tabBtnOn: { background: "#e0a020", color: "#161018", borderColor: "#ffd76a" },
    scroll: { overflowY: "auto", padding: "12px 16px 16px" },
    search: { width: "100%", boxSizing: "border-box", background: "rgba(20,16,32,0.8)", border: "1px solid #6a5a8a", borderRadius: 9, color: "#f3ecff", fontSize: 14, padding: "9px 11px", marginBottom: 8 },
    chipsRow: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 },
    filterChip: { background: "rgba(30,22,48,0.6)", border: "1px solid #4a4468", borderRadius: 999, color: "#c9b8e8", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", cursor: "pointer" },
    filterOn: { background: "#e0a020", color: "#161018", borderColor: "#ffd76a" },
    runBtn: { display: "block", width: "100%", maxWidth: 260, margin: "0 auto 10px", background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 15, fontWeight: 900, padding: "12px", cursor: "pointer" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 },
    card: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.04)", border: "1px solid #3a3350", borderRadius: 10, padding: "8px 4px", cursor: "pointer", color: "#efe6ff" },
    cardLocked: { opacity: 0.55 },
    cardSprite: { width: 52, height: 52, objectFit: "contain", imageRendering: "pixelated" },
    cardName: { fontSize: 10.5, fontWeight: 700, textAlign: "center", lineHeight: 1.15 },
    cardTypes: { display: "flex", gap: 3 },
    dot: { width: 8, height: 8, borderRadius: 999, display: "block" },
    muted: { fontSize: 12.5, color: "#b7a9cf", padding: "20px 8px", textAlign: "center", gridColumn: "1/-1", lineHeight: 1.5 },
    err: { fontSize: 12.5, color: "#f3bcbc", background: "rgba(232,136,136,0.12)", border: "1px solid #e88", borderRadius: 8, padding: "8px 10px", marginBottom: 8 },
    back: { background: "transparent", border: "1px solid #6a5a8a", borderRadius: 8, color: "#c9b8e8", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: "pointer", marginBottom: 12 },
    detailHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
    detailSprite: { width: 80, height: 80, objectFit: "contain", imageRendering: "pixelated" },
    detailName: { fontSize: 20, fontWeight: 900, color: "#fff" },
    chips: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" },
    chip: { fontSize: 11, fontWeight: 800, color: "#161018", padding: "3px 11px", borderRadius: 999 },
    section: { fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.65, marginTop: 14, marginBottom: 6, textTransform: "uppercase" },
    line: { fontSize: 13, lineHeight: 1.5, marginBottom: 4, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px" },
    note: { fontSize: 12.5, fontStyle: "italic", color: "#e0b84a", marginTop: 12, lineHeight: 1.5 },
}
