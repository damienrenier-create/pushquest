"use client"

// Nexus Jaune Éclair — GUIDE du panneau devant le gym, EN CARROUSEL (1 page/section
// pour la lisibilité). Les joueurs n'ont AUCUNE stat en jeu : ce guide leur donne
// tout pour battre l'arène COURANTE. Il se met à jour avec le bâtiment (Plante avant
// le badge plante, Roche après). ◀ ▶ + swipe entre les sections.

import { useState, useRef, useEffect } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { usePlayer, getGameMode } from "@/lib/gamebook/yellow/store/playerStore"
import { currentArenaMapId } from "@/lib/gamebook/yellow/maps"

const CREAM = "#f4ecd4"
const INK = "#2a1c10"
const DARK = "#cdbb86"

type Page = { t: string; rows: [string, string][] }

// MODE FUN — réécrit à la volée les lignes qui parlent de reps/quota (absents en fun) : prix affichés en ⚡,
// astuce quota → rotation heure/jour + IV au hasard, formule Saiyan → +1 fixe. Les autres modes rendent tel quel.
function funifyRow(k: string, v: string): string {
    let out = v.replace(/(\d+)\s*reps/g, "$1 ⚡") // la monnaie fun = énergie (pas de reps encodées)
    if (k.includes("Astuce") && /quota/i.test(v)) out = "Les sauvages changent selon l'HEURE et le JOUR, et leurs IV sont tirés au HASARD → enchaîne les rencontres (et chasse à plusieurs pour de meilleurs génes)."
    if (k === "Combien") out = "En mode fun : +1 point Saiyan par niveau (pas de quota à boucler)."
    return out
}

function Row({ k, v }: { k: string; v: string }) {
    return <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK }}><b>{k} :</b> {v}</div>
}

// ====== ARÈNE PLANTE ======
const PLANTE_PAGES: Page[] = [
    { t: "⚔️ Frappe en FEU, GLACE ou INSECTE (×2)", rows: [
        ["🔥 Feu", "Flammèche — Braisille/Fennaise niv 7 (ou un Pyrenard). Flamme Ardente — Pyrenard."],
        ["❄️ Glace", "Coup d'Givre (10% de GELER !) — Auroruff niv 8, Gouttiny niv 18."],
        ["🐛 Insecte", "Dard-Nuée (frappe 2 à 5 fois) — Ruffiant niv 6. Morsure — Formiguer (Ruffiant évolue niv 15)."],
        ["🦅 Vol", "Picpic — Plumiot/Cornaissant/Draclet niv 5. Tornade — Plumiot niv 20."],
        ["☠️ Poison", "Dard-Venin (30% empoisonne) — Ruffiant niv 13, Cornaissant/Sporbéo niv 14."],
    ] },
    { t: "🗺️ Où capturer (Route Nord)", rows: [
        ["⛰️ Montagnes", "Fennaise 🔥, Lavapetit 🔥, Auroruff ❄️ (peu communs)."],
        ["🌲 Sapins", "Ruffiant 🐛 (commun), Sporbéo ☠️ (rare)."],
        ["🎁 Starter", "Braisille 🔥 — si tu l'as choisi au départ."],
        ["💡 Astuce", "Dépasse ton quota → plus de Daemons rares ET de meilleurs IV."],
    ] },
    { t: "📈 Quelle stat améliorer ?", rows: [
        ["Feu / Glace", "attaques SPÉCIALES → monte la SPÉ."],
        ["Insecte / Vol", "attaques PHYSIQUES → monte l'ATTAQUE."],
        ["Encaisser", "la Plante frappe en SPÉCIAL → la SPÉ sert aussi de défense. Et le Feu résiste à la Plante."],
    ] },
    { t: "🛒 À la boutique", rows: [
        ["💿 CT", "Focalisation (+Spé), Danse-Lames (+Atk) — un tour de set-up, puis tu balaies."],
        ["🧴 Objets X", "X-Spé / X-Attaque : +1 cran le temps du combat. Super Pasta (+1 niveau)."],
    ] },
    { t: "🚫 À éviter · 🗝️ L'arène", rows: [
        ["À éviter", "Pas d'Eau, Sol ni Roche (la Plante leur fait ×2). L'Élec est résisté (inutile)."],
        ["Ordre", "Bats les 4 gardes (ordre libre), puis le Doyen Sylvain."],
        ["Boss", "Gare à ses drains (Vampigraine, Méga-Sangsue) et à sa Florapanthe, vive et coriace."],
    ] },
]

