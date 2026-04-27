import prisma from "../src/lib/prisma";
import { rotateFeaturedBadge } from "../src/lib/badges";

async function main() {
    console.log("Forcing featured badge rotation...");
    await rotateFeaturedBadge();
    console.log("Rotation complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
