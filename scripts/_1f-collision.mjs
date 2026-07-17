import sharp from "sharp"
import { writeFileSync } from "node:fs"
const SRC = "C:/Users/Sartay/Downloads/casse tête grotte.png"
const OX=0, OY=0, PW=784, PH=672, TS=16          // panneau 1F
const COLS=Math.floor(PW/TS), ROWS=Math.floor(PH/TS)
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width:W, channels:C } = info
const at=(x,y)=>{const i=(y*W+x)*C;return [data[i],data[i+1],data[i+2],data[i+3]]}
function block(cx,cy){let r=0,g=0,b=0,n=0
  for(let y=Math.floor(cy-TS*0.3);y<cy+TS*0.3;y++)for(let x=Math.floor(cx-TS*0.3);x<cx+TS*0.3;x++){const[R,G,B]=at(x,y);r+=R;g+=G;b+=B;n++}
  r/=n;g/=n;b/=n;const lum=0.299*r+0.587*g+0.114*b
  if(lum<45)return true                       // void / bordure noire
  // mur = rocher gris-violacé sombre ; sol = tan/sable clair. Seuil sur la luminance + faible saturation.
  if(lum<120 && Math.abs(r-b)<40)return true   // rocher sombre
  return false
}
const rows=[]
for(let ry=0;ry<ROWS;ry++){let s="";for(let cx=0;cx<COLS;cx++)s+=block(OX+(cx+0.5)*TS,OY+(ry+0.5)*TS)?"#":".";rows.push(s)}
rows.forEach((r,i)=>console.log(String(i).padStart(2)+" "+r))
console.log(`\n${COLS}x${ROWS}`)
writeFileSync("scripts/_1f-art.txt", rows.map(r=>`    "${r}",`).join("\n"))
