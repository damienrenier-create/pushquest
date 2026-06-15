"use client"

// Hall of Fame du Nexus Jaune Éclair — joué une fois après la victoire sur LE MAÎTRE de la Ligue.
// Bannière de Champion + équipe + « meilleurs moments » des 5 combats de la Ligue + petit générique.

import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import type { LeagueHighlight } from "@/lib/gamebook/yellow/storage/save"

export default function HallOfFame({ champion, onDone }: {
    champion: { team: { speciesId: string; nickname?: string; level: number }[]; highlights: LeagueHighlight[] }
    onDone: () => void
}) {
    return (
        <div style={overlay}>
            <div style={box}>
                <div style={{ fontSize: 44, lineHeight: 1 }}>👑</div>
                <h1 style={title}>CHAMPION DU NEXUS</h1>
                <p style={sub}>Tu as terrassé le Conseil des 4 et LE MAÎTRE. La couronne est à toi !</p>

                <div style={sectionTitle}>🏆 TON ÉQUIPE DE CHAMPION</div>
                <div style={teamRow}>
                    {champion.team.map((m, i) => {
                        const sp = getSpecies(m.speciesId)
                        return (
                            <div key={i} style={monCard}>
                                {sp?.sprite
                                    ? <img src={sp.sprite} alt={sp.name} style={monImg} />
                                    : <div style={{ fontSize: 28 }}>❓</div>}
                                <div style={monName}>{m.nickname ?? sp?.name ?? m.speciesId}</div>
                                <div style={monLvl}>N.{m.level}</div>
                            </div>
                        )
                    })}
                </div>

                {champion.highlights.length > 0 && (
                    <>
                        <div style={sectionTitle}>✨ MEILLEURS MOMENTS</div>
                        <div style={hiList}>
                            {champion.highlights.map((h, i) => (
                                <div key={i} style={hiRow}>
                                    <span style={{ opacity: 0.75 }}>vs {h.trainer}</span> — <b>{h.mon}</b> inflige{" "}
                                    <b style={{ color: "#ffd54a" }}>{h.dmg}</b> dégâts{h.move ? ` avec ${h.move}` : ""} !
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div style={credits}>
                    <div style={{ fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>— NEXUS JAUNE ÉCLAIR —</div>
                    <div style={creditLine}>Game design &amp; code · Sartay</div>
                    <div style={creditLine}>Daemons, sprites &amp; lore · Sartay (via IA)</div>
                    <div style={creditLine}>Moteur de combat maison · façon Gen 1</div>
                    <div style={{ marginTop: 8 }}>Merci d&apos;avoir joué ! 💛⚡</div>
                </div>

                <button style={btn} onClick={onDone}>CONTINUER ▶</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 50% 30%, #2a2350, #100c20 70%)", padding: 12, overflowY: "auto",
}
const box: React.CSSProperties = {
    width: "min(440px, 96vw)", maxHeight: "94vh", overflowY: "auto", textAlign: "center", color: "#fff",
    fontFamily: "inherit", background: "rgba(20,16,40,0.85)", border: "3px solid #ffd54a", borderRadius: 14,
    padding: "18px 16px", boxShadow: "0 0 40px rgba(255,213,74,0.35)",
}
const title: React.CSSProperties = { margin: "4px 0 2px", fontSize: 26, color: "#ffd54a", letterSpacing: 1, textShadow: "0 2px 0 #7a5c00" }
const sub: React.CSSProperties = { margin: "0 0 12px", fontSize: 12, opacity: 0.9 }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#ffd54a", margin: "14px 0 8px", letterSpacing: 0.5 }
const teamRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }
const monCard: React.CSSProperties = { width: 64, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 2px" }
const monImg: React.CSSProperties = { width: 48, height: 48, objectFit: "contain", imageRendering: "pixelated" }
const monName: React.CSSProperties = { fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const monLvl: React.CSSProperties = { fontSize: 9, opacity: 0.7 }
const hiList: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, textAlign: "left" }
const hiRow: React.CSSProperties = { fontSize: 11, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "5px 8px" }
const credits: React.CSSProperties = { marginTop: 16, fontSize: 11, lineHeight: 1.7, opacity: 0.9, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }
const creditLine: React.CSSProperties = { opacity: 0.85 }
const btn: React.CSSProperties = {
    marginTop: 16, width: "100%", padding: "12px", fontFamily: "inherit", fontSize: 14, fontWeight: 800,
    color: "#1a1400", background: "#ffd54a", border: "none", borderRadius: 10, cursor: "pointer",
}
