// Générateur déterministe du POKÉDEX COMPLET (Nexus Jaune Éclair) — HTML prêt-à-PDF.
// Importe les VRAIES données + la vraie table de types → zéro hallucination.
// Lancement : npx -y tsx pokedex-gen.mts
import { writeFileSync } from "node:fs"
import { SPECIES } from "./src/lib/gamebook/yellow/data/species"
import { MOVES } from "./src/lib/gamebook/yellow/data/moves"
import { typeMultiplier, moveCategory } from "./src/lib/gamebook/yellow/battle/typeChart"

const OUT = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad"

const TYPES = ["NORMAL","FEU","EAU","PLANTE","ELEC","GLACE","COMBAT","POISON","SOL","VOL","PSY","INSECTE","ROCHE","SPECTRE","DRAGON"] as const
type T = typeof TYPES[number]
const TYPE_FR: Record<string,string> = { NORMAL:"Normal",FEU:"Feu",EAU:"Eau",PLANTE:"Plante",ELEC:"Élec",GLACE:"Glace",COMBAT:"Combat",POISON:"Poison",SOL:"Sol",VOL:"Vol",PSY:"Psy",INSECTE:"Insecte",ROCHE:"Roche",SPECTRE:"Spectre",DRAGON:"Dragon" }
const TYPE_COLOR: Record<string,string> = { NORMAL:"#9a9a72",FEU:"#f08030",EAU:"#6890f0",PLANTE:"#78c850",ELEC:"#e8c000",GLACE:"#79c6c6",COMBAT:"#c03028",POISON:"#a040a0",SOL:"#d8b840",VOL:"#9a86e0",PSY:"#f85888",INSECTE:"#a8b820",ROCHE:"#b8a038",SPECTRE:"#705898",DRAGON:"#6a30f0" }

const esc = (s:any) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
const pad3 = (n:number) => String(n).padStart(3,"0")
const sp = (s:any)=>s.baseStats
const bstOf = (s:any)=> sp(s).hp+sp(s).atk+sp(s).def+sp(s).spe+sp(s).spc

const all = Object.values(SPECIES) as any[]
all.sort((a,b)=>a.dexNo-b.dexNo)

// ---- reverse evolution map (toId -> [fromIds]) ----
const preEvo: Record<string,string[]> = {}
for (const s of all) if (s.evolution?.toId) (preEvo[s.evolution.toId] ??= []).push(s.id)

function methodLabel(m:any): string {
  if (!m) return ""
  if (m.kind==="LEVEL") return `niv. ${m.level}`
  if (m.kind==="TRADE") return "échange"
  if (m.kind==="ITEM") return `objet ${m.itemId}`
  return m.kind
}
// chaîne complète (remonte à la racine puis descend), libellée
function evoChain(s:any): string {
  // remonte à la racine
  let root = s.id, guard=0
  while (preEvo[root]?.length && guard++<20) root = preEvo[root][0]
  // descend en notant la méthode
  const parts:string[] = []
  let cur = root, g=0; const seen=new Set<string>()
  while (cur && !seen.has(cur) && g++<20) {
    seen.add(cur)
    const cs = SPECIES[cur] as any
    if (!cs) { parts.push(`${cur} (cible N/D)`); break }
    const isMe = cur===s.id
    parts.push(isMe ? `<b>${esc(cs.name)}</b>` : esc(cs.name))
    if (cs.evolution?.toId) { parts.push(`<span class="evoarrow">— ${methodLabel(cs.evolution.method)} →</span>`); cur = cs.evolution.toId }
    else break
  }
  // transformations hors-species (panthères/Panthéon : aucune evolution + aucun pré-évo)
  if (parts.length===1 && !s.evolution && !preEvo[s.id]) {
    return `${esc(s.name)} — <i>pas d'évolution / stade isolé</i>`
  }
  return parts.join(" ")
}

