"use client"

// CROUPIER — carrousel consultable au casino (table roulette multijoueur). Panneaux :
//  0) Le croupier (raillerie + bouton Jouer)
//  1) Numéros chauds / froids (+ le plus / le moins sorti)
//  2) Plus grosses MISES (jour / semaine / ever)
//  3) Plus gros GAINS (jour / semaine / ever) + joueur du jour
// Données serveur (lecture seule) via /api/gamebook/yellow/roulette/stats.

import { useEffect, useState } from "react"
import { usePlayer, casinoPillar } from "@/lib/gamebook/yellow/store/playerStore"
import { TONYTONY_TARGET, TONYTONY_SHINY_TARGET } from "@/lib/gamebook/yellow/data/labDefis"

interface Amt { nickname: string; amount: number }
interface Num { n: number; c: number; color: string }
interface Stats {
    totalSpins: number
    hot: Num[]; cold: Num[]; mostDrawn: Num | null; leastDrawn: Num | null
    topBets: { ever: Amt[]; week: Amt[]; day: Amt[] }
    topWins: { ever: Amt[]; week: Amt[]; day: Amt[] }
    playerOfDay: Amt | null
}

const RAILLERIES = [
    "Tu sens la chance, blanc-bec ? La maison, elle, ne sent rien — elle encaisse.",
    "Rouge, noir, vert… moi je ne vois qu'une couleur : la tienne quand tu perds.",
    "Mise petit, tu gagnes petit. Mise gros, tu me fais plaisir.",
    "La roulette n'a pas de mémoire. Toi non plus, vu comme tu rejoues.",
    "37 cases, une seule bille, zéro pitié. Bonne chance — t'en auras besoin.",
    "Le zéro vert ? C'est mon salaire. Merci d'avance.",
    "Tu peux battre un Daemon. La probabilité, jamais.",
]

const col = (c: string) => c === "red" ? "#d23b3b" : c === "black" ? "#222" : "#1f8a4c"
const colFr = (c: string) => c === "red" ? "rouge" : c === "black" ? "noir" : "vert"

export default function CroupierPanel({ myUserId, close, onPlay }: { myUserId: string; close: () => void; onPlay: () => void }) {
    void myUserId
    const player = usePlayer()
    const won = player.labDefi.casinoTotalWon // énergie totale gagnée au casino (le croupier en tient le compte)
    const tonyClaimed = player.labDefi.tonytonyClaimed, tonyShiny = player.labDefi.tonytonyShiny
    const pillar = casinoPillar() // 🥚 Tonytony (run 1) / 🦠 Merorem (run 2)
    const [stats, setStats] = useState<Stats | null>(null)
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [slide, setSlide] = useState(0)
    const [win, setWin] = useState<"day" | "week" | "ever">("day")
    const [rail] = useState(() => Math.floor((Date.now() / 60000) % RAILLERIES.length))

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/roulette/stats")
                const j = r.ok ? await r.json() : null
                if (cancelled) return
                if (j?.ok) { setStats(j as Stats); setState("ok") } else setState("error")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [])

    const numChip = (x: Num) => <span key={x.n} style={{ ...chip, background: col(x.color) }}>{x.n}<sub style={subN}>{x.c}</sub></span>
    const amtList = (rows: Amt[], unit: string) => rows.length === 0
        ? <div style={muted}>Rien pour l&apos;instant.</div>
        : <ol style={olS}>{rows.slice(0, 8).map((r, i) => (
            <li key={i} style={liS}><span style={rk}>{i + 1}</span><b style={{ flex: 1 }}>{r.nickname}</b><span style={amtS}>{r.amount} {unit}</span></li>
        ))}</ol>

    const SLIDES = ["🎲 Le Croupier", "🔥 Chauds / 🧊 Froids", "💰 Plus grosses mises", "🏆 Plus gros gains"]

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>{SLIDES[slide]}</div>

                {state === "loading" && <div style={muted}>Le croupier compte ses jetons…</div>}
                {state === "error" && <div style={muted}>Croupier indisponible (hors-ligne ?).</div>}

                {state === "ok" && stats && (
                    <div style={content}>
                        {slide === 0 && (
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 40, margin: "4px 0" }}>🎲</div>
                                <div style={raillerie}>« {RAILLERIES[rail]} »</div>
                                <div style={{ ...muted, marginTop: 8 }}>{stats.totalSpins} manches jouées sur la table.</div>
                                <div style={tonyBox}>
                                    {pillar.emoji} <b>Quête {pillar.name}</b> — je tiens le compte de ton <b>énergie gagnée</b> ici : <b style={{ color: "#ffd54a" }}>{won} ⚡</b><br />
                                    {tonyClaimed ? `${pillar.emoji} ${pillar.name} : ✅ obtenu` : `${pillar.emoji} ${pillar.name} : ${Math.min(won, TONYTONY_TARGET)}/${TONYTONY_TARGET}`}
                                    {" · "}
                                    {tonyShiny ? "✨ Shiny : ✅" : `✨ Shiny : ${Math.min(won, TONYTONY_SHINY_TARGET)}/${TONYTONY_SHINY_TARGET}`}
                                    {((!tonyClaimed && won >= TONYTONY_TARGET) || (tonyClaimed && !tonyShiny && won >= TONYTONY_SHINY_TARGET)) &&
                                        <div style={{ marginTop: 4, color: "#7ce0a0", fontWeight: 700 }}>🎉 Palier atteint — va le réclamer à l&apos;ordi du labo !</div>}
                                </div>
                                <div style={tip}>💻 Psst… si t&apos;es joueur, il y a des <b>défis</b> sur l&apos;ordi du <b>labo</b> (à l&apos;étage du Centre Daemon). Va voir.</div>
                                <button style={playBtn} onClick={onPlay}>🎡 Jouer à la roulette</button>
                            </div>
                        )}

                        {slide === 1 && (
                            <div>
                                <div style={lbl}>🔥 Numéros CHAUDS (les plus sortis)</div>
                                <div style={chipRow}>{stats.hot.map(numChip)}</div>
                                <div style={lbl}>🧊 Numéros FROIDS (les plus rares)</div>
                                <div style={chipRow}>{stats.cold.map(numChip)}</div>
                                <div style={{ ...muted, marginTop: 10 }}>
                                    {stats.mostDrawn && <>⭐ Le + sorti : <b>{stats.mostDrawn.n}</b> ({colFr(stats.mostDrawn.color)}, {stats.mostDrawn.c}×)</>}<br />
                                    {stats.leastDrawn && <>💤 Le + rare : <b>{stats.leastDrawn.n}</b> ({colFr(stats.leastDrawn.color)}, {stats.leastDrawn.c}×)</>}
                                </div>
                                <div style={{ ...muted, fontSize: 10, marginTop: 6 }}>(sur les {stats.totalSpins} dernières manches · le petit chiffre = nb de sorties)</div>
                            </div>
                        )}

                        {(slide === 2 || slide === 3) && (
                            <div>
                                <div style={winTabs}>
                                    {(["day", "week", "ever"] as const).map((w) => (
                                        <button key={w} onClick={() => setWin(w)} style={{ ...winTab, ...(win === w ? winTabOn : {}) }}>
                                            {w === "day" ? "Jour" : w === "week" ? "Semaine" : "Depuis toujours"}
                                        </button>
                                    ))}
                                </div>
                                {slide === 2 && amtList(stats.topBets[win], "⚡ misés")}
                                {slide === 3 && <>
                                    {win === "day" && stats.playerOfDay && <div style={pod}>👑 Joueur du jour : <b>{stats.playerOfDay.nickname}</b> (+{stats.playerOfDay.amount} ⚡)</div>}
                                    {amtList(stats.topWins[win], "⚡ gagnés")}
                                </>}
                            </div>
                        )}
                    </div>
                )}

                <div style={nav}>
                    <button style={navBtn} onClick={() => setSlide((s) => (s + SLIDES.length - 1) % SLIDES.length)}>◀</button>
                    <div style={dots}>{SLIDES.map((_, i) => <span key={i} style={{ ...dot, ...(i === slide ? dotOn : {}) }} />)}</div>
                    <button style={navBtn} onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}>▶</button>
                </div>
                <button style={closeBtn} onClick={close}>← Fermer</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.85)", fontFamily: "'Courier New', monospace" }
