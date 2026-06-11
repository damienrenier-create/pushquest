"use client"

// Nexus Jaune Éclair — DÉBRIEF de fin de match PvP, commenté par le Monstre Spaghetti.
// 4 sections (intro hype · top 3 · awards · décorticage tactique), sprites + halos, confettis.
// Données : état FINAL des 2 équipes (gros coup DE CE MATCH par Daemon `battleBestDmg`, K.O., types). PvP only.

import { useMemo } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { displayName } from "@/lib/gamebook/yellow/battle/engine"
import { typeEffectiveness } from "@/lib/gamebook/yellow/battle/typeChart"
import type { BattleMon, PokeType } from "@/lib/gamebook/yellow/battle/types"

const CONF = ["#f5d020", "#e04040", "#4a9fe0", "#48c048", "#e060c0", "#f09030", "#a060e0", "#fff"]
const dexSrc = (id: string) => `/yellow/sprites/dex/${id}.png`
const nameOf = (m: BattleMon) => getSpecies(m.speciesId)?.name ?? m.speciesId

export default function PvpRecap({
    playerTeam,
    enemyTeam,
    onClose,
}: {
    playerTeam: BattleMon[]
    enemyTeam: BattleMon[]
    onClose: () => void
}) {
    const a = useMemo(() => analyze(playerTeam, enemyTeam), [playerTeam, enemyTeam])
    const confetti = useMemo(
        () => Array.from({ length: 64 }, () => ({
            left: Math.random() * 100, color: CONF[Math.floor(Math.random() * CONF.length)],
            w: 5 + Math.random() * 7, delay: Math.random() * 0.8, dur: 1.8 + Math.random() * 1.7,
            rot: Math.floor(Math.random() * 360), drift: Math.round((Math.random() - 0.5) * 110),
        })),
        [],
    )

    return (
        <div style={S.overlay} onClick={onClose}>
            <style>{KEYFRAMES}</style>
            {confetti.map((p, i) => (
                <div key={i} style={{
                    position: "absolute", top: "-6%", left: `${p.left}%`, width: p.w, height: p.w * 0.55,
                    background: p.color, borderRadius: 1, animation: `prFall ${p.dur}s linear ${p.delay}s forwards`,
                    // @ts-expect-error custom CSS props
                    "--drift": `${p.drift}px`, "--rot": `${p.rot}deg`, pointerEvents: "none",
                }} />
            ))}

            <div style={S.card} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>🍝 DÉBRIEF DU MONSTRE SPAGHETTI 🎙️</div>

                {/* 1 — Intro hype */}
                <p style={{ ...S.hype, ...sec(0) }}>{a.intro}</p>

                {/* 2 — Top 3 */}
                <div style={{ ...S.block, ...sec(1) }}>
                    <div style={S.blockTitle}>🎬 TOP 3</div>
                    {a.top3.map((t, i) => <div key={i} style={S.bullet}>・ {t}</div>)}
                </div>

                {/* 3 — Awards (sprites + halos) */}
                <div style={{ ...S.awards, ...sec(2) }}>
                    <div style={{ ...S.award, ...S.mvp }}>
                        <div style={S.awardTag}>🏆 MVP</div>
                        <img src={dexSrc(a.mvp.speciesId)} alt="" style={{ ...S.sprite, ...S.haloGold }} />
                        <div style={S.awardName}>{displayName(a.mvp)}</div>
                        <div style={S.awardSub}>{a.mvpLine}</div>
                    </div>
                    <div style={{ ...S.award, ...S.flop }}>
                        <div style={S.awardTag}>🤡 PAILLASSON</div>
                        <img src={dexSrc(a.flop.speciesId)} alt="" style={{ ...S.sprite, ...S.haloRed }} />
                        <div style={S.awardName}>{nameOf(a.flop)}</div>
                        <div style={S.awardSub}>{a.flopLine}</div>
                    </div>
                </div>

                {/* 4 — Décorticage */}
                <div style={{ ...S.block, ...S.analysis, ...sec(3) }}>
                    <div style={S.blockTitle}>🧠 LE DÉCORTICAGE</div>
                    <div style={S.bullet}><b>Quoi :</b> {a.what}</div>
                    <div style={S.bullet}><b>Pourquoi ça win :</b> {a.why}</div>
                </div>

                <button style={S.continue} onClick={onClose}>CONTINUER ▶</button>
            </div>
        </div>
    )
}

// Stagger : chaque section apparaît avec un petit décalage.
function sec(i: number): React.CSSProperties {
    return { animation: `prRise 0.5s ease ${0.15 + i * 0.45}s backwards` }
}

interface Recap {
    intro: string; top3: string[]; mvp: BattleMon; mvpLine: string; flop: BattleMon; flopLine: string; what: string; why: string
}

