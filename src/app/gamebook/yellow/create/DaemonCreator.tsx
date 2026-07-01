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
    type CustomSpec, type Bloomer, type MoveCardInfo, type CurveShape, type RoleKey, type Attribute,
    BLOOMERS, bloomerBudget, validateSpec, previewLine, ROLES, CURVE_LABEL, CURVE_HINT,
    slotChoices, suggestLearnset, moveCard, isDamagingMove, moveRarity, attributeMoveIds,
    ATTRIBUTE_LABEL, MAX_ATTRIBUTES,
    lineTypes, LEARN_LEVELS, STAT_KEYS, STAT_LABEL, MIN_FINAL_STAT, MAX_STAB, MAX_COVERAGE,
    STAT_HARD_CAP, STAT_DEX_MAX, specStatCost, fitStatsToBudget,
} from "@/lib/gamebook/yellow/create/customSpecies"

const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace", COMBAT: "Combat",
    POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte", ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon",
}
const STEPS = ["Concept", "Éclosion", "Type(s)", "Rôle", "Stats", "Attaques", "Récap"]

function defaultSpec(): CustomSpec {
    return {
        name: "", da: "", daFinal: "", character: "", stages: 3, bloomer: "mid", curve: "linear", role: "equilibre",
        finalTypes: ["NORMAL"], typeChange: undefined,
        finalStats: { ...ROLES.equilibre.profile },
        attributes: [],
        learnset: [],
    }
}

