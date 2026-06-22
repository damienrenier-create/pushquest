"use client"

// Hall of Fame du Nexus Jaune Éclair — séquence post-victoire en 5 ACTES, jouée une fois après
// la victoire sur LE MAÎTRE de la Ligue. Tout en CSS (aucune dépendance, aucun audio) :
//   Acte 0 — SACRE        : fondu doré, couronne en zoom, titre qui se révèle.
//   Acte 1 — CÉLÉBRATION  : confettis + l'équipe entre une par une (vue d'ensemble).
//   Acte 2 — PARADE       : chaque Daemon défile UN PAR UN, fiche complète (sprite, niveau, stats, attaques).
//   Acte 3 — GÉNÉRIQUE    : montage des 5 salles de la Ligue + crédits qui défilent + meilleurs moments.
//   Acte 4 — ÉPILOGUE     : dernière phrase + bouton CONTINUER (→ retour auto à Cendreville côté appelant).
// Auto-défilement chronométré (ralenti) ; clic / touche = avancer ; bouton « Passer » = sauter à l'épilogue.

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import type { ChampionRun } from "@/lib/gamebook/yellow/storage/save"

const LAST_ACT = 4
// Durée d'auto-défilement de chaque acte (ms). L'acte 2 (PARADE) gère son propre rythme par Daemon ;
// l'épilogue (acte 4) attend le joueur. Volontairement ralenti pour savourer le sacre.
const ACT_DURATIONS = [4200, 5400, 0, 16000]
// Temps d'affichage de CHAQUE Daemon dans la parade (ms).
const PARADE_PER_MON = 3400
// Échelle des barres de stats (une stat de champion shiny haut niveau plafonne ~350).
const STAT_BAR_MAX = 350
const STAT_ROWS: { key: "hp" | "atk" | "def" | "spe" | "spc"; label: string; color: string }[] = [
    { key: "hp", label: "PV", color: "#7ee081" },
    { key: "atk", label: "ATQ", color: "#ff9f6b" },
    { key: "def", label: "DÉF", color: "#7ec8ff" },
    { key: "spe", label: "VIT", color: "#ffd54a" },
    { key: "spc", label: "SPÉ", color: "#d79bff" },
]
const LIGUE_IMAGES = [
    "/yellow/sprites/ligue_glace.png",
    "/yellow/sprites/ligue_combat.png",
    "/yellow/sprites/ligue_spectre.png",
    "/yellow/sprites/ligue_dragon.png",
    "/yellow/sprites/ligue_rival.png",
]
const CONFETTI_COLORS = ["#ffd54a", "#ff7eb6", "#7ee0ff", "#9affa0", "#ffffff"]

