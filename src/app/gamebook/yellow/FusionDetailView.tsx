"use client"

// FICHE DÉTAIL d'une fusion (Fusiodex → clic sur une carte). Plein écran : GRAND sprite (généré/officiel/placeholder),
// nom, types, BST, barres de stats, moveset et parents. Tout est recalculé depuis les 2 ESPÈCES parentes (module pur
// computeFusion) — donc « potentiel de base » ; au combat, les stats se recalculent sur tes vrais Daemons.

import { useState } from "react"
import { computeFusion, fusionSynergy, type FusionParent } from "@/lib/gamebook/yellow/data/fusionSpecies"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"
import { useFusionSprite } from "./useFusionSprite"
import { ChimeraPlaceholder } from "./ChimeraPlaceholder"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"
const STAT_ROWS = [["hp", "PV"], ["atk", "Attaque"], ["def", "Défense"], ["spe", "Vitesse"], ["spc", "Spéciale"]] as const

const parentFromSpecies = (sp: ReturnType<typeof getSpecies>): FusionParent => ({
    name: sp!.name, types: sp!.types, stats: sp!.baseStats, level: 1, moves: sp!.learnset.map((l) => l.moveId),
})

export function FusionDetailView({ aId, bId, onClose }: { aId: string; bId: string; onClose: () => void }) {
    const [err, setErr] = useState(false)
    const [parentFiche, setParentFiche] = useState<string | null>(null) // fiche d'un PARENT ouverte par-dessus
    const spA = getSpecies(aId), spB = getSpecies(bId)
    const { url: gen } = useFusionSprite(aId, bId) // hook AVANT tout return conditionnel
    if (!spA || !spB) return null

    const res = computeFusion(parentFromSpecies(spA), parentFromSpecies(spB))
    const synergy = fusionSynergy(aId, bId) // BONUS de synergie (clan / paire / inédite) → génétique boostée. null sinon.
    const official = officialFusionForParents(aId, bId)
    const name = official?.name ?? res.name
    const sprite = official?.sprite ?? gen ?? undefined
    const bst = STAT_ROWS.reduce((s, [k]) => s + (res.stats[k] ?? 0), 0)
    const ring = res.types[0] ? tc(res.types[0]) : "#6a5a8a"
    const CAP = 200

    return (
        <>
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <span style={S.no}>{official ? "✨ FUSION OFFICIELLE" : "🧬 CHIMÈRE"}</span>
                    <button style={S.close} onClick={onClose}>✕</button>
                </div>

                <div style={{ ...S.hero, boxShadow: `0 0 0 2px ${ring}55, 0 0 26px ${ring}55`, borderColor: ring }}>
                    {sprite && !err
                        ? <img src={sprite} alt={name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
                        : <ChimeraPlaceholder aSprite={spA.sprite} bSprite={spB.sprite} types={res.types} size={188} />}
                </div>

                <div style={S.name}>{name.toUpperCase()}</div>
                <div style={S.chips}>{res.types.map((t) => <span key={t} style={{ ...S.chip, background: tc(t) }}>{t}</span>)}</div>
                <div style={S.bst}>Total des stats : <b style={{ color: bst >= 500 ? "#f0c840" : "#d9b8ff" }}>{bst}</b></div>
                {synergy && <div style={S.bonusBadge}>✨ BONUS DE SYNERGIE — génétique boostée (stats renforcées) : {synergy.label}</div>}

                <div style={S.stats}>
                    {STAT_ROWS.map(([k, lbl]) => {
                        const v = res.stats[k] ?? 0
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

                <div style={S.section}>⚔️ ATTAQUES</div>
                <div style={S.moves}>{res.moves.map((id) => getMove(id)?.name ?? id).join(" · ")}</div>

                <div style={S.section}>🧬 PARENTS <span style={{ opacity: 0.5, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>— touche un nom pour sa fiche</span></div>
                <div style={S.parents}>
                    <button style={S.parentBtn} onClick={() => setParentFiche(aId)}>{spA.name} 📖</button>
                    <span style={{ opacity: 0.5, margin: "0 4px" }}>✦</span>
                    <button style={S.parentBtn} onClick={() => setParentFiche(bId)}>{spB.name} 📖</button>
                </div>

                <div style={S.note}>Potentiel de BASE (recette d'espèces). Au combat, les stats se recalculent sur tes vrais Daemons parents (niveau, EV/IV, Saiyan).</div>
                <button style={S.doneBtn} onClick={onClose}>← Retour</button>
            </div>
        </div>
        {parentFiche && <FusionSpeciesFiche speciesId={parentFiche} heading="🧬 PARENT" onClose={() => setParentFiche(null)} />}
        </>
    )
}

// FICHE d'une ESPÈCE-FUSION POSSÉDÉE (Dractriss/Voltriss/Draconvolt…) à son VRAI stade — lue depuis getSpecies
//   (baseStats + learnset COMPLET + évolution), PAS recalculée depuis les parents. Sert au Fusiodex « Mes fusions »
//   pour consulter la fiche de tes fusionnés, y compris les stades évolués.
export function FusionSpeciesFiche({ speciesId, onClose, heading }: { speciesId: string; onClose: () => void; heading?: string }) {
    const [err, setErr] = useState(false)
    const sp = getSpecies(speciesId)
    if (!sp) return null
    const bst = STAT_ROWS.reduce((s, [k]) => s + (sp.baseStats[k] ?? 0), 0)
    const ring = sp.types[0] ? tc(sp.types[0]) : "#6a5a8a"
    const CAP = 200
    const evoName = sp.evolution ? (getSpecies(sp.evolution.toId)?.name ?? null) : null
    const evoLevel = sp.evolution && sp.evolution.method.kind === "LEVEL" ? sp.evolution.method.level : null
    // AUTOMATISATION : si le sprite déclaré est encore le placeholder, on TENTE la convention /dex/<id>.png →
    //   déposer une planche nommée <id>.png suffit à l'afficher (onError → 🧬 si absente). Zéro câblage code requis.
    const spriteSrc = sp.sprite && !sp.sprite.includes("missingno") ? sp.sprite : `/yellow/sprites/dex/${sp.id}.png`
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <span style={S.no}>{heading ?? "🐉 FUSION"} · N°{String(sp.dexNo).padStart(3, "0")}</span>
                    <button style={S.close} onClick={onClose}>✕</button>
                </div>
                <div style={{ ...S.hero, boxShadow: `0 0 0 2px ${ring}55, 0 0 26px ${ring}55`, borderColor: ring }}>
                    {!err
                        ? <img src={spriteSrc} alt={sp.name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
                        : <span style={{ fontSize: 92 }}>🧬</span>}
                </div>
                <div style={S.name}>{sp.name.toUpperCase()}</div>
                <div style={S.chips}>{sp.types.map((t) => <span key={t} style={{ ...S.chip, background: tc(t) }}>{t}</span>)}</div>
                <div style={S.bst}>Total des stats : <b style={{ color: bst >= 500 ? "#f0c840" : "#d9b8ff" }}>{bst}</b></div>
                <div style={S.stats}>
                    {STAT_ROWS.map(([k, lbl]) => {
                        const v = sp.baseStats[k] ?? 0
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
                {evoName && <div style={S.evo}>🧬 Évolue en <b>{evoName}</b>{evoLevel ? ` au niveau ${evoLevel}` : ""}.</div>}
                <div style={S.section}>⚔️ CAPACITÉS APPRISES</div>
                <div style={S.learn}>
                    {sp.learnset.map((l, i) => (
                        <div key={`${l.level}-${l.moveId}-${i}`} style={S.learnRow}>
                            <span style={S.learnLvl}>Niv {l.level}</span>
                            <span>{getMove(l.moveId)?.name ?? l.moveId}</span>
                        </div>
                    ))}
                </div>
                <div style={S.note}>Stats de BASE de l'espèce. Au combat, elles se recalculent sur ton Daemon (niveau, EV/IV, Saiyan).</div>
                <button style={S.doneBtn} onClick={onClose}>← Retour</button>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.93)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "14px 10px", fontFamily: "'Courier New', monospace" },
    sheet: { width: "100%", maxWidth: 440, background: "radial-gradient(700px 360px at 50% -6%, #2a1c50 0%, #170f28 55%, #0f0b18 100%)", border: "2px solid #6a5a8a", borderRadius: 16, padding: "12px 16px 18px", color: "#f3ecff", boxShadow: "0 12px 44px rgba(0,0,0,0.5)" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    no: { fontSize: 11, fontWeight: 800, opacity: 0.6, letterSpacing: 1 },
    close: { background: "rgba(30,22,48,0.7)", border: "1px solid #6a5a8a", borderRadius: 8, color: "#c9b8e8", fontSize: 14, cursor: "pointer", padding: "2px 10px" },
    hero: { width: 200, height: 200, margin: "2px auto 10px", borderRadius: 18, border: "2px solid #6a5a8a", background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    name: { fontSize: 20, fontWeight: 900, letterSpacing: 1, textAlign: "center", color: "#fff", textShadow: "0 0 12px #9a5aff55" },
    chips: { display: "flex", gap: 6, justifyContent: "center", marginTop: 7, flexWrap: "wrap" },
    chip: { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "#161018", padding: "3px 12px", borderRadius: 999, textShadow: "0 1px 0 rgba(255,255,255,0.25)" },
    bst: { textAlign: "center", fontSize: 12.5, marginTop: 8, opacity: 0.95 },
    bonusBadge: { textAlign: "center", fontSize: 11, fontWeight: 800, marginTop: 8, padding: "6px 10px", borderRadius: 9, color: "#3a2a06", background: "linear-gradient(180deg,#ffe08a,#f0c033)", boxShadow: "0 0 14px #f0c84066", letterSpacing: 0.3 },
    stats: { marginTop: 10, display: "flex", flexDirection: "column", gap: 5 },
    statLine: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 },
    statLbl: { width: 62, opacity: 0.8, fontWeight: 700 },
    statVal: { width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" },
    statTrack: { flex: 1, height: 8, background: "#120f1c", borderRadius: 5, overflow: "hidden" },
    statFill: { display: "block", height: "100%", borderRadius: 5 },
    section: { fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, opacity: 0.6, marginTop: 13, textTransform: "uppercase" },
    moves: { fontSize: 12.5, lineHeight: 1.5, marginTop: 4, background: "rgba(36,29,56,0.55)", borderRadius: 8, padding: "8px 11px" },
    parents: { fontSize: 13, marginTop: 4, fontWeight: 700, display: "flex", alignItems: "center", flexWrap: "wrap" },
    parentBtn: { background: "rgba(36,29,56,0.55)", border: "1px solid #6a5a8a", borderRadius: 8, color: "#e8dcff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "5px 10px", cursor: "pointer" },
    note: { fontSize: 10.5, opacity: 0.65, fontStyle: "italic", lineHeight: 1.45, marginTop: 12 },
    doneBtn: { width: "100%", marginTop: 12, background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", border: "1px solid #c79cff", borderRadius: 10, color: "#fff", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 800, padding: "9px", cursor: "pointer" },
    evo: { textAlign: "center", fontSize: 11.5, marginTop: 10, padding: "6px 10px", borderRadius: 9, background: "rgba(36,29,56,0.55)", border: "1px solid #4a3a6a" },
    learn: { marginTop: 4, background: "rgba(36,29,56,0.55)", borderRadius: 8, padding: "6px 11px", maxHeight: 230, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 },
    learnRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    learnLvl: { opacity: 0.55, fontVariantNumeric: "tabular-nums" },
}
