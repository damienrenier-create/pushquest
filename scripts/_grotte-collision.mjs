import sharp from "sharp"
import { writeFileSync } from "node:fs"
const SRC = "C:/Users/Sartay/Downloads/GROTTE.png"
const COLS = 30, ROWS = 31
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
const tileW = W / COLS, tileH = H / ROWS
const at = (x,y)=>{const i=(y*W+x)*C;return [data[i],data[i+1],data[i+2],data[i+3]]}
// void (transparent/noir) ou eau → BLOQUANT ; reste → praticable (calage fin des ridges plus tard).
function block(cx,cy){
  let r=0,g=0,b=0,a=0,n=0
  const x0=Math.floor(cx-tileW*0.25),x1=Math.ceil(cx+tileW*0.25),y0=Math.floor(cy-tileH*0.25),y1=Math.ceil(cy+tileH*0.25)
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(x<0||y<0||x>=W||y>=H)continue;const[R,G,B,A]=at(x,y);r+=R;g+=G;b+=B;a+=A;n++}
  r/=n;g/=n;b/=n;a/=n
  const lum=0.299*r+0.587*g+0.114*b
  if(a<60||lum<38)return true             // void/noir
  if(b>r+15&&b>95)return true              // eau
  return false
}
const rows=[]
for(let ry=0;ry<ROWS;ry++){const row=[];for(let cx=0;cx<COLS;cx++)row.push(block((cx+0.5)*tileW,(ry+0.5)*tileH)?'#':'.');rows.push(row.join(""))}
// emit builder TS (chaîne art → TileType : '#' void/eau = "water" bloquant ; '.' = "ground" praticable)
const art = rows.map(r=>`    "${r}",`).join("\n")
const ts = `// GROTTE — collision v1 (auto-échantillonnée depuis grotte.png : void+eau bloquants ; ridges à CALER
// visuellement en jeu via debugGrid). '#' = bloquant, '.' = praticable. Grille ${COLS}×${ROWS}.
const GROTTE_ART: string[] = [
${art}
]
export function buildGrotteCollisions(): TileType[][] {
    return GROTTE_ART.map((row) => [...row].map((c) => (c === "#" ? "water" : "ground") as TileType))
}
`
writeFileSync("scripts/_grotte-collision.ts.txt", ts)
console.log(ts.split("\n").slice(0,6).join("\n"))
console.log(`... (${ROWS} lignes) écrit dans scripts/_grotte-collision.ts.txt`)
// aperçu
console.log("\nAperçu :"); rows.forEach((r,i)=>console.log(String(i).padStart(2)+" "+r))
