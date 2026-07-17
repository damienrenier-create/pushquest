import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  for (const nick of ["frans","task","embi"]){
    const u = await prisma.user.findFirst({ where:{ nickname:{ contains:nick, mode:"insensitive" } }, select:{ id:true, nickname:true } })
    if(!u) continue
    const row = await prisma.gamebookProgress.findUnique({ where:{ userId_chapterId:{ userId:u.id, chapterId:"yellow" } }, select:{ flags:true } })
    const f=(row?.flags??{}) as any, ng=f.ngplusWorld
    console.log(`\n${u.nickname} : activeWorld=${f.activeWorld}`)
    console.log(`  position (top): mapId=${f.mapId ?? f.currentMapId ?? f.pos?.mapId ?? "?"} x=${f.x ?? f.pos?.x ?? "?"} y=${f.y ?? f.pos?.y ?? "?"}`)
    console.log(`  clés position possibles:`, Object.keys(f).filter(k=>/map|pos|x$|y$|coord/i.test(k)))
    if(ng){ console.log(`  ngplusWorld.items:`, JSON.stringify(ng.items)); console.log(`  ngplusWorld.sylvebarbeAwake=${ng.sylvebarbeAwake} · position ng: mapId=${ng.mapId ?? "?"} x=${ng.x ?? "?"} y=${ng.y ?? "?"}`) }
  }
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
