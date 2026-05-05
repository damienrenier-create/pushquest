const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Updating Oracle system user...");
    const oracleUpdate = await prisma.user.updateMany({
        where: { email: "oracle@pushquest.app" },
        data: { isSystem: true }
    });
    console.log("Oracle update result:", oracleUpdate);

    console.log("Updating Bet 1 description...");
    try {
        const betUpdate = await prisma.bet.update({
            where: { id: "cmosfbh0e0002ct1vdin2foho" },
            data: {
                description: "Le 🔥 Flambeau Quotidien revient chaque jour au premier joueur qui valide son quota du jour. Qui le détiendra au soir du 31 mai ?",
                metadata: JSON.stringify({
                    note: "Premier pari officiel PushQuest",
                    resolveInstructions: "Regarder qui est le premier à valider son quota le 31 mai — c'est lui qui détient le Flambeau ce soir-là"
                })
            }
        });
        console.log("Bet updated:", betUpdate.title);
    } catch(e) {
        console.error("Bet update error:", e.message);
    }

    // Checking if it worked
    const oracle = await prisma.user.findUnique({
        where: { email: "oracle@pushquest.app" },
        select: { id: true, nickname: true, isSystem: true }
    })
    console.log("Oracle fetch check:", oracle)
    
    const bet = await prisma.bet.findUnique({
        where: { id: "cmosfbh0e0002ct1vdin2foho" },
        select: { title: true, description: true }
    })
    console.log("Bet fetch check:", bet)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
