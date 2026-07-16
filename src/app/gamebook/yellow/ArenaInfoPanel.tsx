"use client"

// src/app/gamebook/yellow/ArenaInfoPanel.tsx
//
// CARROUSEL D'INFOS STRATÉGIQUES d'une arène (ouvert par le panneau devant l'entrée). 3 pages :
//   1. Vue d'ensemble : boss, type, niveaux, types RECOMMANDÉS (super-efficaces) et À ÉVITER (résistés).
//   2. Équipe du boss : chaque Daemon (sprite, niveau, types) — le combat décisif.
//   3. Stratégie : conseils (couverture, niveau à viser, alertes).
// Tout est calculé auto par arenaInfo() → correct en run 1 ET run 2 (arènes re-typées).

import { useMemo, useState } from "react"
import { arenaInfo, run3ArenaInfo, type Run3ArenaInfo } from "@/lib/gamebook/yellow/data/arenaInfos"
import type { BadgeId } from "@/lib/gamebook/yellow/data/cts"
import type { PokeType } from "@/lib/gamebook/yellow/battle/types"

const TYPE_META: Record<PokeType, { fr: string; color: string }> = {
    NORMAL: { fr: "Normal", color: "#9a9a7c" }, FEU: { fr: "Feu", color: "#f0803c" }, EAU: { fr: "Eau", color: "#5a90f0" },
    PLANTE: { fr: "Plante", color: "#6ec850" }, ELEC: { fr: "Élec", color: "#f4c62c" }, GLACE: { fr: "Glace", color: "#84d4d4" },
    COMBAT: { fr: "Combat", color: "#c03028" }, POISON: { fr: "Poison", color: "#a040a0" }, SOL: { fr: "Sol", color: "#d8b45c" },
    VOL: { fr: "Vol", color: "#a890f0" }, PSY: { fr: "Psy", color: "#f85888" }, INSECTE: { fr: "Insecte", color: "#9aa81c" },
    ROCHE: { fr: "Roche", color: "#b09030" }, SPECTRE: { fr: "Spectre", color: "#6a5490" }, DRAGON: { fr: "Dragon", color: "#6a38e8" },
    METAL: { fr: "Métal", color: "#8a97a8" },
    TENEBRES: { fr: "Ténèbres", color: "#4a4258" },
    FEE: { fr: "Fée", color: "#e888a4" },
}
const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86", GOLD = "#f1c40f"

