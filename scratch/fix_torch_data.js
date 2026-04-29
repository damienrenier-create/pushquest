const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Simplified version of the logic in badges.ts
function getRequiredRepsForDate(date) {
    // This is a simplified fallback, ideally we'd import from challenge.ts
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    if (day === 0 || day === 6) return 50;
    return 100; // Default
}

async function main() {
  console.log('Fetching users and sets...')
  const allUsers = await prisma.user.findMany({
    where: { nickname: { not: 'modo' } },
    include: { sets: true }
  })

  console.log('Calculating torch winners...')
  const winnersByDate = {}
  const setsByDate = {}
  
  allUsers.forEach(u => {
    (u.sets || []).forEach(s => {
      if (!setsByDate[s.date]) setsByDate[s.date] = []
      setsByDate[s.date].push({ ...s, userId: u.id })
    })
  })

  Object.entries(setsByDate).forEach(([date, daySets]) => {
    const req = getRequiredRepsForDate(date)
    daySets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    const userProgress = {}
    for (const s of daySets) {
      const effort = s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps
      userProgress[s.userId] = (userProgress[s.userId] || 0) + effort
      if (userProgress[s.userId] >= req) {
        winnersByDate[date] = { userId: s.userId, nickname: allUsers.find(u => u.id === s.userId).nickname }
        break
      }
    }
  })

  console.log('Calculating streaks...')
  const sortedDates = Object.keys(winnersByDate).sort()
  const userStreaks = {}
  allUsers.forEach(u => userStreaks[u.id] = { max: 0, current: 0, lastDate: null })

  sortedDates.forEach(dateStr => {
    const winner = winnersByDate[dateStr]
    const dateObj = new Date(dateStr)
    
    // Update winner streak
    const uId = winner.userId
    const s = userStreaks[uId]
    if (s.lastDate) {
      const diffDays = Math.round((dateObj - s.lastDate) / (1000 * 3600 * 24))
      if (diffDays === 1) s.current++
      else s.current = 1
    } else {
      s.current = 1
    }
    s.lastDate = dateObj
    if (s.current > s.max) s.max = s.current

    // Reset others streaks if they were the previous winner?
    // Actually the logic in badges.ts is slightly different: 
    // it only resets if they are NOT the winner of the NEXT date.
    allUsers.forEach(u => {
        if (u.id !== uId) {
            // If they didn't win today, their current streak is broken
            userStreaks[u.id].current = 0
            userStreaks[u.id].lastDate = null
        }
    })
  })

  let bestUser = null
  let maxVal = 0

  Object.entries(userStreaks).forEach(([uId, s]) => {
    if (s.max > maxVal) {
      maxVal = s.max
      bestUser = uId
    }
  })

  if (bestUser) {
    const nickname = allUsers.find(u => u.id === bestUser).nickname
    console.log(`Best Torch Guardian: ${nickname} with ${maxVal} days.`)
    
    await prisma.badgeOwnership.update({
      where: { badgeKey: 'torch_legacy' },
      data: {
        currentUserId: bestUser,
        currentValue: maxVal,
        achievedAt: new Date()
      }
    })
    console.log('Database updated.')
  } else {
    console.log('No torch winners found.')
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