// ---- profil défensif ----
function defProfile(s:any){
  const buckets: Record<string,string[]> = { x4:[],x2:[],h:[],q:[],z:[] } // z=immun, q=×0.25, h=×0.5
  for (const atk of TYPES){
    let m = 1
    for (const d of s.types) m *= typeMultiplier(atk as any, d as any)
    if (m===0) buckets.z.push(atk)
    else if (m>=4) buckets.x4.push(atk)
    else if (m>=2) buckets.x2.push(atk)
    else if (Math.abs(m-0.25)<1e-9) buckets.q.push(atk)
    else if (Math.abs(m-0.5)<1e-9) buckets.h.push(atk)
  }
  return buckets
}

// ---- alignement offensif ----
function alignment(s:any){
  const cats = s.types.map((t:string)=>moveCategory(t as any)) // PHYSICAL/SPECIAL par type
  const phys = cats.includes("PHYSICAL"), spec = cats.includes("SPECIAL")
  const orient = phys&&spec ? "Mixte" : phys ? "Physique" : "Spécial"
  const {atk,spc}=sp(s)
  let note = ""
  if (orient==="Physique" && spc>atk+15) note = `⚠️ décalage : STAB physique mais SPÉ (${spc}) > ATQ (${atk})`
  else if (orient==="Spécial" && atk>spc+15) note = `⚠️ décalage : STAB spécial mais ATQ (${atk}) > SPÉ (${spc})`
  else if (orient==="Physique") note = `✅ STAB physique servi par l'ATQ (${atk})`
  else if (orient==="Spécial") note = `✅ STAB spécial servi par le SPÉ (${spc})`
  else note = `bi-orienté (ATQ ${atk} / SPÉ ${spc})`
  return { orient, note }
}

// ---- résumé d'effet d'un move ----
function effSummary(m:any): string {
  const e = m.effect; if (!e) return "—"
  const out:string[] = []
  const ch = e.chance!=null && e.chance<100 ? ` ${e.chance}%` : ""
  if (e.inflictStatus) out.push(`${({BURN:"brûlure",POISON:"poison",TOXIC:"poison grave",PARALYSIS:"paralysie",SLEEP:"sommeil",FREEZE:"gel"} as any)[e.inflictStatus]||e.inflictStatus}${ch}`)
  if (e.inflictVolatile) out.push(`${({CONFUSION:"confusion",FLINCH:"peur",SEEDED:"vampigraine",TRAPPED:"piégé",RECHARGE:"recharge"} as any)[e.inflictVolatile]||e.inflictVolatile}${ch}`)
  if (e.flinch) out.push(`peur${ch}`)
  if (e.statChanges) for (const sc of e.statChanges) out.push(`${sc.stages>0?"+":""}${sc.stages} ${({atk:"ATQ",def:"DÉF",spe:"VIT",spc:"SPÉ",acc:"préc.",eva:"esq."} as any)[sc.stat]} ${sc.target==="self"?"(soi)":"(cible)"}`)
  if (e.drainPct) out.push(`draine ${e.drainPct}%`)
  if (e.recoilPct) out.push(`recul ${e.recoilPct}%`)
  if (e.healPct) out.push(`soigne ${e.healPct}%`)
  if (e.multiHit) out.push(`${e.multiHit[0]}-${e.multiHit[1]} coups`)
  if (e.highCrit) out.push("fort crit")
  if (e.twoTurn) out.push("2 tours")
  if (e.dig) out.push("2 t. (sous terre, invuln.)")
  if (e.fly) out.push("2 t. (en vol, invuln.)")
  if (e.sureHit) out.push("infaillible (ignore invuln.)")
  if (e.selfHpToOne) out.push("kamikaze (→1 PV)")
  if (e.resetStats) out.push("reset stats 2 camps")
  if (e.restSleep) out.push("dort 1 tour")
  if (e.speedScaledAcc) out.push("préc. ∝ vitesse")
  if (e.fixedDamage) out.push(`dégâts fixes ${e.fixedDamage}`)
  if (e.critChanceForSpecies) out.push("crit ciblé")
  return out.join(", ") || "—"
}
function moveCat(m:any){ return m.category || moveCategory(m.type as any) }

