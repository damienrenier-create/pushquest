import prisma from "./src/lib/prisma";
import { updateBadgesPostSave } from "./src/lib/badges";

async function run() {
    try {
        const user = await prisma.user.findFirst({
            where: { nickname: "Frans" }
        });
        if (!user) {
            console.log("User not found");
            return;
        }
        console.log("Found user, running updateBadgesPostSave...");
        await updateBadgesPostSave(user.id);
        console.log("Success!");
    } catch (e) {
        console.error("Error during updateBadgesPostSave:", e);
    }
}

run();
