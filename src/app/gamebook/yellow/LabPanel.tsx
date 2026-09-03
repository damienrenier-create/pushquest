"use client"

// src/app/gamebook/yellow/LabPanel.tsx
//
// Nexus Jaune Éclair — TERMINAL D'EXPÉRIENCES (labo, étage de l'infirmerie).
// HUB des défis du labo : 3 onglets.
//   PHYSIQUE : 50 pompes/1h, 150 squats/série (1×), quota×2 → demain×3  (validés SERVEUR sur tes vraies reps)
//   CT       : choisis un type + une CT, inflige puissance×100 dégâts du type (compté en combat)
//   SURPRISE : roulette dorée → gagne 1000 énergies cumulées → Tonytony
// PAUSE : tant que tu es Champion sans avoir récupéré la Daemonflûte, le labo est réservé à ta récompense.

import { useState, useEffect } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import {
    usePlayer, startLabDefi, clearLabDefi, grantReps, logEnergyIncome, grantCt, recordCtEarned,
    setTomorrowEnergyMult, markSquat150Done, grantTonytony, makeTonytonyShiny, ctDefiProgress, ticketCount,
    physWinCount, recordPhysWin, casinoPillar, useActiveWorld,
    getGameMode, startFunDefi, abandonFunDefi, ensureFunDailyTarget,
} from "@/lib/gamebook/yellow/store/playerStore"
import { funSprintReward, funArenaRewardScaled, funLevelMultiplier } from "@/lib/gamebook/yellow/data/funDefis"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import {
    PHYSICAL_DEFIS, PHYSICAL_ENERGY_REWARD, QUOTA2X_MULT,
    ctDefiOptions, ctDefiThreshold, ctEarnedCountByType, CT_PER_TYPE_MAX, TONYTONY_TARGET, TONYTONY_SHINY_TARGET,
    physScaledTarget, physScaledReward, pushupDefiVariant,
} from "@/lib/gamebook/yellow/data/labDefis"
import { postLabDefiStart, postLabDefiCheck } from "@/lib/gamebook/yellow/labDefiApi"
import { getCt } from "@/lib/gamebook/yellow/data/cts"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { POKE_TYPES, type PokeType } from "@/lib/gamebook/yellow/battle/types"
import CasinoYellowModal from "./CasinoYellowModal"
import DailyTicketModal from "./DailyTicketModal"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"
const FLUTE_ITEM = "daemonflute"

const TYPE_EMOJI: Record<string, string> = {
    NORMAL: "⭐", FEU: "🔥", EAU: "💧", PLANTE: "🌿", ELEC: "⚡", GLACE: "🧊", COMBAT: "🥊",
    POISON: "☠️", SOL: "⛰️", VOL: "🕊️", PSY: "🔮", INSECTE: "🐛", ROCHE: "🪨", SPECTRE: "👻", DRAGON: "🐉", FEE: "🧚",
}