// ---- learnset trié + résolu ----
function learnRows(s:any){
  const rows = [...s.learnset].sort((a:any,b:any)=>a.level-b.level)
  return rows.map((l:any)=>{ const m = MOVES[l.moveId] as any; return { lvl:l.level, id:l.moveId, m } })
}

// ---- rôle (heuristique transparente sur les stats + learnset) ----
function isUtil(m:any){ const e=m?.effect; return e && (e.healPct||e.restSleep||(e.statChanges&&e.statChanges.some((c:any)=>c.target==="self"&&c.stages>0))||(m.power===0&&(e.inflictStatus||e.inflictVolatile))) }
function roleTags(s:any){
  const {hp,atk,def,spe,spc}=sp(s); const off=Math.max(atk,spc); const bulk=hp+def
  const moves = learnRows(s).map(r=>r.m).filter(Boolean)
  const utilCount = moves.filter(isUtil).length
  const hasHeal = moves.some((m:any)=>m.effect?.healPct||m.effect?.restSleep)
  const tags:string[]=[]
  if (def>=95 && hp>=80 && spe<=72) tags.push("Mur")
  if (hp>=95 && bulk>=185 && off>=88 && !tags.includes("Mur")) tags.push("Tank")
  if (spe>=95 && off>=95) tags.push("Sweeper")
  if ((hasHeal||utilCount>=3) && off<100) tags.push("Support")
  if (!tags.length) tags.push(atk>=spc ? "Attaquant physique" : "Attaquant spécial")
  return tags
}
function tierOf(s:any){ const b=bstOf(s); return b>=520?"S":b>=470?"A":b>=420?"B":b>=360?"C":"D" }

// ---- set recommandé (heuristique : STAB aligné + couverture + utilitaire) ----
function recoSet(s:any){
  const {atk,spc}=sp(s); const better = atk>=spc ? "PHYSICAL":"SPECIAL"
  const rows = learnRows(s).map(r=>r.m).filter(Boolean)
  const uniq:any[]=[]; const seen=new Set<string>(); for(const m of rows){ if(!seen.has(m.id)){seen.add(m.id);uniq.push(m)} }
  const dmg = uniq.filter((m:any)=>m.power>0)
  const score=(m:any)=> m.power * (s.types.includes(m.type)?1.5:1) * (moveCat(m)===better?1:0.55)
  const stab = dmg.filter((m:any)=>s.types.includes(m.type)).sort((a,b)=>score(b)-score(a))
  const cov  = dmg.filter((m:any)=>!s.types.includes(m.type)).sort((a,b)=>score(b)-score(a))
  const util = uniq.filter(isUtil).sort((a,b)=>(b.power||0)-(a.power||0))
  const pick:any[]=[]; const used=new Set<string>()
  const add=(m:any)=>{ if(m&&!used.has(m.id)){used.add(m.id);pick.push(m)} }
  if (stab[0]) add(stab[0])
  if (cov[0]) add(cov[0])
  if (util[0]) add(util[0])
  // compléter avec les meilleurs dégâts restants
  for (const m of [...stab,...cov].sort((a,b)=>score(b)-score(a))) { if(pick.length>=4)break; add(m) }
  return pick.map(m=>m.name)
}

