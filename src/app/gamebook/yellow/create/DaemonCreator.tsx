"use client"

// CRÉATEUR DE DAEMON (post-Ligue, cadeau du Dieu Spaghetti) — WIZARD guidé.
// Le joueur conçoit son propre starter : concept (DA) → stades → courbe d'éclosion → type(s) →
// répartition des stats (du stade FINAL, le wizard met les stades à l'échelle) → movepool tiéré → récap.
// Le kernel pur (lib/.../create/customSpecies) génère une lignée JOUABLE + valide à la volée (aperçu live).
// MVP « test » : à la création, on stocke la spec en localStorage + on l'affiche (bouton copier JSON).
// PHASE 2 (non incluse ici) : envoi DB, sprite mystère en jeu, New Game+ 6000⚡, fusion des comptes, partage Zone de Combat.

import { useMemo, useState } from "react"
import { POKE_TYPES, type PokeType, type StatKey } from "@/lib/gamebook/yellow/battle/types"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { TYPE_COLORS } from "../dex/dexShared"
import {
    type CustomSpec, type Bloomer, BLOOMERS, bloomerBudget, validateSpec, previewLine, moveOptionsFor,
    lineTypes, LEARN_LEVELS, STAT_KEYS, STAT_LABEL, MIN_FINAL_STAT, MAX_FINAL_STAT, moveCat,
} from "@/lib/gamebook/yellow/create/customSpecies"

const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace", COMBAT: "Combat",
    POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte", ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon",
}
const STEPS = ["Concept", "Stades", "Éclosion", "Type(s)", "Stats", "Attaques", "Récap"]

function defaultSpec(): CustomSpec {
    return {
        name: "", da: "", character: "", stages: 2, bloomer: "mid",
        finalTypes: ["NORMAL"], typeChange: undefined,
        finalStats: { hp: 60, atk: 60, def: 60, spe: 60, spc: 60 },
        learnset: [],
    }
}

