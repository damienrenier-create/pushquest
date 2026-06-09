// src/lib/gamebook/yellow/data/attackAnims.ts
//
// Nexus Jaune Éclair — ANIMATIONS D'ATTAQUE, data-driven. On catégorise par
// MÉCANIQUE (impact, projectile, drain, boost…) plutôt que par type : le profil
// donne le mouvement/flash/shake, et le TYPE de l'attaque donne palette + particule.

import { getMove } from "./moves"

export type AtkCategory =
    | "impact" | "impact_heavy" | "projectile" | "recoil" | "priority"
    | "drain" | "heal" | "boost" | "debuff"

export interface AtkCatProfile {
    durationMs: number
    motion: "burst" | "sweep" | "dash" | "float" | "rise" | "rays" | "pulse"
    shake: "none" | "light" | "heavy"
    flash: boolean
    bloom: boolean
    onCaster: boolean   // l'effet se joue sur le lanceur (boost/heal) plutôt que la cible
    tint?: string       // teinte plein écran brève (recul/debuff)
    easing: string
}

export const ATK_CATEGORIES: Record<AtkCategory, AtkCatProfile> = {
    impact:       { durationMs: 300, motion: "burst", shake: "light", flash: false, bloom: false, onCaster: false, easing: "cubic-bezier(.7,0,.84,0)" },
    impact_heavy: { durationMs: 360, motion: "burst", shake: "heavy", flash: true,  bloom: true,  onCaster: false, easing: "cubic-bezier(.7,0,.84,0)" },
    projectile:   { durationMs: 360, motion: "sweep", shake: "light", flash: false, bloom: true,  onCaster: false, easing: "cubic-bezier(.22,.61,.36,1)" },
    recoil:       { durationMs: 380, motion: "burst", shake: "heavy", flash: true,  bloom: false, onCaster: false, tint: "rgba(224,64,64,0.25)", easing: "cubic-bezier(.83,0,.17,1)" },
    priority:     { durationMs: 250, motion: "dash",  shake: "light", flash: true,  bloom: false, onCaster: false, easing: "steps(5)" },
    drain:        { durationMs: 400, motion: "float", shake: "none",  flash: false, bloom: true,  onCaster: false, easing: "cubic-bezier(.37,0,.63,1)" },
    heal:         { durationMs: 420, motion: "rise",  shake: "none",  flash: false, bloom: true,  onCaster: true,  easing: "ease-out" },
    boost:        { durationMs: 340, motion: "rays",  shake: "none",  flash: true,  bloom: true,  onCaster: true,  easing: "cubic-bezier(.34,1.56,.64,1)" },
    debuff:       { durationMs: 360, motion: "pulse", shake: "none",  flash: false, bloom: false, onCaster: false, tint: "rgba(150,60,180,0.22)", easing: "cubic-bezier(.65,0,.35,1)" },
}

/** TYPE → palette + particule emoji. */
export const TYPE_FX: Record<string, { palette: [string, string]; emoji: string }> = {
    NORMAL:  { palette: ["#EDE6CF", "#B8AE8A"], emoji: "💥" },
    FEU:     { palette: ["#FFD24A", "#E0502A"], emoji: "🔥" },
    EAU:     { palette: ["#7AD7F0", "#1C6FB0"], emoji: "💧" },
    PLANTE:  { palette: ["#9ACD32", "#2E8B57"], emoji: "🍃" },
    ELEC:    { palette: ["#FFF27A", "#3A8EE0"], emoji: "⚡" },
    GLACE:   { palette: ["#CFF6FF", "#2FB8C0"], emoji: "❄️" },
    COMBAT:  { palette: ["#E0654A", "#9A2F2F"], emoji: "👊" },
    POISON:  { palette: ["#C77AD8", "#5A2F7A"], emoji: "☠️" },
    SOL:     { palette: ["#D8BE7A", "#8A6A3A"], emoji: "🪨" },
    VOL:     { palette: ["#CFE6FF", "#7AA7E0"], emoji: "🌪️" },
    PSY:     { palette: ["#F08CC0", "#B0307A"], emoji: "🔮" },
    INSECTE: { palette: ["#C8D84A", "#6A8A20"], emoji: "🐛" },
    ROCHE:   { palette: ["#C9B27A", "#5E4A2A"], emoji: "🪨" },
    SPECTRE: { palette: ["#9A7AD0", "#3A1F6E"], emoji: "👻" },
    DRAGON:  { palette: ["#7A8AE0", "#3A2FB0"], emoji: "🐉" },
}

/** moveId → catégorie mécanique (les 60 attaques). */
export const ATTACK_CATEGORY: Record<string, AtkCategory> = {
    // NORMAL
    charge: "impact", coup_d_boule: "impact", belier: "recoil", vive_attaque: "priority",
    charge_desesperee: "recoil", danse_lames: "boost", mur_de_fer: "boost", elan: "boost", hurlement: "debuff",
    // FEU
    lance_flammes: "projectile", flamme_ardente: "projectile", flammeche: "projectile",
    // EAU
    hydrocanon: "projectile", lame_eau: "projectile", pistolet_a_o: "projectile",
    // PLANTE
    tempete_verte: "projectile", etreinte_sylvestre: "drain", fouet_lianes: "impact",
    vampigraine: "debuff", tranche_feuille: "impact_heavy", mega_sangsue: "drain", spores_dodo: "debuff",
    // ELEC
    etincelle: "projectile", fulgurance: "projectile", cage_eclair: "debuff",
    // GLACE
    souffle_polaire: "projectile", coup_d_givre: "projectile",
    // COMBAT
    crochet_maitre: "impact_heavy", balayage: "impact", poing_karate: "impact", double_pied: "impact",
    // POISON
    dard_venin: "impact", toxik: "debuff", bombe_beurk: "projectile", crachat_acide: "projectile",
    // SOL
    seisme: "impact_heavy", faille_sismique: "impact_heavy", tir_de_boue: "projectile", jet_de_sable: "debuff",
    // VOL
    pique_fatal: "recoil", fonce_bec: "impact", tornade: "projectile", picpic: "impact",
    // PSY
    vague_mentale: "projectile", choc_mental: "projectile", onde_folie: "debuff", repos: "heal", focalisation: "boost",
    // INSECTE
    dard_mortel: "impact_heavy", morsure: "impact", dard_nuee: "projectile",
    // ROCHE
    lame_de_roche: "impact_heavy", eboulis: "projectile", jet_pierres: "projectile", carapace_diamant: "boost",
    // SPECTRE
    ball_ombre: "projectile", ombre_furtive: "priority", lechouille: "impact",
    // DRAGON
    draco_charge: "impact_heavy", draco_souffle: "projectile",
}

export interface AttackFxSpec {
    category: AtkCategory
    profile: AtkCatProfile
    palette: [string, string]
    emoji: string
}

/** Résout l'anim d'une attaque (catégorie + palette/particule du type). */
export function pickAttackFx(moveId: string): AttackFxSpec {
    const m = getMove(moveId)
    // défaut si non mappé : par puissance (statut → debuff, fort → impact_heavy, sinon impact).
    let category = ATTACK_CATEGORY[moveId]
    if (!category) category = !m || m.power === 0 ? "debuff" : m.power >= 80 ? "impact_heavy" : "impact"
    const tf = (m && TYPE_FX[m.type]) || TYPE_FX.NORMAL
    return { category, profile: ATK_CATEGORIES[category], palette: tf.palette, emoji: tf.emoji }
}