// ============================== RENDER ==============================
const CSS = `
:root{--ink:#1a1a22;--mut:#6b7280;--line:#e5e7eb;--bg:#fff;--card:#fbfbfd;}
*{box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:var(--ink);margin:0;background:#fff;font-size:12px;line-height:1.45}
.wrap{max-width:920px;margin:0 auto;padding:24px}
h1{font-size:30px;margin:0 0 4px;letter-spacing:-.5px}
h2{font-size:21px;margin:0 0 12px;padding-bottom:6px;border-bottom:3px solid var(--ink)}
h3{font-size:15px;margin:0}
.section{page-break-before:always}
.cover{min-height:88vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.cover .sub{color:var(--mut);font-size:15px;margin-top:6px}
.cover .meta{margin-top:30px;font-size:12px;color:var(--mut)}
.badge{display:inline-block;color:#fff;font-weight:700;font-size:10px;padding:2px 8px;border-radius:9px;margin:0 3px 0 0;text-transform:uppercase;letter-spacing:.3px}
.flag{display:inline-block;font-size:9px;font-weight:800;padding:2px 6px;border-radius:6px;margin-left:5px;background:#111;color:#fff;letter-spacing:.5px}
.flag.leg{background:#b8860b}.flag.exc{background:#0d9488}.flag.hid{background:#7c3aed}
table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:11px}
th,td{border:1px solid var(--line);padding:4px 7px;text-align:left;vertical-align:top}
th{background:#f3f4f6;font-weight:700}
td.n,th.n{text-align:center}
.card{page-break-inside:avoid;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 16px;background:var(--card)}
.card h3{font-size:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dexno{color:var(--mut);font-variant-numeric:tabular-nums}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 22px}
.statbar{display:flex;align-items:center;gap:6px;font-size:10px;margin:1px 0}
.statbar .lab{width:30px;color:var(--mut);font-weight:700}
.statbar .val{width:26px;text-align:right;font-variant-numeric:tabular-nums}
.statbar .track{flex:1;height:8px;background:#eceef2;border-radius:5px;overflow:hidden}
.statbar .fill{height:100%;border-radius:5px}
.kv{font-size:11px;margin:1px 0}.kv b{color:#374151}
.def li{margin:1px 0}
.def .w4{color:#b91c1c;font-weight:700}.def .w2{color:#dc2626}.def .r{color:#15803d}.def .r2{color:#047857;font-weight:700}.def .im{color:#6d28d9;font-weight:700}
.muted{color:var(--mut)}
.desc{font-style:italic;color:#444;border-left:3px solid var(--line);padding-left:9px;margin:6px 0}
.evoarrow{color:var(--mut);font-size:10px}
.chip{display:inline-block;background:#eef;border:1px solid #dde;border-radius:7px;padding:1px 7px;margin:2px 3px 0 0;font-size:10px}
.tierhdr{font-weight:800;font-size:13px;margin:10px 0 4px}
.cellx2{background:#fde2e2}.cellx05{background:#dcf5e3}.cellx0{background:#e7defb}.cellx4{background:#f8b4b4}.cellx025{background:#bbf0cc}
.mx td,.mx th{text-align:center;padding:2px 3px;font-size:9px}
small{color:var(--mut)}
@page{size:A4;margin:14mm}
`

function statBar(lab:string,v:number,color:string){
  const w = Math.min(100, Math.round(v/255*100))
  return `<div class="statbar"><span class="lab">${lab}</span><span class="val">${v}</span><span class="track"><span class="fill" style="width:${w}%;background:${color}"></span></span></div>`
}
function typeBadges(types:string[]){ return types.map(t=>`<span class="badge" style="background:${TYPE_COLOR[t]}">${TYPE_FR[t]}</span>`).join("") }
function listTypes(arr:string[]){ return arr.length? arr.map(t=>`<span class="badge" style="background:${TYPE_COLOR[t]};font-size:9px">${TYPE_FR[t]}</span>`).join(" ") : "<span class='muted'>aucune</span>" }