// ====== ARÈNE ROCHE (≤ niv 30) ======
const ROCHE_PAGES: Page[] = [
    { t: "💥 Le principe (2e arène — plus dure !)", rows: [
        ["Faiblesses", "La Roche tombe sous EAU · PLANTE · COMBAT · SOL (×2)."],
        ["Le ×4", "La plupart sont Roche/SOL → Eau ET Plante font ×4 !"],
        ["La clé", "Énorme Défense mais SPÉ (déf spéciale) FAIBLE → tape en SPÉCIAL : Eau & Plante ignorent le mur. (Combat/Sol = physiques, ils butent sur la Déf.)"],
        ["Niveau conseillé", "Boss niv 25 + dresseurs ENTRAÎNÉS (boostés). Viens avec une équipe ÉVOLUÉE ~niv 22-26, soignée."],
    ] },
    { t: "💧 EAU — capture · attaques", rows: [
        ["Gouttiny → Ondulo (16)", "STARTER Eau. Pistolet à O niv 6 · Coup d'Givre 18→24 · HYDROCANON (110) niv 34."],
        ["Loutrille → Ondaloutre (16)", "Route Nord PRÈS DE L'EAU. Pistolet à O 6 · LAME D'EAU (65) niv 20 · Coup d'Givre 26."],
        ["Piouflot → Hérondée (17)", "Route Nord, eau (Vol/Eau). Pistolet à O 5 · Lame d'Eau niv 20."],
        ["Têtardoc → Grenarc (18)", "GROTTE près de la mare (Roche/Eau). Pistolet à O · Lame d'Eau niv 22."],
    ] },
    { t: "🌿 PLANTE — capture · attaques", rows: [
        ["Feuillichot → Broubouc (16)", "STARTER. Fouet Lianes 4 · MÉGA-SANGSUE (vole 50%) 16→20 · TEMPÊTE VERTE (90) niv 28 (gratuit !)."],
        ["Pampousse → Féliane (16)", "Route Nord, SAPINS. Fouet Lianes 4 · Tranche-Feuille (55) 18 · Méga-Sangsue 24."],
        ["Broussours (Combat/Plante)", "Route Nord, sapins. Double-Pied 7 + Fouet Lianes 18 → double contre."],
        ["⚠️ Attention", "le boss PUNIT le Plante (Feu + Glace) → garde un plan B Eau/Combat."],
    ] },
    { t: "💪 COMBAT (×2) — capture · attaques", rows: [
        ["Couperin → Frappard (28)", "Route Nord (commun). Double-Pied 7 · POING-KARATÉ (50) niv 18."],
        ["Forgeotin → Marteloutan (18)", "Route Nord. Double-Pied 7 · Balayage (60) 24 · CROCHET DU MAÎTRE (80) niv 30."],
        ["Trolystrik → Brutetrik (17)", "Route Nord montagnes (Combat/Élec). Double-Pied 7 · Poing-Karaté · Balayage 30."],
    ] },
    { t: "🌍 SOL (×2, ×4 sur la lave) — capture", rows: [
        ["Quadroc / Octoroc", "capturés en GROTTE (lignée diamant). TIR DE BOUE (Sol 55) d'emblée — un Roche qui tape la Roche."],
        ["Cailloutchi → Roctaur (25)", "Route Nord/Grotte. À niv 30, Roctaur apprend SÉISME (Sol 100) — gros coup."],
    ] },
    { t: "💿 LES CT (tu as le badge plante)", rows: [
        ["⭐ Étreinte Sylvestre", "TU L'AS DÉJÀ (cadeau du Druide) ! Plante 75 + VOLE 50% → ×4 ET te soigne. Enseigne-la à un Daemon Plante."],
        ["Tempête Verte", "EN VENTE 700 reps (badge plante) : Plante 90. (Ou gratuit : Broubouc l'apprend niv 28.)"],
        ["Vampigraine", "EN VENTE 450 reps : graines qui drainent l'ennemi chaque tour."],
        ["Set-up", "Focalisation (450, +Spé) pour Eau/Plante · Danse-Lames (400, +Atk) pour Combat."],
        ["Pas encore", "Hydrocanon/Souffle Polaire = badge EAU · Séisme (CT) = Champion."],
    ] },
    { t: "🔥 Formule Saiyan + où mettre les points", rows: [
        ["Combien", "Par niveau : +2 si quota DÉPASSÉ chaque jour · +1 normal · +0 si quota raté."],
        ["Où / quoi", "Fiche du Daemon → ENTRAÎNEMENT SAIYAN. Pour la Roche, mets en SPÉ (attaque spé Eau/Plante + déf spé)."],
    ] },
    { t: "⚔️ Le boss : MAÎTRE GRANIT (5 Daemons fixes)", rows: [
        ["Ouvre sur", "ROCTAUR niv 25 (Roche/Sol) + Faille Sismique — mur de Déf, mais SPÉ NULLE : un coup spécial Eau/Plante ×4 le brise."],
        ["Anti-Plante", "FISSURALAVE (Roche/Feu) + IOROURS (Roche/Glace) tapent le Plante ×2 → aie un Eau ou Combat."],
        ["Le rapide", "RÉTRORAPTOR (Roche/Vol, très rapide) te double → un Eau bulky l'encaisse et le calme."],
        ["+ OCTOROC", "(Roche/Sol, mur de Déf). 5 Daemons au total → soigne-toi au Centre Daemon AVANT."],
    ] },
    { t: "🚫 Ce qui NE marche PAS · 🗝️ L'arène", rows: [
        ["Résistés ×0.5", "Feu, Vol, Normal, Poison → la Roche les encaisse."],
        ["Neutres ×1 (inutiles)", "GLACE, DRAGON, Élec, Insecte, Psy, Spectre → AUCUN avantage (la Glace et le Dragon ne servent à RIEN ici !)."],
        ["Ordre", "Bats les 4 gardes (ordre libre) → le Maître Granit."],
        ["Butin", "Badge Roche + la CT signature FAILLE SISMIQUE (offerte, introuvable ailleurs)."],
    ] },
]

