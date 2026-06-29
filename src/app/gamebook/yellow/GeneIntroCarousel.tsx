"use client"

// Carrousel d'onboarding (one-shot) : le Dieu Spaghetti explique la GÉNÉTIQUE des Daemons
// (gènes/IV → potentiel D…PARFAIT, lien avec l'effort, et la subtilité « la lettre cache la
// répartition »). Déclenché une seule fois, après une capture. Exemple : Rochison.

import { useState } from "react"

const SLIDES: { title: string; body: React.ReactNode }[] = [
    {
        title: "🍝 Un secret sur l'ADN des Daemons",
        body: <>Hé, mortel ! C'est moi, le <b>Dieu Spaghetti</b>. Tu viens d'attraper un Daemon — laisse-moi te révéler ce qui se cache dans ses gènes…</>,
    },
    {
        title: "🧬 5 gènes, 1 potentiel",
        body: <>Chaque Daemon a <b>5 gènes</b> (un par stat : PV, Atq, Déf, Vit, Spé), chacun de <b>0 à 15</b>. Leur total donne un <b>POTENTIEL</b>, affiché sur sa fiche :<br /><span style={{ opacity: 0.85 }}>D · C · B · A · S · </span><b style={{ color: "#e0c020" }}>✨ PARFAIT</b> <span style={{ opacity: 0.7 }}>(les 5 gènes au maximum)</span>.</>,
    },
    {
        title: "💪 L'effort forge la génétique",
        body: <>Plus tu boucles ton <b>quota du jour</b>, meilleurs sont les gènes des Daemons sauvages que tu croises. Et si tu <b>DÉPASSES</b> ton quota → tu as une chance de tomber sur un Daemon <b style={{ color: "#e0c020" }}>PARFAIT</b> ! Bosse avant de chasser.</>,
    },
    {
        title: "⚠️ Le piège de la lettre",
        body: <>La lettre ne dit que le <b>total</b>, pas <b>où</b> sont les bons gènes. Un <b>Rochison « A »</b> a par exemple <b>Déf 148</b> au lieu de 150 (niv. 50) — autant dire pareil ! Ça ne se sent que si un gène faible tombe pile sur une stat clé. Et le <b>shiny</b> / l'entraînement comptent <b>bien plus</b>. <b>Ne jette jamais un bon A !</b></>,
    },
]

export default function GeneIntroCarousel({ onDone }: { onDone: () => void }) {
    const [i, setI] = useState(0)
    const last = i === SLIDES.length - 1
    const s = SLIDES[i]
    return (
        <div style={overlay} onClick={(e) => e.stopPropagation()}>
            <div style={box}>
                <div style={godRow}><span style={{ fontSize: 30 }}>🍝</span><span style={godName}>DIEU SPAGHETTI</span></div>
                <div style={title}>{s.title}</div>
                <div style={body}>{s.body}</div>
                <div style={dots}>
                    {SLIDES.map((_, k) => <span key={k} style={{ ...dot, ...(k === i ? dotOn : null) }} />)}
                </div>
                <div style={nav}>
                    {i > 0
                        ? <button style={btnGhost} onClick={() => setI(i - 1)}>← Précédent</button>
                        : <span />}
                    {last
                        ? <button style={btnPrimary} onClick={onDone}>C'est compris ! 🙏</button>
                        : <button style={btnPrimary} onClick={() => setI(i + 1)}>Suivant →</button>}
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9300, background: "rgba(8,6,16,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Courier New', monospace", color: "#f8f8e8" }
const box: React.CSSProperties = { width: "min(420px, 96vw)", background: "linear-gradient(160deg, #2a2140, #18121f)", border: "3px solid #e0c020", borderRadius: 16, padding: "16px 18px", textAlign: "center", boxShadow: "0 0 30px #e0c02055" }
const godRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }
const godName: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#e0c020" }
const title: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: "4px 0 10px" }
const body: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, minHeight: 96 }
const dots: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 6, margin: "12px 0" }
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }
const dotOn: React.CSSProperties = { background: "#e0c020" }
const nav: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }
const btnGhost: React.CSSProperties = { padding: "8px 12px", fontFamily: "inherit", fontSize: 12, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
const btnPrimary: React.CSSProperties = { padding: "9px 16px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#1a1400", background: "#e0c020", border: "none", borderRadius: 8, cursor: "pointer", marginLeft: "auto" }