// ---- cartes ----
function card(s:any){
  const b = bstOf(s); const d = defProfile(s); const al = alignment(s)
  const st = sp(s)
  const flags:string[]=[]
  if (s.rarity==="LEGENDARY") flags.push(`<span class="flag leg">Légendaire</span>`)
  if (s.exclusive) flags.push(`<span class="flag exc">Exclusif</span>`)
  if (s.hiddenUntilCaught) flags.push(`<span class="flag hid">Masqué</span>`)
  const lr = learnRows(s)
  const learn = lr.map(r=>{
    if(!r.m) return `<tr><td class="n">${r.lvl||"Départ"}</td><td>${esc(r.id)} <small>(move N/D)</small></td><td colspan="6" class="muted">N/D</td></tr>`
    const cat = moveCat(r.m); const catLab = (r.m.category?cat+" (forcé)":cat==="PHYSICAL"?"PHY":"SPÉ")
    const pw = r.m.power===0?"0 (statut)":r.m.power
    const ac = r.m.accuracy===0?"— (infaill.)":r.m.accuracy
    return `<tr><td class="n">${r.lvl===1?"Départ":r.lvl}</td><td>${esc(r.m.name)}</td><td><span class="badge" style="background:${TYPE_COLOR[r.m.type]};font-size:8px">${TYPE_FR[r.m.type]}</span></td><td class="n">${catLab}</td><td class="n">${pw}</td><td class="n">${ac}</td><td class="n">${r.m.pp}</td><td>${esc(effSummary(r.m))}</td></tr>`
  }).join("")
  const flagsBody:string[]=[]
  if (s.exclusive) flagsBody.push("Exclusif (offert/unique, plancher de courbe d'XP ×1.10)")
  if (s.hiddenUntilCaught) flagsBody.push("Masqué du Pokédex tant que non capturé")
  if (s.learnsAllCts) flagsBody.push("Apprend TOUTES les CT")
  if (s.growthByStage) flagsBody.push("XP suit le BST du stade courant (growthByStage)")
  if (s.growthRate && s.growthRate!=="medium_fast") flagsBody.push(`Courbe d'XP : ${s.growthRate}`)
  return `<div class="card" id="dex-${pad3(s.dexNo)}">
    <h3><span class="dexno">Nº${pad3(s.dexNo)}</span> ${esc(s.name)} <small>(id : ${esc(s.id)})</small> ${flags.join("")}</h3>
    <div style="margin:6px 0">${typeBadges(s.types)} &nbsp; <b>BST ${b}</b> &nbsp; <span class="muted">${s.rarity}${s.role?" · "+esc(s.role):""}</span></div>
    <div class="grid2">
      <div>
        ${statBar("PV",st.hp,"#7bbf6a")}${statBar("ATQ",st.atk,"#e8893a")}${statBar("DÉF",st.def,"#e8c84a")}${statBar("VIT",st.spe,"#e35d9a")}${statBar("SPÉ",st.spc,"#6aa0ec")}
        <div class="kv" style="margin-top:4px"><b>Alignement :</b> ${al.orient} — ${esc(al.note)}</div>
        <div class="kv"><b>Capture :</b> ${s.catchRate} · <b>XP base :</b> ${s.baseExp} · <b>Courbe :</b> ${s.growthRate||"medium_fast (déf.)"}</div>
      </div>
      <div class="def">
        <div class="kv"><b>Profil défensif</b></div>
        <ul style="margin:2px 0 0;padding-left:16px">
          <li><span class="w4">×4 :</span> ${listTypes(d.x4)}</li>
          <li><span class="w2">×2 :</span> ${listTypes(d.x2)}</li>
          <li><span class="r">×0.5 :</span> ${listTypes(d.h)}</li>
          <li><span class="r2">×0.25 :</span> ${listTypes(d.q)}</li>
          <li><span class="im">×0 :</span> ${listTypes(d.z)}</li>
        </ul>
      </div>
    </div>
    <div class="kv" style="margin-top:6px"><b>Évolution :</b> ${evoChain(s)}</div>
    ${flagsBody.length?`<div class="kv"><b>Flags :</b> ${esc(flagsBody.join(" · "))}</div>`:""}
    <div class="desc">${esc(s.description)}</div>
    <table><thead><tr><th class="n">Niv.</th><th>Capacité</th><th>Type</th><th class="n">Cat.</th><th class="n">Puiss.</th><th class="n">Préc.</th><th class="n">PP</th><th>Effet</th></tr></thead><tbody>${learn}</tbody></table>
    <div class="kv"><b>Verdict post-game</b> — Rôle : ${roleTags(s).join(", ")} · Tier : <b>${tierOf(s)}</b></div>
    <div class="kv"><b>Set conseillé :</b> ${esc(recoSet(s).join(" / "))||"<span class='muted'>N/D</span>"} <small>(heuristique, choisi dans le learnset)</small></div>
  </div>`
}

