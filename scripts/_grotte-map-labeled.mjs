import { GROTTE_NEXUS_ART } from "../src/lib/gamebook/yellow/data/grotteNexusArt.ts"
const SW = 49
// échelles connues (mon état actuel) : [label, [cells...]]
const blk = (c1,r1,c2,r2)=>{const a=[];for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)a.push([c,r]);return a}
const LAD = {
  "1F": [ ["A",blk(5,7,6,8)], ["B",blk(19,15,20,16)], ["C",blk(31,17,32,18)], ["E",[[18,39],[19,39]]] ],
  "B1F":[ ["a",[[33,12]]], ["b",[[19,33]]], ["c",[[25,23]]], ["d",[[5,11]]] ],
  "B2F":[ ["R",blk(25,21,26,23)], ["D",blk(31,11,32,13)] ],
}
function ruler(){ let s="    "; for(let c=0;c<SW;c++) s+= c%10===0? String(c/10):(c%5===0?"·":" "); return s+"\n    "+Array.from({length:SW},(_,c)=>String(c%10)).join("") }
for(const f of ["1F","B1F","B2F"]){
  const g = GROTTE_NEXUS_ART[f].map(r=>[...r])
  for(const [lab,cells] of LAD[f]) for(const [c,r] of cells) if(g[r]) g[r][c]=lab
  console.log(`\n═════════ ${f} ═════════`)
  console.log(ruler())
  g.forEach((row,i)=>console.log(String(i).padStart(3)+" "+row.join("")))
}
console.log("\nLégende : # mur · . sol · ~ eau · lettres = échelles · E = entrée")
