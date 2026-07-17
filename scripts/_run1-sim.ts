import { PrismaClient } from "@prisma/client"
import { computeGrade } from "../src/lib/gamebook/yellow/score/runScoreCompute"
const prisma = new PrismaClient()
const num = (v:any)=> typeof v==="number"&&isFinite(v)?v:0
async function main(){
  const rows = await prisma.gamebookProgress.findMany({ where:{ chapterId:"yellow" }, select:{ flags:true, user:{select:{nickname:true}} } })
  const out:any[]=[]
  for(const r of rows){ const f=(r.flags??{}) as any
    const stats=f.stats??{}, team=Array.isArray(f.team)?f.team:[], caught=Array.isArray(f.pokedex?.caught)?f.pokedex.caught:[]
    const teamLevels=team.reduce((s:number,m:any)=>s+num(m?.level),0)
    const {grade}=computeGrade({wins:num(stats.wins),teamKos:num(stats.teamKos),caught,teamLevels,energyConsumed:num(stats.energySpent),steps:num(stats.steps)},{run1:true})
    out.push({nick:r.user?.nickname??"?", grade, badges:(f.badges??[]).length, energy:num(stats.energySpent), caught:caught.length, world:f.activeWorld??"live"})
  }
  console.log("🥇 CLASSEMENT RUN 1 (/1000, sans frugalité) :")
  out.sort((a,b)=>b.grade-a.grade).slice(0,12).forEach((e,i)=>console.log(`  ${i+1}. ${e.nick.padEnd(11)} ${String(e.grade).padStart(4)}/1000  · badges ${e.badges} · run1 caught ${e.caught} · énergie ${e.energy} (${e.world})`))
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);return prisma.$disconnect()})
