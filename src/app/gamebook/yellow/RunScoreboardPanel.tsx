"use client"

// LEADERBOARD des CONCOURS — consultable depuis le PALMARÈS. Onglets : RUN 1 (Σ points de hauts faits, visible
// dès le run 1) · RUN 2 (note /1000) · RUN 3 « Conquérant » (Σ niveaux vaincus) · SURVIE « Survivant » (Σ énergie
// restante) · DUELS (réputation PvP + top-5). Chaque ligne d'un classement de run est CLIQUABLE → profil des hauts
// faits du joueur (PlayerBadgesModal). Top 10 + TA ligne toujours affichée. Lecture seule.

import { useEffect, useState } from "react"
import { type ScoreFactor } from "@/lib/gamebook/yellow/score/runScore"
import { getPlayer } from "@/lib/gamebook/yellow/store/playerStore"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import PlayerBadgesModal from "./PlayerBadgesModal"

interface ScoreRow { userId?: string; me?: boolean; nickname: string; score: number; wonAt: string | null; factors?: ScoreFactor[] | null; live?: boolean; leagueReps?: number }
interface FusionChamp { userId: string; nickname: string; wonAt: string; tier: string }
type TabId = "run1" | "run2" | "run3" | "run3energy" | "duels" | "run4"
type Data = { run1: ScoreRow[]; run2: ScoreRow[]; run3: ScoreRow[]; run3energy: ScoreRow[]; duels: { nickname: string; wins: number }[] }

const RUN_META: { id: TabId; label: string; unit: string; hint: string }[] = [
    { id: "run1", label: "🥇 RUN 1", unit: "pts", hint: "DÉCOUVERTE : Σ des points de HAUTS FAITS débloqués au run 1. Le + haut gagne. Clique une ligne pour voir les trophées d'un joueur." },
    { id: "run2", label: "🏅 RUN 2", unit: "/1000", hint: "PERFORMANCE (note /1000) : Pokédex (×500) + % de victoire (×300) + niveaux d'équipe (×200). Score live tant qu'on est en run 2, figé une fois terminé. Clique 👤 pour le profil, la ligne pour le détail des axes." },
    { id: "run3", label: "🏆 RUN 3", unit: "niv.", hint: "CONQUÉRANT : Σ des NIVEAUX de tous les Daemons ennemis vaincus (chefs d'arène + Ligue). Plus tu vas loin et bats des équipes hautes, plus ton score grimpe. Clique une ligne pour le profil." },
    { id: "run3energy", label: "🔋 SURVIE", unit: "⚡", hint: "SURVIVANT : à la fin de CHAQUE arène (et de la Ligue) on relève ton énergie RESTANTE, et on additionne. Récompense l'efficacité — moins tu dépenses, plus il t'en reste. C'est le 2ᵉ score du run 3." },
    { id: "duels", label: "⚔️ DUELS", unit: "reflets", hint: "RÉPUTATION PvP : ton bilan de duels, tes Daemons/attaques fétiches, et le classement du DUELLISTE (reflets d'autres joueurs battus, cumul tous runs)." },
    { id: "run4", label: "🐉 LIGUE", unit: "", hint: "LIGUE DE FUSION — l'ULTIME épreuve. Les Maîtres de la Chimère, classés par palier (Or > Argent > Bronze) puis par ANCIENNETÉ du sacre : le PREMIER à vaincre le Dieu Spaghetti trône en tête. Personne encore ? Sois-le ! 🐉" },
]

const TIER_RANK: Record<string, number> = { or: 3, argent: 2, bronze: 1 }
const TIER_LABEL: Record<string, string> = { or: "🥇 OR", argent: "🥈 ARGENT", bronze: "🥉 BRONZE" }