function analyze(playerTeam: BattleMon[], enemyTeam: BattleMon[]): Recap {
    // battleBestDmg = plus gros coup DE CE MATCH (runtime, remis à 0 à chaque combat) → le débrief
    // ne mélange JAMAIS les records à vie des matchs précédents (cf. bestDmg, réservé à la fiche).
    const byDmgDesc = (t: BattleMon[]) => [...t].sort((x, y) => (y.battleBestDmg ?? 0) - (x.battleBestDmg ?? 0))
    const mvp = byDmgDesc(playerTeam)[0] ?? playerTeam[0]
    const flop = [...enemyTeam].sort((x, y) => (x.battleBestDmg ?? 0) - (y.battleBestDmg ?? 0))[0] ?? enemyTeam[0]
    const decisive = byDmgDesc([...playerTeam, ...enemyTeam])[0] ?? mvp
    const decMine = playerTeam.includes(decisive)
    const myDown = playerTeam.filter((m) => m.currentHp <= 0).length
    const enemyDown = enemyTeam.filter((m) => m.currentHp <= 0).length

    const intro =
        myDown === 0
            ? "✦ R'AMEN ! Un ROULEAU-COMPRESSEUR de nouilles — tu n'as pas laissé une miette. Domination totale, mortel. ✦"
            : myDown <= 1
                ? "✦ Solide ! Combat maîtrisé du début à la fin, un seul Daemon au tapis de ton côté. Du travail propre. ✦"
                : "✦ Quel THRILLER ! Ça s'est joué sur le fil, les nouilles tremblaient… mais tu as CLUTCH le money-time ! ✦"

    const top3 = [
        `${decMine ? "Ton" : "Le"} ${nameOf(decisive)}${decMine ? "" : " adverse"} claque ${decisive.battleBestDmgMove ?? "un gros coup"} pour ${decisive.battleBestDmg ?? "?"} dégâts 💥`,
        enemyDown > 0 ? `${enemyDown} Daemon${enemyDown > 1 ? "s" : ""} adverse${enemyDown > 1 ? "s" : ""} envoyé${enemyDown > 1 ? "s" : ""} au tapis 💀` : `Une guerre d'usure : personne ne lâche rien 😤`,
        `${nameOf(flop)} (adverse) complètement aux fraises — son meilleur coup : ${flop.battleBestDmg ?? 0} dégâts 🤡`,
    ]

    const decType = (getSpecies(decisive.speciesId)?.types[0] ?? "NORMAL") as PokeType
    const enemyLead = enemyTeam[0]
    const enemyTypes = (getSpecies(enemyLead?.speciesId ?? "")?.types ?? []) as PokeType[]
    const mult = enemyTypes.length ? typeEffectiveness(decType, enemyTypes) : 1
    const what = `${decMine ? "Ton" : "Le"} ${nameOf(decisive)} envoie ${decisive.battleBestDmgMove ?? "son attaque la plus lourde"} (${decisive.battleBestDmg ?? "?"} dégâts).`
    const why =
        mult >= 2
            ? `Type ${decType} ×${mult} contre ${nameOf(enemyLead)} (${enemyTypes.join("/")}) → COUNTER élémentaire parfait. 🎓 La leçon : repère la faiblesse de type adverse et frappe pile là — un ×2 vaut deux tours d'avance.`
            : mult < 1
                ? `Même à contre-type (×${mult}), le BURST brut a fait la diff. 🎓 La leçon : un Daemon avec une grosse stat offensive peut forcer le passage — mais c'est risqué, garde un counter en réserve.`
                : `Le coup qui a fait pencher la balance au bon moment (snowball). 🎓 La leçon : quand l'adversaire est sur le reculoir, enchaîne ton burst avant qu'il ne se soigne ou ne switch.`

    return {
        intro, top3, mvp,
        mvpLine: `A porté l'équipe : ${mvp.battleBestDmgMove ?? "coup signature"} à ${mvp.battleBestDmg ?? 0} dégâts.`,
        flop, flopLine: "Un sweeper qui rate son moment, c'est comme des pâtes sans sel.",
        what, why,
    }
}

const KEYFRAMES = `
@keyframes prFall { 0%{transform:translate(0,0) rotate(var(--rot));opacity:1} 100%{transform:translate(var(--drift),112vh) rotate(calc(var(--rot) + 900deg));opacity:.85} }
@keyframes prRise { 0%{transform:translateY(16px);opacity:0} 100%{transform:translateY(0);opacity:1} }
`

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "absolute", inset: 0, zIndex: 92, background: "radial-gradient(circle at 50% 30%, #2a1a40 0%, #07060c 80%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, overflow: "hidden", fontFamily: "'Courier New', monospace" },
    card: { width: "100%", maxWidth: 420, maxHeight: "94%", overflowY: "auto", background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 12, padding: 14, color: "#1c1408", boxShadow: "0 10px 30px rgba(0,0,0,0.6)", zIndex: 1 },
    header: { textAlign: "center", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#a06030", marginBottom: 10 },
    hype: { fontSize: 13, lineHeight: 1.5, fontWeight: 800, textAlign: "center", margin: "0 0 12px", color: "#2a1c10" },
    block: { background: "#fffdf3", border: "2px solid #cdbb86", borderRadius: 8, padding: "8px 10px", marginBottom: 10 },
    blockTitle: { fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 5, color: "#a06030" },
    bullet: { fontSize: 12, lineHeight: 1.45, margin: "3px 0" },
    awards: { display: "flex", gap: 8, marginBottom: 10 },
    award: { flex: 1, borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" },
    mvp: { background: "linear-gradient(180deg,#fff4c2,#ffe88a)", border: "2px solid #d9a900" },
    flop: { background: "#f1e3e3", border: "2px solid #c08080" },
    awardTag: { fontSize: 10, fontWeight: 900, letterSpacing: 1 },
    sprite: { width: 72, height: 72, objectFit: "contain", imageRendering: "pixelated", borderRadius: "50%" },
    haloGold: { filter: "drop-shadow(0 0 10px #f5d020) drop-shadow(0 0 18px #ffd54a99)" },
    haloRed: { filter: "drop-shadow(0 0 8px #e0606099) grayscale(0.3)" },
    awardName: { fontSize: 13, fontWeight: 900 },
    awardSub: { fontSize: 10, opacity: 0.75, lineHeight: 1.3 },
    analysis: { background: "#eef3fb", borderColor: "#9ab6e0" },
    continue: { width: "100%", marginTop: 4, padding: "11px 0", background: "#1c1408", color: "#f8f8e8", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
}
