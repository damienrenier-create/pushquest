// Génère la débug-map HTML avec le VRAI rendu du jeu (fond + canopée ronde + tronc, couleurs MapView) + points
// rouges sur les 30 spots fertiles/carte. Data inlinée (CSP).  npx tsx scripts/_berry-artifact.mts
import { readFileSync, writeFileSync } from "fs"

const DIR = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad"
const data = JSON.parse(readFileSync(DIR + "/berry-maps.json", "utf8"))

const html = `<style>
  :root { --bg:#10140d; --panel:#181d12; --line:#2b331f; --ink:#e7ecd6; --dim:#95a07a; --cherry:#ff3b2d; }
  * { box-sizing:border-box; }
  .wrap { max-width:1280px; margin:0 auto; padding:26px 20px 60px; color:var(--ink);
    font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif; }
  h1 { font-size:26px; font-weight:800; margin:0 0 4px; letter-spacing:-.01em; }
  .sub { color:var(--dim); font-size:13px; margin:0 0 18px; max-width:78ch; line-height:1.5; }
  .legend { display:flex; flex-wrap:wrap; gap:12px 18px; align-items:center; margin:0 0 22px; padding:10px 14px;
    background:var(--panel); border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .lg { display:flex; align-items:center; gap:7px; }
  .sw { width:15px; height:15px; border-radius:3px; border:1px solid rgba(0,0,0,.35); flex:none; }
  .dotmk { width:13px; height:13px; border-radius:50%; background:var(--cherry); border:1.5px solid #fff;
    box-shadow:0 0 6px var(--cherry); flex:none; }
  .maps { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:22px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .card h2 { font-size:15px; margin:0; padding:11px 14px; border-bottom:1px solid var(--line);
    display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .card h2 .cnt { font-size:11px; color:var(--cherry); font-weight:800; font-family:ui-monospace,monospace; }
  .cvwrap { overflow-x:auto; }
  .cv { display:block; width:100%; height:auto; image-rendering:pixelated; background:#0a0d07; }
  .coords { padding:9px 12px; font-family:ui-monospace,"Cascadia Mono",monospace; font-size:10.5px; color:var(--dim);
    line-height:1.7; border-top:1px solid var(--line); max-height:120px; overflow-y:auto; font-variant-numeric:tabular-nums; }
  .coords b { color:var(--ink); font-weight:600; }
</style>
<div class="wrap">
  <h1>🍒 Arbres fertiles — débug map (run 2)</h1>
  <p class="sub">Rendu fidèle du jeu (fond + canopée + tronc, couleurs de MapView). Les <b>points rouges cerclés de blanc</b>
    marquent les 30 futurs arbres/buissons à baies par carte — répartis régulièrement (échantillonnage « point le plus
    éloigné »). Vérifie qu'ils tombent bien sur des arbres que tu reconnais, et qu'ils sont bien étalés.</p>
  <div class="legend" id="legend"></div>
  <div class="maps" id="maps"></div>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const C = { GRASS:"#88b070", GRASSTALL:"#74a259", PATH:"#dcc088", TREE:"#3c6420", TREE_DARK:"#2c4818",
  TREE_HL:"#5c8c34", TRUNK:"#5c3818", WATER:"#5070c8", FLOOR_WOOD:"#c89c64", WALL:"#5c3818", ARENA:"#d8b878", FENCE:"#7a5a38" };
function bg(t){
  if (t==="path"||t==="sand") return C.PATH;
  if (t==="water"||t==="waterShallow") return C.WATER;
  if (t==="grassTall") return C.GRASSTALL;
  if (t==="floorWood") return C.FLOOR_WOOD;
  if (t==="arenaFloor") return C.ARENA;
  if (t==="fence") return C.FENCE;
  if (t && t.indexOf("wall")===0) return C.WALL;
  return C.GRASS; // grass, tree(fond), flower, défaut
}
const CELL = 15;

const legend = document.getElementById("legend");
legend.innerHTML = '<div class="lg"><span class="dotmk"></span>Arbre/buisson fertile (baie)</div>';
[["Arbre",C.TREE],["Herbe haute (buisson)",C.GRASSTALL],["Herbe",C.GRASS],["Chemin",C.PATH],["Eau",C.WATER],["Barrière",C.FENCE]]
  .forEach(([lab,c]) => { const el=document.createElement("div"); el.className="lg";
    el.innerHTML='<span class="sw" style="background:'+c+'"></span>'+lab; legend.appendChild(el); });

function drawTree(ctx,px,py){
  ctx.fillStyle=C.TRUNK; ctx.fillRect(px+CELL*0.42,py+CELL*0.70,CELL*0.16,CELL*0.28);            // tronc
  ctx.fillStyle=C.TREE;  ctx.beginPath(); ctx.ellipse(px+CELL*0.5,py+CELL*0.43,CELL*0.42,CELL*0.35,0,0,7); ctx.fill(); // canopée
  ctx.strokeStyle=C.TREE_DARK; ctx.lineWidth=Math.max(1,CELL*0.09);
  ctx.beginPath(); ctx.ellipse(px+CELL*0.5,py+CELL*0.45,CELL*0.40,CELL*0.33,0,0.5,2.64); ctx.stroke();  // ombre bas
  ctx.fillStyle=C.TREE_HL; ctx.beginPath(); ctx.arc(px+CELL*0.34,py+CELL*0.30,CELL*0.10,0,7); ctx.fill(); // reflet
}
function drawTall(ctx,px,py){ // touffe d'herbe haute (3 brins sombres)
  ctx.strokeStyle="rgba(30,52,18,0.55)"; ctx.lineWidth=Math.max(1,CELL*0.08);
  for (const dx of [0.3,0.5,0.7]){ ctx.beginPath(); ctx.moveTo(px+CELL*dx,py+CELL*0.85); ctx.lineTo(px+CELL*dx,py+CELL*0.45); ctx.stroke(); }
}

const mapsEl = document.getElementById("maps");
for (const m of DATA) {
  const card = document.createElement("div"); card.className="card";
  const label = m.fertileType==="grassTall" ? "buissons" : "arbres";
  card.innerHTML='<h2><span>'+m.name+'</span><span class="cnt">'+m.fertile.length+' '+label+'</span></h2>'+
    '<div class="cvwrap"><canvas class="cv" width="'+(m.width*CELL)+'" height="'+(m.height*CELL)+'"></canvas></div>'+
    '<div class="coords"></div>';
  mapsEl.appendChild(card);
  const ctx = card.querySelector("canvas").getContext("2d");
  for (let y=0;y<m.height;y++) for (let x=0;x<m.width;x++){
    const t=m.tiles[y]?.[x]; const px=x*CELL, py=y*CELL;
    ctx.fillStyle=bg(t); ctx.fillRect(px,py,CELL,CELL);
    if (t==="tree") drawTree(ctx,px,py);
    else if (t==="grassTall") drawTall(ctx,px,py);
  }
  for (const p of m.fertile){                         // marqueurs fertiles
    const cx=p.x*CELL+CELL/2, cy=p.y*CELL+CELL*(m.fertileType==="grassTall"?0.5:0.43);
    ctx.shadowColor="#ff2d1d"; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(cx,cy,CELL*0.30,0,7); ctx.fillStyle="#ff3b2d"; ctx.fill();
    ctx.shadowBlur=0; ctx.lineWidth=1.6; ctx.strokeStyle="#fff"; ctx.stroke();
  }
  card.querySelector(".coords").innerHTML='<b>'+m.fertile.length+' spots :</b> '+m.fertile.map(p=>'('+p.x+','+p.y+')').join("  ");
}
</script>`

writeFileSync(DIR + "/berry-debug.html", html)
console.log("Écrit → berry-debug.html  (" + Math.round(html.length/1024) + " KB)")
