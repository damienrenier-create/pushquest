import sharp from "sharp"
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
  const avgBr=sum/n
  if(avgBr<42) return "#"        // vide noir → mur
  if(blue>60) return "~"          // eau
  if(dark>70) return "#"          // roche (contours denses) → mur
  return "."                       // sol
}
for(let s=0;s<3;s++){
  const floor=["1F","B1F","B2F"][s]
  console.log(`\n===== ${floor} =====`)
  for(let ty=0;ty<SH;ty++){
    let line=""
    for(let lx=0;lx<SW;lx++) line+=classify(s*SW+lx, ty)
    console.log(line)
  }
}