// ====== ARÈNE FEU "La Caldeira" (≤ niv 45) ======
const FEU_PAGES: Page[] = [
    { t: "🌋 Le principe (3e arène — la Caldeira)", rows: [
        ["Faiblesses", "Le Feu tombe sous EAU · SOL · ROCHE (×2)."],
        ["⚠️ Piège n°1", "TOUCANYON (Vol/Feu) est IMMUNE au Sol → seule la ROCHE la foudroie (×4 !)."],
        ["⚠️ Piège n°2", "VIPEMBER (l'as) est un tank SPÉCIAL et sa PYROTECHNIE baisse ta Spé (-2) → tes coups Eau/Élec FONDENT. Frappe en PHYSIQUE (Sol/Roche)."],
        ["Niveau conseillé", "Boss niv 37, gardes ENTRAÎNÉES (boostées). Viens ~niv 30-34, équipe variée et soignée."],
    ] },
    { t: "🪨 ROCHE — la MVP (Toucanyon ×4)", rows: [
        ["Jet de Pierres (50)", "Cailloutchi niv 8 · Lavapetit niv 8 · Rembodo niv 12 (Route Nord / Grotte)."],
        ["Éboulis (75)", "Roctaur niv 24 · Cailloutchi niv 26 · Octoroc & lignée diamant d'emblée (GROTTE)."],
        ["Lame de Roche (90)", "CT20 en vente (badge roche) · Diamantine et la lignée diamant l'ont d'emblée."],
        ["💡 Le + tôt <30", "Un OCTOROC (Grotte, Roche/Sol) a Tir de Boue (Sol) + Éboulis (Roche) DÈS le départ → couverture totale, et PHYSIQUE."],
    ] },
    { t: "🌍 SOL — touche 5/6 (sauf Toucanyon)", rows: [
        ["Tir de Boue (55)", "Quadroc · Octoroc d'emblée (GROTTE) · Roctaur niv 36."],
        ["Séisme (100)", "Roctaur niv 30 · Fissuralave niv 30 — gros coup, touche 5 des 6."],
        ["⭐ Faille Sismique (90)", "Tu l'AS DÉJÀ (cadeau de Granit) ! Sol 90 + monte ta Déf. Parfaite sur un Roche/Sol."],
        ["🚫 Rappel", "le Sol NE TOUCHE PAS Toucanyon (Vol) → garde une attaque Roche pour elle."],
    ] },
    { t: "💧 EAU — 4/6, mais gare au SPÉ", rows: [
        ["Lame d'Eau (65)", "Loutrille niv 20 · Grenarc niv 22 (Route Nord eau / Grotte)."],
        ["Hydrocanon (110)", "Ondulo / Ondaloutre niv 34 · Aquapanthe d'emblée (la CT = badge eau)."],
        ["⚠️ Spécial", "l'Eau est SPÉCIALE → la Pyrotechnie de Vipember la divise par 2. Réserve-la aux autres, ou KO Vipember en premier."],
    ] },
    { t: "⚡ ÉLEC — pile sur les tortues + Toucanyon", rows: [
        ["Étincelle (65)", "Électroatiss niv 6 (Route Nord, montagnes) · Voltapanthe d'emblée."],
        ["Fulgurance (90)", "Zappeuréal niv 38 · Brutetrik niv 36 (Combat/Élec)."],
        ["Cible", "×2 sur Braisécaille, Caldéront ET Toucanyon. Mais SPÉCIAL → même piège Pyrotechnie."],
    ] },
    { t: "📈 Quelle stat améliorer ?", rows: [
        ["Sol / Roche", "attaques PHYSIQUES → monte l'ATTAQUE (et elles IGNORENT la Pyrotechnie !)."],
        ["Eau / Élec", "attaques SPÉCIALES → monte la SPÉ… mais Vipember les punit."],
        ["Le bon plan", "Vipember est un tank SPÉCIAL : un physique Sol/Roche perce sa Déf molle. Priorise le PHYSIQUE pour toute l'arène."],
    ] },
    { t: "💿 LES CT utiles", rows: [
        ["⭐ Faille Sismique", "tu l'as (cadeau Granit) : Sol 90 + auto +Déf. À coller sur un Roche/Sol."],
        ["Lame de Roche", "EN VENTE 700 (badge roche) : Roche 90 → ×4 sur Toucanyon."],
        ["Set-up", "Danse-Lames (400, +Atk) sur ton physique → un tour, puis tu balaies."],
        ["Pas encore", "Hydrocanon (CT) = badge EAU · Séisme (CT) = Champion."],
    ] },
    { t: "⚔️ La boss : PYRA (6 Daemons)", rows: [
        ["Ouvre faible", "Brasicow + Braisécaille (bases niv 24) → fais-toi la main dessus."],
        ["Les fortes", "Tauricendre (Feu/Combat) + Caldéront (Feu/Eau) niv 32-33 : Caldéront tape ton Roche/Sol ×4 à l'eau → méfiance."],
        ["🦅 Toucanyon niv 35", "Vol/Feu : SEULE la Roche la touche (×4). Surtout PAS de Sol."],
        ["🧠 Vipember niv 37 (l'AS)", "Psy/Feu + PYROTECHNIE (-2 Spé). Frappe-la en PHYSIQUE. Butin : Badge Feu + CT Pyrotechnie."],
    ] },
    { t: "🚫 Ce qui NE marche PAS · 🗝️ L'arène", rows: [
        ["Résisté ×0.5", "FEU (évidemment), + Glace/Insecte/Acier/Plante sur une partie de l'équipe."],
        ["Trop partiel", "Vol et Psy ne touchent QUE les 2 taureaux Combat. Spectre, que Vipember."],
        ["Ordre", "Bats les 4 gardes (ordre libre) → la Doyenne PYRA au sommet."],
        ["Le + tôt <30", "Un Roche/Sol (Roctaur/Octoroc) ~niv 26-30 avec Éboulis + un Eau de soutien = jouable sous le niveau du boss."],
    ] },
]