const box: React.CSSProperties = { width: "min(420px,96vw)", background: "#171430", border: "2px solid #ffd54a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(255,213,74,.25)" }
const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#ffd54a", textAlign: "center", marginBottom: 10 }
const content: React.CSSProperties = { minHeight: 200 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.7, textAlign: "center", lineHeight: 1.6 }
const raillerie: React.CSSProperties = { fontSize: 14, fontStyle: "italic", lineHeight: 1.5, color: "#e9d9a0", padding: "0 6px" }
const tip: React.CSSProperties = { fontSize: 12, lineHeight: 1.5, color: "#9fd4ff", background: "rgba(126,180,255,0.1)", border: "1px solid rgba(126,180,255,0.25)", borderRadius: 8, padding: "8px 10px", margin: "10px 4px 0" }
const tonyBox: React.CSSProperties = { fontSize: 12, lineHeight: 1.6, color: "#f3e0a0", background: "rgba(255,213,74,0.1)", border: "1px solid rgba(255,213,74,0.3)", borderRadius: 8, padding: "9px 11px", margin: "10px 4px 0" }
const playBtn: React.CSSProperties = { marginTop: 14, padding: "11px 18px", background: "#e0c020", color: "#1a1400", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#ffd54a", margin: "10px 0 5px" }
const chipRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6 }
const chip: React.CSSProperties = { minWidth: 30, height: 30, borderRadius: 6, color: "#fff", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px", border: "1px solid rgba(255,255,255,0.25)" }
const subN: React.CSSProperties = { fontSize: 8, opacity: 0.8, marginLeft: 2 }
const winTabs: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 8 }
const winTab: React.CSSProperties = { flex: 1, padding: "6px 0", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
const winTabOn: React.CSSProperties = { background: "#e0c020", color: "#1a1400", borderColor: "#e0c020" }
const olS: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0 }
const liS: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)" }
const rk: React.CSSProperties = { width: 18, height: 18, borderRadius: "50%", background: "#ffd54a", color: "#1a1400", fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }
const amtS: React.CSSProperties = { color: "#7ce0a0", fontWeight: 700 }
const pod: React.CSSProperties = { background: "rgba(224,192,32,0.15)", border: "1px solid #ffd54a", borderRadius: 7, padding: "7px 10px", fontSize: 12.5, marginBottom: 8, textAlign: "center" }
const nav: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }
const navBtn: React.CSSProperties = { background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 14px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
const dots: React.CSSProperties = { display: "flex", gap: 6 }
const dot: React.CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }
const dotOn: React.CSSProperties = { background: "#ffd54a" }
const closeBtn: React.CSSProperties = { marginTop: 10, width: "100%", padding: "9px 0", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
