import { PrismaClient } from "@prisma/client";

if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const prisma = new PrismaClient();

async function main() {
    console.log("Locating 'modo' user...");
    const user = await prisma.user.findUnique({
        where: { nickname: 'modo' }
    });

    if (user) {
        console.log(`Found user: ${user.id}. Deleting...`);
        await prisma.user.delete({
            where: { id: user.id }
        });
        console.log("Deleted successfully.");
    } else {
        console.log("No user with nickname 'modo' found.");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
