import sharp from "sharp"
import { writeFileSync } from "fs"
const TILE=16, SW=49, SH=42
const { data, info } = await sharp("public/yellow/sprites/grotte_casse_tete.png").raw().toBuffer({ resolveWithObject:true })
const { width, channels } = info
function classify(tx,ty){
  let dark=0, blue=0, sum=0, n=TILE*TILE
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
    const i=((ty*TILE+y)*width+(tx*TILE+x))*channels
    const r=data[i],g=data[i+1],b=data[i+2], br=(r+g+b)/3
    sum+=br; if(br<95)dark++; if(b>r+12&&b>90)blue++
  }
  if(sum/n<42) return "#"
  if(blue>60) return "~"
  if(dark>70) return "#"
  return "."
}
// échelles + entrée par étage (col,row locaux) — à forcer marchables
const LAD = {
  "1F":  { "1":[33,17], "2":[19,14], "3":[6,6], "E":[18,40] },
  "B1F": { "a":[33,12], "b":[19,33], "c":[25,23], "d":[5,11] },
  "B2F": { "3":[3,8], "1":[45,9], "2":[12,18], "a":[18,18], "d":[33,18], "S":[37,19], "c":[29,37], "b":[21,37] },
}
const out = {}
for(let s=0;s<3;s++){
  const floor=["1F","B1F","B2F"][s]
  const grid=[]
  for(let ty=0;ty<SH;ty++){ let line=""; for(let lx=0;lx<SW;lx++) line+=classify(s*SW+lx,ty); grid.push(line.split("")) }
  // carve : échelle + landing (la tuile + ses 4 voisines) → marchable "."
  for(const [,[cx,cy]] of Object.entries(LAD[floor])){
    for(const [dx,dy] of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){
      const x=cx+dx,y=cy+dy; if(x>=0&&x<SW&&y>=0&&y<SH) grid[y][x]="."
    }
  }
  out[floor]=grid.map(r=>r.join(""))
}
const ts = `// AUTO-GÉNÉRÉ (scripts/_gen-grotte-art.mjs) depuis grotte_casse_tete.png — grille de COLLISION des 3 étages de la
// Grotte du Nexus (# = mur/roche/vide, ~ = eau, . = sol marchable). Échelles & entrée forcées marchables.
// À affiner en jeu (debugGrid) : la classif couleur est approximative (rochers à centre clair).
export const GROTTE_NEXUS_ART: Record<"1F" | "B1F" | "B2F", string[]> = ${JSON.stringify(out, null, 2)}
`
writeFileSync("src/lib/gamebook/yellow/data/grotteNexusArt.ts", ts)
console.log("écrit src/lib/gamebook/yellow/data/grotteNexusArt.ts")
for(const f of ["1F","B1F","B2F"]){ const w=out[f].filter(r=>[...r].some(c=>c===".")).length; console.log(`${f}: ${out[f].length} lignes, ${out[f].reduce((a,r)=>a+[...r].filter(c=>c===".").length,0)} tuiles sol`) }