export default function HallOfFame({ champion, onDone }: {
    champion: ChampionRun
    onDone: () => void
}) {
    const [act, setAct] = useState(0)
    const [parade, setParade] = useState(0)

    // Confettis générés une fois (côté client → aucun souci d'hydratation, le composant n'est rendu qu'au runtime).
    const [confetti] = useState(() =>
        Array.from({ length: 32 }, (_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 2.2,
            dur: 2.4 + Math.random() * 2.2,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: 6 + Math.round(Math.random() * 7),
        })),
    )

    // Montage de fond pendant le générique : on fait défiler les 5 salles de la Ligue.
    const [bg, setBg] = useState(0)
    useEffect(() => {
        if (act !== 3) return
        const t = setInterval(() => setBg((b) => (b + 1) % LIGUE_IMAGES.length), 2600)
        return () => clearInterval(t)
    }, [act])

    // Auto-avance d'acte (sauf la PARADE qui se gère seule, et l'épilogue qui attend le joueur).
    useEffect(() => {
        if (act >= LAST_ACT || act === 2) return
        const t = setTimeout(() => setAct((a) => a + 1), ACT_DURATIONS[act])
        return () => clearTimeout(t)
    }, [act])

    // PARADE (acte 2) : défile un Daemon à la fois, puis enchaîne sur le générique.
    useEffect(() => {
        if (act !== 2) return
        if (champion.team.length === 0) { setAct(3); return }
        const t = setTimeout(() => {
            setParade((p) => {
                if (p >= champion.team.length - 1) { setAct(3); return p }
                return p + 1
            })
        }, PARADE_PER_MON)
        return () => clearTimeout(t)
    }, [act, parade, champion.team.length])

    // Avance unifiée : pendant la parade, un clic passe au Daemon suivant ; sinon, on change d'acte.
    const advance = () => {
        if (act >= LAST_ACT) { onDone(); return }
        if (act === 2 && parade < champion.team.length - 1) { setParade((p) => p + 1); return }
        setAct((a) => a + 1)
    }

    // Clavier : avancer / terminer (la carte sous l'overlay est neutralisée par le guard de YellowDevClient).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase()
            if (!["enter", " ", "a", "b", "escape", "arrowright"].includes(k)) return
            e.preventDefault()
            advance()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [act, parade, onDone, champion.team.length])

    const onOverlayClick = () => advance()

    const cur = champion.team[parade]
    const curSp = cur ? getSpecies(cur.speciesId) : null

    return (
        <div style={overlay} onClick={onOverlayClick}>
            <style>{KEYFRAMES}</style>

            {/* ===== ACTE 0 — SACRE ===== */}
            {act === 0 && (
                <div style={center}>
                    <div style={{ fontSize: 88, lineHeight: 1, animation: "crownIn 1.2s cubic-bezier(.2,1.3,.4,1) both", filter: "drop-shadow(0 0 24px #ffd54a)" }}>👑</div>
                    <h1 style={{ ...title, animation: "titleIn .9s ease .7s both" }}>CHAMPION DU NEXUS</h1>
                    <p style={{ ...sub, animation: "titleIn .9s ease 1.5s both" }}>Tu as terrassé le Conseil des 4… et LE MAÎTRE.</p>
                </div>
            )}

            {/* ===== ACTE 1 — CÉLÉBRATION ===== */}
            {act === 1 && (
                <div style={center}>
                    <div style={confettiLayer} aria-hidden>
                        {confetti.map((c, i) => (
                            <span key={i} style={{
                                position: "absolute", top: -20, left: `${c.left}%`, width: c.size, height: c.size,
                                background: c.color, borderRadius: 2, opacity: 0.9,
                                animation: `fall ${c.dur}s linear ${c.delay}s infinite`,
                            }} />
                        ))}
                    </div>
                    <h2 style={{ ...title, fontSize: 22, animation: "titleIn .6s ease both" }}>👑 La couronne est à toi ! 👑</h2>
                    <div style={sectionTitle}>TON ÉQUIPE DE CHAMPION</div>
                    <div style={teamRow}>
                        {champion.team.map((m, i) => {
                            const sp = getSpecies(m.speciesId)
                            return (
                                <div key={i} style={{ ...monCard, animation: `cardIn .5s cubic-bezier(.17,.67,.33,1.2) ${0.15 * i + 0.3}s both` }}>
                                    {sp?.sprite
                                        ? <img src={sp.sprite} alt={sp.name} style={monImg} />
                                        : <div style={{ fontSize: 28 }}>❓</div>}
                                    <div style={monName}>{m.shiny ? "✨" : ""}{m.nickname ?? sp?.name ?? m.speciesId}</div>
                                    <div style={monLvl}>N.{m.level}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ===== ACTE 2 — PARADE (un Daemon à la fois, fiche complète) ===== */}
            {act === 2 && cur && (
                <div style={center}>
                    <div style={sectionTitle}>LA PARADE DES CHAMPIONS</div>
                    <div key={parade} style={{ ...paradeCard, animation: "paradeIn .55s cubic-bezier(.17,.67,.33,1.2) both" }}>
                        <div style={paradeHead}>
                            {curSp?.sprite
                                ? <img src={curSp.sprite} alt={curSp.name} style={paradeImg} />
                                : <div style={{ fontSize: 54 }}>❓</div>}
                            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                <div style={paradeName}>{cur.shiny ? "✨ " : ""}{cur.nickname ?? curSp?.name ?? cur.speciesId}</div>
                                {cur.nickname && curSp?.name && cur.nickname !== curSp.name && (
                                    <div style={paradeSpecies}>{curSp.name}</div>
                                )}
                                <div style={paradeLvl}>Niveau {cur.level}</div>
                                <div style={paradeTypes}>{(curSp?.types ?? []).join(" · ")}</div>
                            </div>
                        </div>

                        <div style={statsGrid}>
                            {STAT_ROWS.map((r) => (
                                <div key={r.key} style={statRow}>
                                    <span style={statLabel}>{r.label}</span>
                                    <span style={statVal}>{cur.stats[r.key]}</span>
                                    <span style={statBarBg}>
                                        <span style={{ ...statBarFill, width: `${Math.min(100, (cur.stats[r.key] / STAT_BAR_MAX) * 100)}%`, background: r.color }} />
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={movesWrap}>
                            {cur.moves.map((mv, i) => (
                                <span key={i} style={moveChip}>{mv}</span>
                            ))}
                        </div>
                    </div>
                    <div style={dotsRow} aria-hidden>
                        {champion.team.map((_, i) => (
                            <span key={i} style={{ ...dot, ...(i === parade ? dotActive : null) }} />
                        ))}
                    </div>
                </div>
            )}

            {/* ===== ACTE 3 — GÉNÉRIQUE VIVANT ===== */}
            {act === 3 && (
                <div style={{ ...center, justifyContent: "stretch", padding: 0 }}>
                    <img key={bg} src={LIGUE_IMAGES[bg]} alt="" aria-hidden style={montageImg} />
                    <div style={montageScrim} aria-hidden />
                    <div style={creditsViewport}>
                        <div style={{ ...creditsScroll, animation: "creditScroll 16s linear both" }}>
                            <div style={{ fontWeight: 800, letterSpacing: 1, fontSize: 16, color: "#ffd54a", marginBottom: 10 }}>— NEXUS JAUNE ÉCLAIR —</div>
                            {champion.highlights.length > 0 && (
                                <>
                                    <div style={sectionTitle}>✨ MEILLEURS MOMENTS</div>
                                    {champion.highlights.map((h, i) => (
                                        <div key={i} style={hiRow}>
                                            <span style={{ opacity: 0.75 }}>vs {h.trainer}</span> — <b>{h.mon}</b> inflige{" "}
                                            <b style={{ color: "#ffd54a" }}>{h.dmg}</b> dégâts{h.move ? ` avec ${h.move}` : ""} !
                                        </div>
                                    ))}
                                </>
                            )}
                            <div style={{ ...sectionTitle, marginTop: 22 }}>GÉNÉRIQUE</div>
                            <div style={creditLine}>Game design &amp; code · DamRen</div>
                            <div style={creditLine}>Daemons, sprites &amp; lore · DamRen (via IA)</div>
                            <div style={creditLine}>Moteur de combat maison · façon Gen 1</div>
                            <div style={{ marginTop: 14, fontSize: 14, color: "#ffd54a", fontWeight: 700 }}>Merci d&apos;avoir joué ! 💛⚡</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ACTE 4 — ÉPILOGUE ===== */}
            {act === 4 && (
                <div style={{ ...center, animation: "fadeIn .8s ease both" }}>
                    <div style={{ fontSize: 40, marginBottom: 14, filter: "drop-shadow(0 0 16px #ffd54a)" }}>⚡👑⚡</div>
                    <p style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 340, color: "#fff" }}>
                        Le Nexus se souviendra de ton nom…<br />
                        <span style={{ opacity: 0.8, fontSize: 13 }}>mais l&apos;aventure, elle, ne fait que commencer.</span>
                    </p>
                    <button style={btn} onClick={(e) => { e.stopPropagation(); onDone() }}>CONTINUER ▶</button>
                </div>
            )}

            {/* Bouton « Passer » (sauf à l'épilogue) → saute directement à l'épilogue. */}
            {act < LAST_ACT && (
                <button style={skipBtn} onClick={(e) => { e.stopPropagation(); setAct(LAST_ACT) }}>Passer ⏭</button>
            )}
        </div>
    )
}

const KEYFRAMES = `
@keyframes crownIn { from { transform: scale(0) rotate(-25deg); opacity: 0 } to { transform: scale(1) rotate(0); opacity: 1 } }
@keyframes titleIn { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes cardIn { from { transform: translateY(24px) scale(.8); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes paradeIn { from { transform: translateX(34px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes fall { from { transform: translateY(0) rotate(0) } to { transform: translateY(105vh) rotate(540deg) } }
@keyframes creditScroll { from { transform: translateY(100%) } to { transform: translateY(-100%) } }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
`

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 50% 30%, #2a2350, #0c0a18 72%)", overflow: "hidden", cursor: "pointer",
    fontFamily: "inherit",
}
const center: React.CSSProperties = {
    position: "relative", width: "min(460px, 96vw)", height: "min(560px, 92vh)", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", padding: 16,
}
const title: React.CSSProperties = { margin: "10px 0 4px", fontSize: 28, color: "#ffd54a", letterSpacing: 1, textShadow: "0 2px 0 #7a5c00, 0 0 22px rgba(255,213,74,.5)" }
const sub: React.CSSProperties = { margin: 0, fontSize: 13, opacity: 0.9 }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#ffd54a", margin: "14px 0 8px", letterSpacing: 0.5 }
const teamRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 420 }
const monCard: React.CSSProperties = { width: 64, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 2px" }
const monImg: React.CSSProperties = { width: 48, height: 48, objectFit: "contain", imageRendering: "pixelated" }
const monName: React.CSSProperties = { fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const monLvl: React.CSSProperties = { fontSize: 9, opacity: 0.7 }

// --- Parade (acte 2) ---
const paradeCard: React.CSSProperties = {
    width: "min(380px, 92vw)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,213,74,0.3)",
    borderRadius: 14, padding: 14, boxShadow: "0 0 28px rgba(255,213,74,.18)",
}
const paradeHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }
const paradeImg: React.CSSProperties = { width: 96, height: 96, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.5))" }
const paradeName: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#ffd54a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const paradeSpecies: React.CSSProperties = { fontSize: 11, opacity: 0.7 }
const paradeLvl: React.CSSProperties = { fontSize: 12, marginTop: 2 }
const paradeTypes: React.CSSProperties = { fontSize: 11, opacity: 0.8, marginTop: 2, letterSpacing: 0.5 }
const statsGrid: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }
const statRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 }
const statLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, width: 28, textAlign: "left", opacity: 0.8 }
const statVal: React.CSSProperties = { fontSize: 11, fontWeight: 700, width: 30, textAlign: "right" }
const statBarBg: React.CSSProperties = { flex: 1, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }
const statBarFill: React.CSSProperties = { display: "block", height: "100%", borderRadius: 4 }
const movesWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }
const moveChip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "4px 8px", background: "rgba(126,224,255,0.14)", border: "1px solid rgba(126,224,255,0.3)", borderRadius: 999 }
const dotsRow: React.CSSProperties = { display: "flex", gap: 6, marginTop: 14 }
const dot: React.CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }
const dotActive: React.CSSProperties = { background: "#ffd54a", boxShadow: "0 0 8px #ffd54a" }

const confettiLayer: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }
const montageImg: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, animation: "fadeIn 1s ease both" }
const montageScrim: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(12,10,24,.55), rgba(12,10,24,.85))" }
const creditsViewport: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", display: "flex", justifyContent: "center" }
const creditsScroll: React.CSSProperties = { position: "absolute", width: "min(380px, 90vw)", textAlign: "center", lineHeight: 1.7 }
const hiRow: React.CSSProperties = { fontSize: 11, background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "5px 8px", margin: "4px 0", textAlign: "left" }
const creditLine: React.CSSProperties = { fontSize: 12, opacity: 0.9 }
const btn: React.CSSProperties = {
    marginTop: 22, padding: "12px 28px", fontFamily: "inherit", fontSize: 14, fontWeight: 800,
    color: "#1a1400", background: "#ffd54a", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 20px rgba(255,213,74,.45)",
}
const skipBtn: React.CSSProperties = {
    position: "absolute", top: 12, right: 12, zIndex: 2, padding: "6px 12px", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
    color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer",
}
