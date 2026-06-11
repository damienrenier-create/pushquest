"use client"

// Nexus Jaune Éclair — célébration de fin de combat (victoire) :
//  1) une PLUIE DE CONFETTIS (façon "Victory Royale" / level-complete mobile), 100% CSS,
//  2) une carte de débrief "🐐 GOAT / 🤡 FLOP" du combat (façon Player of the Match).
// Overlay NON bloquant (pointerEvents none) → le bouton QUITTER en dessous reste cliquable.

import { useMemo } from "react"
import { displayName } from "@/lib/gamebook/yellow/battle/engine"
import type { BattleMon } from "@/lib/gamebook/yellow/battle/types"

const COLORS = ["#f5d020", "#e04040", "#4a9fe0", "#48c048", "#e060c0", "#f09030", "#a060e0", "#ffffff"]

export default function VictoryCelebration({ team }: { team: BattleMon[] }) {
    // Confettis générés une seule fois (positions/couleurs/timings aléatoires).
    const pieces = useMemo(
        () =>
            Array.from({ length: 90 }, () => ({
                left: Math.random() * 100,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                w: 5 + Math.random() * 8,
                delay: Math.random() * 0.7,
                dur: 1.7 + Math.random() * 1.8,
                rot: Math.floor(Math.random() * 360),
                drift: Math.round((Math.random() - 0.5) * 120),
            })),
        [],
    )

    // GOAT = plus gros coup DE CE COMBAT (battleBestDmg, remis à 0 à chaque combat — on ne
    // mélange JAMAIS les records des combats précédents). FLOP = un Daemon tombé ce combat.
    const goat = useMemo(() => [...team].sort((a, b) => (b.battleBestDmg ?? 0) - (a.battleBestDmg ?? 0))[0], [team])
    const fainted = useMemo(() => team.filter((m) => m.currentHp <= 0).sort((a, b) => (a.battleBestDmg ?? 0) - (b.battleBestDmg ?? 0)), [team])
    const flop = fainted[0] ?? null

    return (
        <div style={S.overlay}>
            <style>{KEYFRAMES}</style>
            {pieces.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute", top: "-6%", left: `${p.left}%`,
                        width: p.w, height: p.w * 0.55, background: p.color, borderRadius: 1,
                        animation: `cfFall ${p.dur}s linear ${p.delay}s forwards`,
                        // @ts-expect-error custom prop CSS
                        "--drift": `${p.drift}px`, "--rot": `${p.rot}deg`,
                    }}
                />
            ))}

            <div style={S.banner}>VICTOIRE&nbsp;!</div>

            <div style={S.card}>
                {goat && (goat.battleBestDmg ?? 0) > 0 && (
                    <div style={{ ...S.row, ...S.goatRow }}>
                        <span style={S.emoji}>🐐</span>
                        <div style={S.rowText}>
                            <div style={S.rowTitle}>GOAT du combat</div>
                            <div style={S.rowMain}>{displayName(goat)}</div>
                            <div style={S.rowSub}>{goat.battleBestDmgMove ?? "gros coup"} · {goat.battleBestDmg} dégâts</div>
                        </div>
                    </div>
                )}
                {flop ? (
                    <div style={{ ...S.row, ...S.flopRow }}>
                        <span style={S.emoji}>🤡</span>
                        <div style={S.rowText}>
                            <div style={S.rowTitle}>FLOP du combat</div>
                            <div style={S.rowMain}>{displayName(flop)}</div>
                            <div style={S.rowSub}>tombé au combat 💀</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ ...S.row, ...S.flawlessRow }}>
                        <span style={S.emoji}>✨</span>
                        <div style={S.rowText}>
                            <div style={S.rowTitle}>SANS FAUTE</div>
                            <div style={S.rowSub}>Aucun Daemon mis K.O. — chapeau !</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const KEYFRAMES = `
@keyframes cfFall {
  0%   { transform: translate(0,0) rotate(var(--rot)); opacity: 1; }
  100% { transform: translate(var(--drift), 110cqh) rotate(calc(var(--rot) + 900deg)); opacity: 0.85; }
}
@keyframes vcPop {
  0%   { transform: translateX(-50%) scale(0.2); opacity: 0; }
  55%  { transform: translateX(-50%) scale(1.18); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
@keyframes vcSlide {
  0%   { transform: translate(-50%, 24px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}
`

const S: Record<string, React.CSSProperties> = {
    // containerType:size → confettis (cqh) et bannière (cqw) se calent sur la TAILLE DU CADRE
    // de combat (l'overlay fait inset:0 dans la scène), plus sur le viewport. Sinon, sur écran
    // large, la bannière "9vw" débordait et les confettis tombaient trop loin.
    overlay: { position: "absolute", inset: 0, zIndex: 90, pointerEvents: "none", overflow: "hidden", fontFamily: "'Courier New', monospace", containerType: "size" },
    banner: {
        position: "absolute", top: "14%", left: "50%", transform: "translateX(-50%)",
        fontSize: "clamp(24px, 10cqw, 46px)", fontWeight: 900, letterSpacing: 2, color: "#f5d020",
        textShadow: "0 2px 0 #1c1408, 0 0 18px #f5d02088, 0 0 36px #f5d02044",
        animation: "vcPop 0.6s cubic-bezier(.2,1.4,.4,1) forwards", whiteSpace: "nowrap",
    },
    card: {
        position: "absolute", top: "34%", left: "50%", transform: "translateX(-50%)",
        width: "min(88%, 360px)", background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 12,
        padding: 12, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
        animation: "vcSlide 0.5s ease 0.3s backwards",
    },
    row: { display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "8px 10px" },
    goatRow: { background: "linear-gradient(90deg,#fff4c2,#ffe88a)", border: "2px solid #d9a900" },
    flopRow: { background: "#f1e3e3", border: "2px solid #c08080" },
    flawlessRow: { background: "#e6f2e6", border: "2px solid #7fb87f" },
    emoji: { fontSize: 30, lineHeight: 1, flexShrink: 0 },
    rowText: { display: "flex", flexDirection: "column", gap: 1, color: "#1c1408", minWidth: 0 },
    rowTitle: { fontSize: 10, fontWeight: 900, letterSpacing: 1.5, opacity: 0.7 },
    rowMain: { fontSize: 15, fontWeight: 800 },
    rowSub: { fontSize: 11, opacity: 0.7 },
}
