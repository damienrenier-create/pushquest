import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  const today = new Date().toISOString().slice(0,10)
  for (const q of ["guillaume","vince"]){
    const users = await prisma.user.findMany({ where:{ nickname:{ contains:q, mode:"insensitive" } }, select:{ id:true, nickname:true } })
    if(!users.length){ console.log(`\n« ${q} » : aucun utilisateur`); continue }
    for(const u of users){
      const row = await prisma.gamebookProgress.findUnique({ where:{ userId_chapterId:{ userId:u.id, chapterId:"yellow" } }, select:{ flags:true, updatedAt:true } })
      if(!row){ console.log(`\n${u.nickname} : pas de save yellow`); continue }
      const f=(row.flags??{}) as any
      const upd = new Date(row.updatedAt)
      const playedToday = upd.toISOString().slice(0,10) === today
      console.log(`\n${u.nickname} :`)
      console.log(`  a joué aujourd'hui (${today}) ? ${playedToday ? "✅ OUI" : "❌ non"}  — dernière activité : ${upd.toISOString().replace("T"," ").slice(0,16)}`)
      console.log(`  énergie/reps (monde actif=${f.activeWorld ?? "live"}) : ${f.reps ?? "?"} / cap ${f.repsCap ?? "?"}`)
      if(f.ngplusWorld) console.log(`  (ngplusWorld reps: ${f.ngplusWorld.reps} / cap ${f.ngplusWorld.repsCap})`)
    }
  }
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
