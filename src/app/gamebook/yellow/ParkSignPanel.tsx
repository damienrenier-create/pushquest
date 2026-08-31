"use client"

// Nexus Jaune Éclair — MANUEL DU DRESSEUR : pop-up riche ouvert par les panneaux
// du parc (Route Nord). Chaque panneau ouvre SON sujet (signOpen = index), et on
// peut feuilleter les autres avec ◀ ▶ / swipe. Privilégie la QUALITÉ de l'info.

import { useEffect, type ReactNode } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { recordCalepinTip } from "@/lib/gamebook/yellow/store/calepinStore"
import { getCurrentPlayerId, getActiveWorld, getReplayRun, getGameMode, modeFillAmount } from "@/lib/gamebook/yellow/store/playerStore"
import { POKE_TYPES, type PokeType } from "@/lib/gamebook/yellow/battle/types"
import { typeMultiplier } from "@/lib/gamebook/yellow/battle/typeChart"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

function P({ children }: { children: ReactNode }) {
    return <p style={{ fontSize: 12.5, lineHeight: 1.55, color: INK, margin: "0 0 9px" }}>{children}</p>
}

const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", margin: "2px 0 10px", fontSize: 12 }
const th: React.CSSProperties = { background: INK, color: CREAM, padding: "4px 6px", fontSize: 11, textAlign: "center" }
const td: React.CSSProperties = { border: `1px solid ${DARK}`, padding: "4px 6px", textAlign: "center", color: INK }

function CapturePage() {
    const fun = getGameMode() === "fun"
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
            <P>D'abord <b>affaiblis</b> : à PV pleins, <b>40% max</b> (le 100% est impossible tant qu'il est en pleine forme). Sous <b>1/3 de vie</b>, le <b>100%</b> devient possible. Chaque ball ratée <b>facilite</b> le lancer suivant.</P>
            <P>Chaque ball est taillée pour les <b>communs</b> jusqu'à un niveau (à 1/3 de vie) :</P>
            <table style={tbl}>
                <thead><tr><th style={th}>Ball</th><th style={th}>Communs jusqu'au…</th></tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ ...td, fontWeight: j === 0 ? 700 : 400 }}>{c}</td>)}</tr>)}</tbody>
            </table>
            <P>Les <b>peu communs / rares</b> et les <b>hauts niveaux</b> sont plus durs → monte d'une ball, ou affaiblis encore plus.</P>
            <P>➕ <b>Statut</b> : Sommeil/Gel <b>×2,5</b>, Poison/Para/Brûlure <b>×1,5</b>. {!fun && <><b>Quota</b> du jour atteint : <b>×1,3</b>. </>}<b>Master-Éclair</b> : infaillible.</P>
            {fun && <P>🎉 <b>Mode fun</b> : pas de bonus quota. En revanche, <b>plus les IV du sauvage sont hauts, plus il résiste</b> — un beau spécimen se mérite (monte d'une ball ou affaiblis-le à fond).</P>}
        </>
    )
}

// Libellé FR + emoji de chaque type (source d'affichage unique du panneau).
const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace",
    COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte",
    ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée", METAL: "Acier", TENEBRES: "Ténèbres",
}
const TYPE_EMOJI: Record<PokeType, string> = {
    NORMAL: "⚪", FEU: "🔥", EAU: "💧", PLANTE: "🌿", ELEC: "⚡", GLACE: "❄️",
    COMBAT: "🥊", POISON: "☠️", SOL: "🌍", VOL: "🦅", PSY: "🔮", INSECTE: "🐛",
    ROCHE: "🪨", SPECTRE: "👻", DRAGON: "🐉", FEE: "🧚", METAL: "⚙️", TENEBRES: "🌑",
}

/** Numéro du run EN COURS (monde actif). Sert à ne montrer QUE les types réellement présents. */
function currentRunNo(): 1 | 2 | 3 {
    const w = getActiveWorld()
    if (w === "run3") return 3
    if (w === "ngplus") return 2
    if (w === "replay") { const r = getReplayRun(); return r === "run3" ? 3 : r === "run2" ? 2 : 1 }
    return 1
}
/** Types RÉELLEMENT présents selon le run : la FÉE arrive au run 2 (Ukognos), l'ACIER et les TÉNÈBRES au run 3.
 *  → en run 1 la table n'affiche JAMAIS Fée / Acier / Ténèbres (ils y sont absents). Data-driven (aucune valeur en dur). */
function availableTypes(): PokeType[] {
    const run = currentRunNo()
    return POKE_TYPES.filter((t) => (t === "FEE" ? run >= 2 : (t === "METAL" || t === "TENEBRES") ? run >= 3 : true))
}

