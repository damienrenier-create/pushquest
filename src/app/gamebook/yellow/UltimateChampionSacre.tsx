"use client"

// SACRE ULTIME — la plus grosse célébration du jeu, jouée UNE fois quand le joueur bat son REFLET ARGENT dans la
// Ligue de Fusion OR : il devient CHAMPION SUPRÊME DU NEXUS. 5 ACTES, 100 % CSS (aucune dépendance/audio) :
//   Acte 0 — L'ASCENSION           : noir → explosion dorée + FEUX D'ARTIFICE, le titre se compose.
//   Acte 1 — LE DÉFILÉ DES CHAMPIONS: chaque Daemon vainqueur défile (sprite, stats animées, meilleur coup).
//   Acte 2 — LE PALMARÈS           : compteurs animés de tout le parcours (temps, victoires, captures, badges…).
//   Acte 3 — LES REMERCIEMENTS     : mot du Dieu Spaghetti + générique.
//   Acte 4 — L'APPEL ULTIME        : les dernières side-quests + CTA (nouvelle boucle / continuer).
// Auto-défilement chronométré ; clic/touche = avancer ; « Passer ⏭ » = sauter à l'appel ultime.
// Le roster est FIGÉ (espèces de fusion éphémères) → on n'appelle jamais getSpecies : tout vient des props.

import { useEffect, useState } from "react"
import type { EpilogueQuest } from "@/lib/gamebook/yellow/data/fusionEpilogue"

export interface SacreRosterMon {
    name: string; sprite: string; types: string[]; level: number; bst: number
    stats: { hp: number; atk: number; def: number; spe: number; spc: number }
    moves: string[]
}
export interface SacrePalmares {
    playtime: string; battles: number; wins: number; captures: number; dexCount: number
    badges: number; dome: number; shiny: number; xpTotal: number; energySpent: number
    tiersLabel: string; signatureMove?: string; favDaemon?: string
}

const LAST_ACT = 4
const ACT_DURATIONS = [5200, 0, 8200, 9000] // acte 1 (défilé) = self-paced ; acte 4 = attend le joueur
const PARADE_PER_MON = 3600
const STAT_BAR_MAX = 360
const STAT_ROWS: { key: keyof SacreRosterMon["stats"]; label: string; color: string }[] = [
    { key: "hp", label: "PV", color: "#7ee081" }, { key: "atk", label: "ATQ", color: "#ff9f6b" },
    { key: "def", label: "DÉF", color: "#7ec8ff" }, { key: "spe", label: "VIT", color: "#ffd54a" },
    { key: "spc", label: "SPÉ", color: "#d79bff" },
]
const FW_COLORS = ["#ffd54a", "#ff7eb6", "#7ee0ff", "#9affa0", "#ffffff", "#ffb347"]

