"use client"

// Nexus Jaune Éclair — écran Pokédex CLIQUABLE. Lit le store Pokédex (seen/caught)
// + les espèces. Fiche détaillée : VU = infos partielles (type, rareté, lieu, lore) ;
// CAPTURÉ = tout (stats de base, rôle, évolution, learnset par niveau). Pur affichage.

import { useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { usePokedex, pokedexCompletion } from "@/lib/gamebook/yellow/store/pokedexStore"
import { usePlayer, useActiveWorld, galijahCountdown } from "@/lib/gamebook/yellow/store/playerStore"
import { galijahCounterStyle, megamonarxHint } from "../dex/dexShared"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { SPECIES, visibleDexSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { speciesZones } from "@/lib/gamebook/yellow/data/encounters"
import { AUTEL_VISITED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import { isFusionChampion } from "@/lib/gamebook/yellow/data/fusionLeague"
import { YELLOW_MAPS } from "@/lib/gamebook/yellow/maps"
import type { SpeciesData, StatKey } from "@/lib/gamebook/yellow/battle/types"

const RARITY: Record<string, { label: string; color: string }> = {
    COMMON: { label: "Commun", color: "#8a8a8a" },
    UNCOMMON: { label: "Peu commun", color: "#3f9a3f" },
    RARE: { label: "Rare", color: "#3a7ae0" },
    VERY_RARE: { label: "Très rare", color: "#a040d0" },
    BOSS: { label: "Boss", color: "#e04030" },
    LEGENDARY: { label: "Légendaire", color: "#e0a020" },
}
const STAT_LABELS: [StatKey, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

function DexIcon({ sp, seen, caught, big }: { sp: SpeciesData; seen: boolean; caught: boolean; big?: boolean }) {
    const [err, setErr] = useState(false)
    const sz = big ? 88 : 40
    return (
        <div style={{ ...S.icon, width: sz, height: sz, fontSize: big ? 36 : 20, filter: caught ? "none" : seen ? "grayscale(1) brightness(0.6)" : "brightness(0)" }}>
            {/* ULTRA-SECRET non vu : on montre l'OMBRE NOIRE du vrai sprite (silhouette, brightness(0) du div) — on devine
                qu'un gros truc existe sans pouvoir l'identifier. Les autres non-vus gardent un simple « ? ». */}
            {!seen
                ? (DEX_ULTRA_SECRET.has(sp.id) && !err
                    ? <img src={sp.sprite} alt="?" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
                    : "?")
                : err ? sp.name[0] : <img src={sp.sprite} alt={sp.name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

// Fiche détaillée (modale).
function DexDetail({ sp, caught, onClose }: { sp: SpeciesData; caught: boolean; onClose: () => void }) {
    const r = RARITY[sp.rarity ?? "COMMON"] ?? RARITY.COMMON
    const zones = speciesZones(sp.id).map((mid) => YELLOW_MAPS[mid]?.name ?? mid)
    const locText = zones.length ? zones.join(" · ") : "Obtenu par évolution ou événement"
    const bst = Object.values(sp.baseStats).reduce((a, b) => a + b, 0)
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.dHeader}>
                    <DexIcon sp={sp} seen caught={caught} big />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{sp.name.toUpperCase()}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            {sp.types.map((t) => <span key={t} style={S.typeChip}>{t}</span>)}
                            <span style={{ ...S.typeChip, background: r.color }}>{r.label}</span>
                        </div>
                    </div>
                </div>

                {/* Toujours visible : lieu + lore */}
                <div style={S.section}>📍 <b>Localisation</b> : {locText}</div>
                {sp.description && <div style={{ ...S.section, fontStyle: "italic", opacity: 0.85 }}>« {sp.description} »</div>}

                {!caught ? (
                    <div style={{ ...S.section, opacity: 0.6, textAlign: "center", padding: "14px 8px" }}>
                        👁 Seulement observé. <b>Capture-le</b> pour débloquer ses stats, son évolution et ses attaques.
                    </div>
                ) : (
                    <>
                        {/* Stats de base + rôle */}
                        <div style={S.section}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <b>📊 Stats de base</b>
                                <span style={{ opacity: 0.7 }}>Total {bst}{sp.role ? ` · ${sp.role}` : ""}</span>
                            </div>
                            {STAT_LABELS.map(([k, lbl]) => {
                                const v = sp.baseStats[k]
                                return (
                                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                        <span style={{ width: 30, fontSize: 11, fontWeight: 700 }}>{lbl}</span>
                                        <span style={{ width: 28, fontSize: 11, textAlign: "right" }}>{v}</span>
                                        <div style={S.barTrack}><div style={{ ...S.barFill, width: `${Math.min(100, (v / 140) * 100)}%`, background: v >= 100 ? "#e04030" : v >= 70 ? "#e0a020" : "#3f9a3f" }} /></div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Évolution */}
                        {sp.evolution && (() => {
                            const into = SPECIES[sp.evolution.toId]
                            const lvl = (sp.evolution.method as { level?: number }).level
                            return <div style={S.section}>🔼 <b>Évolution</b> : {into?.name ?? sp.evolution.toId}{lvl ? ` au N.${lvl}` : ""}</div>
                        })()}

                        {/* Learnset par niveau */}
                        <div style={S.section}>
                            <b>🎓 Attaques apprises</b>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: 11 }}>
                                <tbody>
                                    {[...sp.learnset].sort((a, b) => a.level - b.level).map((l, i) => {
                                        const mv = getMove(l.moveId)
                                        return (
                                            <tr key={i} style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                                                <td style={{ padding: "2px 4px", width: 42, opacity: 0.7 }}>N.{l.level}</td>
                                                <td style={{ padding: "2px 4px", fontWeight: 700 }}>{mv?.name ?? l.moveId}</td>
                                                <td style={{ padding: "2px 4px", textAlign: "right", opacity: 0.7 }}>{mv?.type}{mv && mv.power > 0 ? ` ${mv.power}` : ""}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <button style={S.closeBtn} onClick={onClose}>← Fermer</button>
            </div>
        </div>
    )
}

export default function PokedexClient() {
    const router = useRouter()
    const dex = usePokedex()
    const player = usePlayer()
    const aw = useActiveWorld() // hook réactif : re-render au changement de monde
    const isRun2 = aw === "ngplus", isRun3 = aw === "run3"
    const comp = pokedexCompletion(player.isChampion, isRun2, isRun3, player.run3Used)
    // 🐉🪨 MÉGAMONARX : indice à 2 paliers — atteint le Dôme (AUTEL_VISITED) → rumeur vague ; a GAGNÉ la Ligue de Fusion → indice « une fusion peut évoluer ».
    const reachedFusion = player.defeatedTrainers.includes(AUTEL_VISITED_MARKER)
    const wonFusion = isFusionChampion((m) => player.defeatedTrainers.includes(m))
    const [sel, setSel] = useState<SpeciesData | null>(null)
    // Hydrate la save si on arrive DIRECTEMENT ici (refresh / lien) sans avoir chargé le jeu :
    // sinon le store Pokédex en mémoire est vide → tout en "?". Idempotent (no-op si déjà chargé).
    useEffect(() => { void loadYellowSave() }, [])
    // Les run-2 restent INVISIBLES hors run 2 ; les créations post-Ligue INVISIBLES hors Champion — sauf en
    // run 2 où toute la roster étendue est révélée (le joueur est un ex-champion). Sinon pas même une case « ??? ».
    const entries = visibleDexSpecies(dex.caught, player.isChampion, isRun2, isRun3, player.run3Used, dex.seen).sort((a, b) => a.dexNo - b.dexNo)

    return (
        <div style={S.root}>
            <div style={S.header}>
                <button onClick={() => router.back()} style={S.back}>← Retour</button>
                <h1 style={S.title}>📷 POKÉDEX NEXUS</h1>
                <div style={S.compRow}>
                    <span style={S.compTxt}>{comp.caught}/{comp.total} capturés — {comp.pct}%{(() => {
                        // Sous-compteur « ce run » : seulement si le joueur a réellement plusieurs runs (cohérent avec
                        //   les libellés par entrée) — sinon, en mono-run, tout serait « ce run » sans intérêt.
                        const multiRun = player.ngplusUsed || player.run3Used
                        const nowCount = multiRun ? entries.filter((e) => (player.caughtThisRun ?? []).includes(e.id)).length : 0
                        return nowCount > 0 ? <span style={{ color: "#ffcf40" }}> · dont {nowCount} ce run ✨</span> : null
                    })()}</span>
                    <div style={S.compTrack}><div style={{ ...S.compFill, width: `${comp.pct}%` }} /></div>
                </div>
            </div>

            <div style={S.list}>
                {/* La distinction « ce run / run précédent » n'a de SENS que si le joueur a réellement lancé
                    un 2e/3e run. Pour un joueur MONO-RUN (run 1 seul), caughtThisRun peut être vide (captures
                    d'avant la feature) → on n'affiche PAS « (run précédent) » à tort, juste « ✔ Capturé ». */}
                {entries.map((sp) => {
                    const multiRun = player.ngplusUsed || player.run3Used
                    const caught = dex.caught.includes(sp.id)
                    // POST-RUN 3 (run3Used) : catalogue 100% RÉVÉLÉ — même les surprises hiddenUntilCaught
                    // (Gékroc/Goshendofy…) montrent leur identité. EXCEPTION : les légendaires ULTRA-SECRETS
                    // (MégamonarX/Galijah) restent « ??? » (silhouette noire) tant que non CAPTURÉS, même post-run 3.
                    const seen = caught || dex.seen.includes(sp.id) || (player.run3Used && !DEX_ULTRA_SECRET.has(sp.id))
                    const caughtNow = multiRun && caught && (player.caughtThisRun ?? []).includes(sp.id)
                    // Indice d'un ultra-secret non révélé : Galijah = décompte énigmatique ; MégamonarX = rumeur (2 paliers).
                    let secretHint: ReactNode = "Inconnu"
                    if (!seen) {
                        if (sp.id === "galijah") { const rem = galijahCountdown(dex.caught.length); secretHint = <span style={galijahCounterStyle(rem)}>{rem}</span> }
                        else if (sp.id === "megamonarx") secretHint = megamonarxHint(reachedFusion, wonFusion) ?? "Inconnu"
                    }
                    return (
                        <button
                            key={sp.id}
                            disabled={!seen}
                            onClick={() => seen && setSel(sp)}
                            style={{ ...S.card, opacity: seen ? 1 : 0.5, cursor: seen ? "pointer" : "default", textAlign: "left", ...(caughtNow ? { borderColor: "#ffcf40", boxShadow: "0 0 0 1px #ffcf40 inset" } : {}) }}
                        >
                            <div style={S.no}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                            <DexIcon sp={sp} seen={seen} caught={caught} />
                            <div style={S.body}>
                                <div style={S.name}>{seen ? sp.name.toUpperCase() : "???"}</div>
                                {seen
                                    ? <div style={S.types}>{sp.types.join(" / ")}</div>
                                    : DEX_ULTRA_SECRET.has(sp.id) ? <div style={S.types}>??? / ???</div> : null}
                                <div style={{ ...S.state, ...(caughtNow ? { color: "#ffcf40", fontWeight: 700 } : {}) }}>
                                    {caughtNow ? "✨ Capturé CE RUN — voir la fiche" : caught ? (multiRun ? "✔ Capturé (run précédent) — voir la fiche" : "✔ Capturé — voir la fiche") : seen ? "👁 Vu — fiche partielle" : secretHint}
                                </div>
                            </div>
                            <div style={{ ...S.tag, ...(caughtNow ? { color: "#ffcf40" } : {}) }}>{caughtNow ? "✨" : caught ? "✔" : seen ? "👁" : ""}{seen ? " ▸" : ""}</div>
                        </button>
                    )
                })}
            </div>

            {sel && <DexDetail sp={sel} caught={dex.caught.includes(sel.id)} onClose={() => setSel(null)} />}
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#1a1a1a", color: "#f8f8e8", fontFamily: "'Courier New', monospace", padding: 16 },
    header: { maxWidth: 560, margin: "0 auto 16px" },
    back: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "5px 12px", color: "#c8c8c8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: 900, letterSpacing: 2, marginBottom: 8 },
    compRow: { display: "flex", flexDirection: "column", gap: 4 },
    compTxt: { fontSize: 12, opacity: 0.85 },
    compTrack: { height: 8, background: "#404040", borderRadius: 4, overflow: "hidden", border: "1px solid #000" },
    compFill: { height: "100%", background: "#f5d020", transition: "width 0.4s" },
    list: { maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 },
    card: { display: "flex", alignItems: "center", gap: 12, background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 8, padding: "8px 12px", width: "100%", font: "inherit" },
    no: { fontSize: 10, fontWeight: 700, opacity: 0.6, width: 38 },
    icon: { borderRadius: "50%", background: "#fff", border: "2px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0, overflow: "hidden" },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 13, fontWeight: 900, letterSpacing: 1 },
    types: { fontSize: 9, fontWeight: 700, color: "#8868c0", marginTop: 1 },
    state: { fontSize: 9, opacity: 0.6, marginTop: 2, fontStyle: "italic" },
    tag: { fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
    // détail
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, zIndex: 100 },
    modal: { background: "#f4ecd4", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 10, width: "100%", maxWidth: 460, maxHeight: "88dvh", overflowY: "auto", padding: 14, fontFamily: "system-ui, sans-serif" },
    dHeader: { display: "flex", gap: 12, alignItems: "center", marginBottom: 8 },
    typeChip: { fontSize: 10, fontWeight: 800, color: "#fff", background: "#5a4a8a", borderRadius: 10, padding: "2px 8px" },
    section: { fontSize: 12.5, lineHeight: 1.4, padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.12)" },
    barTrack: { flex: 1, height: 9, background: "rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 4 },
    closeBtn: { width: "100%", marginTop: 10, padding: "9px 0", background: "#1c1408", color: "#f4ecd4", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" },
}
