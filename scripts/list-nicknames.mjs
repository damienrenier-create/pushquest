import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const users = await prisma.user.findMany({
    select: { nickname: true, isSystem: true, isTester: true },
    orderBy: { nickname: "asc" },
})
for (const u of users) {
    const tags = []
    if (u.isSystem) tags.push("SYS")
    if (u.isTester) tags.push("TEST")
    console.log(`${u.nickname}${tags.length ? "  [" + tags.join(",") + "]" : ""}`)
}
await prisma.$disconnect()
