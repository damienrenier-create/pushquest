import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  const u = await prisma.user.findFirst({ where:{ nickname:{ contains:"frans", mode:"insensitive" } }, select:{ id:true, nickname:true } })
  const row = await prisma.gamebookProgress.findUnique({ where:{ userId_chapterId:{ userId:u!.id, chapterId:"yellow" } }, select:{ flags:true } })
  const f = (row?.flags ?? {}) as any
  console.log("nick:", u!.nickname, "· activeWorld:", f.activeWorld)
  console.log("TOP-LEVEL (run1) : isChampion", f.isChampion, "· flûte", f.items?.daemonflute ?? 0, "· sylvebarbeAwake", f.sylvebarbeAwake)
  const ng = f.ngplusWorld
  if(ng) console.log("ngplusWorld (run2): isChampion", ng.isChampion, "· flûte", ng.items?.daemonflute ?? 0, "· sylvebarbeAwake", ng.sylvebarbeAwake, "· badges", JSON.stringify(ng.badges))
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
