"use client"

// src/app/gamebook/yellow/GlandEvent.tsx
//
// ÉVÉNEMENT SATIRIQUE D'UN JOUR (07-07-2026) — « L'injustice du gland » (la Belgique bat les USA !).
// Déclenché par le NOMBRE DE PAS (wiring dans YellowDevClient) :
//   • à 14 pas : un arbitre-gland furieux (trump1) confisque 14 énergie « comme ça, parce qu'il en a envie ».
//   • 14 pas plus tard : le DIEU SPAGHETTI en personne rétablit la justice → 14 tickets casino (10⚡ chacun,
//     origine "spag" = jouables OBLIGATOIREMENT au casino), et l'arbitre finit en pleurs (trump2, quitté au B).
// Ce composant N'EST QU'UN AFFICHAGE (3 écrans) ; les effets (−énergie / +tickets / flags) sont dans YellowDevClient.

import { useMemo } from "react"

export const GLAND_EVENT_DATE = "2026-07-07" // AUJOURD'HUI uniquement
export const GLAND_STEP_INTERVAL = 14        // 14 pas → carton ; +14 pas → justice
export const GLAND_ENERGY_STOLEN = 14
export const GLAND_TICKET_COUNT = 14
export const GLAND_TICKET_VALUE = 10

const CARTON_KEY = "pq_gland_carton_20260707"
const JUSTICE_KEY = "pq_gland_justice_20260707"
const ok = (k: string) => { try { return typeof window !== "undefined" && window.localStorage.getItem(k) === "1" } catch { return false } }
const set = (k: string) => { try { window.localStorage.setItem(k, "1") } catch { /* quota */ } }
export const glandCartonDone = (): boolean => ok(CARTON_KEY)
export const glandJusticeDone = (): boolean => ok(JUSTICE_KEY)
export const markGlandCartonDone = (): void => set(CARTON_KEY)
export const markGlandJusticeDone = (): void => set(JUSTICE_KEY)

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86", GOLD = "#f1c40f", RED = "#c0392b"
export type GlandScreen = "carton" | "spag" | "trump2"

export default function GlandEvent({ screen, onNext }: { screen: GlandScreen; onNext: () => void }) {
    // Confettis (écran de victoire uniquement). Index-based (pas de Math.random en boucle de rendu critique).
    const confetti = useMemo(
        () => Array.from({ length: 44 }, (_, i) => ({
            left: (i * 2.27 + (i % 5) * 3) % 100,
            color: [RED, GOLD, "#111", "#4cd964", "#3aa0ff"][i % 5],
            w: 5 + (i % 4) * 2,
            delay: (i % 9) * 0.12,
            dur: 1.8 + (i % 6) * 0.3,
            drift: ((i % 7) - 3) * 26,
        })),
        [],
    )

    return (
        <div style={overlay} onClick={(e) => e.stopPropagation()}>
            {screen === "trump2" && (
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                    {confetti.map((c, i) => (
                        <span key={i} style={{
                            position: "absolute", top: -14, left: `${c.left}%`, width: c.w, height: c.w * 1.6,
                            background: c.color, borderRadius: 2,
                            animation: `glandFall ${c.dur}s linear ${c.delay}s infinite`,
                            ["--drift" as string]: `${c.drift}px`,
                        }} />
                    ))}
                </div>
            )}
            <div style={box} onClick={(e) => e.stopPropagation()}>
                {screen === "carton" && (
                    <>
                        <div style={header}>🟥 CARTON ROUGE INJUSTE ! <span style={sub}>🇧🇪 la Belgique bat les USA</span></div>
                        <div style={body}>
                            <img src="/yellow/trump1.png" alt="Arbitre furieux" style={img} />
                            <p style={text}>
                                Un <b>immense gland</b> qui ne connaît <b>RIEN aux règles</b> débarque, ROUGE de colère :
                                « TU AS FAIT <b>14 PAS</b> ?! T&apos;AS PAS LE DROIT !!! »
                            </p>
                            <p style={{ ...text, color: RED, fontWeight: 800 }}>
                                Et il te confisque <b>{GLAND_ENERGY_STOLEN} énergie</b>. Comme ça. Parce qu&apos;il en a envie. 😤
                            </p>
                        </div>
                        <button style={btnDark} onClick={onNext}>Subir l&apos;injustice… (B)</button>
                    </>
                )}

                {screen === "spag" && (
                    <>
                        <div style={header}>🍝 LE DIEU SPAGHETTI RÉTABLIT LA JUSTICE</div>
                        <div style={{ ...body, textAlign: "center" }}>
                            <div style={{ fontSize: 54, margin: "6px 0 4px" }}>🍝✨</div>
                            <p style={text}>
                                « Cette injustice ne restera PAS impunie, mortel ! Ce gland t&apos;a spolié —
                                <b> moi, le DIEU SPAGHETTI en personne</b>, je répare l&apos;affront. »
                            </p>
                            <p style={{ ...text, color: "#1e8449", fontWeight: 800 }}>
                                « Voici <b>{GLAND_TICKET_COUNT} tickets de casino</b> ({GLAND_TICKET_VALUE}⚡ chacun) —
                                à claquer OBLIGATOIREMENT à la <b>roulette</b> ou au <b>blackjack</b> ! »
                            </p>
                        </div>
                        <button style={btnRed} onClick={onNext}>MERCI ô DIEU SPAGHETTI ! 🍝 (B)</button>
                    </>
                )}

                {screen === "trump2" && (
                    <>
                        <div style={header}>🎉 JUSTICE EST FAITE ! 🇧🇪</div>
                        <div style={body}>
                            <img src="/yellow/trump2.png" alt="Arbitre en pleurs" style={img} />
                            <p style={{ ...text, textAlign: "center" }}>
                                Le gland <b>pleure toutes les larmes de son corps</b>, sa moumoute s&apos;envole, son carton
                                rouge gît au sol. La Belgique triomphe — et toi aussi ! <b>File claquer tes tickets !</b> 🎰
                            </p>
                        </div>
                        <button style={btnRed} onClick={onNext}>🎰 Filer au casino ! (B)</button>
                    </>
                )}
            </div>
            <style>{`@keyframes glandFall { 0% { transform: translateY(0) translateX(0) rotate(0); opacity: 1 } 100% { transform: translateY(115vh) translateX(var(--drift)) rotate(540deg); opacity: .9 } }`}</style>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 12 }
const box: React.CSSProperties = { position: "relative", background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 380, maxHeight: "92%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif", overflow: "hidden" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 13, background: GOLD }
const sub: React.CSSProperties = { fontSize: 10, opacity: 0.7, fontWeight: 600 }
const body: React.CSSProperties = { padding: 14, overflowY: "auto", flex: 1 }
const img: React.CSSProperties = { display: "block", width: 150, maxWidth: "60%", height: "auto", margin: "0 auto 10px", imageRendering: "pixelated" }
const text: React.CSSProperties = { fontSize: 13, color: INK, lineHeight: 1.5, fontWeight: 600, margin: "0 0 8px" }
const btnBase: React.CSSProperties = { margin: 10, marginTop: 0, padding: "11px 0", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer", color: "#fff" }
const btnDark: React.CSSProperties = { ...btnBase, background: INK }
const btnRed: React.CSSProperties = { ...btnBase, background: RED }
