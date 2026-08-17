"use client"

// Nexus Jaune Éclair — MANUEL DU DRESSEUR : pop-up riche ouvert par les panneaux
// du parc (Route Nord). Chaque panneau ouvre SON sujet (signOpen = index), et on
// peut feuilleter les autres avec ◀ ▶ / swipe. Privilégie la QUALITÉ de l'info.

import { type ReactNode } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

function P({ children }: { children: ReactNode }) {
    return <p style={{ fontSize: 12.5, lineHeight: 1.55, color: INK, margin: "0 0 9px" }}>{children}</p>
}

const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", margin: "2px 0 10px", fontSize: 12 }
const th: React.CSSProperties = { background: INK, color: CREAM, padding: "4px 6px", fontSize: 11, textAlign: "center" }
const td: React.CSSProperties = { border: `1px solid ${DARK}`, padding: "4px 6px", textAlign: "center", color: INK }

function CapturePage() {
    const rows = [
        ["🔴 Nexus (×1)", "niv < 10"],
        ["🔴 Nexus +", "niv < 15"],
        ["🔵 Super (×2)", "niv < 20"],
        ["🔵 Super +", "niv < 30"],
        ["🟡 Hyper (×4)", "niv < 40"],
        ["🟡 Hyper +", "niv < 50"],
    ]
    return (
        <>
            <P>D'abord <b>affaiblis</b> : à PV pleins, <b>40% max</b> (impossible de capturer sans toucher). Sous <b>1/3 de vie</b>, le <b>100%</b> devient possible.</P>
            <P>Chaque ball est taillée pour les <b>communs</b> jusqu'à un niveau (à 1/3 de vie) :</P>
            <table style={tbl}>
                <thead><tr><th style={th}>Ball</th><th style={th}>Communs jusqu'au…</th></tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ ...td, fontWeight: j === 0 ? 700 : 400 }}>{c}</td>)}</tr>)}</tbody>
            </table>
            <P>Les <b>peu communs / rares</b> et les <b>hauts niveaux</b> sont plus durs → monte d'une ball, ou affaiblis encore plus.</P>
            <P>➕ <b>Statut</b> : Sommeil/Gel <b>×2,5</b>, Poison/Para/Brûlure <b>×1,5</b>. <b>Quota</b> du jour atteint : <b>×1,3</b>. <b>Master-Éclair</b> : infaillible.</P>
        </>
    )
}

function TypesPage() {
    const matchups: [string, string][] = [
        ["💧 Eau", "Feu · Sol · Roche"],
        ["🔥 Feu", "Plante · Glace · Insecte · Acier"],
        ["🌿 Plante", "Eau · Sol · Roche"],
        ["⚡ Élec", "Eau · Vol"],
        ["🪨 Roche", "Feu · Vol · Insecte · Glace"],
        ["🌍 Sol", "Feu · Élec · Roche · Poison"],
        ["🥊 Combat", "Normal · Roche · Glace · Acier"],
        ["🦅 Vol", "Plante · Combat · Insecte"],
        ["🔮 Psy", "Combat · Poison"],
        ["❄️ Glace", "Plante · Sol · Vol · Dragon"],
    ]
    return (
        <>
            <P>Frappe avec un type <b>super efficace</b> (×2) pour doubler tes dégâts. Qui bat qui :</P>
            <table style={tbl}>
                <thead><tr><th style={th}>Type</th><th style={{ ...th, textAlign: "left" }}>super efficace contre</th></tr></thead>
                <tbody>{matchups.map(([a, b], i) => <tr key={i}><td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{a}</td><td style={{ ...td, textAlign: "left" }}>{b}</td></tr>)}</tbody>
            </table>
            <P>Un type <b>×2</b> superposé (ex. cible Roche/Sol) = <b>×4</b> ! Garde une équipe variée.</P>
        </>
    )
}

