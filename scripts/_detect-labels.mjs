import sharp from "sharp"
// Détecte les clusters de pixels ROUGES (étiquettes) dans une image de solution → centroïdes.
async function labels(path, gridW, gridH) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const isRed = (i) => { const r=data[i],g=data[i+1],b=data[i+2]; return r>140 && g<95 && b<95 && r>g+55 && r>b+55 }
  // marque les pixels rouges
  const red = []
  for (let y=0;y<height;y++) for (let x=0;x<width;x++){ if(isRed((y*width+x)*channels)) red.push([x,y]) }
  // clustering glouton (rayon 22px)
  const clusters = []
  for (const [x,y] of red){
    let c = clusters.find(c => Math.abs(c.cx-x)<22 && Math.abs(c.cy-y)<22)
    if(!c){ c={xs:[],ys:[],cx:x,cy:y}; clusters.push(c) }
    c.xs.push(x); c.ys.push(y); c.cx=c.xs.reduce((a,b)=>a+b,0)/c.xs.length; c.cy=c.ys.reduce((a,b)=>a+b,0)/c.ys.length
  }
  console.log(`\n=== ${path.split(/[\/]/).pop()} (${width}x${height}) → grille ${gridW}x${gridH} ===`)
  clusters.filter(c=>c.xs.length>=8).sort((a,b)=>a.cy-b.cy||a.cx-b.cx).forEach(c=>{
    const col = Math.round(c.cx/width*gridW), row = Math.round(c.cy/height*gridH)
    console.log(`  cluster ~(${Math.round(c.cx)},${Math.round(c.cy)})px  ${c.xs.length}px  →  tuile (${col},${row})`)
  })
}
const D = "C:/Users/Sartay/Downloads/"
await labels(D+"grotte puzzle-rdc.png", 49, 42)
await labels(D+"grotte puzzle-+1.png", 49, 42)
await labels(D+"grotte puzzle-+2.png", 49, 42)