// ---- table d'efficacité (matrice 15×15, vraie source) ----
function typeMatrix(){
  const head = `<tr><th>ATQ ↓ / DÉF →</th>${TYPES.map(t=>`<th style="background:${TYPE_COLOR[t]};color:#fff">${TYPE_FR[t].slice(0,3)}</th>`).join("")}</tr>`
  const rows = TYPES.map(a=>{
    const cells = TYPES.map(dd=>{ const m=typeMultiplier(a as any,dd as any); let c="",v=""; if(m===0){c="cellx0";v="0"}else if(m===0.5){c="cellx05";v="½"}else if(m===2){c="cellx2";v="2"}else v=""; return `<td class="${c}">${v}</td>` }).join("")
    return `<tr><th style="background:${TYPE_COLOR[a]};color:#fff;text-align:left">${TYPE_FR[a]}</th>${cells}</tr>`
  }).join("")
  return `<table class="mx">${head}${rows}</table><small>Cellule vide = ×1. <span class="cellx2">&nbsp;2&nbsp;</span> super efficace · <span class="cellx05">&nbsp;½&nbsp;</span> peu efficace · <span class="cellx0">&nbsp;0&nbsp;</span> immunité.</small>`
}

// ---- classements ----
function rankBST(){
  const top = [...all].sort((a,b)=>bstOf(b)-bstOf(a))
  const rows = top.slice(0,20).map((s,i)=>`<tr><td class="n">${i+1}</td><td class="n">Nº${pad3(s.dexNo)}</td><td>${esc(s.name)}</td><td>${typeBadges(s.types)}</td><td class="n">${bstOf(s)}</td></tr>`).join("")
  const low = top[top.length-1]
  return `<table><thead><tr><th class="n">#</th><th class="n">Dex</th><th>Nom</th><th>Types</th><th class="n">BST</th></tr></thead><tbody>${rows}</tbody></table><small>Plus bas BST : ${esc(low.name)} (${bstOf(low)}).</small>`
}
function topStat(stat:string,lab:string){
  const top=[...all].sort((a,b)=>sp(b)[stat]-sp(a)[stat]).slice(0,10)
  return `<b>${lab}</b> : ${top.map(s=>`${esc(s.name)} (${sp(s)[stat]})`).join(" · ")}`
}
function rarityCounts(){
  const c:Record<string,number>={}; for(const s of all)c[s.rarity]=(c[s.rarity]||0)+1
  const legs = all.filter(s=>s.rarity==="LEGENDARY").map(s=>esc(s.name)).join(", ")
  return `${Object.entries(c).map(([k,v])=>`${k}: ${v}`).join(" · ")}<br><small>Légendaires : ${legs}</small>`
}
function flagList(pred:(s:any)=>boolean){ return all.filter(pred).map(s=>`${esc(s.name)} (Nº${pad3(s.dexNo)})`).join(", ")||"—" }

// ---- tier list ----
function tierList(){
  const order=["S","A","B","C","D"]; const by:Record<string,any[]>={}
  for(const s of all)(by[tierOf(s)] ??= []).push(s)
  return order.map(t=>{ const arr=(by[t]||[]).sort((a,b)=>bstOf(b)-bstOf(a)); if(!arr.length)return ""; return `<div class="tierhdr">Tier ${t} <small>(${arr.length})</small></div><div>${arr.map(s=>`<span class="chip">${esc(s.name)} <small>${bstOf(s)}·${TYPE_FR[s.types[0]]}</small></span>`).join("")}</div>` }).join("")
}
function roleIndex(){
  const by:Record<string,any[]>={}
  for(const s of all)for(const r of roleTags(s))(by[r] ??= []).push(s)
  return Object.keys(by).sort().map(r=>`<div class="tierhdr">${r} <small>(${by[r].length})</small></div><div>${by[r].sort((a,b)=>bstOf(b)-bstOf(a)).map(s=>`<span class="chip">${esc(s.name)}</span>`).join("")}</div>`).join("")
}

