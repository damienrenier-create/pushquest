const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const nickname = 'Mools'
  const dateStr = '2026-03-14'
  
  // Jan 31 + Feb 28 + March 14 = 73
  const target = 73

  console.log(`Checking data for ${nickname} on ${dateStr} (Target: ${target})...`)

  const user = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: 'insensitive' } },
    include: {
      sets: {
        where: { date: dateStr }
      },
      badges: {
        where: { badgeKey: 'trinity_ultimate' }
      }
    }
  })

  if (!user) {
    console.log('User not found')
    return
  }

  console.log(`User ID: ${user.id}`)
  
  const pushups = user.sets.filter(s => s.exercise === 'PUSHUP' || s.exercise === 'PUSHUPS').reduce((acc, s) => acc + s.reps, 0)
  const pullups = user.sets.filter(s => s.exercise === 'PULLUP' || s.exercise === 'PULLUPS').reduce((acc, s) => acc + s.reps, 0)
  const squats = user.sets.filter(s => s.exercise === 'SQUATS' || s.exercise === 'SQUAT').reduce((acc, s) => acc + s.reps, 0)

  console.log(`Stats for ${dateStr}:`)
  console.log(`- Pushups: ${pushups} (Goal: ${target})`)
  console.log(`- Pullups: ${pullups} (Goal: ${target})`)
  console.log(`- Squats: ${squats} (Goal: ${target})`)

  const eligible = pushups >= target && pullups >= target && squats >= target
  console.log(`Eligible for 'trinity_ultimate': ${eligible}`)

  if (user.badges.length > 0) {
    console.log(`Badge 'trinity_ultimate' already owned: achievedAt ${user.badges[0].achievedAt}`)
  } else {
    console.log('Badge NOT owned')
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
