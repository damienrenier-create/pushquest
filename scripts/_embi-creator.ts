// LECTURE SEULE — Embi peut-il créer son Daemon ? (eligible = isChampion && !ngplusUsed && 0 custom)
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main(){
  const u = await prisma.user.findFirst({ where:{ nickname:{ equals:"Embi", mode:"insensitive" }}, select:{ id:true, nickname:true }})
  if(!u){console.log("Embi introuvable");return}
  const r = await prisma.gamebookProgress.findUnique({ where:{ userId_chapterId:{ userId:u.id, chapterId:"yellow" }}, select:{ flags:true, updatedAt:true }})
  const f = (r?.flags ?? {}) as any
  const isChampion = !!f.isChampion, ngplusUsed = !!f.ngplusUsed, nCustom = (f.customDaemons??[]).length
  const activeWorld = f.activeWorld ?? "live"
  console.log(`Embi — maj ${r?new Date(r.updatedAt).toISOString().slice(0,16):"?"}`)
  console.log(`  isChampion : ${isChampion}`)
  console.log(`  ngplusUsed : ${ngplusUsed}   (a lancé le NG+ ?)`)
  console.log(`  customDaemons : ${nCustom}`)
  console.log(`  monde actif : ${activeWorld}`)
  const eligible = isChampion && !ngplusUsed && nCustom===0
  console.log(`\n  → PEUT créer son Daemon (menu forcé/permanent) : ${eligible ? "✅ OUI" : "❌ NON"}`)
  if(!isChampion) console.log("     (raison : pas encore Champion — doit battre la Ligue d'abord)")
  else if(ngplusUsed) console.log("     (raison : NG+ déjà lancé → la fenêtre de création forcée est passée)")
  else if(nCustom>0) console.log("     (raison : a déjà créé)")
}
main().catch(console.error).finally(()=>prisma.$disconnect())
