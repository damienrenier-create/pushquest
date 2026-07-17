import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  try {
    const rows = await (prisma as any).yellowRunScore.findMany({ select:{ nickname:true, run:true, score:true, wonAt:true }, orderBy:{ score:"desc" }})
    console.log(`Table yellowRunScore : ${rows.length} entrée(s)`)
    for(const r of rows) console.log(`  ${r.run.padEnd(5)} ${String(r.score).padStart(5)}  ${r.nickname}  (${new Date(r.wonAt).toISOString().slice(0,10)})`)
    const run2 = rows.filter((r:any)=>r.run==="run2").length, run3 = rows.filter((r:any)=>r.run==="run3").length
    console.log(`\n  → run2: ${run2} score(s) · run3: ${run3} score(s)`)
  } catch(e){ console.log("❌ Table absente ou erreur :", String((e as any).message).slice(0,80)) }
}
main().catch(console.error).finally(()=>prisma.$disconnect())
