"use client"

// Nexus Jaune Éclair — écran FUSIODEX. Trois pages : ① règles exhaustives de la fusion, ② fusions OFFICIELLES
// aperçues (à sprite), ③ fusions que le joueur a CRÉÉES (roster d'Autel). Débloqué à la 1re arrivée au Dôme
// Fusion (marker autel_visited). ⚠️ ANTI-SPOILER : gate stricte + une officielle NON aperçue ne révèle RIEN.

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { buildFusion } from "@/lib/gamebook/yellow/data/fusionMon"
import { officialFusions, officialFusionProgress, FUSION_RULES, AUTEL_VISITED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import type { StatKey } from "@/lib/gamebook/yellow/battle/types"

type Tab = "rules" | "official" | "mine"
const STAT_LABELS: [StatKey, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

interface CreatedFusion { name: string; types: string[]; bst: number; stats: Record<StatKey, number>; parents: [string, string]; sprite?: string }

function FusionSprite({ src, size = 56 }: { src?: string; size?: number }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ ...S.icon, width: size, height: size, fontSize: size * 0.5 }}>
            {!src || err ? "🧬" : <img src={src} alt="" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

export default function FusiodexClient() {
    const router = useRouter()
    const player = usePlayer()
    const dex = usePokedex()
    const [tab, setTab] = useState<Tab>("rules")
    // Hydrate la save si on arrive DIRECTEMENT ici (refresh / lien). Idempotent.
    useEffect(() => { void loadYellowSave() }, [])

    const unlocked = player.defeatedTrainers.includes(AUTEL_VISITED_MARKER)
    const official = officialFusions(dex.seen)
    const prog = officialFusionProgress(dex.seen)

    // MES FUSIONS : résout le roster d'Autel (paires de Daemons) en chimères affichables (mêmes helpers que l'Atelier).
    const created = useMemo<CreatedFusion[]>(() => {
        const all = [...player.team, ...player.pc]
        const byU = (uid: string) => all.find((m) => m.uid === uid)
        return player.fusionRoster
            .map((p): CreatedFusion | null => {
                const a = byU(p.a), b = byU(p.b)
                if (!a || !b || a.uid === b.uid) return null
                const f = buildFusion(a, b)
                const sp = getSpecies(f.speciesId)
                if (!sp) return null
                const bst = Object.values(sp.baseStats).reduce((x, y) => x + y, 0)
                return {
                    name: sp.name, types: sp.types, bst, stats: sp.baseStats, sprite: sp.sprite,
                    parents: [getSpecies(a.speciesId)?.name ?? a.speciesId, getSpecies(b.speciesId)?.name ?? b.speciesId],
                }
            })
            .filter((x): x is CreatedFusion => x !== null)
    }, [player.fusionRoster, player.team, player.pc])

    return (
        <div style={S.root}>
            <div style={S.header}>
                <button onClick={() => router.back()} style={S.back}>← Retour</button>
                <h1 style={S.title}>🧬 FUSIODEX</h1>
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
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>FUSIODEX VERROUILLÉ</div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>Le savoir de la fusion ne se révèle qu'au DÔME DE LA FUSION. Rends-toi à l'Autel de la Chimère, et le Dieu Spaghetti t'ouvrira ces pages.</div>
                </div>
            ) : tab === "rules" ? (
                <div style={S.list}>
                    {FUSION_RULES.map((line, i) => (
                        <div key={i} style={i === 0 ? S.rulesTitle : S.rulesLine}>{line}</div>
                    ))}
                </div>
            ) : tab === "official" ? (
                <div style={S.list}>
                    <div style={S.hint}>Les chimères « stabilisées » que tu peux croiser dans la nature. Une entrée reste masquée tant que tu ne l'as pas APERÇUE.</div>
                    {official.map((f) => (
                        <div key={f.id} style={{ ...S.card, opacity: f.seen ? 1 : 0.55 }}>
                            <div style={S.no}>N°{String(f.dexNo).padStart(3, "0")}</div>
                            {f.seen ? <FusionSprite src={f.sprite} /> : <div style={{ ...S.icon, width: 56, height: 56, fontSize: 28 }}>?</div>}
                            <div style={S.body}>
                                <div style={S.name}>{f.seen ? f.name.toUpperCase() : "???"}</div>
                                {f.seen ? <div style={S.types}>{f.types.join(" / ")}</div> : <div style={S.types}>Chimère non observée</div>}
                                {f.seen && f.description && <div style={S.desc}>« {f.description} »</div>}
                                {!f.seen && <div style={S.desc}>Croise-la dans la Grotte du Nexus pour révéler son identité.</div>}
                            </div>
                            <div style={S.tag}>{f.seen ? "👁" : "🔒"}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={S.list}>
                    <div style={S.hint}>Les chimères que TU as assemblées sur l'Autel. Modifie ton roster au 💻 de l'Autel de la Chimère.</div>
                    {created.length === 0 ? (
                        <div style={S.locked}>
                            <div style={{ fontSize: 34, marginBottom: 8 }}>🛠️</div>
                            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>Tu n'as pas encore assemblé de fusion. Dépose deux Daemons sur l'Autel de la Chimère pour créer ta première chimère de combat !</div>
                        </div>
                    ) : created.map((f, i) => (
                        <div key={i} style={S.card}>
                            <FusionSprite src={f.sprite} />
                            <div style={S.body}>
                                <div style={S.name}>{f.name.toUpperCase()}</div>
                                <div style={S.types}>{f.types.join(" / ")} · Total {f.bst}</div>
                                <div style={S.desc}>{f.parents[0]} × {f.parents[1]}</div>
                                <div style={S.statRow}>
                                    {STAT_LABELS.map(([k, lbl]) => (
                                        <span key={k} style={S.statChip}><b>{lbl}</b> {f.stats[k]}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#161320", color: "#f3ecff", fontFamily: "'Courier New', monospace", padding: 16 },
    header: { maxWidth: 560, margin: "0 auto 14px" },
    back: { background: "transparent", border: "1px solid #6a5a8a", borderRadius: 6, padding: "5px 12px", color: "#c9b8e8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: 900, letterSpacing: 2, marginBottom: 10, color: "#d9b8ff" },
    tabs: { display: "flex", gap: 6, flexWrap: "wrap" },
    tab: { flex: 1, minWidth: 96, background: "#241d38", border: "1px solid #4a3a6a", borderRadius: 7, padding: "7px 6px", color: "#b8a8d8", fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer" },
    tabOn: { background: "#7a4ad0", borderColor: "#b98aff", color: "#fff" },
    badge: { display: "inline-block", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "0 6px", marginLeft: 3, fontSize: 10 },
    list: { maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 },
    hint: { fontSize: 11, opacity: 0.7, fontStyle: "italic", lineHeight: 1.4, padding: "0 2px 4px" },
    locked: { maxWidth: 460, margin: "40px auto", textAlign: "center", background: "#201a30", border: "2px solid #4a3a6a", borderRadius: 12, padding: "28px 20px" },
    rulesTitle: { fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "#d9b8ff", textAlign: "center", padding: "6px 0 10px" },
    rulesLine: { fontSize: 12.5, lineHeight: 1.5, background: "#201a30", border: "1px solid #3a2e56", borderRadius: 8, padding: "10px 12px" },
    card: { display: "flex", alignItems: "center", gap: 12, background: "#241d38", border: "2px solid #4a3a6a", borderRadius: 8, padding: "8px 12px", width: "100%" },
    no: { fontSize: 10, fontWeight: 700, opacity: 0.6, width: 38 },
    icon: { borderRadius: "50%", background: "#120f1c", border: "2px solid #6a5a8a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0, overflow: "hidden", color: "#b8a8d8" },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 13, fontWeight: 900, letterSpacing: 1, color: "#f3ecff" },
    types: { fontSize: 10, fontWeight: 700, color: "#c79cff", marginTop: 1 },
    desc: { fontSize: 10, opacity: 0.7, marginTop: 2, fontStyle: "italic" },
    statRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 },
    statChip: { fontSize: 10, background: "rgba(0,0,0,0.28)", borderRadius: 6, padding: "1px 6px" },
    tag: { fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" },
}
