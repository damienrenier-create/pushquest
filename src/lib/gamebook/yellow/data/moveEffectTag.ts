// src/lib/gamebook/yellow/data/moveEffectTag.ts
//
// RÉSUMÉ D'EFFET d'une attaque, en une ligne — le panneau de détail du menu Attaque (BattleScreen) et la comparaison à
// l'apprentissage (MoveCompare). Jusqu'au 31/10/2026, seul le PREMIER effet notable était résumé : Ronces Vampires
// (graine + cinq baisses) n'affichait que la graine, Onde Cérébrale qu'une baisse sur trois. On liste
// désormais TOUS les effets, séparés par « · » ; une attaque à un seul effet s'affiche comme avant. Module pur.

import type { MoveData } from "../battle/types"
import { VANISH_TURNS_MIN, VANISH_TURNS_MAX } from "../battle/vanish"

export const STATUS_FR: Record<string, string> = { BURN: "Brûlure", PARALYSIS: "Paralysie", POISON: "Poison", TOXIC: "Poison grave", SLEEP: "Sommeil", FREEZE: "Gel" }
// La graine est nommée pour ce qu'elle fait, pas d'après Vampigraine : Ronces Vampires (Florapanthe) la pose aussi.
export const VOLATILE_FR: Record<string, string> = { SEEDED: "Graines parasites (drain par tour)", OSMOSED: "Pellicule d'eau (drain par tour)", CONFUSION: "Confusion" }
export const STAGE_FR: Record<string, string> = { atk: "ATQ", def: "DÉF", spe: "VIT", spc: "SPÉ", acc: "Préc.", eva: "Esq." }

/** « long » = panneau de combat (phrases) ; « short » = comparaison à l'apprentissage (compact). null si rien de notable. */
export function moveEffectTag(mv: MoveData, style: "long" | "short" = "long"): string | null {
    const e = mv.effect
    if (!e) return null
    const long = style === "long"
    const parts: string[] = []
    if (e.adaptiveStab) parts.push(long ? "STAB adaptatif : type PRIMAIRE du Daemon, catégorie calée sur sa meilleure stat" : "Adaptatif : type primaire + meilleure stat (toujours STAB)")
    if (e.recoilPct) parts.push(long ? `Recul : ${e.recoilPct}% des dégâts subis` : `Recul ${e.recoilPct}%`)
    if (e.drainPct) parts.push(long ? `Vol de PV : ${e.drainPct}%` : `Vol de PV ${e.drainPct}%`)
    if (e.healPct) parts.push(long ? `Soigne ${e.healPct}% des PV` : `Soigne ${e.healPct}% PV`)
    // 🌩️ RANCŒUR CÉLESTE (Namizeus) : disparition 1 à 5 tours (intouchable), 1 chance sur 2 d'agir, puis soin total + sommeil.
    if (e.vanish) parts.push(long ? `Invisible ${VANISH_TURNS_MIN} à ${VANISH_TURNS_MAX} tours (intouchable) · 1 chance sur 2 d'agir · puis dort, PV au max` : `Invisible ${VANISH_TURNS_MIN}-${VANISH_TURNS_MAX} tours · 1 chance sur 2 d'agir · puis dort, PV max`)
    if (e.fixedDamage) parts.push(long ? `Inflige ${e.fixedDamage} PV fixes` : `${e.fixedDamage} PV fixes`)
    if (e.multiHit) { const [a, b] = e.multiHit; parts.push(a === b ? `Frappe ${a}×` : long ? `Frappe ${a} à ${b}×` : `Frappe ${a}-${b}×`) }
    if (e.inflictStatus) { const s = STATUS_FR[e.inflictStatus] ?? e.inflictStatus; parts.push(e.chance && e.chance < 100 ? (long ? `${s} (${e.chance}%)` : `${s} ${e.chance}%`) : s) }
    if (e.inflictVolatile) { const v = VOLATILE_FR[e.inflictVolatile]; if (v) parts.push(v) }
    if (e.flinch) parts.push(e.chance ? (long ? `Peut apeurer (${e.chance}%)` : `Apeure ${e.chance}%`) : "Peut apeurer")
    if (e.statChanges?.length) {
        // Regroupées par cible et par cran : « -1 VIT/DÉF/ATQ/SPÉ/Préc. adv. · +1 DÉF ».
        const groups: { key: string; sign: string; adv: boolean; stats: string[] }[] = []
        for (const c of e.statChanges) {
            const sign = c.stages > 0 ? `+${c.stages}` : `${c.stages}`
            const adv = c.target !== "self"
            const key = `${sign}|${adv}`
            const g = groups.find((x) => x.key === key)
            const label = STAGE_FR[c.stat] ?? c.stat
            if (g) g.stats.push(label); else groups.push({ key, sign, adv, stats: [label] })
        }
        const text = groups.map((g) => `${g.sign} ${g.stats.join("/")}${g.adv ? " adv." : ""}`).join(" · ")
        // FIABILITÉ : sur un coup OFFENSIF (puissance > 0), le changement est un effet SECONDAIRE (chance = e.chance ?? 100)
        //   → on précise « (10%) » ou « (à coup sûr) ». Sur un move de STATUT pur, il est toujours garanti (c'est son but).
        parts.push(mv.power > 0 && long ? `${text}${e.chance && e.chance < 100 ? ` (${e.chance}%)` : " (à coup sûr)"}` : text)
    }
    if (e.highCrit) parts.push(long ? "Taux de critique élevé" : "Crit élevé")
    if (e.sureHit) parts.push("Ne rate jamais")
    if (e.twoTurn || e.dig || e.fly) parts.push(long ? "Charge sur 2 tours" : "Charge 2 tours")
    return parts.length ? parts.join(" · ") : null
}
