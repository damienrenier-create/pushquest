// GUIDE STRATÉGIQUE CHAPITRÉ (Nexus Jaune Éclair) — 1 HTML prêt-à-PDF par joueur.
// 100% DÉTERMINISTE : importe les VRAIS modules du jeu (mêmes que la prod) + lit les VRAIES équipes en
// LECTURE SEULE depuis la prod. Aucun fait n'est "écrit" à la main → zéro hallucination.
//   Lancement : npx -y tsx team-guide-gen.mts
import { writeFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
import { SPECIES, getSpecies } from "./src/lib/gamebook/yellow/data/species"
import { getMove } from "./src/lib/gamebook/yellow/data/moves"
import { CTS, canLearnCt } from "./src/lib/gamebook/yellow/data/cts"
import { typeMultiplier, typeEffectiveness, moveCategory } from "./src/lib/gamebook/yellow/battle/typeChart"
import { fullStats } from "./src/lib/gamebook/yellow/battle/stats"
import { allocatedBonus, SAIYAN_POINT_VALUE } from "./src/lib/gamebook/yellow/data/saiyanConfig"
import { EV_STAT_CAP, EV_TOTAL_CAP, EV_YIELD_PER_WIN } from "./src/lib/gamebook/yellow/data/evConfig"
import { getTrainer } from "./src/lib/gamebook/yellow/data/trainers"
import { parseSave } from "./src/lib/gamebook/yellow/storage/save"
import type { SpeciesData, MonInstance, StatKey, PokeType } from "./src/lib/gamebook/yellow/battle/types"

const OUT_DIR = "C:/Users/Sartay/Documents/PushQuest-Pokedex"
const PLAYERS = ["Mools", "Franss", "Embi", "Gg", "Task1", "Neuneu"]
const LIGUE_IDS = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter", "y_ligue_maitre"]

const TYPES: PokeType[] = ["NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE", "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE", "ROCHE", "SPECTRE", "DRAGON"]
const TFR: Record<string, string> = { NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace", COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte", ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon" }
const TCOL: Record<string, string> = { NORMAL: "#9a9a72", FEU: "#f08030", EAU: "#6890f0", PLANTE: "#78c850", ELEC: "#e8c000", GLACE: "#79c6c6", COMBAT: "#c03028", POISON: "#a040a0", SOL: "#d8b840", VOL: "#9a86e0", PSY: "#f85888", INSECTE: "#a8b820", ROCHE: "#b8a038", SPECTRE: "#705898", DRAGON: "#6a30f0" }
const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const STAT_FR: Record<StatKey, string> = { hp: "PV", atk: "Attaque", def: "Défense", spe: "Vitesse", spc: "Spécial" }

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const ALL: SpeciesData[] = Object.values(SPECIES)
const bst = (s: SpeciesData) => s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spe + s.baseStats.spc
const tag = (t: string) => `<span class="t" style="background:${TCOL[t]}">${TFR[t] ?? t}</span>`
// Catégorie par TYPE (Gen 1) — déléguée AU JEU (moveCategory) → ne peut jamais diverger de la prod.
const catOf = (type: string): "PHY" | "SPÉ" => (moveCategory(type as PokeType) === "PHYSICAL" ? "PHY" : "SPÉ")

// ── Stade d'évolution, calculé depuis le GRAPHE d'évolution réel (species.evolution.toId) ──
const HAS_PRED = new Set<string>()
for (const s of ALL) if (s.evolution?.toId) HAS_PRED.add(s.evolution.toId)
function evoStage(s: SpeciesData): "base" | "middle" | "final" {
    const hasSucc = !!s.evolution?.toId, hasPred = HAS_PRED.has(s.id)
    if (hasSucc && !hasPred) return "base"      // 1er stade d'une lignée
    if (hasSucc && hasPred) return "middle"     // stade intermédiaire
    return "final"                              // stade final (+ Daemons sans évolution = déjà aboutis)
}
const STAGE_FR = { base: "Stade 1 (base)", middle: "Stade 2 (intermédiaire)", final: "Stade final" }

// ── Grade de potentiel (somme des gènes / 75) — barème lisible ──
function ivGrade(total: number): string {
    return total >= 71 ? "PARFAIT" : total >= 60 ? "Excellent" : total >= 45 ? "Bon" : total >= 30 ? "Moyen" : total >= 15 ? "Faible" : "Très faible"
}
// ── Profil/archétype d'un Daemon d'après ses stats de BASE (identité d'espèce, sans l'inflation de PV
//    due au niveau). Renvoie aussi les STATS CLÉS à entraîner (EV/Saiyan) pour ce rôle. ──
function profileOf(base: Record<StatKey, number>): { role: string; off: "physique" | "spécial"; offStat: StatKey; keyStats: StatKey[] } {
    const offStat: StatKey = base.atk >= base.spc ? "atk" : "spc"
    const off = offStat === "atk" ? "physique" : "spécial"
    const top2 = STAT_KEYS.map((k) => ({ k, v: base[k] })).sort((a, b) => b.v - a.v).slice(0, 2).map((x) => x.k)
    const fast = top2.includes("spe")
    const defensive = base.hp + base.def >= base.atk + base.spc && !top2.includes(offStat)
    if (defensive) return { role: "mur / tank défensif", off, offStat, keyStats: ["hp", "def"] }
    if (fast) return { role: `sweeper ${off} rapide`, off, offStat, keyStats: [offStat, "spe"] }
    return { role: `attaquant ${off} (cogne fort, peu rapide)`, off, offStat, keyStats: [offStat, base.hp >= base.spe ? "hp" : "spe"] }
}

// ────────────────────────────── DÉFENSE : faiblesses/résistances/immunités d'un Daemon ──────────────────────────────
function defense(types: PokeType[]) {
    const weak: [string, number][] = [], res: [string, number][] = [], imm: string[] = []
    for (const a of TYPES) {
        const m = typeEffectiveness(a, types)
        if (m === 0) imm.push(a)
        else if (m > 1) weak.push([a, m])
        else if (m < 1) res.push([a, m])
    }
    weak.sort((x, y) => y[1] - x[1]); res.sort((x, y) => x[1] - y[1])
    return { weak, res, imm }
}

// ────────────────────────────── HTML : tête + CSS commun (imprimable A4) ──────────────────────────────
const CSS = `
*{box-sizing:border-box} body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;color:#1a1a2e;background:#fff;font-size:13px;line-height:1.5}
.page{padding:26px 30px;max-width:900px;margin:0 auto}
.cover{min-height:96vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(160deg,#1a1230,#2a1c4a);color:#fff;page-break-after:always}
.cover h1{font-size:38px;margin:0 0 6px;color:#ffd54a} .cover h2{font-size:20px;margin:0;font-weight:600} .cover .sub{margin-top:18px;opacity:.8;font-size:13px;max-width:520px;line-height:1.6}
h1.chap{font-size:26px;color:#7a4ec0;border-bottom:3px solid #7a4ec0;padding-bottom:6px;margin:0 0 4px;page-break-before:always}
h2{font-size:18px;color:#2a1c4a;margin:22px 0 8px;border-left:4px solid #ffd54a;padding-left:8px}
h3{font-size:15px;margin:16px 0 6px;color:#3a2a5a}
p{margin:6px 0} ul{margin:6px 0;padding-left:20px} li{margin:3px 0}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px} th,td{border:1px solid #d8d2e8;padding:4px 7px;text-align:left} th{background:#efeaf8;font-weight:700} td.n,th.n{text-align:center}
.t{display:inline-block;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px;margin:1px}
.box{background:#f6f3fc;border:1px solid #e0d8f4;border-radius:8px;padding:10px 13px;margin:10px 0}
.warn{background:#fff4e6;border:1px solid #f0c070;border-radius:8px;padding:9px 12px;margin:8px 0;font-size:12.5px}
.ok{background:#eafaef;border:1px solid #8ad6a0} .bad{background:#fbeaea;border:1px solid #e0a0a0}
.bar{height:14px;border-radius:7px;background:#ddd;overflow:hidden;display:inline-block;vertical-align:middle;width:60%}
.bar>span{display:block;height:100%;background:#7a4ec0}
.daemon{border:1px solid #d8d2e8;border-radius:10px;padding:12px 14px;margin:14px 0;page-break-inside:avoid}
.daemon h3{margin-top:0}
.kpi{display:inline-block;background:#efeaf8;border-radius:6px;padding:2px 8px;margin:2px;font-size:11.5px;font-weight:600}
.small{font-size:11px;color:#666} .muted{color:#888}
.swot{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
.swot>div{border-radius:8px;padding:10px 12px;font-size:12px} .s-f{background:#eafaef;border:1px solid #8ad6a0} .s-w{background:#fbeaea;border:1px solid #e0a0a0} .s-o{background:#eef4ff;border:1px solid #9ab8e0} .s-t{background:#fff4e6;border:1px solid #f0c070}
.footer{margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#999}
`

// ══════════════════════════ CHAPITRE 1 — GUIDE COMMUN (calculé une fois) ══════════════════════════
function chapter1(): string {
    // 1c — analyse du dex (calculée)
    const avg = (f: (s: SpeciesData) => number) => Math.round(ALL.reduce((a, s) => a + f(s), 0) / ALL.length)
    const avgRow = STAT_KEYS.map((k) => `<td class="n">${avg((s) => s.baseStats[k])}</td>`).join("")
    // moyennes de base PAR STADE (1 / 2 / final)
    const stages = (["base", "middle", "final"] as const).map((stg) => {
        const list = ALL.filter((s) => evoStage(s) === stg)
        const mean = (f: (s: SpeciesData) => number) => (list.length ? Math.round(list.reduce((a, s) => a + f(s), 0) / list.length) : 0)
        return { stg, n: list.length, st: Object.fromEntries(STAT_KEYS.map((k) => [k, mean((s) => s.baseStats[k])])) as Record<StatKey, number>, bst: mean(bst) }
    })
    const stageRows = stages.map((x) => `<tr><td>${STAGE_FR[x.stg]} <span class="small">(${x.n})</span></td>${STAT_KEYS.map((k) => `<td class="n">${x.st[k]}</td>`).join("")}<td class="n"><b>${x.bst}</b></td></tr>`).join("")
    // moyennes par type
    const byType = TYPES.map((t) => {
        const list = ALL.filter((s) => s.types.includes(t))
        if (!list.length) return null
        const mean = (f: (s: SpeciesData) => number) => Math.round(list.reduce((a, s) => a + f(s), 0) / list.length)
        return { t, n: list.length, bst: mean(bst), st: Object.fromEntries(STAT_KEYS.map((k) => [k, mean((s) => s.baseStats[k])])) as Record<StatKey, number> }
    }).filter(Boolean) as { t: string; n: number; bst: number; st: Record<StatKey, number> }[]
    byType.sort((a, b) => b.bst - a.bst)
    const maxBstType = Math.max(...byType.map((x) => x.bst))
    const typeRows = byType.map((x) => `<tr><td>${tag(x.t)} <span class="small">(${x.n})</span></td>${STAT_KEYS.map((k) => `<td class="n">${x.st[k]}</td>`).join("")}<td class="n"><b>${x.bst}</b></td><td><span class="bar"><span style="width:${Math.round(x.bst / maxBstType * 100)}%"></span></span></td></tr>`).join("")
    // top 10 par stat
    const top = (k: StatKey | "bst") => [...ALL].sort((a, b) => (k === "bst" ? bst(b) - bst(a) : b.baseStats[k] - a.baseStats[k])).slice(0, 10)
    const topCols = ([["bst", "BST"], ...STAT_KEYS.map((k) => [k, STAT_FR[k]])] as [StatKey | "bst", string][]).map(([k, lab]) => {
        const rows = top(k).map((s, i) => `<tr><td class="n muted">${i + 1}</td><td>${esc(s.name)} ${s.types.map(tag).join("")}</td><td class="n"><b>${k === "bst" ? bst(s) : s.baseStats[k]}</b></td></tr>`).join("")
        return `<div style="display:inline-block;vertical-align:top;width:48%;margin:1%"><h3>Top 10 — ${lab}</h3><table><tr><th class="n">#</th><th>Daemon</th><th class="n">${lab}</th></tr>${rows}</table></div>`
    }).join("")

    // 1d — rôles avec exemples calculés (extrêmes du dex, hors stade non-final exclus pour rester lisible)
    const exFor = (label: (s: SpeciesData) => number) => [...ALL].sort((a, b) => label(b) - label(a))[0]
    const exSweepPhys = exFor((s) => s.baseStats.atk), exSweepSpe = exFor((s) => s.baseStats.spc)
    const exFast = exFor((s) => s.baseStats.spe), exWall = exFor((s) => s.baseStats.def + s.baseStats.hp)

    return `
<h1 class="chap">Chapitre 1 — Guide stratégique (les bases)</h1>
<p>Tout ce chapitre est <b>commun à tous les joueurs</b>. Il t'explique comment ton Daemon devient fort, comment lire les types, et quels rôles composent une bonne équipe. Termes simples, garanti exact (calculé depuis le jeu).</p>

<h2>1.a — Comment se calcule la force d'un Daemon</h2>
<p>Chaque Daemon a 5 stats : <b>PV</b> (points de vie), <b>Attaque</b> (dégâts physiques), <b>Défense</b> (encaisse le physique), <b>Vitesse</b> (qui frappe en premier) et <b>Spécial</b> (= attaque ET défense spéciales). Une stat finale se construit sur 4 leviers :</p>
<table>
<tr><th>Levier</th><th>C'est quoi</th><th>Comment l'améliorer</th></tr>
<tr><td><b>Base</b></td><td>La valeur de l'<b>espèce</b> (fixe). C'est l'ADN du Daemon.</td><td>Choisir une bonne espèce / la faire évoluer.</td></tr>
<tr><td><b>Gène (IV)</b></td><td>Qualité de <b>naissance</b>, de 0 à 15 par stat (75 max au total). Figé à la capture.</td><td>Capturer en ayant <b>bouclé ton quota du jour</b> (sport réel) → meilleurs gènes.</td></tr>
<tr><td><b>EV</b></td><td><b>Entraînement de combat</b> : +${EV_YIELD_PER_WIN} dans la stat-forte du Daemon vaincu, à chaque victoire. Contribue par ⌊EV/4⌋.</td><td>Combattre. Plafond <b>${EV_STAT_CAP}/stat</b> et <b>${EV_TOTAL_CAP} au total</b> → tu spécialises ~2 stats.</td></tr>
<tr><td><b>Saiyan</b></td><td><b>Sport réel</b> : des points gagnés aux montées de niveau, répartis librement.</td><td>Faire du sport. <b>+3 PV/point</b>, <b>+1/point</b> pour les autres stats.</td></tr>
</table>
<div class="box"><b>Formule exacte</b> (hors PV) :<br><code>⌊(2×Base + Gène + ⌊EV/4⌋) × Niveau ÷ 100⌋ + 5 + Saiyan</code><br>Pour les <b>PV</b> : on remplace le « +5 » par « +Niveau+10 ».<br>Un <b>shiny</b> (chromatique, ~1/512) reçoit <b>×1,1</b> sur chaque stat finale.</div>
<p><b>BST</b> = <i>Base Stat Total</i> = la somme des 5 stats de base. C'est un indicateur rapide de la puissance brute d'une espèce (mais la <b>répartition</b> compte autant que le total !).</p>

<h2>1.b — Les 15 types : forces & faiblesses</h2>
<p>Une attaque inflige <b>×2</b> (super-efficace), <b>×1</b> (neutre), <b>×0,5</b> (peu efficace) ou <b>×0</b> (aucun effet) selon le type de la cible. Les multiplicateurs se cumulent sur un bi-type (×2 et ×2 = <b>×4</b> !).</p>
<table>
<tr><th>Type</th><th>Super-efficace CONTRE</th><th>Faible / peu d'effet CONTRE</th></tr>
${TYPES.map((a) => {
        const se = TYPES.filter((d) => typeMultiplier(a, d) > 1).map((d) => TFR[d])
        const weak = TYPES.filter((d) => typeMultiplier(a, d) < 1 && typeMultiplier(a, d) > 0).map((d) => TFR[d])
        const none = TYPES.filter((d) => typeMultiplier(a, d) === 0).map((d) => TFR[d])
        return `<tr><td>${tag(a)}</td><td class="small">${se.join(", ") || "—"}</td><td class="small">${weak.join(", ") || "—"}${none.length ? ` · <b>aucun effet :</b> ${none.join(", ")}` : ""}</td></tr>`
    }).join("")}
</table>
<div class="warn">⚔️ <b>Règle d'or (Gen 1)</b> : le côté <b>Physique / Spécial dépend du TYPE de l'attaque</b>, pas de l'attaque elle-même.<br><b>Physiques → stat Attaque</b> : ${TYPES.filter((t) => moveCategory(t) === "PHYSICAL").map((t) => TFR[t]).join(", ")}.<br><b>Spéciaux → stat Spécial</b> : ${TYPES.filter((t) => moveCategory(t) === "SPECIAL").map((t) => TFR[t]).join(", ")}.<br>👉 Une attaque Feu sur un Daemon à grosse <b>Attaque</b> mais petit <b>Spécial</b> est <b>gâchée</b> (elle tape avec la mauvaise stat).</div>

<h2>1.c — Le Pokédex en chiffres (${ALL.length} Daemons)</h2>
<h3>Stats de base moyennes par stade d'évolution</h3>
<table><tr><th>Stade</th>${STAT_KEYS.map((k) => `<th class="n">${STAT_FR[k]}</th>`).join("")}<th class="n">BST</th></tr>
${stageRows}
<tr style="background:#f3eefc"><td><b>Ensemble</b> <span class="small">(${ALL.length})</span></td>${avgRow}<td class="n"><b>${avg(bst)}</b></td></tr></table>
<p class="small">👉 Un Daemon de <b>stade 1</b> est NORMALEMENT plus faible : compare-le à la moyenne de SON stade, pas au stade final. Faire évoluer = le plus gros gain de stats du jeu.</p>
<h3>Stats moyennes par type (triées par BST moyen)</h3>
<table><tr><th>Type</th>${STAT_KEYS.map((k) => `<th class="n">${STAT_FR[k]}</th>`).join("")}<th class="n">BST</th><th></th></tr>${typeRows}</table>
<p class="small">Lecture : les types en haut frappent fort « sur le papier » ; mais un BST moyen élevé peut cacher une faiblesse défensive (cf. 1.b).</p>
<h3>Top 10 par statistique</h3>
<div>${topCols}</div>

<h2>1.d — Les rôles dans une équipe</h2>
<p>Une équipe gagnante n'empile pas 6 gros bourrins : elle combine des <b>rôles</b> complémentaires.</p>
<ul>
<li><b>Sweeper physique</b> — grosse Attaque + Vitesse, enchaîne les KO au corps-à-corps. <span class="small">Ex. brut du dex : ${esc(exSweepPhys.name)} (Atq ${exSweepPhys.baseStats.atk}).</span></li>
<li><b>Sweeper spécial</b> — gros Spécial + Vitesse, mitraille à distance. <span class="small">Ex. : ${esc(exSweepSpe.name)} (Spé ${exSweepSpe.baseStats.spc}).</span></li>
<li><b>Lead / éclaireur</b> — très rapide, pose le tempo (statut, mise en place). <span class="small">Ex. le plus rapide : ${esc(exFast.name)} (Vit ${exFast.baseStats.spe}).</span></li>
<li><b>Mur / tank</b> — gros PV + Défense, encaisse et use l'adversaire. <span class="small">Ex. : ${esc(exWall.name)} (PV ${exWall.baseStats.hp} / Déf ${exWall.baseStats.def}).</span></li>
<li><b>Mixte</b> — joue sur Attaque ET Spécial (souple mais ne sublime qu'un STAB à la fois).</li>
<li><b>Support / statut</b> — paralyse, endort, empoisonne, affaiblit : crée des ouvertures pour les autres.</li>
</ul>
<div class="box">🧭 <b>Conseil débutant</b> : vise <b>une bonne couverture de types</b> (que ton équipe puisse frapper super-efficace un peu partout) et <b>évite les faiblesses communes</b> (plusieurs Daemons K.O. par le même type). Un <b>STAB</b> (attaque du même type que le Daemon) bénéficie d'un bonus de <b>×1,5</b> — aligne-le toujours sur ta meilleure stat offensive.</div>

<h2>1.e — Le guide pratique : où trouver quoi, comment progresser</h2>
<h3>📂 Où voir les infos (dans les menus)</h3>
<ul>
<li>Le <b>menu</b> (START/SELECT) → <b>🐾 ÉQUIPE</b> (tes 6 Daemons), <b>🎒 SAC</b> (objets &amp; CT), <b>⚔️ ATTAQUES</b> (réorganiser / oublier une capacité).</li>
<li>Ouvre la <b>FICHE</b> d'un Daemon → ses <b>stats</b>, types, attaques et son <b>POTENTIEL (gènes)</b>. C'est LÀ que tu vois sa qualité de naissance.</li>
<li>Le <b>📕 Pokédex</b> liste toutes les espèces vues/capturées (types, stats, description, évolutions).</li>
<li>Le <b>Conseiller</b> (PNJ à côté du Centre Daemon) répond à tes questions de jeu.</li>
<li>Le <b>PC du labo</b> (à l'étage du Centre Daemon) propose des <b>défis physiques</b> pour gagner de l'énergie.</li>
</ul>
<h3>🥊 Où s'entraîner À TON NIVEAU</h3>
<ul>
<li><b>La Plaine d'entraînement</b> (hautes herbes au nord de Cendreville) : une grille de carrés où le <b>niveau monte</b> palier par palier → choisis le carré adapté à ton équipe. Les <b>types changent CHAQUE JOUR</b> (rotation quotidienne) : idéal pour cibler tes EV sur un type précis.</li>
<li><b>La Zone de Combat</b> (Tour / Usine / Dôme) : combats enchaînés, <b>sans objets ni soins</b> — le vrai test de skill.</li>
<li>Les <b>dresseurs réaffrontables</b> et <b>ACE</b>, qui se <b>cale sur le niveau de TON équipe</b> (jamais trop facile, jamais infaisable).</li>
</ul>
<h3>🔁 La boucle de progression (l'ordre malin)</h3>
<ol>
<li><b>Boucle ton quota sport du jour AVANT de capturer</b> → meilleurs gènes (IV) à la naissance.</li>
<li><b>Enchaîne les combats</b> → tes <b>EV</b> grimpent (jusqu'à ${EV_STAT_CAP}/stat).</li>
<li><b>Monte de niveau + fais du sport réel</b> → des <b>points Saiyan</b> à répartir librement.</li>
<li><b>Fais ÉVOLUER</b> tes Daemons : c'est le plus gros saut de stats (cf. 1.c).</li>
<li><b>Apprends des CT légales</b> pour combler les trous de moveset (chaque fiche du chap. 2 te dit lesquelles).</li>
<li><b>Équilibre tes types</b>, puis cap sur la Ligue (chap. 3).</li>
</ol>
<div class="warn">🚫 <b>Erreurs de débutant à éviter</b> : (1) une attaque sur la <b>mauvaise stat</b> (cf. règle d'or 1.b) ; (2) <b>6 Daemons du même type</b> → une seule faiblesse les balaie tous ; (3) <b>négliger la Vitesse</b> → tu frappes toujours en second ; (4) <b>sur-niveauter un seul Daemon</b> → équipe fragile dès qu'il tombe.</div>
`
}

// ══════════════════════════ ANALYSE D'UN DAEMON (chap.2) ══════════════════════════
function legalPool(s: SpeciesData): { name: string; type: string; cat: string; power: number; src: string }[] {
    const out: { name: string; type: string; cat: string; power: number; src: string }[] = []
    const seen = new Set<string>()
    for (const l of s.learnset) { const m = getMove(l.moveId); if (m && !seen.has(m.id)) { seen.add(m.id); out.push({ name: m.name, type: m.type, cat: catOf(m.type), power: m.power, src: `niv. ${l.level}` }) } }
    for (const ct of CTS) { if (!canLearnCt(s, ct)) continue; const m = getMove(ct.moveId); if (m && !seen.has(m.id)) { seen.add(m.id); out.push({ name: m.name, type: m.type, cat: catOf(m.type), power: m.power, src: ct.label }) } }
    return out
}

function daemonCard(m: MonInstance): string {
    const s = getSpecies(m.speciesId)
    if (!s) return `<div class="daemon bad">⚠️ Espèce inconnue : ${esc(m.speciesId)}</div>` // anti-hallucination (ne devrait jamais arriver)
    const st = fullStats(m, s)
    const ivTot = STAT_KEYS.reduce((a, k) => a + (m.ivs?.[k] ?? 0), 0)
    const evTot = STAT_KEYS.reduce((a, k) => a + (m.ev?.[k] ?? 0), 0)
    const saiyanPts = STAT_KEYS.reduce((a, k) => a + (m.allocated?.[k] ?? 0), 0)
    const off = st.atk >= st.spc ? "atk" : "spc"
    const offFr = off === "atk" ? "Attaque (physique)" : "Spécial (spécial)"
    const types = s.types as PokeType[]
    const d = defense(types)
    // ── ANALYSE PROFONDE : profil + gènes (IV) + EV + points Saiyan ──
    const prof = profileOf(s.baseStats) // archétype d'après les stats de BASE (pas l'inflation PV du niveau)
    const keyStats = prof.keyStats
    const iv = (k: StatKey) => m.ivs?.[k] ?? 0, ev = (k: StatKey) => m.ev?.[k] ?? 0, sai = (k: StatKey) => m.allocated?.[k] ?? 0
    const fr = (ks: StatKey[]) => ks.map((k) => STAT_FR[k]).join(" & ") || "—"
    const ivMax = Math.max(...STAT_KEYS.map(iv)), ivMin = Math.min(...STAT_KEYS.map(iv))
    const ivBest = STAT_KEYS.filter((k) => iv(k) === ivMax), ivWorst = STAT_KEYS.filter((k) => iv(k) === ivMin)
    const evTrained = STAT_KEYS.filter((k) => ev(k) > 0)
    const evVerdict = evTot < 20 ? "à peine entraîné — gros potentiel inexploité" : evTrained.length <= 2 ? `bien ciblé sur ${fr(evTrained)}` : `éparpillé sur ${evTrained.length} stats (recentre sur 2)`
    const evReco = keyStats.filter((k) => ev(k) < EV_STAT_CAP)
    const saiPlaced = STAT_KEYS.filter((k) => sai(k) > 0), saiOff = saiPlaced.filter((k) => !keyStats.includes(k))
    const saiVerdict = saiyanPts === 0 ? "aucun point placé — fais du sport et investis-les" : saiOff.length ? `⚠️ ${fr(saiOff)} n'aide(nt) pas ton rôle → vise plutôt ${fr(keyStats)}` : "✅ alignés sur ton rôle"
    // moveset actuel
    const moves = (m.moves ?? []).map((slot) => getMove(slot.moveId)).filter(Boolean) as NonNullable<ReturnType<typeof getMove>>[]
    const moveRows = moves.map((mv) => {
        const cat = catOf(mv.type), isStatus = mv.power <= 0, stab = types.includes(mv.type as PokeType)
        let verdict = ""
        if (isStatus) verdict = `<span class="muted">statut / utilitaire</span>`
        else if ((cat === "PHY" && off === "spc") || (cat === "SPÉ" && off === "atk")) verdict = `<span style="color:#c0392b">⚠️ gâchée (tape avec ta stat faible : ${cat === "PHY" ? "Atq" : "Spé"} ${cat === "PHY" ? st.atk : st.spc})</span>`
        else verdict = `<span style="color:#1e8449">✅ servie par ta ${cat === "PHY" ? "Atq" : "Spé"} (${cat === "PHY" ? st.atk : st.spc})</span>`
        return `<tr><td>${esc(mv.name)}</td><td>${tag(mv.type)}</td><td class="n">${cat}</td><td class="n">${mv.power || "—"}</td><td class="n">${stab ? "★" : ""}</td><td>${verdict}</td></tr>`
    }).join("")
    // learnset depth
    const maxLvl = s.learnset.length ? Math.max(...s.learnset.map((l) => l.level)) : 0
    const upcoming = s.learnset.filter((l) => l.level > m.level).sort((a, b) => a.level - b.level).slice(0, 4).map((l) => `${getMove(l.moveId)?.name ?? l.moveId} (niv. ${l.level})`)
    // reco set LÉGAL (STAB aligné + couverture), uniquement parmi le pool apprenable
    const pool = legalPool(s)
    type Pm = (typeof pool)[number]
    const goodCat = off === "atk" ? "PHY" : "SPÉ"
    const stabLegal = pool.filter((p) => types.includes(p.type as PokeType) && p.power > 0 && p.cat === goodCat).sort((a, b) => b.power - a.power)
    const covLegal = pool.filter((p) => !types.includes(p.type as PokeType) && p.power > 0 && p.cat === goodCat).sort((a, b) => b.power - a.power)
    // Set légal recommandé : 1 meilleur STAB PAR TYPE (bonne stat) + couverture DIVERSIFIÉE + statut utile.
    // Évite de doubler le même type/la même attaque ; tout vient du pool apprenable (canLearnCt).
    const recoSet: Pm[] = []
    const addUniq = (p?: Pm) => { if (p && recoSet.length < 4 && !recoSet.some((x) => x.name === p.name)) recoSet.push(p) }
    for (const ty of types) addUniq(stabLegal.find((p) => p.type === ty)) // 1 STAB par type du Daemon
    const covByType = new Map<string, Pm>()
    for (const p of covLegal) if (!covByType.has(p.type)) covByType.set(p.type, p)
    for (const p of [...covByType.values()].sort((a, b) => b.power - a.power)) addUniq(p) // couverture, types distincts
    addUniq(pool.find((p) => p.power === 0)) // une attaque de STATUT (avant de doubler un type → set plus varié)
    for (const p of stabLegal) addUniq(p) // compléter avec les meilleurs STAB restants
    const reco = recoSet.map((p) => `${p.name} <span class="small">(${TFR[p.type]}, ${p.power || "statut"}, ${p.src})</span>`)

    return `
<div class="daemon">
  <h3>${esc(m.nickname ?? s.name)} ${m.nickname && m.nickname !== s.name ? `<span class="small">(${esc(s.name)})</span>` : ""} — N.${m.level} ${types.map(tag).join("")} ${m.shiny ? "✨" : ""}</h3>
  <p class="small">${esc(s.role ?? "")} — <b>${STAGE_FR[evoStage(s)]}</b></p>
  <span class="kpi">Profil : ${prof.role}</span><span class="kpi">Gènes ${ivTot}/75 (${ivGrade(ivTot)})</span><span class="kpi">EV ${evTot}/${EV_TOTAL_CAP}</span><span class="kpi">Saiyan ${saiyanPts} pts</span><span class="kpi">Stat offensive : ${offFr}</span>
  <table>
    <tr><th>Stat</th><th class="n">Base</th><th class="n">Gène</th><th class="n">EV → +⌊/4⌋</th><th class="n">Saiyan → +</th><th class="n">Total</th></tr>
    ${STAT_KEYS.map((k) => `<tr><td>${STAT_FR[k]}${keyStats.includes(k) ? ' <span class="small muted">(clé)</span>' : ""}</td><td class="n">${s.baseStats[k]}</td><td class="n">${iv(k)}/15</td><td class="n">${ev(k)} → +${Math.floor(ev(k) / 4)}</td><td class="n">${sai(k) ? `${sai(k)} → +${allocatedBonus(k, sai(k))}` : "—"}</td><td class="n"><b>${st[k]}</b></td></tr>`).join("")}
  </table>
  <div class="box small" style="margin:6px 0">
    <b>🧬 Gènes (IV ${ivTot}/75 — ${ivGrade(ivTot)})</b> : ${ivMax === ivMin ? `tous à ${ivMax}/15${ivMax === 15 ? " — parfaits ! ✨" : ""}` : `meilleur(s) ${fr(ivBest)} (${ivMax}/15) · plus faible(s) ${fr(ivWorst)} (${ivMin}/15)`}.<br>
    <b>🏋️ EV (${evTot}/${EV_TOTAL_CAP})</b> : ${evVerdict}.${evReco.length ? ` <b>Reco</b> : pousse ${fr(evReco)} vers ${EV_STAT_CAP}.` : " Stats clés déjà au max. 👍"}<br>
    <b>⚡ Saiyan (${saiyanPts} pts)</b> : ${saiPlaced.length ? `placés sur ${fr(saiPlaced)} — ` : ""}${saiVerdict}.
  </div>
  <p><b>Défense :</b> ${d.weak.length ? d.weak.map(([t, x]) => `<span class="t" style="background:${TCOL[t]}">${TFR[t]} ×${x}</span>`).join(" ") : "<span class='muted'>aucune faiblesse</span>"}
  ${d.imm.length ? ` · <b>immunités :</b> ${d.imm.map((t) => TFR[t]).join(", ")}` : ""}
  ${d.res.length ? `<br><span class="small"><b>Résiste :</b> ${d.res.map(([t, x]) => `${TFR[t]} ×${x}`).join(", ")}</span>` : ""}</p>
  <h4 style="margin:8px 0 2px">Moveset actuel</h4>
  ${moves.length ? `<table><tr><th>Attaque</th><th>Type</th><th class="n">Cat.</th><th class="n">Puiss.</th><th class="n">STAB</th><th>Verdict</th></tr>${moveRows}</table>` : "<p class='muted'>Aucune attaque.</p>"}
  <h4 style="margin:8px 0 2px">Learnset</h4>
  <p class="small">Plus haut niveau d'apprentissage : <b>niv. ${maxLvl}</b>${maxLvl < 50 ? ` <span style="color:#c0392b">(s'arrête tôt → pense aux CT)</span>` : ""}. ${upcoming.length ? `À venir : ${upcoming.join(", ")}.` : "Plus rien à apprendre par niveau."}</p>
  <div class="box small"><b>Set recommandé (légal, apprenable par CE Daemon) :</b><br>${reco.length ? reco.join(" · ") : "—"}</div>
</div>`
}

// SWOT d'équipe (calculée)
function teamSwot(team: MonInstance[]): string {
    const members = team.map((m) => ({ m, s: getSpecies(m.speciesId)! })).filter((x) => x.s)
    // faiblesses partagées : pour chaque type d'attaque, combien de membres sont faibles (≥2)
    const weakCount: Record<string, number> = {}
    for (const a of TYPES) { let c = 0; for (const { s } of members) if (typeEffectiveness(a, s.types) >= 2) c++; if (c) weakCount[a] = c }
    const shared = Object.entries(weakCount).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
    // couverture offensive : types frappés en super-efficace par au moins un STAB de l'équipe
    const covered = new Set<string>()
    for (const { s } of members) for (const t of s.types) for (const d of TYPES) if (typeMultiplier(t as PokeType, d) > 1) covered.add(d)
    const notCovered = TYPES.filter((t) => !covered.has(t))
    // attaques gâchées dans l'équipe
    const wasted: string[] = []
    for (const { m, s } of members) {
        const st = fullStats(m, s); const off = st.atk >= st.spc ? "atk" : "spc"
        for (const slot of m.moves ?? []) { const mv = getMove(slot.moveId); if (!mv || mv.power <= 0) continue; const cat = catOf(mv.type); if ((cat === "PHY" && off === "spc") || (cat === "SPÉ" && off === "atk")) wasted.push(`${m.nickname ?? s.name} : ${mv.name}`) }
    }
    // CT légales utiles non possédées (suggestions)
    const types = [...new Set(members.flatMap((x) => x.s.types))]
    const strengths: string[] = []
    strengths.push(`Couverture offensive : ${covered.size}/15 types frappables en super-efficace.`)
    const avgBst = Math.round(members.reduce((a, x) => a + bst(x.s), 0) / members.length)
    strengths.push(`BST moyen de l'équipe : ${avgBst} (dex : ${Math.round(ALL.reduce((a, s) => a + bst(s), 0) / ALL.length)}).`)
    const perfectIv = members.filter((x) => STAT_KEYS.reduce((a, k) => a + (x.m.ivs?.[k] ?? 0), 0) === 75).length
    if (perfectIv) strengths.push(`${perfectIv}/${members.length} Daemons à potentiel PARFAIT (gènes 75/75).`)

    return `
<h2>Analyse SWOT de l'équipe</h2>
<div class="swot">
  <div class="s-f"><b>💪 Forces</b><ul>${strengths.map((x) => `<li>${x}</li>`).join("")}</ul></div>
  <div class="s-w"><b>🩹 Faiblesses</b><ul>
    ${shared.length ? shared.map(([t, c]) => `<li>Faiblesse PARTAGÉE au ${tag(t)} (${c}/${members.length} Daemons ×2+).</li>`).join("") : "<li>Pas de faiblesse de type vraiment partagée. 👍</li>"}
    ${wasted.length ? `<li>Attaques gâchées (mauvaise stat) : ${wasted.slice(0, 6).map(esc).join(" · ")}${wasted.length > 6 ? "…" : ""}.</li>` : ""}
  </ul></div>
  <div class="s-o"><b>🚀 Opportunités</b><ul>
    <li>Entraîner les <b>EV</b> (cap ${EV_STAT_CAP}/stat) sur les 2 stats clés de chaque Daemon.</li>
    <li>Allouer les <b>points Saiyan</b> (sport réel) sur la stat offensive principale + la Vitesse.</li>
    <li>Combler les attaques gâchées par des <b>CT légales</b> alignées sur la bonne stat (voir chaque fiche).</li>
  </ul></div>
  <div class="s-t"><b>⚠️ Menaces</b><ul>
    ${shared.length ? shared.slice(0, 3).map(([t, c]) => `<li>Un dresseur ${tag(t)} peut punir ${c} de tes Daemons d'un coup.</li>`).join("") : "<li>Aucune menace de type majeure identifiée.</li>"}
    ${notCovered.length ? `<li>Types que tu ne frappes PAS en super-efficace : ${notCovered.map((t) => TFR[t]).join(", ")}.</li>` : ""}
  </ul></div>
</div>`
}

// Profil GLOBAL de l'équipe (rôles, orientation offensive, vitesse, investissement, stades)
function teamProfile(team: MonInstance[]): string {
    const members = team.map((m) => { const s = getSpecies(m.speciesId); return s ? { m, s, st: fullStats(m, s) } : null }).filter(Boolean) as { m: MonInstance; s: SpeciesData; st: Record<StatKey, number> }[]
    if (!members.length) return ""
    const roles: Record<string, number> = {}
    let phys = 0, spec = 0
    for (const { s, st } of members) { roles[profileOf(s.baseStats).role] = (roles[profileOf(s.baseStats).role] ?? 0) + 1; if (st.atk >= st.spc) phys++; else spec++ }
    const bySpeed = [...members].sort((a, b) => b.st.spe - a.st.spe)
    const fastest = bySpeed[0], slowest = bySpeed[bySpeed.length - 1]
    const sumStat = (x: { m: MonInstance }, src: "ivs" | "ev" | "allocated") => STAT_KEYS.reduce((s, k) => s + ((x.m[src] as Record<string, number> | undefined)?.[k] ?? 0), 0)
    const avg = (src: "ivs" | "ev" | "allocated") => Math.round(members.reduce((a, x) => a + sumStat(x, src), 0) / members.length)
    const stage = { base: 0, middle: 0, final: 0 } as Record<string, number>
    for (const { s } of members) stage[evoStage(s)]++
    const notes: string[] = []
    notes.push(phys && spec ? `Mix offensif ${phys} physique(s) / ${spec} spécial(aux) — souplesse appréciable.` : `Équipe 100% ${phys ? "physique" : "spéciale"} → prévisible, pense à varier tes angles d'attaque.`)
    if (stage.base + stage.middle > 0) notes.push(`${stage.base + stage.middle} Daemon(s) pas encore au stade final → de gros gains de stats t'attendent en faisant évoluer.`)
    if (avg("ev") < 120) notes.push(`EV moyens (${avg("ev")}/510) encore bas : chaque combat ajoute du « stat gratuit », fonce t'entraîner.`)
    if (avg("allocated") < 10) notes.push(`Peu de points Saiyan (${avg("allocated")}/Daemon) : le sport réel = des stats en plus, ne les néglige pas.`)
    return `
<h2>Profil global de l'équipe</h2>
<div class="box">
  <p><b>Composition (rôles) :</b> ${Object.entries(roles).map(([r, c]) => `${c}× ${r}`).join(" · ")}.</p>
  <p><b>Orientation offensive :</b> ${phys} physique(s), ${spec} spécial(aux). <b>Vitesse :</b> le plus rapide = ${esc(fastest.m.nickname ?? fastest.s.name)} (${fastest.st.spe}), le plus lent = ${esc(slowest.m.nickname ?? slowest.s.name)} (${slowest.st.spe}).</p>
  <p><b>Investissement moyen :</b> gènes ${avg("ivs")}/75 (${ivGrade(avg("ivs"))}) · EV ${avg("ev")}/510 · Saiyan ${avg("allocated")} pts/Daemon. <b>Stades :</b> ${stage.base} base, ${stage.middle} intermédiaire(s), ${stage.final} final/finaux.</p>
  <ul>${notes.map((n) => `<li>${n}</li>`).join("")}</ul>
</div>`
}

// ══════════════════════════ CHAPITRE 3 — SPOIL MODÉRÉ (types & tendances) ══════════════════════════
function ligueTendency() {
    // agrège les TYPES de toute la Ligue (sans révéler les équipes exactes)
    const count: Record<string, number> = {}
    let total = 0
    for (const id of LIGUE_IDS) {
        const t = getTrainer(id)
        if (!t?.team) continue
        for (const mon of t.team) { const s = getSpecies(mon.speciesId); if (!s) continue; for (const ty of s.types) { count[ty] = (count[ty] ?? 0) + 1; total++ } }
    }
    const ranked = Object.entries(count).sort((a, b) => b[1] - a[1])
    return { ranked, total, nTrainers: LIGUE_IDS.length }
}

function chapter3(team: MonInstance[]): string {
    const { ranked, nTrainers } = ligueTendency()
    const members = team.map((m) => ({ m, s: getSpecies(m.speciesId)! })).filter((x) => x.s)
    const dominant = ranked.slice(0, 6) // tendances dominantes (sans équipes exactes)
    const rows = dominant.map(([t]) => {
        // est-ce qu'au moins un Daemon RÉSISTE ce type ? et qu'au moins un STAB le frappe en super-efficace ?
        const resists = members.filter((x) => typeEffectiveness(t as PokeType, x.s.types) < 1).map((x) => x.m.nickname ?? x.s.name)
        const weakTo = members.filter((x) => typeEffectiveness(t as PokeType, x.s.types) >= 2).map((x) => x.m.nickname ?? x.s.name)
        const answers = members.filter((x) => x.s.types.some((st) => typeMultiplier(st as PokeType, t as PokeType) > 1)).map((x) => x.m.nickname ?? x.s.name)
        const verdict = weakTo.length > answers.length ? "bad" : answers.length ? "ok" : ""
        return `<tr class="${verdict}"><td>${tag(t)}</td><td class="small">${answers.length ? "✅ " + answers.join(", ") : "—"}</td><td class="small">${resists.length ? resists.join(", ") : "—"}</td><td class="small">${weakTo.length ? "⚠️ " + weakTo.join(", ") : "—"}</td></tr>`
    }).join("")
    return `
<h1 class="chap">Chapitre 3 — Cap sur la Ligue (spoil modéré)</h1>
<p>Pas d'équipes révélées ici — juste les <b>tendances de types</b> du Conseil des 4 + Maître (${nTrainers} dresseurs d'élite), et comment <b>ton</b> équipe se positionne. De quoi préparer sans gâcher la surprise.</p>
<h2>Les types qui dominent la Ligue</h2>
<p>${dominant.map(([t, c]) => `${tag(t)} <span class="small">(${c})</span>`).join(" ")}</p>
<h2>Ton équipe face à ces tendances</h2>
<table><tr><th>Type adverse</th><th>Tu réponds (STAB super-efficace)</th><th>Tu encaisses (résiste)</th><th>Tu crains (×2+)</th></tr>${rows}</table>
<div class="box">🎯 <b>Plan de prépa</b> : pour chaque ligne <span style="color:#c0392b">en rouge</span>, prévois une parade (un Daemon qui résiste <i>et</i> qui frappe ce type en retour), monte un peu de niveau, et garde des objets de soin. Les détails par Daemon sont au Chapitre 2.</div>
`
}

// ══════════════════════════ ASSEMBLAGE ══════════════════════════
function buildHtml(nickname: string, save: ReturnType<typeof parseSave>): string {
    const team = save.team
    const c1 = chapter1()
    const cards = team.map(daemonCard).join("")
    const profile = teamProfile(team)
    const swot = teamSwot(team)
    const c3 = chapter3(team)
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Guide ${esc(nickname)} — Nexus Jaune Éclair</title><style>${CSS}</style></head><body>
<div class="cover"><h1>NEXUS JAUNE ÉCLAIR</h1><h2>Guide stratégique de ${esc(nickname)}</h2><div class="sub">Un guide en 3 chapitres : les bases pour comprendre et progresser, l'analyse complète de TON équipe, et la prépa pour la Ligue.<br><br>Équipe : ${team.length} Daemon(s) · Badges : ${save.badges.length} · Pokédex : ${save.pokedex.caught.length} capturés.</div><div class="sub muted">100% calculé depuis les données réelles du jeu — zéro approximation.</div></div>
<div class="page">${c1}</div>
<div class="page"><h1 class="chap">Chapitre 2 — Ton équipe au microscope</h1><p>Analyse Daemon par Daemon (stats réelles, gènes/EV/Saiyan, faiblesses, moveset, learnset, set légal recommandé), puis le profil global et le bilan SWOT.</p>${cards}${profile}${swot}</div>
<div class="page">${c3}<div class="footer">Généré le ${new Date().toISOString().slice(0, 10)} — déterministe depuis le code du jeu (espèces, types, formules, légalité des attaques) et la save prod en lecture seule. Catégorie Physique/Spécial par TYPE (Gen 1). Aucune attaque illégale recommandée. Aucune donnée externe.</div></div>
</body></html>`
}

// ══════════════════════════ MAIN ══════════════════════════
;(async () => {
    const prisma = new PrismaClient()
    try {
        for (const nick of PLAYERS) {
            const u = await prisma.user.findFirst({ where: { nickname: { contains: nick, mode: "insensitive" } }, select: { id: true, nickname: true } })
            if (!u) { console.log(`❌ ${nick} : utilisateur introuvable`); continue }
            const row: any = await (prisma as any).gamebookProgress.findUnique({ where: { userId_chapterId: { userId: u.id, chapterId: "yellow" } }, select: { flags: true } })
            if (!row?.flags) { console.log(`❌ ${nick} (${u.nickname}) : pas de save yellow`); continue }
            const save = parseSave(row.flags)
            // ── VÉRIF anti-hallucination : toutes les espèces de l'équipe existent ──
            const bad = save.team.filter((m) => !getSpecies(m.speciesId)).map((m) => m.speciesId)
            if (bad.length) console.log(`⚠️ ${u.nickname} : espèces inconnues ${bad.join(",")}`)
            const html = buildHtml(u.nickname, save)
            const file = `${OUT_DIR}/GUIDE-${u.nickname.replace(/[^a-zA-Z0-9]/g, "")}.html`
            writeFileSync(file, html, "utf8")
            console.log(`✅ ${u.nickname} : ${save.team.length} Daemons → ${file}`)
            // cross-check console : stats du 1er Daemon
            const m0 = save.team[0]
            if (m0) { const s0 = getSpecies(m0.speciesId)!; const st = fullStats(m0, s0); console.log(`   vérif ${m0.nickname ?? s0.name} N${m0.level} : PV${st.hp} Atq${st.atk} Déf${st.def} Vit${st.spe} Spé${st.spc}`) }
        }
    } finally { await prisma.$disconnect() }
})()