function Chip({ t, big }: { t: PokeType; big?: boolean }) {
    const m = TYPE_META[t]
    return <span style={{ background: m.color, color: "#fff", borderRadius: 6, padding: big ? "3px 9px" : "2px 7px", fontSize: big ? 12 : 10.5, fontWeight: 800, textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>{m.fr}</span>
}

function Sprite({ id, name }: { id: string; name: string }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ width: 44, height: 44, background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            {err ? <span style={{ fontWeight: 900, fontSize: 18, color: INK }}>{name[0]}</span>
                : <img src={`/yellow/sprites/dex/${id}.png`} alt={name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

export default function ArenaInfoPanel({ badge, isRun2, isRun3, onClose }: { badge: BadgeId; isRun2: boolean; isRun3?: boolean; onClose: () => void }) {
    const info = useMemo(() => (isRun3 ? run3ArenaInfo(badge) : arenaInfo(badge, isRun2)), [badge, isRun2, isRun3])
    const [page, setPage] = useState(0)
    if (!info) return null
    const r3 = isRun3 ? (info as Run3ArenaInfo) : null
    const go = (d: number) => setPage((p) => Math.max(0, Math.min(2, p + d)))

    const pageOverview = r3 ? (
        <div style={S.body}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{r3.bossTitle} <span style={{ color: "#8a4bd0" }}>· RUN 3</span></div>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700, marginTop: 2 }}>Boss : l'équipe de <b style={{ fontSize: 16 }}>{r3.bossPlayer}</b> 🧑</div>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700, marginTop: 3 }}>Niveaux <b>{info.levelMin}–{info.levelMax}</b> · victoire → <b style={{ color: "#1e8449" }}>+{r3.energyPalier}⚡</b></div>
            </div>
            <div style={S.block}>
                <div style={{ ...S.blockTitle }}>🛡️ GARDIENS : <span style={{ color: "#8a4bd0" }}>{r3.guardType}</span> {r3.guardTypes.map((t) => <Chip key={t} t={t} />)}</div>
                <div style={{ ...S.blockTitle, color: "#1e8449", fontSize: 11 }}>⚔️ frappe-les avec</div>
                <div style={S.chipRow}>{r3.guardRecommend.length ? r3.guardRecommend.map((t) => <Chip key={t} t={t} />) : <span style={S.muted}>Type varié — pas de faille commune.</span>}</div>
            </div>
            <div style={S.block}>
                <div style={{ ...S.blockTitle, color: "#1e8449" }}>⚔️ CONTRE LE BOSS ({r3.bossPlayer}) — types qui touchent le +</div>
                <div style={S.chipRow}>{r3.bossBestTypes.length ? r3.bossBestTypes.map((t) => <Chip key={t} t={t} />) : <span style={S.muted}>Équipe très variée — prévois de la couverture.</span>}</div>
            </div>
        </div>
    ) : (
        <div style={S.body}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{info.bossTitle}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: INK, margin: "2px 0 4px" }}>{info.bossName}</div>
                <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 6 }}>{info.themeTypes.map((t) => <Chip key={t} t={t} big />)}</div>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>Niveaux <b>{info.levelMin}–{info.levelMax}</b>{isRun2 && <span style={{ color: "#c0392b" }}> · RUN 2 (re-typé !)</span>}</div>
            </div>
            <div style={S.block}>
                <div style={{ ...S.blockTitle, color: "#1e8449" }}>⚔️ AMÈNE ça (super-efficace)</div>
                <div style={S.chipRow}>{info.recommend.length ? info.recommend.map((t) => <Chip key={t} t={t} />) : <span style={S.muted}>Rien de super-efficace — combat neutre.</span>}</div>
            </div>
            <div style={S.block}>
                <div style={{ ...S.blockTitle, color: "#c0392b" }}>🛡️ ÉVITE ça (résisté)</div>
                <div style={S.chipRow}>{info.avoid.length ? info.avoid.map((t) => <Chip key={t} t={t} />) : <span style={S.muted}>Aucun type particulièrement résisté.</span>}</div>
            </div>
        </div>
    )

    const pageTeam = (
        <div style={S.body}>
            <div style={S.blockTitle}>{r3 ? `ÉQUIPE FIGÉE DE ${r3.bossPlayer.toUpperCase()} 🧑 (${info.team.length})` : `ÉQUIPE DU BOSS (${info.team.length})`}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {info.team.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: m.isBoss ? "#fff3d0" : "#fff8e8", border: `2px solid ${m.isBoss ? GOLD : DARK}`, borderRadius: 8, padding: 6 }}>
                        <Sprite id={m.speciesId} name={m.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: INK }}>{m.name} <span style={{ fontWeight: 600, opacity: 0.7 }}>N{m.level}</span></div>
                            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>{m.types.map((t) => <Chip key={t} t={t} />)}</div>
                        </div>
                        {i === info.team.length - 1 && <span style={{ fontSize: 10, fontWeight: 800, color: "#c0392b" }}>ACE</span>}
                    </div>
                ))}
            </div>
            <div style={{ ...S.muted, marginTop: 6 }}>{r3 ? `+ ${info.guardCount} gardiens ${r3.guardType} à battre avant le boss.` : `+ ${info.guardCount} gardes à battre avant le boss.`}</div>
        </div>
    )

    const pageStrat = r3 ? (
        <div style={S.body}>
            <div style={S.blockTitle}>🧠 STRATÉGIE — RUN 3</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: INK, lineHeight: 1.55, fontWeight: 600 }}>
                <li>Les <b>gardiens</b> sont de type <b style={{ color: "#8a4bd0" }}>{r3.guardType}</b> : frappe-les avec {r3.guardRecommend.map((t) => TYPE_META[t].fr).join("/") || "de la couverture variée"}.</li>
                <li>Le <b>boss</b>, c'est l'équipe RÉELLE de <b>{r3.bossPlayer}</b> (variée !) : {r3.bossBestTypes.length ? <>tes meilleures armes = <b>{r3.bossBestTypes.map((t) => TYPE_META[t].fr).join("/")}</b>.</> : <>prévois de la couverture large.</>}</li>
                <li style={{ color: "#b8860b" }}>⚡ <b>Énergie = ta vie du run.</b> Chaque attaque coûte, et tu n'as QUE tes 500 + les paliers ({r3.energyPalier}⚡ à la victoire ici). Pas de casino, pas de reps : <b>sois efficace, gaspille rien.</b></li>
                <li>🏆 Chaque Daemon ennemi <b>vaincu</b> ajoute son niveau à ton <b>score</b> (arène + Ligue). Va le plus loin possible avant de tomber à 0⚡.</li>
                <li>Vise des Daemons <b>niveau ~{info.levelMax}+</b> pour ne pas te faire distancer par ce boss.</li>
            </ul>
        </div>
    ) : (
        <div style={S.body}>
            <div style={S.blockTitle}>🧠 STRATÉGIE</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: INK, lineHeight: 1.55, fontWeight: 600 }}>
                <li>Monte une équipe autour des types <b>recommandés</b> ({info.recommend.map((t) => TYPE_META[t].fr).join(", ") || "—"}) : ils frappent l'ACE ({info.bossName}) en super-efficace.</li>
                <li>Vise des Daemons <b>niveau ~{info.levelMax}</b> (le plus haut de l'arène) pour ne pas te faire distancer.</li>
                <li>Prévois de la <b>couverture</b> : les {info.guardCount} gardes varient les types — un mono-type risque de coincer.</li>
                {info.avoid.length > 0 && <li>Laisse au PC les attaquants <b>{info.avoid.map((t) => TYPE_META[t].fr).join("/")}</b> : l'ACE les encaisse.</li>}
                {isRun2 && <li style={{ color: "#c0392b" }}><b>RUN 2 :</b> l'arène est <b>re-typée</b> — oublie tes réflexes du run 1, refais ton analyse !</li>}
            </ul>
        </div>
    )

    const pages = [pageOverview, pageTeam, pageStrat]
    const titles = ["VUE D'ENSEMBLE", "ÉQUIPE", "STRATÉGIE"]

    return (
        <div style={S.overlay} onClick={(e) => e.stopPropagation()}>
            <div style={S.box}>
                <div style={S.header}>🏛️ INFOS ARÈNE <span style={{ fontSize: 10, opacity: 0.7 }}>{titles[page]}</span></div>
                {pages[page]}
                <div style={S.nav}>
                    <button style={{ ...S.arrow, opacity: page === 0 ? 0.3 : 1 }} disabled={page === 0} onClick={() => go(-1)}>◀</button>
                    <div style={{ display: "flex", gap: 6 }}>{pages.map((_, i) => <span key={i} onClick={() => setPage(i)} style={{ width: 9, height: 9, borderRadius: "50%", background: i === page ? INK : DARK, cursor: "pointer" }} />)}</div>
                    <button style={{ ...S.arrow, opacity: page === 2 ? 0.3 : 1 }} disabled={page === 2} onClick={() => go(1)}>▶</button>
                </div>
                <button style={S.close} onClick={onClose}>Fermer (B)</button>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.68)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 86, padding: 12 },
    box: { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 390, maxHeight: "92%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif", overflow: "hidden" },
    header: { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 13, background: GOLD, display: "flex", justifyContent: "space-between", alignItems: "center" },
    body: { padding: 14, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 },
    block: { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: "8px 10px" },
    blockTitle: { fontSize: 12, fontWeight: 900, color: INK, marginBottom: 5, letterSpacing: 0.3 },
    chipRow: { display: "flex", gap: 5, flexWrap: "wrap" },
    muted: { fontSize: 11.5, color: "#8a7a55", fontWeight: 600 },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", borderTop: `2px solid ${DARK}` },
    arrow: { background: "none", border: "none", fontSize: 20, color: INK, cursor: "pointer", fontWeight: 900 },
    close: { margin: 10, marginTop: 0, padding: "10px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" },
}