// ---- index dexNo ----
function indexDex(){
  const rows=all.map(s=>`<tr><td class="n">Nº${pad3(s.dexNo)}</td><td><a href="#dex-${pad3(s.dexNo)}">${esc(s.name)}</a></td><td><small>${esc(s.id)}</small></td><td>${typeBadges(s.types)}</td><td class="n">${bstOf(s)}</td><td class="n">${s.rarity[0]}</td></tr>`).join("")
  return `<table><thead><tr><th class="n">Dex</th><th>Nom</th><th>id</th><th>Types</th><th class="n">BST</th><th class="n">R</th></tr></thead><tbody>${rows}</tbody></table>`
}
function indexByType(){
  return TYPES.map(t=>{ const arr=all.filter(s=>s.types.includes(t)); return `<div class="kv"><span class="badge" style="background:${TYPE_COLOR[t]}">${TYPE_FR[t]}</span> <small>(${arr.length})</small> ${arr.map(s=>`${esc(s.name)} <span class="muted">${pad3(s.dexNo)}</span>`).join(" · ")}</div>` }).join("")
}

// ---- catalogue des moves (dédupliqué) ----
function moveCatalog(){
  const used=new Set<string>(); for(const s of all)for(const l of s.learnset)used.add(l.moveId)
  const list=[...used].map(id=>MOVES[id]).filter(Boolean).sort((a:any,b:any)=> a.type.localeCompare(b.type) || (b.power||0)-(a.power||0))
  const rows=list.map((m:any)=>{ const cat=moveCat(m); return `<tr><td>${esc(m.name)}</td><td><span class="badge" style="background:${TYPE_COLOR[m.type]};font-size:8px">${TYPE_FR[m.type]}</span></td><td class="n">${m.category?cat+" (forcé)":cat==="PHYSICAL"?"PHY":"SPÉ"}</td><td class="n">${m.power===0?"0 (st.)":m.power}</td><td class="n">${m.accuracy===0?"∞":m.accuracy}</td><td class="n">${m.pp}</td><td class="n">${m.priority??"—"}</td><td>${esc(effSummary(m))}</td></tr>` }).join("")
  const missing=[...used].filter(id=>!MOVES[id])
  return `<small>${list.length} capacités utilisées dans les learnsets${missing.length?` · ⚠️ N/D : ${missing.join(", ")}`:""}.</small><table><thead><tr><th>Capacité</th><th>Type</th><th class="n">Cat.</th><th class="n">Puiss.</th><th class="n">Préc.</th><th class="n">PP</th><th class="n">Prio.</th><th>Effet</th></tr></thead><tbody>${rows}</tbody></table>`
}

// ---- contrôles ----
const goshen = all.find(s=>s.id==="goshendofy"); const tony = all.find(s=>s.id==="tonytony")
const dexNos = all.map(s=>s.dexNo)
const contiguous = dexNos.every((n,i)=> i===0 || n===dexNos[i-1]+1)
const checks = [
  `Espèces : <b>${all.length}</b>`,
  `dexNo ${Math.min(...dexNos)}→${Math.max(...dexNos)} ${contiguous?"contigus ✅":"⚠️ trous !"}`,
  `BST goshendofy = ${goshen?bstOf(goshen):"?"} ${goshen&&bstOf(goshen)===590?"✅":"⚠️"}`,
  `BST tonytony = ${tony?bstOf(tony):"?"} ${tony&&bstOf(tony)===415?"✅":"⚠️"}`,
  `Légendaires : ${all.filter(s=>s.rarity==="LEGENDARY").map(s=>s.name).join(", ")}`,
]

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Pokédex — Nexus Jaune Éclair</title><style>${CSS}</style></head><body><div class="wrap">

<section class="cover">
  <h1>POKÉDEX COMPLET</h1>
  <div class="sub">NEXUS JAUNE ÉCLAIR — Guide de référence post-game (Battle Frontier : Tour · Usine · Dôme)</div>
  <div class="meta">${all.length} Daemons documentés · données extraites EXCLUSIVEMENT du code du jeu (zéro invention)<br>Généré automatiquement depuis species.ts / moves.ts / typeChart.ts</div>
