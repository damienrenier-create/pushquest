import sharp from "sharp"
const TILE=16, SW=49, SH=42
const { data, info } = await sharp("public/yellow/sprites/grotte_casse_tete.png").raw().toBuffer({ resolveWithObject:true })
const { width, channels } = info
const avg = (tx,ty) => { let r=0,g=0,b=0; for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){const i=((ty*TILE+y)*width+(tx*TILE+x))*channels; r+=data[i];g+=data[i+1];b+=data[i+2];} const n=TILE*TILE; return [r/n,g/n,b/n] }
// échantillons de référence (col,row LOCAUX + section)
const ref = [
  ["1F sol gris", 0, 15, 30], ["1F roche", 0, 10, 17], ["1F sable", 0, 3, 3], ["1F eau", 0, 2, 20],
  ["B1F vide", 1, 20, 20], ["B1F sol", 1, 10, 3], ["B1F roche", 1, 3, 1],
  ["B2F sol", 2, 25, 15], ["B2F roche", 2, 0, 30],
]
console.log("=== ÉCHANTILLONS (avg R,G,B) ===")
for (const [name,s,lx,ly] of ref){ const [r,g,b]=avg(s*SW+lx, ly); console.log(`  ${name.padEnd(12)} (${lx},${ly}) → ${Math.round(r)},${Math.round(g)},${Math.round(b)}`) }
