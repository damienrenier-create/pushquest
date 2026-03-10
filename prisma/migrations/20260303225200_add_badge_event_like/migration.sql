-- CreateTable
CREATE TABLE "BadgeEventLike" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeEventLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeEventLike_eventId_userId_key" ON "BadgeEventLike"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "BadgeEventLike" ADD CONSTRAINT "BadgeEventLike_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BadgeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeEventLike" ADD CONSTRAINT "BadgeEventLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