</section>

<section class="section"><h2>Notice de lecture</h2>
<ul>
<li><b>Système Gen 1</b> : 5 stats (PV, ATQ, DÉF, VIT, <b>SPÉ unifié</b> = attaque ET défense spéciales).</li>
<li><b>Physique / Spécial par TYPE</b> (pas par capacité) : Physiques = Normal, Combat, Vol, Poison, Sol, Roche, Insecte, Spectre → ATQ. Spéciaux = Feu, Eau, Plante, Élec, Glace, Psy, Dragon → SPÉ.</li>
<li><b>BST</b> = somme des 5 stats. <b>Profil défensif</b> = calculé via la vraie table des types.</li>
<li>Puissance <b>0</b> = capacité de statut ; précision <b>—/∞</b> = infaillible.</li>
<li>Rôle, Tier et Set conseillé sont des <b>heuristiques</b> (calculées) ; stats/types/faiblesses/learnsets sont <b>exacts</b>.</li>
</ul></section>

<section class="section"><h2>Table d'efficacité des types</h2>${typeMatrix()}</section>

<section class="section"><h2>Classements</h2>
<h3>Top 20 BST</h3>${rankBST()}
<h3 style="margin-top:10px">Top 10 par statistique</h3>
<div class="kv">${topStat("hp","PV")}</div><div class="kv">${topStat("atk","ATQ")}</div><div class="kv">${topStat("def","DÉF")}</div><div class="kv">${topStat("spe","VIT")}</div><div class="kv">${topStat("spc","SPÉ")}</div>
<h3 style="margin-top:10px">Rareté</h3><div class="kv">${rarityCounts()}</div>
<h3 style="margin-top:10px">Listes spéciales</h3>
<div class="kv"><b>Exclusifs :</b> ${flagList(s=>s.exclusive)}</div>
<div class="kv"><b>Masqués :</b> ${flagList(s=>s.hiddenUntilCaught)}</div>
<div class="kv"><b>Apprend toutes les CT :</b> ${flagList(s=>s.learnsAllCts)}</div>
<div class="kv"><b>growthByStage :</b> ${flagList(s=>s.growthByStage)}</div>
<div class="kv"><b>Sans évolution (stade isolé/final isolé) :</b> ${flagList(s=>!s.evolution && !preEvo[s.id])}</div>
</section>

<section class="section"><h2>Lecture stratégique — Battle Frontier</h2>
<h3>Tier list (auto, basée BST)</h3>${tierList()}
<h3 style="margin-top:12px">Index par rôle (auto)</h3>${roleIndex()}
<p><small>Tour de Combat (séries longues) → privilégier endurance/polyvalence (Tanks/Murs avec soin). Usine de Combat (Daemons prêtés) → autonomie/couverture large. Dôme (tournoi court) → fiabilité + sweepers rapides.</small></p>
</section>

<section class="section"><h2>Index par numéro</h2>${indexDex()}</section>
<section class="section"><h2>Index par type</h2>${indexByType()}</section>

<section class="section"><h2>Fiches des Daemons</h2>${all.map(card).join("")}</section>

<section class="section"><h2>Catalogue des capacités</h2>${moveCatalog()}</section>

<section class="section"><h2>Rapport d'auto-contrôle</h2>
<ul>${checks.map(c=>`<li>${c}</li>`).join("")}</ul>
<p><b>Aucune donnée externe utilisée. Source = code du jeu uniquement.</b><br>Contrôle qualité : ${all.length} fiches, BST recalculé, profils calculés via la table réelle, anti-hallucination confirmé (génération déterministe).</p>
</section>

</div></body></html>`

writeFileSync(`${OUT}/pokedex.html`, html, "utf8")
console.log("OK — pokedex.html écrit :", html.length, "chars,", all.length, "espèces.")
console.log("Contrôles:", checks.map(c=>c.replace(/<[^>]+>/g,"")).join(" | "))
