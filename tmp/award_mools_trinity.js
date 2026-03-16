const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const nickname = 'Mools'
  const badgeKey = 'trinity_ultimate'
  const achievedAt = new Date('2026-03-14T12:00:00Z')

  console.log(`Retroactively awarding ${badgeKey} to ${nickname}...`)

  const user = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: 'insensitive' } }
  })

  if (!user) {
    console.log('User not found')
    return
  }

  // 1. Create the BadgeOwnership if it doesn't exist
  // Trinity Ultimate is transferable, but we want to assign it as a "milestone" achievement if possible
  // Wait, TRINITY_ULTIMATE in config is MILESTONE type?
  // Checking config: { key: "trinity_ultimate", ..., type: "MILESTONE" }
  // Yet in lib/badges.ts it is treated as a transferable one if bestUser found?
  // Let me check badges.ts updateBadgesPostSave
  
  // In updateBadgesPostSave:
  // } else if (def.metricType === "TRINITY_ULTIMATE") {
  //   const today = getTodayISO();
  //   for (const s of summaries) { if (s.hasTrinityUltimate(today)) await awardMilestone(s.id, def.key, 1); }
  //   continue;
  
  // Ah! It uses awardMilestone which creates a UNIQUE_AWARDED event.
  // Milestone badges don't use BadgeOwnership.currentUserId (they are multiple).
  // BUT the config says trinity_ultimate is LEGENDARY and metricType is TRINITY_ULTIMATE.
  
  // Let's check awardMilestone function in badges.ts:
  // async function awardMilestone(userId: string, badgeKey: string, value: number = 1) {
  //   ...
  //   await (prisma as any).badgeEvent.create({
  //     data: { badgeKey, fromUserId: null, toUserId: userId, eventType: "UNIQUE_AWARDED", previousValue: maxValue, newValue: value }
  //   });
  
  // So I just need to create the BadgeEvent.
  
  const existingEvent = await prisma.badgeEvent.findFirst({
    where: { badgeKey, toUserId: user.id }
  })

  if (existingEvent) {
    console.log('Badge already awarded in events')
  } else {
    await prisma.badgeEvent.create({
      data: {
        badgeKey,
        toUserId: user.id,
        eventType: 'UNIQUE_AWARDED',
        previousValue: 0,
        newValue: 1,
        createdAt: achievedAt
      }
    })
    console.log('Badge awarded successfully!')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
