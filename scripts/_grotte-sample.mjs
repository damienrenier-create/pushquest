import sharp from "sharp"
const SRC = "C:/Users/Sartay/Downloads/GROTTE.png"
const COLS = 30, ROWS = 31
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
const tileW = W / COLS, tileH = H / ROWS
const at = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i+1], data[i+2], data[i+3]] }
const classify = (cx, cy) => {
  // moyenne sur le centre 50% de la tuile
  let r=0,g=0,b=0,a=0,n=0
  const x0=Math.floor(cx-tileW*0.25), x1=Math.ceil(cx+tileW*0.25), y0=Math.floor(cy-tileH*0.25), y1=Math.ceil(cy+tileH*0.25)
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){ if(x<0||y<0||x>=W||y>=H)continue; const [R,G,B,A]=at(x,y); r+=R;g+=G;b+=B;a+=A;n++ }
  r/=n;g/=n;b/=n;a/=n
  const lum = 0.299*r+0.587*g+0.114*b
  if (a < 60 || lum < 38) return "#"      // void / transparent / noir
  if (b > r+15 && b > 95) return "~"       // eau
  if (lum < 108) return "X"                // ridge sombre (mur probable)
  return "."                                // sol
}
let out = "   " + Array.from({length:COLS},(_,i)=>String(i%10)).join("") + "\n"
const grid = []
for (let ry=0; ry<ROWS; ry++){
  let line=""
  const row=[]
  for (let cx=0; cx<COLS; cx++){
    const c = classify((cx+0.5)*tileW, (ry+0.5)*tileH)
    line+=c; row.push(c)
  }
  grid.push(row)
  out += String(ry).padStart(2," ")+" "+line+"\n"
}
console.log(out)
console.log("Légende : #=void ~=eau X=mur-sombre .=sol")