// ====== BASES DU COMBAT (affichées pour toutes les arènes) ======
const BASES_PAGES: Page[] = [
    { t: "📖 Bases du combat", rows: [
        ["⭐ STAB (bonus de type)", "Une attaque DU MÊME TYPE que ton Daemon frappe ×1,5 ! (ex. une attaque Plante sur un Daemon Plante.) → privilégie les attaques de TON type."],
        ["Efficacité des types", "×2 si super efficace, ×0,5 si résisté, ×0 si immunisé (ex. le Spectre ne touche pas le Normal)."],
        ["Couverture", "Garde 1-2 attaques d'un AUTRE type pour ceux qui résistent ton STAB."],
        ["Physique ou Spécial ?", "Le TYPE décide : Normal/Combat/Vol/Poison/Sol/Roche/Insecte/Spectre = PHYSIQUE (Atq) ; Feu/Eau/Plante/Élec/Glace/Psy/Dragon = SPÉCIAL (Spé)."],
    ] },
]

export default function GuidePanel() {
    const open = useGameStore((s) => s.guideOpen)
    const close = useGameStore((s) => s.closeGuide)
    const badges = usePlayer().badges
    const [page, setPage] = useState(0)
    const touchX = useRef<number | null>(null)
    const arena = currentArenaMapId(badges)
    const isRock = arena === "yellow_arena_roche"
    const isFeu = arena === "yellow_arena_feu"
    const basePages = [...BASES_PAGES, ...(isFeu ? FEU_PAGES : isRock ? ROCHE_PAGES : PLANTE_PAGES)] // bases du combat (STAB…) en 1re page
    // MODE FUN : réécrit les lignes reps/quota/Saiyan ; autres modes inchangés.
    const pages = getGameMode() === "fun"
        ? basePages.map((p) => ({ ...p, rows: p.rows.map(([k, v]) => [k, funifyRow(k, v)] as [string, string]) }))
        : basePages
    // Remet à la 1re page à l'ouverture (et si on change d'arène).
    useEffect(() => { setPage(0) }, [open, arena])

    if (!open) return null
    const idx = Math.min(page, pages.length - 1)
    const cur = pages[idx]
    const go = (d: number) => setPage((p) => (Math.min(pages.length - 1, Math.max(0, p)) + d + pages.length) % pages.length)

    return (
        <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }}>
            <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
                onTouchEnd={(e) => { const sx = touchX.current; touchX.current = null; if (sx == null) return; const dx = (e.changedTouches[0]?.clientX ?? sx) - sx; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1) }}
                style={{ background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "78%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }}
            >
                <div style={{ padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }}>
                    {isFeu ? "📜 GUIDE DE LA CALDEIRA" : isRock ? "📜 GUIDE DE LA CAVERNE" : "📜 GUIDE DU BOSQUET"}{" "}
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{isFeu ? "arène Feu · ≤ niv 45" : isRock ? "arène Roche · ≤ niv 30" : "arène Plante · ≤ niv 20"}</span>
                </div>

                {/* Page courante */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 10 }}>{cur.t}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cur.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
                    </div>
                </div>

                {/* Carrousel : ◀  points  ▶ */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderTop: `2px solid ${DARK}` }}>
                    <button onClick={() => go(-1)} style={navBtn}>◀</button>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                        {pages.map((_, i) => (
                            <span key={i} onClick={() => setPage(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === idx ? INK : DARK, cursor: "pointer" }} />
                        ))}
                        <span style={{ fontSize: 11, color: INK, opacity: 0.7, marginLeft: 6 }}>{idx + 1}/{pages.length}</span>
                    </div>
                    <button onClick={() => go(1)} style={navBtn}>▶</button>
                </div>

                <button onClick={close} style={{ margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    FERMER
                </button>
            </div>
        </div>
    )
}

const navBtn: React.CSSProperties = {
    background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "8px 14px",
    fontSize: 16, fontWeight: 900, cursor: "pointer", lineHeight: 1, flexShrink: 0,
}
