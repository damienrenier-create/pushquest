import sharp from "sharp"
const SRC = "C:/Users/Sartay/Downloads/casse tête grotte.png"
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
console.log("image", W+"x"+H)
const at=(x,y)=>{const i=(y*W+x)*C;return [data[i],data[i+1],data[i+2]]}
// colonnes majoritairement NOIRES (gaps entre panneaux) : lum moyenne par colonne à mi-hauteur
const y=Math.floor(H/2)
let runs=[], inBlack=false, start=0
for(let x=0;x<W;x++){const[r,g,b]=at(x,y);const lum=0.299*r+0.587*g+0.114*b;const black=lum<25
  if(black&&!inBlack){inBlack=true;start=x} if(!black&&inBlack){inBlack=false;if(x-start>20)runs.push([start,x])}}
if(inBlack)runs.push([start,W])
console.log("bandes noires (gaps panneaux) à y="+y+":", JSON.stringify(runs))
// panneaux = segments non-noirs larges
let panels=[], prev=0
for(const[s,e]of runs){ if(s-prev>100)panels.push([prev,s]); prev=e } if(W-prev>100)panels.push([prev,W])
console.log("PANNEAUX estimés [x0,x1] :", JSON.stringify(panels))
console.log("largeurs :", panels.map(([a,b])=>b-a))