/** Demain (YYYY-MM-DD) à partir d'une date ISO du jour (arithmétique UTC, sans dérive de fuseau). */
function addOneDay(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

export default function LabPanel() {
    const open = useGameStore((s) => s.labOpen)
    const close = useGameStore((s) => s.closeLab)
    const player = usePlayer()
    const world = useActiveWorld()
    const funAvgLvl = player.team.length ? player.team.reduce((s, m) => s + m.level, 0) / player.team.length : 1 // bonus de niveau du Blitz d'arène
    const ngplus = world === "ngplus" // run 2 : le défi répétable devient SQUATS (rampe ×1,2)
    const run3 = world === "run3"     // run 3 (concours) : casino/roulette FERMÉS
    const pv = pushupDefiVariant(ngplus)         // { exercise, word: "pompes"|"squats", growth }
    const isFun = getGameMode() === "fun"
    const [tab, setTab] = useState<"phys" | "ct" | "surprise" | "fun">(isFun ? "fun" : "phys")
    const [ctType, setCtType] = useState<PokeType | null>(null)
    const [casino, setCasino] = useState(false)
    const [ticketsOpen, setTicketsOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)
    const [now, setNow] = useState(() => Date.now())
    // Chrono live pour l'onglet Fun (tick 1s tant qu'un défi fun est actif).
    useEffect(() => {
        if (!open || !isFun) return
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [open, isFun])
    // Cible du jour : tirée à l'ouverture (idempotent / par jour).
    useEffect(() => {
        if (open && isFun) { ensureFunDailyTarget(); persistYellowSave() }
    }, [open, isFun])

    if (!open) return null

    const d = player.labDefi
    const activePhys = d.activePhys
    const activeCt = d.activeCt
    const paused = player.isChampion && (player.items[FLUTE_ITEM] ?? 0) <= 0 && !player.sylvebarbeAwake
    const today = player.creditedThrough || new Date().toISOString().slice(0, 10)

    // ── Actions ──
    const startPhys = async (kind: "pushup1h" | "squat150" | "quota2x") => {
        setBusy(true); setMsg(null)
        const resp = await postLabDefiStart(kind, ngplus)
        startLabDefi({ kind, startedAt: resp.now ?? new Date().toISOString(), startSnapshot: kind === "pushup1h" ? (resp.snapshot ?? 0) : undefined })
        persistYellowSave(); setBusy(false)
        const pushTgt = physScaledTarget(PHYSICAL_DEFIS.find((x) => x.kind === "pushup1h")?.target ?? 50, physWinCount("pushup1h"), pv.growth)
        setMsg(kind === "pushup1h" ? `⏱️ Chrono lancé : ${pushTgt} ${pv.word} en 1 heure !` : "Défi lancé. Reviens réclamer une fois réussi.")
    }
    const claimPhys = async () => {
        if (!activePhys) return
        setBusy(true); setMsg(null)
        const wins = physWinCount(activePhys.kind) // durcit la cible (serveur) + scale la récompense
        const r = await postLabDefiCheck(activePhys.kind, activePhys.startSnapshot, activePhys.startedAt, wins, ngplus)
        setBusy(false)
        if (!r.validated) {
            setMsg(r.expired ? "⏱️ Délai dépassé — défi raté. Relance-le." : "Pas encore réussi. Continue tes reps !")
            if (r.expired) { clearLabDefi("phys"); persistYellowSave() }
            return
        }
        if (activePhys.kind === "quota2x") {
            setTomorrowEnergyMult(QUOTA2X_MULT, addOneDay(today))
            setMsg(`✅ Quota doublé ! Tes énergies de demain seront ×${QUOTA2X_MULT}.`)
        } else if (activePhys.kind === "squat150") {
            markSquat150Done() // one-shot à vie (pas de scaling)
            const got = grantReps(PHYSICAL_ENERGY_REWARD); logEnergyIncome("🏋️ Défi physique", got)
            setMsg(`✅ Défi réussi ! +${got} énergie.`)
        } else {
            // pushup1h : défi répétable → récompense scalée (×1,05 par réussite) puis on durcit le suivant.
            const got = grantReps(physScaledReward(PHYSICAL_ENERGY_REWARD, wins)); logEnergyIncome("🏋️ Défi physique", got)
            recordPhysWin(activePhys.kind)
            setMsg(`✅ Défi réussi ! +${got} énergie. Le prochain sera un cran plus dur. 💪`)
        }
        clearLabDefi("phys"); persistYellowSave()
    }
    const startCt = (ctId: string, type: PokeType, power: number) => {
        const earned = ctEarnedCountByType(d.ctEarned, type)
        const mv = getCt(ctId)
        startLabDefi({ kind: "ct", startedAt: new Date().toISOString(), ctType: type, ctMoveId: mv?.moveId, ctTargetCtId: ctId, ctThreshold: ctDefiThreshold(power, earned) })
        persistYellowSave()
        setMsg(`Défi CT lancé : inflige ${ctDefiThreshold(power, earned)} dégâts ${type} en combat.`)
    }
    const claimCt = () => {
        if (!activeCt || activeCt.kind !== "ct" || !activeCt.ctTargetCtId || !activeCt.ctThreshold) return
        if (ctDefiProgress() < activeCt.ctThreshold) { setMsg(`Pas encore : ${ctDefiProgress()}/${activeCt.ctThreshold} dégâts ${activeCt.ctType}.`); return }
        grantCt(activeCt.ctTargetCtId); recordCtEarned(activeCt.ctTargetCtId)
        const move = activeCt.ctMoveId ? getMove(activeCt.ctMoveId)?.name : activeCt.ctTargetCtId
        clearLabDefi("ct"); persistYellowSave()
        setMsg(`✅ CT gagnée : ${move} ! Le scientifique te la remet.`)
    }
    const abandonPhys = () => { clearLabDefi("phys"); persistYellowSave(); setMsg("Défi physique abandonné.") }
    const abandonCt = () => { clearLabDefi("ct"); persistYellowSave(); setMsg("Défi CT abandonné.") }
    const pillar = casinoPillar() // 🥚 Tonytony (run 1) / 🦠 Merorem (run 2) — nom & emoji cohérents partout
    const claimTonytony = () => {
        const where = grantTonytony()
        persistYellowSave()
        setMsg(where ? `${pillar.emoji} ${pillar.name.toUpperCase()} rejoint ${where === "team" ? "ton équipe" : "ton PC"} !` : "Cumul insuffisant ou déjà obtenu.")
    }
    const claimTonytonyShiny = () => {
        const where = makeTonytonyShiny()
        persistYellowSave()
        setMsg(where ? `✨ Ton ${pillar.name} est désormais SHINY ! La chance t'a souri.` : "Pas encore éligible (5000 requis).")
    }

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🖥️ TERMINAL D'EXPÉRIENCES <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>Labo scientifique</span></div>

                {paused ? (
                    <div style={{ padding: 16, fontSize: 12, color: INK, lineHeight: 1.5 }}>
                        🔒 Le labo est réservé à ta <b>récompense de sacre</b>. Parle d'abord au <b>scientifique</b> pour récupérer la <b>Daemonflûte</b>, puis reviens — les défis rouvriront.
                    </div>
                ) : (
                    <>
                        {/* Onglets */}
                        <div style={{ display: "flex", borderBottom: `2px solid ${DARK}` }}>
                            {((isFun ? [["fun", "🎉 Défis"], ["ct", "💿 CT"], ["surprise", "🎁 Surprise"]] : [["phys", "⚡ Physique"], ["ct", "💿 CT"], ["surprise", "🎁 Surprise"]]) as ["phys" | "ct" | "surprise" | "fun", string][]).map(([k, lbl]) => (
                                <button key={k} onClick={() => { setTab(k); setMsg(null) }} style={{ ...tabBtn, ...(tab === k ? tabOn : {}) }}>{lbl}</button>
                            ))}
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                            {/* ─── FUN (défis chronométrés du mode fun) ─── */}
                            {tab === "fun" && (() => {
                                const f = player.funDefis
                                const a = f.active
                                const dailyName = getSpecies(f.dailySpecies)?.name ?? f.dailySpecies
                                if (a) {
                                    const left = Math.max(0, a.deadline - now)
                                    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000)
                                    const expired = left <= 0
                                    const title = a.kind === "arena" ? "🏆 Bats une arène (de A à Z)" : a.kind === "sprint" ? `🎯 Capture ${a.target} espèces différentes` : `⭐ Capture ${dailyName}`
                                    const prog = a.kind === "sprint" ? `${a.caught.length}/${a.target} espèces capturées` : a.kind === "arena" ? "Gagne le badge d'une arène" : "Trouve-le à l'état sauvage"
                                    return (
                                        <div style={cardStyle}>
                                            <div style={{ fontWeight: 800, color: INK, fontSize: 14 }}>{title}</div>
                                            <div style={{ fontSize: 30, fontWeight: 900, color: expired ? "#b03030" : INK, textAlign: "center", margin: "6px 0" }}>⏱ {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</div>
                                            <div style={{ fontSize: 12, color: INK, textAlign: "center", opacity: 0.85 }}>{expired ? "Délai dépassé — relance-le." : prog}</div>
                                            <div style={{ fontSize: 11, color: INK, opacity: 0.65, marginTop: 6, textAlign: "center" }}>La récompense tombe AUTOMATIQUEMENT dès la réussite. Reste dans les temps !</div>
                                            <button onClick={() => { abandonFunDefi(); persistYellowSave(); setMsg("Défi abandonné.") }} style={ghost}>Abandonner</button>
                                        </div>
                                    )
                                }
                                return (
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <div style={{ fontSize: 12, color: INK, opacity: 0.85, lineHeight: 1.5, marginBottom: 8 }}>🎉 En mode fun, ton énergie vient de ces <b>défis chronométrés</b> (fini les pompes à encoder !). Un seul à la fois — la récompense est créditée dès que tu réussis.</div>
                                        <div style={cardStyle}>
                                            <div style={{ fontWeight: 800, color: INK, fontSize: 13 }}>🏆 Blitz d'arène — <span style={{ color: "#2a7d2a" }}>+{funArenaRewardScaled(1, funAvgLvl)} → +{funArenaRewardScaled(5, funAvgLvl)}⚡</span></div>
                                            <div style={{ fontSize: 11, color: INK, opacity: 0.8, margin: "4px 0 6px" }}>Bats une arène complète (les 4 gardes + le boss) dans l'<b>heure</b>.{funLevelMultiplier(funAvgLvl) > 1 ? <> Récompense <b>boostée ×{funLevelMultiplier(funAvgLvl).toFixed(2)}</b> par le niveau de ton équipe.</> : <> La récompense grimpe avec le niveau de ton équipe (jusqu'à ×2).</>}</div>
                                            <button onClick={() => { startFunDefi("arena"); persistYellowSave() }} style={primary}>Lancer (1 h)</button>
                                        </div>
                                        <div style={cardStyle}>
                                            <div style={{ fontWeight: 800, color: INK, fontSize: 13 }}>🎯 Sprint de capture — <span style={{ color: "#2a7d2a" }}>+{funSprintReward(f.ladder)}⚡</span></div>
                                            <div style={{ fontSize: 11, color: INK, opacity: 0.8, margin: "4px 0 6px" }}>Capture <b>{f.ladder} espèces DIFFÉRENTES</b> en 10 minutes. L'objectif monte à chaque réussite (et ne redescend jamais).</div>
                                            <button onClick={() => { startFunDefi("sprint"); persistYellowSave() }} style={primary}>Lancer (10 min)</button>
                                        </div>
                                        <div style={cardStyle}>
                                            <div style={{ fontWeight: 800, color: INK, fontSize: 13 }}>⭐ Pokémon du jour — <span style={{ color: "#2a7d2a" }}>{f.dailyDone ? "réussi ✓" : `+${f.dailyReps}⚡`}</span></div>
                                            <div style={{ fontSize: 11, color: INK, opacity: 0.8, margin: "4px 0 6px" }}>{f.dailyDone ? `✅ Déjà réussi aujourd'hui (${dailyName}). Reviens demain pour une nouvelle cible !` : <>Capture <b>{dailyName || "le Pokémon du jour"}</b> dans l'<b>heure</b>. Plus il est rare, plus il rapporte.</>}</div>
                                            <button disabled={f.dailyDone || !f.dailySpecies} onClick={() => { startFunDefi("daily"); persistYellowSave() }} style={{ ...primary, opacity: (f.dailyDone || !f.dailySpecies) ? 0.5 : 1, cursor: (f.dailyDone || !f.dailySpecies) ? "default" : "pointer" }}>Lancer (1 h)</button>
                                        </div>
                                    </div>
                                )
                            })()}
                            {/* ─── PHYSIQUE ─── */}
                            {tab === "phys" && (activePhys ? (() => {
                                // BUG FIX : le défi ACTIF affiche la cible ADAPTÉE (comme la liste), plus le label statique.
                                const def = PHYSICAL_DEFIS.find((x) => x.kind === activePhys.kind)
                                const w = physWinCount(activePhys.kind)
                                const scaled = activePhys.kind === "pushup1h" && !!def?.target
                                const tgt = scaled ? physScaledTarget(def!.target!, w, pv.growth) : 0
                                const title = scaled ? `${tgt} ${pv.word} en 1 heure` : (def?.label ?? "Défi")
                                const desc = scaled ? `Encode ${tgt} ${pv.word} dans l'heure qui suit le lancement.` : (def?.desc ?? "")
                                return (
                                    <ActiveBox title={title} desc={desc}>
                                        <button onClick={claimPhys} disabled={busy} style={primary}>{busy ? "…" : "Vérifier / Réclamer"}</button>
                                        <button onClick={abandonPhys} disabled={busy} style={ghost}>Abandonner</button>
                                    </ActiveBox>
                                )
                            })() : (
                                <>
                                    <Hint>Défis sur tes <b>vraies reps PushQuest</b> (vérifiés serveur). Un seul défi physique à la fois — mais tu peux mener un défi <b>CT</b> et la <b>roulette</b> en parallèle.</Hint>
                                    {PHYSICAL_DEFIS.filter((x) => !(x.kind === "squat150" && d.squat150Done)).map((x) => {
                                        // pushup1h : répétable → cible & récompense SCALÉES + libellé selon le monde (pompes/squats).
                                        const w = physWinCount(x.kind)
                                        const scaled = x.kind === "pushup1h" && !!x.target
                                        const tgt = scaled ? physScaledTarget(x.target!, w, pv.growth) : 0
                                        const title = scaled ? `${tgt} ${pv.word} en 1 heure` : x.label
                                        const desc = scaled ? `Encode ${tgt} ${pv.word} dans l'heure qui suit le lancement.` : x.desc
                                        const reward = scaled ? `+${physScaledReward(PHYSICAL_ENERGY_REWARD, w)} énergie${w > 0 ? ` · palier ${w + 1}` : ""}` : x.reward
                                        return (
                                            <Card key={x.kind} title={title} desc={desc} reward={reward}>
                                                <button onClick={() => startPhys(x.kind)} disabled={busy} style={primary}>Lancer</button>
                                            </Card>
                                        )
                                    })}
                                    {d.squat150Done && <Hint>✅ « 150 squats en 1 série » déjà accompli (à vie).</Hint>}
                                </>
                            ))}

                            {/* ─── CT ─── */}
                            {tab === "ct" && (activeCt ? (
                                <ActiveBox title={`Défi CT — ${activeCt.ctType}`} desc={`Inflige des dégâts ${activeCt.ctType} en combat.`}>
                                    <div style={{ fontSize: 12, color: INK, margin: "4px 0 8px" }}>Progression : <b>{ctDefiProgress()}</b> / {activeCt.ctThreshold} dégâts</div>
                                    <button onClick={claimCt} disabled={ctDefiProgress() < (activeCt.ctThreshold ?? Infinity)} style={ctDefiProgress() >= (activeCt.ctThreshold ?? Infinity) ? primary : ghost}>Réclamer la CT</button>
                                    <button onClick={abandonCt} style={ghost}>Abandonner</button>
                                </ActiveBox>
                            ) : (
                                <>
                                    <Hint>Choisis un <b>type</b>, puis une CT. Inflige <b>puissance × 100</b> dégâts de ce type en combat (indépendant d'un défi physique). Max {CT_PER_TYPE_MAX}/type (la 2ᵉ coûte ×2).</Hint>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 10 }}>
                                        {POKE_TYPES.map((t) => (
                                            <button key={t} onClick={() => setCtType(t)} title={t} style={{ ...typeBtn, ...(ctType === t ? typeOn : {}) }}>{TYPE_EMOJI[t]}</button>
                                        ))}
                                    </div>
                                    {ctType && <CtOptions type={ctType} earned={d.ctEarned} owned={player.ownedCts} onPick={startCt} />}
                                </>
                            ))}

                            {/* ─── SURPRISE ─── */}
                            {tab === "surprise" && (
                                <Card title="🎰 Roulette dorée" desc={`Tente ta chance — la roulette reste ouverte ! Paliers : ${pillar.emoji} ${pillar.name} à 1000 · ✨ ${pillar.name} SHINY à 5000.`} reward={`Cumul gagné : ${d.casinoTotalWon}`}>
                                    {run3 ? (
                                        <div style={{ fontSize: 11, opacity: 0.8, color: INK, lineHeight: 1.5 }}>🔒 La roulette est <b>fermée pendant le CONCOURS</b> (run 3). Seule source d&apos;énergie : les paliers d&apos;arène.</div>
                                    ) : (<>
                                        {!d.tonytonyClaimed && d.casinoTotalWon >= TONYTONY_TARGET && <button onClick={claimTonytony} style={primary}>{pillar.emoji} Réclamer {pillar.name} (1000)</button>}
                                        {d.tonytonyClaimed && !d.tonytonyShiny && d.casinoTotalWon >= TONYTONY_SHINY_TARGET && <button onClick={claimTonytonyShiny} style={primary}>✨ Rendre ton {pillar.name} SHINY (5000)</button>}
                                        <button onClick={() => setCasino(true)} style={((!d.tonytonyClaimed && d.casinoTotalWon >= TONYTONY_TARGET) || (d.tonytonyClaimed && !d.tonytonyShiny && d.casinoTotalWon >= TONYTONY_SHINY_TARGET)) ? ghost : primary}>🎰 Jouer à la roulette</button>
                                        <div style={{ fontSize: 10, opacity: 0.7, color: INK, marginTop: 6 }}>{pillar.emoji} {pillar.name} : {d.tonytonyClaimed ? "✅" : `${Math.min(d.casinoTotalWon, TONYTONY_TARGET)}/${TONYTONY_TARGET}`} · ✨ Shiny : {d.tonytonyShiny ? "✅" : `${Math.min(d.casinoTotalWon, TONYTONY_SHINY_TARGET)}/${TONYTONY_SHINY_TARGET}`}</div>
                                        {ticketCount() > 0 && <button onClick={() => setTicketsOpen(true)} style={{ ...primary, marginTop: 8 }}>🎟️ Jouer mes tickets roulette ({ticketCount()})</button>}
                                    </>)}
                                </Card>
                            )}

                            {msg && <div style={{ marginTop: 10, padding: 8, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, fontSize: 12, color: INK }}>{msg}</div>}
                        </div>
                    </>
                )}
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
            {casino && <CasinoYellowModal onClose={() => setCasino(false)} />}
            {ticketsOpen && <DailyTicketModal mode="lab" onClose={() => { persistYellowSave(); setTicketsOpen(false) }} />}
        </div>
    )
}

// ── Sous-composant : options de CT pour un type ──
function CtOptions({ type, earned, owned, onPick }: { type: PokeType; earned: string[]; owned: string[]; onPick: (ctId: string, type: PokeType, power: number) => void }) {
    const earnedOfType = ctEarnedCountByType(earned, type)
    if (earnedOfType >= CT_PER_TYPE_MAX) return <Hint>Plafond atteint pour ce type ({CT_PER_TYPE_MAX} CT gagnées).</Hint>
    const opts = ctDefiOptions().filter((o) => o.type === type && !earned.includes(o.ctId) && !owned.includes(o.ctId))
    if (opts.length === 0) return <Hint>Aucune CT {type} restante à gagner ici.</Hint>
    return (
        <>
            {opts.map((o) => {
                const move = getMove(o.moveId)
                return (
                    <Card key={o.ctId} title={`${move?.name ?? o.moveId} (${o.power})`} desc={`CT ${type}`} reward={`Seuil : ${ctDefiThreshold(o.power, earnedOfType)} dégâts`}>
                        <button onClick={() => onPick(o.ctId, type, o.power)} style={primary}>Lancer ce défi</button>
                    </Card>
                )
            })}
        </>
    )
}

// ── Petits composants de présentation ──
function Card({ title, desc, reward, children }: { title: string; desc: string; reward: string; children: React.ReactNode }) {
    return (
        <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{title}</div>
            <div style={{ fontSize: 11, color: INK, opacity: 0.75, margin: "2px 0 4px" }}>{desc}</div>
            <div style={{ fontSize: 11, color: "#1e8449", fontWeight: 700, marginBottom: 6 }}>🎁 {reward}</div>
            {children}
        </div>
    )
}
function ActiveBox({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
    return (
        <div style={{ ...cardStyle, border: "2px solid #3a8ee0", background: "#eaf4ff" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>⏳ En cours : {title}</div>
            <div style={{ fontSize: 11, color: INK, opacity: 0.75, marginBottom: 6 }}>{desc}</div>
            {children}
        </div>
    )
}
function Hint({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, color: INK, opacity: 0.7, lineHeight: 1.4, marginBottom: 10 }}>{children}</div>
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 460, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const tabBtn: React.CSSProperties = { flex: 1, padding: "8px 4px", background: "transparent", border: "none", borderBottom: "3px solid transparent", color: INK, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const tabOn: React.CSSProperties = { borderBottom: "3px solid #3a8ee0", background: "#fff8e8" }
const cardStyle: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: 10, marginBottom: 8 }
const primary: React.CSSProperties = { width: "100%", padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: "pointer", marginTop: 2 }
const ghost: React.CSSProperties = { width: "100%", padding: "6px 0", background: "transparent", color: INK, border: `1px solid ${DARK}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer", marginTop: 6 }
const typeBtn: React.CSSProperties = { padding: "8px 2px", background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 4, fontSize: 16, cursor: "pointer" }
const typeOn: React.CSSProperties = { border: "2px solid #3a8ee0", background: "#eaf4ff" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