export default function DaemonCreator({ ownerId, nickname, close }: { ownerId: string; nickname: string; close: () => void }) {
    const [step, setStep] = useState(0)
    const [spec, setSpec] = useState<CustomSpec>(defaultSpec)
    const [created, setCreated] = useState<string | null>(null) // JSON soumis (écran de succès)

    const patch = (p: Partial<CustomSpec>) => setSpec((s) => ({ ...s, ...p }))
    const budget = bloomerBudget(spec.bloomer)
    const usedBst = STAT_KEYS.reduce((a, k) => a + spec.finalStats[k], 0)
    const lts = useMemo(() => lineTypes(spec), [spec])
    // Options d'attaque par palier (dépend des types) — recalculé quand les types changent.
    const slotOptions = useMemo(() => LEARN_LEVELS.map((lvl) => moveOptionsFor(lts, lvl)), [lts])
    // Learnset EFFECTIF : on garde le choix du joueur s'il est encore valide, sinon on retombe sur la 1re option.
    const learnset = useMemo(
        () => LEARN_LEVELS.map((lvl, i) => {
            const cur = spec.learnset[i]?.moveId
            const ok = cur && slotOptions[i].includes(cur)
            return { level: lvl, moveId: ok ? cur! : (slotOptions[i][0] ?? "") }
        }),
        [spec.learnset, slotOptions],
    )
    // Validation + aperçu sur la spec AVEC le learnset effectif (sinon le bouton Créer reste bloqué
    // tant que le joueur n'a pas touché l'étape Attaques, alors que les valeurs par défaut sont valides).
    const effSpec = useMemo(() => ({ ...spec, learnset }), [spec, learnset])
    const errors = useMemo(() => validateSpec(effSpec), [effSpec])
    const preview = useMemo(() => { try { return previewLine(effSpec, ownerId) } catch { return [] } }, [effSpec, ownerId])
    const setLearn = (i: number, moveId: string) => setSpec((s) => {
        const next = LEARN_LEVELS.map((lvl, j) => ({ level: lvl, moveId: j === i ? moveId : learnset[j].moveId }))
        return { ...s, learnset: next }
    })

    const toggleFinalType = (t: PokeType) => setSpec((s) => {
        const has = s.finalTypes.includes(t)
        let ts = has ? s.finalTypes.filter((x) => x !== t) : [...s.finalTypes, t]
        if (ts.length === 0) ts = [t]          // au moins 1
        if (ts.length > 2) ts = [s.finalTypes[1], t] // max 2 (remplace le plus ancien)
        return { ...s, finalTypes: ts }
    })

    const create = () => {
        // On fige le learnset effectif dans la spec avant validation/soumission.
        const finalSpec: CustomSpec = effSpec
        const errs = validateSpec(finalSpec)
        if (errs.length) { setStep(STEPS.length - 1); return }
        const payload = { ownerId, nickname, spec: finalSpec, line: previewLine(finalSpec, ownerId), at: new Date().toISOString() }
        try { window.localStorage.setItem(`pq_daemon_creation_${ownerId}`, JSON.stringify(payload)) } catch { /* quota */ }
        setCreated(JSON.stringify(payload, null, 2))
    }

    // ───────── Écran de succès ─────────
    if (created) {
        return (
            <div style={S.overlay} onClick={close}>
                <div style={S.box} onClick={(e) => e.stopPropagation()}>
                    <div style={S.h}>🧬 Daemon envoyé au labo !</div>
                    <p style={S.p}>Ton <b>{spec.name}</b> est créé et jouable (sprite mystère ❓ en attendant que Sartay lui donne son vrai visage).</p>
                    <p style={{ ...S.p, fontSize: 11, opacity: 0.7 }}>Phase 2 : sauvegarde en base, New Game+ (6000 ⚡), puis fusion des comptes après avoir battu ta propre équipe.</p>
                    <textarea readOnly value={created} style={S.json} onFocus={(e) => e.currentTarget.select()} />
                    <button style={S.primary} onClick={() => navigator.clipboard?.writeText(created)}>📋 Copier le JSON</button>
                    <button style={S.ghost} onClick={close}>Fermer</button>
                </div>
            </div>
        )
    }

    return (
        <div style={S.overlay} onClick={close}>
            <div style={S.box} onClick={(e) => e.stopPropagation()}>
                <div style={S.head}>
                    <span style={S.h}>🧬 Crée ton Daemon</span>
                    <button style={S.x} onClick={close}>✕</button>
                </div>
                {/* Fil d'étapes */}
                <div style={S.steps}>
                    {STEPS.map((label, i) => (
                        <button key={label} onClick={() => setStep(i)} style={{ ...S.stepChip, ...(i === step ? S.stepOn : {}) }}>{i + 1}. {label}</button>
                    ))}
                </div>

                <div style={S.body}>
                    {step === 0 && (
                        <>
                            <Lbl>Nom de ton Daemon</Lbl>
                            <input style={S.input} value={spec.name} maxLength={18} placeholder="ex. Voltarenard" onChange={(e) => patch({ name: e.target.value })} />
                            <Lbl>Direction artistique — à quoi il ressemble ? (1-2 phrases, ça servira au sprite)</Lbl>
                            <textarea style={S.area} value={spec.da} maxLength={220} placeholder="ex. Un renard électrique entouré de petits nuages de fumée magnétiques, l'air malicieux." onChange={(e) => patch({ da: e.target.value })} />
                            <Lbl>Caractère / personnalité</Lbl>
                            <input style={S.input} value={spec.character} maxLength={60} placeholder="ex. rusé, joueur, imprévisible" onChange={(e) => patch({ character: e.target.value })} />
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Lbl>Combien de stades d'évolution ?</Lbl>
                            <div style={S.row}>
                                {[1, 2, 3].map((n) => (
                                    <button key={n} style={{ ...S.opt, ...(spec.stages === n ? S.optOn : {}) }} onClick={() => patch({ stages: n as 1 | 2 | 3, typeChange: n < (spec.typeChange?.atStage ?? 0) ? undefined : spec.typeChange })}>
                                        {n} stade{n > 1 ? "s" : ""}
                                    </button>
                                ))}
                            </div>
                            <Hint>3 stades = base → intermédiaire → final (le plus classique). Plus de stades = plus d'impact mais plus de sprites à dessiner.</Hint>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Lbl>Courbe d'éclosion (vitesse d'évolution ↔ puissance)</Lbl>
                            {(Object.keys(BLOOMERS) as Bloomer[]).map((b) => (
                                <button key={b} style={{ ...S.optWide, ...(spec.bloomer === b ? S.optOn : {}) }} onClick={() => patch({ bloomer: b })}>
                                    <b>{BLOOMERS[b].label}</b> — budget BST <b>{bloomerBudget(b)}</b>
                                    <div style={S.subtle}>{BLOOMERS[b].hint}</div>
                                </button>
                            ))}
                            <Hint>Tardive = tu galères longtemps mais ton Daemon final est plus puissant (parfait pour la Zone de Combat). Précoce = fort tout de suite, plafond plus bas.</Hint>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Lbl>Type(s) du STADE FINAL (1 ou 2)</Lbl>
                            <div style={S.typeGrid}>
                                {POKE_TYPES.map((t) => (
                                    <button key={t} onClick={() => toggleFinalType(t)} style={{ ...S.typeBtn, background: TYPE_COLORS[t], opacity: spec.finalTypes.includes(t) ? 1 : 0.32, outline: spec.finalTypes.includes(t) ? "2px solid #fff" : "none" }}>{TYPE_FR[t]}</button>
                                ))}
                            </div>
                            {spec.stages >= 2 && (
                                <>
                                    <Lbl>Changement de type au fil des évolutions ? (1 max)</Lbl>
                                    <div style={S.row}>
                                        <button style={{ ...S.opt, ...(!spec.typeChange ? S.optOn : {}) }} onClick={() => patch({ typeChange: undefined })}>Aucun</button>
                                        {([2, 3] as const).filter((st) => st <= spec.stages).map((st) => (
                                            <button key={st} style={{ ...S.opt, ...(spec.typeChange?.atStage === st ? S.optOn : {}) }}
                                                onClick={() => patch({ typeChange: { atStage: st, types: spec.typeChange?.types ?? ["NORMAL"] } })}>Au stade {st}</button>
                                        ))}
                                    </div>
                                    {spec.typeChange && (
                                        <>
                                            <Hint>Avant le stade {spec.typeChange.atStage}, ton Daemon portait ces types :</Hint>
                                            <div style={S.typeGrid}>
                                                {POKE_TYPES.map((t) => {
                                                    const on = spec.typeChange!.types.includes(t)
                                                    return <button key={t} onClick={() => setSpec((s) => {
                                                        let ts = on ? s.typeChange!.types.filter((x) => x !== t) : [...s.typeChange!.types, t]
                                                        if (ts.length === 0) ts = [t]; if (ts.length > 2) ts = [s.typeChange!.types[1], t]
                                                        return { ...s, typeChange: { ...s.typeChange!, types: ts } }
                                                    })} style={{ ...S.typeBtn, background: TYPE_COLORS[t], opacity: on ? 1 : 0.32, outline: on ? "2px solid #fff" : "none" }}>{TYPE_FR[t]}</button>
                                                })}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <Lbl>Répartis les stats du STADE FINAL — <b style={{ color: usedBst > budget ? "#e0683a" : "#7ce0a0" }}>{usedBst}/{budget}</b> BST</Lbl>
                            {STAT_KEYS.map((k) => {
                                const v = spec.finalStats[k]
                                const cat = k === "atk" ? " (attaques PHYS)" : k === "spc" ? " (attaques SPÉ)" : ""
                                return (
                                    <div key={k} style={S.statRow}>
                                        <span style={S.statName}>{STAT_LABEL[k]}<span style={S.subtle}>{cat}</span></span>
                                        <button style={S.step} disabled={v <= MIN_FINAL_STAT} onClick={() => patch({ finalStats: { ...spec.finalStats, [k]: Math.max(MIN_FINAL_STAT, v - 5) } })}>−</button>
                                        <span style={S.statVal}>{v}</span>
                                        <button style={S.step} disabled={v >= MAX_FINAL_STAT || usedBst + 5 > budget} onClick={() => patch({ finalStats: { ...spec.finalStats, [k]: Math.min(MAX_FINAL_STAT, v + 5) } })}>+</button>
                                        <div style={S.bar}><div style={{ ...S.barFill, width: `${(v / MAX_FINAL_STAT) * 100}%`, background: TYPE_COLORS[spec.finalTypes[0]] }} /></div>
                                    </div>
                                )
                            })}
                            <Hint>Astuce : ta meilleure stat offensive décide de ton style. Attaque ↔ types physiques (Normal/Combat/Sol/Roche…), Spécial ↔ types spéciaux (Feu/Eau/Élec/Psy…).</Hint>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <Lbl>Attaques apprises (palier tous les 9 niveaux ; puissance plafonnée par niveau)</Lbl>
                            {LEARN_LEVELS.map((lvl, i) => {
                                const opts = slotOptions[i]
                                const mv = getMove(learnset[i].moveId)
                                return (
                                    <div key={i} style={S.learnRow}>
                                        <span style={S.lvlTag}>Niv {lvl}{LEARN_LEVELS.indexOf(lvl) !== i ? " ʙ" : ""}</span>
                                        <select style={S.select} value={learnset[i].moveId} onChange={(e) => setLearn(i, e.target.value)}>
                                            {opts.map((id) => { const m = getMove(id)!; return <option key={id} value={id}>{m.name} · {TYPE_FR[m.type]} · {m.power > 0 ? `P${m.power} ${moveCat(m.type)}` : "statut"}</option> })}
                                        </select>
                                        {mv && <span style={S.subtle}>{mv.power > 0 ? `${moveCat(mv.type)}` : "📊"}</span>}
                                    </div>
                                )
                            })}
                            <Hint>Niv 5 = tes 2 attaques de départ. La puissance autorisée monte par paliers : ≤50 tôt, ≤75 puis ≤100, et les ultimes après le niv 54.</Hint>
                        </>
                    )}

                    {step === 6 && (
                        <>
                            <Lbl>Récapitulatif de ta lignée</Lbl>
                            {preview.map((st, i) => (
                                <div key={i} style={S.previewCard}>
                                    <div style={S.previewHead}>
                                        <b>{st.name}</b>
                                        <span>{st.types.map((t) => <span key={t} style={{ ...S.miniChip, background: TYPE_COLORS[t] }}>{TYPE_FR[t]}</span>)}</span>
                                        <span style={S.subtle}>BST {st.bst}{st.evoLevel ? ` · évolue niv ${st.evoLevel}` : ""}</span>
                                    </div>
                                    <div style={S.previewStats}>{STAT_KEYS.map((k) => <span key={k}>{STAT_LABEL[k].slice(0, 3)} <b>{st.baseStats[k]}</b></span>)}</div>
                                </div>
                            ))}
                            {errors.length > 0 ? (
                                <div style={S.errBox}>⚠️ À corriger :<ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
                            ) : (
                                <div style={S.okBox}>✅ Tout est valide. Prêt à donner vie à <b>{spec.name}</b> !</div>
                            )}
                        </>
                    )}
                </div>

                {/* Navigation */}
                <div style={S.nav}>
                    <button style={S.ghost} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Précédent</button>
                    {step < STEPS.length - 1
                        ? <button style={S.primary} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Suivant →</button>
                        : <button style={{ ...S.primary, opacity: errors.length ? 0.4 : 1 }} disabled={errors.length > 0} onClick={create}>🧬 Créer mon Daemon !</button>}
                </div>
            </div>
        </div>
    )
}

function Lbl({ children }: { children: React.ReactNode }) { return <div style={S.lbl}>{children}</div> }
function Hint({ children }: { children: React.ReactNode }) { return <div style={S.hint}>{children}</div> }

const ACCENT = "#3ad0c0"
const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9600, background: "rgba(4,10,12,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontFamily: "'Courier New', monospace", color: "#eef" },
    box: { width: "min(460px, 98vw)", maxHeight: "96vh", display: "flex", flexDirection: "column", background: "#0b1418", border: `2px solid ${ACCENT}`, borderRadius: 14, padding: 12, boxShadow: "0 0 30px rgba(58,208,192,.25)" },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    h: { fontSize: 16, fontWeight: 800, color: ACCENT },
    x: { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontFamily: "inherit" },
    steps: { display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 },
    stepChip: { fontSize: 9.5, fontWeight: 700, padding: "4px 6px", borderRadius: 6, border: "1px solid #1f4046", background: "#0e1c20", color: "#9fd", cursor: "pointer", fontFamily: "inherit" },
    stepOn: { background: ACCENT, color: "#04181a", borderColor: ACCENT },
    body: { flex: 1, overflowY: "auto", padding: "4px 2px", minHeight: 180 },
    lbl: { fontSize: 12, fontWeight: 800, margin: "10px 0 5px", color: "#cfeee9" },
    hint: { fontSize: 10.5, opacity: 0.7, lineHeight: 1.45, marginTop: 8, background: "rgba(58,208,192,.07)", border: "1px dashed #2a5a55", borderRadius: 8, padding: "6px 8px" },
    subtle: { fontSize: 10, opacity: 0.6, fontWeight: 400 },
    input: { width: "100%", padding: "9px 10px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" },
    area: { width: "100%", padding: "9px 10px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 12.5, minHeight: 64, resize: "vertical", boxSizing: "border-box" },
    row: { display: "flex", gap: 6, flexWrap: "wrap" },
    opt: { flex: 1, minWidth: 70, padding: "10px 6px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    optWide: { width: "100%", textAlign: "left", padding: "10px 12px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, color: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 },
    optOn: { background: "rgba(58,208,192,.18)", borderColor: ACCENT, outline: `1px solid ${ACCENT}` },
    typeGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 },
    typeBtn: { padding: "7px 2px", borderRadius: 6, border: "none", color: "#1a1400", fontWeight: 800, fontSize: 10, cursor: "pointer", fontFamily: "inherit" },
    statRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 },
    statName: { width: 92, fontSize: 11.5, fontWeight: 700 },
    step: { width: 30, height: 30, borderRadius: 7, border: `2px solid ${ACCENT}`, background: "#0e1c20", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 },
    statVal: { minWidth: 34, textAlign: "center", fontSize: 14, fontWeight: 800, color: ACCENT },
    bar: { flex: 1, height: 8, background: "#0e1c20", borderRadius: 4, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 4 },
    learnRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
    lvlTag: { width: 52, fontSize: 11, fontWeight: 800, color: ACCENT },
    select: { flex: 1, padding: "7px 8px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 7, color: "#fff", fontFamily: "inherit", fontSize: 11.5 },
    previewCard: { background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, padding: "7px 9px", marginBottom: 6 },
    previewHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" },
    previewStats: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, marginTop: 4, opacity: 0.9 },
    miniChip: { fontSize: 9, fontWeight: 800, color: "#1a1400", borderRadius: 4, padding: "1px 5px", marginLeft: 3 },
    errBox: { background: "rgba(224,104,58,.12)", border: "1px solid #e0683a", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, color: "#f0b090" },
    okBox: { background: "rgba(124,224,160,.12)", border: "1px solid #7ce0a0", borderRadius: 8, padding: "10px", fontSize: 12.5, color: "#bff0cf", textAlign: "center" },
    nav: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 },
    ghost: { padding: "9px 14px", background: "transparent", color: "#9fd", border: "1px solid #2a5a55", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    primary: { padding: "9px 16px", background: ACCENT, color: "#04181a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
    p: { fontSize: 12.5, lineHeight: 1.5, margin: "6px 0" },
    json: { width: "100%", height: 160, background: "#06100f", border: "1px solid #2a5a55", borderRadius: 8, color: "#9fe", fontFamily: "monospace", fontSize: 10, padding: 8, boxSizing: "border-box", marginBottom: 8 },
}