export const TOPICS: { t: string; body: ReactNode }[] = [
    { t: "🎯 Capturer un Daemon", body: <CapturePage /> },
    {
        t: "⚡ Reps → Énergie", body: <>
            <P>Tes <b>vraies répétitions PushQuest</b> deviennent ton <b>énergie</b> de combat.</P>
            <P>Chaque attaque coûte des reps (selon sa puissance) : pas de sport, pas de munitions. Une <i>Charge Désespérée</i> gratuite reste dispo à sec.</P>
            <P>Toutes les reps faites aujourd'hui sont <b>jouables immédiatement</b> — même celles des jours non joués s'accumulent.</P>
        </>,
    },
    {
        t: "🏆 Le quota du jour", body: <>
            <P>Atteins ton <b>quota quotidien</b> et la nature te récompense en combat sauvage :</P>
            <P>• captures <b>facilitées</b> (×1,3)<br />• Daemons plus <b>rares</b> et de plus <b>haut niveau</b> dans les herbes</P>
            <P><b>Dépasse</b> ton quota pour des potentiels génétiques (IV) encore meilleurs sur les sauvages.</P>
        </>,
    },
    { t: "⚔️ Table des types", body: <TypesPage /> },
    {
        t: "📊 Niveau de l'équipe", body: <>
            <P>Le <b>niveau de ton équipe</b> influence les Daemons sauvages que tu croises.</P>
            <P>Plus tu montes en puissance, plus les herbes recèlent d'adversaires coriaces : entraîne-toi régulièrement pour suivre le rythme.</P>
        </>,
    },
    {
        t: "📈 Le partage d'XP", body: <>
            <P>L'XP d'un ennemi vaincu va à <b>tous les Daemons qui l'ont affronté</b> — pas à ceux restés au banc.</P>
            <P>Astuce : envoie une jeune recrue au front un court instant avant de la rappeler — même un bref passage lui fait toucher l'XP.</P>
        </>,
    },
    {
        t: "☠️ Les attaques de statut", body: <>
            <P>Certaines attaques infligent un <b>statut</b> : brûlure, poison, paralysie, sommeil, gel, confusion.</P>
            <P><b>Exemple :</b> <i>Flammèche</i> (Feu) brûle 10% du temps — <b>Braisille</b> et <b>Fennaise</b> l'apprennent dès le <b>niveau 7</b>.</P>
            <P>Poison &amp; brûlure rongent l'ennemi chaque tour ; paralysie/sommeil/gel l'empêchent d'agir. De quoi gagner sans prendre un coup.</P>
        </>,
    },
    {
        t: "⬆️ Renforcement (buffs)", body: <>
            <P>Des techniques te <b>renforcent toi</b> au lieu de frapper.</P>
            <P><b>Exemple :</b> <i>Danse-Lames</i> augmente fortement ton <b>Attaque (+2 crans)</b> — un tour de mise, puis tu balaies.</P>
            <P>Les <b>objets X</b> font pareil en plein combat : +1 cran (~+50%) sur une stat, le temps du duel.</P>
        </>,
    },
    {
        t: "🎓 Apprendre des attaques", body: <>
            <P>Un Daemon ne retient que <b>quatre</b> attaques à la fois.</P>
            <P>Quand il veut en apprendre une 5e (niveau ou CT), ça t'attend dans sa <b>FICHE</b> : tu choisis quelle attaque remplacer, quand tu veux. Plus de pop-up qui interrompt.</P>
        </>,
    },
    {
        t: "🏃 La fuite", body: <>
            <P>Face à un sauvage trop coriace, <b>fuir</b> n'a rien de honteux.</P>
            <P>Mais contre un <b>dresseur</b>, pas d'échappatoire : il faut vaincre ou tomber. Prépare ton équipe avant de l'affronter.</P>
        </>,
    },
    {
        t: "🐆 ACE, le rival", body: <>
            <P>ACE t'attend en ville : défie-le <b>une fois par jour</b>.</P>
            <P>Il se cale sur <b>ton meilleur Daemon</b>, recalibré à chaque combat : <b>facile</b> tes 3 premières fois, puis <b>+2 niveaux</b> au-dessus de toi.</P>
            <P>Le <b>vaincre</b> rapporte un cadeau chaque jour… et un <b>Panthéon</b> à la 12e victoire ! Reste devant en t'entraînant.</P>
        </>,
    },
    {
        t: "🏥 Le Centre Daemon", body: <>
            <P>Le Centre soigne gratuitement toute ton équipe.</P>
            <P>Tu y trouves aussi l'<b>ORDINATEUR (PC)</b> pour ranger tes Daemons, la <b>BIBLIOTHÈQUE</b> (stats des autres dresseurs)…</P>
            <P>…et un <b>étage</b> : monte voir le labo et ses expériences. 🔬</P>
        </>,
    },
]

export default function ParkSignPanel() {
    const idx = useGameStore((s) => s.signOpen)
    const close = useGameStore((s) => s.closeSign)
    if (idx === null) return null
    // UNE fiche par panneau : on affiche UNIQUEMENT le sujet du panneau cliqué.
    // Plus de carrousel/navigation entre les fiches (demande Sartay).
    const cur = TOPICS[((idx % TOPICS.length) + TOPICS.length) % TOPICS.length]
    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>📜 {cur.t}</div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                    {cur.body}
                </div>
                <button onClick={close} style={{ margin: 10, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
