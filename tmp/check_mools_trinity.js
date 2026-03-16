const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const nickname = 'Mools'
  const dateStr = '2026-03-14'

  console.log(`Checking data for ${nickname} on ${dateStr}...`)

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

  const challenge = await prisma.dailyChallenge.findUnique({
    where: { date: dateStr }
  })

  console.log(`User ID: ${user.id}`)
  console.log(`Daily Challenge Goal: ${challenge?.repsGoal || 'Unknown'}`)
  
  const pushups = user.sets.filter(s => s.exercise === 'PUSHUP' || s.exercise === 'PUSHUPS').reduce((acc, s) => acc + s.reps, 0)
  const pullups = user.sets.filter(s => s.exercise === 'PULLUP' || s.exercise === 'PULLUPS').reduce((acc, s) => acc + s.reps, 0)
  const squats = user.sets.filter(s => s.exercise === 'SQUATS' || s.exercise === 'SQUAT').reduce((acc, s) => acc + s.reps, 0)

  console.log(`Stats for ${dateStr}:`)
  console.log(`- Pushups: ${pushups}`)
  console.log(`- Pullups: ${pullups}`)
  console.log(`- Squats: ${squats}`)

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
