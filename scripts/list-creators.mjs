import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const users = await p.user.findMany({
    where: { isSystem: true },
    select: { id: true, nickname: true, email: true },
})
console.log(JSON.stringify(users, null, 2))
await p.$disconnect()
