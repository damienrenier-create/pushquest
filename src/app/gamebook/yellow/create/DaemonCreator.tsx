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
import { registerCustomSpecies } from "@/lib/gamebook/yellow/data/species"
import { TYPE_COLORS } from "../dex/dexShared"
import {
    type CustomSpec, type Bloomer, type MoveCardInfo, type CurveShape, type RoleKey, type Attribute,
    BLOOMERS, bloomerBudget, validateSpec, previewLine, ROLES, CURVE_LABEL, CURVE_HINT,
    slotChoices, suggestLearnset, moveCard, isDamagingMove, moveRarity, attributeMoveIds, buildCustomSpecies, buildNemesis,
    ATTRIBUTE_LABEL, MAX_ATTRIBUTES, TALENTS, TALENT_KEYS, MAX_TALENT_REROLLS, weakestStatKey,
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
        secretTalent: TALENT_KEYS[Math.floor(Math.random() * TALENT_KEYS.length)], talentRerolls: 0, // talent pioché au hasard
        learnset: [],
    }
}

export default function DaemonCreator({ ownerId, nickname, close }: { ownerId: string; nickname: string; close: () => void }) {
    const [step, setStep] = useState(0)
    const [spec, setSpec] = useState<CustomSpec>(defaultSpec)
    const [created, setCreated] = useState<string | null>(null) // JSON soumis (écran de succès)
    const [pickingSlot, setPickingSlot] = useState<number | null>(null) // slot dont le sélecteur en fiches est ouvert
    const [pickerSort, setPickerSort] = useState<"puissance" | "nom" | "type">("puissance") // tri des attaques (façon dex)

    const patch = (p: Partial<CustomSpec>) => setSpec((s) => ({ ...s, ...p }))
    const goStep = (n: number) => { setPickingSlot(null); setStep(n) } // réinitialise le picker à chaque navigation
    // TALENT SECRET : pioché à l'ouverture (defaultSpec). Reroll = paye 1 pt sur la stat la plus faible (max 15).
    const rerollTalent = () => setSpec((s) => {
        const rolls = s.talentRerolls ?? 0
        const k = weakestStatKey(s.finalStats)
        if (rolls >= MAX_TALENT_REROLLS || s.finalStats[k] <= MIN_FINAL_STAT) return s
        const others = TALENT_KEYS.filter((x) => x !== s.secretTalent)
        const next = others[Math.floor(Math.random() * others.length)] ?? s.secretTalent
        return { ...s, finalStats: { ...s.finalStats, [k]: s.finalStats[k] - 1 }, secretTalent: next, talentRerolls: rolls + 1 }
    })
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
        // Phase 2 : on ENREGISTRE la lignée au registre runtime → le Daemon devient résolvable en combat
        // (getSpecies/speciesOf) tout de suite. Persistance DB / instanciation NG+ = étapes suivantes.
        try { registerCustomSpecies(buildCustomSpecies(finalSpec, ownerId)) } catch { /* lignée invalide déjà bloquée par validateSpec */ }
        const payload = { ownerId, nickname, spec: finalSpec, line: previewLine(finalSpec, ownerId), at: new Date().toISOString() }
        try { window.localStorage.setItem(`pq_daemon_creation_${ownerId}`, JSON.stringify(payload)) } catch { /* quota */ }
        setCreated(JSON.stringify(payload, null, 2))
    }

    // ───────── Écran de succès ─────────
    if (created) {
        // Aperçu du NÉMÉSIS : la contre-lignée qu'ACE forgera (remplace Divin Pâte). Calcul hors JSX (données).
        let nemFinal: { types: PokeType[]; bst: number } | null = null
        try { const nem = previewLine(buildNemesis(effSpec), "ace"); const f = nem[nem.length - 1]; nemFinal = f ? { types: f.types, bst: f.bst } : null } catch { nemFinal = null }
        return (
            <div style={S.overlay} onClick={close}>
                <div style={S.box} onClick={(e) => e.stopPropagation()}>
                    <div style={S.h}>🧬 Daemon envoyé au labo !</div>
                    <p style={S.p}>Ton <b>{spec.name}</b> est créé et jouable (sprite mystère ❓ en attendant que Sartay lui donne son vrai visage).</p>
                    {nemFinal && (
                        <div style={{ ...S.errBox, background: "#f3e6f6", border: "2px solid #8a4a9a", color: "#4a1c54", marginBottom: 8 }}>
                            <b>👹 Le Némésis d&apos;ACE</b> — une lignée forgée pour te contrer :
                            <div style={{ marginTop: 4, fontWeight: 700 }}>
                                {nemFinal.types.map((t) => <span key={t} style={{ ...S.miniChip, background: TYPE_COLORS[t] }}>{TYPE_FR[t]}</span>)} · BST {nemFinal.bst}
                            </div>
                            <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 3 }}>Bats ACE en 1ʳᵉ ville pour te l&apos;approprier.</div>
                        </div>
                    )}
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
                                // Tri des offensives (dispo d'abord, puis grisées) selon le tri choisi.
                                const sortOff = (arr: typeof ch.offensive) => [...arr].sort((a, b) => {
                                    if (!!a.blocked !== !!b.blocked) return a.blocked ? 1 : -1
                                    const ma = getMove(a.id)!, mb = getMove(b.id)!
                                    if (pickerSort === "nom") return ma.name.localeCompare(mb.name, "fr")
                                    if (pickerSort === "type") return ma.type === mb.type ? (mb.power || 0) - (ma.power || 0) : TYPE_FR[ma.type].localeCompare(TYPE_FR[mb.type], "fr")
                                    return (mb.power || 0) - (ma.power || 0)
                                })
                                const off = sortOff(ch.offensive)
                                const renderTile = (o: { id: string; blocked: "dup" | "cascade" | null }) => { const c = moveCard(o.id, lts)!; return <FullCard key={o.id} c={c} sel={learnset[pickingSlot!].moveId === o.id} blocked={o.blocked} onPick={() => { if (o.blocked) return; setLearn(pickingSlot!, o.id); setPickingSlot(null) }} /> }
                                return (
                                    <>
                                        <div style={S.pickerHead}>
                                            <button style={S.ghost} onClick={() => setPickingSlot(null)}>‹ Retour</button>
                                            <b>{label}</b>
                                        </div>
                                        {off.length > 1 && (
                                            <div style={S.sortRow}>
                                                <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.7 }}>Trier :</span>
                                                {([["puissance", "Puissance"], ["nom", "A→Z"], ["type", "Type"]] as const).map(([k, lab]) => (
                                                    <button key={k} onClick={() => setPickerSort(k)} style={{ ...S.sortChip, ...(pickerSort === k ? S.sortOn : {}) }}>{lab}</button>
                                                ))}
                                            </div>
                                        )}
                                        {ch.offensive.length > 0 && <Lbl>⚔️ Offensives ({ch.offensive.filter((o) => !o.blocked).length} dispo)</Lbl>}
                                        {off.map(renderTile)}
                                        {ch.status.length > 0 && <Lbl>📊 Statuts ({ch.status.filter((o) => !o.blocked).length} dispo) — du plus faible au plus fort</Lbl>}
                                        {ch.offensive.length === 0 && ch.status.length === 0 && <Hint>Aucune attaque disponible pour ce palier (pool épuisé — baisse une autre attaque).</Hint>}
                                        {ch.status.map(renderTile)}
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
                            {spec.secretTalent && (() => {
                                const rolls = spec.talentRerolls ?? 0
                                const wk = weakestStatKey(spec.finalStats)
                                const canRoll = rolls < MAX_TALENT_REROLLS && spec.finalStats[wk] > MIN_FINAL_STAT
                                return (
                                    <div style={S.talentBox}>
                                        <div style={{ fontWeight: 800, fontSize: 12.5 }}>✨ Talent secret : <span style={{ color: "#7a4a10" }}>{TALENTS[spec.secretTalent].label}</span></div>
                                        <div style={{ ...S.subtle, marginTop: 2 }}>{TALENTS[spec.secretTalent].desc}</div>
                                        <button style={{ ...S.talentReroll, ...(canRoll ? {} : { opacity: 0.4, cursor: "not-allowed" }) }} disabled={!canRoll} onClick={rerollTalent}>
                                            🎲 Relancer {canRoll ? `(−1 ${STAT_LABEL[wk]} · ${MAX_TALENT_REROLLS - rolls} restantes)` : "(épuisé)"}
                                        </button>
                                    </div>
                                )
                            })()}
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
// Grande TUILE d'attaque (picker) — aérée, infos complètes + descriptif clair pour débutant.
// `blocked` : "dup" (déjà prise ailleurs) / "cascade" (trop forte vu le pool restant) → tuile GRISÉE non cliquable.
function FullCard({ c, sel, onPick, blocked }: { c: MoveCardInfo; sel?: boolean; onPick: () => void; blocked?: "dup" | "cascade" | null }) {
    const catCol = c.cat === "STATUT" ? "#8868c0" : c.cat === "PHYS" ? "#c0532a" : "#3a7ae0"
    const catFull = c.cat === "PHYS" ? "Physique" : c.cat === "SPÉ" ? "Spécial" : "Statut"
    const desc = getMove(c.id)?.description
    return (
        <button disabled={!!blocked} style={{ ...S.tile, ...(sel ? S.tileSel : {}), ...(blocked ? S.moveCardBlocked : {}) }} onClick={onPick}>
            <div style={S.tileHead}>
                <span style={S.tileName}>{c.name}</span>
                {blocked
                    ? <span style={S.blockedTag}>{blocked === "dup" ? "déjà choisie" : "pool épuisé"}</span>
                    : <span style={{ ...S.rarChip, background: RAR_COL[c.rarity] }}>{c.rarity}</span>}
            </div>
            <div style={S.tileChips}>
                <span style={{ ...S.typePill, background: TYPE_COLORS[c.type] }}>{TYPE_FR[c.type]}</span>
                <span style={{ ...S.catPill, background: catCol }}>{catFull}</span>
                {c.stab && <span style={S.stabTag}>STAB ×1.5</span>}
                {c.coverage && <span style={S.covTag}>couverture</span>}
                {c.statusTier ? <span style={S.tierTag}>force {"★".repeat(c.statusTier)}</span> : null}
            </div>
            <div style={S.tileStats}>
                {c.cat !== "STATUT" && <span style={S.statBox}><b style={S.statBig}>{c.power}</b><span style={S.statLbl}>💥 Puissance</span></span>}
                <span style={S.statBox}><b style={S.statBig}>{c.accuracy === 0 ? "∞" : `${c.accuracy}%`}</b><span style={S.statLbl}>🎯 Précision</span></span>
                <span style={S.statBox}><b style={S.statBig}>{c.pp}</b><span style={S.statLbl}>PP</span></span>
            </div>
            {c.effect && <div style={S.tileEffect}>⚡ {c.effect}</div>}
            {desc && <div style={S.tileDesc}>{desc}</div>}
        </button>
    )
}