function TypesPage() {
    const types = availableTypes()
    // « Qui bat qui » CALCULÉ depuis la vraie table du moteur (typeMultiplier === 2), bornée aux types du run courant.
    const rows = types
        .map((atk) => ({ atk, targets: types.filter((d) => typeMultiplier(atk, d) === 2) }))
        .filter((r) => r.targets.length > 0)
    return (
        <>
            <P>Frappe avec un type <b>super efficace</b> (×2) pour doubler tes dégâts. Qui bat qui :</P>
            <table style={tbl}>
                <thead><tr><th style={th}>Type</th><th style={{ ...th, textAlign: "left" }}>super efficace contre</th></tr></thead>
                <tbody>{rows.map(({ atk, targets }) => (
                    <tr key={atk}>
                        <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{TYPE_EMOJI[atk]} {TYPE_FR[atk]}</td>
                        <td style={{ ...td, textAlign: "left" }}>{targets.map((t) => TYPE_FR[t]).join(" · ")}</td>
                    </tr>
                ))}</tbody>
            </table>
            <P>Un type <b>×2</b> superposé (ex. cible Roche/Sol) = <b>×4</b> ! Garde une équipe variée.</P>
        </>
    )
}

// L'ÉNERGIE dépend du RUN et du MODE : run 3 = don fixe + recharges d'arène (les vraies reps ne créditent PAS,
//   elles servent les points Saiyan) ; easy/debutant = réserve à remplissages découplée des reps ; run 1/2 normal
//   & fun = les vraies reps DEVIENNENT l'énergie. On affiche donc la bonne explication selon le contexte réel.
function EnergyPage() {
    const run = currentRunNo()
    const mode = getGameMode()
    if (run >= 3) {
        return (
            <>
                <P>En <b>concours (run 3)</b>, ton énergie ne se recharge <b>pas</b> toute seule : tu démarres avec <b>500⚡</b> et chaque <b>arène vaincue</b> te recharge (jusqu'à 1000).</P>
                {/* La ligne « vraies répétitions → points Saiyan » n'a de sens qu'en muscu : masquée en mode fun (aucune rep). */}
                {mode !== "fun" && <P>Ici, tes vraies répétitions servent tes <b>points Saiyan</b> (entraînement) — pas tes munitions.</P>}
                <P>Chaque attaque coûte de l'énergie ; une <i>Charge Désespérée</i> gratuite reste dispo à sec.</P>
            </>
        )
    }
    if (mode === "fun") {
        // MODE FUN : pas de pompes à encoder → l'énergie vient des DÉFIS (labo), plus des reps.
        return (
            <>
                <P>🎉 En <b>mode fun</b>, pas de pompes à encoder : ton énergie de combat vient des <b>DÉFIS</b> (onglet <b>« 🎉 Défis »</b> du labo, à l'étage).</P>
                <P><b>Démarrage offert</b> : 1000⚡ + 10 Nexus-Ball. Ensuite tu recharges via <b>Blitz d'arène</b> (100→300⚡), <b>Sprint de capture</b> (50×N⚡) et le <b>Pokémon du jour</b> (20-100⚡). Le <b>Prof. Chen</b> à l'étage offre aussi 2 cadeaux.</P>
                <P>Chaque combat t'ouvre une <b>réserve</b> d'énergie qui <b>grandit avec tes badges</b> (200 +150 par badge) ; une <i>Charge Désespérée</i> gratuite reste dispo à sec.</P>
            </>
        )
    }
    if (mode === "easy" || mode === "debutant") {
        return (
            <>
                <P>Ton énergie est une <b>réserve</b> (pas tes vraies reps) : <b>{modeFillAmount()}⚡</b> au départ, <b>rechargée</b> automatiquement quand tu tombes à sec — tant qu'il te reste des recharges.</P>
                <P>Chaque attaque coûte de l'énergie ; une <i>Charge Désespérée</i> gratuite reste dispo à sec.</P>
            </>
        )
    }
    return (
        <>
            <P>Tes <b>vraies répétitions PushQuest</b> deviennent ton <b>énergie</b> de combat.</P>
            <P>Chaque attaque coûte des reps (selon sa puissance) : pas de sport, pas de munitions. Une <i>Charge Désespérée</i> gratuite reste dispo à sec.</P>
            <P>Toutes les reps faites aujourd'hui sont <b>jouables immédiatement</b> — même celles des jours non joués s'accumulent.</P>
        </>
    )
}

// 🏆 « Le quota du jour » : en normal, le quota reps récompense les combats sauvages. En FUN (pas de quota), on
//   explique plutôt la ROTATION par heure/jour et les IV tirés AU HASARD (+ la cible du jour pour viser la rareté).
function QuotaPage() {
    if (getGameMode() === "fun") {
        return (
            <>
                <P>🎉 <b>Pas de quota</b> en mode fun. À la place, les sauvages <b>tournent selon l'HEURE et le JOUR</b> :</P>
                <P>• Chaque <b>créneau</b> met un groupe de <b>types</b> à l'honneur (🌅 Plante/Insecte/Vol · ☀️ Normal/Combat/Sol/Roche · 🌤️ Eau/Élec/Métal · 🌆 Feu/Dragon/Psy · 🌙 Spectre/Poison/Ténèbres/Glace/Fée). Ces types popent un peu plus dans leur fenêtre — <b>les autres restent présents</b>.<br />• Les <b>hautes herbes</b> renouvellent aussi leurs espèces <b>chaque jour</b>.</P>
                <P>Leurs <b>IV sont tirés AU HASARD</b> (aucun bonus d'effort) : l'IV moyen est le plus fréquent, un beau ou un mauvais est rare, un <b>PARFAIT</b> très rare → <b>enchaîne les rencontres</b> pour tomber sur la perle. À <b>plusieurs en ligne</b>, la chance d'excellents IV grimpe (chasse groupée) !</P>
                <P>Pour <b>viser la rareté</b> : le <b>Pokémon du jour</b> (onglet « 🎉 Défis » du labo) te désigne une cible qui rapporte des ⚡.</P>
            </>
        )
    }
    return (
        <>
            <P>Atteins ton <b>quota quotidien</b> et la nature te récompense en combat sauvage :</P>
            <P>• captures <b>facilitées</b> (×1,3)<br />• Daemons plus <b>rares</b> dans les herbes</P>
            <P><b>Dépasse</b> ton quota pour des potentiels génétiques (IV) encore meilleurs sur les sauvages.</P>
        </>
    )
}

export const TOPICS: { t: string; body: ReactNode }[] = [
    { t: "🎯 Capturer un Daemon", body: <CapturePage /> },
    { t: "⚡ Reps → Énergie", body: <EnergyPage /> },
    { t: "🏆 Le quota du jour", body: <QuotaPage /> },
    { t: "⚔️ Table des types", body: <TypesPage /> },
    {
        t: "📊 Niveau de l'équipe", body: <>
            <P>Avant le badge <b>Roche</b>, les Daemons sauvages se calent sur ton Daemon de <b>tête</b> (le 1er de l'équipe) ; ensuite, sur la <b>moyenne</b> de ton équipe.</P>
            <P>Chaque <b>badge d'arène</b> relève le <b>plafond</b> de niveau des sauvages : <b>12 → 17 → 30 → 45 → 60</b>. Tes tout premiers combats sont volontairement plus doux.</P>
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
            <P><b>Exemple :</b> <i>Flammèche</i> (Feu) brûle 10% du temps — <b>Braisille</b> l'apprend au <b>niveau 6</b>, <b>Fennaise</b> au <b>niveau 7</b>.</P>
            <P>Poison &amp; brûlure rongent l'ennemi chaque tour ; <b>sommeil</b> et <b>gel</b> l'empêchent vraiment d'agir, la <b>paralysie</b> le ralentit et le fait parfois rater son tour. De quoi gagner sans (trop) prendre de coups.</P>
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
            <P>Quand il veut en apprendre une 5e (niveau ou CT), un pop-up te le propose — mais il ne te <b>force</b> plus : bouton <b>« Plus tard »</b> et l'attaque t'attend dans sa <b>FICHE</b>, à traiter quand tu veux (tu choisis quelle attaque remplacer).</P>
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
            <P>ACE t'attend en ville : tu peux le <b>battre une fois par jour</b> (mais retente librement si tu perds).</P>
            <P>Il se cale sur la <b>moyenne de ton équipe +2</b>, en <b>cliquet</b> : son niveau est <b>figé entre deux défaites</b> et ne grimpe qu'<b>après</b> l'avoir battu — jamais parce que TON équipe monte. 1re rencontre un poil plus douce.</P>
            <P>Le <b>vaincre</b> rapporte un cadeau à chaque victoire… jusqu'à la <b>7e</b>, où il te lègue un <b>Panthéon</b> ! Ensuite plus de cadeau, mais reviens le battre.</P>
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

// THÈME de chaque astuce (pour trier/regrouper le Calepin & le Manuel). Clé = titre exact du TOPIC.
export const TOPIC_CAT: Record<string, string> = {
    "🎯 Capturer un Daemon": "Capture",
    "⚡ Reps → Énergie": "Ressources",
    "🏆 Le quota du jour": "Ressources",
    "⚔️ Table des types": "Combat",
    "☠️ Les attaques de statut": "Combat",
    "⬆️ Renforcement (buffs)": "Combat",
    "🏃 La fuite": "Combat",
    "📊 Niveau de l'équipe": "Progression",
    "📈 Le partage d'XP": "Progression",
    "🎓 Apprendre des attaques": "Progression",
    "🐆 ACE, le rival": "Monde & PNJ",
    "🏥 Le Centre Daemon": "Monde & PNJ",
}
export const topicCat = (title: string): string => TOPIC_CAT[title] ?? "Divers"

export default function ParkSignPanel() {
    const idx = useGameStore((s) => s.signOpen)
    const close = useGameStore((s) => s.closeSign)
    // CALEPIN : consigne l'astuce dès qu'on lit le panneau (le carnet la gardera, annotable, à relire au calme).
    useEffect(() => {
        if (idx === null) return
        recordCalepinTip(getCurrentPlayerId(), TOPICS[((idx % TOPICS.length) + TOPICS.length) % TOPICS.length].t)
    }, [idx])
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
