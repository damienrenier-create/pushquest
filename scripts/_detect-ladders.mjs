import sharp from "sharp"
const TILE = 16, SECTION_W = 49, SECTION_H = 42
const img = sharp("public/yellow/sprites/grotte_casse_tete.png")
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
console.log(`image ${width}x${height} ch${channels} → ${width/TILE} x ${height/TILE} tuiles (3 sections de ${SECTION_W})`)
const px = (x,y) => { const i=(y*width+x)*channels; return [data[i],data[i+1],data[i+2]] }
// Un tile "échelle jaune rayée" = beaucoup de pixels jaune vif
function tileYellow(tx,ty){ let n=0; for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){const [r,g,b]=px(tx*TILE+x,ty*TILE+y); if(r>175&&g>140&&b<95)n++;} return n }
// Un tile "échelle sombre" = cluster de pixels très sombres (plus sombre que le sol grisâtre ~#9a9a80)
function tileDark(tx,ty){ let n=0; for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){const [r,g,b]=px(tx*TILE+x,ty*TILE+y); if(r<70&&g<70&&b<70)n++;} return n }
const cols = width/TILE
for (let s=0;s<3;s++){
  const floor=["1F","B1F","B2F"][s], x0=s*SECTION_W
  console.log(`\n=== ${floor} (originX ${x0*TILE}) ===`)
  const yel=[], dk=[]
  for(let ty=0;ty<SECTION_H;ty++)for(let lx=0;lx<SECTION_W;lx++){
    const tx=x0+lx
    const y=tileYellow(tx,ty), d=tileDark(tx,ty)
    if(y>=20) yel.push([lx,ty,y])
    else if(d>=110) dk.push([lx,ty,d]) // très sombre & dense → candidat échelle sombre
  }
  console.log("  JAUNES rayées (col,row):", yel.map(a=>`(${a[0]},${a[1]})`).join(" "))
  console.log("  SOMBRES denses (col,row):", dk.map(a=>`(${a[0]},${a[1]})`).join(" "))
}