const topN = (rec: Record<string, number> | undefined, n: number): [string, number][] =>
    Object.entries(rec ?? {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n)

export default function RunScoreboardPanel({ close, hasRun2, hasRun3 }: { close: () => void; hasRun2: boolean; hasRun3: boolean }) {
    // ANTI-SPOILER : un joueur encore en run 1 ne voit que RUN 1 + DUELS (les duels/reflets existent dès le run 1).
    //   Les onglets RUN 2 / RUN 3 / SURVIE n'apparaissent qu'une fois le run correspondant atteint — sinon leur seule
    //   présence révélerait l'existence des runs suivants. Le serveur renvoie de toute façon ces listes vides ici.
    const tabs = RUN_META.filter((m) =>
        m.id === "run1" || m.id === "duels" || (m.id === "run2" && hasRun2) || ((m.id === "run3" || m.id === "run3energy") && hasRun3) || (m.id === "run4" && hasRun3))
    const [state, setState] = useState<"loading" | "ok" | "error">("loading")
    const [data, setData] = useState<Data>({ run1: [], run2: [], run3: [], run3energy: [], duels: [] })
    const [fusion, setFusion] = useState<FusionChamp[]>([]) // RUN 4 / LIGUE : sacres de la Ligue de Fusion (Hall of Fame partagé)
    const [firsts, setFirsts] = useState<Record<string, { userId: string; nickname: string }>>({}) // 🥇 1ers du groupe (feat-first)
    const [tab, setTab] = useState<TabId>("run1")
    const [expanded, setExpanded] = useState<string | null>(null) // RUN 2 : userId de l'entrée dépliée (détail des axes)
    const [profile, setProfile] = useState<{ userId: string; nickname: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const [r, rf, rff] = await Promise.all([
                    fetch("/api/gamebook/yellow/run-scores"),
                    fetch("/api/gamebook/yellow/fusion-hall-of-fame"),
                    fetch("/api/gamebook/yellow/feat-first"),
                ])
                const j = r.ok ? await r.json() : null
                const jf = rf.ok ? await rf.json() : null
                const jff = rff.ok ? await rff.json() : null
                if (cancelled) return
                setData({ run1: j?.run1 ?? [], run2: j?.run2 ?? [], run3: j?.run3 ?? [], run3energy: j?.run3energy ?? [], duels: j?.duels ?? [] })
                setFusion(Array.isArray(jf?.champions) ? jf.champions : [])
                setFirsts(jff?.holders && typeof jff.holders === "object" ? jff.holders : {})
                setState("ok")
            } catch { if (!cancelled) setState("error") }
        })()
        return () => { cancelled = true }
    }, [])

    const meta = RUN_META.find((m) => m.id === tab)!
    const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`)

    // Classement du run courant : TOP 10 + ta propre ligne toujours affichée (même hors top 10).
    const fullList: ScoreRow[] = tab === "run1" ? data.run1 : tab === "run2" ? data.run2 : tab === "run3" ? data.run3 : tab === "run3energy" ? data.run3energy : []
    const top = fullList.slice(0, 10)
    const myIdx = fullList.findIndex((r) => r.me)
    const showMineApart = myIdx >= 10

    const openProfile = (r: ScoreRow) => { if (r.userId) setProfile({ userId: r.userId, nickname: r.nickname }) }

    const renderRow = (r: ScoreRow, rankIdx: number) => {
        const canExpand = tab === "run2" && Array.isArray(r.factors) && r.factors!.length > 0
        const clickable = !!r.userId
        // Clé d'expand UNIQUE par ligne : un joueur en rejeu a 2 lignes run 2 (original + « ² ») avec le MÊME userId
        //   → utiliser userId seul déplierait les deux. Le pseudo (« Bob » vs « Bob² ») les désambiguïse.
        const rowKey = `${r.userId ?? ""}::${r.nickname}`
        const open = expanded === rowKey
        return (
            <div key={`${rowKey}-${rankIdx}`}>
                <div style={{ ...row, background: r.me ? "rgba(79,214,208,0.14)" : rankIdx < 3 ? "rgba(255,213,74,0.10)" : "rgba(255,255,255,0.05)", border: r.me ? "1px solid rgba(79,214,208,0.5)" : "1px solid transparent", cursor: canExpand || clickable ? "pointer" : "default" }}
                    onClick={() => { if (canExpand) setExpanded(open ? null : rowKey); else openProfile(r) }}>
                    <span style={rank}>{medal(rankIdx)}</span>
                    <span style={name}>{r.nickname}{r.me ? " ★" : ""}</span>
                    {r.live !== undefined && (
                        <span title={r.live ? "score en direct (joueur encore dans le run)" : "score figé (run terminé)"}
                            style={{ fontSize: 8.5, opacity: 0.7, marginRight: 2, whiteSpace: "nowrap" }}>{r.live ? "🟢" : "⚪"}</span>
                    )}
                    <span style={score}>{r.score.toLocaleString("fr-FR")} <span style={unit}>{meta.unit}</span></span>
                    {canExpand && clickable && (
                        <button style={profBtn} title="Voir le profil" onClick={(e) => { e.stopPropagation(); openProfile(r) }}>👤</button>
                    )}
                    {canExpand ? <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 2 }}>{open ? "▾" : "▸"}</span>
                        : clickable ? <span style={{ opacity: 0.4, fontSize: 12, marginLeft: 2 }}>›</span> : null}
                </div>
                {canExpand && open && (
                    <div style={factorsBox}>
                        <div style={{ fontSize: 8.5, opacity: 0.6, lineHeight: 1.4, marginBottom: 2 }}>Critères pondérés (poids après « / »), additionnés → note /1000.</div>
                        {r.factors!.filter((f) => f.key !== "frugality" && f.key !== "steps").map((f) => (
                            f.max <= 0 ? (
                                <div key={f.key} style={{ fontSize: 10.5, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: 0.9, borderTop: "1px dashed rgba(255,255,255,0.14)", paddingTop: 4, marginTop: 1 }}>
                                    <span>{f.label}</span>
                                    <span style={{ opacity: 0.9, fontVariantNumeric: "tabular-nums" }}><b>{(f.points ?? 0).toLocaleString("fr-FR")}</b> <span style={{ fontSize: 8.5, opacity: 0.6 }}>reps</span></span>
                                </div>
                            ) : (
                                <div key={f.key} style={{ fontSize: 10.5 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>{f.label}</span>
                                        <span style={{ opacity: 0.85 }}><b>{f.points}</b> / {f.max}</span>
                                    </div>
                                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden", margin: "2px 0 1px" }}>
                                        <div style={{ width: `${Math.round((f.ratio ?? 0) * 100)}%`, height: "100%", background: "#ffe36b" }} />
                                    </div>
                                    <div style={{ fontSize: 8.5, opacity: 0.55 }}>{f.detail}</div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={titleStyle}>📊 CLASSEMENT DES CONCOURS</div>

                <div style={tabsRow}>
                    {tabs.map((m) => (
                        <button key={m.id} onClick={() => { setTab(m.id); setExpanded(null) }}
                            style={{ ...tabBtn, borderColor: tab === m.id ? "#ffd54a" : "rgba(255,255,255,0.15)", background: tab === m.id ? "#ffd54a" : "rgba(255,255,255,0.06)", color: tab === m.id ? "#11121a" : "#fff" }}>
                            {m.label}
                        </button>
                    ))}
                </div>

                <div style={hintStyle}>{meta.hint}</div>

                {tab === "run1" && <Run1RulesBox />}

                {state === "loading" && <div style={muted}>Chargement…</div>}
                {state === "error" && <div style={muted}>Classement indisponible (hors-ligne ?).</div>}

                {/* Onglets de RUN : top 10 + ta ligne */}
                {state === "ok" && tab !== "duels" && tab !== "run4" && (
                    fullList.length === 0
                        ? <div style={muted}>Aucun score {meta.label} pour l&apos;instant.<br />Sois le premier à briller ! {tab === "run1" ? "🥇" : tab === "run3" ? "🏆" : tab === "run3energy" ? "🔋" : "🏅"}</div>
                        : <div style={scroll}>
                            {top.map((r, i) => renderRow(r, i))}
                            {showMineApart && (
                                <>
                                    <div style={{ textAlign: "center", opacity: 0.4, fontSize: 12, padding: "2px 0" }}>⋯</div>
                                    {renderRow(fullList[myIdx], myIdx)}
                                </>
                            )}
                        </div>
                )}

                {/* Onglet DUELS : réputation PvP (local) + top-5 + classement duelliste (serveur) */}
                {state === "ok" && tab === "duels" && <DuelsTab duels={data.duels} />}

                {/* Onglet RUN 4 / LIGUE : 🥇 premières du groupe + Maîtres de la Chimère (Hall of Fame Fusion) */}
                {state === "ok" && tab === "run4" && <Run4Tab champs={fusion} firsts={firsts} />}

                <button style={closeBtn} onClick={close}>← FERMER</button>
            </div>

            {profile && <PlayerBadgesModal userId={profile.userId} nickname={profile.nickname} close={() => setProfile(null)} />}
        </div>
    )
}

/** RUN 1 (DÉCOUVERTE, mode fun) — encart TOUJOURS visible : les RÈGLES + le CALCUL du score gelé. */
function Run1RulesBox() {
    const tiers: [string, number][] = [["⭐", 5], ["⭐⭐", 10], ["⭐⭐⭐", 20], ["⭐⭐⭐⭐", 35], ["⭐⭐⭐⭐⭐", 60], ["💎", 100], ["💎💎", 160], ["💎💎💎", 250]]
    const medals: [string, string][] = [["🥇 OR", "×1,6"], ["🥈 ARGENT", "×1,4"], ["🥉 BRONZE", "×1,2"], ["▫️ normal", "×1"]]
    const sub = { fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: 0.5, opacity: 0.6, margin: "7px 0 3px" }
    const chipRow = { display: "flex", flexWrap: "wrap" as const, gap: 5 }
    const chip = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "2px 7px", fontVariantNumeric: "tabular-nums" as const }
    return (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,213,74,0.35)", borderRadius: 10, padding: "10px 12px", margin: "0 0 10px", fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 800, color: "#ffd54a", marginBottom: 5 }}>🧭 RUN 1 — DÉCOUVERTE · comment se calcule ton score</div>
            <div>Score <b>GELÉ</b> = somme des points de tes badges <b>obtenus avant Sylvebarbe</b>. Points d&apos;un badge = <b>palier × médaille</b>.</div>
            <div style={sub}>Palier — difficulté</div>
            <div style={chipRow}>{tiers.map(([e, p]) => <span key={e} style={chip}>{e} <b>{p}</b></span>)}</div>
            <div style={sub}>Médaille — RAPIDITÉ (course entre funs)</div>
            <div style={chipRow}>{medals.map(([e, m]) => <span key={e} style={chip}>{e} <b>{m}</b></span>)}</div>
            <div style={{ marginTop: 7 }}>⚡ Le <b>1ᵉʳ</b> fun à débloquer un badge décroche l&apos;<b>OR</b> — plus tu es rapide, plus tu marques. Classement <b>perso</b> + <b>par clan</b> (somme des points des membres).</div>
        </div>
    )
}

/** Onglet DUELS : bilan PvP perso + Daemon/attaque fétiches + 3 top-5 (données LOCALES) puis classement DUELLISTE. */
function DuelsTab({ duels }: { duels: { nickname: string; wins: number }[] }) {
    const pvp = getPlayer().pvpStats
    const total = pvp.wins + pvp.losses
    const winrate = total > 0 ? Math.round((pvp.wins / total) * 100) : 0
    const spName = (id: string) => getSpecies(id)?.name ?? id
    const mvName = (id: string) => getMove(id)?.name ?? id
    const usedTop = topN(pvp.daemonUse, 5)
    const dmgTop = topN(pvp.dmgByDaemon, 5)
    const moveTop = topN(pvp.moveUse, 5)
    const duelsTop = duels.slice(0, 10)

    // Helper de rendu (PAS un composant → appelé comme une fonction, jamais <TopList/>, pour éviter la remontée d'état).
    const renderTopList = (title: string, rows: [string, number][], fmt: (id: string) => string, valFmt: (v: number) => string) => (
        <div style={{ marginBottom: 12 }}>
            <div style={sectionTitle}>{title}</div>
            {rows.length === 0 ? <div style={{ fontSize: 10.5, opacity: 0.5, padding: "2px 2px" }}>—</div>
                : rows.map(([id, v], i) => (
                    <div key={id} style={miniRow}>
                        <span style={{ width: 16, opacity: 0.6, fontSize: 11 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(id)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#ffe36b", fontVariantNumeric: "tabular-nums" }}>{valFmt(v)}</span>
                    </div>
                ))}
        </div>
    )

    return (
        <div style={scroll}>
            {/* Bilan */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[["Victoires", pvp.wins, "#4fd6d0"], ["Défaites", pvp.losses, "#ff8a8a"], ["Abandons", pvp.forfeits, "#c3cbdc"], [`${winrate}%`, "ratio", "#ffe36b"]].map(([a, b, c], i) => (
                    <div key={i} style={statCard}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: c as string }}>{typeof b === "number" ? b : a}</div>
                        <div style={{ fontSize: 9, opacity: 0.65 }}>{typeof b === "number" ? a : b}</div>
                    </div>
                ))}
            </div>
            {total === 0 && <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: "4px 0 10px" }}>Aucun duel joué pour l&apos;instant. Va défier les reflets de tes potes ! ⚔️</div>}

            {renderTopList("🐾 Top 5 Daemons les plus utilisés", usedTop, spName, (v) => `${v}×`)}
            {renderTopList("💥 Top 5 Daemons — plus gros dégâts (cumul)", dmgTop, spName, (v) => v.toLocaleString("fr-FR"))}
            {renderTopList("⚡ Top 5 attaques préférées", moveTop, mvName, (v) => `${v}×`)}
            {dmgTop.length === 0 && total > 0 && <div style={{ fontSize: 9.5, opacity: 0.5, marginTop: -6, marginBottom: 10 }}>Les dégâts se comptent à partir de maintenant (nouveau) — rejoue quelques duels pour peupler ce top.</div>}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8 }}>
                <div style={sectionTitle}>🏆 Classement DUELLISTE</div>
                {duelsTop.length === 0 ? <div style={{ fontSize: 11, opacity: 0.6, padding: "4px 2px" }}>Personne n&apos;a encore battu de reflet.</div>
                    : duelsTop.map((d, i) => (
                        <div key={i} style={miniRow}>
                            <span style={{ width: 22, textAlign: "center", fontWeight: 800 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nickname}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#ffe36b" }}>{d.wins} <span style={{ fontSize: 9, opacity: 0.6 }}>reflets</span></span>
                        </div>
                    ))}
            </div>
        </div>
    )
}

const FEAT_FIRST_META: { id: string; label: string }[] = [
    { id: "champion", label: "👑 1er Champion de la Ligue" },
    { id: "fusion_champion", label: "🐉 1er Maître de la Chimère" },
    { id: "catch_ukognofy", label: "✨ 1er à choper Ukognofy" },
    { id: "dome_master", label: "🏛️ 1er Maître du Dôme" },
    { id: "tour_master", label: "🏯 1er Maître de la Tour" },
    { id: "usine_master", label: "🏭 1er Maître de l'Usine" },
]

/** Onglet RUN 4 / LIGUE : 🥇 PREMIÈRES DU GROUPE (course au premier, gravé à vie) + Maîtres de la Chimère classés
 *  par palier (Or>Argent>Bronze) puis par ANCIENNETÉ du sacre (le 1er vainqueur en tête). */
function Run4Tab({ champs, firsts }: { champs: FusionChamp[]; firsts: Record<string, { userId: string; nickname: string }> }) {
    const ranked = champs.slice().sort((a, b) =>
        (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0) || (Date.parse(a.wonAt) - Date.parse(b.wonAt)))
    return (
        <div style={scroll}>
            <div style={sectionTitle}>🥇 PREMIÈRES DU GROUPE</div>
            <div style={{ marginBottom: 12 }}>
                {FEAT_FIRST_META.map((f) => (
                    <div key={f.id} style={miniRow}>
                        <span style={{ flex: 1, fontSize: 11.5 }}>{f.label}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: firsts[f.id] ? "#ffe36b" : "rgba(255,255,255,0.35)" }}>
                            {firsts[f.id] ? `🥇 ${firsts[f.id].nickname}` : "à conquérir…"}
                        </span>
                    </div>
                ))}
            </div>
            <div style={{ ...sectionTitle, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8 }}>🏆 MAÎTRES DE LA CHIMÈRE</div>
            {ranked.length === 0
                ? <div style={{ fontSize: 11, opacity: 0.65, textAlign: "center", padding: "8px 4px", lineHeight: 1.6 }}>Personne n&apos;a encore vaincu la LIGUE DE FUSION.<br />Sois le PREMIER ! 🐉</div>
                : ranked.slice(0, 20).map((c, i) => (
                    <div key={`${c.userId}-${i}`} style={{ ...row, background: i < 3 ? "rgba(255,213,74,0.10)" : "rgba(255,255,255,0.05)" }}>
                        <span style={rank}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                        <span style={name}>{c.nickname}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#ffe36b", whiteSpace: "nowrap" }}>{TIER_LABEL[c.tier] ?? c.tier}</span>
                    </div>
                ))}
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.82)", fontFamily: "inherit" }
const box: React.CSSProperties = { width: "min(420px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#171430", border: "2px solid #ffd54a", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(255,213,74,.25)" }
const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#ffd54a", textAlign: "center", letterSpacing: 1, marginBottom: 10 }
const tabsRow: React.CSSProperties = { display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }
const tabBtn: React.CSSProperties = { flex: "1 1 auto", padding: "6px 4px", border: "1.5px solid", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 10.5, whiteSpace: "nowrap" }
const hintStyle: React.CSSProperties = { fontSize: 9.5, opacity: 0.65, textAlign: "center", lineHeight: 1.4, marginBottom: 10 }
const muted: React.CSSProperties = { fontSize: 12, opacity: 0.75, textAlign: "center", padding: "16px 8px", lineHeight: 1.6 }
const scroll: React.CSSProperties = { overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "8px 10px" }
const factorsBox: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, margin: "1px 0 5px", padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }
const rank: React.CSSProperties = { fontSize: 14, fontWeight: 800, width: 30, textAlign: "center" }
const name: React.CSSProperties = { flex: 1, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const score: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "#ffe36b", fontVariantNumeric: "tabular-nums" }
const unit: React.CSSProperties = { fontSize: 10, opacity: 0.7, fontWeight: 600 }
const profBtn: React.CSSProperties = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, cursor: "pointer", fontSize: 12, padding: "1px 5px", lineHeight: 1.4 }
const closeBtn: React.CSSProperties = { marginTop: 12, padding: "10px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer" }
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "#ffd54a", marginBottom: 5, letterSpacing: 0.3 }
const miniRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }
const statCard: React.CSSProperties = { flex: 1, textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 2px" }