/** Compteur qui s'incrémente de 0 à `value` (ease-out) quand `run` passe à true. */
function Counter({ value, run, duration = 1300 }: { value: number; run: boolean; duration?: number }) {
    const [n, setN] = useState(0)
    useEffect(() => {
        if (!run) { setN(0); return }
        let raf = 0, start = 0
        const tick = (t: number) => {
            if (!start) start = t
            const p = Math.min(1, (t - start) / duration)
            setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
            if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [value, run, duration])
    return <>{n.toLocaleString("fr-FR")}</>
}

export default function UltimateChampionSacre({ roster, palmares, quests, onClose, onRecreate }: {
    roster: SacreRosterMon[]; palmares: SacrePalmares; quests: EpilogueQuest[]
    onClose: () => void; onRecreate: () => void
}) {
    const [act, setAct] = useState(0)
    const [parade, setParade] = useState(0)
    const [fwOn, setFwOn] = useState(true) // FEUX D'ARTIFICE : ~10 s puis extinction (assez pour la fête, pas de boucle infinie)
    useEffect(() => { const t = setTimeout(() => setFwOn(false), 10000); return () => clearTimeout(t) }, [])

    // FEUX D'ARTIFICE : 7 salves, chacune un anneau de 16 particules radiant depuis une origine aléatoire, en boucle.
    const [fireworks] = useState(() =>
        Array.from({ length: 7 }, () => {
            const cx = 12 + Math.random() * 76, cy = 12 + Math.random() * 46
            const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)]
            const delay = Math.random() * 2.6, radius = 60 + Math.random() * 70
            return {
                cx, cy, color, delay,
                parts: Array.from({ length: 16 }, (_, k) => {
                    const a = (k / 16) * Math.PI * 2
                    return { dx: Math.cos(a) * radius, dy: Math.sin(a) * radius }
                }),
            }
        }),
    )

    // Auto-avance d'acte (le défilé se gère seul ; l'appel ultime attend le joueur).
    useEffect(() => {
        if (act >= LAST_ACT || act === 1) return
        const t = setTimeout(() => setAct((a) => a + 1), ACT_DURATIONS[act])
        return () => clearTimeout(t)
    }, [act])

    // DÉFILÉ (acte 1) : un Daemon à la fois, puis on enchaîne.
    useEffect(() => {
        if (act !== 1) return
        if (roster.length === 0) { setAct(2); return }
        const t = setTimeout(() => setParade((p) => { if (p >= roster.length - 1) { setAct(2); return p } return p + 1 }), PARADE_PER_MON)
        return () => clearTimeout(t)
    }, [act, parade, roster.length])

    const advance = () => {
        if (act >= LAST_ACT) return
        if (act === 1 && parade < roster.length - 1) { setParade((p) => p + 1); return }
        setAct((a) => a + 1)
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase()
            if (!["enter", " ", "a", "arrowright"].includes(k)) return
            e.preventDefault(); advance()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [act, parade, roster.length])

    const cur = roster[parade]
    const bestMove = cur?.moves[0] // le 1er slot = souvent la signature (learnset ordonné)
    const remaining = quests.filter((q) => !q.done)

    return (
        <div style={overlay} onClick={advance}>
            <style>{KEYFRAMES}</style>

            {/* FEUX D'ARTIFICE — ~10 s en fond de TOUS les actes, puis extinction (fwOn). */}
            {fwOn && (
                <div style={fwLayer} aria-hidden>
                    {fireworks.map((fw, i) => (
                        <div key={i} style={{ position: "absolute", left: `${fw.cx}%`, top: `${fw.cy}%` }}>
                            {fw.parts.map((p, k) => (
                                <span key={k} style={{
                                    position: "absolute", width: 6, height: 6, borderRadius: "50%", background: fw.color,
                                    boxShadow: `0 0 8px ${fw.color}`,
                                    ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`,
                                    animation: `fw 1.5s ease-out ${fw.delay}s infinite`,
                                }} />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== ACTE 0 — L'ASCENSION ===== */}
            {act === 0 && (
                <div style={center}>
                    <div style={{ fontSize: 40, letterSpacing: 6, color: "#ffe36b", animation: "titleIn .8s ease .2s both", textShadow: "0 0 20px #ffd54a" }} aria-hidden>✦ ✦ ✦</div>
                    <div style={{ fontSize: 92, lineHeight: 1, animation: "crownBurst 1.4s cubic-bezier(.2,1.4,.35,1) both", filter: "drop-shadow(0 0 34px #ffd54a)" }}>👑</div>
                    <h1 style={{ ...bigTitle, animation: "titleIn 1s ease .9s both" }}>CHAMPION SUPRÊME<br />DU NEXUS</h1>
                    <p style={{ ...sub, animation: "titleIn 1s ease 1.9s both" }}>Tu as vaincu ton propre reflet. Il ne reste plus… que la légende.</p>
                </div>
            )}

            {/* ===== ACTE 1 — LE DÉFILÉ DES CHAMPIONS ===== */}
            {act === 1 && cur && (
                <div style={center}>
                    <div style={sectionTitle}>⚔️ LE DÉFILÉ DES CHAMPIONS</div>
                    <div key={parade} style={{ ...paradeCard, animation: "paradeIn .55s cubic-bezier(.17,.67,.33,1.2) both" }}>
                        <div style={paradeHead}>
                            {cur.sprite ? <img src={cur.sprite} alt={cur.name} style={paradeImg} /> : <div style={{ fontSize: 54 }}>❓</div>}
                            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                <div style={paradeName}>{cur.name}</div>
                                <div style={paradeLvl}>Niveau {cur.level} · BST {cur.bst}</div>
                                <div style={paradeTypes}>{cur.types.join(" · ")}</div>
                            </div>
                        </div>
                        <div style={statsGrid}>
                            {STAT_ROWS.map((r) => (
                                <div key={r.key} style={statRow}>
                                    <span style={statLabel}>{r.label}</span>
                                    <span style={statVal}>{cur.stats[r.key]}</span>
                                    <span style={statBarBg}><span style={{ ...statBarFill, width: `${Math.min(100, (cur.stats[r.key] / STAT_BAR_MAX) * 100)}%`, background: r.color }} /></span>
                                </div>
                            ))}
                        </div>
                        <div style={movesWrap}>
                            {cur.moves.map((mv, i) => (
                                <span key={i} style={mv === bestMove ? moveChipBest : moveChip}>{mv === bestMove ? "★ " : ""}{mv}</span>
                            ))}
                        </div>
                    </div>
                    <div style={dotsRow} aria-hidden>{roster.map((_, i) => <span key={i} style={{ ...dot, ...(i === parade ? dotActive : null) }} />)}</div>
                </div>
            )}

            {/* ===== ACTE 2 — LE PALMARÈS ===== */}
            {act === 2 && (
                <div style={{ ...center, animation: "fadeIn .6s ease both" }}>
                    <div style={sectionTitle}>📜 TON PALMARÈS</div>
                    <div style={palmGrid}>
                        <Tile label="Temps de jeu" value={palmares.playtime} />
                        <Tile label="Victoires" value={<><Counter value={palmares.wins} run={act === 2} /> <span style={dim}>/ {palmares.battles.toLocaleString("fr-FR")}</span></>} />
                        <Tile label="Daemons capturés" value={<Counter value={palmares.captures} run={act === 2} />} />
                        <Tile label="Pokédex" value={<><Counter value={palmares.dexCount} run={act === 2} /> <span style={dim}>esp.</span></>} />
                        <Tile label="Badges d'arène" value={<>{palmares.badges} <span style={dim}>/ 5</span></>} />
                        <Tile label="Titres du Dôme" value={`${palmares.dome} 🏆`} />
                        <Tile label="Shinies ✨" value={<Counter value={palmares.shiny} run={act === 2} />} />
                        <Tile label="XP cumulée" value={<Counter value={palmares.xpTotal} run={act === 2} duration={1700} />} />
                        <Tile label="Énergie dépensée ⚡" value={<Counter value={palmares.energySpent} run={act === 2} duration={1700} />} />
                        <Tile label="Ligue de Fusion" value={palmares.tiersLabel} />
                    </div>
                    {(palmares.signatureMove || palmares.favDaemon) && (
                        <div style={sigRow}>
                            {palmares.signatureMove && <span style={sigChip}>Coup fétiche : <b>{palmares.signatureMove}</b></span>}
                            {palmares.favDaemon && <span style={sigChip}>Daemon fétiche : <b>{palmares.favDaemon}</b></span>}
                        </div>
                    )}
                </div>
            )}

            {/* ===== ACTE 3 — LES REMERCIEMENTS ===== */}
            {act === 3 && (
                <div style={{ ...center, animation: "fadeIn .8s ease both" }}>
                    <div style={{ fontSize: 46, marginBottom: 10, filter: "drop-shadow(0 0 18px #ffd54a)" }}>🍝👑✦</div>
                    <div style={{ ...sectionTitle, color: "#ffe36b" }}>UN MOT DU DIEU SPAGHETTI</div>
                    <p style={{ fontSize: 15, lineHeight: 1.65, maxWidth: 360, color: "#fff" }}>
                        « Mortel… tu as gravé ton nom au firmament du Nexus. Aucun dresseur n'était allé si loin.<br /><br />
                        <span style={{ color: "#ffd54a" }}>De la première pompe à ce sacre ultime</span>, chaque combat, chaque capture, chaque fusion t'ont mené ici.<br /><br />
                        Le Nexus tout entier s'incline. <b>Merci d'avoir tout donné.</b> ✦ »
                    </p>
                    <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85, lineHeight: 1.7 }}>
                        — NEXUS JAUNE ÉCLAIR —<br />Conçu, codé &amp; rêvé par <b style={{ color: "#ffd54a" }}>DamRen</b> 💛⚡
                    </div>
                </div>
            )}

            {/* ===== ACTE 4 — L'APPEL ULTIME ===== */}
            {act === 4 && (
                <div style={{ ...center, justifyContent: "flex-start", paddingTop: 26, animation: "fadeIn .7s ease both", overflowY: "auto" }}>
                    <h2 style={{ ...bigTitle, fontSize: 22 }}>✦ L'APPEL ULTIME ✦</h2>
                    <p style={{ fontSize: 12.5, opacity: 0.9, maxWidth: 360, marginTop: 4 }}>
                        Champion suprême… mais le Nexus garde encore des secrets. Voici ce qu'il te reste à accomplir :
                    </p>
                    <div style={questList}>
                        {(remaining.length ? remaining : quests).slice(0, 6).map((q, i) => (
                            <div key={i} style={{ ...questRow, ...(q.done ? questDone : null) }}>
                                <span style={{ fontSize: 16 }}>{q.done ? "✅" : q.icon}</span>
                                <div style={{ textAlign: "left", flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: q.done ? "#9affa0" : "#ffe36b" }}>{q.label}</div>
                                    {!q.done && <div style={{ fontSize: 10.5, opacity: 0.72, lineHeight: 1.4, marginTop: 2 }}>{q.hint}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={btnPrimary} onClick={(e) => { e.stopPropagation(); onRecreate() }}>🔁 Forger une nouvelle légende</button>
                    <button style={btnGhost} onClick={(e) => { e.stopPropagation(); onClose() }}>Poursuivre l'aventure ▶</button>
                </div>
            )}

            {act < LAST_ACT && <button style={skipBtn} onClick={(e) => { e.stopPropagation(); setAct(LAST_ACT) }}>Passer ⏭</button>}
        </div>
    )
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={tile}>
            <div style={tileVal}>{value}</div>
            <div style={tileLabel}>{label}</div>
        </div>
    )
}

const KEYFRAMES = `
@keyframes crownBurst { 0% { transform: scale(0) rotate(-30deg); opacity: 0 } 60% { transform: scale(1.25) rotate(6deg) } 100% { transform: scale(1) rotate(0); opacity: 1 } }
@keyframes titleIn { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes paradeIn { from { transform: translateX(36px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes fw { 0% { transform: translate(0,0) scale(1.2); opacity: 1 } 80% { opacity: .9 } 100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0 } }
`

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9650, display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 50% 28%, #33265a, #0a0812 74%)", overflow: "hidden", cursor: "pointer",
    fontFamily: "'Courier New', monospace",
}
const center: React.CSSProperties = {
    position: "relative", width: "min(470px, 96vw)", height: "min(600px, 94vh)", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", padding: 16,
}
const bigTitle: React.CSSProperties = { margin: "12px 0 6px", fontSize: 30, fontWeight: 900, color: "#ffd54a", letterSpacing: 1.5, lineHeight: 1.15, textShadow: "0 2px 0 #7a5c00, 0 0 26px rgba(255,213,74,.6)" }
const sub: React.CSSProperties = { margin: 0, fontSize: 12.5, opacity: 0.9, maxWidth: 330 }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#ffd54a", margin: "8px 0 10px", letterSpacing: 0.8 }
const dim: React.CSSProperties = { opacity: 0.6, fontSize: "0.8em", fontWeight: 400 }
const fwLayer: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" }

const paradeCard: React.CSSProperties = { width: "min(390px, 92vw)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,213,74,0.32)", borderRadius: 14, padding: 14, boxShadow: "0 0 30px rgba(255,213,74,.2)" }
const paradeHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }
const paradeImg: React.CSSProperties = { width: 100, height: 100, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 4px 12px rgba(0,0,0,.55))" }
const paradeName: React.CSSProperties = { fontSize: 19, fontWeight: 900, color: "#ffd54a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const paradeLvl: React.CSSProperties = { fontSize: 12, marginTop: 3, opacity: 0.9 }
const paradeTypes: React.CSSProperties = { fontSize: 11, opacity: 0.8, marginTop: 3, letterSpacing: 0.5 }
const statsGrid: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }
const statRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 }
const statLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, width: 28, textAlign: "left", opacity: 0.8 }
const statVal: React.CSSProperties = { fontSize: 11, fontWeight: 700, width: 30, textAlign: "right" }
const statBarBg: React.CSSProperties = { flex: 1, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }
const statBarFill: React.CSSProperties = { display: "block", height: "100%", borderRadius: 4, transition: "width .5s ease" }
const movesWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }
const moveChip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "4px 8px", background: "rgba(126,224,255,0.14)", border: "1px solid rgba(126,224,255,0.3)", borderRadius: 999 }
const moveChipBest: React.CSSProperties = { ...moveChip, background: "rgba(255,213,74,0.18)", border: "1px solid rgba(255,213,74,0.5)", color: "#ffe36b" }
const dotsRow: React.CSSProperties = { display: "flex", gap: 6, marginTop: 14 }
const dot: React.CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }
const dotActive: React.CSSProperties = { background: "#ffd54a", boxShadow: "0 0 8px #ffd54a" }

const palmGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "min(400px, 94vw)" }
const tile: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,213,74,0.22)", borderRadius: 10, padding: "9px 10px", textAlign: "center" }
const tileVal: React.CSSProperties = { fontSize: 18, fontWeight: 900, color: "#ffd54a", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }
const tileLabel: React.CSSProperties = { fontSize: 9.5, opacity: 0.75, marginTop: 3, letterSpacing: 0.3 }
const sigRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }
const sigChip: React.CSSProperties = { fontSize: 11, padding: "6px 11px", background: "rgba(215,155,255,0.14)", border: "1px solid rgba(215,155,255,0.34)", borderRadius: 999 }

const questList: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, width: "min(400px, 94vw)", margin: "14px 0 4px" }
const questRow: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,213,74,0.18)", borderRadius: 9, padding: "8px 10px" }
const questDone: React.CSSProperties = { opacity: 0.55, borderColor: "rgba(154,255,160,0.3)" }
const btnPrimary: React.CSSProperties = { marginTop: 16, padding: "12px 24px", fontFamily: "inherit", fontSize: 14, fontWeight: 900, color: "#1a1400", background: "linear-gradient(180deg,#ffd54a,#f0a830)", border: "none", borderRadius: 11, cursor: "pointer", boxShadow: "0 0 22px rgba(255,213,74,.5)" }
const btnGhost: React.CSSProperties = { marginTop: 10, marginBottom: 8, padding: "9px 20px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, cursor: "pointer" }
const skipBtn: React.CSSProperties = { position: "absolute", top: 12, right: 12, zIndex: 2, padding: "6px 12px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
