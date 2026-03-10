
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Saint Marvin announcement...')

    // 1. Ensure MODO user exists
    let modo = await prisma.user.findUnique({
        where: { nickname: 'modo' }
    })

    if (!modo) {
        console.log('Creating MODO user...')
        modo = await prisma.user.create({
            data: {
                email: 'modo@pompes-app.fr',
                nickname: 'modo',
                password: 'hashed_password_placeholder', // Not used for system messages
                league: 'POMPES'
            }
        })
    }

    // 2. Clear existing Marvin announcements (to avoid duplicates)
    await prisma.wallMessage.deleteMany({
        where: {
            content: { contains: 'Saint Marvin' },
            userId: modo.id
        }
    })

    // 3. Create announcement
    const message = "🔥 ÉVÉNEMENT : C'est la Saint Marvin ! Aujourd'hui le 8 mars, profitez de DOUBLE XP sur toutes vos séries et d'un bonus massif de +500 XP en validant votre cible du jour ! À vos pompes ! 🚀"

    await prisma.wallMessage.create({
        data: {
            content: message,
            userId: modo.id
        }
    })

    console.log('Announcement created successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