// DA lumineuse « Pokédex des attaques » (parchemin crème + encre). cf. MovesPanel.tsx.
const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86", CARD = "#fff8e8", CARDALT = "#efe6c8", SELB = "#1b5fa6"
const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9600, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontFamily: "system-ui, sans-serif", color: INK },
    box: { width: "min(460px, 98vw)", maxHeight: "96vh", display: "flex", flexDirection: "column", background: CREAM, border: `3px solid ${INK}`, borderRadius: 12, padding: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.5)" },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    h: { fontSize: 16, fontWeight: 800, color: INK },
    x: { background: "transparent", color: INK, border: `2px solid ${DARK}`, borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontFamily: "inherit", fontWeight: 800 },
    steps: { display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 },
    stepChip: { fontSize: 9.5, fontWeight: 700, padding: "4px 6px", borderRadius: 6, border: `2px solid ${DARK}`, background: CARD, color: INK, cursor: "pointer", fontFamily: "inherit" },
    stepOn: { background: INK, color: CREAM, borderColor: INK },
    body: { flex: 1, overflowY: "auto", padding: "4px 2px", minHeight: 180 },
    lbl: { fontSize: 12, fontWeight: 800, margin: "10px 0 5px", color: INK },
    hint: { fontSize: 10.5, opacity: 0.9, lineHeight: 1.45, marginTop: 8, background: CARDALT, border: `1px dashed ${DARK}`, borderRadius: 8, padding: "6px 8px", color: INK },
    subtle: { fontSize: 10, opacity: 0.6, fontWeight: 400 },
    input: { width: "100%", padding: "9px 10px", background: "#fff", border: `2px solid ${DARK}`, borderRadius: 8, color: INK, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", outline: "none" },
    area: { width: "100%", padding: "9px 10px", background: "#fff", border: `2px solid ${DARK}`, borderRadius: 8, color: INK, fontFamily: "inherit", fontSize: 12.5, minHeight: 64, resize: "vertical", boxSizing: "border-box", outline: "none" },
    row: { display: "flex", gap: 6, flexWrap: "wrap" },
    opt: { flex: 1, minWidth: 70, padding: "10px 6px", background: CARD, border: `2px solid ${DARK}`, borderRadius: 8, color: INK, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    optWide: { width: "100%", textAlign: "left", padding: "10px 12px", background: CARD, border: `2px solid ${DARK}`, borderRadius: 8, color: INK, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 },
    optOn: { background: "#fbeecb", borderColor: INK, outline: `1px solid ${INK}` },
    typeGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 },
    typeBtn: { padding: "7px 2px", borderRadius: 6, border: "none", color: "#1a1400", fontWeight: 800, fontSize: 10, cursor: "pointer", fontFamily: "inherit" },
    statRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 },
    statName: { width: 92, fontSize: 11.5, fontWeight: 700, color: INK },
    step: { width: 30, height: 30, borderRadius: 7, border: `2px solid ${INK}`, background: CARD, color: INK, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 },
    statVal: { minWidth: 34, textAlign: "center", fontSize: 14, fontWeight: 800, color: INK },
    bar: { flex: 1, height: 8, background: CARDALT, borderRadius: 4, overflow: "hidden", border: `1px solid ${DARK}` },
    barFill: { height: "100%", borderRadius: 4 },
    learnRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
    lvlTag: { width: 52, fontSize: 11, fontWeight: 800, color: SELB, flexShrink: 0 },
    select: { flex: 1, padding: "7px 8px", background: "#fff", border: `2px solid ${DARK}`, borderRadius: 7, color: INK, fontFamily: "inherit", fontSize: 11.5 },
    // Composition (résumé des règles en haut de l'étape Attaques).
    compoRow: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 },
    compoChip: { fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 6 },
    // Tri du picker (façon dex des attaques).
    sortRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" },
    sortChip: { background: CARD, border: `2px solid ${DARK}`, borderRadius: 12, padding: "3px 10px", fontSize: 10.5, fontWeight: 700, color: INK, cursor: "pointer", fontFamily: "inherit" },
    sortOn: { background: INK, color: CREAM, borderColor: INK },
    // Ligne de slot (liste des paliers).
    slotRow: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 5, background: CARD, border: `2px solid ${DARK}`, borderRadius: 8, color: INK, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
    mini: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
    chipSm: { fontSize: 8.5, fontWeight: 800, color: "#fff", borderRadius: 4, padding: "1px 4px", textShadow: "0 1px 1px rgba(0,0,0,0.3)" },
    // En-tête du picker.
    pickerHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12.5, color: INK },
    // Fiche complète d'attaque (picker).
    moveCard: { width: "100%", textAlign: "left", background: CARD, border: `2px solid ${DARK}`, borderRadius: 8, padding: "8px 10px", marginBottom: 6, color: INK, cursor: "pointer", fontFamily: "inherit" },
    moveCardSel: { border: `2px solid ${SELB}`, background: "#dcebfb" },
    moveCardBlocked: { opacity: 0.45, cursor: "not-allowed", filter: "grayscale(0.6)" },
    blockedTag: { fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#9a8f78", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" },
    attrGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 },
    attrChip: { fontSize: 11, fontWeight: 700, padding: "5px 9px", borderRadius: 8, background: CARD, border: `2px solid ${DARK}`, color: INK, cursor: "pointer", fontFamily: "inherit" },
    attrOn: { background: "#fbeecb", border: `2px solid ${INK}`, color: INK },
    attrDisabled: { opacity: 0.4, cursor: "not-allowed" },
    moveCardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
    moveCardRow: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" },
    rarChip: { fontSize: 8.5, fontWeight: 800, color: "#241a08", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" },
    stabTag: { fontSize: 8.5, fontWeight: 800, color: "#123a1c", background: "#a8e0b8", borderRadius: 4, padding: "2px 5px" },
    covTag: { fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#c07a3a", borderRadius: 4, padding: "2px 5px" },
    tierTag: { fontSize: 8.5, fontWeight: 800, color: "#3a2e10", background: "#e8cf70", borderRadius: 4, padding: "2px 5px" },
    moveEffect: { fontSize: 10.5, opacity: 0.85, marginTop: 4, color: INK },
    // Grande TUILE d'attaque (aérée) — picker façon dex des attaques.
    tile: { width: "100%", textAlign: "left", background: CARD, border: `2px solid ${DARK}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, color: INK, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 9 },
    tileSel: { border: `3px solid ${SELB}`, background: "#e8f2fd", boxShadow: "0 2px 10px rgba(27,95,166,0.2)" },
    tileHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
    tileName: { fontSize: 17, fontWeight: 800, color: INK, letterSpacing: 0.2 },
    tileChips: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
    typePill: { fontSize: 11, fontWeight: 800, color: "#fff", padding: "3px 11px", borderRadius: 12, letterSpacing: 0.4, textShadow: "0 1px 1px rgba(0,0,0,0.35)" },
    catPill: { fontSize: 10.5, fontWeight: 800, color: "#fff", padding: "3px 10px", borderRadius: 12, textShadow: "0 1px 1px rgba(0,0,0,0.3)" },
    tileStats: { display: "flex", gap: 8 },
    statBox: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: "#fffdf5", border: `1.5px solid ${DARK}`, borderRadius: 9, padding: "7px 4px" },
    statBig: { fontSize: 18, fontWeight: 900, color: INK, lineHeight: 1 },
    statLbl: { fontSize: 9.5, fontWeight: 600, color: INK, opacity: 0.65 },
    tileEffect: { fontSize: 12, fontWeight: 700, color: "#7a4a10", background: "#f6e9c8", border: `1px solid ${DARK}`, borderRadius: 8, padding: "6px 9px" },
    tileDesc: { fontSize: 11.5, lineHeight: 1.5, color: INK, opacity: 0.82, fontStyle: "italic" },
    talentBox: { background: "#f6e9c8", border: `2px solid ${DARK}`, borderRadius: 8, padding: "9px 11px", margin: "8px 0 6px", color: INK },
    talentReroll: { marginTop: 8, padding: "7px 12px", background: INK, color: CREAM, border: "none", borderRadius: 8, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
    previewCard: { background: CARD, border: `2px solid ${DARK}`, borderRadius: 8, padding: "7px 9px", marginBottom: 6 },
    previewHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" },
    previewStats: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, marginTop: 4, opacity: 0.9 },
    miniChip: { fontSize: 9, fontWeight: 800, color: "#fff", borderRadius: 4, padding: "1px 5px", marginLeft: 3, textShadow: "0 1px 1px rgba(0,0,0,0.3)" },
    errBox: { background: "#fbe2d8", border: "2px solid #c0392b", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, color: "#8a2418" },
    okBox: { background: "#dff3e0", border: "2px solid #2e7d32", borderRadius: 8, padding: "10px", fontSize: 12.5, color: "#1f5a24", textAlign: "center" },
    nav: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 },
    ghost: { padding: "9px 14px", background: "transparent", color: INK, border: `2px solid ${DARK}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    primary: { padding: "9px 16px", background: INK, color: CREAM, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
    p: { fontSize: 12.5, lineHeight: 1.5, margin: "6px 0", color: INK },
    json: { width: "100%", height: 160, background: "#fffdf5", border: `2px solid ${DARK}`, borderRadius: 8, color: INK, fontFamily: "monospace", fontSize: 10, padding: 8, boxSizing: "border-box", marginBottom: 8 },
}
