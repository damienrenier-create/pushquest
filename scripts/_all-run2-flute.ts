import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  const rows = await prisma.gamebookProgress.findMany({ where:{ chapterId:"yellow" }, select:{ flags:true, user:{ select:{ nickname:true } } } })
  for(const r of rows){ const f=(r.flags??{}) as any; const ng=f.ngplusWorld; if(!ng) continue
    console.log(`${(r.user?.nickname??"?").padEnd(10)} run2: badges ${(ng.badges??[]).length} · isChampion ${ng.isChampion} · sylvebarbeAwake ${ng.sylvebarbeAwake} · flûte ${ng.items?.daemonflute??0} · ngplusMaitreBeaten ${ng.ngplusMaitreBeaten}`)
  }
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