export default function DaemonCreator({ ownerId, nickname, close }: { ownerId: string; nickname: string; close: () => void }) {
    const [step, setStep] = useState(0)
    const [spec, setSpec] = useState<CustomSpec>(defaultSpec)
    const [created, setCreated] = useState<string | null>(null) // JSON soumis (écran de succès)
    const [pickingSlot, setPickingSlot] = useState<number | null>(null) // slot dont le sélecteur en fiches est ouvert

    const patch = (p: Partial<CustomSpec>) => setSpec((s) => ({ ...s, ...p }))
    const goStep = (n: number) => { setPickingSlot(null); setStep(n) } // réinitialise le picker à chaque navigation
    const budget = bloomerBudget(spec.bloomer)
    const usedBst = STAT_KEYS.reduce((a, k) => a + spec.finalStats[k], 0) // somme brute (sert à moduler la puissance)
    const cost = specStatCost(spec.finalStats)                            // coût réel (points au-delà du record = ×2) → c'est LUI plafonné
    const lts = useMemo(() => lineTypes(spec), [spec])
    const attrMoves = useMemo(() => attributeMoveIds(spec.attributes), [spec.attributes])
    // Suggestion par défaut VALIDE (slots forcés + cascade + attributs). Recalculée quand types/BST/attributs changent.
    const suggested = useMemo(() => suggestLearnset(lts, usedBst, spec.finalTypes, attrMoves), [lts, usedBst, spec.finalTypes, attrMoves])
    // Learnset EFFECTIF : choix du joueur s'il reste VALIDE (non bloqué) pour son slot, sinon la suggestion.
    // Les options d'un slot dépendent des AUTRES (pool cumulatif) → on valide dans ce contexte.
    const learnset = useMemo(() => {
        const base = LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: spec.learnset[i]?.moveId || suggested[i].moveId }))
        const specBase = { ...spec, learnset: base }
        return base.map((s, i) => {
            const ch = slotChoices(specBase, i, usedBst)
            const opt = [...ch.offensive, ...ch.status].find((o) => o.id === s.moveId)
            return { level: s.level, moveId: opt && !opt.blocked ? s.moveId : suggested[i].moveId }
        })
    }, [spec, suggested, usedBst])
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
                        <button key={label} onClick={() => goStep(i)} style={{ ...S.stepChip, ...(i === step ? S.stepOn : {}) }}>{i + 1}. {label}</button>
                    ))}
                </div>

                <div style={S.body}>
                    {step === 0 && (
                        <>
                            <Lbl>Nom de ton Daemon</Lbl>
                            <input style={S.input} value={spec.name} maxLength={18} placeholder="ex. Voltarenard" onChange={(e) => patch({ name: e.target.value })} />
                            <Lbl>Direction artistique du 1ᵉʳ stade — à quoi il ressemble ? (1-2 phrases, ça servira au sprite)</Lbl>
                            <textarea style={S.area} value={spec.da} maxLength={220} placeholder="ex. Un bébé renard électrique entouré de petits nuages de fumée magnétiques, l'air malicieux." onChange={(e) => patch({ da: e.target.value })} />
                            <Lbl>Direction artistique du STADE FINAL <span style={S.subtle}>(optionnel — laisse vide si l'évolution garde le même look en plus grand)</span></Lbl>
                            <textarea style={S.area} value={spec.daFinal ?? ""} maxLength={220} placeholder="ex. Un grand renard-tonnerre à la fourrure hérissée d'arcs électriques, crocs de foudre." onChange={(e) => patch({ daFinal: e.target.value })} />
                            <Lbl>Caractère / personnalité</Lbl>
                            <input style={S.input} value={spec.character} maxLength={60} placeholder="ex. rusé, joueur, imprévisible" onChange={(e) => patch({ character: e.target.value })} />
                            <Lbl>Attributs physiques <span style={S.subtle}>(coche max {MAX_ATTRIBUTES} — ils débloquent des attaques hors-type)</span></Lbl>
                            <div style={S.attrGrid}>
                                {(Object.keys(ATTRIBUTE_LABEL) as Attribute[]).map((a) => {
                                    const on = (spec.attributes ?? []).includes(a)
                                    const full = (spec.attributes ?? []).length >= MAX_ATTRIBUTES
                                    return (
                                        <button key={a} disabled={!on && full}
                                            style={{ ...S.attrChip, ...(on ? S.attrOn : {}), ...(!on && full ? S.attrDisabled : {}) }}
                                            onClick={() => setSpec((s) => {
                                                const cur = s.attributes ?? []
                                                const next = cur.includes(a) ? cur.filter((x) => x !== a) : (cur.length < MAX_ATTRIBUTES ? [...cur, a] : cur)
                                                return { ...s, attributes: next }
                                            })}>
                                            {on ? "☑ " : "☐ "}{ATTRIBUTE_LABEL[a]}
                                        </button>
                                    )
                                })}
                            </div>
                            <Hint>Chaque attribut coché justifie une petite liste d&apos;attaques d&apos;un autre type (ailes → Vol, crocs → Feu/Insecte, dard → Poison…). Tu restes limité à {MAX_COVERAGE} attaques de couverture au total.</Hint>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Lbl>Vitesse d'éclosion (rapidité d'évolution ↔ puissance finale)</Lbl>
                            {(Object.keys(BLOOMERS) as Bloomer[]).map((b) => (
                                <button key={b} style={{ ...S.optWide, ...(spec.bloomer === b ? S.optOn : {}) }}
                                    onClick={() => setSpec((s) => ({ ...s, bloomer: b, finalStats: fitStatsToBudget(s.finalStats, bloomerBudget(b)) }))}>
                                    <b>{BLOOMERS[b].label}</b> — budget <b>{bloomerBudget(b)}</b>
                                    <div style={S.subtle}>{BLOOMERS[b].hint}</div>
                                </button>
                            ))}
                            <Hint>Tardive = tu galères longtemps mais ton Daemon final est plus puissant (parfait pour la Zone de Combat). Précoce = fort tout de suite, plafond plus bas.</Hint>

                            <Lbl>Forme de la courbe — comment le BST se répartit entre les 3 stades</Lbl>
                            {(Object.keys(CURVE_LABEL) as CurveShape[]).map((c) => (
                                <button key={c} style={{ ...S.optWide, ...(spec.curve === c ? S.optOn : {}) }} onClick={() => patch({ curve: c })}>
                                    <b>{CURVE_LABEL[c]}</b>
                                    <div style={S.subtle}>{CURVE_HINT[c]}</div>
                                </button>
                            ))}
                            <Hint>Accélérée = bébé fragile, final surpuissant. Précoce (décélérée) = base déjà solide, gain final plus doux. Linéaire = progression régulière.</Hint>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Lbl>Type(s) de la forme finale (stade 3) — choisis-en 1 ou 2</Lbl>
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
                                                onClick={() => patch({ typeChange: { atStage: st, types: spec.typeChange?.types ?? ["NORMAL"] } })}>
                                                Dès le stade {st} {st === spec.stages ? "(final)" : "(intermédiaire)"}
                                            </button>
                                        ))}
                                    </div>
                                    {spec.typeChange && (
                                        <>
                                            <Hint>Avant le stade {spec.typeChange.atStage}, ton Daemon portait ces types (⚠️ les attaques de ces anciens types comptent comme de la COUVERTURE sur la forme finale) :</Hint>
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

                    {step === 3 && (
                        <>
                            <Lbl>Rôle de combat — un GUIDE qui pré-remplit un profil de stats (tu restes libre de t'en écarter)</Lbl>
                            {(Object.keys(ROLES) as RoleKey[]).map((rk) => (
                                <button key={rk} style={{ ...S.optWide, ...(spec.role === rk ? S.optOn : {}) }}
                                    onClick={() => patch({ role: rk, finalStats: fitStatsToBudget(ROLES[rk].profile, budget) })}>
                                    <b>{ROLES[rk].label}</b>
                                    <div style={S.subtle}>{ROLES[rk].hint}</div>
                                </button>
                            ))}
                            <Hint>Le rôle n'est qu'un point de départ : à l'étape suivante tu redistribues librement, jusqu'au plafond de chaque stat (record du dex +10 %). Passé le record, chaque point coûte double.</Hint>
                        </>
                    )}

                    {step === 4 && (() => {
                        const role = ROLES[spec.role]
                        const over = cost > budget
                        return (
                        <>
                            <Lbl>Répartis les stats de la forme finale — budget <b style={{ color: over ? "#e0683a" : "#7ce0a0" }}>{cost}/{budget}</b> · rôle guide <b>{role.label}</b> · BST {usedBst}</Lbl>
                            {STAT_KEYS.map((k) => {
                                const v = spec.finalStats[k]
                                const cat = k === "atk" ? " (attaques PHYS)" : k === "spc" ? " (attaques SPÉ)" : ""
                                const cap = STAT_HARD_CAP[k]
                                const record = v > STAT_DEX_MAX[k]                              // au-dessus du record du dex → coût double
                                const suggest = role.profile[k]                                 // repère conseillé (le rôle est un guide)
                                const canInc = v < cap && specStatCost({ ...spec.finalStats, [k]: Math.min(cap, v + 5) }) <= budget
                                return (
                                    <div key={k} style={S.statRow}>
                                        <span style={S.statName}>{STAT_LABEL[k]}<span style={S.subtle}>{cat} · conseillé {suggest}</span></span>
                                        <button style={S.step} disabled={v <= MIN_FINAL_STAT} onClick={() => patch({ finalStats: { ...spec.finalStats, [k]: Math.max(MIN_FINAL_STAT, v - 5) } })}>−</button>
                                        <span style={{ ...S.statVal, color: record ? "#e0b020" : undefined }}>{v}{record ? " ★" : ""}</span>
                                        <button style={S.step} disabled={!canInc} onClick={() => patch({ finalStats: { ...spec.finalStats, [k]: Math.min(cap, v + 5) } })}>+</button>
                                        <div style={S.bar}><div style={{ ...S.barFill, width: `${(v / cap) * 100}%`, background: record ? "#e0b020" : TYPE_COLORS[spec.finalTypes[0]] }} /></div>
                                    </div>
                                )
                            })}
                            <Hint>Plafond par stat = record du dex +10 % (★ = tu bats le record → chaque point coûte double). Ta plus grosse stat offensive décide de ton style : Attaque ↔ types physiques (Normal/Combat/Sol/Roche/Vol…), Spécial ↔ types spéciaux (Feu/Eau/Élec/Psy/Plante/Glace…) — sinon ton STAB est gâché.</Hint>
                        </>
                    )})()}

                    {step === 5 && (pickingSlot === null ? (
                        <>
                            {(() => {
                                const mvs = learnset.map((l) => getMove(l.moveId)).filter((m): m is NonNullable<typeof m> => !!m)
                                const off = mvs.filter(isDamagingMove)
                                const nStatus = mvs.length - off.length
                                const nStab = off.filter((m) => spec.finalTypes.includes(m.type)).length
                                const nCov = off.filter((m) => m.type !== "NORMAL" && !spec.finalTypes.includes(m.type)).length
                                const nCommon = off.filter((m) => ["commune", "répandue"].includes(moveRarity(m.id))).length
                                const avgPow = off.length ? Math.round(off.reduce((a, m) => a + (m.power > 0 ? m.power : (m.effect?.fixedDamage ?? 0)), 0) / off.length) : 0
                                const chip = (ok: boolean, txt: string) => <span style={{ ...S.compoChip, background: ok ? "rgba(124,224,160,.15)" : "rgba(224,104,58,.18)", color: ok ? "#7ce0a0" : "#f0a880" }}>{ok ? "✓" : "✗"} {txt}</span>
                                return <div style={S.compoRow}>
                                    {chip(nStatus >= Math.ceil(mvs.length * 0.25), `${nStatus} statuts (≥${Math.ceil(mvs.length * 0.25)})`)}
                                    {chip(nStab <= MAX_STAB, `${nStab} STAB (≤${MAX_STAB})`)}
                                    {chip(nCov <= MAX_COVERAGE, `${nCov} couv. (≤${MAX_COVERAGE})`)}
                                    {chip(off.length === 0 || nCommon >= Math.ceil(off.length * 0.5), `${nCommon}/${off.length} communes`)}
                                    <span style={S.compoChip}>puissance moy {avgPow}</span>
                                </div>
                            })()}
                            <Lbl>Tes {LEARN_LEVELS.length} attaques — touche un palier pour choisir</Lbl>
                            {LEARN_LEVELS.map((lvl, i) => {
                                const c = moveCard(learnset[i].moveId, lts)
                                return (
                                    <button key={i} style={S.slotRow} onClick={() => setPickingSlot(i)}>
                                        <span style={S.lvlTag}>Niv {lvl}</span>
                                        {c ? <MiniCard c={c} /> : <span style={S.subtle}>—</span>}
                                        <span style={{ ...S.subtle, marginLeft: "auto" }}>Changer ›</span>
                                    </button>
                                )
                            })}
                            <Hint>Palier 1 = attaque basique · Palier 2 = statut faible · le reste puise dans un POOL de puissance PARTAGÉ : plus une attaque est forte, moins il reste pour les autres. Attaques = Normal + tes types (STAB) uniquement.</Hint>
                        </>
                    ) : (
                        <>
                            {(() => {
                                // slotChoices applique : slots forcés (1 basique · 2 statut), cap CASCADE (pool restant),
                                // type (Normal+STAB), niveau, et retire les doublons des autres paliers.
                                const ch = slotChoices(effSpec, pickingSlot!, usedBst)
                                const label = pickingSlot === 0 ? "Palier 1 — attaque BASIQUE (Normal/STAB, sans effet)"
                                    : pickingSlot === 1 ? "Palier 2 — STATUT faible"
                                        : `Niv ${LEARN_LEVELS[pickingSlot!]} — pool restant : P≤${ch.cap}`
                                return (
                                    <>
                                        <div style={S.pickerHead}>
                                            <button style={S.ghost} onClick={() => setPickingSlot(null)}>‹ Retour</button>
                                            <b>{label}</b>
                                        </div>
                                        {ch.offensive.length > 0 && <Lbl>⚔️ Offensives ({ch.offensive.filter((o) => !o.blocked).length} dispo)</Lbl>}
                                        {ch.offensive.map((o) => { const c = moveCard(o.id, lts)!; return <FullCard key={o.id} c={c} sel={learnset[pickingSlot!].moveId === o.id} blocked={o.blocked} onPick={() => { if (o.blocked) return; setLearn(pickingSlot!, o.id); setPickingSlot(null) }} /> })}
                                        {ch.status.length > 0 && <Lbl>📊 Statuts ({ch.status.filter((o) => !o.blocked).length} dispo) — du plus faible au plus fort</Lbl>}
                                        {ch.offensive.length === 0 && ch.status.length === 0 && <Hint>Aucune attaque disponible pour ce palier (pool épuisé — baisse une autre attaque).</Hint>}
                                        {ch.status.map((o) => { const c = moveCard(o.id, lts)!; return <FullCard key={o.id} c={c} sel={learnset[pickingSlot!].moveId === o.id} blocked={o.blocked} onPick={() => { if (o.blocked) return; setLearn(pickingSlot!, o.id); setPickingSlot(null) }} /> })}
                                    </>
                                )
                            })()}
                        </>
                    ))}

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
                    <button style={S.ghost} disabled={step === 0} onClick={() => goStep(Math.max(0, step - 1))}>← Précédent</button>
                    {step < STEPS.length - 1
                        ? <button style={S.primary} onClick={() => goStep(Math.min(STEPS.length - 1, step + 1))}>Suivant →</button>
                        : <button style={{ ...S.primary, opacity: errors.length ? 0.4 : 1 }} disabled={errors.length > 0} onClick={create}>🧬 Créer mon Daemon !</button>}
                </div>
            </div>
        </div>
    )
}

function Lbl({ children }: { children: React.ReactNode }) { return <div style={S.lbl}>{children}</div> }
function Hint({ children }: { children: React.ReactNode }) { return <div style={S.hint}>{children}</div> }

const RAR_COL: Record<string, string> = { commune: "#8a8a8a", "répandue": "#3aa06a", rare: "#3a7ae0", exceptionnelle: "#e0b020" }
// Fiche compacte (ligne de slot).
function MiniCard({ c }: { c: MoveCardInfo }) {
    return (
        <span style={S.mini}>
            <span style={{ ...S.chipSm, background: TYPE_COLORS[c.type] }}>{TYPE_FR[c.type]}</span>
            <b style={{ fontSize: 12 }}>{c.name}</b>
            <span style={S.subtle}>{c.cat === "STATUT" ? `statut ${"★".repeat(c.statusTier ?? 0)}` : `P${c.power} ${c.cat}`}{c.stab ? " · STAB" : ""}</span>
        </span>
    )
}
// Fiche ULTRA-complète (picker) : type, catégorie, puissance, précision, PP, rareté, STAB/couverture, force de statut, effet.
// `blocked` : "dup" (déjà prise ailleurs) / "cascade" (trop forte vu le pool restant) → carte GRISÉE non cliquable.
function FullCard({ c, sel, onPick, blocked }: { c: MoveCardInfo; sel?: boolean; onPick: () => void; blocked?: "dup" | "cascade" | null }) {
    const catCol = c.cat === "STATUT" ? "#8868c0" : c.cat === "PHYS" ? "#c0532a" : "#3a7ae0"
    return (
        <button disabled={!!blocked} style={{ ...S.moveCard, ...(sel ? S.moveCardSel : {}), ...(blocked ? S.moveCardBlocked : {}) }} onClick={onPick}>
            <div style={S.moveCardHead}>
                <b style={{ fontSize: 13 }}>{c.name}</b>
                {blocked
                    ? <span style={S.blockedTag}>{blocked === "dup" ? "déjà choisie" : "pool épuisé"}</span>
                    : <span style={{ ...S.rarChip, background: RAR_COL[c.rarity] }}>{c.rarity}</span>}
            </div>
            <div style={S.moveCardRow}>
                <span style={{ ...S.chip, background: TYPE_COLORS[c.type], color: "#1a1400" }}>{TYPE_FR[c.type]}</span>
                <span style={{ ...S.chip, background: catCol }}>{c.cat}</span>
                {c.cat !== "STATUT" && <span style={S.stat}>⚔ {c.power}</span>}
                <span style={S.stat}>🎯 {c.accuracy === 0 ? "∞" : `${c.accuracy}%`}</span>
                <span style={S.stat}>{c.pp} PP</span>
                {c.stab && <span style={S.stabTag}>STAB ×1.5</span>}
                {c.coverage && <span style={S.covTag}>couverture</span>}
                {c.statusTier && <span style={S.tierTag}>force {"★".repeat(c.statusTier)}</span>}
            </div>
            {c.effect && <div style={S.moveEffect}>💥 {c.effect}</div>}
        </button>
    )
}

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
    lvlTag: { width: 52, fontSize: 11, fontWeight: 800, color: ACCENT, flexShrink: 0 },
    select: { flex: 1, padding: "7px 8px", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 7, color: "#fff", fontFamily: "inherit", fontSize: 11.5 },
    // Composition (résumé des règles en haut de l'étape Attaques).
    compoRow: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 },
    compoChip: { fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 6 },
    // Ligne de slot (liste des paliers).
    slotRow: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 5, background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
    mini: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
    chipSm: { fontSize: 8.5, fontWeight: 800, color: "#1a1400", borderRadius: 4, padding: "1px 4px" },
    // En-tête du picker.
    pickerHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12.5 },
    // Fiche complète d'attaque (picker).
    moveCard: { width: "100%", textAlign: "left", background: "#0e1c20", border: "1px solid #2a5a55", borderRadius: 8, padding: "8px 10px", marginBottom: 6, color: "#fff", cursor: "pointer", fontFamily: "inherit" },
    moveCardSel: { border: `2px solid ${ACCENT}`, background: "rgba(58,208,192,.12)" },
    moveCardBlocked: { opacity: 0.4, cursor: "not-allowed", filter: "grayscale(0.7)" },
    blockedTag: { fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#6a6a6a", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" },
    attrGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 },
    attrChip: { fontSize: 11, fontWeight: 700, padding: "5px 9px", borderRadius: 8, background: "#0e1c20", border: "1px solid #2a5a55", color: "#cfe", cursor: "pointer", fontFamily: "inherit" },
    attrOn: { background: "rgba(58,208,192,.16)", border: `2px solid ${ACCENT}`, color: "#fff" },
    attrDisabled: { opacity: 0.4, cursor: "not-allowed" },
    moveCardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
    moveCardRow: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" },
    rarChip: { fontSize: 8.5, fontWeight: 800, color: "#0a0a0a", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" },
    stabTag: { fontSize: 8.5, fontWeight: 800, color: "#1a1400", background: "#7ce0a0", borderRadius: 4, padding: "2px 5px" },
    covTag: { fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#c07a3a", borderRadius: 4, padding: "2px 5px" },
    tierTag: { fontSize: 8.5, fontWeight: 800, color: "#1a1400", background: "#e0c060", borderRadius: 4, padding: "2px 5px" },
    moveEffect: { fontSize: 10.5, opacity: 0.8, marginTop: 4 },
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
